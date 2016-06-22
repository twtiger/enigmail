/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false */
/*global Components: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false, component: false, Cc: false, Ci: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true, assertLogContains: false, withLogFiles: false */

Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */

testing("refreshWarrior.jsm"); /*global machine: false, createAllStates:false, nsIEnigmail: false, buildKeyRequest: false, getKeyserversFrom:false, buildListener: false, submitRequest: false */

function importKey() {
  const tigerKey = do_get_file("resources/dev-tiger.asc", false);
  EnigmailKeyRing.importKeyFromFile(tigerKey, {}, {});
  return EnigmailKeyRing.getAllKeys().keyList[0];
}

test(withTestGpgHome(withEnigmail(function testBuildingHkpsKeyRequest() {
  const key = importKey();
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "pool.sks-keyservers.net");
  machine.init("hkps-pool.sks-keyservers.net", MockKeyServerWithSuccess);

  const listener = buildListener(key);
  const request = buildKeyRequest(key, listener);

  Assert.equal(request.actionFlags, nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "hkps://pool.sks-keyservers.net:443");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(function testBuildingHkpKeyRequest() {
  const key = importKey();
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "pool.sks-keyservers.net");
  machine.init("hkp-pool.sks-keyservers.net", MockKeyServerWithSuccess);

  const listener = buildListener(key);
  const request = buildKeyRequest(key, listener);

  Assert.equal(request.actionFlags, nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "hkp://pool.sks-keyservers.net:11371");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHandlingUnchangedKey() {
  const key = importKey();
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "pgp.mit.edu");
  machine.init("hkps-pgp.mit.edu", MockKeyServerWithSuccess);

  const listener = buildListener(key);
  listener.stderr("gpg: requesting key "+ key.keyId +" from hkps server pgp.mit.edu\n" +
    "gpg: key 2080080C: KEYOWNER <KEYOWNER@EMAIL> not changed\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:              unchanged: 1\n");
  listener.done();

  assertLogContains("keyserver.jsm: Key ID "+ key.keyId +" is the most up to date\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHandlingSuccessfulImportOfMultipleMessages() {
  const key = importKey();
  const importSuccessMsg1 = "gpg: requesting key KEYID from hkps server pgp.mit.edu\n";
  const importSuccessMsg2 = "gpg: key KEYID: public key KEYOWNER <KEYOWNER@EMAIL> imported\n";
  const importSuccessMsg3 = "gpg: 3 marginal(s) needed, 1 complete(s) needed, PGP trust model\n";
  const importSuccessMsg4 = "gpg: depth: 0  valid:   2  signed:   0  trust: 0-, 0q, 0n, 0m, 0f, 2u\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:               imported: 1  (RSA: 1)\n";
  machine.init("hkps-pgp.mit.edu", MockKeyServerWithSuccess);

  const listener = buildListener(key);
  listener.stderr(importSuccessMsg1);
  listener.stderr(importSuccessMsg2);
  listener.stderr(importSuccessMsg3);
  listener.stderr(importSuccessMsg4);
  listener.done();

  assertLogContains("keyserver.jsm: Key ID " + key.keyId + " successfully imported from keyserver pgp.mit.edu\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHkpResponseToGeneralError() {
  const key = importKey();
  const keyserver = "pgp.mit.edu";
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "pgp.mit.edu");
  machine.init("hkp-pgp.mit.edu", MockKeyServerWithError);
  const listener = buildListener(key);

  listener.stderr("gpg: keyserver receive failed: General error");
  listener.done();

  assertLogContains("[ERROR] hkp key request for Key ID: " + key.keyId +  " at keyserver: " + keyserver + " fails with: General Error\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function StateMachineChange() {
  const key = importKey();
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "keyserver.1, keyserver.2");

  machine.init("hkps-keyserver.1", MockKeyServerWithSuccess);
  Assert.equal(machine.getCurrentState(), "hkps-keyserver.1");

  machine.next(key, MockKeyServerWithSuccess);
  Assert.equal(machine.getCurrentState(), "hkps-keyserver.2");

  machine.next(key, MockKeyServerWithSuccess);
  Assert.equal(machine.getCurrentState(), "hkp-keyserver.1");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function hkpIsCalledWhenHkpsFails(){
  const key = importKey();
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "keyserver.1");
  machine.init("hkps-keyserver.1", MockKeyServerWithError);

  machine.start(key);

  assertLogContains("[ERROR] hkps key request for Key ID: " + key.keyId + " at keyserver: keyserver.1 fails with: General Error\n");
  assertLogContains("[ERROR] hkp key request for Key ID: " + key.keyId + " at keyserver: keyserver.1 fails with: General Error\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function hkpsTriesEachKeyServer(){
  const key = importKey();
  const keyservers = "keyserver.1, keyserver.2";
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", keyservers);
  machine.init("hkps-keyserver.1", MockKeyServerWithError);

  machine.start(key);

  assertLogContains("[ERROR] hkps key request for Key ID: " + key.keyId + " at keyserver: " + getKeyserversFrom(keyservers)[0] + " fails with: General Error\n");
  assertLogContains("[ERROR] hkps key request for Key ID: " + key.keyId + " at keyserver: " + getKeyserversFrom(keyservers)[1] + " fails with: General Error\n");
  Assert.equal(machine.getCurrentState(), null);
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function processEndsIfHkpsWorks(){
  const key =  importKey();
  const keyservers = "keyserver.6, keyserver.7";
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", keyservers);
  machine.init("hkps-keyserver.6", MockKeyServerWithSuccess);

  submitRequest(key);

  assertLogContains("keyserver.jsm: Key ID " + key.keyId + " successfully imported from keyserver " + getKeyserversFrom(keyservers)[0] + "\n");
}))));

test(function splittingOverCommasSemicolonsAndRemovingSpaces(){
  EnigmailPrefs.setPref("extensions.enigmail.autoKeyServerSelection", true);
  const stringComma = "hello, world";
  const stringColon = "hello; world";
  const stringSpaces = "hello ; world";
  const expected = ["hello", "world"];

  Assert.deepEqual(getKeyserversFrom(stringComma), expected);
  Assert.deepEqual(getKeyserversFrom(stringColon), expected);
  Assert.deepEqual(getKeyserversFrom(stringSpaces), expected);
});

test(function filterFirstKeyserversIfAutoSelectPreferenceTrue(){
  const keyserversFromPrefs = "keyserver.1, keyserver.2, keyserver.3";
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", keyserversFromPrefs);

  const keyservers = getKeyserversFrom(keyserversFromPrefs);

  Assert.deepEqual(keyservers, ["keyserver.1", "keyserver.2", "keyserver.3"]);
});

test(function returnAllKeyserversIfAutoSelectPreferenceFalse(){
  const keyserversFromPrefs = "keyserver.1, keyserver.2, keyserver.3";
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", keyserversFromPrefs);

  const keyservers = getKeyserversFrom(keyserversFromPrefs);

  Assert.deepEqual(keyservers, ["keyserver.1", "keyserver.2", "keyserver.3"]);
});

test(function createStatesForOneKeyserver() {
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "keyserver.1, keyserver.2, keyserver.3");

  const actualStates = createAllStates();

  Assert.equal(actualStates["hkps-keyserver.1"].protocol, 'hkps');
  Assert.equal(actualStates["hkps-keyserver.1"].keyserver, 'keyserver.1');
  Assert.equal(actualStates["hkps-keyserver.1"].next, 'hkps-keyserver.2');
  Assert.equal(actualStates["hkps-keyserver.2"].protocol, 'hkps');
  Assert.equal(actualStates["hkps-keyserver.2"].keyserver, 'keyserver.2');
  Assert.equal(actualStates["hkps-keyserver.2"].next, 'hkps-keyserver.3');
  Assert.equal(actualStates["hkps-keyserver.3"].protocol, 'hkps');
  Assert.equal(actualStates["hkps-keyserver.3"].keyserver, 'keyserver.3');
  Assert.equal(actualStates["hkps-keyserver.3"].next, 'hkp-keyserver.1');
  Assert.equal(actualStates["hkp-keyserver.1"].protocol, 'hkp');
  Assert.equal(actualStates["hkp-keyserver.1"].keyserver, 'keyserver.1');
  Assert.equal(actualStates["hkp-keyserver.1"].next, null);
});

test(function createStatesForMultipleKeyservers(){
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "keyserver.1, keyserver.2, keyserver.3");
  const allExpectedStates = {
    "hkps-keyserver.1": { protocol: 'hkps', keyserver: 'keyserver.1', next: 'hkps-keyserver.2' },
    "hkps-keyserver.2": { protocol: 'hkps', keyserver: 'keyserver.2', next: 'hkps-keyserver.3' },
    "hkps-keyserver.3": { protocol: 'hkps', keyserver: 'keyserver.3', next: 'hkp-keyserver.1' },
    "hkp-keyserver.1": { protocol: 'hkp', keyserver: 'keyserver.1', next: null }
  };

  const actualStates = createAllStates();

  Assert.deepEqual(actualStates["hkps-keyserver.1"], allExpectedStates["hkps-keyserver.1"]);
  Assert.deepEqual(actualStates["hkps-keyserver.2"], allExpectedStates["hkps-keyserver.2"]);
  Assert.deepEqual(actualStates["hkps-keyserver.3"], allExpectedStates["hkps-keyserver.3"]);
  Assert.deepEqual(actualStates["hkp-keyserver.1"], allExpectedStates["hkp-keyserver.1"]);
});

const MockKeyServerWithError = {
  access: function(actionFlags, keyserver, searchTerms, listener, errorMsgObj) {
    listener.stderr("General error");
    listener.done(0);
    return mockProc;
  }
};

const MockKeyServerWithSuccess = {
  access: function(actionFlags, keyserver, searchTerms, listener, errorMsgObj) {
    listener.done(0);
    return mockProc;
  }
};

const mockProc = {
  wait: function() {
    return 0;
  },
  kill: function() {
  }
};
