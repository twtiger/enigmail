/* global test:false, component: false, testing: false, Assert: false, do_load_module: false, do_get_cwd: false */
"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global resetting, withEnvironment, withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true */

testing("keyserver.jsm"); /*global Ci, DOWNLOAD_KEY_WITH_TOR_PREF, DOWNLOAD_KEY_REQUIRES_TOR_PREF, executesSuccessfully: false, buildRefreshRequests: false, gpgRequest: false, createArgsForNormalRequests: false, organizeProtocols: false, sortWithHkpsFirst: false, gpgRequestOverTor: false */
component("enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
component("enigmail/gpgAgent.jsm"); /*global EnigmailGpgAgent: false */
component("enigmail/gpg.jsm"); /*global EnigmailGpg: false */

function setupKeyserverPrefs(keyservers, autoOn) {
  EnigmailPrefs.setPref("keyserver", keyservers);
  EnigmailPrefs.setPref("autoKeyServerSelection", autoOn);
}

test(function setupRequestWithTorHelper(){
  const torArgs = ['--user', 'randomUser', '--pass', 'randomPassword', '/usr/bin/gpg2'];
  const torProperties = { torExists: true,
    command: 'torsocks',
    args: torArgs,
    envVars: ["TORSOCKS_USERNAME=abc", "TORSOCKS_PASSWORD=def"] };

  const request = gpgRequestOverTor('1234', 'hkps://keyserver.1:443', torProperties);

  Assert.equal(request.command.path, '/usr/bin/torsocks');
  const expectedArgs = torArgs
    .concat(EnigmailGpg.getStandardArgs(true))
    .concat(['--keyserver', 'hkps://keyserver.1:443'])
    .concat(['--recv-keys', '1234']);
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

  const request = gpgRequestOverTor('1234', 'hkps://keyserver.1:443', torProperties);

  Assert.equal(request.command.path, '/usr/bin/torsocks');
  Assert.deepEqual(request.args, expectedArgs);
  Assert.deepEqual(request.envVars, torProperties.envVars);
});

test(withTestGpgHome(withEnigmail(function setupRequestWithTorGpgProxyArguments(){
  const gpgProxyArgs = ['--keyserver-options', 'http-proxy=socks5h://randomUser:randomPassword@127.0.0.1:9050'];
  const torProperties = { torExists: true, command: 'gpg', args: gpgProxyArgs, envVars: []};

  const request = gpgRequestOverTor('1234', 'hkps://keyserver.1:443', torProperties);

  Assert.equal(request.command.path, '/usr/bin/gpg2');

  const expectedArgs = EnigmailGpg.getStandardArgs(true)
    .concat(['--keyserver', 'hkps://keyserver.1:443'])
    .concat(gpgProxyArgs)
    .concat(['--recv-keys', '1234']);
  Assert.deepEqual(request.args, expectedArgs);
})));

test(function createStandardRefreshKeyArguments(){
  const expectedArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', '1234']);
  const protocol = 'hkps://keyserver.1:443';
  const httpProxy = {getHttpProxy: function() {return null;} };

  const args = createArgsForNormalRequests('1234', protocol, httpProxy);
  Assert.deepEqual(args, expectedArgs);
});

test(function createStandardRefreshKeyArgumentsWhenUserHasHttpProxy(){
  const expectedArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver-options', 'http-proxy=someProxyHost', '--keyserver', 'hkps://keyserver.1:443', '--recv-keys', '1234']);
  const protocol = 'hkps://keyserver.1:443';
  const httpProxy = {getHttpProxy: function() {return 'someProxyHost';} };

  const args = createArgsForNormalRequests('1234', protocol, httpProxy);
  Assert.deepEqual(args, expectedArgs);
});

test(function testBuildNormalRequestWithStandardArgs(){
  const refreshKeyArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', '1234']);
  const protocol = 'hkps://keyserver.1:443';

  const httpProxy = {getHttpProxy: function() {return null;} };
  const request = gpgRequest('1234', protocol, httpProxy);

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
  const httpProxy = {getHttpProxy: function() {return null;} };
  const expectedKeyId = '1234';

  const requests = buildRefreshRequests(expectedKeyId, tor, httpProxy);

  Assert.equal(requests[0].command, EnigmailGpgAgent.agentPath);
  Assert.equal(requests[0].usingTor, false);

  Assert.deepEqual(requests[0].args, EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', expectedKeyId]));

  Assert.equal(requests[1].command, EnigmailGpgAgent.agentPath);
  Assert.equal(requests[1].usingTor, false);
  Assert.deepEqual(requests[1].args, EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkp://keyserver.1:11371', '--recv-keys', expectedKeyId]));
}));

test(withEnigmail(function createsRequestsWithTorAndWithoutTor_whenTorExists(enigmail){
  EnigmailPrefs.setPref(DOWNLOAD_KEY_REQUIRES_TOR_PREF, false);
  EnigmailPrefs.setPref(DOWNLOAD_KEY_WITH_TOR_PREF, true);
  setupKeyserverPrefs("keyserver.1", true);
  const keyId = '1234';
  const torArgs = ['--user', 'randomUser', '--pass', 'randomPassword', '/usr/bin/gpg2'];
  const hkpsArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', keyId]);
  const hkpArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkp://keyserver.1:11371', '--recv-keys', keyId]);
  const tor = {
    torPropertiesWasCalled: false,
    torProperties: function() {
      tor.torPropertiesWasCalled = true;
      return {
        torExists: true,
        command: 'torsocks',
        args: torArgs,
        envVars: []
      };
    },
  };
  const httpProxy = {getHttpProxy: function() {return null;} };

  const requests = buildRefreshRequests(keyId, tor, httpProxy);

  Assert.equal(tor.torPropertiesWasCalled, true);
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
    torPropertiesWasCalled: false,
    torProperties: function() {
      tor.torPropertiesWasCalled = true;
      return {
        torExists: false,
      };
    },
  };
  const httpProxy = {getHttpProxy: function() {return null;} };

  const requests = buildRefreshRequests(keyId, tor, httpProxy);

  Assert.equal(tor.torPropertiesWasCalled, true);
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
    torPropertiesWasCalled: false,
    torProperties: function() {
      tor.torPropertiesWasCalled = true;
      return {
        torExists: false
      };
    },
  };
  const httpProxy = {getHttpProxy: function() {return null;} };

  const requests = buildRefreshRequests('1234', tor, httpProxy);

  Assert.equal(requests.length, 0);
  Assert.equal(tor.torPropertiesWasCalled, true);
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
      return { wait: function() {} };
    }
  };

  Assert.equal(executesSuccessfully(simpleRequest, subproc), false);
  Assert.equal(subproc.callWasCalled, true);
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
      return { wait: function() {} };
    }
  };

  Assert.equal(executesSuccessfully(simpleRequest, subproc), true);
  Assert.equal(subproc.callWasCalled, true);
}));
