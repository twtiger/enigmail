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

function createVersionRequest() {
  const command = ["curl"];
  const args = ["--version"];

  const request = {
    command: EnigmailFiles.resolvePath("curl", environment().get("PATH"), EnigmailOS.isDosLike()),
    arguments: args,
    done: function(result) {
      exitCode = result.exitCode;
      stdout = result.stdout;
      stderr = result.stderr;
    }
  };

  return request;
}

function curlVersionOver(main, release, patch ) {
  let request = createVersionRequest();

  subprocess.call(request).wait();

  let versionTotal = stdout.split(" ")[1];
  EnigmailLog.DEBUG("Curl Version Found: " + versionTotal + "\n");

  let versionParts = versionTotal.split(".");

  if (versionParts[0] > main) {
    return true;
  } else if (versionParts[0] == main) {
    if (versionParts[1] > release) {
      EnigmailLog.DEBUG("I MADE IT!\n");
      return true;
    } else if (versionParts[1] == release) {
      if (versionParts[2] >= patch) return true;
      else return false;
    }
  }

  EnigmailLog.DEBUG("What.\n");
  return false;
}
