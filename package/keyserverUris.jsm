/*global Components:false */
"use strict";

var EXPORTED_SYMBOLS = ["KeyserverURIs"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */

const KEYSERVER_PREF = "keyserver";
const AUTO_KEYSERVER_SELECTION_PREF = "autoKeyServerSelection";

function getKeyservers(){
  const keyservers = EnigmailPrefs.getPref(KEYSERVER_PREF).split(/\s*[,;]\s*/g);
  return EnigmailPrefs.getPref(AUTO_KEYSERVER_SELECTION_PREF) ? [keyservers[0]] : keyservers;
}

function isHkps(keyserver){
  return keyserver.protocol === "hkps";
}

function sortWithHkpsFirst(keyservers){
  return keyservers.sort(function(a, b){
    if (isHkps(b) && !isHkps(a)){
      return 1;
    }
    if (isHkps(a) && !isHkps(b)){
      return -1;
    }
    return 0;
  });
}

const supportedProtocols = {
  "hkps": "443",
  "hkp": "11371",
  "ldap": "389"
};

function pushHkpsUri(keyserver, uris) {
  if (keyserver === 'pool.sks-keyservers.net') {
    uris.push({ protocol: "hkps", keyserverName: 'hkps.pool.sks-keyservers.net', port: supportedProtocols.hkps});
  } else {
    uris.push({ protocol: "hkps", keyserverName: keyserver, port: supportedProtocols.hkps});
  }
}

function buildProtocolAndKeyserver(keyserver){
  const protocolAndKeyserver = keyserver.split("://");
  const protocolIncluded = protocolAndKeyserver.length === 2;

  const uris = [];
  if (protocolIncluded) {
    const protocol = protocolAndKeyserver[0];
    const keyserverName = protocolAndKeyserver[1];
    const port = supportedProtocols[protocol];

    uris.push({ protocol: protocol, keyserverName: keyserverName, port: port});
  }
  else {
    pushHkpsUri(keyserver, uris);
    uris.push({ protocol: "hkp", keyserverName: keyserver, port: supportedProtocols.hkp});
  }
  return uris;
}

function prioritiseEncryption() {
  let uris = [];
  getKeyservers().forEach(function(keyserver) {
    uris = uris.concat(buildProtocolAndKeyserver(keyserver));
  });

  const addresses = [];
  sortWithHkpsFirst(uris).forEach(function(uri) {
    addresses.push(concatAddress(uri.protocol, uri.keyserverName, uri.port));
  });
  return addresses;
}

function concatAddress(protocol, keyserverName, port) {
  return protocol + "://" + keyserverName + ":" + port;
}

const KeyserverURIs = {
  prioritiseEncryption: prioritiseEncryption
};
