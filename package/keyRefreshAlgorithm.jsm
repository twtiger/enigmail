/*global Components: false*/

"use strict";

const EXPORTED_SYMBOLS = ["KeyRefreshAlgorithm"];

Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false*/
Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/

const Cc = Components.classes;
const Ci = Components.interfaces;
const SECURITY_RANDOM_GENERATOR = "@mozilla.org/security/random-generator;1";

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

function getRandomUint32() {
  let byteObject = randomNumberGenerator().generateRandomBytes(4);
  return bytesToUInt(byteObject);
}

const hoursInMilliseconds = 60 * 60 * 1000;

function calculateMaxTimeForRefreshInMilliseconds(config, totalPublicKeys) {
  let millisecondsAvailableForRefresh = config.hoursAWeekOnThunderbird * hoursInMilliseconds;
  return millisecondsAvailableForRefresh / totalPublicKeys;
}

const KeyRefreshAlgorithm = {
  calculateWaitTimeInMilliseconds: function(config, totalPublicKeys) {
    return getRandomUint32() % calculateMaxTimeForRefreshInMilliseconds(config, totalPublicKeys);
  }
};
