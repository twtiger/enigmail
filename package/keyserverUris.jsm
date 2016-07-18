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

function mapToHkpsName(keyserver) {
  if (keyserver === 'pool.sks-keyservers.net') {
    return 'hkps.pool.sks-keyservers.net';
  }
  return keyserver;
}

function buildProtocolAndKeyserver(keyserver){
  const protocolAndKeyserver = keyserver.split("://");
  const protocolIncluded = protocolAndKeyserver.length === 2;

  const uris = [];
  if (protocolIncluded) {
    const protocol = protocolAndKeyserver[0];
    uris.push({ protocol: protocol, keyserverName: protocolAndKeyserver[1], port: supportedProtocols[protocol]});
  }
  else {
    const hkpsKeyserverName = mapToHkpsName(keyserver);
    uris.push({ protocol: "hkps", keyserverName: hkpsKeyserverName, port: supportedProtocols.hkps});
    uris.push({ protocol: "hkp", keyserverName: keyserver, port: supportedProtocols.hkp});
  }
  return uris;
}

function prioritiseEncryption() {
  let urisInParts = [];
  getKeyservers().forEach(function(keyserver) {
    urisInParts = urisInParts.concat(buildProtocolAndKeyserver(keyserver));
  });

  const completeURI = [];
  sortWithHkpsFirst(urisInParts).forEach(function(uri) {
    completeURI.push(uri.protocol + "://" + uri.keyserverName + ":" + uri.port);
  });
  return completeURI;
}

const KeyserverURIs = {
  prioritiseEncryption: prioritiseEncryption
};
