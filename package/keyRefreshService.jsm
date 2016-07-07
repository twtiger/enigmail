/*global Components: false */

"use strict";

const EXPORTED_SYMBOLS = ["KeyRefreshService"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/randomNumber.jsm"); /*global RandomNumberGenerator: false */
Components.utils.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Components.utils.import("resource://enigmail/keyserver.jsm"); /*global EnigmailKeyServer: false */

const ONE_HOUR_IN_MILLISEC = 60 * 60 * 1000;
const HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME = "hoursAWeekOnThunderbird";

let timer = null;
function createTimer() {
  if (timer === null) timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  return timer;
}

function calculateMaxTimeForRefreshInMilliseconds(totalPublicKeys) {
  const millisecondsAvailableForRefresh = EnigmailPrefs.getPref(HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME) * ONE_HOUR_IN_MILLISEC;
  return millisecondsAvailableForRefresh / totalPublicKeys;
}

function calculateWaitTimeInMilliseconds(totalPublicKeys) {
  const millisec = Math.floor(RandomNumberGenerator.getUint32() %
    calculateMaxTimeForRefreshInMilliseconds(totalPublicKeys));

  EnigmailLog.WRITE("[KEY REFRESH SERVICE]: Time until next refresh in milliseconds: "+ millisec + "\n");

  return millisec;
}

function getRandomKeyId(randomNumber) {
  const maxIndex = EnigmailKeyRing.getAllKeys().keyList.length;

  if (maxIndex === 0) return EnigmailKeyRing.getAllKeys().keyList[0].keyId;
  return EnigmailKeyRing.getAllKeys().keyList[randomNumber % maxIndex].keyId;
}

function refreshWith(keyserver, timer, waitTime, refreshFunction) {
  keyserver.refresh(getRandomKeyId(RandomNumberGenerator.getUint32()));
  timer.initWithCallback(refreshKey(),
    waitTime,
    Ci.nsITimer.TYPE_ONE_SHOT);
}

function refreshKey() {
  return function() {
    const waitTime = calculateWaitTimeInMilliseconds(EnigmailKeyRing.getAllKeys().keyList.length);
    refreshWith(EnigmailKeyServer, createTimer(), waitTime, refreshKey);
  };
}

function startWith(timer, waitTime) {
  if (EnigmailPrefs.getPref("keyserver").trim() === ""){
    EnigmailLog.WRITE("[KEY REFRESH SERVICE]: No keyservers are available. Will recheck in an hour.\n");
    timer.initWithCallback(KeyRefreshService.start,
      ONE_HOUR_IN_MILLISEC,
      Ci.nsITimer.TYPE_ONE_SHOT);
    return;
  }

  if (EnigmailKeyRing.getAllKeys().keyList.length === 0) {
    EnigmailLog.WRITE("[KEY REFRESH SERVICE]: No keys available to refresh yet. Will recheck in an hour.\n");
    timer.initWithCallback(KeyRefreshService.start,
      ONE_HOUR_IN_MILLISEC,
      Ci.nsITimer.TYPE_ONE_SHOT);
    return;
  }

  timer.initWithCallback(refreshKey(),
    waitTime,
    Ci.nsITimer.TYPE_ONE_SHOT);
}

/**
 * Starts a process to continuously refresh keys on a random time interval
 *
 * This service does not keep state, it will restart each time Enigmail is initialized.
 */
function start() {
  EnigmailLog.WRITE("[KEY REFRESH SERVICE]: Started\n");
  const waitTime = calculateWaitTimeInMilliseconds(EnigmailKeyRing.getAllKeys().keyList.length);
  startWith(createTimer(), waitTime);
}

const KeyRefreshService = {
  start: start
};
