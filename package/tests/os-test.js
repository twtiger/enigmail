/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false */
/*global TestHelper: false, withEnvironment: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global TestHelper: false, withEnigmail: false, component: false, withTestGpgHome: false, osUtils: false */

testing("os.jsm"); /*global operatingSystem: true, isMac: false, EnigmailOS: false, isUbuntu: false */
component("enigmail/execution.jsm"); /*global EnigmailExecution: false */
component("enigmail/files.jsm"); /*global EnigmailFiles: false */

test(function shouldUseUnameToRetreiveSystemInfo() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath",
    function(exe) {
      Assert.equal('uname', exe);
      return { path: '/usr/bin/uname'};
    }, function () {
      isUbuntu();
    });
});

test(function shouldReturnTrueIfSystemIsUbuntu() {
  const ubuntuUnameOutput = "Linux ubuntu 3.13.0-32-generic #57-Ubuntu SMP Tue Jul 15 03:51:08 UTC 2014 x86_64 x86_64 x86_64 GNU/Linux";

  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function(exe) { return { path: '/usr/bin/uname'}; }, function () {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = 0;
      return ubuntuUnameOutput;
    }, function() {
      Assert.equal(isUbuntu(), true);
    });
  });
});

test(function shouldReturnFalseIfLinuxSystemIsNotUbuntu() {
  const archLinuxUnameOutput = "Linux arch 4.6.3-1-ARCH #1 SMP PREEMPT Fri Jun 24 21:19:13 CEST 2016 x86_64 GNU/Linux";

  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function() { return { path: '/usr/bin/uname'}; }, function () {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = 0;
      return archLinuxUnameOutput;
    }, function() {
      Assert.equal(isUbuntu(), false);
    });
  });
});

test(function shouldReturnFalseIfIsSystemIsWindows() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function() { return { path: '/usr/bin/uname'}; }, function () {
    TestHelper.resetting(EnigmailOS, "isDosLike", function() {
      return true;
    }, function() {
      Assert.equal(isUbuntu(), false);
    });
  });
});

test(function shouldReturnNullIfExecutableCheckExitCodeIsNotZero() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function() { return { path: '/usr/bin/uname'}; }, function () {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = -1;
    }, function() {
      Assert.equal(isUbuntu(), null);
    });
  });
});

test(function shouldReturnNullIfExecutableUnameIsNotFound() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function() {
    return null;
  }, function () {
    Assert.equal(isUbuntu(), null);
  });
});

test(function shouldReturnTrueWhenSystemIsMac() {
  operatingSystem = 'Darwin';
  Assert.equal(isMac(), true);
});

test(function shouldReturnFalseWhenSystemIsLinux() {
  operatingSystem = 'Linux';
  Assert.equal(isMac(), false);
});
