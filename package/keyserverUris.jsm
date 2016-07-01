/* global Components:false */
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

function buildProtocolAndKeyserver(keyserver){
  const supportedProtocols = {
    "hkps": "443",
    "hkp": "11371",
    "ldap": "389"
  };

  let protocols = [];

  const protocolAndKeyserver = keyserver.split("://");
  const protocolIncluded = protocolAndKeyserver.length === 2;

  if (protocolIncluded) {
    const protocol = protocolAndKeyserver[0];
    const keyserverName = protocolAndKeyserver[1];
    const port = supportedProtocols[protocol];

    protocols.push({ protocol: protocol, keyserverName: keyserverName, port: port});
  }
  else {
    protocols.push({ protocol: "hkps", keyserverName: keyserver, port: supportedProtocols.hkps});
    protocols.push({ protocol: "hkp", keyserverName: keyserver, port: supportedProtocols.hkp});
  }
  return protocols;
}

function prioritiseEncryption() {
  const keyservers = getKeyservers();
  let states = [];
  for (let i=0; i < keyservers.length; i++) {
    states = states.concat(buildProtocolAndKeyserver(keyservers[i]));
  }

  const addresses = [];
  sortWithHkpsFirst(states).forEach(function(uri) {
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
