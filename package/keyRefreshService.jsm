/*global Components: false */

"use strict";

const EXPORTED_SYMBOLS = ["KeyRefreshService"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/keyRefreshAlgorithm.jsm"); /*global KeyRefreshAlgorithm: false */
Components.utils.import("resource://enigmail/randomNumber.jsm"); /*global RandomNumberGenerator: false */
Components.utils.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Components.utils.import("resource://enigmail/keyserver.jsm"); /*global EnigmailKeyServer: false */

const ONE_HOUR_IN_MILLISEC = 60 * 60 * 1000;

let t = null;
function timer() {
  if (t === null) t = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  return t;
}

function getRandomKeyId(randomNumber) {
  let maxIndex = EnigmailKeyRing.getAllKeys().keyList.length - 1;

  if (maxIndex === 0) return EnigmailKeyRing.getAllKeys().keyList[0].keyId;
  return EnigmailKeyRing.getAllKeys().keyList[randomNumber % maxIndex].keyId;
}

function setupNextRefresh(timer, algorithm) {
  timer.initWithCallback(refreshKey(),
    algorithm.calculateWaitTimeInMilliseconds(EnigmailKeyRing.getAllKeys().keyList.length),
    Ci.nsITimer.TYPE_ONE_SHOT);
}

function refreshWith(keyserver, timer, algorithm, refreshFunction) {
  keyserver.refresh(getRandomKeyId(RandomNumberGenerator.getUint32()));
  setupNextRefresh(timer, algorithm);
}

function refreshKey() {
  return function() {
    refreshWith(EnigmailKeyServer, timer(), KeyRefreshAlgorithm, refreshKey);
  };
}

function startWith(timer, algorithm) {
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

  setupNextRefresh(timer, algorithm);
}

// If this operation is interrupted, it will not keep track of
// what key it was trying to refresh or what time the key was
// going to be refreshed at. It will choose a new key and a new
// refresh time each run.
function start() {
  EnigmailLog.WRITE("[KEY REFRESH SERVICE]: Started\n");
  startWith(timer(), KeyRefreshAlgorithm);
}

const KeyRefreshService = {
  start: start
};
