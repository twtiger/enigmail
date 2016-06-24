/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["RefreshWarrior"];

const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Cu.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Cu.import("resource://enigmail/keyserver.jsm"); /*global EnigmailKeyServer: false */
Cu.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */

const KEYSERVER_PREF = "keyserver";

function getKeyserversFrom(string){
  const keyservers = string.split(/\s*[,;]\s*/g);
  return EnigmailPrefs.getPref("autoKeyServerSelection") ? [keyservers[0]] : keyservers;
}

function submitRequest(key){
  const protocol = machine.getCurrentProtocol();
  if(["hkps", "hkp", "ldap"].indexOf(protocol) !== -1){
    const request = buildKeyRequest(key, buildListener(key));
    ourKeyserver.access(request.actionFlags, request.keyserver, request.searchTerms, request.listener, {});
  } else {
    EnigmailLog.WRITE("Keyserver ignored due to invalid protocol: " + protocol);
  }
}

function buildKeyRequest(key, listener) {
  if (machine.getCurrentProtocol() === "hkps"){
    return {
      actionFlags: Ci.nsIEnigmail.DOWNLOAD_KEY,
      keyserver: "hkps://" + machine.getCurrentKeyserverName() + ":443",
      searchTerms: key.keyId,
      listener: listener
    };
  } else if (machine.getCurrentProtocol() === "hkp"){
    return {
      actionFlags: Ci.nsIEnigmail.DOWNLOAD_KEY,
      keyserver: "hkp://" + machine.getCurrentKeyserverName() + ":11371",
      searchTerms: key.keyId,
      listener: listener
    };
  } else {
    return {
      actionFlags: Ci.nsIEnigmail.DOWNLOAD_KEY,
      keyserver: "ldap://" + machine.getCurrentKeyserverName() + ":389",
      searchTerms: key.keyId,
      listener: listener
    };
  }
}

function contains(superSet, subSet) {
  return superSet.indexOf(subSet) > -1;
}

function isErrorResponse(message, keyId, protocol, keyserverName) { // TODO change default from success to unknown
  if (contains(message, "fetch error") || contains(message, "Network is unreachable") || contains(message, "Connection refused")) {
    EnigmailLog.ERROR(protocol + " key request for Key ID: " + keyId + " at keyserver: " + keyserverName + " fails with: Connection Error\n");
    return true;
  } else if (contains(message, "General error")) {
    EnigmailLog.ERROR(protocol + " key request for Key ID: " + keyId + " at keyserver: " + keyserverName + " fails with: General Error\n");
    return true;
  } else if (contains(message, "not changed")) {
    EnigmailLog.WRITE("[KEY REFRESH SERVICE]: Key ID " + keyId + " is the most up to date\n");
    return false;
  }

  EnigmailLog.WRITE("[KEY REFRESH SERVICE]: Key ID " + keyId + " successfully imported from keyserver " + keyserverName + "\n");
  return false;
}

function buildListener(key) {
  let stderr = "";
  let stdout = "";
  return {
    done: function(exitCode) {
      if (isErrorResponse(stderr, key.keyId, machine.getCurrentProtocol(), machine.getCurrentKeyserverName())) {
        machine.next(key);
      } else if (exitCode === 0) {
        EnigmailKeyRing.clearCache();
      }
    },
    stdout: function(data) {
      stdout += data;
    },
    stderr: function(data) {
      stderr += data;
    }
  };
}

function getProtocolAndKeyserver(keyserverInput){
  return keyserverInput.split("://");
}

function protocolIncluded(keyserverInput){
  return (getProtocolAndKeyserver(keyserverInput).length === 2) ? true : false;
}

function isHkpsOrEmpty(keyserverInput){
  return (protocolIncluded(keyserverInput) === false || getProtocolAndKeyserver(keyserverInput)[0] === "hkps") ? true : false;
}

function sortKeyserversWithHkpsFirst(keyservers){
  return keyservers.sort(function(a, b){
    if (isHkpsOrEmpty(b) && !isHkpsOrEmpty(a)){
      return 1;
    }
    if (isHkpsOrEmpty(a) && !isHkpsOrEmpty(b)){
      return -1;
    }
    return 0;
  });
}

function setUpStateForProtocolAndKeyserver(protocolInput, keyserverInput){
  let protocol = protocolInput;
  let keyserver = keyserverInput;
  if (protocolIncluded(keyserverInput) === true){
    const protocolAndKeyserver = getProtocolAndKeyserver(keyserverInput);
    protocol = protocolAndKeyserver[0];
    keyserver = protocolAndKeyserver[1];
  }
  return { protocol: protocol, keyserver: keyserver};
}

function createAllStates() {
  const keyserversFromPrefs = getKeyserversFrom(EnigmailPrefs.getPref(KEYSERVER_PREF));
  const keyservers = sortKeyserversWithHkpsFirst(keyserversFromPrefs);
  const states = [];
  for (let i=0; i < keyservers.length; i++) {
    states.push(setUpStateForProtocolAndKeyserver("hkps", keyservers[i]));
  }
  for (let i=0; i < keyservers.length; i++) {
    if (protocolIncluded(keyservers[i]) === false){
      states.push(setUpStateForProtocolAndKeyserver('hkp', keyservers[i]));
    }
  }
  return states;
}

let ourKeyserver = null;
let currentState = null;
let allStates = null;
const machine = {
  init: function(enigmailKeyServer) {
    ourKeyserver = enigmailKeyServer;
    currentState = 0;
    allStates = createAllStates();
  },

  start: function(key) {
    submitRequest(key);
  },

  next: function(key) {
    currentState += 1;
    if (currentState !== allStates.length) submitRequest(key);
  },

  getCurrentState: function() {
    return allStates[currentState];
  },

  getCurrentKeyserverName: function() {
    return allStates[currentState].keyserver;
  },

  getCurrentProtocol: function() {
    return allStates[currentState].protocol;
  },
};

const RefreshWarrior = {
  refreshKey: function(key) {
    machine.init(EnigmailKeyServer);
    machine.start(key);
  }
};
