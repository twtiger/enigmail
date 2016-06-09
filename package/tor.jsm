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
Components.utils.import("resource://gre/modules/Services.jsm"); 


const Cc = Components.classes;
const Ci = Components.interfaces;



var EXPORTED_SYMBOLS = ["EnigmailTor"];

const EnigmailTor = {

  getConfiguration: { host: 'something', port: 'port' },

  getGpgActions: {}
};

function checkTorRequest(host, port){
  let torRequest = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
  torRequest.open("GET", "https://check.torproject.org/api/ip", false);
  torRequest.send(null);	
  return torRequest;
};

function isTorRunning(host, port){
	let response = checkTorRequest(host, port).response;
	return JSON.parse(response).IsTor;
}


