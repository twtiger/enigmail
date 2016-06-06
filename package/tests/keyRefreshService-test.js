/*global do_load_module: false, do_get_file: false, do_get_cwd: false, test: false, Assert: false, resetting: false */
/*global Cc: false, Ci: false, testing: false, component: false*/
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, withLogFiles: false, assertLogContains: false, withMockTimer: false, MockTimer: false, setTimeoutWasCalled: false, assertSetTimeoutWasCalled: false */

testing("keyRefreshService.jsm"); /*global KeyRefreshService: false, refreshKey: false, checkKeysAndRestart: false, getRandomKey: false */

component("enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
component("enigmail/log.jsm"); /*global EnigmailLog: false */
component("enigmail/files.jsm"); /*global EnigmailFiles: false */
component("enigmail/core.jsm"); /*global EnigmailCore: false */
component("enigmail/prefs.jsm"); /*global EnigmailPrefs: false */

function importKeys() {
  const publicKey = do_get_file("resources/dev-tiger.asc", false);
  const anotherKey = do_get_file("resources/notaperson.asc", false);
  const strikeKey = do_get_file("resources/dev-strike.asc", false);
  EnigmailKeyRing.importKeyFromFile(publicKey, {}, {});
  EnigmailKeyRing.importKeyFromFile(anotherKey, {}, {});
  EnigmailKeyRing.importKeyFromFile(strikeKey, {}, {});
}

let refreshKeyWasCalled = false;
const MockKeyServer = {
  refreshKey: function(key) {
    if (key !== null) {
      refreshKeyWasCalled = true;
    }
    return refreshKeyWasCalled;
  },
  resetMock: function() {
    refreshKeyWasCalled = false;
  }
};

function assertRefreshKeyWasCalled() {
  Assert.ok(refreshKeyWasCalled, "MockKeyServer.refreshKey() was not called.");
}

test(withTestGpgHome(withEnigmail(withLogFiles(function initializingWithoutKeysWillUpdateLog() {
  KeyRefreshService.start({}, MockKeyServer, MockTimer);
  assertLogContains("keyRefreshService.jsm: KeyRefreshService.start: No keys available to refresh");
  MockKeyServer.resetMock();
  MockTimer.resetMock();
  EnigmailKeyRing.clearCache();
  EnigmailLog.DEBUG("ASSERTED: setTimeoutWasCalled is " + setTimeoutWasCalled + "\n");
}))));

test(withLogFiles(withMockTimer(function testRefreshKey(){
  let config = { hoursAWeekOnThunderbird: 40 };
  EnigmailKeyRing.clearCache();
  importKeys();

  refreshKey(config, MockKeyServer, MockTimer)();

  assertRefreshKeyWasCalled("testRefreshKey");
  assertLogContains("keyRefreshService.jsm: refreshKey: Refreshed Key:");

  MockKeyServer.resetMock();
  EnigmailKeyRing.clearCache();
})));

test(withTestGpgHome(withEnigmail(withMockTimer(function testTestTimerWasCalled() {
  EnigmailKeyRing.clearCache();
  importKeys();
  let config = {hoursAWeekOnThunderbird: 40};

  KeyRefreshService.start(config, MockKeyServer, MockTimer);

  assertSetTimeoutWasCalled("testTestTimerWasCalled");

  MockKeyServer.resetMock();
  EnigmailKeyRing.clearCache();
  EnigmailLog.DEBUG("ASSERTED: setTimeoutWasCalled is " + setTimeoutWasCalled + "\n");
}))));

test(withTestGpgHome(withEnigmail(withMockTimer(function testSetupNextKeyRefresh() {
  let config = { hoursAWeekOnThunderbird: 40 };
  EnigmailKeyRing.clearCache();
  importKeys();

  refreshKey(config, MockKeyServer, MockTimer)();

  assertSetTimeoutWasCalled("testSetupNextKeyRefresh");

  MockKeyServer.resetMock();
  EnigmailKeyRing.clearCache();
  EnigmailLog.DEBUG("ASSERTED: setTimeoutWasCalled is " + setTimeoutWasCalled + "\n");
}))));

test(withTestGpgHome(withEnigmail(withMockTimer(function testGettingARandomKey() {
  EnigmailKeyRing.clearCache();
  importKeys();

  Assert.notEqual(getRandomKey(4), getRandomKey(5));

  EnigmailKeyRing.clearCache();
}))));

test(withTestGpgHome(withEnigmail(withMockTimer(function withNoKeys_testSetTimeToCheckForKeysLater() {
  const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;

  let config = { hoursAWeekOnThunderbird: 40 };
  KeyRefreshService.start(config, MockKeyServer, MockTimer);
  assertSetTimeoutWasCalled("withNoKeys_testSetTimeToCheckForKeysLater");

  MockKeyServer.resetMock();
}))));

test(withTestGpgHome(withEnigmail(withMockTimer(function ifKeysExistLater_startRefresh() {
  let config = { hoursAWeekOnThunderbird: 40 };
  EnigmailKeyRing.clearCache();
  importKeys();

  checkKeysAndRestart(config, MockKeyServer, MockTimer)();

  assertSetTimeoutWasCalled("ifKeysExistLater_startRefresh");

  MockKeyServer.resetMock();
  EnigmailKeyRing.clearCache();
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(withMockTimer(function ifKeysDontExistLater_checkLater() {
  let config = { hoursAWeekOnThunderbird: 40 };

  checkKeysAndRestart(config, MockKeyServer, MockTimer)();

  assertSetTimeoutWasCalled("ifKeysDontExistLater_checkLater");
  assertLogContains("keyRefreshService.jsm: checkKeysAndRestart: Still no keys at: ");

  MockKeyServer.resetMock();
})))));
