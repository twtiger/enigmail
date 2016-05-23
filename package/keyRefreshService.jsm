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
  // This method will first try connecting over Tor
  // If this is unsuccessful, and strictConnect is not set, then it will try to connect regularly
  connect: function() {},

  // TODO
  // This method will start the refresh loop, depending on the length of time to refresh all keys
  start: function() {},

  connectOverTor: function() {}, // TODO

  connectOverRegularConnection() {}, // TODO

  getRandomKey: function() {},

  // should return true/false depending on whether the key was successfully refreshed
  refreshKey: function(key) {},
};

