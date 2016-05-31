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

function AssertInLog(expected) {
  Assert.ok(EnigmailLog.getLogData(EnigmailCore.version, EnigmailPrefs).indexOf(expected) !== -1);
}

test(withTestGpgHome(withEnigmail(withLogFiles(function initializingWithoutKeysWillUpdateLog() {
  KeyRefreshService.start({});
  AssertInLog("keyRefreshService.jsm: KeyRefreshService.start: No keys available to refresh");
}))));

function importKey() {
  var publicKey = do_get_file("resources/dev-tiger.asc", false);
  EnigmailKeyRing.importKeyFromFile(publicKey, {}, {});
}

let wasCalled = false;
const TestKeyServer = {
  refreshKey: function(key) {
    if (key) wasCalled = true;
    return wasCalled || false;
  }
};

test(function testRefreshKey(){
  let config = { hoursAWeekOnThunderbird: 40 };
  importKey();
  refreshKey(config, new Date().toUTCString(), TestKeyServer);

  Assert.ok(wasCalled);
  AssertInLog("keyRefreshService.jsm: refreshKey: Refreshed Key:");
});

// TODO
test(withTestGpgHome(withEnigmail(function testInvalidConfig() {
})));

// TODO
test(withTestGpgHome(withEnigmail(function testRefreshKey() {
})));

// TODO
test(withTestGpgHome(withEnigmail(function testConnectOverTorSocksOnLinux() {
})));

// TODO
test(withTestGpgHome(withEnigmail(function testConnectOverTorOnWindows() {
})));

// TODO
test(withTestGpgHome(withEnigmail(function testConnectOverRegularConnectionIfTorIsNotAvailableAndStrictConnectIsFalse() {
})));

// TODO
test(withTestGpgHome(withEnigmail(function testStrictConnectOnlyConnectsOverTor() {
})));
