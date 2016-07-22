/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const EXPORTED_SYMBOLS = ["EnigmailOSDistribution"];

const Cu = Components.utils;

Cu.import("resource://enigmail/execution.jsm"); /*global EnigmailExecution: false */
Cu.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */

function getLinuxDistribution() {
  const args = ["-a"];
  const exitCodeObj = {value: null};
  const output = EnigmailExecution.resolveAndSimpleExec("uname", args, exitCodeObj, {});
  if (!output || exitCodeObj.value < 0) {
    return null;
  }
  return output;
}

function isUbuntu() {
  if (EnigmailOS.isDosLike()) {
    return false;
  }
  const distro = getLinuxDistribution();
  if (distro === null) {
    return null;
  }
  return distro.indexOf("ubuntu") > -1;
}

const EnigmailOSDistribution = {
  isUbuntu: isUbuntu
};
