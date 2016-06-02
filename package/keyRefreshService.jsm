/*global Components: false */

"use strict";

const EXPORTED_SYMBOLS = ["KeyRefreshService"];

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/keyRefreshAlgorithm.jsm"); /*global KeyRefreshAlgorithm: false */
Components.utils.import("resource://enigmail/timer.jsm"); /*global EnigmailTimer: false */

function refreshKey(config, time, keyserver) {
  return function() {
    const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length; // in case keys have changed
    const key = 'whatever';
    keyserver.refreshKey(key);
    EnigmailLog.WRITE("keyRefreshService.jsm: refreshKey: Refreshed Key: " + key + " at time: " + time + "\n");

    //let refresh = function() {refreshKey(config);};
    //EnigmailTimer.setTimeout(refresh, KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(config, totalPublicKeys));
  };
}

function checkKeysAndRetry(config) {
  return function() {
  };
}

function start(config) {
  // handle the case where we couldn't refresh a key in the time you were on TB last session
  //    save next key refresh time?

  const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
  if (totalPublicKeys) {
    let keyserver = null; // TODO use a real server
    EnigmailTimer.setTimeout(refreshKey(config, keyserver), KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(config, totalPublicKeys));
  } else {
    EnigmailTimer.setTimeout(checkKeysAndRetry(config), KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(config, totalPublicKeys));
    EnigmailLog.WRITE("keyRefreshService.jsm: KeyRefreshService.start: No keys available to refresh\n");
  }
}

const KeyRefreshService = {
  start: start
};
