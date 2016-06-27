/*global do_load_module: false, do_get_file: false, do_get_cwd: false, test: false, Assert: false, resetting: false */
/*global Cc: false, Ci: false, testing: false, component: false*/
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, withLogFiles: false, assertLogContains: false, withMockTimer: false, MockTimer: false, setTimeoutWasCalled: false, assertSetTimeoutWasCalled: false, assertSetTimeoutWasNotCalled: false */

testing("keyRefreshService.jsm"); /*global setupNextKeyRefresh:false, KeyRefreshService: false, refreshKey: false, checkKeysAndRestart: false, getRandomKey: false */

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
const MockRefreshWarrior = {
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
  Assert.equal(refreshKeyWasCalled, true, "MockRefreshWarrior.refreshKey() was not called.");
}

test(withTestGpgHome(withEnigmail(withLogFiles(function initializingWithoutKeysWillUpdateLog() {
  EnigmailKeyRing.clearCache();

  KeyRefreshService.start(MockRefreshWarrior, MockTimer);

  assertLogContains("[KEY REFRESH SERVICE]: KeyRefreshService.start: No keys available to refresh");

  MockRefreshWarrior.resetMock();
  MockTimer.resetMock();
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function logsMillisecondsToNextKeyRefresh() {
  EnigmailKeyRing.clearCache();
  importKeys();

  setupNextKeyRefresh(MockRefreshWarrior, MockTimer);

  assertLogContains("[KEY REFRESH SERVICE]: Time until next refresh in milliseconds:");
}))));

//test(withTestGpgHome(withEnigmail(withLogFiles(withMockTimer(function testRefreshKey(){
//  EnigmailKeyRing.clearCache();
//  importKeys();
//
//  refreshKey(MockRefreshWarrior, MockTimer)();
//
//  assertRefreshKeyWasCalled("testRefreshKey");
//  assertLogContains("[KEY REFRESH SERVICE]: refreshKey: Trying to Refresh Key:");
//
//  MockRefreshWarrior.resetMock();
//  EnigmailKeyRing.clearCache();
//})))));

//test(withTestGpgHome(withEnigmail(withMockTimer(function testTestTimerWasCalled() {
//  EnigmailKeyRing.clearCache();
//  importKeys();
//
//  KeyRefreshService.start(MockRefreshWarrior, MockTimer);
//
//  assertSetTimeoutWasCalled("testTestTimerWasCalled");
//
//  MockRefreshWarrior.resetMock();
//  EnigmailKeyRing.clearCache();
//}))));
//
//test(withTestGpgHome(withEnigmail(withMockTimer(function testSetupNextKeyRefresh() {
//  EnigmailKeyRing.clearCache();
//  importKeys();
//
//  refreshKey(MockRefreshWarrior, MockTimer)();
//
//  assertSetTimeoutWasCalled("testSetupNextKeyRefresh");
//
//  MockRefreshWarrior.resetMock();
//  EnigmailKeyRing.clearCache();
//}))));

test(withTestGpgHome(withEnigmail(withMockTimer(function testGettingARandomKey() {
  EnigmailKeyRing.clearCache();
  importKeys();

  Assert.notEqual(getRandomKey(4), getRandomKey(5));

  EnigmailKeyRing.clearCache();
}))));

test(withTestGpgHome(withEnigmail(withMockTimer(function withNoKeys_testSetTimeToCheckForKeysLater() {
  const totalPublicKeys = EnigmailKeyRing.getAllKeys().keyList.length;

  KeyRefreshService.start(MockRefreshWarrior, MockTimer);
  assertSetTimeoutWasCalled("withNoKeys_testSetTimeToCheckForKeysLater");

  MockRefreshWarrior.resetMock();
}))));

test(withTestGpgHome(withEnigmail(withMockTimer(function ifKeysExistLater_startRefresh() {
  EnigmailKeyRing.clearCache();
  importKeys();

  checkKeysAndRestart(MockRefreshWarrior, MockTimer)();

  assertSetTimeoutWasCalled("ifKeysExistLater_startRefresh");

  MockRefreshWarrior.resetMock();
  EnigmailKeyRing.clearCache();
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(withMockTimer(function ifKeysDontExistLater_checkLater() {
  checkKeysAndRestart(MockRefreshWarrior, MockTimer)();

  assertSetTimeoutWasCalled("ifKeysDontExistLater_checkLater");
  assertLogContains("[KEY REFRESH SERVICE]: checkKeysAndRestart: Still no keys at: ");

  MockRefreshWarrior.resetMock();
})))));

test(function doNotStartIfNoKeyserversProvided(){
  EnigmailPrefs.setPref("keyserver", " ");
  KeyRefreshService.start(MockRefreshWarrior, MockTimer);

  assertLogContains("[KEY REFRESH SERVICE]: Not started as no keyservers available");
  assertSetTimeoutWasNotCalled();

  MockRefreshWarrior.resetMock();
});
