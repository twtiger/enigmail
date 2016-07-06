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
Components.utils.import("resource://enigmail/executableEvaluator.jsm"); /*global ExecutableEvaluator: false */
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

function gpgProxyArgs(tor, system, executableEvaluator) {
  let proto = NEW_CURL_PROTOCOL;
  if (system.isDosLike() ||
    !executableEvaluator.versionOverOrEqual('curl', MINIMUM_CURL_SOCKS5H_VERSION)) {
    proto = OLD_CURL_PROTOCOL;
  }
  return proto + tor.username + ":" + tor.password + "@" + tor.ip + ":" + tor.port;
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
    return executableEvaluator.versionOverOrEqual('gpg', MINIMUM_WINDOWS_GPG_VERSION);
  } else {
    return executableEvaluator.versionOverOrEqual('curl', MINIMUM_CURL_SOCKS5_PROXY_VERSION);
  }
}

function createRandomCredential() {
  return RandomNumberGenerator.getUint32().toString();
}

function createHelperArgs(helper, addAuth) {
  let args = [];
  if (addAuth) {
    args.push('--user', createRandomCredential(), '--pass', createRandomCredential());
  }
  args.push(EnigmailGpg.agentPath.path);
  return args;
}

function buildEnvVars(helper) {
  return [
    "TORSOCKS_USERNAME=" + createRandomCredential(),
    "TORSOCKS_PASSWORD=" + createRandomCredential()
  ];
}

function useAuthOverArgs(helper, executableEvaluator) {
  if (helper === 'torsocks') {
    return executableEvaluator.versionOverOrEqual('torsocks', TORSOCKS_VERSION_2, ExecutableEvaluator.executor);
  }
  return true;
}

function findTorExecutableHelper(executableEvaluator) {
  const torHelpers = ['torsocks', 'torsocks2', 'torify', 'usewithtor'];
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
    exists: false
  };
}

function findTor() {
  const tor = torOnEither(TOR_BROWSER_BUNDLE_PORT_PREF, TOR_SERVICE_PORT_PREF);
  if (!tor.found || !meetsOSConstraints(EnigmailOS.getOS(), ExecutableEvaluator)) {
    return { exists: false };
  } else
    return {
      exists: true,
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
  const failure = { torExists: false };

  const tor = system.findTor();
  if (!tor.exists) return failure;

  const torHelper = system.findTorExecutableHelper(ExecutableEvaluator);
  if (torHelper.exists) {
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
    args: gpgProxyArgs(tor, system, ExecutableEvaluator),
    envVars: []
  };
}

const nsIEnigmail = Ci.nsIEnigmail;
const EnigmailTor = {
  torProperties: function() {
    return torProperties(systemCaller);
  },
  isUsed: isUsed,
  isRequired: isRequired
};
