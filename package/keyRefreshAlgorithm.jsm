/*global Components: false*/

"use strict";

var EXPORTED_SYMBOLS = ["KeyRefreshAlgorithm"];

Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false*/
Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false*/

const Cc = Components.classes;
const Ci = Components.interfaces;
const debugInfo = "keyRefreshAlgorithm.jsm: ";
const APPSHELL_MEDIATOR_CONTRACTID = "@mozilla.org/appshell/window-mediator;1";

var KeyRefreshAlgorithm = {

  calculateMaxTimeForRefreshInSec: function(config) {
    let secondsAvailableForRefresh = config.hoursAWeekOnThunderbird * 60 * 60;
    let totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;

    return 2 * secondsAvailableForRefresh / totalPublicKeys;
  },

  getRandomUint32: function() {
    // TODO Decide a proper .xul for use with manual testing
    const wwatch = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);
    let windowConfig = {
      preventDefault: true, // do not open main app window
    };
    let win = wwatch.openWindow(null, "chrome://enigmail/content/enigmailKeyManager.xul", "_blank", "chrome,dialog=no,all", windowConfig);
    let array = new Uint32Array(1);
    win.crypto.getRandomValues(array);
    return array[0];
  },

  calculateWaitTimeInSec: function(config) {
    return this.getRandomUint32() % this.calculateMaxTimeForRefreshInSec(config);
  },
};
