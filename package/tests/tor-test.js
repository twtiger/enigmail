/*global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert:false, component: false, Cc: false, Ci: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global assertContains: false, withEnigmail: false, withTestGpgHome: false, withEnvironment: false, resetting: false */

testing("tor.jsm"); /*global createRandomCredential, EnigmailTor, torProperties, meetsOSConstraints, MINIMUM_CURL_SOCKS5H_VERSION, MINIMUM_WINDOWS_GPG_VERSION, MINIMUM_CURL_SOCKS5_PROXY_VERSION , createHelperArgs, gpgProxyArgs, findTorExecutableHelper: false, buildEnvVars: false*/

component("enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
component("enigmail/randomNumber.jsm"); /*global RandomNumberGenerator*/
component("enigmail/gpg.jsm"); /*global EnigmailGpg: false */

test(function evaluateGpgVersionWhenOsIsWindows() {
  const executableCheck = {
    versionFoundMeetsMinimumVersionRequiredWasCalled: false,
    versionFoundMeetsMinimumVersionRequired: function(executable, minimumVersion) {
      Assert.equal(executable, 'gpg');
      Assert.deepEqual(minimumVersion, MINIMUM_WINDOWS_GPG_VERSION);
      executableCheck.versionFoundMeetsMinimumVersionRequiredWasCalled = true;
      return false;
    }
  };

  Assert.equal(meetsOSConstraints("OS2", executableCheck), false);
  Assert.equal(executableCheck.versionFoundMeetsMinimumVersionRequiredWasCalled, true, "versionFoundMeetsMinimumVersionRequired was not called");
});

test(function evaluateGpgVersionWhenOsIsWindows32() {
  const executableCheck = {
    versionFoundMeetsMinimumVersionRequiredWasCalled: false,
    versionFoundMeetsMinimumVersionRequired: function(executable, minimumVersion) {
      Assert.equal(executable, 'gpg');
      Assert.deepEqual(minimumVersion, MINIMUM_WINDOWS_GPG_VERSION);
      executableCheck.versionFoundMeetsMinimumVersionRequiredWasCalled = true;
      return true;
    }
  };

  Assert.equal(meetsOSConstraints("WINNT", executableCheck), true);
  Assert.equal(executableCheck.versionFoundMeetsMinimumVersionRequiredWasCalled, true, "versionFoundMeetsMinimumVersionRequired was not called");
});

test(function whenMeetsMinimumCurlSocksVersion() {
  const executableCheck = {
    versionFoundMeetsMinimumVersionRequiredWasCalled: false,
    versionFoundMeetsMinimumVersionRequired: function(executable, minimumVersion) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimumVersion, MINIMUM_CURL_SOCKS5_PROXY_VERSION);
      executableCheck.versionFoundMeetsMinimumVersionRequiredWasCalled = true;
      return true;
    }
  };

  Assert.equal(meetsOSConstraints("Linux", executableCheck), true);
  Assert.equal(executableCheck.versionFoundMeetsMinimumVersionRequiredWasCalled, true, "versionFoundMeetsMinimumVersionRequired was not called");
});

test(withEnigmail(function createHelperArgsForTorsocks1(enigmail) {
  EnigmailGpg.setAgentPath({path: '/usr/bin/gpg2'});
  const firstSet = createHelperArgs('torsocks', false);
  Assert.deepEqual(firstSet[0], '/usr/bin/gpg2');
}));

test(function createHelperArgsForTorsocks2() {
  EnigmailGpg.setAgentPath({path: '/usr/bin/gpg'});
  const args = createHelperArgs('torsocks2', true);

  Assert.deepEqual(args[0], '--user');
  Assert.deepEqual(args[2], '--pass');
  Assert.deepEqual(args[4], '/usr/bin/gpg')  ;
});

test(function createHelperArgsAlwaysReturnsRandomUserAndPass() {
  const firstSet = createHelperArgs('torsocks2', true);
  const secondSet = createHelperArgs('torsocks2', true);

  Assert.notEqual(firstSet[1], secondSet[1]);
  Assert.notEqual(firstSet[3], secondSet[3]);
});

