/*global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert: false, component: false, Cc: false, Ci: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false */

testing("tor.jsm"); /*global EnigmailTor, connect: true, canUseTor: false, checkTorExists: false, TOR_IP_ADDR_PREF: false, TOR_SERVICE_PORT_PREF: false, TOR_BROWSER_BUNDLE_PORT_PREF:false, currentThread:false, KEYSERVER_OPTION_FOR_CURL_7_21_7: false */
component("enigmail/log.jsm"); /* global EnigmailLog: false */
component("enigmail/prefs.jsm"); /* global EnigmailPrefs: false */

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

  Assert.ok(canUseTor(EnigmailTor.MINIMUM_CURL_VERSION), "Tor should be available in the TOR_IP_FOR_TESTS:TOR_BROWSER_BUNDLE_PORT_PREF");
});

test(function testCheckForTorInServicePort() {
  setupGoodPortInTorServicePref();

  Assert.ok(canUseTor(EnigmailTor.MINIMUM_CURL_VERSION), "Tor is not available on " + TOR_IP_FOR_TESTS + ":" + GOOD_TOR_PORT_FOR_TEST);
});

test(function testConnectingToTorFails() {
  const portWithoutTor = 9999;
  EnigmailPrefs.setPref(TOR_IP_ADDR_PREF, TOR_IP_FOR_TESTS);
  EnigmailPrefs.setPref(TOR_SERVICE_PORT_PREF, portWithoutTor);

  Assert.ok(!canUseTor(EnigmailTor.MINIMUM_CURL_VERSION), "Tor should not be available on port " + portWithoutTor);
});

test(function checksForMinimumCurl() {
  const absurdlyHighCurlRequirement = {
    main: 100,
    release: 100,
    patch: 100
  };
  Assert.ok(!canUseTor(absurdlyHighCurlRequirement));
});

test(function testBuildGpgArgumentsForTorProxy() {
  setupGoodPortInTorServicePref();

  const torRequests = EnigmailTor.buildGpgProxyArguments();

  Assert.equal(torRequests[0], "--keyserver-options");
  Assert.ok(torRequests[1].indexOf(KEYSERVER_OPTION_FOR_CURL_7_21_7) > -1);
});

function getUsername(thing) {
  return thing[1].split(KEYSERVER_OPTION_FOR_CURL_7_21_7)[1].split(":")[0];
}

function getPassword(thing) {
  return thing[1].split(KEYSERVER_OPTION_FOR_CURL_7_21_7)[1].split(":")[1].split("@")[0];
}

test(function createRandomUsernameAndPassword() {
  setupGoodPortInTorServicePref();

  const firstRequest = EnigmailTor.buildGpgProxyArguments();
  const secondRequest = EnigmailTor.buildGpgProxyArguments();

  Assert.ok(getUsername(firstRequest) !== getUsername(secondRequest));
  Assert.ok(getUsername(firstRequest) !== getPassword(secondRequest));
});
