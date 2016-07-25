/*global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false */
/*global TestHelper: false */
/*jshint -W097 */

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global TestHelper: false, component: false */

testing("osDistribution.jsm"); /*global EnigmailOSDistribution: false, isUbuntu: false */
component("enigmail/execution.jsm"); /*global EnigmailExecution: false */
component("enigmail/files.jsm"); /*global EnigmailFiles: false */
component("enigmail/os.jsm"); /*global EnigmailOS: false */

function withDosLike(val, f) {
  return function() {
    TestHelper.resetting(EnigmailOS, "isDosLike", val, f);
  };
}

test(withDosLike(false, function shouldUseUnameToRetreiveSystemInfo() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath",
    function(exe) {
      Assert.equal('uname', exe);
      return { path: '/usr/bin/uname'};
    }, function () {
      isUbuntu();
    });
}));

test(withDosLike(false, function shouldReturnTrueIfSystemIsUbuntu() {
  const ubuntuUnameOutput = "Linux ubuntu 3.13.0-32-generic #57-Ubuntu SMP Tue Jul 15 03:51:08 UTC 2014 x86_64 x86_64 x86_64 GNU/Linux";

  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function(exe) { return { path: '/usr/bin/uname'}; }, function () {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = 0;
      return ubuntuUnameOutput;
    }, function() {
      Assert.equal(isUbuntu(), true);
    });
  });
}));

test(withDosLike(false, function shouldReturnFalseIfLinuxSystemIsNotUbuntu() {
  const archLinuxUnameOutput = "Linux arch 4.6.3-1-ARCH #1 SMP PREEMPT Fri Jun 24 21:19:13 CEST 2016 x86_64 GNU/Linux";

  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function() { return { path: '/usr/bin/uname'}; }, function () {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = 0;
      return archLinuxUnameOutput;
    }, function() {
      Assert.equal(isUbuntu(), false);
    });
  });
}));

test(withDosLike(true, function shouldReturnFalseIfIsSystemIsWindows() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function() { return { path: '/usr/bin/uname'}; }, function () {
    Assert.equal(isUbuntu(), false);
  });
}));

test(withDosLike(false, function shouldReturnNullIfExecutableCheckExitCodeIsNotZero() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function() { return { path: '/usr/bin/uname'}; }, function () {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = -1;
    }, function() {
      Assert.equal(isUbuntu(), null);
    });
  });
}));

test(withDosLike(false, function shouldReturnNullIfExecutableUnameIsNotFound() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function() {
    return null;
  }, function () {
    Assert.equal(isUbuntu(), null);
  });
}));
