/*global do_load_module: false, do_get_cwd: false, test: false, Assert: false, resetting: false */
/*global Cc: false, Ci: false, testing: false, component: false*/
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true */

testing("keyRefreshService.jsm"); /*global KeyRefreshService: false */

component("enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
component("enigmail/log.jsm"); /*global EnigmailLog: false */
component("enigmail/files.jsm"); /*global EnigmailFiles: false */
component("enigmail/core.jsm"); /*global EnigmailCore: false */
component("enigmail/prefs.jsm"); /*global EnigmailPrefs: false */

test(withTestGpgHome(withEnigmail(function initializingWithoutKeysWillUpdateLog() {
  EnigmailLog.setLogLevel(5);
  EnigmailLog.setLogDirectory(do_get_cwd().path);
  const filePath = EnigmailLog.directory + "enigdbug.txt";
  const localFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  EnigmailFiles.initPath(localFile, filePath);

  try {
    let logString = "No keys available to refresh";
    KeyRefreshService.start({});

    EnigmailLog.DEBUG("data is " + EnigmailLog.getLogData(EnigmailCore.version, EnigmailPrefs).indexOf(logString) + "\n done \n");

    Assert.ok(EnigmailLog.getLogData(EnigmailCore.version, EnigmailPrefs).indexOf(logString) !== -1);
  } finally {
    EnigmailLog.onShutdown();
    if (localFile.exists()) {
      localFile.remove(false);
    }
    EnigmailLog.createLogFiles();
  }
})));

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
