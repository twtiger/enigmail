/* global Components: false */

"use strict";

var EXPORTED_SYMBOLS = ["Socks5Proxy"];

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm"); /*global XPCOMUtils:false */
Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/
Components.utils.import("resource://enigmail/prefs.jsm"); /* global EnigmailPrefs: false */

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;

const FAILOVER_PROXY = null;
const SHARED_CONTEXT = null;
const LOADING_NODE = null;
const LOADING_PRINCIPAL = null;
const SECURITY_FLAGS = null;
const CONTENT_POLICY = null;
const BASE_URI = null;

const CHECK_TOR_URI = "https://check.torproject.org/api/ip";
const EXPECTED_TOR_EXISTS_RESPONSE = "\"IsTor\":true";
const TOR_IP_ADDR_PREF = "torIpAddr";

const CONNECTION_FLAGS = 0;
const SECONDS_TO_WAIT_FOR_CONNECTION = -1;

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
    pps = Cc["@mozilla.org/network/protocol-proxy-service;1"]
      .getService(Ci.nsIProtocolProxyService);
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

let threadManager = null;
function currentThread() {
  if (threadManager === null) {
    threadManager = Cc['@mozilla.org/thread-manager;1'].getService(Ci.nsIThreadManager);
  }
  return threadManager.currentThread;
}

function filterWith(portPref) {
  const port = EnigmailPrefs.getPref(portPref);
  return {
    applyFilter: function(proxyService, uri, proxyInfo) {
      return proxyService.newProxyInfo("socks", EnigmailPrefs.getPref(TOR_IP_ADDR_PREF), port, CONNECTION_FLAGS, SECONDS_TO_WAIT_FOR_CONNECTION, FAILOVER_PROXY);
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolProxyFilter, Ci.nsISupports])
  };
}

function checkTorExists(portPref) {
  EnigmailLog.CONSOLE("Checking if tor is there...");
  protocolProxyService().registerFilter(filterWith(portPref), 1);

  createCheckTorURIChannel().asyncOpen(listener, SHARED_CONTEXT);
  while(!doneCheckingTor) currentThread().processNextEvent(true);

  let status = foundTor;
  doneCheckingTor = false;
  foundTor = false;
  return status;
}

const Socks5Proxy = {
  checkTorExists: checkTorExists,
  torIpAddr: function() {
    return EnigmailPrefs.getPref(TOR_IP_ADDR_PREF);
  }
};
