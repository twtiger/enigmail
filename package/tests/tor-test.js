/*global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert:false, component: false, Cc: false, Ci: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global assertContains: false, withEnigmail: false, withTestGpgHome: false */

testing("tor.jsm"); /*global EnigmailTor: false, connect: true, torIsAvailable: false, checkTorExists: false, TOR_IP_ADDR_PREF: false, TOR_SERVICE_PORT_PREF: false, TOR_BROWSER_BUNDLE_PORT_PREF:false, currentThread:false, HTTP_PROXY_GPG_OPTION: false, OLD_CURL_PROTOCOL:false, NEW_CURL_PROTOCOL:false, MINIMUM_WINDOWS_GPG_VERSION:false, userWantsActionOverTor:false, userRequiresTor:false, nsIEnigmail:false */
component("enigmail/log.jsm"); /* global EnigmailLog: false */
component("enigmail/prefs.jsm"); /* global EnigmailPrefs: false, REFRESH_KEY_PREF:false, DOWNLOAD_KEY_PREF:false, SEARCH_KEY_REQUIRED_PREF:false */

const TOR_IP_FOR_TESTS = "127.0.0.1";
const GOOD_TOR_PORT_FOR_TEST = 9050;
const PORT_WITHOUT_TOR = 9876;

function setupGoodPortInTorServicePref() {
  EnigmailPrefs.setPref(TOR_IP_ADDR_PREF, TOR_IP_FOR_TESTS);
  EnigmailPrefs.setPref(TOR_SERVICE_PORT_PREF, GOOD_TOR_PORT_FOR_TEST);
  EnigmailPrefs.setPref(TOR_BROWSER_BUNDLE_PORT_PREF, PORT_WITHOUT_TOR);
}

function setupGoodPortInBrowserBundlePref() {
  EnigmailPrefs.setPref(TOR_IP_ADDR_PREF, TOR_IP_FOR_TESTS);
  EnigmailPrefs.setPref(TOR_SERVICE_PORT_PREF, PORT_WITHOUT_TOR);
  EnigmailPrefs.setPref(TOR_BROWSER_BUNDLE_PORT_PREF, GOOD_TOR_PORT_FOR_TEST);
}

test(function testCheckTorBrowserBundlePortForTor() {
  setupGoodPortInBrowserBundlePref();
  const executableChecker = {
    exists: function(executable) { return false; },
    versionOverOrEqual: function(executable, minimum) { return true; }
  };

  const response = torIsAvailable("Linux", executableChecker);

  Assert.equal(response.status, true, "Tor should be available in the TOR_IP_FOR_TESTS:TOR_BROWSER_BUNDLE_PORT_PREF");
  Assert.equal(response.type, 'gpg-proxy');
  Assert.equal(response.port_pref, TOR_BROWSER_BUNDLE_PORT_PREF);
});

test(function testCheckForTorInServicePort() {
  setupGoodPortInTorServicePref();
  const executableChecker = {
    exists: function(executable) { return false; },
    versionOverOrEqual: function(executable, minimum) { return true; }
  };

  const response = torIsAvailable("Linux", executableChecker);

  Assert.equal(response.status, true, "Tor is not available on " + TOR_IP_FOR_TESTS + ":" + GOOD_TOR_PORT_FOR_TEST);
  Assert.equal(response.type, 'gpg-proxy');
  Assert.equal(response.port_pref, TOR_SERVICE_PORT_PREF);
});

test(function testConnectingToTorFails() {
  const portWithoutTor = 9999;
  EnigmailPrefs.setPref(TOR_IP_ADDR_PREF, TOR_IP_FOR_TESTS);
  EnigmailPrefs.setPref(TOR_SERVICE_PORT_PREF, portWithoutTor);
  const executableChecker = {
    exists: function(executable) { return false; },
    versionOverOrEqual: function(executable, minimum) { return true; }
  };

  const response = torIsAvailable("Linux", executableChecker);

  Assert.equal(response.status, false);
});

test(function checkEqualToMinimumGpgVersionInWindows() {
  setupGoodPortInTorServicePref();
  const executableChecker = {
    exists: function(executable) { return false; },
    versionOverOrEqual: function(executable, minimum) { return true; }
  };

  const response = torIsAvailable("WINNT", executableChecker);

  Assert.equal(response.status, true);
  Assert.equal(response.type, 'gpg-proxy');
  Assert.equal(response.port_pref, TOR_SERVICE_PORT_PREF);
});

