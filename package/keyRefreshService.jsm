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
  const millisec = Math.floor(RandomNumberGenerator.getUint32() % calculateMaxTimeForRefreshInMilliseconds(totalPublicKeys));

  EnigmailLog.WRITE("[KEY REFRESH SERVICE]: Time until next refresh in milliseconds: "+ millisec + "\n");

  return millisec;
}

function refreshKey() {
  let timer = createTimer();
  refreshWith(EnigmailKeyServer, timer);
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
    EnigmailLog.WRITE("[KEY REFRESH SERVICE]: No keys available to refresh yet. Will recheck in an hour.\n");
  }
  if (!keyserversExist){
    EnigmailLog.WRITE("[KEY REFRESH SERVICE]: No keyservers are available. Will recheck in an hour.\n");
  }
}

function getRandomKeyId(randomNumber) {
  const maxIndex = EnigmailKeyRing.getAllKeys().keyList.length;

  if (maxIndex === 0) {return null;}

  return EnigmailKeyRing.getAllKeys().keyList[randomNumber % maxIndex].keyId;
}

function refreshWith(keyserver, timer) {
  const keyId = getRandomKeyId(RandomNumberGenerator.getUint32());
  const keyIdsExist = keyId !== null;
  const keyserversExist = EnigmailPrefs.getPref("keyserver").trim() !== "";

  if (keyIdsExist && keyserversExist){
    keyserver.refresh(keyId);
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
function start() {
  const timer = createTimer();
  EnigmailLog.WRITE("[KEY REFRESH SERVICE]: Started\n");
  refreshWith(EnigmailKeyServer, timer);
}

const KeyRefreshService = {
  start: start
};
