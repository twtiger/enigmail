/*global testing: false, do_load_module: false, do_get_cwd: false, test: false, Assert:false, component: false */
"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global TestHelper:false, withEnigmail: false, withTestGpgHome: false */

testing("versioning.jsm"); /*global Versioning: false, createVersionRequest:false, versionFoundMeetsMinimumVersionRequired:false  */
component("enigmail/log.jsm"); /*global EnigmailLog:false, Components:false, Cc: false, Ci: false, parseVersion: false  */
component("enigmail/execution.jsm"); /*global EnigmailExecution:false */

const curlVersion7Stdout = "curl 7.47.0 (x86_64-pc-linux-gnu) libcurl/7.47.0 GnuTLS/3.4.10 zlib/1.2.8 libidn/1.32 librtmp/2.3\n" +
  "Protocols: dict file ftp ftps gopher http https imap imaps ldap ldaps pop3 pop3s rtmp rtsp smb smbs smtp smtps telnet tftp\n" +
  "Features: AsynchDNS IDN IPv6 Largefile GSS-API Kerberos SPNEGO NTLM NTLM_WB SSL libz TLS-SRP UnixSockets\n";

test(function checkCurlVersionIsOver() {
  TestHelper.resetting(EnigmailExecution, "resolveAndSimpleExec", function(executable, args, exitCodeObj, errorMsgObj) {
    return curlVersion7Stdout;
  }, function() {
    const minimumCurlVersion = { major: 7, minor: 21, patch: 7 };
    Assert.equal(versionFoundMeetsMinimumVersionRequired('curl', minimumCurlVersion), true);
  });
});

test(function checkCurlVersionIsLess() {
  TestHelper.resetting(EnigmailExecution, "resolveAndSimpleExec", function(executable, args, exitCodeObj, errorMsgObj) {
    return curlVersion7Stdout;
  }, function() {
    const absurdlyHighCurlRequirement = { major: 100, minor: 100, patch: 100 };
    Assert.equal(versionFoundMeetsMinimumVersionRequired('curl', absurdlyHighCurlRequirement), false);
  });
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
