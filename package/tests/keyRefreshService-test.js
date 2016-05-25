/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false */
/*global Components: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false, component: false, Cc: false, Ci: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
/* global EnigmailFiles: false */
do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true */

testing("keyRefreshService.jsm"); /*global KeyRefreshService: false */

Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */

function defaultService() {
  var config = {strictConnect: false};
  return KeyRefreshService.service(config);
}

function buildPublicKeys() {
  var fakeKeyRing = {
    keyList: [{
      keyId: 1
    },
    {
      keyId: 2
    }]
  };
  return fakeKeyRing;
}

// TODO
test(withTestGpgHome(withEnigmail(function testInvalidConfig() {
})));

test(withTestGpgHome(withEnigmail(function testGetRandomKey() {
  var keys = buildPublicKeys();
  var service = defaultService();
  var key = service.getRandomKey(keys);
  Assert.ok([1, 2].indexOf(key.keyId) > -1);
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
