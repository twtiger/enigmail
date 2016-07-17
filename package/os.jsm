/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailOS"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://enigmail/execution.jsm"); /*global EnigmailExecution: false */

const XPCOM_APPINFO = "@mozilla.org/xre/app-info;1";

let operatingSystem = null;
function getOS() {
  if (operatingSystem === null) {
    operatingSystem = Cc[XPCOM_APPINFO].getService(Ci.nsIXULRuntime).OS;
  }
  return operatingSystem;
}

function getLinuxDistribution() {
  const args = ["-a"];
  const exitCodeObj = {value: null};
  const output = EnigmailExecution.resolveAndSimpleExec("uname", args, exitCodeObj, {});
  if (!output || exitCodeObj.value !== 0) {
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

function isDosLike() {
  if (EnigmailOS.isDosLikeVal === undefined) {
    EnigmailOS.isDosLikeVal = (EnigmailOS.getOS() == "WINNT" || EnigmailOS.getOS() == "OS2");
  }
  return EnigmailOS.isDosLikeVal;
}

function isMac() {
  return getOS() === "Darwin";
}

const EnigmailOS = {
  isWin32: (getOS() == "WINNT"),

  getOS: getOS,

  isUbuntu: isUbuntu,

  isDosLike: isDosLike,

  isMac: isMac,

  // get a Windows registry value (string)
  // @ keyPath: the path of the registry (e.g. Software\\GNU\\GnuPG)
  // @ keyName: the name of the key to get (e.g. InstallDir)
  // @ rootKey: HKLM, HKCU, etc. (according to constants in nsIWindowsRegKey)
  getWinRegistryString: function(keyPath, keyName, rootKey) {
    var registry = Cc["@mozilla.org/windows-registry-key;1"].createInstance(Ci.nsIWindowsRegKey);

    var retval = "";
    try {
      registry.open(rootKey, keyPath, registry.ACCESS_READ);
      retval = registry.readStringValue(keyName);
      registry.close();
    }
    catch (ex) {}

    return retval;
  }
};
