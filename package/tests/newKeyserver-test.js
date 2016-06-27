/* global test:false, component: false, testing: false, Assert: false, do_load_module: false, do_get_cwd: false */
"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global resetting, withEnvironment, withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true */

testing("newKeyserver.jsm"); /*global executesSuccessfully: false, setupKeyserverRequests:false, desparateRequest: false, normalRequest: false, createRefreshKeyArgs: false, organizeProtocols: false, sortKeyserversWithHkpsFirst: false, requestWithTor: false */
component("enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
component("enigmail/gpgAgent.jsm"); /*global EnigmailGpgAgent: false */
component("enigmail/gpg.jsm"); /*global EnigmailGpg: false */

function setupKeyserverPrefs(keyservers, autoOn) {
  EnigmailPrefs.setPref("keyserver", keyservers);
  EnigmailPrefs.setPref("autoKeyServerSelection", autoOn);
}

test(function organizeProtocols_withOneHkpsServer() {
  setupKeyserverPrefs("keyserver.1", true);

  Assert.deepEqual(organizeProtocols(),
    [ {protocol: 'hkps', keyserverName: 'keyserver.1'},
      {protocol: 'hkp', keyserverName: 'keyserver.1'} ]);
});

test(function createStatesForMultipleKeyservers() {
  setupKeyserverPrefs("keyserver.1, keyserver.2, keyserver.3", false);

  Assert.deepEqual(organizeProtocols(),
    [ { protocol: 'hkps', keyserverName: 'keyserver.1' },
      { protocol: 'hkps', keyserverName: 'keyserver.2' },
      { protocol: 'hkps', keyserverName: 'keyserver.3' },
      { protocol: 'hkp', keyserverName: 'keyserver.1' },
      { protocol: 'hkp', keyserverName: 'keyserver.2' },
      { protocol: 'hkp', keyserverName: 'keyserver.3' },
    ]);
});

test(function setsUpStatesWithMixOfSpecifiedProtocols() {
  setupKeyserverPrefs("hkp://keyserver.1, hkps://keyserver.2, keyserver.3, hkps://keyserver.4, ldap://keyserver.5", false);

  Assert.deepEqual(organizeProtocols(),
    [ { protocol: 'hkps', keyserverName: 'keyserver.2'},
      { protocol: 'hkps', keyserverName: 'keyserver.3'},
      { protocol: 'hkps', keyserverName: 'keyserver.4'},
      { protocol: 'hkp', keyserverName: 'keyserver.1'},
      { protocol: 'ldap', keyserverName: 'keyserver.5'},
      { protocol: 'hkp', keyserverName: 'keyserver.3'},
    ]);
});

test(function orderHkpsKeyserversToBeginningOfKeyserverArray() {
  const unorderedKeyservers = ["hkp://keyserver.1", "hkps://keyserver.2", "keyserver.3", "hkps://keyserver.4", "ldap://keyserver.5"];
  const orderedKeyservers = ["hkps://keyserver.2", "keyserver.3", "hkps://keyserver.4", "hkp://keyserver.1", "ldap://keyserver.5"];

  Assert.deepEqual(sortKeyserversWithHkpsFirst(unorderedKeyservers), orderedKeyservers);
});

test(function setupRequestWithTorsocks(){
  const args = ['--user', 'randomUser', '--pass', 'randomPassword', '/usr/bin/gpg2'];
  const torProperties = { torExists: true, command: 'torsocks', args: args };
  const refreshKeyArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', '1234']);

  const request = requestWithTor(torProperties, refreshKeyArgs);

  Assert.equal(request.command.path, '/usr/bin/torsocks');
  Assert.deepEqual(request.args, args.concat(refreshKeyArgs));
});

test(withTestGpgHome(withEnigmail(function setupRequestWithTorGpgProxyArguments(){
  const args = ['--keyserver-options', 'http-proxy=socks5h://randomUser:randomPassword@127.0.0.1:9050'];
  const torProperties = { torExists: true, command: 'gpg', args: args};
  const refreshKeyArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', '1234']);

  const request = requestWithTor(torProperties, refreshKeyArgs);

  Assert.equal(request.command.path, '/usr/bin/gpg2');
  Assert.deepEqual(request.args, args.concat(refreshKeyArgs));
})));

test(function createStandardRefreshKeyArguments(){
  const expectedArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', '1234']);
  const protocol = { protocol: 'hkps', keyserverName: 'keyserver.1' };

  Assert.deepEqual(createRefreshKeyArgs('1234', protocol), expectedArgs);
});

test(function createStandardRefreshKeyArguments(){
  const refreshKeyArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkps://keyserver.1:443', '--recv-keys', '1234']);

  const request = normalRequest(refreshKeyArgs);

  Assert.equal(request.command.path, '/usr/bin/gpg2');
  Assert.deepEqual(request.args, refreshKeyArgs);
});

test(function createStandardRefreshKeyArguments(){
  setupKeyserverPrefs("keyserver.1", true);
  const keyId = '1234';

  const request = desparateRequest(keyId, {protocol: 'hkp', keyserverName: 'keyserver.1'});

  Assert.equal(request.command.path, '/usr/bin/gpg2');
  Assert.deepEqual(request.args, EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkp://keyserver.1:11371', '--recv-keys', keyId]));
  Assert.assertArrayNotContains(request.args, '--keyserver-options');
});

test(function createsRequestsWithTor_whenTorExists(){
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
        args: torArgs
      };
    }
  };

  const requests = setupKeyserverRequests(keyId, tor);

  Assert.equal(tor.torPropertiesWasCalled, true);
  Assert.equal(requests[0].command.path, '/usr/bin/torsocks');
  Assert.deepEqual(requests[0].args, torArgs.concat(hkpsArgs));
  Assert.equal(requests[1].command.path, '/usr/bin/torsocks');
  Assert.deepEqual(requests[1].args, torArgs.concat(hkpArgs));
  Assert.equal(requests[2].command.path, '/usr/bin/gpg2');
  Assert.deepEqual(requests[2].args, hkpArgs);
});

test(function createsNormalRequests_whenTorDoesntExist(){
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
    }
  };

  const requests = setupKeyserverRequests(keyId, tor);

  Assert.equal(tor.torPropertiesWasCalled, true);
  Assert.equal(requests[0].command.path, '/usr/bin/gpg2');
  Assert.deepEqual(requests[0].args, hkpsArgs);
  Assert.equal(requests[1].command.path, '/usr/bin/gpg2');
  Assert.deepEqual(requests[1].args, hkpArgs);
  Assert.equal(requests.length, 2);
});

test(withEnigmail(function executeReportsFailure_whenReceivingConfigurationError(enigmail){
  const simpleRequest = { command: EnigmailGpgAgent.agentPath, args: EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkp://keyserver.1:11371', '--recv-keys', '1234']) };
  withEnvironment({}, function(e) {
    resetting(EnigmailGpgAgent, 'agentPath', "/usr/bin/gpg-agent", function() {
      enigmail.environment = e;
    });
  });

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
  const simpleRequest = { command: EnigmailGpgAgent.agentPath, args: EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkp://keyserver.1:11371', '--recv-keys', '1234']) };
  withEnvironment({}, function(e) {
    resetting(EnigmailGpgAgent, 'agentPath', "/usr/bin/gpg-agent", function() {
      enigmail.environment = e;
    });
  });

  const subproc = {
    callWasCalled: false,
    call: function(proc) {
      subproc.callWasCalled = true;
      proc.stderr("gpg: requesting key KEYID from hkps server pgp.mit.edu\n");
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
