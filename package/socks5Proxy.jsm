/* global Components: false */

"use strict";

var EXPORTED_SYMBOLS = ["Socks5Proxy"];

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm"); /*global XPCOMUtils:false */
Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/
Components.utils.import("resource://enigmail/prefs.jsm"); /* global EnigmailPrefs: false */

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;

const CHECK_TOR_URI = "https://check.torproject.org/api/ip";
const EXPECTED_TOR_EXISTS_RESPONSE = "\"IsTor\":true";
const TOR_IP_ADDR_PREF = "torIpAddr";

const CONNECTION_FLAGS = 0;
const SECONDS_TO_WAIT_FOR_CONNECTION = -1;

function createCheckTorURIChannel() {
  let ioservice = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
  return ioservice.newChannel2(CHECK_TOR_URI, "UTF-8", null, null, null, null, null, null);
}

function protocolProxyService() {
  return Cc["@mozilla.org/network/protocol-proxy-service;1"].getService(Ci.nsIProtocolProxyService);
}

function createScriptableInputStream(inputStream) {
  return CC("@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream", "init")(inputStream);
}

function buildListener(hasFoundTor, isDoneChecking) {
  const listener = {
    onStartRequest: function(request, context) {
      EnigmailLog.DEBUG("ON START REQUEST\n");
    },
    onStopRequest: function(request, context, statusCode) {
      EnigmailLog.DEBUG("ON STOP REQUEST\n");
      isDoneChecking();
    },
    onDataAvailable: function(request, context, inputStream, offset, count) {
      EnigmailLog.DEBUG("ON DATA AVAILABLE\n");
      let response = createScriptableInputStream(inputStream).read(count);

      EnigmailLog.DEBUG("RESPONSE COUNT: " + count + "\n");
      EnigmailLog.DEBUG("RESPONSE: " + response + "\n");

      hasFoundTor(response.indexOf(EXPECTED_TOR_EXISTS_RESPONSE) !== -1);
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIRequestObserver, Ci.nsIStreamListener])
  };
  return listener;
}

function getCurrentThread() {
    return Cc['@mozilla.org/thread-manager;1'].getService(Ci.nsIThreadManager).currentThread;
}

function filterWith(portPref) {
  const port = EnigmailPrefs.getPref(portPref);
  const failoverProxy = null;
  return {
    applyFilter: function(proxyService, uri, proxyInfo) {
      return proxyService.newProxyInfo("socks", EnigmailPrefs.getPref(TOR_IP_ADDR_PREF), port, CONNECTION_FLAGS, SECONDS_TO_WAIT_FOR_CONNECTION, failoverProxy);
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolProxyFilter, Ci.nsISupports])
  };
}

function checkTorExists(portPref) {
  const pps = protocolProxyService().registerFilter(filterWith(portPref), 1);

  let doneCheckingTor = false;
  let foundTor = false;

  function isDoneChecking() { doneCheckingTor = true; }
  function hasFoundTor(val) { foundTor = val; }

  const listener = buildListener(hasFoundTor, isDoneChecking);

  const sharedContext = null;
  const ioservice = createCheckTorURIChannel().asyncOpen(listener, sharedContext);
  const currentThread = getCurrentThread();

  while(!doneCheckingTor)  {
    currentThread.processNextEvent(true);
  }

  return foundTor;
}

const Socks5Proxy = {
  checkTorExists: checkTorExists,
  torIpAddr: function() {
    return EnigmailPrefs.getPref(TOR_IP_ADDR_PREF);
  }
};
