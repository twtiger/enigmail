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

test(function calculateWaitTimeReturnsWholeNumber(){
  const totalKeys = 11;
  EnigmailPrefs.setPref(HOURS_A_WEEK_ON_THUNDERBIRD_PREF_NAME, 40);

  const number = KeyRefreshAlgorithm.calculateWaitTimeInMilliseconds(totalKeys);

  Assert.equal(number % 1, 0);
});