test(function checkLessThanMinimumGpgVersionInWindows() {
  const executableChecker = {
    exists: function(executable) { return false; },
    versionOverOrEqual: function(executable, minimum) { return false; }
  };

  const response = torIsAvailable("OS2", executableChecker);

  Assert.equal(response.status, false);
});

test(function checkForTorsocks() {
  setupGoodPortInTorServicePref();
  const executableChecker = {
    exists: function(executable) { return executable === 'torsocks'; }
  };

  const response = torIsAvailable("Linux", executableChecker);

  Assert.equal(response.status, true);
  Assert.equal(response.type, 'torsocks');
});

function setupBadPorts() {
  EnigmailPrefs.setPref(TOR_IP_ADDR_PREF, TOR_IP_FOR_TESTS);
  EnigmailPrefs.setPref(TOR_SERVICE_PORT_PREF, PORT_WITHOUT_TOR);
  EnigmailPrefs.setPref(TOR_BROWSER_BUNDLE_PORT_PREF, PORT_WITHOUT_TOR);
}

test(function cannotUseTorWhenTorsocksExistsButTorNotSetup() {
  setupBadPorts();
  const executableChecker = {
    exists: function(executable) { return true; }
  };

  const response = torIsAvailable("Linux", executableChecker);

  Assert.equal(response.status, false);
});

test(function buildArgumentsForTorsocks() {
  const type = { type: 'torsocks', };

  const torArguments = EnigmailTor.buildGpgProxyArguments(type, "Linux");

  Assert.equal(torArguments[0], "torsocks");
  Assert.equal(torArguments[1], "--user");
  Assert.equal(torArguments[3], "--pass");
  Assert.equal(torArguments.length, 5);
});

test(function testBuildGpgArgumentsForTorProxy() {
  const type = { type: 'gpg-proxy', port_pref: TOR_SERVICE_PORT_PREF };

  const torArguments = EnigmailTor.buildGpgProxyArguments(type, "Linux");

  Assert.equal(torArguments[0], "--keyserver-options");
  Assert.assertContains(torArguments[1], HTTP_PROXY_GPG_OPTION+NEW_CURL_PROTOCOL);
});

function getUsername(thing) {
  return thing[1].split(HTTP_PROXY_GPG_OPTION+NEW_CURL_PROTOCOL)[1].split(":")[0];
}

function getPassword(thing) {
  return thing[1].split(HTTP_PROXY_GPG_OPTION+NEW_CURL_PROTOCOL)[1].split(":")[1].split("@")[0];
}

test(function createRandomUsernameAndPassword() {
  const type = { type: 'gpg-proxy', port_pref: TOR_SERVICE_PORT_PREF };

  const firstRequest = EnigmailTor.buildGpgProxyArguments(type, "Linux");
  const secondRequest = EnigmailTor.buildGpgProxyArguments(type, "Linux");

  Assert.ok(getUsername(firstRequest) !== getUsername(secondRequest));
  Assert.ok(getUsername(firstRequest) !== getPassword(secondRequest));
});

test(function buildGpgProxyArgumentsForWindows() {
  const type = { type: 'gpg-proxy', port_pref: TOR_SERVICE_PORT_PREF };

  const torArguments = EnigmailTor.buildGpgProxyArguments(type, "OS2");

  Assert.equal(torArguments[0], "--keyserver-options");
  Assert.assertContains(torArguments[1], HTTP_PROXY_GPG_OPTION+OLD_CURL_PROTOCOL);
});

test(function buildGpgProxyArgumentsFor32bitWindows() {
  const type = { type: 'gpg-proxy', port_pref: TOR_SERVICE_PORT_PREF };

  const torArguments = EnigmailTor.buildGpgProxyArguments(type, "WINNT");

  Assert.equal(torArguments[0], "--keyserver-options");
  Assert.assertContains(torArguments[1], HTTP_PROXY_GPG_OPTION+OLD_CURL_PROTOCOL);
});

test(function actionCanHaveTor() {
  EnigmailPrefs.setPref(DOWNLOAD_KEY_PREF, true);
  const actionFlags = nsIEnigmail.DOWNLOAD_KEY;
  Assert.equal(userWantsActionOverTor(actionFlags), true);
});

test(function actionCannotHaveTor() {
  EnigmailPrefs.setPref(REFRESH_KEY_PREF, false);
  const actionFlags = nsIEnigmail.REFRESH_KEY;
  Assert.equal(userWantsActionOverTor(actionFlags), false);
});

test(function actionMustUseTor() {
  EnigmailPrefs.setPref(SEARCH_KEY_REQUIRED_PREF, false);
  const actionFlags = nsIEnigmail.SEARCH_KEY;
  Assert.equal(userRequiresTor(actionFlags), false);
});
