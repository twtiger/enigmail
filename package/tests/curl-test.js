/* global testing: false, do_load_module: false, do_get_cwd: false, test: false, Assert:false, component: false */
"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false */

testing("curl.jsm"); /*global CurlLOL: false, createVersionRequest:false, curlVersionOver:false */
component("enigmail/log.jsm"); /*global EnigmailLog:false */

test(function constructVersionArguments() {
  let request = createVersionRequest();
  Assert.deepEqual(request.arguments, ['--version']);
});

test(function constructCommandToCheckCurlOnLinux() {
  EnigmailLog.setLogLevel(9000);
  Assert.ok(curlVersionOver(7, 21, 7));
});

test(function constructCommandToCheckCurlOnLinux() {
  Assert.ok(!curlVersionOver(100, 0, 0));
});
