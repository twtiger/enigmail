/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


"use strict";

const EXPORTED_SYMBOLS = ["ExecutableEvaluator"];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

Cu.import("resource://enigmail/subprocess.jsm"); /*global subprocess: false */
Cu.import("resource://enigmail/files.jsm"); /*global EnigmailFiles: false */
Cu.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */
Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Cu.import("resource://enigmail/gpg.jsm"); /*global EnigmailGpg: false */

const VERSION_NUMERIC_BASE = 10;

let env = null;
function environment() {
  if (env === null) {
    env = Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);
  }
  return env;
}

function createVersionRequest(file) {
  const args = ["--version"];
  const r = {
    stderr: "",
    stdout: "",
    exitCode: -1
  };

  return [r, {
    command: file,
    arguments: args,
    done: function(result) {
      r.exitCode = result.exitCode;
      r.stdout = result.stdout;
      r.stderr = result.stderr;
    }
  }];
}

function parseVersion(systemResponse) {
  const versionParts = systemResponse.split(".");
  const parsedVersion = [0,0,0];
  for (let i=0; i < versionParts.length; i++) {
    parsedVersion[i] = parseInt(versionParts[i], VERSION_NUMERIC_BASE);
  }
  return {
    // Defaults to major, minor, patch for consistency across many executables
    major: parsedVersion[0],
    minor: parsedVersion[1],
    patch: parsedVersion[2]
  };
}

function versionGreaterThanOrEqual(left, right) {
  if (left.major > right.major) {
    return true;
  } else if (left.major === right.major) {
    return left.minor > right.minor ||
      ((left.minor === right.minor) &&
        left.patch >= right.patch);
  }
  return false;
}

const executor = {
  callAndWait: function(request) {
    subprocess.call(request).wait();
  },
  findExecutable: function(executable) {
    return EnigmailFiles.resolvePath(executable, environment().get("PATH"), EnigmailOS.isDosLike());
  },
  gpgVersionOverOrEqual: function(agentVersion, minimumVersion) {
    return versionGreaterThanOrEqual(parseVersion(agentVersion), minimumVersion);
  }
};

function exists(executable) {
  return EnigmailFiles.resolvePath(executable, environment().get("PATH"), EnigmailOS.isDosLike() !== null);
}

function versionOverOrEqual(executable, minimumVersion, executor) {
  if (executable === 'gpg') return executor.gpgVersionOverOrEqual(EnigmailGpg.agentVersion, minimumVersion);
  if (!exists(executable)) return false;

  const file = executor.findExecutable(executable);
  const requestAndResult = createVersionRequest(file);
  const result = requestAndResult[0];
  const request = requestAndResult[1];

  executor.callAndWait(request);

  const versionResponse = result.stdout.split(" ")[1];
  EnigmailLog.DEBUG(executable + " version found: " + versionResponse + "\n");

  return versionGreaterThanOrEqual(parseVersion(versionResponse), minimumVersion);
}

const ExecutableEvaluator = {
  executor: executor,
  versionOverOrEqual: versionOverOrEqual,
  exists: exists
};
