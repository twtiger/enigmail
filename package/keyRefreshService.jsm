/*global Components: false, EnigmailLog: false */

/* eslint no-invalid-this: 0 */

"use strict";

var EXPORTED_SYMBOLS = ["KeyRefreshService"];

Components.utils.import("resource://enigmail/log.jsm");
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/keyRefreshAlgorithm.jsm"); /*global KeyRefreshAlgorithm: false */
Components.utils.import("resource://enigmail/timer.jsm"); /*global EnigmailTimer: false */

function refreshKey(config, time, keyserver) {
  let totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length; // in case keys have changed
  let key = 'whatever';
  keyserver.refreshKey(key);
  EnigmailLog.WRITE("keyRefreshService.jsm: refreshKey: Refreshed Key: " + key + " at time: " + time + "\n");

  //let refresh = function() {refreshKey(config);};
  //EnigmailTimer.setTimeout(refresh, KeyRefreshAlgorithm.calculateWaitTimeInMillisec(config, totalPublicKeys));
}

function checkKeysAndRetry(config) {
}

var KeyRefreshService = {
  start: function(config) {
    // handle the case where we couldn't refresh a key in the time you were on TB last session
    //    save next key refresh time?

    let totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
    if (totalPublicKeys) {
      let keyserver = null; // TODO use a real server
      let refresh = function() {refreshKey(config, keyserver);};
      EnigmailTimer.setTimeout(refresh, KeyRefreshAlgorithm.calculateWaitTimeInMillisec(config, totalPublicKeys));
    } else {
      let checkAndRetry = function() {checkKeysAndRetry(config);};
      EnigmailTimer.setTimeout(checkAndRetry, KeyRefreshAlgorithm.calculateWaitTimeInMillisec(config, totalPublicKeys));
      EnigmailLog.WRITE("keyRefreshService.jsm: KeyRefreshService.start: No keys available to refresh\n");
    }
  },

  // TODO
  refreshKeyNonTorConnection: function() {},

  // TODO
  refreshKeyTorConnection: function() {},

};
