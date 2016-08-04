/*global testing: false, do_load_module: false, do_get_cwd: false, test: false, Assert:false, component: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false */

testing("versioning.jsm"); /*global EnigmailVersioning: false, versionGreaterOrEqual: false, createVersionRequest:false, versionFoundMeetsMinimumVersionRequired:false  */
component("enigmail/log.jsm"); /*global EnigmailLog:false, Components:false, Cc: false, Ci: false, parseVersion: false  */
component("enigmail/files.jsm"); /*global EnigmailFiles:false */

test(function checkCurlVersionIsOver() {
  const minimumCurlVersion = "7.21.7";
  Assert.equal(versionFoundMeetsMinimumVersionRequired("curl", minimumCurlVersion), true);
});

test(function checkCurlVersionIsLess() {
  const absurdlyHighCurlRequirement = "100.100.100";
  Assert.equal(versionFoundMeetsMinimumVersionRequired("curl", absurdlyHighCurlRequirement), false);
});

test(function versionIsGreaterOrEqual() {
  Assert.equal(versionGreaterOrEqual("7.12", "7.30"), false);
  Assert.equal(versionGreaterOrEqual("7.12", "7.12"), true);
  Assert.equal(versionGreaterOrEqual("7.12", "7.1"), true);
});

test(function gpgNotOverOrEqual() {
  const minimum = "2.0.30";
  Assert.equal(versionFoundMeetsMinimumVersionRequired("gpg", minimum), false);
});
