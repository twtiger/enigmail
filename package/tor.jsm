/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// TODO check for torsocks binary

"use strict";

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm"); /*global XPCOMUtils:false */
Components.utils.import("resource://enigmail/prefs.jsm"); /* global EnigmailPrefs: false */
Components.utils.import("resource://enigmail/randomNumber.jsm"); /* global RandomNumberGenerator: false */
Components.utils.import("resource://enigmail/executableEvaluator.jsm"); /* global ExecutableEvaluator: false */

var EXPORTED_SYMBOLS = ["EnigmailTor"];

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

const VERSION_NUMERIC_BASE = 10;

const LOCALHOST = "127.0.0.1";
const LOCAL_TOR_PORT = 9050;
const CHECK_TOR_URI = "https://check.torproject.org/api/ip";
const CONNECTION_FLAGS = 0; // Require DNS lookup
const SECONDS_TO_WAIT = -1;
const FAILOVER_PROXY = null;
const SHARED_CONTEXT = null;
const LOADING_NODE = null;
const LOADING_PRINCIPAL = null;
const SECURITY_FLAGS = null;
const CONTENT_POLICY = null;
const BASE_URI = null;

const EXPECTED_TOR_EXISTS_RESPONSE = "\"IsTor\":true";
const TOR_IP_ADDR_PREF = "extensions.enigmail.torIpAddr";
const TOR_SERVICE_PORT_PREF = "extensions.enigmail.torServicePort";
const TOR_BROWSER_BUNDLE_PORT_PREF = "extensions.enigmail.torBrowserBundlePort";
const HTTP_PROXY_GPG_OPTION = "http-proxy=";
const NEW_CURL_PROTOCOL = "socks5://";
const OLD_CURL_PROTOCOL = "socks5-hostname://";

const DOWNLOAD_KEY_PREF = "extensions.enigmail.tor.downloadKey";
const DOWNLOAD_KEY_REQUIRED_PREF = "extensions.enigmail.tor.downloadKeyRequireTor";
const REFRESH_KEY_PREF = "extensions.enigmail.tor.refreshKeys";
const REFRESH_KEY_REQUIRED_PREF = "extensions.enigmail.tor.refreshKeysRequireTor";
const SEARCH_KEY_PREF = "extensions.enigmail.tor.searchKey";
const SEARCH_KEY_REQUIRED_PREF = "extensions.enigmail.tor.searchKeyRequireTor";
const UPLOAD_KEY_PREF = "extensions.enigmail.tor.uploadKey";
const UPLOAD_KEY_REQUIRED_PREF = "extensions.enigmail.tor.uploadKeyRequireTor";

let ioservice= null;
function createCheckTorURIChannel() {
  if (ioservice === null) {
    ioservice = Cc["@mozilla.org/network/io-service;1"]
      .getService(Ci.nsIIOService);
  }
  return ioservice.newChannel2(CHECK_TOR_URI, "UTF-8", BASE_URI, LOADING_NODE, LOADING_PRINCIPAL, LOADING_PRINCIPAL, SECURITY_FLAGS, CONTENT_POLICY);
}

let pps = null;
function protocolProxyService() {
  if (pps === null) {
    pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
      .getService(Components.interfaces.nsIProtocolProxyService);
  }
  return pps;
}

function createScriptableInputStream(inputStream) {
  return CC("@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream", "init")(inputStream);
}

let doneCheckingTor = false;
let foundTor = false;

const listener = {
  onStartRequest: function(request, context) {
    EnigmailLog.DEBUG("ON START REQUEST\n");
  },
  onStopRequest: function(request, context, statusCode) {
    EnigmailLog.DEBUG("ON STOP REQUEST\n");
    doneCheckingTor = true;
  },
  onDataAvailable: function(request, context, inputStream, offset, count) {
    EnigmailLog.DEBUG("ON DATA AVAILABLE\n");
    let response = createScriptableInputStream(inputStream).read(count);

    EnigmailLog.DEBUG("RESPONSE COUNT: " + count + "\n");
    EnigmailLog.DEBUG("RESPONSE: " + response + "\n");

    foundTor = response.indexOf(EXPECTED_TOR_EXISTS_RESPONSE) !== -1;
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIRequestObserver, Ci.nsIStreamListener])
};

