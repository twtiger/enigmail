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
  withTestGpgHome: false, osUtils: false, EnigmailFiles */

testing("gpg.jsm"); /*global EnigmailGpgAgent: false, getLibcurlDependencyPath: false, dirMngrWithTor: false */
component("enigmail/executableCheck.jsm"); /*global ExecutableCheck: false */
component("enigmail/execution.jsm"); /*global EnigmailExecution: false */

test(function getLibcurlDependencyPathForGpg() {
  const origPath = "/start/middle/gpg";
  const expectedParentPath = "/start/lib/gnupg/gpgkeys_curl";

  const actualParentPath = getLibcurlDependencyPath(origPath);
  Assert.equal(actualParentPath.path, expectedParentPath);
});

test(function dirMngrWithTorReturnsTrueWhenConfiguredToUseTor() {
  TestHelper.resetting(ExecutableCheck, "findPath", function() {return "somePath";}, function() {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = 0;
      return "tor is configured";
    }, function() {
      const configuredWithTor = dirMngrWithTor();
      Assert.equal(configuredWithTor, true);
    });
  });
});

test(function dirMngrWithTorReturnsFalseWhenNotConfiguredToUseTor() {
  TestHelper.resetting(ExecutableCheck, "findPath", function() {return "somePath";}, function() {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = 0;
      return "Tor mode is NOT enabled";
    }, function() {
      const configuredWithTor = dirMngrWithTor();
      Assert.equal(configuredWithTor, false);
    });
  });
});

test(function dirMngrWithTorReturnsFalseWhenGpgConnectAgentPathIsNotFound() {
  TestHelper.resetting(EnigmailFiles, "resolvePath", function() { return null; }, function() {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = 0;
      return "anything";
    }, function() {
      const configuredWithTor = dirMngrWithTor();
      Assert.equal(configuredWithTor, false);
    });
  });
});

test(function dirMngrWithTorReturnsFalseWhenExitCodeIsNotZero() {
  TestHelper.resetting(ExecutableCheck, "findPath", function() {return null;}, function() {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = -1;
      return "anything";
    }, function() {
      const configuredWithTor = dirMngrWithTor();
      Assert.equal(configuredWithTor, false);
    });
  });
});
