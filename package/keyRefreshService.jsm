/*global Components: false */

"use strict";

var EXPORTED_SYMBOLS = ["KeyRefreshService"];

const KeyRefreshService = {
  service: function(config) {
    return new RefreshService(config);
  },

};

function RefreshService(config) {
  this.strictConnect = config.strictConnect;
  this.timeToRefresh = config.timeToRefresh;
}

RefreshService.prototype = (function(){

  // TODO
  // This method will first try connecting over Tor
  // If this is unsuccessful, and strictConnect is not set, then it will try to connect regularly
  function checkConnection() {}

  // TODO
  // should return True/False depending on whether we can connect
  function connectOverTor() {}

  // TODO
  // should return True/False depending on whether we can connect
  function connectOverRegularConnection() {}

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
  function getTimeToSleep() {}

  return {

  constructor: RefreshService,

  // TODO
  // This method will start the refresh loop, depending on the length of time to refresh all keys
  start: function() {
    // getTimeToSleep
    // sleep
    // checkConnection
    // if we are able to connect, and hasPublicKeys:
      // refreshRandomKey
  },
  };
})();

