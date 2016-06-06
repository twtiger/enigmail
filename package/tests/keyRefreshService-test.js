/*global do_load_module: false, do_get_file: false, do_get_cwd: false, test: false, Assert: false, resetting: false */
/*global Cc: false, Ci: false, testing: false, component: false*/
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true */

testing("keyRefreshService.jsm"); /*global KeyRefreshService: false, refreshKey: false, checkKeysAndRestart: false, getRandomKey: false */

component("enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
component("enigmail/log.jsm"); /*global EnigmailLog: false */
component("enigmail/files.jsm"); /*global EnigmailFiles: false */
component("enigmail/core.jsm"); /*global EnigmailCore: false */
component("enigmail/prefs.jsm"); /*global EnigmailPrefs: false */

function withLogFiles(f) {
  return function () {
    try {
      EnigmailLog.setLogLevel(5);
      f();
    } finally {
      EnigmailLog.onShutdown();
      EnigmailLog.createLogFiles();
    }
  };
}

function importKeys() {
  const publicKey = do_get_file("resources/dev-tiger.asc", false);
  const anotherKey = do_get_file("resources/notaperson.asc", false);
  const strikeKey = do_get_file("resources/dev-strike.asc", false);
  EnigmailKeyRing.importKeyFromFile(publicKey, {}, {});
  EnigmailKeyRing.importKeyFromFile(anotherKey, {}, {});
  EnigmailKeyRing.importKeyFromFile(strikeKey, {}, {});
}

function assertLogContains(expected) {
  let failureMessage = "Expected log to contain: " + expected;
  Assert.ok(EnigmailLog.getLogData(EnigmailCore.version, EnigmailPrefs).indexOf(expected) !== -1, failureMessage);
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

let setTimeoutWasCalled = false;
const MockTimer = {
  setTimeout: function(f, time) {
    setTimeoutWasCalled = true;
  },
  resetMock: function() {
    setTimeoutWasCalled = false;
  }
};

function assertSetTimeoutWasCalled(testName, expectedCallbackFunction) {
  Assert.ok(setTimeoutWasCalled, "MockTimer.setTimeout() was not called. in test: " + testName);
}

test(withTestGpgHome(withEnigmail(withLogFiles(function initializingWithoutKeysWillUpdateLog() {
  KeyRefreshService.start({}, MockKeyServer, MockTimer);
  assertLogContains("keyRefreshService.jsm: KeyRefreshService.start: No keys available to refresh");
  MockKeyServer.resetMock();
  MockTimer.resetMock();
  EnigmailKeyRing.clearCache();
  EnigmailLog.DEBUG("ASSERTED: setTimeoutWasCalled is " + setTimeoutWasCalled + "\n");
}))));

test(withLogFiles(function testRefreshKey(){
  let config = { hoursAWeekOnThunderbird: 40 };
  importKeys();

  refreshKey(config, MockKeyServer, MockTimer)();

  assertRefreshKeyWasCalled("testRefreshKey");

  MockKeyServer.resetMock();
  MockTimer.resetMock();
  EnigmailKeyRing.clearCache();
  assertLogContains("keyRefreshService.jsm: refreshKey: Refreshed Key:");
}));

test(withTestGpgHome(withEnigmail(function testTestTimerWasCalled() {
  importKeys();
  let config = {hoursAWeekOnThunderbird: 40};

  KeyRefreshService.start(config, MockKeyServer, MockTimer);

  assertSetTimeoutWasCalled("testTestTimerWasCalled");

  MockKeyServer.resetMock();
  MockTimer.resetMock();
  EnigmailKeyRing.clearCache();
  EnigmailLog.DEBUG("ASSERTED: setTimeoutWasCalled is " + setTimeoutWasCalled + "\n");
})));

test(withTestGpgHome(withEnigmail(function testSetupNextKeyRefresh() {
  let config = { hoursAWeekOnThunderbird: 40 };
  importKeys();

  refreshKey(config, MockKeyServer, MockTimer)();

  assertSetTimeoutWasCalled("testSetupNextKeyRefresh");

  MockKeyServer.resetMock();
  MockTimer.resetMock();
  EnigmailKeyRing.clearCache();
  EnigmailLog.DEBUG("ASSERTED: setTimeoutWasCalled is " + setTimeoutWasCalled + "\n");
})));

test(withTestGpgHome(withEnigmail(function testGettingARandomKey() {
  importKeys();

  Assert.notEqual(getRandomKey(4), getRandomKey(5));

  MockKeyServer.resetMock();
  MockTimer.resetMock();
  EnigmailKeyRing.clearCache();
})));

test(withTestGpgHome(withEnigmail(function withNoKeys_testSetTimeToCheckForKeysLater() {
  EnigmailLog.setLogLevel(9000);
  EnigmailKeyRing.clearCache();
  const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;

  let config = { hoursAWeekOnThunderbird: 40 };
  KeyRefreshService.start(config, MockKeyServer, MockTimer);
  assertSetTimeoutWasCalled("withNoKeys_testSetTimeToCheckForKeysLater");

  MockKeyServer.resetMock();
  MockTimer.resetMock();
  EnigmailKeyRing.clearCache();
})));

test(withTestGpgHome(withEnigmail(function ifKeysExistLater_startRefresh() {
  let config = { hoursAWeekOnThunderbird: 40 };
  importKeys();

  checkKeysAndRestart(config, MockKeyServer, MockTimer)();

  assertSetTimeoutWasCalled("ifKeysExistLater_startRefresh");

  MockKeyServer.resetMock();
  MockTimer.resetMock();
  EnigmailKeyRing.clearCache();
})));

test(withTestGpgHome(withEnigmail(withLogFiles(function ifKeysDontExistLater_checkLater() {
  let config = { hoursAWeekOnThunderbird: 40 };

  checkKeysAndRestart(config, MockKeyServer, MockTimer)();

  assertSetTimeoutWasCalled("ifKeysDontExistLater_checkLater");
  assertLogContains("keyRefreshService.jsm: checkKeysAndRestart: Still no keys at: ");

  MockKeyServer.resetMock();
  MockTimer.resetMock();
  EnigmailKeyRing.clearCache();
}))));
