/* global testing: false, do_load_module: false, do_get_cwd: false, test: false, Assert:false, component: false */
"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false */

testing("curl.jsm"); /*global Curl: false, createVersionRequest:false, executableExists:false, versionOver:false, environment:false */
component("enigmail/log.jsm"); /*global EnigmailLog:false, Components:false, Cc: false, Ci: false, parseVersion: false  */
component("enigmail/files.jsm"); /*global EnigmailFiles:false */

test(function constructVersionArguments() {
  const request = createVersionRequest(EnigmailFiles.resolvePath("curl", environment().get("PATH"), false));
  Assert.deepEqual(request.arguments, ['--version']);
});

test(function checkCurlVersionIsOver() {
  const minimumCurlVersion = {
    main: 7,
    release: 21,
    patch: 7
  };
  Assert.ok(versionOver(minimumCurlVersion, "Linux"));
});

test(function checkCurlVersionIsLess() {
  const minimumCurlVersion = {
    main: 100,
    release: 0,
    patch: 0
  };
  Assert.ok(!versionOver(minimumCurlVersion, "Linux"));
});

test(function parseFulVersionResponse() {
  const curlVersionResponse = "10.12.5";
  const expectedParsedVersion = {
    main: 10,
    release: 12,
    patch: 5
  };
  Assert.deepEqual(parseVersion(curlVersionResponse), expectedParsedVersion);
});

test(function parseReleaseOnlyResponse() {
  const curlVersionResponse = "7.12";
  const expectedParsedVersion = {
    main: 7,
    release: 12,
    patch: 0
  };
  Assert.deepEqual(parseVersion(curlVersionResponse), expectedParsedVersion);
});

test(function parseMainOnlyResponse() {
  const curlVersionResponse = "6";
  const expectedParsedVersion = {
    main: 6,
    release: 0,
    patch: 0
  };
  Assert.deepEqual(parseVersion(curlVersionResponse), expectedParsedVersion);
});

test(function reportCurlDoesNotExist() {
  Assert.ok(!executableExists(null));
});
