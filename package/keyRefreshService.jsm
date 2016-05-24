/*global Components: false, EnigmailLog: false */

/* eslint no-invalid-this: 0 */

"use strict";

var EXPORTED_SYMBOLS = ["KeyRefreshService"];

Components.utils.import("resource://enigmail/log.jsm");
Components.utils.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */

const KeyRefreshService = {
  service: function(config) {
    return new RefreshService(config);
  }
};

function RefreshService(config) {
  this.strictConnect = config.strictConnect;
  this.timeToRefresh = config.timeToRefresh;
  this.os = config.os; // injecting for testing purposes
  var that = this;

  // TODO
  function canConnect() {
    return false;
    //var connected = false;
    // if (canConnectOverTor()) {
    //   connected = true;
    // } else if (!that.strictConnect) {
    //   connected = canConnectOverRegularConnection();
    // }
    // return canConnect;
  }

  // TODO
  // returns True/False depending on whether we can connect
  function canConnectOverTor() {
    return false;
    //    if (that.os == "WINNT") {
    //      return checkTorOnWindows();
    //    } else {
    //      return checkTor();
    //    }
  }

  function checkTor() {
    // do some torsocks things
    // should we include torsocks as an enigmail dependency?
  }

  function checkTorOnWindows() {
    // TODO :(
  }

  // TODO
  // should return True/False depending on whether we can connect
  function canConnectOverRegularConnection() {
    return false;
  }

  // TODO
  // check to see if the number of public keys that a user has is greater than 0
  function hasPublicKeys() {}

  // TODO
  // should get a random key from all public keys for that user
  function getRandomKey() {}

  // TODO
  // should return True/False depending on whether the key was successfully refreshed
  function refreshKey(key) {}

  // TODO
  // should  get scaled refresh time depending on the total refresh period
  function sleepRandomTime() {}

  // TODO
  function logError(err) {
    EnigmailLog.ERROR("keyRefreshService.jsm:\n" + err);
  }

  // TODO
  // This method will start the refresh loop, depending on the length of time to refresh all keys
  this.start = function() {
    var hasError = false;
    if (canConnect()) { // TODO also check that the user has any public keys
      // loop:
        // sleepRandomTime
        // refreshRandomKey
    } else {
      hasError = true;
      logError("Error in instantiating continuous key refresh service");
    }
    return hasError;
  };
}

RefreshService.prototype = (function(){
  return {
  constructor: RefreshService
  };
})();

