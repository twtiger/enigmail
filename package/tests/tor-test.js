/*global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert:false, component: false, Cc: false, Ci: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global assertContains: false, withEnigmail: false, withTestGpgHome: false, withEnvironment: false, resetting: false */

<<<<<<< 55405ca6e7cc0562b19962839f32f8002999657e
testing("tor.jsm"); /*global EnigmailTor, torProperties, meetsOSConstraints, MINIMUM_WINDOWS_GPG_VERSION, MINIMUM_CURL_VERSION, createHelperArgs, gpgProxyInfo, findTorExecutableHelper: false, buildEnvVars: false*/
=======
  testing("tor.jsm"); /*global EnigmailTor, torProperties, meetsOSConstraints, MINIMUM_CURL_SOCKS5H_VERSION, MINIMUM_WINDOWS_GPG_VERSION, MINIMUM_CURL_SOCKS5_PROXY_VERSION , createHelperArgs, gpgProxyArgs, findTorExecutableHelper: false, buildEnvVars: false*/
>>>>>>> Does not use tor when curl does not meet minimum version to use socks5 proxies

component("enigmail/prefs.jsm"); /* global EnigmailPrefs: false */
component("enigmail/randomNumber.jsm"); /* global RandomNumberGenerator*/
component("enigmail/gpg.jsm"); /*global EnigmailGpg: false */

test(function evaluateGpgVersionWhenOsIsWindows() {
  const executableEvaluator = {
    versionOverOrEqualWasCalled: false,
    versionOverOrEqual: function(executable, minimumVersion) {
      Assert.equal(executable, 'gpg');
      Assert.deepEqual(minimumVersion, MINIMUM_WINDOWS_GPG_VERSION);
      executableEvaluator.versionOverOrEqualWasCalled = true;
      return false;
    }
  };

  Assert.equal(meetsOSConstraints("OS2", executableEvaluator), false);
  Assert.equal(executableEvaluator.versionOverOrEqualWasCalled, true, "versionOverOrEqual was not called");
});

test(function evaluateGpgVersionWhenOsIsWindows32() {
  const executableEvaluator = {
    versionOverOrEqualWasCalled: false,
    versionOverOrEqual: function(executable, minimumVersion) {
      Assert.equal(executable, 'gpg');
      Assert.deepEqual(minimumVersion, MINIMUM_WINDOWS_GPG_VERSION);
      executableEvaluator.versionOverOrEqualWasCalled = true;
      return true;
    }
  };

  Assert.equal(meetsOSConstraints("WINNT", executableEvaluator), true);
  Assert.equal(executableEvaluator.versionOverOrEqualWasCalled, true, "versionOverOrEqual was not called");
});

test(function whenMeetsMinimumCurlSocksVersion() {
  const executableEvaluator = {
    versionOverOrEqualWasCalled: false,
    versionOverOrEqual: function(executable, minimumVersion) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimumVersion, MINIMUM_CURL_SOCKS5_PROXY_VERSION);
      executableEvaluator.versionOverOrEqualWasCalled = true;
      return true;
    }
  };

  Assert.equal(meetsOSConstraints("Linux", executableEvaluator), true);
  Assert.equal(executableEvaluator.versionOverOrEqualWasCalled, true, "versionOverOrEqual was not called");
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
  const executableEvaluator = {
    versionOverOrEqualWasCalled: false,
    versionOverOrEqual: function(executable, minimum) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimum, MINIMUM_CURL_SOCKS5H_VERSION);
      executableEvaluator.versionOverOrEqualWasCalled = true;
      return false;
    }
  };

  const args = gpgProxyArgs(tor, system, executableEvaluator);

  <<<<<<< 55405ca6e7cc0562b19962839f32f8002999657e
  const expectedHttpProxyAddress = 'socks5-hostname://'+username+':'+password+'@127.0.0.1:9050';
  Assert.deepEqual(gpgProxyInfo(tor, system), expectedHttpProxyAddress);
  =======
    const expectedHttpProxyAddress = 'http-proxy=socks5-hostname://'+username+':'+password+'@127.0.0.1:9050';
  Assert.deepEqual(args, ['--keyserver-options', expectedHttpProxyAddress]);
  >>>>>>> Does not use tor when curl does not meet minimum version to use socks5 proxies
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
  const executableEvaluator = {
    versionOverOrEqualWasCalled: false,
    versionOverOrEqual: function(executable, minimum) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimum, MINIMUM_CURL_SOCKS5H_VERSION);
      executableEvaluator.versionOverOrEqualWasCalled = true;
      return true;
    }
  };

  const args = gpgProxyArgs(tor, system, executableEvaluator);

  const expectedHttpProxyAddress = 'http-proxy=socks5h://'+username+':'+password+'@192.8.8.4:9150';
  Assert.deepEqual(args, ['--keyserver-options', expectedHttpProxyAddress]);
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
  const executableEvaluator = {
    versionOverOrEqualWasCalled: false,
    versionOverOrEqual: function(executable, minimum) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimum, MINIMUM_CURL_SOCKS5H_VERSION);
      executableEvaluator.versionOverOrEqualWasCalled = true;
      return false;
    }
  };

  const args = gpgProxyArgs(tor, system, executableEvaluator);

  const expectedHttpProxyAddress = 'http-proxy=socks5-hostname://'+username+':'+password+'@192.8.8.4:9150';
  Assert.deepEqual(args, ['--keyserver-options', expectedHttpProxyAddress]);
  Assert.equal(system.isDosLikeWasCalled, true, 'isDosLike was not called');
  Assert.equal(executableEvaluator.versionOverOrEqualWasCalled, true, 'versionOverOrEqual was not called');
});


