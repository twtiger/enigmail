/*global Components: false */

"use strict";

const EXPORTED_SYMBOLS = ["KeyRefreshService"];

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/keyRefreshAlgorithm.jsm"); /*global KeyRefreshAlgorithm: false */
Components.utils.import("resource://enigmail/timer.jsm"); /*global EnigmailTimer: false */

const Cc = Components.classes;
const Ci = Components.interfaces;
const SECURITY_RANDOM_GENERATOR = "@mozilla.org/security/random-generator;1";

function refreshKey(config, keyserver, timer) {
  return function() {
    const key = getRandomKey(bytesToUInt(randomNumberGenerator().generateRandomBytes(4)));
    keyserver.refreshKey(key);
    EnigmailLog.WRITE("keyRefreshService.jsm: refreshKey: Refreshed Key: " + key + " at time: " + new Date().toUTCString()+ "\n");

    // Get the total amount of public keys in case the amount has changed
    const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
    timer.setTimeout(refreshKey(config, keyserver), KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(config, totalPublicKeys));
  };
}

function start(config, keyserver, timer) {
  // TODO
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

let rng = null;

function randomNumberGenerator() {
  if(rng === null) {
    rng = Cc[SECURITY_RANDOM_GENERATOR].createInstance(Ci.nsIRandomGenerator);
  }
  return rng;
}

function bytesToUInt(byteObject) {
  let randomNumber = new Uint32Array(1);
  randomNumber[0] += byteObject[0] << (8 * 3);
  randomNumber[0] += byteObject[1] << (8 * 2);
  randomNumber[0] += byteObject[2] << 8;
  randomNumber[0] += byteObject[3];
  return randomNumber[0];
}

function getRandomKey(randomNumber) {
  let maxIndex= EnigmailKeyRing.getAllKeys().keyList.length - 1;
  let index = randomNumber % maxIndex;
  return EnigmailKeyRing.getAllKeys().keyList[index];
}

const KeyRefreshService = {
  start: start
};
