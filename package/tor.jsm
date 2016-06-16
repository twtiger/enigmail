/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// TODO implement probe for where, or if, tor is running
// TODO check for torsocks binary

"use strict";

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm"); /*global XPCOMUtils:false */
Components.utils.import("resource://enigmail/prefs.jsm"); /* global EnigmailPrefs: false */
Components.utils.import("resource://enigmail/randomNumber.jsm"); /* global RandomNumberGenerator: false */
Components.utils.import("resource://enigmail/curl.jsm"); /* global Curl: false */

var EXPORTED_SYMBOLS = ["EnigmailTor"];

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;

const MINIMUM_CURL_VERSION = {
  main: 7,
  release: 21,
  patch: 7
};

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
const KEYSERVER_OPTION_FOR_CURL_7_21_7 = "http-proxy=socks5://";

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
let torIsAvailable = false;

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

    torIsAvailable = response.indexOf(EXPECTED_TOR_EXISTS_RESPONSE) !== -1;
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIRequestObserver, Ci.nsIStreamListener])
};

const torServiceFilter = {
  applyFilter: function(proxyService, uri, proxyInfo) {
    return proxyService.newProxyInfo("socks", EnigmailPrefs.getPref(TOR_IP_ADDR_PREF), EnigmailPrefs.getPref(TOR_SERVICE_PORT_PREF), CONNECTION_FLAGS, SECONDS_TO_WAIT, FAILOVER_PROXY);
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolProxyFilter, Ci.nsISupports])
};

const torBrowserBundleFilter = {
  applyFilter: function(proxyService, uri, proxyInfo) {
    return proxyService.newProxyInfo("socks", EnigmailPrefs.getPref(TOR_IP_ADDR_PREF), EnigmailPrefs.getPref(TOR_BROWSER_BUNDLE_PORT_PREF), CONNECTION_FLAGS, SECONDS_TO_WAIT, FAILOVER_PROXY);
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolProxyFilter, Ci.nsISupports])
};


function checkTorExists(filter) {
  protocolProxyService().registerFilter(filter, 1);

  createCheckTorURIChannel().asyncOpen(listener, SHARED_CONTEXT);
  while(!doneCheckingTor) currentThread().processNextEvent(true);

  let status = torIsAvailable;
  doneCheckingTor = false;
  torIsAvailable = false;
  return status;
}

function buildGpgProxyArguments() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  return ["--keyserver-options", KEYSERVER_OPTION_FOR_CURL_7_21_7 + username + ":" + password + "@"+EnigmailPrefs.getPref(TOR_IP_ADDR_PREF)+":9050"];
}

let threadManager = null;
function currentThread() {
  if (threadManager === null) {
    threadManager = Cc['@mozilla.org/thread-manager;1'].getService(Ci.nsIThreadManager);
  }
  return threadManager.currentThread;
}

function canUseTor(minimumCurlVersion) {
  if (!Curl.versionOver(minimumCurlVersion)) return false;
  if (checkTorExists(torBrowserBundleFilter)) return true;
  else return checkTorExists(torServiceFilter);
}

function getGpgActions(){ //needed for keyserver tests to run - implementation needs to be updated
  return {downloadKey: true, refreshKeys: false, searchKey: false, uploadKey: false};
}

function getConfiguration(){ //needed for keyserver tests to run - implementation needs to be updated
  return {};
}

const EnigmailTor = {
  MINIMUM_CURL_VERSION: MINIMUM_CURL_VERSION,
  canUseTor: canUseTor,
  buildGpgProxyArguments: buildGpgProxyArguments,
  gpgActions: getGpgActions,
  getConfiguration: getConfiguration
};
