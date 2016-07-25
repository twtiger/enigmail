/*global Components:false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const EXPORTED_SYMBOLS = ["EnigmailKeyserverURIs"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */

const KEYSERVER_PREF = "keyserver";
const AUTO_KEYSERVER_SELECTION_PREF = "autoKeyServerSelection";

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

function buildUriFrom(keyserver) {
  const uris = [];
  const keyserverProtocolAndName = keyserver.split("://");
  const protocolIncluded = keyserverProtocolAndName.length === 2;

  if (protocolIncluded){
    const protocol = keyserverProtocolAndName[0];
    uris.push({ protocol: protocol, keyserverName: keyserverProtocolAndName[1], port: supportedProtocols[protocol]});
  } else {
    const hkpsKeyserverName = mapToHkpsName(keyserver);
    uris.push({ protocol: "hkps", keyserverName: hkpsKeyserverName, port: supportedProtocols.hkps});
    uris.push({ protocol: "hkp", keyserverName: keyserver, port: supportedProtocols.hkp});
  }

  return uris;
}

function getKeyservers() {
  const keyservers = EnigmailPrefs.getPref(KEYSERVER_PREF).split(/\s*[,;]\s*/g);
  return EnigmailPrefs.getPref(AUTO_KEYSERVER_SELECTION_PREF) ? [keyservers[0]] : keyservers;
}

function concatProtocolKeyserverNamePort(protocol, keyserverName, port) {
  // Returns hkps.pool.sks-keyservers.net only because
  // GnuPG version 2.1.14 in Windows does not parse
  // hkps://hkps.pool.sks-keyservers.net:443 correctly
  if (keyserverName === 'hkps.pool.sks-keyservers.net') {
    return keyserverName;
  } else {
    return protocol + "://" + keyserverName + ":" + port;
  }
}

function buildKeyserverUris() {
  const uris = getKeyservers().map(function(keyserver) {
    return buildUriFrom(keyserver);;
  }).reduce(function(a, b) {
    return a.concat(b);
  });

  return uris.map(function(uri) {return concatProtocolKeyserverNamePort(uri.protocol, uri.keyserverName, uri.port);});
}

const EnigmailKeyserverURIs = {
  buildKeyserverUris: buildKeyserverUris
};
