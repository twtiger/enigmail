/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


"use strict";

const EXPORTED_SYMBOLS = ["Versioning"];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

Cu.import("resource://enigmail/files.jsm"); /*global EnigmailFiles: false */
Cu.import("resource://enigmail/lazy.jsm"); /*global EnigmailLazy: false */
Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Cu.import("resource://enigmail/execution.jsm"); /*global EnigmailExecution: false */

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

function getVersion(stdout, executable) {
  const m = stdout.match(/\b(\d+\.\d+\.\d+)\b/);
  if (m) {
    const versionResponse = m[1];

    EnigmailLog.DEBUG(executable + " version found: " + versionResponse + "\n");

    return parseVersion(versionResponse);
  } else {
    return null;
  }
}

function versionFoundMeetsMinimumVersionRequired(executable, minimumVersion) {
  const args = ["--version"];
  const exitCodeObj = {value: null};
  const stdout = EnigmailExecution.resolveAndSimpleExec(executable, args, exitCodeObj, {});
  if (!stdout || exitCodeObj.value < 0) {
    EnigmailLog.DEBUG("executable not found: " + executable + "\n");
    return false;
  }

  const version = getVersion(stdout, executable);
  if (!version) {
    EnigmailLog.DEBUG("couldn't find a version in the output from " + executable + " - total output: " + stdout + "\n");
    return false;
  }

  return compareVersionParts(version, minimumVersion);
}

function versionMeetsMinimum(versionString, minimum) {
  return compareVersionParts(parseVersion(versionString), minimum);
}

const Versioning = {
  versionFoundMeetsMinimumVersionRequired: versionFoundMeetsMinimumVersionRequired,
  versionMeetsMinimum: versionMeetsMinimum,
};
