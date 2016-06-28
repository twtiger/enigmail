/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/
Components.utils.import("resource://enigmail/prefs.jsm"); /* global EnigmailPrefs: false */
Components.utils.import("resource://enigmail/randomNumber.jsm"); /* global RandomNumberGenerator: false */
Components.utils.import("resource://enigmail/executableEvaluator.jsm"); /* global ExecutableEvaluator: false */
Components.utils.import("resource://enigmail/os.jsm"); /* global EnigmailOS: false */
Components.utils.import("resource://enigmail/socks5Proxy.jsm"); /* global Socks5Proxy: false */

var EXPORTED_SYMBOLS = ["EnigmailTor"];

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;

const MINIMUM_CURL_VERSION = {
  major: 7,
  minor: 21,
  patch: 7
};

const TORSOCKS_VERSION_2 = {
  major: 2,
  minor: 0,
  patch: 0
};

// Stable and most used version according to gnupg.org
const MINIMUM_WINDOWS_GPG_VERSION = {
  major: 2,
  minor: 0,
  patch: 30
};

const TOR_SERVICE_PORT_PREF = "torServicePort";
const TOR_BROWSER_BUNDLE_PORT_PREF = "torBrowserBundlePort";
const HTTP_PROXY_GPG_OPTION = "http-proxy=";
const NEW_CURL_PROTOCOL = "socks5h://";
const OLD_CURL_PROTOCOL = "socks5-hostname://";

const USER_PREFS =  {
  DOWNLOAD_KEY: "downloadKeyWithTor",
  REFRESH_KEY: "refreshKeysWithTor",
  SEARCH_KEY:  "searchKeyWithTor",
  UPLOAD_KEY:  "uploadKeyWithTor",
  DOWNLOAD_KEY_REQUIRED:  "downloadKeyRequireTor",
  REFRESH_KEY_REQUIRED:  "refreshKeysRequireTor",
  SEARCH_KEY_REQUIRED: "searchKeyRequireTor",
  UPLOAD_KEY_REQUIRED:  "uploadKeyRequireTor"
};


const nsIEnigmail = Ci.nsIEnigmail;
function userWantsActionOverTor(actionFlags) {
  switch(actionFlags) {
    case actionFlags & nsIEnigmail.DOWNLOAD_KEY:
      return EnigmailPrefs.getPref(USER_PREFS.DOWNLOAD_KEY) === true;
    case actionFlags & nsIEnigmail.REFRESH_KEY:
      return EnigmailPrefs.getPref(USER_PREFS.REFRESH_KEY) === true;
    case actionFlags & nsIEnigmail.SEARCH_KEY:
      return EnigmailPrefs.getPref(USER_PREFS.SEARCH_KEY) === true;
    case actionFlags & nsIEnigmail.UPLOAD_KEY:
      return EnigmailPrefs.getPref(USER_PREFS.UPLOAD_KEY) === true;
    default:
      return false;
  }
}

function gpgProxyArgs(tor, system) {
  // TODO establish when to use socks5-hostname on nonWindows
  const args = ['--keyserver-options', HTTP_PROXY_GPG_OPTION];
  if (system.isDosLike() === true) {
    args[1] += OLD_CURL_PROTOCOL;
  } else {
    args[1] += NEW_CURL_PROTOCOL;
  }

  args[1] += tor.username + ":" + tor.password + "@" + tor.ip + ":" + tor.port;

  return args;
}

function torOnEither(browserBundlePortPref, servicePortPref) {
  const success = {
    found: true,
    ip: Socks5Proxy.torIpAddr()
  };

  const portPrefs = [browserBundlePortPref, servicePortPref];
  for (let i=0; i < portPrefs.length; i++) {
    if (Socks5Proxy.checkTorExists(portPrefs[i])) {
      success.port = EnigmailPrefs.getPref(portPrefs[i]);

      EnigmailLog.CONSOLE("Tor found on IP: " + success.ip + ", port: " + success.port + "\n\n");

      return success;
    }
  }

  return {
    found: false
  };
}

