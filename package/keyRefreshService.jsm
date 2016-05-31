/*global Components: false, EnigmailLog: false */

/* eslint no-invalid-this: 0 */

"use strict";

var EXPORTED_SYMBOLS = ["KeyRefreshService"];

Components.utils.import("resource://enigmail/log.jsm");
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/keyRefreshAlgorithm.jsm"); /*global KeyRefreshAlgorithm: false */
Components.utils.import("resource://enigmail/timer.jsm"); /*global EnigmailTimer: false */

var KeyRefreshService = {
  getRandomKey: function(keys) {},

  refreshKey: function(config) {
    // get random key
    let totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length; // in case keys have changed

    // do refresh
    // EnigmailKeyserver.access(stuff here)
    // TODO log whether refresh was successful
    EnigmailTimer.setTimeout(function() {this.refreshKey(config);}, KeyRefreshAlgorithm.calculateWaitTimeInMillisec(config, totalPublicKeys));
  },

  checkForKeysAndInitRefreshService: function(config) {},

  start: function(config) {
    // handle the case where we couldn't refresh a key in the time you were on TB last session
    //    save next key refresh time?

    let totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
    if (totalPublicKeys) {
      EnigmailTimer.setTimeout(function() {this.refreshKey(config);}, KeyRefreshAlgorithm.calculateWaitTimeInMillisec(config, totalPublicKeys));
    } else {
      EnigmailTimer.setTimeout(function() {this.checkForKeysAndInitRefreshService(config);}, KeyRefreshAlgorithm.calculateWaitTimeInMillisec(config, totalPublicKeys));
      EnigmailLog.WRITE("No keys available to refresh\n");
    }
  },

  // TODO
  refreshKeyNonTorConnection: function() {},

  // TODO
  refreshKeyTorConnection: function() {},

};

