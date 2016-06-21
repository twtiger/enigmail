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

function submitRequest(key, keyserver, enigmailKeyServer, stateMachine){
  let listener = buildListener(key, keyserver, stateMachine);
  let request = buildKeyRequest(key, keyserver, stateMachine, listener);
  let errorMsgObj = {};
  let process = enigmailKeyServer.access(request.actionFlags, request.keyserver, request.searchTerms, request.listener, errorMsgObj);
  process.wait();
}

function buildKeyRequest(key, keyserverName, stateMachine, listener) {
  if (stateMachine.states[stateMachine.currentState].protocol === "hkps"){
    return {
      actionFlags: actions.downloadKey,
      keyserver: "hkps://" + keyserverName + ":443",
      searchTerms: key.keyId,
      listener: listener
    };
  } else {
    return {
      actionFlags: actions.downloadKey,
      keyserver: "hkp://" + keyserverName + ":11371",
      searchTerms: key.keyId,
      listener: listener
    };
  }
}

function buildListener(key, keyserver, stateMachine) {
  let stderr = "";
  let stdout = "";
  return {
    done: function(exitCode) {
      requestExit(key, exitCode, stderr, stdout, stateMachine, keyserver);
    },
    stdout: function(data) {
      stdout += data;
    },
    stderr: function(data) {
      stderr += data;
    }
  };
}

function requestExit(key, exitCode, stderr, stdout, stateMachine, keyserver) {
  const response = GpgResponseParser.parse(stderr);
  const protocol = stateMachine.states[stateMachine.currentState].protocol;
  if (response.status === "General Error" || response.status === "Connection Error") {
    EnigmailLog.ERROR(protocol + " key request for Key ID: " + key.keyId + " at keyserver: " + keyserver + " fails with: " + response.status + "\n");
    stateMachine.next(key);
  }
  if (response.status === "Key not changed") {
    EnigmailLog.WRITE("keyserver.jsm: Key ID " + key.keyId + " is the most up to date\n");
  }
  if (response.status === "Success") {
    EnigmailLog.WRITE("keyserver.jsm: Key ID " + key.keyId + " successfully imported from keyserver " + keyserver + "\n");
  }
}

function createAllStates(){
  const keyservers = getKeyserversFrom(EnigmailPrefs.getPref("extensions.enigmail.keyserver"));
  const states = {};
  const lastStateName = "hkp-" + keyservers[0];
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

function StateMachine(initialState, key, enigmailKeyServer) {
  this.currentState = initialState;
  this.states = createAllStates();

  this.start = function(key) {
    EnigmailLog.DEBUG("start Current state: " + this.currentState + "\n");
    submitRequest(key, this.states[this.currentState].keyserver, enigmailKeyServer, this);
  };

  this.next = function(key) {
    let nextState = this.states[this.currentState].next;
    this.currentState = nextState;
    EnigmailLog.DEBUG("next Current state: " + this.currentState + "\n");
    if (nextState !== null) {
      submitRequest(key, this.states[this.currentState].keyserver, enigmailKeyServer, this);
    } 
  };
}

const EnigmailHkpsChecker = {
  refreshKey: function(key) {
    const keyservers = getKeyserversFrom(EnigmailPrefs.getPref("extensions.enigmail.keyserver"));
    let stateMachine = new StateMachine("hkps-" + keyservers[0], key, EnigmailKeyServer);
    stateMachine.start(key);
  }
};