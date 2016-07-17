/*global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert:false, component: false, Cc: false, Ci: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global TestHelper: false, assertContains: false, withEnigmail: false, withTestGpgHome: false, withEnvironment: false, resetting: false */

testing("tor.jsm"); /*global createRandomCredential, EnigmailTor, torProperties, meetsOSConstraints, MINIMUM_CURL_SOCKS5H_VERSION, MINIMUM_WINDOWS_GPG_VERSION, MINIMUM_CURL_SOCKS5_PROXY_VERSION , createHelperArgs, gpgProxyArgs, findTorExecutableHelper: false*/

component("enigmail/randomNumber.jsm"); /*global RandomNumberGenerator*/
component("enigmail/gpg.jsm"); /*global EnigmailGpg: false */
component("enigmail/files.jsm"); /*global EnigmailFiles: false */

function withStandardGpg(f) {
  return function() {
    EnigmailGpg.usesLibcurl = function() { return true; };
    EnigmailGpg.dirmngrConfiguredWithTor = function() { return false; };
    try {
      f();
    }
    finally {}
  };
}

test(function evaluateGpgVersionWhenOsIsWindows() {
  TestHelper.resetting(EnigmailGpg, "agentVersion", '1.4.0', function() {
    const versioning = {
      versionMeetsMinimumWasCalled: false,
      versionMeetsMinimum: function(version, minimumVersion) {
        Assert.equal(version, '1.4.0');
        Assert.deepEqual(minimumVersion, MINIMUM_WINDOWS_GPG_VERSION);
        versioning.versionMeetsMinimumWasCalled = true;
        return false;
      }
    };

    Assert.equal(meetsOSConstraints("OS2", versioning), false);
    Assert.equal(versioning.versionMeetsMinimumWasCalled, true, "versionMeetsMinimum was not called");
  });
});

test(function evaluateGpgVersionWhenOsIsWindows32() {
  TestHelper.resetting(EnigmailGpg, "agentVersion", '2.0.30', function() {
    const versioning = {
      versionFoundMeetsMinimumWasCalled: false,
      versionMeetsMinimum: function(version, minimumVersion) {
        Assert.equal(version, '2.0.30');
        Assert.deepEqual(minimumVersion, MINIMUM_WINDOWS_GPG_VERSION);
        versioning.versionMeetsMinimumWasCalled = true;
        return true;
      }
    };

    Assert.equal(meetsOSConstraints("WINNT", versioning), true);
    Assert.equal(versioning.versionMeetsMinimumWasCalled, true, "versionMeetsMinimum was not called");
  });
});

test(function whenMeetsMinimumCurlSocksVersion() {
  const versioning = {
    versionFoundMeetsMinimumVersionRequiredWasCalled: false,
    versionFoundMeetsMinimumVersionRequired: function(executable, minimumVersion) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimumVersion, MINIMUM_CURL_SOCKS5_PROXY_VERSION);
      versioning.versionFoundMeetsMinimumVersionRequiredWasCalled = true;
      return true;
    }
  };

  Assert.equal(meetsOSConstraints("Linux", versioning), true);
  Assert.equal(versioning.versionFoundMeetsMinimumVersionRequiredWasCalled, true, "versionFoundMeetsMinimumVersionRequired was not called");
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
  const versioning = {
    versionFoundMeetsMinimumVersionRequiredWasCalled: false,
    versionFoundMeetsMinimumVersionRequired: function(executable, minimum) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimum, MINIMUM_CURL_SOCKS5H_VERSION);
      versioning.versionFoundMeetsMinimumVersionRequiredWasCalled = true;
      return false;
    }
  };

  const args = gpgProxyArgs(tor, system, versioning);

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
  const versioning = {
    versionFoundMeetsMinimumVersionRequiredWasCalled: false,
    versionFoundMeetsMinimumVersionRequired: function(executable, minimum) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimum, MINIMUM_CURL_SOCKS5H_VERSION);
      versioning.versionFoundMeetsMinimumVersionRequiredWasCalled = true;
      return true;
    }
  };

  const args = gpgProxyArgs(tor, system, versioning);

  Assert.equal(args, 'socks5h://'+username+':'+password+'@192.8.8.4:9150');
  Assert.equal(system.isDosLikeWasCalled, true, 'isDosLike was not called');
});

