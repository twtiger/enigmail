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

var EXPORTED_SYMBOLS = ["EnigmailTor"];

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;

const ScriptableInputStream = CC("@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream", "init");
const iOService = Cc["@mozilla.org/network/io-service;1"]
  .getService(Ci.nsIIOService);

const EnigmailTor = {
  getConfiguration: { host: 'something', port: 'port' },
  getGpgActions: {}
};

const listener = {
  onStartRequest: function(request, context) {
    EnigmailLog.DEBUG("ON START REQUEST\n");
  },
  onStopRequest: function(request, context, statusCode) {
    EnigmailLog.DEBUG("ON STOP REQUEST\n");
    EnigmailLog.DEBUG("QUE ES MI STATUS?? " + statusCode +"\n");
  },
  onDataAvailable: function(request, context, inputStream, offset, count) {
    EnigmailLog.DEBUG("ON DATA AVAILABLE\n");
    let responseStream = new ScriptableInputStream(inputStream);
    let response = responseStream.read(count);

    EnigmailLog.DEBUG("RESPONSE COUNT: " + count + "\n");
    EnigmailLog.DEBUG("RESPONSE: " + response + "\n");
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIRequestObserver, Ci.nsIStreamListener])
};

const DOCKER_ADAPTER = ""; // For local testing (TODO: remove)
const LOCALHOST = "127.0.0.1";
const LOCAL_TOR_PORT = 9050;
const CHECK_TOR_URI = "https://check.torproject.org/api/ip";
const SECONDS_TO_WAIT = -1;
const CONNECTION_FLAGS = 0; // Require DNS lookup
const FAILOVER_PROXY = null;
const EXPECTED_TOR_CHECK_RESPONSE = "\"IsTor\":true";

const filter = {
  applyFilter: function(proxyService, uri, proxyInfo) {
    return proxyService.newProxyInfo("socks", DOCKER_ADAPTER, LOCAL_TOR_PORT, CONNECTION_FLAGS, SECONDS_TO_WAIT, FAILOVER_PROXY);
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolProxyFilter, Ci.nsISupports])
};

function isTorRunning() {
  EnigmailLog.setLogLevel(9000);
  let protocolProxyService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
    .getService(Components.interfaces.nsIProtocolProxyService);
  protocolProxyService.registerFilter(filter, 1);

  // TODO: use asyncOpen(listener, null) instead
  let httpChannel = iOService.newChannel2(CHECK_TOR_URI, "UTF-8", null, null, null, null, null, null);
  let responseStream = new ScriptableInputStream(httpChannel.open());
  let responseCount = responseStream.available();
  let response = responseStream.read(responseCount);

  EnigmailLog.DEBUG("RESPONSE COUNT: " + responseCount + "\n");
  EnigmailLog.DEBUG("RESPONSE: " + response + "\n");

  responseStream.close();

  return response.indexOf(EXPECTED_TOR_CHECK_RESPONSE) !== -1;
}
