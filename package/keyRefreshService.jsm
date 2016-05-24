/*global Components: false, EnigmailLog: false */

/* eslint no-invalid-this: 0 */

"use strict";

var EXPORTED_SYMBOLS = ["KeyRefreshService"];

Components.utils.import("resource://enigmail/log.jsm");
Components.utils.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */

const KeyRefreshService = {
  service: function(config) {
    return RefreshService(config);
  }
};

function RefreshService(config) {
  if (!(this instanceof RefreshService)){
    return new RefreshService(config);
  }

  this.strictConnect = config.strictConnect;
  this.timeToRefresh = config.timeToRefresh;
  this.os = config.os; // injecting for testing purposes
  return this;
}

RefreshService.prototype = {

  // returns True/False depending on whether we can connect
  canConnectOverTor: function() {
    return false;
    //    if (this.os == "WINNT") {
    //      return checkTorOnWindows();
    //    } else {
    //      return checkTor();
    //    }
  },

  checkTor: function() {},

  checkTorOnWindows: function() {
    // TODO :(
  },

  // TODO
  refreshKeyNonTorConnection: function() {},

  // TODO
  refreshKeyTorConnection: function() {},

  // TODO
  getRandomKey: function(keys) {},

  // TODO
  refreshRandomKey: function(torUser, keys) {
    // getRandomKey to refresh
    // if we can, refresh over tor
    // if not, refresh over regular connection if strictConnect is not set
    // else, log error
  },

  // TODO
  // should get scaled refresh time depending on the total refresh period
  sleepRandomTime: function() {},

  logError: function(err) {
    EnigmailLog.ERROR("keyRefreshService.jsm:\n" + err);
  },

  hasPublicKeys: function(keys) {
    return keys.keySortList.length > 0;
  },

  start: function() {
    var keys = EnigmailKeyRing.getAllKeys();
    // TODO handle case if user only has one public key

    if (this.hasPublicKeys(keys)) {
      var hasError = this.refreshRandomKey(keys);
      if (hasError) {
        this.logError("Error in refreshing key");
      }
    } else {
        this.logError("No public keys to refresh for this user");
    }
  }
};

