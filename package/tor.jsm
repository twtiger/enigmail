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
Components.utils.import("resource://enigmail/gpg.jsm"); /*global EnigmailGpg: false */

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
const NEW_CURL_PROTOCOL = "socks5h://";
const OLD_CURL_PROTOCOL = "socks5-hostname://";

function gpgProxyInfo(tor, system) {
  // TODO establish when to use socks5-hostname on nonWindows
  let proxyInfo = "";
  if (system.isDosLike() === true) {
    proxyInfo += OLD_CURL_PROTOCOL;
  } else {
    proxyInfo += NEW_CURL_PROTOCOL;
  }
  proxyInfo += tor.username + ":" + tor.password + "@" + tor.ip + ":" + tor.port;
  return proxyInfo;
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
  args.push(EnigmailGpg.agentPath.path);
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
    exists:false
  };
}

function torProperties(system) {
  const failure = { torExists: false };

  const tor = system.findTor();
  if (tor.exists !== true) return failure;

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
    args: [gpgProxyInfo(tor, system)],
    envVars: []
  };
}

const nsIEnigmail = Ci.nsIEnigmail;
const EnigmailTor = {
  torProperties: function() {
    return torProperties(systemCaller);
  },
};