test(function returnsFailure_whenSystemCannotFindTor() {
  const system = {
    findTorWasCalled : false,
    findTor: function() {
      system.findTorWasCalled = true;
      return {
        exists: false
      };
    }
  };

  Assert.deepEqual(torProperties(system), { torExists: false });
  Assert.equal(system.findTorWasCalled, true);
});

test(function returnsFailure_whenFindTorReturnsBadThing() {
  const system = {
    findTorWasCalled : false,
    findTor: function() {
      system.findTorWasCalled = true;
      return {
        exists: {}
      };
    }
  };

  Assert.deepEqual(torProperties(system), { torExists: false });
  Assert.equal(system.findTorWasCalled, true);
});

test(function returnsSuccessWithArgs_whenAbleToFindTorAndTorsocks() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const torArgs = ['--user', username, '--pass', password, '/usr/bin/gpg2'];
  const system = {
    findTorWasCalled: false,
    findTor: function() {
      system.findTorWasCalled = true;
      return {
        exists: true,
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
        exists: true,
        command: 'torsocks',
        args: torArgs
      };
    }
  };

  const properties = torProperties(system);

  Assert.equal(properties.torExists, true);
  Assert.equal(properties.command, 'torsocks');
  Assert.equal(properties.args, torArgs);
  Assert.equal(system.findTorWasCalled, true);
  Assert.equal(system.findTorExecutableHelperWasCalled, true);
});

test(function returnsSuccesWithGpgArgs_whenAbleToFindTorButNoHelpers() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const gpgArgs = ['socks5h://'+username+':'+password+'@127.0.0.1:9150'];
  const system = {
    findTorWasCalled: false,
    findTor: function() {
      system.findTorWasCalled = true;
      return {
        exists: true,
        ip: '127.0.0.1',
        port: 9150,
        username: username,
        password: password
      };
    },
    findTorExecutableHelperWasCalled: false,
    findTorExecutableHelper: function() {
      system.findTorExecutableHelperWasCalled = true;
      return {
        exists: false,
      };
    },
    isDosLikeWasCalled: false,
    isDosLike: function() {
      system.isDosLikeWasCalled = true;
      return false;
    }
  };

  const properties = torProperties(system);

  Assert.equal(properties.torExists, true);
  Assert.equal(properties.command, 'gpg');
  Assert.deepEqual(properties.args, gpgArgs);
  Assert.equal(properties.envVars.length, 0);
  Assert.equal(system.findTorWasCalled, true);
  Assert.equal(system.findTorExecutableHelperWasCalled, true);
  Assert.equal(system.isDosLikeWasCalled, true);
});

const MockExecutableEvaluatorBuilder = {
  build: function(x) {
    this.e = {
      exists: function(val) {
        return val === x;
      }
    };
    return this;
  },
  withVersion: function(isHigherVersion) {
    this.e.versionOverOrEqual = function() { return isHigherVersion;};
    return this;
  },
  get: function() {return this.e;}
};

function contains(string, substring) {
  return string.indexOf(substring) > -1;
}

test(function testUseTorSocks1WhenAvailable() {
  const e = MockExecutableEvaluatorBuilder.build('torsocks').withVersion(false).get();

  const result = findTorExecutableHelper(e);

  Assert.equal(result.exists, true);
  Assert.equal(result.command, 'torsocks');
  Assert.ok(contains(result.envVars[0], 'TORSOCKS_USERNAME'));
  Assert.ok(contains(result.envVars[1], 'TORSOCKS_PASSWORD'));
  Assert.equal(result.args.length, 1);
});

test(function testUseTorSocks2WhenAvailable() {
  const e = MockExecutableEvaluatorBuilder.build('torsocks').withVersion(true).get();
  const expectedArgs = ['--user', '--pass', '/usr/bin/gpg2'];

  const result = findTorExecutableHelper(e);
  Assert.equal(result.exists, true);
  Assert.equal(result.command, 'torsocks');
});

test(function buildEnvVarsReturnsRandomUserAndPassForTorsocks1() {
  const commandOne = buildEnvVars('torsocks');
  const commandTwo = buildEnvVars('torsocks');

  Assert.notEqual(commandOne[0], commandTwo[0]);
  Assert.notEqual(commandOne[1], commandTwo[1]);
});

test(function testUseTorSocks2WhenAvailable() {
  const executableEvaluator = MockExecutableEvaluatorBuilder.build('torsocks2').get();
  const expectedArgs = ['--user', '--pass', '/usr/bin/gpg2'];

  const result = findTorExecutableHelper(executableEvaluator);
  Assert.equal(result.exists, true);
  Assert.equal(result.command, 'torsocks2');
});

test(function testUseTorifyWhenAvailable() {
  const executableEvaluator = MockExecutableEvaluatorBuilder.build('torify').get();
  const result = findTorExecutableHelper(executableEvaluator);
  Assert.equal(result.exists, true);
  Assert.equal(result.command, 'torify');
});

test(function testUseNothingIfNoTorHelpersAreAvailable() {
  const executableEvaluator = { exists: function() {return false;}};
  const result = findTorExecutableHelper(executableEvaluator);
  Assert.equal(result.exists, false);
});
