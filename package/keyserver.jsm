/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailKeyServer"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Cu.import("resource://enigmail/locale.jsm"); /*global EnigmailLocale: false */
Cu.import("resource://enigmail/httpProxy.jsm"); /*global EnigmailHttpProxy: false */
Cu.import("resource://enigmail/gpg.jsm"); /*global EnigmailGpg: false */
Cu.import("resource://enigmail/gpgAgent.jsm"); /*global EnigmailGpgAgent: false */
Cu.import("resource://enigmail/files.jsm"); /*global EnigmailFiles: false */
Cu.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Cu.import("resource://enigmail/subprocess.jsm"); /*global subprocess: false */
Cu.import("resource://enigmail/core.jsm"); /*global EnigmailCore: false */
Cu.import("resource://enigmail/tor.jsm"); /*global EnigmailTor: false */
Cu.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Cu.import("resource://enigmail/gpgResponseParser.jsm"); /*global GpgResponseParser: false */
Cu.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */
Cu.import("resource://enigmail/executableEvaluator.jsm"); /*global ExecutableEvaluator: false */

const nsIEnigmail = Ci.nsIEnigmail;

const actions = {
  downloadKey: nsIEnigmail.DOWNLOAD_KEY,
  refreshKeys: nsIEnigmail.REFRESH_KEY,
  searchKey: nsIEnigmail.SEARCH_KEY,
  uploadKey: nsIEnigmail.UPLOAD_KEY
};

function useTorsocks(keyserver) {
  const environment = Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);
  const torsocksPath = EnigmailFiles.resolvePath('torsocks', environment.get("PATH"), EnigmailOS.isDosLike());
  const gpgPath = EnigmailFiles.resolvePath('gpg2', environment.get("PATH"), EnigmailOS.isDosLike());

  subprocess.call({
    command: torsocksPath,
    arguments: [ gpgPath.path, '--keyserver', keyserver ],
    environment: EnigmailCore.getEnvList(),
    charset: null,
    stdin: null,
    stdout: function(data) {
      EnigmailLog.DEBUG("stdout data: " + data + "\n");
    },
    stderr: function(data) {
      EnigmailLog.DEBUG("stderr data: " + data + "\n");
    },
    done: function(exitCode) {
      EnigmailLog.DEBUG("exitCode " + exitCode);
    }
  }).wait();
}

function build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor) {
  const prefix = [];
  if (tor.userWantsActionOverTor(actionFlags)) {
    const torProperties = tor.torIsAvailable(EnigmailOS.getOS(), ExecutableEvaluator);
    if (torProperties.status) {
      const torArgs = EnigmailTor.buildGpgProxyArguments(torProperties, EnigmailOS.getOS());
      for (let i=0; i<torArgs.length; i++)
        if (torProperties.type === 'torsocks') prefix.push(torArgs[i]);
    }
    //TODO: Tor test gpg-proxy TB bundle port (9150)
    //TODO: Tor test gpg-proxy service port (9050)
    //TODO: Give user the option to have an action fail if tor is not available
    //TODO: Make sure that the commands that we call with tor work without tor
  }


  if (!keyserver) {
    errorMsgObj.value = EnigmailLocale.getString("failNoServer");
    return null;
  }

  if (!searchTerms && !(actionFlags & nsIEnigmail.REFRESH_KEY)) {
    errorMsgObj.value = EnigmailLocale.getString("failNoID");
    return null;
  }

  let args = EnigmailGpg.getStandardArgs(true);

  if (actionFlags & nsIEnigmail.SEARCH_KEY) {
    args = EnigmailGpg.getStandardArgs(false).
      concat(["--command-fd", "0", "--fixed-list", "--with-colons"]);
  }

  args = args.concat(["--keyserver", keyserver.trim()]);

  let inputData = null;
  const searchTermsList = searchTerms.split(" ");

  if (actionFlags & actions.downloadKey) {
    args.push("--recv-keys");
    args = args.concat(searchTermsList);
  }
  else if (actionFlags & actions.refreshKeys) {
    args.push("--refresh-keys");
  }
  else if (actionFlags & actions.searchKey) {
    args.push("--search-keys");
    args = args.concat(searchTermsList);
    inputData = "quit\n";
  }
  else if (actionFlags & actions.uploadKey) {
    args.push("--send-keys");
    args = args.concat(searchTermsList);
  }

  const isDownload = actionFlags & (nsIEnigmail.REFRESH_KEY | nsIEnigmail.DOWNLOAD_KEY);

  return { prefix: prefix, "args": args, "inputData": inputData, "isDownload": isDownload, errors: errorMsgObj};
}

function callSubprocess(args, inputData, listener, isDownload){
  let exitCode = null;
  subprocess.call(
      {
      command: EnigmailGpgAgent.agentPath,
      arguments: args,
      environment: EnigmailCore.getEnvList(),
      charset: null,
      stdin: inputData,
      stdout: function(data) {
        listener.stdout(data);
      },
      stderr: function(data) {
        if (data.search(/^\[GNUPG:\] ERROR/m) >= 0) {
          exitCode = 4;
        }
        listener.stderr(data);
      },
      done: function(result) {
        try {
          if (result.exitCode === 0 && isDownload) {
            EnigmailKeyRing.clearCache();
          }
          if (exitCode === null) {
            exitCode = result.exitCode;
          }
          listener.done(exitCode);
        }
        catch (ex) {}
      },
      mergeStderr: false
    });
}

function submit(args, inputData, listener, isDownload, makeSubprocessCall) {
  EnigmailLog.CONSOLE("enigmail> " + EnigmailFiles.formatCmdLine(EnigmailGpgAgent.agentPath, args) + "\n");

  let proc = null;

  try {
    proc = makeSubprocessCall(args, inputData, listener, isDownload);
  }
  catch (ex) {
    EnigmailLog.ERROR("keyserver.jsm: access: subprocess.call failed with '" + ex.toString() + "'\n");
    throw ex;
  }

  if (!proc) {
    EnigmailLog.ERROR("keyserver.jsm: access: subprocess failed due to unknown reasons\n");
    return null;
  }
  return proc;
}

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

const EnigmailKeyServer = {
  /**
   * search, download or upload key on, from or to a keyserver
   *
   * @actionFlags: Integer - flags (bitmap) to determine the required action
   *                         (see nsIEnigmail - Keyserver action flags for details)
   * @keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @searchTerms: String  - space-separated list of search terms or key IDs
   * @listener:    Object  - execStart Listener Object. See execStart for details.
   * @errorMsgObj: Object  - object to hold error message in .value
   *
   * @return:      Subprocess object, or null in case process could not be started
   */
  access: function(actionFlags, keyserver, searchTerms, listener, errorMsgObj) {
    let query = build(actionFlags, keyserver, searchTerms, errorMsgObj, EnigmailHttpProxy, EnigmailTor);
    return submit(query.args, query.inputData, listener, query.isDownload, callSubprocess);
  },

  refreshKey: function(key) {
    const keyservers = getKeyserversFrom(EnigmailPrefs.getPref("extensions.enigmail.keyserver"));
    // TODO this should actually start in a Tor state
    let stateMachine = new StateMachine("hkps-" + keyservers[0], key, this);
    stateMachine.start(key);
  }
};
