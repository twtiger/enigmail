/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


"use strict";

const EXPORTED_SYMBOLS = ["ExecutableCheck"];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

Cu.import("resource://enigmail/subprocess.jsm"); /*global subprocess: false */
Cu.import("resource://enigmail/files.jsm"); /*global EnigmailFiles: false */
Cu.import("resource://enigmail/lazy.jsm"); /*global EnigmailLazy: false */
Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Cu.import("resource://enigmail/execution.jsm"); /*global EnigmailExecution: false */
const loadOS = EnigmailLazy.loader("enigmail/os.jsm", "EnigmailOS");

let env = null;
function environment() {
  if (env === null) {
    env = Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);
  }
  return env;
}

function parseVersion(systemResponse) {
  const versionParts = systemResponse.split(".");
  const parsedVersion = [0,0,0];
  for (let i=0; i < versionParts.length; i++) {
    parsedVersion[i] = parseInt(versionParts[i], 10);
  }
  return {
    // Defaults to major, minor, patch for consistency across many executables
    major: parsedVersion[0],
    minor: parsedVersion[1],
    patch: parsedVersion[2]
  };
}

function compareVersionParts(left, right) {
  if (left.major > right.major) {
    return true;
  } else if (left.major === right.major) {
    return left.minor > right.minor ||
      ((left.minor === right.minor) &&
        left.patch >= right.patch);
  }
  return false;
}

function potentialWindowsExecutable(execName) {
  if (loadOS().isWin32) {
    return execName + ".exe";
  }
  return execName;
}

function versionFoundMeetsMinimumVersionRequired(executable, minimumVersion) {
  const command = EnigmailFiles.simpleResolvePath(executable);
  if (!command) {
    EnigmailLog.DEBUG("executable not found: " + executable + "\n");
    return false;
  }

  const args = ["--version"];
  const exitCodeObj  = {value: null};
  const stdout = EnigmailExecution.simpleExecCmd(command, args, exitCodeObj, {});

  if (exitCodeObj.value === -1) return false;

  const m = stdout.match(/\b(\d+\.\d+\.\d+)\b/);
  if (m) {
    const versionResponse = m[1];
    EnigmailLog.DEBUG(executable + " version found: " + versionResponse + "\n");

    return compareVersionParts(parseVersion(versionResponse), minimumVersion);
  }

  EnigmailLog.DEBUG("couldn't find a version in the output from " + executable + " - total output: " + stdout + "\n");
  return false;
}

function compareVersions(versionString, minimum) {
  return compareVersionParts(parseVersion(versionString), minimum);
}

const ExecutableCheck = {
  versionFoundMeetsMinimumVersionRequired: versionFoundMeetsMinimumVersionRequired,
  compareVersions: compareVersions,
};