test(withStandardGpg(function successfulRequestWillCallThroughToSystem() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const torArgs = ['--user', username, '--pass', password, '/usr/bin/gpg2'];
  const gpgArgs = 'socks5h://'+username+':'+password+'@127.0.0.1:9050';
  const system = {
    findTorWasCalled: false,
    isDosLikeWasCalled: false,
    isDosLike: function() {
      system.isDosLikeWasCalled = true;
      return false;
    },
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
    },
    gpgUsesSocksArguments: function() { return true; }
  };

  torProperties(system);
  Assert.equal(system.findTorWasCalled, true);
  Assert.equal(system.findTorExecutableHelperWasCalled, true);
  Assert.equal(system.isDosLikeWasCalled, true, 'isDosLike was not called');
}));

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
    isDosLike: function() {
      return false;
    }
  };
  const versioning = {
    versionFoundMeetsMinimumVersionRequiredWasCalled: false,
    versionFoundMeetsMinimumVersionRequired: function(executable, minimum) {
      Assert.equal(executable, 'curl');
      Assert.deepEqual(minimum, MINIMUM_CURL_SOCKS5H_VERSION);
      versioning.versionFoundMeetsMinimumVersionRequiredWasCalled = true;
      return false;
    }
  };

  const args = gpgProxyArgs(tor, system, versioning);

  Assert.equal(args, 'socks5-hostname://'+username+':'+password+'@192.8.8.4:9150');
  Assert.equal(versioning.versionFoundMeetsMinimumVersionRequiredWasCalled, true, 'versionFoundMeetsMinimumVersionRequired was not called');
});


test(function returnsFailure_whenSystemCannotFindTor() {
  const system = {
    findTor: function() {
      return null;
    }
  };
  Assert.equal(torProperties(system), null);
});

test(withStandardGpg(function returnsSuccessWithArgs_whenAbleToFindTorAndTorsocks() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const torArgs = ['--user', username, '--pass', password, '/usr/bin/gpg2'];
  const gpgArgs = 'socks5h://'+username+':'+password+'@127.0.0.1:9050';
  const system = {
    isDosLike: function() {return false;},
    findTor: function() {
      return {
        ip: '127.0.0.1',
        port: 9050,
        username: username,
        password: password
      };
    },
    findTorExecutableHelper: function() {
      return {
        command: 'torsocks',
        args: torArgs
      };
    },
    gpgUsesSocksArguments: function() { return true; }
  };

  const properties = torProperties(system);
  const socksProperties = properties.socks;
  const helperProperties = properties.helper;

  Assert.equal(helperProperties.command, 'torsocks');
  Assert.equal(helperProperties.args, torArgs);

  Assert.equal(socksProperties.command, 'gpg');
  Assert.equal(socksProperties.args, gpgArgs);
}));

test(withStandardGpg(function returnsSuccessWithGpgArgs_whenAbleToFindTorButNoHelpers() {
  const username = RandomNumberGenerator.getUint32();
  const password = RandomNumberGenerator.getUint32();
  const gpgArgs = 'socks5h://'+username+':'+password+'@127.0.0.1:9150';
  const system = {
    findTor: function() {
      return {
        ip: '127.0.0.1',
        port: 9150,
        username: username,
        password: password
      };
    },
    findTorExecutableHelper: function() {
      return null;
    },
    isDosLike: function() {
      return false;
    },
    gpgUsesSocksArguments: function() { return true; }
  };

  const properties = torProperties(system);
  Assert.equal(properties.helper, null);

  const socksProperties = properties.socks;

  Assert.equal(socksProperties.command, 'gpg');
  Assert.deepEqual(socksProperties.args, gpgArgs);
  Assert.equal(socksProperties.envVars.length, 0);
  Assert.equal(properties.useNormal, false);
}));

