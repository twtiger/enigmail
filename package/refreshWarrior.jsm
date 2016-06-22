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

const nsIEnigmail = Ci.nsIEnigmail;

const actions = {
  downloadKey: nsIEnigmail.DOWNLOAD_KEY,
  refreshKeys: nsIEnigmail.REFRESH_KEY,
  searchKey: nsIEnigmail.SEARCH_KEY,
  uploadKey: nsIEnigmail.UPLOAD_KEY
};

function getKeyserversFrom(string){
  return string.split(/\s*[,;]\s*/g);
}

function submitRequest(key){
  const request = buildKeyRequest(key, buildListener(key));
  const process = ourKeyserver.access(request.actionFlags, request.keyserver, request.searchTerms, request.listener, {});
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
  if (GpgResponseParser.isErrorResponse(stderr, key.keyId, machine.getCurrentProtocol(), machine.getCurrentKeyserverName())) {
    machine.next(key);
  }
}

function createAllStates() {
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
    currentState = allStates[currentState].next;
    if (currentState !== null) submitRequest(key);
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

const RefreshWarrior = {
  refreshKey: function(key) {
    const firstKeyserver = "hkps-" + getKeyserversFrom(EnigmailPrefs.getPref("extensions.enigmail.keyserver")[0]);
    machine.init(firstKeyserver, EnigmailKeyServer);
    machine.start(key);
  }
};
