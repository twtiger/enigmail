/*global Components: false */

"use strict";

const EXPORTED_SYMBOLS = ["KeyRefreshService"];

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/keyRefreshAlgorithm.jsm"); /*global KeyRefreshAlgorithm: false */
Components.utils.import("resource://enigmail/timer.jsm"); /*global EnigmailTimer: false */
Components.utils.import("resource://enigmail/randomNumber.jsm"); /*global RandomNumberGenerator: false */

const ONE_HOUR_IN_MILLISEC = 60 * 60 * 1000;

function refreshKey(config, keyserver, timer) {
  return function() {
    const key = getRandomKey(RandomNumberGenerator.getUint32());
    keyserver.refreshKey(key);
    EnigmailLog.WRITE("keyRefreshService.jsm: refreshKey: Refreshed Key: " + key + " at time: " + new Date().toUTCString()+ "\n");

    // Get the total amount of public keys in case the amount has changed
    const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
    timer.setTimeout(refreshKey(config, keyserver, timer), KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(config, totalPublicKeys));
  };
}

function checkKeysAndRestart(config, keyserver, timer) {
  return function() {
    const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
    if (totalPublicKeys) {
      timer.setTimeout(refreshKey(config, keyserver, timer), KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(config, totalPublicKeys));
    } else {
      timer.setTimeout(checkKeysAndRestart(config, keyserver, timer), ONE_HOUR_IN_MILLISEC);
      EnigmailLog.WRITE("keyRefreshService.jsm: checkKeysAndRestart: Still no keys at: " + new Date().toUTCString() + ". Will retry to restart key refresh service in one hour.\n");
    }
  };
}

// If this operation is interrupted, it will not keep track of
// what key it was trying to refresh or what time the key was
// going to be refreshed at. It will choose a new key and a new
// refresh time each run.
function start(config, keyserver, timer) {
  const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
  if (totalPublicKeys) {
    timer.setTimeout(refreshKey(config, keyserver), KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(config, totalPublicKeys));
  } else {
    timer.setTimeout(checkKeysAndRestart(config, keyserver, timer), ONE_HOUR_IN_MILLISEC);
    EnigmailLog.WRITE("keyRefreshService.jsm: KeyRefreshService.start: No keys available to refresh\n");
  }
}

function getRandomKey(randomNumber) {
  let maxIndex= EnigmailKeyRing.getAllKeys().keyList.length - 1;
  let index = randomNumber % maxIndex;
  return EnigmailKeyRing.getAllKeys().keyList[index];
}

const KeyRefreshService = {
  start: start
};
