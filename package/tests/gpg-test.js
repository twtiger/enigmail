/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false */
/*global TestHelper: false, withEnvironment: false, nsIWindowsRegKey: true */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js");
/*global TestHelper: false, withEnvironment: false, withEnigmail: false, component: false,
  withTestGpgHome: false, osUtils: false */

testing("gpg.jsm"); /*global lazyEnv: true, EnigmailGpgAgent: false, getLibcurlDependencyPath: false, dirmngrConfiguredWithTor: false */
component("enigmail/execution.jsm"); /*global EnigmailExecution: false */

test(function getLibcurlDependencyPathForGpg() {
  const origPath = "/start/middle/gpg";
  const expectedParentPath = "/start/lib/gnupg/gpgkeys_curl";

  const actualParentPath = getLibcurlDependencyPath(origPath);
  Assert.equal(actualParentPath.path, expectedParentPath);
});

test(function shouldUseResolveAndSimpleExecWhenCheckingDirmngrConfiguration() {
  TestHelper.resetting(EnigmailExecution, "resolveAndSimpleExec", function(executable, args, exitCodeObj, errorMsgObj) {
    Assert.equal(executable, 'gpg-connect-agent');
    Assert.deepEqual(args, ["--dirmngr", "GETINFO tor", "bye", "\n"]);
    Assert.deepEqual(exitCodeObj, {value:null});
    return "OK - Tor mode is enabled\n OK closing connection\n";
  }, function() {

    dirmngrConfiguredWithTor();
  });
});

test(function returnsTrueWhenConfiguredToUseTor() {
  TestHelper.resetting(EnigmailExecution, "resolveAndSimpleExec", function(executable, args, exitCodeObj, errorMsgObj) {
    exitCodeObj.value = 0;
    return "OK - Tor mode is enabled\n OK closing connection\n";
  }, function() {

    Assert.equal(dirmngrConfiguredWithTor(), true);
  });
});

test(function returnsFalseWhenNotConfiguredToUseTor() {
  TestHelper.resetting(EnigmailExecution, "resolveAndSimpleExec", function(executable, args, exitCodeObj, errorMsgObj) {
    exitCodeObj.value = 0;
    return "OK - Tor mode is NOT enabled\n OK closing connection\n";
  }, function() {

    Assert.equal(dirmngrConfiguredWithTor(), false);
  });
});

test(function returnsFalseWhenGpgConnectAgentPathIsNotFound() {
  TestHelper.resetting(EnigmailExecution, "resolveAndSimpleExec", function(executable, args, exitCodeObj, errorMsgObj) {
    return null;
  }, function() {

    Assert.equal(dirmngrConfiguredWithTor(), false);
  });
});

test(function returnsFalseWhenExitCodeIndicatesErrorInExecution() {
  TestHelper.resetting(EnigmailExecution, "resolveAndSimpleExec", function(executable, args, exitCodeObj, errorMsgObj) {
    exitCodeObj.value = -1;
    return "";
  }, function() {

    Assert.equal(dirmngrConfiguredWithTor(), false);
  });
});
