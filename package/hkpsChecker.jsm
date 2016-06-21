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

function submitRequest(key, enigmailKeyServer, stateMachine){
  let request = buildKeyRequest(key, stateMachine, buildListener(key, stateMachine));
  let process = enigmailKeyServer.access(request.actionFlags, request.keyserver, request.searchTerms, request.listener, {});
  process.wait();
}

function buildKeyRequest(key, stateMachine, listener) {
  if (stateMachine.getCurrentProtocol() === "hkps"){
    return {
      actionFlags: actions.downloadKey,
      keyserver: "hkps://" + stateMachine.getCurrentKeyserverName() + ":443",
      searchTerms: key.keyId,
      listener: listener
    };
  } else {
    return {
      actionFlags: actions.downloadKey,
      keyserver: "hkp://" + stateMachine.getCurrentKeyserverName() + ":11371",
      searchTerms: key.keyId,
      listener: listener
    };
  }
}

function buildListener(key, stateMachine) {
  let stderr = "";
  let stdout = "";
  return {
    done: function(exitCode) {
      requestExit(key, exitCode, stderr, stdout, stateMachine);
    },
    stdout: function(data) {
      stdout += data;
    },
    stderr: function(data) {
      stderr += data;
    }
  };
}

function requestExit(key, exitCode, stderr, stdout, stateMachine) {
  const response = GpgResponseParser.parse(stderr);
  const protocol = stateMachine.getCurrentProtocol();
  if (response.status === "General Error" || response.status === "Connection Error") {
    EnigmailLog.ERROR(protocol + " key request for Key ID: " + key.keyId + " at keyserver: " + stateMachine.getCurrentKeyserverName() + " fails with: " + response.status + "\n");
    stateMachine.next(key);
  }
  if (response.status === "Key not changed") {
    EnigmailLog.WRITE("keyserver.jsm: Key ID " + key.keyId + " is the most up to date\n");
  }
  if (response.status === "Success") {
    EnigmailLog.WRITE("keyserver.jsm: Key ID " + key.keyId + " successfully imported from keyserver " + stateMachine.getCurrentKeyserverName() + "\n");
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

function StateMachine(initialState, enigmailKeyServer) {
  this.currentState = initialState;
  this.states = createAllStates();

  this.start = function(key) {
    submitRequest(key, enigmailKeyServer, this);
  };

  this.next = function(key) {
    let nextState = this.states[this.currentState].next;
    this.currentState = nextState;
    if (nextState !== null) {
      submitRequest(key, enigmailKeyServer, this);
    }
  };

  this.getCurrentKeyserverName = function() {
    return this.states[this.currentState].keyserver;
  };

  this.getCurrentProtocol = function() {
    return this.states[this.currentState].protocol;
  };
}

const EnigmailHkpsChecker = {
  refreshKey: function(key) {
    const keyservers = getKeyserversFrom(EnigmailPrefs.getPref("extensions.enigmail.keyserver"));
    new StateMachine("hkps-" + keyservers[0], EnigmailKeyServer).start(key);
  }
};