const torOn9150 = {
  ip: '127.0.0.1',
  port: 9150,
  username: RandomNumberGenerator.getUint32(),
  password: RandomNumberGenerator.getUint32()
};

test(function returnsNothing_whenAbleToFindTorButNotAbleToMakeSocksRequests() {
  const system = {
    findTor: function() {
      return torOn9150;
    },
    findTorExecutableHelper: function() {
      return null;
    },
    isDosLike: function() {
      return false;
    },
    gpgUsesSocksArguments: function() {return false;},
  };

  const properties = torProperties(system);
  Assert.equal(properties, null);
});

test(function shouldCheckDirmngrConfiguration() {
  let dirmngrConfiguredWithTorFunctionWasCalled = false;
  TestHelper.resetting(EnigmailGpg, "dirmngrConfiguredWithTor", function() {
    dirmngrConfiguredWithTorFunctionWasCalled = true;
    return true;
  }, function() {
    const system = {
      findTor: function() {
        return torOn9150;
      },
      findTorExecutableHelper: function() {
        return null;
      },
      gpgUsesSocksArguments: function() { return false; }
    };

    torProperties(system);

    Assert.equal(dirmngrConfiguredWithTorFunctionWasCalled, true, 'dirmngrConfiguredWithTor() was not called');
  });
});

test(function returnsUseNormalTrue_whenUserhasConfiguredDirAuthToUseTor() {
  TestHelper.resetting(EnigmailGpg, "dirmngrConfiguredWithTor", function() { return true; }, function() {
    const system = {
      findTor: function() {
        return torOn9150;
      },
      findTorExecutableHelper: function() {
        return null;
      },
      isDosLike: function() {
        return false;
      },
      gpgUsesSocksArguments: function() { return false; }
    };

    const properties = torProperties(system);
    Assert.equal(properties.useNormal, true);
    Assert.equal(properties.socks, null);
  });
});

function contains(string, substring) {
  return string.indexOf(substring) > -1;
}

test(function testUsingTorsocksWithEnvironmentVariables() {
  const versioning = {
    versionFoundMeetsMinimumVersionRequired: function() {
      return false;
    }
  };

  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function(exe) {
    if(exe === 'torsocks') {
      return {path:'/usr/bin/torsocks'};
    } else {
      return null;
    }
  }, function() {
    const result = findTorExecutableHelper(versioning);
    Assert.equal(result.command.path, '/usr/bin/torsocks');
    Assert.ok(contains(result.envVars[0], 'TORSOCKS_USERNAME'));
    Assert.ok(contains(result.envVars[1], 'TORSOCKS_PASSWORD'));
    Assert.equal(result.args.length, 1);
  });
});

test(function testUsingTorsocksWithCommandArguments() {
  const versioning = {
    versionFoundMeetsMinimumVersionRequired: function() {
      return true;
    }
  };

  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function(exe) {
    if(exe === 'torsocks') {
      return {path:'/usr/bin/torsocks'};
    } else {
      return null;
    }
  }, function() {
    const result = findTorExecutableHelper(versioning);

    Assert.equal(result.command.path, '/usr/bin/torsocks');
    Assert.equal(result.args.length, 5);
    Assert.equal(result.args[0], '--user');
    Assert.equal(result.args[2], '--pass');
    Assert.equal(result.args[4], '/usr/bin/gpg');
  });
});

test(function testUseNothingIfNoTorHelpersAreAvailable() {
  const versioning = {
    findExecutable: function() {
      return null;
    }
  };

  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function(exe) { return null; }, function() {
    const result = findTorExecutableHelper(versioning);
    Assert.equal(findTorExecutableHelper(versioning), null);
  });
});

test(function creatingRandomCredential() {
  Assert.equal(typeof createRandomCredential(), 'string');

  Assert.notEqual(createRandomCredential(), createRandomCredential());
});