test(function createGpgProxyArgs_forWindows() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const tor = {
    ip: '127.0.0.1',
    port: 9050,
    username: username,
    password: password
  };
  const system = {
    isDosLikeWasCalled: false,
    isDosLike: function() {
      system.isDosLikeWasCalled = true;
      return true;
    }
  };
  const executableCheck = {
    versionFoundMeetsMinimumVersionRequiredWasCalled: false,
    versionFoundMeetsMinimumVersionRequired: function(executable, minimum) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimum, MINIMUM_CURL_SOCKS5H_VERSION);
      executableCheck.versionFoundMeetsMinimumVersionRequiredWasCalled = true;
      return false;
    }
  };

  const args = gpgProxyArgs(tor, system, executableCheck);

  Assert.deepEqual(args, 'socks5-hostname://'+username+':'+password+'@127.0.0.1:9050');
  Assert.equal(system.isDosLikeWasCalled, true, 'isDosLike was not called');
});

test(function createGpgProxyArgs_forLinux() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const tor = {
    ip: '192.8.8.4',
    port: 9150,
    username: username,
    password: password
  };
  const system = {
    isDosLikeWasCalled: false,
    isDosLike: function() {
      system.isDosLikeWasCalled = true;
      return false;
    }
  };
  const executableCheck = {
    versionFoundMeetsMinimumVersionRequiredWasCalled: false,
    versionFoundMeetsMinimumVersionRequired: function(executable, minimum) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimum, MINIMUM_CURL_SOCKS5H_VERSION);
      executableCheck.versionFoundMeetsMinimumVersionRequiredWasCalled = true;
      return true;
    }
  };

  const args = gpgProxyArgs(tor, system, executableCheck);

  Assert.equal(args, 'socks5h://'+username+':'+password+'@192.8.8.4:9150');
  Assert.equal(system.isDosLikeWasCalled, true, 'isDosLike was not called');
});

test(function createGpgProxyArgs_forLinux_whenSystemDOESNTMeetSocks5hVersion() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const tor = {
    ip: '192.8.8.4',
    port: 9150,
    username: username,
    password: password
  };
  const system = {
    isDosLikeWasCalled: false,
    isDosLike: function() {
      system.isDosLikeWasCalled = true;
      return false;
    }
  };
  const executableCheck = {
    versionFoundMeetsMinimumVersionRequiredWasCalled: false,
    versionFoundMeetsMinimumVersionRequired: function(executable, minimum) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimum, MINIMUM_CURL_SOCKS5H_VERSION);
      executableCheck.versionFoundMeetsMinimumVersionRequiredWasCalled = true;
      return false;
    }
  };

  const args = gpgProxyArgs(tor, system, executableCheck);

  Assert.equal(args, 'socks5-hostname://'+username+':'+password+'@192.8.8.4:9150');
  Assert.equal(system.isDosLikeWasCalled, true, 'isDosLike was not called');
  Assert.equal(executableCheck.versionFoundMeetsMinimumVersionRequiredWasCalled, true, 'versionFoundMeetsMinimumVersionRequired was not called');
});


test(function returnsFailure_whenSystemCannotFindTor() {
  const system = {
    findTorWasCalled : false,
    findTor: function() {
      system.findTorWasCalled = true;
      return null;
    }
  };

  Assert.equal(torProperties(system), null);
  Assert.equal(system.findTorWasCalled, true);
});

test(function returnsSuccessWithArgs_whenAbleToFindTorAndTorsocks() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const torArgs = ['--user', username, '--pass', password, '/usr/bin/gpg2'];
  const gpgArgs = 'socks5h://'+username+':'+password+'@127.0.0.1:9050';
  const system = {
    findTorWasCalled: false,
    isDosLike: function() {return false;},
    findTor: function() {
      system.findTorWasCalled = true;
      return {
        ip: '127.0.0.1',
        port: 9050,
        username: username,
        password: password
      };
    },
    findTorExecutableHelperWasCalled: false,
    findTorExecutableHelper: function() {
      system.findTorExecutableHelperWasCalled = true;
      return {
        command: 'torsocks',
        args: torArgs
      };
    }
  };

  const properties = torProperties(system);
  const socksProperties = properties.socks;
  const helperProperties = properties.helper;

  Assert.equal(helperProperties.command, 'torsocks');
  Assert.equal(helperProperties.args, torArgs);

  Assert.equal(socksProperties.command, 'gpg');
  Assert.equal(socksProperties.args, gpgArgs);

  Assert.equal(system.findTorWasCalled, true);
  Assert.equal(system.findTorExecutableHelperWasCalled, true);
});

