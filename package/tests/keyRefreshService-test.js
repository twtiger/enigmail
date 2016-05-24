/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false */
/*global Cc: false, Ci: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global TestHelper: false, component: false, withTestGpgHome: false, withEnigmail: false */

testing("keyRefreshService.jsm"); /*global KeyRefreshService: false */

// TODO
test(withTestGpgHome(withEnigmail(function testInvalidConfig() {
  var config = {};
})));

// TODO
test(withTestGpgHome(withEnigmail(function testGetRandomKey() {
  var config = {strictConnect: false};
})));

// TODO
test(withTestGpgHome(withEnigmail(function testUserWithPublicKeys() {
})));

test(withTestGpgHome(withEnigmail(function testConnectOverTorSocksOnLinux() {
  var config = {env: "notWindows"};
})));

test(withTestGpgHome(withEnigmail(function testConnectOverTorOnWindows() {
  var config = {env: "WINNT"};
})));

test(withTestGpgHome(withEnigmail(function testConnectOverRegularConnectionIfTorIsNotAvailableAndStrictConnectIsFalse() {
  var config = {strictConnect: false};
})));

test(withTestGpgHome(withEnigmail(function testStrictConnectOnlyConnectsOverTor() {
  var config = {strictConnect: true};
})));
