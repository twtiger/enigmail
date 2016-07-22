/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/
Cu.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Cu.import("resource://enigmail/rng.jsm"); /*global EnigmailRNG: false */
Cu.import("resource://enigmail/versioning.jsm"); /*global Versioning: false */
Cu.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */
Cu.import("resource://enigmail/socks5Proxy.jsm"); /*global Socks5Proxy: false */
Cu.import("resource://enigmail/gpg.jsm"); /*global EnigmailGpg: false */
Cu.import("resource://enigmail/files.jsm"); /*global EnigmailFiles: false */

const EXPORTED_SYMBOLS = ["EnigmailTor"];

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
  REFRESH: {requires: "refreshAllKeysRequireTor", uses: "refreshAllKeysWithTor", constant: Ci.nsIEnigmail.REFRESH_KEY}
};

function getAction(actionFlags) {
  for (let key in TOR_USER_PREFERENCES) {
    if (TOR_USER_PREFERENCES[key].constant & actionFlags) {
      return TOR_USER_PREFERENCES[key];
    }
  }
  return null;
}

function isPreferred(actionFlags) {
  const action = getAction(actionFlags);
  return EnigmailPrefs.getPref(action.requires) || EnigmailPrefs.getPref(action.uses);
}

function isRequired(actionFlags) {
  return EnigmailPrefs.getPref(getAction(actionFlags).requires);
}

function gpgProxyArgs(tor, versioning) {
  let args = "";
  if (EnigmailOS.isDosLike() || !versioning.versionFoundMeetsMinimumVersionRequired('curl', MINIMUM_CURL_SOCKS5H_VERSION)) {
    args += OLD_CURL_PROTOCOL;
  } else {
    args += NEW_CURL_PROTOCOL;
  }
  return args + createRandomCredential() + ":" + createRandomCredential() + "@" + tor.ip + ":" + tor.port;
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

function createRandomCredential() {
  return EnigmailRNG.getUint32().toString();
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

function meetsOSConstraints(versioning) {
  if (EnigmailOS.isDosLike()) {
    return versioning.versionMeetsMinimum(EnigmailGpg.agentVersion, MINIMUM_WINDOWS_GPG_VERSION);
  } else {
    return versioning.versionFoundMeetsMinimumVersionRequired('curl', MINIMUM_CURL_SOCKS5_PROXY_VERSION);
  }
}

function useAuthOverArgs(helper, versioning) {
  if (helper === 'torsocks2') {
    return versioning.versionFoundMeetsMinimumVersionRequired('torsocks2', TORSOCKS_VERSION_2);
  }
  return versioning.versionFoundMeetsMinimumVersionRequired('torsocks', TORSOCKS_VERSION_2);
}

function findTorExecutableHelper(versioning) {
  const helper = EnigmailFiles.simpleResolvePath('torsocks2') || EnigmailFiles.simpleResolvePath('torsocks');
  if (helper) {
    const authOverArgs = useAuthOverArgs(helper, versioning);
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
  if (!tor || !meetsOSConstraints(Versioning)) {
    return null;
  }
  return tor;
}


const systemCaller = {
  findTor: findTor,
  findTorExecutableHelper: findTorExecutableHelper,
};

function buildSocksProperties(tor, system) {
  return {
    command: 'gpg',
    args: gpgProxyArgs(tor, Versioning),
    envVars: []
  };
}

function torProperties(system) {
  const tor = system.findTor();
  if (!tor) {
    return {isAvailable: false, useTorMode: false, socks: null, helper: null};
  }

  const helper = system.findTorExecutableHelper(Versioning);
  let socks = null;
  let useTorMode = false;

  if (EnigmailGpg.usesSocksArguments()) {
    socks = buildSocksProperties(tor, system);
  } else if (EnigmailGpg.usesDirmngr()) {
    useTorMode = EnigmailGpg.dirmngrConfiguredWithTor();
  }

  return {isAvailable: true, useTorMode: useTorMode, socks: socks, helper: helper};
}

const EnigmailTor = {
  torProperties: function() {
    return torProperties(systemCaller);
  },
  isPreferred: isPreferred,
  isRequired: isRequired
};
