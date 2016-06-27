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

var EXPORTED_SYMBOLS = ["NewTor"];

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;

const MINIMUM_CURL_VERSION = {
  major: 7,
  minor: 21,
  patch: 7
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

const DOWNLOAD_KEY_PREF = "downloadKeyWithTor";
const REFRESH_KEY_PREF = "refreshKeysWithTor";
const SEARCH_KEY_PREF = "searchKeyWithTor";
const UPLOAD_KEY_PREF = "uploadKeyWithTor";

const DOWNLOAD_KEY_REQUIRED_PREF = "downloadKeyRequireTor";
const REFRESH_KEY_REQUIRED_PREF = "refreshKeysRequireTor";
const SEARCH_KEY_REQUIRED_PREF = "searchKeyRequireTor";
const UPLOAD_KEY_REQUIRED_PREF = "uploadKeyRequireTor";

const nsIEnigmail = Ci.nsIEnigmail;
function userWantsActionOverTor(actionFlags) {
  switch(actionFlags) {
    case actionFlags & nsIEnigmail.DOWNLOAD_KEY:
      return EnigmailPrefs.getPref(DOWNLOAD_KEY_PREF) === true;
    case actionFlags & nsIEnigmail.REFRESH_KEY:
      return EnigmailPrefs.getPref(REFRESH_KEY_PREF) === true;
    case actionFlags & nsIEnigmail.SEARCH_KEY:
      return EnigmailPrefs.getPref(SEARCH_KEY_PREF) === true;
    case actionFlags & nsIEnigmail.UPLOAD_KEY:
      return EnigmailPrefs.getPref(UPLOAD_KEY_PREF) === true;
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

  if (Socks5Proxy.checkTorExists(browserBundlePortPref)) {
    success.port = EnigmailPrefs.getPref(browserBundlePortPref);
    return success;
  } else if (Socks5Proxy.checkTorExists(servicePortPref)) {
    success.port = EnigmailPrefs.getPref(servicePortPref);
    return success;
  }

  return {
    found: false
  };
}

function meetsOSConstraints(os, executableEvaluator) {
  if (['WINNT', 'OS2'].indexOf(os) > -1) {
    return executableEvaluator.versionOverOrEqual('gpg', MINIMUM_WINDOWS_GPG_VERSION);
  } else {
    return executableEvaluator.versionOverOrEqual('curl', MINIMUM_CURL_VERSION);
  }
}

function createHelperArgs(helperName) {
  // TODO: support all these torhelpers...
  //const torHelpers = ['torsocks2', 'torsocks', 'usewithtor', 'torify'];
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  return ['--user', username, '--pass', password, '/usr/bin/gpg2'];
}

const systemCaller = {
  findTor: function() {
    const tor = torOnEither(TOR_BROWSER_BUNDLE_PORT_PREF, TOR_SERVICE_PORT_PREF);
    EnigmailLog.CONSOLE("Tor on either browser bundle port or service port: " + tor.found + "\n");
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

  findTorExecutableHelper: function() {
    // TODO: support all these torhelpers...
    //const torHelpers = ['torsocks2', 'torsocks', 'usewithtor', 'torify'];
    const torHelpers = ['torsocks'];
    for (let i=0; i<torHelpers.length; i++) {
      if (ExecutableEvaluator.exists(torHelpers[i]))
        return {
          exists: true,
          command: torHelpers[i],
          args: createHelperArgs(torHelpers[i])
        };
    }
    return {
      exists:false
    };
  },

  getOS: function() {
    return EnigmailOS.getOS();
  },
};

function torProperties(actionFlags, system) {
  const failure = { torExists: false };

  if (userWantsActionOverTor(actionFlags) === false) return failure;

  const tor = system.findTor();
  if (tor.exists === false) return failure;

  const torHelper = system.findTorExecutableHelper();
  if (torHelper.exists === true) {
    return {
      torExists: tor.exists,
      command: torHelper.command,
      args: torHelper.args
    };
  }

  return {
    torExists: tor.exists,
    command: 'gpg',
    args: gpgProxyArgs(tor, system)
  };
}

const NewTor = {
  torProperties: function(actionFlags) {
    return torProperties(actionFlags, systemCaller);
  },

  //TODO: should check for this in keyserver
  userRequiresTor: function(actionFlags) {
    switch(actionFlags) {
      case actionFlags & nsIEnigmail.DOWNLOAD_KEY:
        return EnigmailPrefs.getPref(DOWNLOAD_KEY_REQUIRED_PREF) === true;
      case actionFlags & nsIEnigmail.REFRESH_KEY:
        return EnigmailPrefs.getPref(REFRESH_KEY_REQUIRED_PREF) === true;
      case actionFlags & nsIEnigmail.SEARCH_KEY:
        return EnigmailPrefs.getPref(SEARCH_KEY_REQUIRED_PREF) === true;
      case actionFlags & nsIEnigmail.UPLOAD_KEY:
        return EnigmailPrefs.getPref(UPLOAD_KEY_REQUIRED_PREF) === true;
      default:
        return false;
    }
  }
};