test(function returnsSuccessWithGpgArgs_whenAbleToFindTorButNoHelpers() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const gpgArgs = 'socks5h://'+username+':'+password+'@127.0.0.1:9150';
  const system = {
    findTorWasCalled: false,
    findTor: function() {
      system.findTorWasCalled = true;
      return {
        ip: '127.0.0.1',
        port: 9150,
        username: username,
        password: password
      };
    },
    findTorExecutableHelperWasCalled: false,
    findTorExecutableHelper: function() {
      system.findTorExecutableHelperWasCalled = true;
      return null;
    },
    isDosLikeWasCalled: false,
    isDosLike: function() {
      system.isDosLikeWasCalled = true;
      return false;
    }
  };

  const properties = torProperties(system);
  Assert.equal(properties.helper, null);

  const socksProperties = properties.socks;

  Assert.equal(socksProperties.command, 'gpg');
  Assert.deepEqual(socksProperties.args, gpgArgs);
  Assert.equal(socksProperties.envVars.length, 0);
  Assert.equal(system.findTorWasCalled, true);
  Assert.equal(system.findTorExecutableHelperWasCalled, true);
  Assert.equal(system.isDosLikeWasCalled, true);
});

const MockExecutableCheckBuilder = {
  build: function(x) {
    this.e = {
      exists: function(val) {
        return val === x;
      }
    };
    return this;
  },
  withVersion: function(isHigherVersion) {
    this.e.versionFoundMeetsMinimumVersionRequired = function() { return isHigherVersion;};
    return this;
  },
  get: function() {return this.e;}
};

function contains(string, substring) {
  return string.indexOf(substring) > -1;
}

test(function testUseTorSocks1WhenAvailable() {
  const e = MockExecutableCheckBuilder.build('torsocks').withVersion(false).get();

  const result = findTorExecutableHelper(e);

  Assert.equal(result.command, 'torsocks');
  Assert.ok(contains(result.envVars[0], 'TORSOCKS_USERNAME'));
  Assert.ok(contains(result.envVars[1], 'TORSOCKS_PASSWORD'));
  Assert.equal(result.args.length, 1);
});

test(function testUseTorSocks2WhenAvailable() {
  const e = MockExecutableCheckBuilder.build('torsocks').withVersion(true).get();
  const expectedArgs = ['--user', '--pass', '/usr/bin/gpg2'];

  const result = findTorExecutableHelper(e);

  Assert.equal(result.command, 'torsocks');
});

test(function buildEnvVarsReturnsRandomUserAndPassForTorsocks1() {
  const commandOne = buildEnvVars('torsocks');
  const commandTwo = buildEnvVars('torsocks');

  Assert.notEqual(commandOne[0], commandTwo[0]);
  Assert.notEqual(commandOne[1], commandTwo[1]);
});

test(function testUseTorSocks2WhenAvailable() {
  const executableCheck = MockExecutableCheckBuilder.build('torsocks2').get();
  const expectedArgs = ['--user', '--pass', '/usr/bin/gpg2'];

  const result = findTorExecutableHelper(executableCheck);
  Assert.equal(result.command, 'torsocks2');
});

test(function testUseTorifyWhenAvailable() {
  const executableCheck = MockExecutableCheckBuilder.build('torify').get();
  const result = findTorExecutableHelper(executableCheck);
  Assert.equal(result.command, 'torify');
});

test(function testUseNothingIfNoTorHelpersAreAvailable() {
  const executableCheck = { exists: function() {return false;}};
  const result = findTorExecutableHelper(executableCheck);
  Assert.equal(findTorExecutableHelper(executableCheck), null);
});

test(function creatingRandomCredential() {
  Assert.equal(typeof createRandomCredential(), 'string');

  Assert.notEqual(createRandomCredential(), createRandomCredential());
});
