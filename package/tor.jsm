/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// TODO read in from preferences at initialization and set attributes
// TODO implement probe for where, or if, tor is running
// TODO check for torsocks binary
// TODO gpg version to see if we support tor

"use strict";

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm"); /*global XPCOMUtils:false */
Components.utils.import("resource://enigmail/prefs.jsm"); /* global EnigmailPrefs: false */
Components.utils.import("resource://enigmail/randomNumber.jsm"); /* global RandomNumberGenerator: false */

var EXPORTED_SYMBOLS = ["EnigmailTor"];

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;

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
const TOR_IP_PORT_PREF = "extensions.enigmail.torIpPort";

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

const listener = {
  onStartRequest: function(request, context) {
    EnigmailLog.DEBUG("ON START REQUEST\n");
  },
  onStopRequest: function(request, context, statusCode) {
    EnigmailLog.DEBUG("ON STOP REQUEST\n");
    EnigmailTor.doneCheckingTor = true;
  },
  onDataAvailable: function(request, context, inputStream, offset, count) {
    EnigmailLog.DEBUG("ON DATA AVAILABLE\n");
    let response = createScriptableInputStream(inputStream).read(count);

    EnigmailLog.DEBUG("RESPONSE COUNT: " + count + "\n");
    EnigmailLog.DEBUG("RESPONSE: " + response + "\n");

    EnigmailTor.torIsAvailable = response.indexOf(EXPECTED_TOR_EXISTS_RESPONSE) !== -1;
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIRequestObserver, Ci.nsIStreamListener])
};

const filter = {
  applyFilter: function(proxyService, uri, proxyInfo) {
    return proxyService.newProxyInfo("socks", EnigmailPrefs.getPref(TOR_IP_ADDR_PREF), EnigmailPrefs.getPref(TOR_IP_PORT_PREF), CONNECTION_FLAGS, SECONDS_TO_WAIT, FAILOVER_PROXY);
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolProxyFilter, Ci.nsISupports])
};

function checkTor() {
  protocolProxyService().registerFilter(filter, 1);
  createCheckTorURIChannel().asyncOpen(listener, SHARED_CONTEXT);
}

function buildGpgProxyArguments() {

  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  return ["--keyserver-options", "http-proxy=socks5h://" + username + ":" + password + "@"+EnigmailPrefs.getPref(TOR_IP_ADDR_PREF)+":9050"];
}

const EnigmailTor = {
  doneCheckingTor: false,
  torIsAvailable: false,
  checkTor: checkTor,
  buildGpgProxyArguments: buildGpgProxyArguments
};
