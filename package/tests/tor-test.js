/*global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert: false, component: false, Cc: false, Ci: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false */

testing("tor.jsm"); /*global EnigmailTor, connect: true, canUseTor: false, TOR_IP_ADDR_PREF: false, TOR_IP_PORT_PREF: false */
component("enigmail/log.jsm"); /* global EnigmailLog: false */
component("enigmail/prefs.jsm"); /* global EnigmailPrefs: false */

let threadManager = null;
function currentThread() {
  if (threadManager === null) {
    threadManager = Cc['@mozilla.org/thread-manager;1'].getService(Ci.nsIThreadManager);
  }
  return threadManager.currentThread;
}

function resetTorCheckFlags() {
  EnigmailTor.torIsAvailable = false;
  EnigmailTor.doneCheckingTor = false;
}

function setupTorPreferences() {
  EnigmailPrefs.setPref(TOR_IP_ADDR_PREF, TOR_IP_FOR_TESTS);
  EnigmailPrefs.setPref(TOR_IP_PORT_PREF, TOR_IP_PORT_FOR_TESTS);
}

const TOR_IP_FOR_TESTS = "127.0.0.1";
const TOR_IP_PORT_FOR_TESTS = 9050;

test(function testConnectingToTor() {
  setupTorPreferences();

  canUseTor();
  while(!EnigmailTor.doneCheckingTor) currentThread().processNextEvent(true);

  Assert.ok(EnigmailTor.torIsAvailable, "Tor is not available on " + TOR_IP_FOR_TESTS + ":" + TOR_IP_PORT_FOR_TESTS);
  resetTorCheckFlags();
});

test(function testConnectingToTorFails() {
  const portWithoutTor = 9999;
  EnigmailPrefs.setPref(TOR_IP_ADDR_PREF, TOR_IP_FOR_TESTS);
  EnigmailPrefs.setPref(TOR_IP_PORT_PREF, portWithoutTor);

  canUseTor();
  while(!EnigmailTor.doneCheckingTor) currentThread().processNextEvent(true);

  Assert.ok(!EnigmailTor.torIsAvailable, "Tor should not be available on port " + portWithoutTor);
  resetTorCheckFlags();
});

test(function testBuildGpgArgumentsForTorProxy() {
  setupTorPreferences();

  let torRequests = EnigmailTor.buildGpgProxyArguments();

  Assert.equal(torRequests[0], "--keyserver-options");
  Assert.ok(torRequests[1].indexOf("http-proxy=socks5h://") > -1);
});

function getUsername(thing) {
  return thing[1].split("http-proxy=socks5h://")[1].split(":")[0];
}

function getPassword(thing) {
  return thing[1].split("http-proxy=socks5h://")[1].split(":")[1].split("@")[0];
}

test(function createRandomUsernameAndPassword() {
  setupTorPreferences();

  let firstRequest = EnigmailTor.buildGpgProxyArguments();
  let secondRequest = EnigmailTor.buildGpgProxyArguments();

  Assert.ok(getUsername(firstRequest) !== getUsername(secondRequest));
  Assert.ok(getUsername(firstRequest) !== getPassword(secondRequest));
});
