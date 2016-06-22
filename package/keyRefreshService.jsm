/*global Components: false */

"use strict";

const EXPORTED_SYMBOLS = ["KeyRefreshService"];

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/keyRefreshAlgorithm.jsm"); /*global KeyRefreshAlgorithm: false */
Components.utils.import("resource://enigmail/timer.jsm"); /*global EnigmailTimer: false */
Components.utils.import("resource://enigmail/randomNumber.jsm"); /*global RandomNumberGenerator: false */
Components.utils.import("resource://enigmail/pipeConsole.jsm"); /*global EnigmailConsole: false */

const ONE_HOUR_IN_MILLISEC = 60 * 60 * 1000;

function setupNextKeyRefresh(refreshWarrior, timer) {
  // Get the total amount of public keys in case the amount has changed
  const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
  const timeUntilNextRefresh = KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(totalPublicKeys);
  EnigmailLog.WRITE("Time until next refresh in milliseconds: "+ timeUntilNextRefresh + "\n");

  timer.setTimeout(refreshKey(refreshWarrior, timer), timeUntilNextRefresh);
}

function refreshKey(refreshWarrior, timer) {
  return function() {
    const key = getRandomKey(RandomNumberGenerator.getUint32());
    refreshWarrior.refreshKey(key);
    EnigmailLog.WRITE("[KEY REFRESH SERVICE]: refreshKey: Trying to Refresh Key: " + key.keyId + " at time: " + new Date().toUTCString()+ "\n");
    setupNextKeyRefresh(refreshWarrior, timer);
  };
}

function checkKeysAndRestart(refreshWarrior, timer) {
  return function() {
    const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
    if (totalPublicKeys) {
      timer.setTimeout(refreshKey(refreshWarrior, timer), KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(totalPublicKeys));
    } else {
      timer.setTimeout(checkKeysAndRestart(refreshWarrior, timer), ONE_HOUR_IN_MILLISEC);
      EnigmailLog.WRITE("[KEY REFRESH SERVICE]: checkKeysAndRestart: Still no keys at: " + new Date().toUTCString() + ". Will retry to restart key refresh service in one hour.\n");
    }
  };
}

function getRandomKey(randomNumber) {
  let maxIndex= EnigmailKeyRing.getAllKeys().keyList.length - 1;
  return EnigmailKeyRing.getAllKeys().keyList[randomNumber % maxIndex];
}

// If this operation is interrupted, it will not keep track of
// what key it was trying to refresh or what time the key was
// going to be refreshed at. It will choose a new key and a new
// refresh time each run.
function start(refreshWarrior, timer) {
  const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
  if (totalPublicKeys) {
    setupNextKeyRefresh(refreshWarrior, timer);
  } else {
    timer.setTimeout(checkKeysAndRestart(refreshWarrior, timer), ONE_HOUR_IN_MILLISEC);
    EnigmailLog.WRITE("[KEY REFRESH SERVICE]: KeyRefreshService.start: No keys available to refresh\n");
  }
}

const KeyRefreshService = {
  start: start,
};
