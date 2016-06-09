/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false */
/*global Components: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false, component: false, Cc: false, Ci: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true */

testing("tor.jsm"); /*global EnigmailTor, connect: true, checkTorRequest: false, isTorRunning: false */


test(function testCheckTorRequestReturnsOk(){
  const host = "127.0.0.1";
  const port = "9050";
  let response = checkTorRequest(host, port);
  Assert.equal(response.status, 200);
});

test(function testCheckRequestIsNotGoingThroughTorProxyWithIncorrectPort(){
  const host = "127.0.0.1";
  const port = "9000";
  let response = isTorRunning(host, port);
  Assert.equal(response, false);
});
