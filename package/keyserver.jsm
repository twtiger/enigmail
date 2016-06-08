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

const nsIEnigmail = Ci.nsIEnigmail;

const actions = {
  downloadKey: nsIEnigmail.DOWNLOAD_KEY,
  refreshKeys: nsIEnigmail.REFRESH_KEY,
  searchKey: nsIEnigmail.SEARCH_KEY,
  uploadKey: nsIEnigmail.UPLOAD_KEY
};


function checkForTorifiedActions(actionFlags, tor) {
  for (let key in actions) {
    if ((tor.gpgActions[key] === true) && (actionFlags & actions[key])) {
      return true;
    }
  }
  return false;
}
function build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor) {
  EnigmailLog.DEBUG("keyserver.jsm: access: " + searchTerms + "\n");

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

  const proxyHost = httpProxy.getHttpProxy(keyserver);


  args = args.concat(["--keyserver", keyserver.trim()]);

  if (proxyHost !== null) {
    args = args.concat(["--keyserver-options", "http-proxy=" + proxyHost]);
  }

  // proxy settings takes precedance over tor
  if (proxyHost === null) {
    let useTor = checkForTorifiedActions(actionFlags, tor);

    if (useTor === true) {
      const torConfig = tor.getConfiguration;
      const socksProxy = "socks5-hostname://";
      const proxy = socksProxy + torConfig.host + ":" + torConfig.port;
      args = args.concat(["--keyserver-options", "http-proxy=" + proxy]);
    }
  }

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

  return {"args": args, "inputData": inputData, "isDownload": isDownload, errors: errorMsgObj};
}

function submit(args, inputData, listener, isDownload) {
  EnigmailLog.CONSOLE("enigmail> " + EnigmailFiles.formatCmdLine(EnigmailGpgAgent.agentPath, args) + "\n");

  let proc = null;
  let exitCode = null;

  try {
    proc = subprocess.call({
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

function getKeyserverName() {
  return EnigmailPrefs.getPref("autoKeyServerSelection") ? EnigmailPrefs.getPref("keyserver").split(/[ ,;]/g)[0] : null;
}

function hkpExit(key, exitCode, stderr, stdout) {
  let response = GpgResponseParser.parse(stderr);
  if (response.status == "General Error") {
    EnigmailLog.ERROR("hkp key request for Key ID: " + key.keyId + " fails with: gpg: keyserver receive failed: General error\n");
  }
}

function buildHkpListener(key) {
  let stderr = "";
  let stdout = "";
  return {
    done: function (exitCode) {
      hkpExit(key, exitCode, stderr, stdout);
    },
    stdout: function(data) {
      stdout += data;
    },
    stderr: function(data) {
      stderr += data;
    }
  };
}

function buildHkpKeyRequest(key) {
  return {
    actionFlags: actions.downloadKey,
    keyserver: "hkp://" + getKeyserverName() + ":11371",
    searchTerms: key.keyId,
    listener: buildHkpListener(key)
  };
}

function buildHkpsKeyRequest(key) {
  return {
    actionFlags: actions.downloadKey,
    keyserver: "hkps://" + getKeyserverName() + ":443",
    searchTerms: key.keyId,
    listener: buildHkpsListener(key)
  };
}


function hkpsExit(key, exitCode, stderr, stdout) {
  let response = GpgResponseParser.parse(stderr);
  if (response.status === "General Error" || response.status === "Connection Error") {
    let request = buildHkpKeyRequest(key);
    let errorMsgObj = {};
    EnigmailKeyServer.access(request.actionFlags, request.keyserver, request.searchTerms, request.listener, errorMsgObj);
  }
  if (response.status === "Key not changed") {
    EnigmailLog.WRITE("keyserver.jsm: Key ID " + key.keyId + " is the most up to date\n");
  }
  if (response.status === "Success") {
    EnigmailLog.WRITE("keyserver.jsm: Key ID " + key.keyId + " successfully imported!\n");
  }
}

function buildHkpsListener(key) {
  let stderr = "";
  let stdout = "";
  return {
    done: function(exitCode) {
      hkpsExit(key, exitCode, stderr, stdout);
    },
    stdout: function(data) {
      stdout += data;
    },
    stderr: function(data) {
      stderr += data;
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
    return submit(query.args, query.inputData, listener, query.isDownload);
  },

  refreshKey: function(key) {
    let request = buildHkpsKeyRequest(key);
    let errorMsgObj = {};
    this.access(request.actionFlags, request.keyserver, request.searchTerms, request.listener, errorMsgObj);
  }
};