function filterWith(port) {
  return {
    applyFilter: function(proxyService, uri, proxyInfo) {
      return proxyService.newProxyInfo("socks", EnigmailPrefs.getPref(TOR_IP_ADDR_PREF), port, CONNECTION_FLAGS, SECONDS_TO_WAIT, FAILOVER_PROXY);
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolProxyFilter, Ci.nsISupports])
  };
}

function checkTorExists(filter) {
  protocolProxyService().registerFilter(filter, 1);

  createCheckTorURIChannel().asyncOpen(listener, SHARED_CONTEXT);
  while(!doneCheckingTor) currentThread().processNextEvent(true);

  let status = foundTor;
  doneCheckingTor = false;
  foundTor = false;
  return status;
}

function buildGpgProxyArguments(type) {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();

  if (type.type === 'torsocks') {
    return ['torsocks', '--user', username, '--pass', password];
  }

  const args = ["--keyserver-options", HTTP_PROXY_GPG_OPTION];
  if (type.os === "OS2" || type.os === "WINNT") {
    args[1] += OLD_CURL_PROTOCOL;
  } else {
    args[1] += NEW_CURL_PROTOCOL;
  }
  args[1] += username + ":" + password + "@" + EnigmailPrefs.getPref(TOR_IP_ADDR_PREF) + ":" + EnigmailPrefs.getPref(type.port_pref);
  return args;
}

let threadManager = null;
function currentThread() {
  if (threadManager === null) {
    threadManager = Cc['@mozilla.org/thread-manager;1'].getService(Ci.nsIThreadManager);
  }
  return threadManager.currentThread;
}

function torOnEither(browserBundlePortPref, servicePortPref) {
  return checkTorExists(filterWith(EnigmailPrefs.getPref(browserBundlePortPref))) ||
    checkTorExists(filterWith(EnigmailPrefs.getPref(servicePortPref)));
}

function torIsAvailable(os, executableEvaluator) {
  const failure = {
    status: false,
  };

  if (os === "WINNT" || os === "OS2") {
    if (!executableEvaluator.versionOverOrEqual('gpg', MINIMUM_WINDOWS_GPG_VERSION, ExecutableEvaluator.executor)) return failure;
  } else {
    if (executableEvaluator.exists('torsocks')) {
      if (torOnEither(TOR_BROWSER_BUNDLE_PORT_PREF, TOR_SERVICE_PORT_PREF)) {
        return { status: true, type: 'torsocks' };
      } else {
        return failure;
      }
    }
    if (!executableEvaluator.versionOverOrEqual('curl', MINIMUM_CURL_VERSION)) return failure;
  }

  if (checkTorExists(filterWith(EnigmailPrefs.getPref(TOR_BROWSER_BUNDLE_PORT_PREF)))) {
    return {
      status: true,
      type: 'gpg-proxy',
      port_pref: TOR_BROWSER_BUNDLE_PORT_PREF
    };
  }

  if (checkTorExists(filterWith(EnigmailPrefs.getPref(TOR_SERVICE_PORT_PREF)))) {
    return {
      status: true,
      type: 'gpg-proxy',
      port_pref: TOR_SERVICE_PORT_PREF
    };
  }

  return failure;
}

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

function userRequiresTor(actionFlags) {
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

function getConfiguration(){ //needed for keyserver tests to run - implementation needs to be updated
  return {};
}

const EnigmailTor = {
  torIsAvailable: torIsAvailable,
  buildGpgProxyArguments: buildGpgProxyArguments,
  userWantsActionOverTor: userWantsActionOverTor,
  userRequiresTor: userRequiresTor,
  getConfiguration: getConfiguration
};
