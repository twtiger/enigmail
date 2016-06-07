/*global Components: false*/

"use strict";

const EXPORTED_SYMBOLS = ["KeyRefreshAlgorithm"];

Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false*/
Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/
Components.utils.import("resource://enigmail/randomNumber.jsm"); /*global RandomNumberGenerator: false*/

const HOUR_IN_MILLISEC = 60 * 60 * 1000;

function calculateMaxTimeForRefreshInMilliseconds(config, totalPublicKeys) {
  let millisecondsAvailableForRefresh = config.hoursAWeekOnThunderbird * HOUR_IN_MILLISEC;
  return millisecondsAvailableForRefresh / totalPublicKeys;
}

const KeyRefreshAlgorithm = {
  calculateWaitTimeInMilliseconds: function(config, totalPublicKeys) {
    return RandomNumberGenerator.getUint32() % calculateMaxTimeForRefreshInMilliseconds(config, totalPublicKeys);
  }
};
