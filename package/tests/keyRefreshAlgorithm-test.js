// test: Collect accurate number of keys to refresh
// user test: Can the user feel that /dev/random is blocked by generation of new bits for the entropy pool
//
// Goals:
// Everyone can have all of their keys refreshed within a week.
// Keep our keychain as unidentifiable as possible.
//    Watching traffic of keys being refreshed (a whole bundle of keys being refreshed at the same time links them)
//      Don't link keys together
//         Randomize which key is refreshed
//         Randomize refresh time
//    Don't link keys to my IP
//    Not in plain text (use hkps)
//
// Assumptions:
// Are we required to refresh every key? Parcemonie does not check for this. How does this affect our threat model?
// What is our cut off point for "small" number of keys?
// Can the refresh time be approximate or a maximum?
// Why do we need a minimum wait time?
//
// Use cases:
// A user has a small amount of keys - we don't want to maintain an order of key refresh
// A user has a large amount of keys
// A user changes their config mid wait time
// A user is not online frequently with a large number of keys
// A user is not online frequently with a small number of keys
// A user is always online
// A user has 1 key
// A user has 0 keys - why do you even have this then?
// Test against invalid config
//

/*global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert: false, do_get_file: false*/

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /* global withEnigmail:false, withTestGpgHome: false */

testing("keyRefreshAlgorithm.jsm"); /* global KeyRefreshAlgorithm: false */
component("enigmail/keyRing.jsm"); /* global component: false, EnigmailKeyRing: false */
component("enigmail/log.jsm"); /* global EnigmailLog: false */

function importSeveralKeys(num) {
  if (num > 1) {
    let publicKey = do_get_file("resources/dev-strike.asc", false);
    EnigmailKeyRing.importKeyFromFile(publicKey, {}, {});
    let otherKey = do_get_file("resources/dev-tiger.asc", false);
    EnigmailKeyRing.importKeyFromFile(otherKey, {}, {});
  }
  if (num > 2) {
    let thirdKey = do_get_file("resources/notaperson.asc", false);
    EnigmailKeyRing.importKeyFromFile(thirdKey, {}, {});
  }
}

test(withTestGpgHome(withEnigmail(function calculateMaxTimeForRefreshForFortyHoursAWeek() {
  EnigmailLog.setLogLevel(9000);

  let config = {
    hoursAWeekOnThunderbird: 40,
  };
  let totalKeys = 3;
  importSeveralKeys(totalKeys);

  let secondsAvailableForRefresh = config.hoursAWeekOnThunderbird * 60 * 60;
  let maxTimeForRefresh = 2 * secondsAvailableForRefresh / totalKeys;

  Assert.ok(KeyRefreshAlgorithm.calculateMaxTimeForRefreshInSec(config) == maxTimeForRefresh);
})));

test(withTestGpgHome(withEnigmail(function calculateMaxTimeForRefreshForTenHoursAWeek() {
  let config = {
    hoursAWeekOnThunderbird: 10,
  };
  let totalKeys = 2;
  importSeveralKeys(totalKeys);

  let secondsAvailableForRefresh = config.hoursAWeekOnThunderbird * 60 * 60;
  let maxTimeForRefresh = 2 * secondsAvailableForRefresh / totalKeys;

  Assert.ok(KeyRefreshAlgorithm.calculateMaxTimeForRefreshInSec(config) == maxTimeForRefresh);
})));

test(withTestGpgHome(withEnigmail(function waitTimeShouldBeLessThanMax() {
  let config = {
    hoursAWeekOnThunderbird: 40,
  };
  let totalKeys = 3;
  importSeveralKeys(totalKeys);

  let secondsAvailableForRefresh = config.hoursAWeekOnThunderbird * 60 * 60;
  let maxTimeForRefresh = 2 * secondsAvailableForRefresh / totalKeys;

  Assert.ok(KeyRefreshAlgorithm.calculateWaitTimeInSec(config) <= maxTimeForRefresh);
})));

test(withTestGpgHome(withEnigmail(function calculateNewTimeEachCall(){
  let config = {
    hoursAWeekOnThunderbird: 40,
  };

  let firstTime = KeyRefreshAlgorithm.calculateWaitTimeInSec(config);
  let secondTime = KeyRefreshAlgorithm.calculateWaitTimeInSec(config);

  Assert.ok(firstTime != secondTime);
})));
