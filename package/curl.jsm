/*global Components: false, unescape: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


"use strict";

var EXPORTED_SYMBOLS = ["Curl"];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

Cu.import("resource://enigmail/subprocess.jsm"); /*global subprocess: false */
Cu.import("resource://enigmail/files.jsm"); /*global EnigmailFiles: false */
Cu.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */
Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */

let stderr = "";
let stdout = "";
let exitCode = -1;
let numericBase = 10;

let env = null;
function environment() {
  if (env === null)
    env = Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);
  return env;
}

function createVersionRequest(os) {
  const command = ["curl"];
  const args = ["--version"];
  let isDosLike = false;

  if (os == "WINNT" || os == "OS2") {
    isDosLike = false;
  }

  const request = {
    command: EnigmailFiles.resolvePath("curl", environment().get("PATH"), isDosLike),
    arguments: args,
    done: function(result) {
      exitCode = result.exitCode;
      stdout = result.stdout;
      stderr = result.stderr;
    }
  };

  return request;
}

function parseVersion(curlResponse) {
  let curlVersionParts = curlResponse.split(".");
  let parsedVersion = [];
  for (let i=0; i < curlVersionParts.length; i++) {
    parsedVersion[i] = parseInt(curlVersionParts[i], numericBase);
  }
  if (curlVersionParts.length === 1) {
    parsedVersion[1] = 0;
    parsedVersion[2] = 0;
  }
  if (curlVersionParts.length === 2) {
    parsedVersion[2] = 0;
  }

  return {
    main: parsedVersion[0],
    release: parsedVersion[1],
    patch: parsedVersion[2]
  };
}

function versionOver(minimumVersion, os) {
  let request = createVersionRequest(os);

  subprocess.call(request).wait();

  let versionResponse = stdout.split(" ")[1];
  EnigmailLog.DEBUG("Curl Version Found: " + versionResponse + "\n");

  let currentVersion = parseVersion(versionResponse);
  if (currentVersion.main > minimumVersion.main) {
    return true;
  } else if (currentVersion.main === minimumVersion.main) {
    if (currentVersion.release > minimumVersion.release) {
      return true;
    } else if (currentVersion.release === minimumVersion.release) {
      if (currentVersion.patch >= minimumVersion.patch) return true;
      else return false;
    }
  }
  EnigmailLog.DEBUG("HELLO!\n");
  return false;
}

const Curl = {
  versionOver: versionOver
};
