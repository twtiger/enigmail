/*global Components: false, EnigmailLog: false*/

"use strict";

var EXPORTED_SYMBOLS = ["KeyRefreshAlgorithm"];

Components.utils.import("resource://enigmail/log.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const debugInfo = "keyRefreshAlgorithm.jsm: calculateWaitTime() ";

const APPSHELL_MEDIATOR_CONTRACTID = "@mozilla.org/appshell/window-mediator;1";

var KeyRefreshAlgorithm = {

  calculateMaxTimeForRefresh: function(config) {
    let secondsAvailableForRefresh = config.hoursAWeekOnThunderbird * 60 * 60;
    let maxTimeForRefresh = 2 * secondsAvailableForRefresh / config.totalKeys;
    return maxTimeForRefresh;
  },

  getRandomUint32: function() {
    // TODO Decide a proper .xul for use
    const wwatch = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);
    let windowConfig = {
      preventDefault: true,
    };
    let win = wwatch.openWindow(null, "chrome://enigmail/content/enigmailKeyManager.xul", "_blank", "chrome,dialog=no,all", windowConfig);
    let array = new Uint32Array(1);
    win.crypto.getRandomValues(array);
    return array[0];
  },

  calculateWaitTime: function(config) {
    let waitTimeInSec = this.getRandomUint32() % this.calculateMaxTimeForRefresh(config);
    return waitTimeInSec;
  },
};
