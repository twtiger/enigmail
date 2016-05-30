/*global Components: false*/

"use strict";

var EXPORTED_SYMBOLS = ["KeyRefreshAlgorithm"];

Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false*/
Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/

const Cc = Components.classes;
const Ci = Components.interfaces;
const SECURITY_RANDOM_GENERATOR = "@mozilla.org/security/random-generator;1";

var KeyRefreshAlgorithm = {

  calculateMaxTimeForRefreshInMillisec: function(config) {
    let millisecondsAvailableForRefresh = config.hoursAWeekOnThunderbird * 60 * 60 * 1000;
    let totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;
    return 2 * millisecondsAvailableForRefresh / totalPublicKeys;
  },

  bytesToUInt: function(byteObject) {
    let randomNumber = new Uint32Array(1);
    for (let key in byteObject) {
      randomNumber[0] += byteObject[key];
      if (key != Object.keys(byteObject).length-1) {
        randomNumber[0] = randomNumber[0] << 8;
      }
    }
    return randomNumber[0];
  },

  getRandomUint32: function() {
    let generator = Cc[SECURITY_RANDOM_GENERATOR].createInstance(Ci.nsIRandomGenerator);
    let byteObject = generator.generateRandomBytes(4);
    return this.bytesToUInt(byteObject);
  },

  calculateWaitTimeInMillisec: function(config) {
    return this.getRandomUint32() % this.calculateMaxTimeForRefreshInMillisec(config);
  },
};
