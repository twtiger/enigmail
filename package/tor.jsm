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
Components.utils.import("resource://enigmail/timer.jsm"); /*global EnigmailTimer: false*/
Components.utils.import("resource://gre/modules/Services.jsm"); /*global Services: false*/
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm"); /*global XPCOMUtils:false */

const Cc = Components.classes;
const Ci = Components.interfaces;

var EXPORTED_SYMBOLS = ["EnigmailTor"];

const EnigmailTor = {
  getConfiguration: { host: 'something', port: 'port' },
  getGpgActions: {}
};

const callback = {
  onProxyAvailable: function(cancelableRequest, uri, proxyInfo, status) {
    EnigmailLog.DEBUG('IN PROXY AVAILABLE\n');
    EnigmailLog.DEBUG("status: ", status);
    let socketTransportService = Components.classes["@mozilla.org/network/socket-transport-service;1"]
      .getService(Components.interfaces.nsISocketTransportService);
    let socketTransport = socketTransportService.createTransport([], 0, "127.0.0.1", 9050, proxyInfo);
    EnigmailLog.DEBUG("CALLBACK IS ALIVE? " + socketTransport.isAlive() + "\n");
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolProxyCallback, Ci.nsISupports])
};

function createURI(){
  let iOService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  return iOService.newURI("https://check.torproject.org/api/ip", "UTF-8", null);
}

function isTorRunning(){
  EnigmailLog.setLogLevel(9000);


  let protocolProxyService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
    .getService(Components.interfaces.nsIProtocolProxyService);
  let cancel = protocolProxyService.asyncResolve(createURI(), Ci.nsIProtocolProxyService.RESOLVE_PREFER_SOCKS_PROXY, callback);

  let socketTransportService = Components.classes["@mozilla.org/network/socket-transport-service;1"]
    .getService(Components.interfaces.nsISocketTransportService);
  let socks5 = protocolProxyService.newProxyInfo("socks", "127.0.0.1", 9050, 0, 5 /* wait5Seconds */, null);
  let socketTransport = socketTransportService.createTransport([], 0, "127.0.0.1", 9050, socks5);

  EnigmailLog.DEBUG("GETTING: " + socketTransport.toString() + "\n");

  socketTransport.setEventSink({
    onTransportStatus: function(transport, status, progress, progressMax)
    {
      EnigmailLog.DEBUG('ON TRANSPORT STATUS\n');
      EnigmailLog.DEBUG("Status: " + status + "\n");
    },
    QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsITransportEventSink])
  }, Services.tm.currentThread);
  let inputStream = socketTransport.openInputStream(0,0,0);
  let outputStream = socketTransport.openOutputStream(0,0,0);

  return socketTransport;
}
