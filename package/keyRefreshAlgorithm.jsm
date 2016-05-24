"use strict";

var EXPORTED_SYMBOLS = ["KeyRefreshAlgorithm"];

var KeyRefreshAlgorithm = {
  calculateWaitTime: function(config) {
    let hoursAvailableForRefresh = config.refreshInterval * config.hoursAWeekOnThunderbird ;
    let maxTimeForRefresh = 2 * hoursAvailableForRefresh / config.totalKeys;
    let randomNum = 1;
    return randomNum % maxTimeForRefresh;
  },
};
