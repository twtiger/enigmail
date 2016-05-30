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
  let totalKeys = 3;
  importSeveralKeys(totalKeys);
  let config = {
    hoursAWeekOnThunderbird: 40,
  };

  let millisecondsAvailableForRefresh = config.hoursAWeekOnThunderbird * 60 * 60 * 1000;
  let maxTimeForRefresh = 2 * millisecondsAvailableForRefresh / totalKeys;

  Assert.ok(KeyRefreshAlgorithm.calculateMaxTimeForRefreshInMillisec(config) == maxTimeForRefresh);
})));

test(withTestGpgHome(withEnigmail(function calculateMaxTimeForRefreshForTenHoursAWeek() {
  let totalKeys = 2;
  importSeveralKeys(totalKeys);
  let config = {
    hoursAWeekOnThunderbird: 10,
  };

  let millisecondsAvailableForRefresh = config.hoursAWeekOnThunderbird * 60 * 60 * 1000;
  let maxTimeForRefresh = 2 * millisecondsAvailableForRefresh / totalKeys;

  Assert.ok(KeyRefreshAlgorithm.calculateMaxTimeForRefreshInMillisec(config) == maxTimeForRefresh);
})));

test(withTestGpgHome(withEnigmail(function waitTimeShouldBeLessThanMax() {
  let totalKeys = 3;
  importSeveralKeys(totalKeys);
  let config = {
    hoursAWeekOnThunderbird: 40,
  };

  let millisecondsAvailableForRefresh = config.hoursAWeekOnThunderbird * 60 * 60 * 1000;
  let maxTimeForRefresh = 2 * millisecondsAvailableForRefresh / totalKeys;

  Assert.ok(KeyRefreshAlgorithm.calculateWaitTimeInMillisec(config) <= maxTimeForRefresh);
})));

test(function testConversionFromByteObjectToUnsignedInteger(){
  // 1100 1110 0000 1001 1100 0111 1101 1111
  let expected = 3456747487;
  let byteObject = {
    0:206, // 1100 1110
    1:9,   // 0000 1001
    2:199, // 1100 0111
    3:223, // 1101 1111
  };

  Assert.equal(KeyRefreshAlgorithm.bytesToUInt(byteObject), expected);
});

test(withTestGpgHome(withEnigmail(function calculateNewTimeEachCall(){
  let config = {
    hoursAWeekOnThunderbird: 40,
  };

  let firstTime = KeyRefreshAlgorithm.calculateWaitTimeInMillisec(config);
  let secondTime = KeyRefreshAlgorithm.calculateWaitTimeInMillisec(config);

  Assert.ok(firstTime != secondTime);
})));
