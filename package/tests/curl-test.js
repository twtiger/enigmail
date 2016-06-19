/*global testing: false, do_load_module: false, do_get_cwd: false, test: false, Assert:false, component: false */
"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false */

testing("curl.jsm"); /*global Curl: false, createVersionRequest:false, executableExists:false, versionOverOrEqual:false, environment:false */
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
  findFile: function() {
    return {};
  }
};

test(function checkCurlVersionIsOver() {
  const minimumCurlVersion = {
    main: 7,
    release: 21,
    patch: 7
  };

  Assert.equal(versionOverOrEqual(minimumCurlVersion, testExecutor), true);
});

test(function checkCurlVersionIsLess() {
  const minimumCurlVersion = {
    main: 100,
    release: 0,
    patch: 0
  };
  Assert.equal(versionOverOrEqual(minimumCurlVersion, testExecutor), false);
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

const executorFindsNoFile= {
  findFile: function() {
    return null;
  }
};

test(function reportCurlDoesNotExist() {
  const minimumCurlVersion = {
    main: 7,
    release: 21,
    patch: 7
  };
  Assert.equal(versionOverOrEqual(minimumCurlVersion, executorFindsNoFile), false);
});
