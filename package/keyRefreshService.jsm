/*global Components: false */

"use strict";

const EXPORTED_SYMBOLS = ["KeyRefreshService"];

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/keyRefreshAlgorithm.jsm"); /*global KeyRefreshAlgorithm: false */
Components.utils.import("resource://enigmail/timer.jsm"); /*global EnigmailTimer: false */

function refreshKey(config, keyserver, timer) {
  return function() {
    const key = 'whatever';
    keyserver.refreshKey(key);
    EnigmailLog.WRITE("keyRefreshService.jsm: refreshKey: Refreshed Key: " + key + " at time: " + new Date().toUTCString()+ "\n");

    // Get the total amount of public keys in case the amount has changed
    const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
    timer.setTimeout(refreshKey(config, keyserver), KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(config, totalPublicKeys));
  };
}

function start(config, keyserver, timer) {
  // handle the case where we couldn't refresh a key in the time you were on TB last session
  //    save next key refresh time?

  const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
  if (totalPublicKeys) {
    timer.setTimeout(refreshKey(config, keyserver), KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(config, totalPublicKeys));
  } else {
    // TODO: If there are no keys at the start of the refresh, check if keys exit later and THEN start the refresh service
    EnigmailLog.WRITE("keyRefreshService.jsm: KeyRefreshService.start: No keys available to refresh\n");
  }
}

const KeyRefreshService = {
  start: start
};
