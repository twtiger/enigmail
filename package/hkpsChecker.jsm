/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailHkpsChecker"];

const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Cu.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Cu.import("resource://enigmail/gpgResponseParser.jsm"); /*global GpgResponseParser: false */
Cu.import("resource://enigmail/keyserver.jsm"); /*global EnigmailKeyServer: false */

const nsIEnigmail = Ci.nsIEnigmail;

const actions = {
  downloadKey: nsIEnigmail.DOWNLOAD_KEY,
  refreshKeys: nsIEnigmail.REFRESH_KEY,
  searchKey: nsIEnigmail.SEARCH_KEY,
  uploadKey: nsIEnigmail.UPLOAD_KEY
};

function getKeyserversFrom(string){
  let keyservers = string.split(/\s*[,;]\s*/g);
  return EnigmailPrefs.getPref("extensions.enigmail.autoKeyServerSelection") ? [keyservers[0]] : keyservers;
}

function submitRequest(key){
  let request = buildKeyRequest(key, buildListener(key));
  let process = ourKeyserver.access(request.actionFlags, request.keyserver, request.searchTerms, request.listener, {});
  process.wait();
}

function buildKeyRequest(key, listener) {
  if (machine.getCurrentProtocol() === "hkps"){
    return {
      actionFlags: actions.downloadKey,
      keyserver: "hkps://" + machine.getCurrentKeyserverName() + ":443",
      searchTerms: key.keyId,
      listener: listener
    };
  } else {
    return {
      actionFlags: actions.downloadKey,
      keyserver: "hkp://" + machine.getCurrentKeyserverName() + ":11371",
      searchTerms: key.keyId,
      listener: listener
    };
  }
}

function buildListener(key) {
  let stderr = "";
  let stdout = "";
  return {
    done: function(exitCode) {
      requestExit(key, exitCode, stderr, stdout);
    },
    stdout: function(data) {
      stdout += data;
    },
    stderr: function(data) {
      stderr += data;
    }
  };
}

function requestExit(key, exitCode, stderr, stdout) {
  const response = GpgResponseParser.parse(stderr);
  const protocol = machine.getCurrentProtocol();
  if (response.status === "General Error" || response.status === "Connection Error") {
    EnigmailLog.ERROR(protocol + " key request for Key ID: " + key.keyId + " at keyserver: " + machine.getCurrentKeyserverName() + " fails with: " + response.status + "\n");
    machine.next(key);
  }
  if (response.status === "Key not changed") {
    EnigmailLog.WRITE("keyserver.jsm: Key ID " + key.keyId + " is the most up to date\n");
  }
  if (response.status === "Success") {
    EnigmailLog.WRITE("keyserver.jsm: Key ID " + key.keyId + " successfully imported from keyserver " + machine.getCurrentKeyserverName() + "\n");
  }
}

function createAllStates(){
  const keyservers = getKeyserversFrom(EnigmailPrefs.getPref("extensions.enigmail.keyserver"));
  const lastStateName = "hkp-" + keyservers[0];

  const states = {};
  for (let i=0; i < keyservers.length; i++) {
    const stateName = "hkps-" + keyservers[i];
    let nextName = "hkps-" + keyservers[i+1];
    if (i === keyservers.length-1) {
      nextName = lastStateName;
    }
    const state = { protocol: 'hkps', keyserver: keyservers[i], next: nextName };
    states[stateName] = state;
  }

  const lastState = { protocol: 'hkp', keyserver: keyservers[0], next: null };
  states[lastStateName] = lastState;
  return states;
}

let ourKeyserver = null;
let currentState = null;
let allStates = null;
const machine = {
  init: function(initialState, enigmailKeyServer) {
    ourKeyserver = enigmailKeyServer;
    currentState = initialState;
    allStates = createAllStates();
  },

  start: function(key) {
    submitRequest(key);
  },

  next: function(key) {
    let nextState = allStates[currentState].next;
    currentState = nextState;
    if (nextState !== null) submitRequest(key);
  },

  getCurrentState: function() {
    return currentState;
  },

  getCurrentKeyserverName: function() {
    return allStates[currentState].keyserver;
  },

  getCurrentProtocol: function() {
    return allStates[currentState].protocol;
  },
};

const EnigmailHkpsChecker = {
  refreshKey: function(key) {
    const firstKeyserver = "hkps-" + getKeyserversFrom(EnigmailPrefs.getPref("extensions.enigmail.keyserver")[0]);
    machine.init(firstKeyserver, EnigmailKeyServer);
    machine.start(key);
  }
};
