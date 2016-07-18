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
const HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME = "hoursPerWeekOfThunderbirdUsage";

let timer = null;
function createTimer() {
  if (timer === null) timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  return timer;
}

function calculateMaxTimeForRefreshInMilliseconds(totalPublicKeys) {
  const millisecondsAvailableForRefresh = EnigmailPrefs.getPref(HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME) * ONE_HOUR_IN_MILLISEC;
  return Math.floor(millisecondsAvailableForRefresh / totalPublicKeys);
}

function calculateWaitTimeInMilliseconds(totalPublicKeys) {
  const randomNumber = RandomNumberGenerator.getUint32();
  const maxTimeForRefresh = calculateMaxTimeForRefreshInMilliseconds(totalPublicKeys);

  EnigmailLog.DEBUG("[KEY REFRESH SERVICE]: Wait time = random number: "+ randomNumber + " % max time for refresh: " + maxTimeForRefresh + "\n");

  const millisec = randomNumber % maxTimeForRefresh;

  EnigmailLog.DEBUG("[KEY REFRESH SERVICE]: Time until next refresh in milliseconds: "+ millisec + "\n");

  return millisec;
}

function refreshKey() {
  const timer = createTimer();
  refreshWith(EnigmailKeyServer, timer, true);
}

function restartTimerInOneHour(timer){
  timer.initWithCallback(refreshKey,
    ONE_HOUR_IN_MILLISEC,
    Ci.nsITimer.TYPE_ONE_SHOT);
}

function setupNextRefresh(timer, waitTime){
  timer.initWithCallback(refreshKey,
    waitTime,
    Ci.nsITimer.TYPE_ONE_SHOT);
}

function logMissingInformation(keyIdsExist, keyserversExist){
  if (!keyIdsExist){
    EnigmailLog.DEBUG("[KEY REFRESH SERVICE]: No keys available to refresh yet. Will recheck in an hour.\n");
  }
  if (!keyserversExist){
    EnigmailLog.DEBUG("[KEY REFRESH SERVICE]: No keyservers are available. Will recheck in an hour.\n");
  }
}

function getRandomKeyId(randomNumber) {
  const keyRingLength = EnigmailKeyRing.getAllKeys().keyList.length;

  if (keyRingLength === 0) {return null;}

  return EnigmailKeyRing.getAllKeys().keyList[randomNumber % keyRingLength].keyId;
}

function refreshKeyIfReady(keyserver, readyToRefresh, keyId){
  if (readyToRefresh) {
    keyserver.refresh(keyId);
  }
}

function refreshWith(keyserver, timer, readyToRefresh) {
  const keyId = getRandomKeyId(RandomNumberGenerator.getUint32());
  const keyIdsExist = keyId !== null;
  const keyserversExist = EnigmailPrefs.getPref("keyserver").trim() !== "";

  if (keyIdsExist && keyserversExist){
    refreshKeyIfReady(keyserver, readyToRefresh, keyId);
    const waitTime = calculateWaitTimeInMilliseconds(EnigmailKeyRing.getAllKeys().keyList.length);
    setupNextRefresh(timer, waitTime);
  } else {
    logMissingInformation(keyIdsExist, keyserversExist);
    restartTimerInOneHour(timer);
  }
}

/**
 * Starts a process to continuously refresh keys on a random time interval
 *
 * This service does not keep state, it will restart each time Enigmail is initialized.
 */
function start(keyserver) {
  if (EnigmailPrefs.getPref("keyRefreshOn") === true){
    EnigmailLog.WRITE("[KEY REFRESH SERVICE]: Started\n");
    const timer = createTimer();
    refreshWith(keyserver, timer, false);
  }
}

const KeyRefreshService = {
  start: start
};
