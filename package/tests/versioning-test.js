/*global testing: false, do_load_module: false, do_get_cwd: false, test: false, Assert:false, component: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false */

testing("versioning.jsm"); /*global EnigmailVersioning: false, createVersionRequest:false, versionFoundMeetsMinimumVersionRequired:false  */
component("enigmail/log.jsm"); /*global EnigmailLog:false, Components:false, Cc: false, Ci: false, parseVersion: false  */
component("enigmail/files.jsm"); /*global EnigmailFiles:false */

test(function checkCurlVersionIsOver() {
  const minimumCurlVersion = { major: 7, minor: 21, patch: 7 };
  Assert.equal(versionFoundMeetsMinimumVersionRequired("curl", minimumCurlVersion), true);
});

test(function checkCurlVersionIsLess() {
  const absurdlyHighCurlRequirement = { major: 100, minor: 100, patch: 100 };
  Assert.equal(versionFoundMeetsMinimumVersionRequired("curl", absurdlyHighCurlRequirement), false);
});

test(function parseFullVersionResponse() {
  const response = "10.12.5";
  const expectedParsedVersion = { major: 10, minor: 12, patch: 5 };
  Assert.deepEqual(parseVersion(response), expectedParsedVersion);
});

test(function parseMajorMinorResponse() {
  const response = "7.12";
  const expectedParsedVersion = { major: 7, minor: 12, patch: 0 };
  Assert.deepEqual(parseVersion(response), expectedParsedVersion);
});

test(function parseMajorOnlyResponse() {
  const response = "6";
  const expectedParsedVersion = { major: 6, minor: 0, patch: 0 };
  Assert.deepEqual(parseVersion(response), expectedParsedVersion);
});

test(function gpgNotOverOrEqual() {
  const minimum = { major: 2, minor: 0, patch: 30 };
  Assert.equal(versionFoundMeetsMinimumVersionRequired("gpg", minimum), false);
});
