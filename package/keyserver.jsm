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

const nsIEnigmail = Ci.nsIEnigmail;

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
    var query = this.build(actionFlags, keyserver, searchTerms, errorMsgObj, EnigmailHttpProxy);
    return this.submit(query.args, query.inputData, query.isDownload, query.errors);
  },

  // TODO needed by key refresh service
  refreshKey: function(key) {
  },

  build: function(actionFlags, keyserver, searchTerms, errorMsgObj, proxyService) {
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

    // TODO set these constants in a more sane place
    // This could be in a TorState object... somewhere
    const torPort9050 = "socks5-hostname://127.0.0.1:9050";
    const torPort9150 = "socks5-hostname://127.0.0.1:9150";

    const proxyHost = proxyService.getHttpProxy(keyserver);

    // TODO review what takes precedence
    // TODO discuss tor running on a different host/port.
    // This would be an edge case, if the user hasn't already configured thunderbird to use these custom settings.
    if (proxyHost) {
      args = args.concat(["--keyserver-options", "http-proxy=" + proxyHost]);
    } else if (actionFlags & nsIEnigmail.USE_TOR_9050) {
      args.push("--keyserver-options ",  "http-proxy=" + torPort9050);
    } else if (actionFlags & nsIEnigmail.USE_TOR_9150) {
      args.push("--keyserver-options ",  "http-proxy=" + torPort9150);
    }
    args = args.concat(["--keyserver", keyserver.trim()]);

    let inputData = null;
    const searchTermsList = searchTerms.split(" ");

    if (actionFlags & nsIEnigmail.DOWNLOAD_KEY) {
      args.push("--recv-keys");
      args = args.concat(searchTermsList);
    }
    else if (actionFlags & nsIEnigmail.REFRESH_KEY) {
      args.push("--refresh-keys");
    }
    else if (actionFlags & nsIEnigmail.SEARCH_KEY) {
      args.push("--search-keys");
      args = args.concat(searchTermsList);
      inputData = "quit\n";
    }
    else if (actionFlags & nsIEnigmail.UPLOAD_KEY) {
      args.push("--send-keys");
      args = args.concat(searchTermsList);
    }

    const isDownload = actionFlags & (nsIEnigmail.REFRESH_KEY | nsIEnigmail.DOWNLOAD_KEY);

    return {"args": args, "inputData": inputData, "isDownload": isDownload, errors: errorMsgObj};
  },

  submit: function(args, inputData, listener, isDownload) {
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
};
