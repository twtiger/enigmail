/*global Components: false*/

"use strict";

const EXPORTED_SYMBOLS = ["KeyRefreshAlgorithm"];

Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false*/
Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/
Components.utils.import("resource://enigmail/randomNumber.jsm"); /*global RandomNumberGenerator: false*/
Components.utils.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false*/

const HOUR_IN_MILLISEC = 60 * 60 * 1000;
const HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME = "extensions.enigmail.hoursAWeekOnThunderbird";

function calculateMaxTimeForRefreshInMilliseconds(totalPublicKeys) {
  let millisecondsAvailableForRefresh = EnigmailPrefs.getPref("extensions.enigmail.hoursAWeekOnThunderbird") * HOUR_IN_MILLISEC;
  return millisecondsAvailableForRefresh / totalPublicKeys;
}

const KeyRefreshAlgorithm = {
  calculateWaitTimeInMilliseconds: function(totalPublicKeys) {
    return RandomNumberGenerator.getUint32() % calculateMaxTimeForRefreshInMilliseconds(totalPublicKeys);
  }
};
