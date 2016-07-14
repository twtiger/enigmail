/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false */
/*global TestHelper: false, withEnvironment: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, component: false, withTestGpgHome: false, osUtils: false */

testing("os.jsm"); /*global EnigmailOS: false, isUbuntu: false */
component("enigmail/executableCheck.jsm"); /*global ExecutableCheck: false */
component("enigmail/execution.jsm"); /*global EnigmailExecution: false */

function tempWithFunc(mod, name, replaceF, f) {
  const previous = mod[name];
  try {
    mod[name] = replaceF;
    f();
  } finally {
    mod[name] = previous;
  }
}

test(function shouldReturnTrueIfSystemIsUbuntu() {
  tempWithFunc(ExecutableCheck, "findExecutable", function() { return null; }, function () {
    tempWithFunc(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = 0;
      return "ubuntu";
    }, function() {
      const output = isUbuntu();
      Assert.equal(output, true);
    });
  });
});

test(function shouldReturnFalseIfSystemIsNotUbuntu() {
  tempWithFunc(ExecutableCheck, "findExecutable", function() { return null; }, function () {
    tempWithFunc(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = 0;
      return "windows";
    }, function() {
      const output = isUbuntu();
      Assert.equal(output, false);
    });
  });
});

test(function shouldReturnNullIfIsUbuntuReturnsError() {
  tempWithFunc(ExecutableCheck, "findExecutable", function() { return null; }, function () {
    tempWithFunc(EnigmailExecution, "simpleExecCmd", function(cmd, args, exit, err) {
      exit.value = 2;
      return null;
    }, function() {
      const output = isUbuntu();
      Assert.equal(output, null);
    });
  });
});

