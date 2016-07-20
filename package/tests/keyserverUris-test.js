/*global test:false, component: false, testing: false, Assert: false, do_load_module: false, do_get_cwd: false */
"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global resetting, withEnvironment, withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true */

testing("keyserverUris.jsm"); /*global sortWithHkpsFirst, prioritiseEncryption */
component("enigmail/prefs.jsm"); /*global EnigmailPrefs: false */

function setupKeyserverPrefs(keyservers, autoOn) {
  EnigmailPrefs.setPref("keyserver", keyservers);
  EnigmailPrefs.setPref("autoKeyServerSelection", autoOn);
}

test(function organizeProtocols_withOneHkpsServer() {
  setupKeyserverPrefs("keyserver.1", true);

  const sortedRequests = prioritiseEncryption();

  Assert.equal(sortedRequests[0], 'hkps://keyserver.1:443');
  Assert.equal(sortedRequests[1], 'hkp://keyserver.1:11371');
  Assert.equal(sortedRequests.length, 2);
});

test(function createStatesForMultipleKeyservers() {
  setupKeyserverPrefs("keyserver.1, keyserver.2, keyserver.3", false);

  const sortedRequests = prioritiseEncryption();

  Assert.equal(sortedRequests[0], 'hkps://keyserver.1:443');
  Assert.equal(sortedRequests[1], 'hkps://keyserver.2:443');
  Assert.equal(sortedRequests[2], 'hkps://keyserver.3:443');
  Assert.equal(sortedRequests[3], 'hkp://keyserver.1:11371');
  Assert.equal(sortedRequests[4], 'hkp://keyserver.2:11371');
  Assert.equal(sortedRequests[5], 'hkp://keyserver.3:11371');
  Assert.equal(sortedRequests.length, 6);
});

test(function setsUpStatesWithMixOfSpecifiedProtocols() {
  setupKeyserverPrefs("hkp://keyserver.1, hkps://keyserver.2, keyserver.3, hkps://keyserver.4, ldap://keyserver.5", false);

  const sortedRequests = prioritiseEncryption();

  Assert.equal(sortedRequests[0],'hkps://keyserver.2:443');
  Assert.equal(sortedRequests[1],'hkps://keyserver.3:443');
  Assert.equal(sortedRequests[2],'hkps://keyserver.4:443');
  Assert.equal(sortedRequests[3],'hkp://keyserver.1:11371');
  Assert.equal(sortedRequests[4],'hkp://keyserver.3:11371');
  Assert.equal(sortedRequests[5],'ldap://keyserver.5:389');
});

test(function orderHkpsKeyserversToBeginningOfKeyserverArray() {
  const unorderedKeyservers = [{protocol: "hkp"}, {protocol: "hkps"}, {protocol: "hkps"}];
  const orderedKeyservers = [{protocol: "hkps"}, {protocol: "hkps"}, {protocol: "hkp"}];

  Assert.deepEqual(sortWithHkpsFirst(unorderedKeyservers), orderedKeyservers);
});

test(function shouldUseCorrectCorrespondingHkpsAddressForHkpPoolServers() {
  setupKeyserverPrefs("pool.sks-keyservers.net, keys.gnupg.net, pgp.mit.edu", true);

  const keyserverUris = prioritiseEncryption();

  Assert.equal(keyserverUris.length, 2);
  Assert.equal(keyserverUris[0],'hkps.pool.sks-keyservers.net');
  Assert.equal(keyserverUris[1],'hkp://pool.sks-keyservers.net:11371');
});
