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

function setupWith(timer, algorithm, refreshFunction) {
  timer.initWithCallback(refreshFunction(),
    algorithm.calculateWaitTimeInMilliseconds(EnigmailKeyRing.getAllKeys().keyList.length),
    Ci.nsITimer.TYPE_ONE_SHOT);
}

function setupNextKeyRefresh() {
  setupWith(timer(), KeyRefreshAlgorithm, refreshKey);
}

function refreshWith(keyserver, setupNextKeyRefreshFunction) {
  keyserver.refresh(getRandomKeyId(RandomNumberGenerator.getUint32()));
  setupNextKeyRefreshFunction();
}

function refreshKey() {
  return function() {
    refreshWith(EnigmailKeyServer, setupNextKeyRefresh);
  };
}

function getRandomKeyId(randomNumber) {
  let maxIndex = EnigmailKeyRing.getAllKeys().keyList.length - 1;

  if (maxIndex === 0) return EnigmailKeyRing.getAllKeys().keyList[0].keyId;
  return EnigmailKeyRing.getAllKeys().keyList[randomNumber % maxIndex].keyId;
}

function checkKeysWith(timer, setupKeyRefreshFunction, checkKeysLaterFunction) {
  if (EnigmailKeyRing.getAllKeys().keyList.length > 0) {
    setupKeyRefreshFunction();
  } else {
    timer.initWithCallback(checkKeysLaterFunction(),
      ONE_HOUR_IN_MILLISEC,
      Ci.nsITimer.TYPE_ONE_SHOT);
  }
}

function checkKeysLater() {
  return function() {
    checkKeysWith(timer(), KeyRefreshAlgorithm, checkKeysLater);
  };
}

// If this operation is interrupted, it will not keep track of
// what key it was trying to refresh or what time the key was
// going to be refreshed at. It will choose a new key and a new
// refresh time each run.
function start() {
  if (EnigmailPrefs.getPref("keyserver").trim() === ""){
    EnigmailLog.WRITE("[KEY REFRESH SERVICE]: No keyservers are available. Did not start refresh service.\n");
  }

  if (EnigmailKeyRing.getAllKeys().keyList.length === 0) {
    EnigmailLog.WRITE("[KEY REFRESH SERVICE]: No keys available to refresh yet. Will recheck in an hour.\n");
    checkKeysLater();
  } else {
    setupNextKeyRefresh();
  }
}

const KeyRefreshService = {
  start: start,
};
