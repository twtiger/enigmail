/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/
Components.utils.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Components.utils.import("resource://enigmail/randomNumber.jsm"); /*global RandomNumberGenerator: false */
Components.utils.import("resource://enigmail/executableCheck.jsm"); /*global ExecutableCheck: false */
Components.utils.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */
Components.utils.import("resource://enigmail/socks5Proxy.jsm"); /*global Socks5Proxy: false */
Components.utils.import("resource://enigmail/gpg.jsm"); /*global EnigmailGpg: false */

const EXPORTED_SYMBOLS = ["EnigmailTor"];

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;

function v(maj, min, pat) {
  return {major: maj, minor: min, patch: pat};
}

// Minimum for using socks5h:// prefix
const MINIMUM_CURL_SOCKS5H_VERSION = v(7, 21, 7);

// Minimum for using socks5 proxies with curl
const MINIMUM_CURL_SOCKS5_PROXY_VERSION = v(7, 18, 0);

// Stable and most used version according to gnupg.org
const MINIMUM_WINDOWS_GPG_VERSION = v(2, 0, 30);

const TOR_HELPERS = ['torsocks2', 'torsocks', 'torify', 'usewithtor'];

const TORSOCKS_VERSION_2 = v(2, 0, 0);

const TOR_SERVICE_PORT_PREF = "torServicePort";
const TOR_BROWSER_BUNDLE_PORT_PREF = "torBrowserBundlePort";
const NEW_CURL_PROTOCOL = "socks5h://";
const OLD_CURL_PROTOCOL = "socks5-hostname://";

const TOR_USER_PREFERENCES= {
  DOWNLOAD:{requires: "downloadKeyRequireTor", uses: "downloadKeyWithTor", constant: Ci.nsIEnigmail.DOWNLOAD_KEY},
  SEARCH: {requires: "searchKeyRequireTor", uses: "searchKeyWithTor", constant: Ci.nsIEnigmail.SEARCH_KEY},
  UPLOAD: {requires: "uploadKeyRequireTor", uses: "uploadKeyWithTor", constant: Ci.nsIEnigmail.UPLOAD_KEY},
  REFRESH: {requires: "refreshKeyRequireTor", uses: "refreshKeyWithTor", constant: Ci.nsIEnigmail.REFRESH_KEY}
};

function getAction(actionFlags) {
  for (let key in TOR_USER_PREFERENCES) {
    if (TOR_USER_PREFERENCES[key].constant & actionFlags) {
      return TOR_USER_PREFERENCES[key];
    }
  }
  return null;
}

function isUsed(actionFlags) {
  const action = getAction(actionFlags);
  return EnigmailPrefs.getPref(action.requires) || EnigmailPrefs.getPref(action.uses);
}

function isRequired(actionFlags) {
  return EnigmailPrefs.getPref(getAction(actionFlags).requires);
}


function gpgProxyArgs(tor, system, executableCheck) {
  if (system.isDosLike() ||
    !executableCheck.versionFoundMeetsMinimumVersionRequired('curl', MINIMUM_CURL_SOCKS5H_VERSION)) {
    return OLD_CURL_PROTOCOL + tor.username + ":" + tor.password + "@" + tor.ip + ":" + tor.port;
  }
  return NEW_CURL_PROTOCOL + tor.username + ":" + tor.password + "@" + tor.ip + ":" + tor.port;
}

function torOn(portPref) {
  if (Socks5Proxy.checkTorExists(portPref)) {
    const port = EnigmailPrefs.getPref(portPref);

    EnigmailLog.CONSOLE("Tor found on IP: " + Socks5Proxy.torIpAddr() + ", port: " + port + "\n\n");

    return {
      ip: Socks5Proxy.torIpAddr(),
      port: port
    };
  }
  return null;
}

function meetsOSConstraints(os, executableCheck) {
  if (os === 'WINNT' || os === 'OS2') {
    return executableCheck.versionFoundMeetsMinimumVersionRequired('gpg', MINIMUM_WINDOWS_GPG_VERSION);
  } else {
    return executableCheck.versionFoundMeetsMinimumVersionRequired('curl', MINIMUM_CURL_SOCKS5_PROXY_VERSION);
  }
}

function createRandomCredential() {
  return RandomNumberGenerator.getUint32().toString();
}

function createHelperArgs(helper, addAuth) {
  let args = [];
  if (addAuth) {
    args = ['--user', createRandomCredential(), '--pass', createRandomCredential()];
  }
  args.push(EnigmailGpg.agentPath.path);
  return args;
}

function buildEnvVars() {
  return [
    "TORSOCKS_USERNAME=" + createRandomCredential(),
    "TORSOCKS_PASSWORD=" + createRandomCredential()
  ];
}

function useAuthOverArgs(helper, executableCheck) {
  if (helper === 'torsocks2') {
    return executableCheck.versionFoundMeetsMinimumVersionRequired('torsocks2', TORSOCKS_VERSION_2);
  }
  return executableCheck.versionFoundMeetsMinimumVersionRequired('torsocks', TORSOCKS_VERSION_2);
}

function findTorExecutableHelper(executableCheck) {
  const helper = executableCheck.findExecutable('torsocks2') || executableCheck.findExecutable('torsocks');
  if (helper) {
    const authOverArgs = useAuthOverArgs(helper, executableCheck);
    return {
      envVars: (authOverArgs ? [] : buildEnvVars()),
      command: helper,
      args: createHelperArgs(helper, authOverArgs)
    };
  } else {
    return null;
  }
}

function findTor() {
  const tor = torOn(TOR_BROWSER_BUNDLE_PORT_PREF) || torOn(TOR_SERVICE_PORT_PREF);
  if (!tor || !meetsOSConstraints(EnigmailOS.getOS(), ExecutableCheck))
    return null;
  else
    return {
      ip: tor.ip,
      port: tor.port,
      username: createRandomCredential(),
      password: createRandomCredential()
    };
}

const systemCaller = {
  findTor: findTor,
  findTorExecutableHelper: findTorExecutableHelper,
  getOS: EnigmailOS.getOS,
  isDosLike: EnigmailOS.isDosLike
};

function torProperties(system) {
  const tor = system.findTor();
  if (!tor) return null;

  let torRequests = {};
  const torHelper = system.findTorExecutableHelper(ExecutableCheck);
  if (torHelper) {
    torRequests.helper = torHelper;
  }

  torRequests.socks = {
    command: 'gpg',
    args: gpgProxyArgs(tor, system, ExecutableCheck),
    envVars: []
  };
  return torRequests;
}

const EnigmailTor = {
  torProperties: function() {
    return torProperties(systemCaller);
  },
  isUsed: isUsed,
  isRequired: isRequired
};
