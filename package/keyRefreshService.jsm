/*global Components: false */

"use strict";

var EXPORTED_SYMBOLS = ["KeyRefreshService"];

const KeyRefreshService = {
  service: function(config) {
    return RefreshService(config);
  },

};

function RefreshService(config) {
  if (!(this instanceof RefreshService)) {
    return new RefreshService(config);
  }

  this.strictConnect = config.strictConnect;
  this.timeToRefresh = config.timeToRefresh;

  return this;
}

RefreshService.prototype = {

  // TODO
  // This method will start the refresh loop, depending on the length of time to refresh all keys
  start: function() {
    // getTimeToSleep
    // sleep
    // checkConnection
    // if we are able to connect:
      // refreshRandomKey
  },

  // TODO
  // This method will first try connecting over Tor
  // If this is unsuccessful, and strictConnect is not set, then it will try to connect regularly
  checkConnection: function() {
  },

  // TODO
  // should return True/False depending on whether we can connect
  connectOverTor: function() {},

  // TODO
  // should return True/False depending on whether we can connect
  connectOverRegularConnection() {},

  // TODO
  // should get a random key from all public keys for that user
  getRandomKey: function() {},

  // TODO
  // should return True/False depending on whether the key was successfully refreshed
  refreshKey: function(key) {},

  // TODO
  // should  get scaled refresh time depending on the total refresh period
  getTimeToSleep: function() {}
};

