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

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /* global withEnigmail:false, withTestGpgHome: false, component: false */

testing("keyRefreshAlgorithm.jsm"); /* global KeyRefreshAlgorithm: false, bytesToUInt: false, getRandomUint32: false, calculateMaxTimeForRefreshInMilliseconds: false, KeyRefreshAlgorithm: false, HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME: false */
component("enigmail/log.jsm"); /* global EnigmailLog: false */
component("enigmail/prefs.jsm"); /* global EnigmailPrefs: false */

const HOURS_A_WEEK_ON_THUNDERBIRD = 40;

test(function calculateMaxTimeForRefreshForFortyHoursAWeek() {
  let totalKeys = 3;
  let millisecondsAvailableForRefresh = HOURS_A_WEEK_ON_THUNDERBIRD * 60 * 60 * 1000;
  let maxTimeForRefresh = millisecondsAvailableForRefresh / totalKeys;
  EnigmailPrefs.setPref(HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME, 40);

  Assert.ok(calculateMaxTimeForRefreshInMilliseconds(totalKeys) == maxTimeForRefresh);
});

test(function calculateMaxTimeForRefreshForTenHoursAWeek() {
  let totalKeys = 2;
  let millisecondsAvailableForRefresh = HOURS_A_WEEK_ON_THUNDERBIRD * 60 * 60 * 1000;
  let maxTimeForRefresh = millisecondsAvailableForRefresh / totalKeys;
  EnigmailPrefs.setPref(HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME, 40);

  Assert.ok(calculateMaxTimeForRefreshInMilliseconds(totalKeys) == maxTimeForRefresh);
});

test(function waitTimeShouldBeLessThanMax() {
  let totalKeys = 4;
  let millisecondsAvailableForRefresh = HOURS_A_WEEK_ON_THUNDERBIRD * 60 * 60 * 1000;
  let maxTimeForRefresh = millisecondsAvailableForRefresh / totalKeys;
  EnigmailPrefs.setPref(HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME, 40);

  Assert.ok(KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(totalKeys) <= maxTimeForRefresh);
});

test(function calculateNewTimeEachCall(){
  let totalKeys = 3;
  let firstTime = KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(totalKeys);
  let secondTime = KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(totalKeys);
  EnigmailPrefs.setPref(HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME, 40);

  Assert.ok(firstTime != secondTime);
});
