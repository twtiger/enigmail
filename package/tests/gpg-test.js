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

testing("gpg.jsm"); /*global EnigmailGpgAgent: false, getLibcurlDependencyPath: false, isUbuntu: false */
component("enigmail/log.jsm"); /*global EnigmailLog: false */

test(function getLibcurlDependencyPathForGpg() {
  EnigmailLog.setLogLevel(8000);
  const origPath = "/start/middle/gnupg";
  const expectedParentPath = "/start/middle/lib/gnupg/gpgkeys_curl";

  const actualParentPath = getLibcurlDependencyPath(origPath);
  Assert.equal(actualParentPath.path, expectedParentPath);
});

test(function getLibcurlDependencyPathForGpg2() {
  EnigmailLog.setLogLevel(8000);
  const origPath = "/start/middle/gnupg2";
  const expectedParentPath = "/start/middle/lib/gnupg2/gpg2keys_curl";

  const actualParentPath = getLibcurlDependencyPath(origPath);
  Assert.equal(actualParentPath.path, expectedParentPath);
});

test(function shouldReturnTrueIfSystemIsUbuntu() {
  const executableCheck = {
    findExecutable: function() {}
  };
  const execution = {
    simpleExecCmd: function(cmd, args, exit, err) {
      exit.value = 0;
      return "ubuntu"; }
  };
  const output = isUbuntu(executableCheck, execution);
  Assert.equal(output, true);
});

test(function shouldReturnFalseIfSystemIsNotUbuntu() {
  const executableCheck = {
    findExecutable: function() {}
  };
  const execution = {
    simpleExecCmd: function(cmd, args, exit, err) {
      exit.value = 0;
      return "windows"; }
  };
  const output = isUbuntu(executableCheck, execution);
  Assert.equal(output, false);
});

test(function shouldReturnNullIfIsUbuntuReturnsError() {
  const executableCheck = {
    findExecutable: function() {}
  };
  const execution = {
    simpleExecCmd: function(cmd, args, exit, err) {
      exit.value = 2;
      return null; }
  };
  const output = isUbuntu(executableCheck, execution);
  Assert.equal(output, null);
});