function meetsOSConstraints(os, executableEvaluator) {
  if (['WINNT', 'OS2'].indexOf(os) > -1) {
    return executableEvaluator.versionOverOrEqual('gpg', MINIMUM_WINDOWS_GPG_VERSION, ExecutableEvaluator.executor);
  } else {
    return executableEvaluator.versionOverOrEqual('curl', MINIMUM_CURL_VERSION, ExecutableEvaluator.executor);
  }
}

function createHelperArgs(helper, addAuth) {
  let args = [];
  if (addAuth) {
    const username = RandomNumberGenerator.getUint32();
    const password = RandomNumberGenerator.getUint32();
    args.push('--user', username, '--pass', password);
  }
  args.push('/usr/bin/gpg2');
  return args;
}

const systemCaller = {
  findTor: function() {
    const tor = torOnEither(TOR_BROWSER_BUNDLE_PORT_PREF, TOR_SERVICE_PORT_PREF);
    if (tor.found === false || !meetsOSConstraints(EnigmailOS.getOS(), ExecutableEvaluator))
      return { exists: false };
    else
      return {
        exists: true,
        ip: tor.ip,
        port: tor.port,
        username: RandomNumberGenerator.getUint32(),
        password: RandomNumberGenerator.getUint32()
      };
  },
  findTorExecutableHelper: findTorExecutableHelper,
  getOS: function() {
    return EnigmailOS.getOS();
  },
  isDosLike: function() {
    return EnigmailOS.isDosLike();
  }
};

function buildEnvVars(helper) {
  let envVars = [];
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  envVars.push("TORSOCKS_USERNAME=" + username);
  envVars.push("TORSOCKS_PASSWORD=" + password);
  return envVars;
}

function useAuthOverArgs(helper, executableEvaluator) {
  if (helper == 'torsocks') {
    return executableEvaluator.versionOverOrEqual('torsocks', TORSOCKS_VERSION_2, ExecutableEvaluator.executor);
  }
  return true;
}

function findTorExecutableHelper(executableEvaluator) {
  const torHelpers = ['torsocks2', 'torsocks', 'usewithtor', 'torify'];
  for (let i=0; i<torHelpers.length; i++) {
    if (executableEvaluator.exists(torHelpers[i])) {
      const authOverArgs = useAuthOverArgs(torHelpers[i], executableEvaluator);
      return {
        exists: true,
        envVars: (authOverArgs ? [] : buildEnvVars(torHelpers[i])),
        command: torHelpers[i],
        args: createHelperArgs(torHelpers[i], authOverArgs)
      };
    }
  }
  return {
    exists:false
  };
}

function torProperties(actionFlags, system) {
  const failure = { torExists: false };

  if (userWantsActionOverTor(actionFlags) === false) return failure;

  const tor = system.findTor();
  if (tor.exists === false) return failure;

  const torHelper = system.findTorExecutableHelper(ExecutableEvaluator);
  if (torHelper.exists === true) {
    return {
      torExists: tor.exists,
      command: torHelper.command,
      envVars: torHelper.envVars,
      args: torHelper.args
    };
  }

  return {
    torExists: tor.exists,
    command: 'gpg',
    args: gpgProxyArgs(tor, system)
  };
}

const EnigmailTor = {
  torProperties: function(actionFlags) {
    return torProperties(actionFlags, systemCaller);
  },

  //TODO: should check for this in keyserver
  userRequiresTor: function(actionFlags) {
    switch(actionFlags) {
      case actionFlags & nsIEnigmail.DOWNLOAD_KEY:
        return EnigmailPrefs.getPref(USER_PREFS.DOWNLOAD_KEY_REQUIRED) === true;
      case actionFlags & nsIEnigmail.REFRESH_KEY:
        return EnigmailPrefs.getPref(USER_PREFS.REFRESH_KEY_REQUIRED) === true;
      case actionFlags & nsIEnigmail.SEARCH_KEY:
        return EnigmailPrefs.getPref(USER_PREFS.SEARCH_KEY_REQUIRED) === true;
      case actionFlags & nsIEnigmail.UPLOAD_KEY:
        return EnigmailPrefs.getPref(USER_PREFS.UPLOAD_KEY_REQUIRED) === true;
      default:
        return false;
    }
  }
};
