/*global Components: false, unescape: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


"use strict";

const EXPORTED_SYMBOLS = ["Curl"];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

Cu.import("resource://enigmail/subprocess.jsm"); /*global subprocess: false */
Cu.import("resource://enigmail/files.jsm"); /*global EnigmailFiles: false */
Cu.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */
Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */

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

function parseVersion(curlResponse) {
  const curlVersionParts = curlResponse.split(".");
  const parsedVersion = [0,0,0];
  for (let i=0; i < curlVersionParts.length; i++) {
    parsedVersion[i] = parseInt(curlVersionParts[i], VERSION_NUMERIC_BASE);
  }

  return {
    main: parsedVersion[0],
    release: parsedVersion[1],
    patch: parsedVersion[2]
  };
}

function executableExists(file){
  return file !== null;
}

function versionGreaterThanOrEqual(left, right) {
  if (left.main > right.main) {
    return true;
  } else if (left.main === right.main) {
    return left.release > right.release ||
      ((left.release === right.release) &&
        left.patch >= right.patch);
  }
  return false;

}

function versionOver(minimumVersion) {
  const file = EnigmailFiles.resolvePath("curl", environment().get("PATH"), EnigmailOS.isDosLike());
  if (!executableExists(file)) return false;

  const requestAndResult = createVersionRequest(file);
  const result = requestAndResult[0];
  const request = requestAndResult[1];

  subprocess.call(request).wait();

  const versionResponse = result.stdout.split(" ")[1];
  EnigmailLog.WRITE("Curl Version Found: " + versionResponse + "\n");

  return versionGreaterThanOrEqual(parseVersion(versionResponse), minimumVersion);
}

const Curl = {
  versionOver: versionOver
};
