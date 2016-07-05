/* global test:false, component: false, testing: false, Assert: false, do_load_module: false, do_get_cwd: false */
"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global resetting, withEnvironment, withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true */

testing("keyserver.jsm"); /*global Ci, DOWNLOAD_KEY, TOR_USER_PREFERENCES, executeRefresh: false, buildRefreshRequests: false, gpgRequest: false, organizeProtocols: false, sortWithHkpsFirst: false, gpgRequestOverTor: false, build: false, buildRequests: false */
component("enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
component("enigmail/gpgAgent.jsm"); /*global EnigmailGpgAgent: false */
component("enigmail/gpg.jsm"); /*global EnigmailGpg: false */
component("enigmail/locale.jsm"); /*global EnigmailLocale: false */
component("enigmail/log.jsm"); /*global EnigmailLog: false */

function setupKeyserverPrefs(keyservers, autoOn) {
  EnigmailPrefs.setPref("keyserver", keyservers);
  EnigmailPrefs.setPref("autoKeyServerSelection", autoOn);
}

function buildMockHttpProxy(host) {
  return {getHttpProxy: function() {return host;}};
}

test(function setupRequestWithTorHelper(){
  const torArgs = ['--user', 'randomUser', '--pass', 'randomPassword', '/usr/bin/gpg2'];
  const torProperties = { torExists: true,
    command: 'torsocks',
    args: torArgs,
    envVars: ["TORSOCKS_USERNAME=abc", "TORSOCKS_PASSWORD=def"] };
  const expectedArgs = torArgs
      .concat(EnigmailGpg.getStandardArgs(true))
      .concat(['--keyserver', 'hkps://keyserver.1:443'])
      .concat(['--recv-keys', '1234']);
  const action = Ci.nsIEnigmail.DOWNLOAD_KEY;

  const request = gpgRequestOverTor('1234', 'hkps://keyserver.1:443', torProperties, action);

  Assert.equal(request.command.path, '/usr/bin/torsocks');
  Assert.deepEqual(request.args, expectedArgs);
  Assert.deepEqual(request.envVars, torProperties.envVars);
});

test(function setupRequestWithTorHelperWithEnvVariables(){
  const torArgs = ['--user', 'randomUser', '--pass', 'randomPassword', '/usr/bin/gpg2'];
  const torProperties = { torExists: true,
    command: 'torsocks',
    args: torArgs,
    envVars: ["TORSOCKS_USERNAME=abc", "TORSOCKS_USERNAME=def"] };

  const expectedArgs = torArgs
    .concat(EnigmailGpg.getStandardArgs(true))
    .concat(['--keyserver', 'hkps://keyserver.1:443'])
    .concat(['--recv-keys', '1234']);
  const action = Ci.nsIEnigmail.DOWNLOAD_KEY;

  const request = gpgRequestOverTor('1234', 'hkps://keyserver.1:443', torProperties, action);

  Assert.equal(request.command.path, '/usr/bin/torsocks');
  Assert.deepEqual(request.args, expectedArgs);
  Assert.deepEqual(request.envVars, torProperties.envVars);
});

test(withTestGpgHome(withEnigmail(function setupRequestWithTorGpgProxyArguments(){
  const gpgProxyArgs = ['socks5h://randomUser:randomPassword@127.0.0.1:9050'];
  const torProperties = {
    torExists: true,
    command: 'gpg',
    args: gpgProxyArgs,
    envVars: []
  };
  const expectedGpgProxyArgs = ['--keyserver-options', 'http-proxy=socks5h://randomUser:randomPassword@127.0.0.1:9050'];
  const expectedArgs = EnigmailGpg.getStandardArgs(true)
    .concat(['--keyserver', 'hkps://keyserver.1:443'])
    .concat(expectedGpgProxyArgs)
    .concat(['--recv-keys', '1234']);
  const action = Ci.nsIEnigmail.DOWNLOAD_KEY;

  const request = gpgRequestOverTor('1234', 'hkps://keyserver.1:443', torProperties, action);

  Assert.equal(request.command.path, '/usr/bin/gpg2');
  Assert.deepEqual(request.args, expectedArgs);
})));

test(function testBuildNormalRequestWithStandardArgs(){
  const refreshKeyArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', '1234']);
  const protocol = 'hkps://keyserver.1:443';
  const action = Ci.nsIEnigmail.DOWNLOAD_KEY;

  const request = gpgRequest('1234', protocol, buildMockHttpProxy(null), action);

  Assert.equal(request.command.path, '/usr/bin/gpg2');
  Assert.deepEqual(request.args, refreshKeyArgs);
});

test(withEnigmail(function createsRegularRequests_whenUserDoesNotWantTor() {
  setupKeyserverPrefs("keyserver.1", true);
  EnigmailPrefs.setPref("downloadKeyWithTor", false);
  const tor = {
    torProperties: function() {
      return {
        torExists: false
      };
    },
  };
  const expectedKeyId = '1234';

  const requests = buildRefreshRequests(expectedKeyId, tor, buildMockHttpProxy(null));

  Assert.equal(requests[0].command, EnigmailGpgAgent.agentPath);
  Assert.equal(requests[0].usingTor, false);

  Assert.deepEqual(requests[0].args, EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', expectedKeyId]));

  Assert.equal(requests[1].command, EnigmailGpgAgent.agentPath);
  Assert.equal(requests[1].usingTor, false);
  Assert.deepEqual(requests[1].args, EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkp://keyserver.1:11371', '--recv-keys', expectedKeyId]));
}));

test(withEnigmail(function createsRequestsWithTorAndWithoutTor_whenTorExists(enigmail){
  EnigmailPrefs.setPref(TOR_USER_PREFERENCES.DOWNLOAD.requires, false);
  EnigmailPrefs.setPref(TOR_USER_PREFERENCES.DOWNLOAD.uses, true);
  setupKeyserverPrefs("keyserver.1", true);
  const keyId = '1234';
  const torArgs = ['--user', 'randomUser', '--pass', 'randomPassword', '/usr/bin/gpg2'];
  const hkpsArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', keyId]);
  const hkpArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkp://keyserver.1:11371', '--recv-keys', keyId]);
  const tor = {
    torProperties: function() {
      return {
        torExists: true,
        command: 'torsocks',
        args: torArgs,
        envVars: []
      };
    },
  };

  const requests = buildRefreshRequests(keyId, tor, buildMockHttpProxy(null));

  Assert.equal(requests.length, 4);

  Assert.equal(requests[0].command.path, '/usr/bin/torsocks');
  Assert.deepEqual(requests[0].args, torArgs.concat(hkpsArgs));

  Assert.equal(requests[1].command.path, '/usr/bin/torsocks');
  Assert.deepEqual(requests[1].args, torArgs.concat(hkpArgs));

  Assert.equal(requests[2].command.path, '/usr/bin/gpg2');
  Assert.deepEqual(requests[2].args, hkpsArgs);
  Assert.equal(requests[3].command.path, '/usr/bin/gpg2');
  Assert.deepEqual(requests[3].args, hkpArgs);
}));

test(withEnigmail(function createsNormalRequests_whenTorDoesntExist(){
  setupKeyserverPrefs("keyserver.1", true);
  const keyId = '1234';
  const hkpsArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', keyId]);
  const hkpArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkp://keyserver.1:11371', '--recv-keys', keyId]);
  const tor = {
    torProperties: function() {
      return {
        torExists: false,
      };
    },
  };

  const requests = buildRefreshRequests(keyId, tor, buildMockHttpProxy(null));

  Assert.equal(requests.length, 2);

  Assert.equal(requests[0].command.path, '/usr/bin/gpg2');
  Assert.deepEqual(requests[0].args, hkpsArgs);

  Assert.equal(requests[1].command.path, '/usr/bin/gpg2');
  Assert.deepEqual(requests[1].args, hkpArgs);
}));

test(withEnigmail(function returnNoRequests_whenTorIsRequiredButNotAvailable() {
  setupKeyserverPrefs("keyserver.1, keyserver.2", true);
  EnigmailPrefs.setPref("downloadKeyRequireTor", true);
  const tor = {
    torProperties: function() {
      return {
        torExists: false
      };
    },
  };

  const requests = buildRefreshRequests('1234', tor, buildMockHttpProxy(null));
  Assert.equal(requests.length, 0);
}));

function setupAgentPathAndRequest(enigmail) {
  withEnvironment({}, function(e) {
    resetting(EnigmailGpgAgent, 'agentPath', "/usr/bin/gpg-agent", function() {
      enigmail.environment = e;
    });
  });
  return {
    command: EnigmailGpgAgent.agentPath,
    envVars: [],
    args: EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkp://keyserver.1:11371', '--recv-keys', '1234'])
  };
}

test(withEnigmail(function executeReportsFailure_whenReceivingConfigurationError(enigmail){
  const simpleRequest = setupAgentPathAndRequest(enigmail);
  const subproc = {
    callWasCalled: false,
    call: function(proc) {
      subproc.callWasCalled = true;
      proc.stderr("gpg: keyserver receive failed: Configuration error\n");
      proc.done(2);
      return {wait: function() {}};
    }
  };

  const result = executeRefresh(simpleRequest, subproc);
  Assert.equal(result, false);
}));

test(withEnigmail(function executeReportsSuccess_whenReceivingImportSuccessful(enigmail){
  const simpleRequest = setupAgentPathAndRequest(enigmail);
  const subproc = {
    callWasCalled: false,
    call: function(proc) {
      subproc.callWasCalled = true;
      proc.stderr("[GNUPG:] IMPORT_OK ");
      proc.stderr("gpg: requesting key KEYID from hkps server keyserver.1\n");
      proc.stderr("gpg: key KEYID: public key KEYOWNER <KEYOWNER@EMAIL> imported\n");
      proc.stderr("gpg: 3 marginal(s) needed, 1 complete(s) needed, PGP trust model\n");
      proc.stderr("gpg: depth: 0  valid:   2  signed:   0  trust: 0-, 0q, 0n, 0m, 0f, 2u\n" +
        "gpg: Total number processed: 1\n" +
        "gpg:               imported: 1  (RSA: 1)\n");
      proc.done(0);
      return { wait: function() {} };;
    }
  };

  const result = executeRefresh(simpleRequest, subproc);
  Assert.equal(result, true);
}));

// build always expects a fully-formed keyserver uri

test(function testBasicNormalQuery() {
  var actionflags = Ci.nsIEnigmail.REFRESH_KEY;
  var keyserver = "keyserver0005";
  var searchterms = "";
  var errormsgobj = {};

  const expectedArgs = EnigmailGpg.getStandardArgs(true)
                        .concat("--keyserver")
                        .concat("keyserver0005")
                        .concat("--refresh-keys");

  const keyRequest = build(actionflags, keyserver, searchterms, errormsgobj, buildMockHttpProxy(null));

  Assert.deepEqual(keyRequest.args, expectedArgs);
  Assert.equal(keyRequest.inputData, null);
  Assert.equal(keyRequest.isDownload, Ci.nsIEnigmail.REFRESH_KEY);
  Assert.equal(errormsgobj.value, null);
});

test(function testBasicNormalQueryWithHTTPPRoxy() {
  var actionflags = Ci.nsIEnigmail.REFRESH_KEY;
  var keyserver = "keyserver0005";
  var searchterms = "1";
  var errormsgobj = {};

  const expectedArgs = EnigmailGpg.getStandardArgs(true)
                        .concat("--keyserver-options")
                        .concat("http-proxy=someHttpProxy")
                        .concat("--keyserver")
                        .concat("keyserver0005")
                        .concat("--refresh-keys");

  const keyRequest = build(actionflags, keyserver, searchterms, errormsgobj, buildMockHttpProxy("someHttpProxy"));

  Assert.deepEqual(keyRequest.args, expectedArgs);
  Assert.equal(keyRequest.inputData, null);
  Assert.equal(keyRequest.isDownload, Ci.nsIEnigmail.REFRESH_KEY);
  Assert.equal(errormsgobj.value, null);
});

test(function testBasicNormalQueryWithInputData() {
  const actionflags = Ci.nsIEnigmail.SEARCH_KEY;
  const keyserver = "keyserver0005";
  const searchterms = "1";
  const errormsgobj = {};

  const expectedArgs = EnigmailGpg.getStandardArgs(false)
                        .concat(["--command-fd", "0", "--fixed-list", "--with-colons"])
                        .concat("--keyserver")
                        .concat("keyserver0005")
                        .concat("--search-keys")
                        .concat("1");

  const keyRequest = build(actionflags, keyserver, searchterms, errormsgobj, buildMockHttpProxy(null));

  Assert.deepEqual(keyRequest.args, expectedArgs);
  Assert.equal(keyRequest.inputData, "quit\n");
  Assert.equal(keyRequest.isDownload, 0);
  Assert.equal(errormsgobj.value, null);
});

test(function testNormalReceiveKeyQuery() {
  var actionflags = Ci.nsIEnigmail.DOWNLOAD_KEY;
  var keyserver = "keyserver0005";
  var searchterms = "0001";
  var errormsgobj = {};

  const expectedArgs = EnigmailGpg.getStandardArgs(true)
                        .concat("--keyserver")
                        .concat("keyserver0005")
                        .concat("--recv-keys")
                        .concat("0001");

  const keyRequest = build(actionflags, keyserver, searchterms, errormsgobj, buildMockHttpProxy(null));

  Assert.deepEqual(keyRequest.args, expectedArgs);
  Assert.equal(keyRequest.inputData, null);
  Assert.equal(keyRequest.isDownload, Ci.nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(errormsgobj.value, null);
});

test(function testNormalUploadKeyRequest() {
  var actionflags = Ci.nsIEnigmail.UPLOAD_KEY;
  var keyserver = "keyserver0005";
  var searchterms = "0001";
  var errormsgobj = {};

  const expectedArgs = EnigmailGpg.getStandardArgs(true)
                        .concat("--keyserver")
                        .concat("keyserver0005")
                        .concat("--send-keys")
                        .concat("0001");

  const keyRequest = build(actionflags, keyserver, searchterms, errormsgobj, buildMockHttpProxy(null));

  Assert.deepEqual(keyRequest.args, expectedArgs);
  Assert.equal(keyRequest.inputData, null);
  Assert.equal(keyRequest.isDownload, 0);
  Assert.equal(errormsgobj.value, null);
});

test(function testErrorQueryWithNoKeyserver() {
  var actionflags = Ci.nsIEnigmail.UPLOAD_KEY;
  var keyserver = null;
  var searchterms = "0001";
  var errormsgobj = {};

  var result = build(actionflags, keyserver, searchterms, errormsgobj, buildMockHttpProxy(null));
  Assert.equal(result, null);
  Assert.equal(errormsgobj.value, EnigmailLocale.getString("failNoServer"));
});

test(function testErrorSearchQueryWithNoID() {
  var actionflags = Ci.nsIEnigmail.SEARCH_KEY;
  var keyserver = "keyserver0005";
  var searchterms = null;
  var errormsgobj = {};

  var result = build(actionflags, keyserver, searchterms, errormsgobj, buildMockHttpProxy(null));
  Assert.equal(result, null);
  Assert.equal(errormsgobj.value, EnigmailLocale.getString("failNoID"));
});

