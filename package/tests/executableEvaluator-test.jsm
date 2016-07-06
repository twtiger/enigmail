/*global testing: false, do_load_module: false, do_get_cwd: false, test: false, Assert:false, component: false */
"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false */

testing("executableEvaluator.jsm"); /*global ExecutableEvaluator: false, createVersionRequest:false, versionGreaterThanOrEqual:false, gpgVersion: false, gpgVersionOverOrEqual: false*/
component("enigmail/log.jsm"); /*global EnigmailLog:false, Components:false, Cc: false, Ci: false, parseVersion: false  */
component("enigmail/files.jsm"); /*global EnigmailFiles:false */

test(function constructVersionArguments() {
  const requestAndResponse = createVersionRequest({});
  Assert.deepEqual(requestAndResponse[1].arguments, ['--version']);
});

const testExecutor = {
  callAndWait: function(request) {
    const result = {
      exitCode: 0,
      stdout: "curl 7.47.0 (x86_64-pc-linux-gnu) libcurl/7.47.0 GnuTLS/3.4.10 zlib/1.2.8 libidn/1.32 librtmp/2.3"
    };
    request.done(result);
  },
  findExecutable: function() { return {}; },
  exists: function() { return true; }
};

test(function checkCurlVersionIsOver() {
  const minimumCurlVersion = { major: 7, minor: 21, patch: 7 };
  Assert.equal(versionGreaterThanOrEqual('curl', minimumCurlVersion, testExecutor), true);
});

test(function checkCurlVersionIsLess() {
  const absurdlyHighCurlRequirement = { major: 100, minor: 100, patch: 100 };
  Assert.equal(versionGreaterThanOrEqual('curl', absurdlyHighCurlRequirement, testExecutor), false);
});

test(function parseFullVersionResponse() {
  const response = "10.12.5";
  const expectedParsedVersion = { major: 10, minor: 12, patch: 5 };
  Assert.deepEqual(parseVersion(response), expectedParsedVersion);
});

test(function parseMajorMinorResponse() {
  const response = "7.12";
  const expectedParsedVersion = { major: 7, minor: 12, patch: 0 };
  Assert.deepEqual(parseVersion(response), expectedParsedVersion);
});

test(function parseMajorOnlyResponse() {
  const response = "6";
  const expectedParsedVersion = { major: 6, minor: 0, patch: 0 };
  Assert.deepEqual(parseVersion(response), expectedParsedVersion);
});

test(function reportCurlDoesNotExist() {
  const minimumCurlVersion = { major: 7, minor: 21, patch: 7 };
  const executorFindsNoFile = {
    exists: function() { return false; }
  };
  Assert.equal(versionGreaterThanOrEqual('curl', minimumCurlVersion, executorFindsNoFile), false);
});

test(function gpgNotOverOrEqual() {
  const minimum = { major: 2, minor: 0, patch: 30 };
  Assert.equal(versionGreaterThanOrEqual('gpg', minimum), false);
});

test(function evaluatleGpgWithEnigmailGpg() {
  const executor = ExecutableEvaluator.executor;

  const status = executor.gpgVersionOverOrEqual('2.1.12', { major: 2, minor: 0, patch: 30 });

  Assert.equal(status, true);
});
