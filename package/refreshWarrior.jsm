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
Cu.import("resource://enigmail/gpgResponseParser.jsm"); /*global GpgResponseParser: false */
Cu.import("resource://enigmail/keyserver.jsm"); /*global EnigmailKeyServer: false */

const KEYSERVER_PREF = "keyserver";

function getKeyserversFrom(string){
  const keyservers = string.split(/\s*[,;]\s*/g);
  return EnigmailPrefs.getPref("autoKeyServerSelection") ? [keyservers[0]] : keyservers;
}

function submitRequest(key){
  const request = buildKeyRequest(key, buildListener(key));
  ourKeyserver.access(request.actionFlags, request.keyserver, request.searchTerms, request.listener, {});
}

function buildKeyRequest(key, listener) {
  if (machine.getCurrentProtocol() === "hkps"){
    return {
      actionFlags: Ci.nsIEnigmail.DOWNLOAD_KEY,
      keyserver: "hkps://" + machine.getCurrentKeyserverName() + ":443",
      searchTerms: key.keyId,
      listener: listener
    };
  } else {
    return {
      actionFlags: Ci.nsIEnigmail.DOWNLOAD_KEY,
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
      if (GpgResponseParser.isErrorResponse(stderr, key.keyId, machine.getCurrentProtocol(), machine.getCurrentKeyserverName())) {
        machine.next(key);
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

function createAllStates() {
  const keyservers = getKeyserversFrom(EnigmailPrefs.getPref(KEYSERVER_PREF));
  const states = [];
  for (let i=0; i < keyservers.length; i++) {
    states.push( { protocol: 'hkps', keyserver: keyservers[i] } );
  }
  states.push( { protocol: 'hkp', keyserver: keyservers[0] } );
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
