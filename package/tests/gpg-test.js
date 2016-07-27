/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false */
/*global TestHelper: false, withEnvironment: false, nsIWindowsRegKey: true */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js");
/*global TestHelper: false, withEnvironment: false, withEnigmail: false, component: false, withTestGpgHome: false, osUtils: false */

testing("gpg.jsm"); /*global lazyEnv: true, EnigmailGpg: false, usesDirmngr: false, getLibcurlDependencyPath: false, usesLibcurl: false, dirmngrConfiguredWithTor: false */
component("enigmail/execution.jsm"); /*global EnigmailExecution: false */
component("enigmail/subprocess.jsm"); /*global subprocess: false */
component("enigmail/files.jsm"); /*global EnigmailFiles: false */
component("enigmail/osDistribution.jsm"); /*global EnigmailOSDistribution: false */
component("enigmail/gpgAgent.jsm"); /*global EnigmailGpgAgent: false */

test(function getLibcurlDependencyPathForGpg() {
  const origPath = "/start/middle/gpg";
  const expectedParentPath = "/start/lib/gnupg/gpgkeys_curl";

  const actualParentPath = getLibcurlDependencyPath(origPath);
  Assert.equal(actualParentPath.path, expectedParentPath);
});

test(function getLibcurlDependencyPathForGpgReturnsNullIfPathIsNull() {
  const actualPath = getLibcurlDependencyPath(null);
  Assert.equal(actualPath, null);
});

function withStubFormatCmdLine(f) {
  return function() {
    TestHelper.resetting(EnigmailFiles, "formatCmdLine", function(executable) {
      return "";
    }, function() {
      f();
    });
  };
}

test(withStubFormatCmdLine(function shouldUseResolveAndSimpleExecWhenCheckingDirmngrConfiguration() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function(executable) {
    Assert.equal(executable, "gpg-connect-agent");
    return;
  }, function() {
    TestHelper.resetting(subprocess, "call", function(subprocObj) {
      return {
        wait: function() {}
      };
    }, function() {
      dirmngrConfiguredWithTor();
    });
  });
}));

test(withStubFormatCmdLine(function returnsTrueWhenConfiguredToUseTor() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function(executable) {
    return { path: "/usr/bin/gpg-connect-agent" };
  }, function() {
    TestHelper.resetting(subprocess, "call", function(subprocObj) {
      subprocObj.stdout("OK - Tor mode is enabled\n OK closing connection\n");
      subprocObj.done({ exitCode: 0 });
      return {
        wait: function() {}
      };
    }, function() {

      Assert.equal(dirmngrConfiguredWithTor(), true);
    });
  });
}));

test(withStubFormatCmdLine(function returnsFalseWhenNotConfiguredToUseTor() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function(executable) {
    return { path: "/usr/bin/gpg-connect-agent" };
  }, function() {
    TestHelper.resetting(subprocess, "call", function(subprocObj) {
      subprocObj.stdout("OK - Tor mode is NOT enabled\n OK closing connection\n");
      subprocObj.done({exitCode: 0});
      return {
        wait: function() {}
      };
    }, function() {

      Assert.equal(dirmngrConfiguredWithTor(), false);
    });
  });
}));

test(withStubFormatCmdLine(function returnsFalseWhenGpgConnectAgentPathIsNotFound() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function(executable) {
    return null;
  }, function() {

    Assert.equal(dirmngrConfiguredWithTor(), false);
  });
}));

test(withStubFormatCmdLine(function returnsFalseWhenExitCodeIndicatesErrorInExecution() {
  TestHelper.resetting(EnigmailFiles, "simpleResolvePath", function(executable) {
    return { path: "/usr/bin/gpg-connect-agent" };
  }, function() {
    TestHelper.resetting(subprocess, "call", function(subprocObj) {
      subprocObj.stdout("");
      subprocObj.done();
      return {
        wait: function() {}
      };
    }, function() {

      Assert.equal(dirmngrConfiguredWithTor(), false);
    });
  });
}));

test(function testIfVersionOfGpgHasDirmngr() {
  TestHelper.resetting(EnigmailGpg, "agentVersion", "2.1.7", function() {
    const usesDirmngr = EnigmailGpg.usesDirmngr();
    Assert.equal(usesDirmngr, true);
  });
});

test(function testIfVersionOfGpgDoesNotHaveDirmngr() {
  TestHelper.resetting(EnigmailGpg, "agentVersion", "2.0.30", function() {
    const usesDirmngr = EnigmailGpg.usesDirmngr();
    Assert.equal(usesDirmngr, false);
  });
});

test(function usesLibcurlReturnsTrueForNonUbuntuSystems() {
  TestHelper.resetting(EnigmailOSDistribution, "isUbuntu", function() {
    return false;
  }, function() {
    const output = usesLibcurl();
    Assert.equal(output, true);
  });
});

function withGpgPath(f) {
  return function() {
    const path = EnigmailGpg.agentPath;
    EnigmailGpg.setAgentPath({path: "/usr/bin/gpg2"});
    try {
      f();
    } finally {
    EnigmailGpg.setAgentPath({path: path});
    }
  };
}

test(withGpgPath(function usesLibcurlReturnsTrueForUbuntuSystemsThatSupportLibcurl() {
  TestHelper.resetting(EnigmailOSDistribution, "isUbuntu", function() {
    return true;
  }, function() {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(command, args, exitCodeObj) {
      exitCodeObj.value = 0;
      return "version: libcurl";
    }, function() {
      const output = usesLibcurl();
      Assert.equal(output, true);
    });
  });
}));

test(withGpgPath(function usesLibcurlReturnsFalseForUbuntuSystemsThatDoNotSupportLibcurl() {
  TestHelper.resetting(EnigmailOSDistribution, "isUbuntu", function() {
    return true;
  }, function() {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(command, args, exitCodeObj) {
      exitCodeObj.value = 0;
      return "version: curl shim";
    }, function() {
      const output = usesLibcurl();
      Assert.equal(output, false);
    });
  });
}));

test(withGpgPath(function usesLibcurlReturnsFalseWhenError() {
  TestHelper.resetting(EnigmailOSDistribution, "isUbuntu", function() {
    return true;
  }, function() {
    TestHelper.resetting(EnigmailExecution, "simpleExecCmd", function(command, args, exitCodeObj) {
      exitCodeObj.value = -1;
      return {};
    }, function() {
      const output = usesLibcurl();
      Assert.equal(output, false);
    });
  });
}));
