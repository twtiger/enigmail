/*global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert:false, component: false, Cc: false, Ci: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global assertContains: false, withEnigmail: false, withTestGpgHome: false */

testing("newTor.jsm"); /*global EnigmailTor, DOWNLOAD_KEY_REQUIRED_PREF, torProperties, meetsOSConstraints, MINIMUM_WINDOWS_GPG_VERSION, MINIMUM_CURL_VERSION, createHelperArgs, gpgProxyArgs, findTorExecutableHelper: false*/

component("enigmail/prefs.jsm"); /* global EnigmailPrefs: false, REFRESH_KEY_PREF:false, DOWNLOAD_KEY_PREF:false, SEARCH_KEY_REQUIRED_PREF:false */
component("enigmail/randomNumber.jsm"); /* global RandomNumberGenerator*/

const DOWNLOAD_KEY_ACTION_FLAG = Ci.nsIEnigmail.DOWNLOAD_KEY;

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


test(function evaluateCurlVersionWhenOsIsNotWindows() {
  const executableEvaluator = {
    versionOverOrEqualWasCalled: false,
    versionOverOrEqual: function(executable, minimumVersion) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimumVersion, MINIMUM_CURL_VERSION);
      executableEvaluator.versionOverOrEqualWasCalled = true;
      return true;
    }
  };

  Assert.equal(meetsOSConstraints("Linux", executableEvaluator), true);
  Assert.equal(executableEvaluator.versionOverOrEqualWasCalled, true, "versionOverOrEqual was not called");
});

test(function createHelperArgsForTorsocks() {
  const firstSet = createHelperArgs('torsocks');
  const secondSet = createHelperArgs('torsocks');

  Assert.deepEqual(firstSet[0], '--user');
  Assert.deepEqual(secondSet[0], '--user');
  Assert.notEqual(firstSet[1], secondSet[1]);
  Assert.deepEqual(firstSet[2], '--pass');
  Assert.deepEqual(secondSet[2], '--pass');
  Assert.notEqual(firstSet[3], secondSet[3]);
  Assert.deepEqual(firstSet[4], '/usr/bin/gpg2');
  Assert.deepEqual(secondSet[4], '/usr/bin/gpg2');
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

  const expectedHttpProxyAddress = 'http-proxy=socks5-hostname://'+username+':'+password+'@127.0.0.1:9050';
  Assert.deepEqual(gpgProxyArgs(tor, system), ['--keyserver-options', expectedHttpProxyAddress]);
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

  const expectedHttpProxyAddress = 'http-proxy=socks5h://'+username+':'+password+'@192.8.8.4:9150';
  Assert.deepEqual(gpgProxyArgs(tor, system), ['--keyserver-options', expectedHttpProxyAddress]);
  Assert.equal(system.isDosLikeWasCalled, true, 'isDosLike was not called');
});

test(function returnFailure_whenUserDoesNotWantToUseTor() {
  EnigmailPrefs.setPref(DOWNLOAD_KEY_PREF, false);
  Assert.deepEqual(torProperties(DOWNLOAD_KEY_ACTION_FLAG), { torExists: false });
});

test(function returnsFailure_whenSystemCannotFindTor() {
  EnigmailPrefs.setPref(DOWNLOAD_KEY_PREF, true);
  const system = {
    findTorWasCalled : false,
    findTor: function() {
      system.findTorWasCalled = true;
      return {
        exists: false
      };
    }
  };

  Assert.deepEqual(torProperties(DOWNLOAD_KEY_ACTION_FLAG, system), { torExists: false });
  Assert.equal(system.findTorWasCalled, true);
});

test(function returnsSuccesWithArgs_whenAbleToFindTorAndTorsocks() {
  EnigmailPrefs.setPref(DOWNLOAD_KEY_PREF, true);
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

  const properties = torProperties(DOWNLOAD_KEY_ACTION_FLAG, system);

  Assert.equal(properties.torExists, true);
  Assert.equal(properties.command, 'torsocks');
  Assert.equal(properties.args, torArgs);
  Assert.equal(system.findTorWasCalled, true);
  Assert.equal(system.findTorExecutableHelperWasCalled, true);
});

test(function returnsSuccesWithGpgArgs_whenAbleToFindTorButNoHelpers() {
  EnigmailPrefs.setPref(DOWNLOAD_KEY_PREF, true);
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const gpgArgs = ['--keyserver-options', 'http-proxy=socks5h://'+username+':'+password+'@127.0.0.1:9150'];
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

  const properties = torProperties(DOWNLOAD_KEY_ACTION_FLAG, system);

  Assert.equal(properties.torExists, true);
  Assert.equal(properties.command, 'gpg');
  Assert.deepEqual(properties.args, gpgArgs);
  Assert.equal(system.findTorWasCalled, true);
  Assert.equal(system.findTorExecutableHelperWasCalled, true);
  Assert.equal(system.isDosLikeWasCalled, true);
});

function buildMockExecutableEvaluator(x) {
  return {
    exists: function(val) {
      if (val == x) {
        return true;
      }
      return false;
    }
  };
}

test(function testUseTorSocksWhenAvailable() {
  const executableEvaluator = buildMockExecutableEvaluator('torsocks');
  const result = findTorExecutableHelper(executableEvaluator);
  Assert.equal(result.exists, true);
  Assert.equal(result.command, 'torsocks');
});

test(function testUseTorSocks2WhenAvailable() {
  const executableEvaluator = buildMockExecutableEvaluator('torsocks2');
  const result = findTorExecutableHelper(executableEvaluator);
  Assert.equal(result.exists, true);
  Assert.equal(result.command, 'torsocks2');
});

test(function testUseTorifyWhenAvailable() {
  const executableEvaluator = buildMockExecutableEvaluator('torify');
  const result = findTorExecutableHelper(executableEvaluator);
  Assert.equal(result.exists, true);
  Assert.equal(result.command, 'torify');
});

test(function testUseNothingIfNoTorHelpersAreAvailable() {
  const executableEvaluator = { exists: function() {return false;}};
  const result = findTorExecutableHelper(executableEvaluator);
  Assert.equal(result.exists, false);
});
