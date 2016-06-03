/*global do_load_module: false, do_get_file: false, do_get_cwd: false, test: false, Assert: false, resetting: false */
/*global Cc: false, Ci: false, testing: false, component: false*/
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true */

testing("keyRefreshService.jsm"); /*global KeyRefreshService: false, refreshKey: false */

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

function importKey() {
  const publicKey = do_get_file("resources/dev-tiger.asc", false);
  EnigmailKeyRing.importKeyFromFile(publicKey, {}, {});
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
  }
};

function assertRefreshKeyWasCalled() {
  Assert.ok(refreshKeyWasCalled, "MockKeyServer.refreshKey() was not called.");
  refreshKeyWasCalled = false;
}

let setTimeoutWasCalled = false;
const MockTimer = {
  setTimeout: function(f, time) {
    setTimeoutWasCalled = true;
  }
};

function assertSetTimeoutWasCalled() {
  Assert.ok(setTimeoutWasCalled, "MockTimer.setTimeout() was not called.");
  setTimeoutWasCalled = false;
}

test(withTestGpgHome(withEnigmail(withLogFiles(function initializingWithoutKeysWillUpdateLog() {
  KeyRefreshService.start({}, MockKeyServer, MockTimer);
  assertLogContains("keyRefreshService.jsm: KeyRefreshService.start: No keys available to refresh");
}))));

test(withLogFiles(function testRefreshKey(){
  let config = { hoursAWeekOnThunderbird: 40 };
  importKey();

  refreshKey(config, MockKeyServer, MockTimer)();

  assertRefreshKeyWasCalled();
  assertLogContains("keyRefreshService.jsm: refreshKey: Refreshed Key:");
}));

test(withTestGpgHome(withEnigmail(function testTestTimerWasCalled() {
  importKey();
  let config = {hoursAWeekOnThunderbird: 40};

  KeyRefreshService.start(config, MockKeyServer, MockTimer);

  assertSetTimeoutWasCalled();
})));

test(withTestGpgHome(withEnigmail(function testSetupNextKeyRefresh() {
  let config = { hoursAWeekOnThunderbird: 40 };
  importKey();

  refreshKey(config, MockKeyServer, MockTimer)();

  assertSetTimeoutWasCalled();
})));
