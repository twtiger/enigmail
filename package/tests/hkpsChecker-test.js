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
Components.utils.import("resource://enigmail/keyserver.jsm"); /*global EnigmailKeyServer: false */

testing("hkpsChecker.jsm"); /*global createAllStates:false, EnigmailKeyServer: false, nsIEnigmail: false, build: false, buildKeyRequest: false, getKeyserversFrom: false, buildListener: false, StateMachine: false, submitRequest: false, submit: false */

function importKey() {
  const tigerKey = do_get_file("resources/dev-tiger.asc", false);
  EnigmailKeyRing.importKeyFromFile(tigerKey, {}, {});
}

function setUpKeyservers(keyservers, autokeyOn){
    EnigmailPrefs.setPref("extensions.enigmail.keyserver", keyservers);
    EnigmailPrefs.setPref("extensions.enigmail.autoKeyServerSelection", autokeyOn);
}

test(withTestGpgHome(withEnigmail(function testBuildingHkpsKeyRequest() {
  importKey();
  const key = EnigmailKeyRing.getAllKeys().keyList[0];
  const keyserver = "pool.sks-keyservers.net";
  setUpKeyservers(keyserver, true);
  let stateMachine = new StateMachine("hkps-pool.sks-keyservers.net", key, MockKeyServerWithSuccess);
  let listener = buildListener(key, keyserver, stateMachine, null);

  let request = buildKeyRequest(key, keyserver, stateMachine, listener);

  Assert.equal(request.actionFlags, nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "hkps://pool.sks-keyservers.net:443");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(function testBuildingHkpKeyRequest() {
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  setUpKeyservers("pool.sks-keyservers.net", true);

  let stateMachine = new StateMachine("hkp-pool.sks-keyservers.net", key, MockKeyServerWithSuccess);
  let listener = buildListener(key, "pool.sks-keyservers.net", stateMachine);
  let request = buildKeyRequest(key, "pool.sks-keyservers.net", stateMachine, listener);

  Assert.equal(request.actionFlags, nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "hkp://pool.sks-keyservers.net:11371");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHandlingUnchangedKey() {
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  setUpKeyservers("pgp.mit.edu", true);
  let stateMachine = new StateMachine("hkps-pgp.mit.edu", key, MockKeyServerWithSuccess);
  let errMsg = "gpg: requesting key "+ key.keyId +" from hkps server pgp.mit.edu\n" +
    "gpg: key 2080080C: KEYOWNER <KEYOWNER@EMAIL> not changed\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:              unchanged: 1\n";

  let listener = buildListener(key, "pgp.mit.edu", stateMachine);
  listener.stderr(errMsg);
  listener.done();

  assertLogContains("keyserver.jsm: Key ID "+ key.keyId +" is the most up to date\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHandlingSuccessfulImport() {
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  let importSuccessMsg1 = "gpg: requesting key KEYID from hkps server pgp.mit.edu\n";
  let importSuccessMsg2 = "gpg: key KEYID: public key KEYOWNER <KEYOWNER@EMAIL> imported\n";
  let importSuccessMsg3 = "gpg: 3 marginal(s) needed, 1 complete(s) needed, PGP trust model\n";
  let importSuccessMsg4 = "gpg: depth: 0  valid:   2  signed:   0  trust: 0-, 0q, 0n, 0m, 0f, 2u\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:               imported: 1  (RSA: 1)\n";

  let stateMachine = new StateMachine("hkps-pgp.mit.edu", key, MockKeyServerWithSuccess);
  let listener = buildListener(key, "pgp.mit.edu", stateMachine);
  listener.stderr(importSuccessMsg1);
  listener.stderr(importSuccessMsg2);
  listener.stderr(importSuccessMsg3);
  listener.stderr(importSuccessMsg4);
  listener.done();
  assertLogContains("keyserver.jsm: Key ID " + key.keyId + " successfully imported from keyserver pgp.mit.edu\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHkpResponseToGeneralError() {
  importKey();
  const key = EnigmailKeyRing.getAllKeys().keyList[0];
  const keyserver = "pgp.mit.edu";
  setUpKeyservers(keyserver, true);

  let stateMachine = new StateMachine("hkp-pgp.mit.edu", key, MockKeyServerWithError);
  let listener = buildListener(key, keyserver, stateMachine);

  let errMsg = "gpg: keyserver receive failed: General error";
  listener.stderr(errMsg);
  listener.done();
  assertLogContains("[ERROR] hkp key request for Key ID: " + key.keyId +  " at keyserver: " + keyserver + " fails with: General Error\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function StateMachineChange() {
  importKey();
  const key = EnigmailKeyRing.getAllKeys().keyList[0];
  setUpKeyservers("keyserver.1, keyserver.2", true);
  let stateMachine = new StateMachine("hkps-keyserver.1", key, MockKeyServerWithSuccess);
  Assert.equal(stateMachine.currentState, "hkps-keyserver.1");

  stateMachine.next(key);

  Assert.equal(stateMachine.currentState, "hkp-keyserver.1");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function hkpIsCalledWhenHkpsFails(){
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  setUpKeyservers("keyserver.1", false);
  let stateMachine = new StateMachine("hkps-keyserver.1", key, MockKeyServerWithError);

  stateMachine.start(key);

  assertLogContains("[ERROR] hkps key request for Key ID: " + key.keyId + " at keyserver: keyserver.1 fails with: General Error\n");
  assertLogContains("[ERROR] hkp key request for Key ID: " + key.keyId + " at keyserver: keyserver.1 fails with: General Error\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function hkpsTriesEachKeyServer(){
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  let keyservers = ["keyserver.1", "keyserver.2"];
  setUpKeyservers(keyservers, false);

  let stateMachine = new StateMachine("hkps-keyserver.1", key, MockKeyServerWithError);

  stateMachine.start(key);

  assertLogContains("[ERROR] hkps key request for Key ID: " + key.keyId + " at keyserver: " + keyservers[0] + " fails with: General Error\n");
  assertLogContains("[ERROR] hkps key request for Key ID: " + key.keyId + " at keyserver: " + keyservers[1] + " fails with: General Error\n");
  Assert.equal(stateMachine.currentState, null);
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function processEndsIfHkpsWorks(){
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  let keyservers = ["keyserver.6", "keyserver.7"];
  setUpKeyservers("keyserver.6, keyserver.7", false);
  let stateMachine = new StateMachine("hkps-keyserver.6", key, MockKeyServerWithSuccess);

  submitRequest(key, keyservers[0], MockKeyServerWithSuccess, stateMachine);

  assertLogContains("keyserver.jsm: Key ID " + key.keyId + " successfully imported from keyserver " + keyservers[0] + "\n");
}))));

test(function splittingOverCommasSemicolonsAndRemovingSpaces(){
  EnigmailPrefs.setPref("extensions.enigmail.autoKeyServerSelection", false);
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
  setUpKeyservers("keyserver.1, keyserver.2, keyserver.3", true);

  let keyservers = getKeyserversFrom(keyserversFromPrefs);

  Assert.equal(EnigmailPrefs.getPref("extensions.enigmail.autoKeyServerSelection"), true);
  Assert.deepEqual(keyservers, ["keyserver.1"]);
});

test(function returnAllKeyserversIfAutoSelectPreferenceFalse(){
  const keyserversFromPrefs = "keyserver.1, keyserver.2, keyserver.3"; 
  setUpKeyservers("keyserver.1, keyserver.2, keyserver.3", false);

  let keyservers = getKeyserversFrom(keyserversFromPrefs);

  Assert.deepEqual(keyservers, ["keyserver.1", "keyserver.2", "keyserver.3"]);
});

test(function createStatesForOneKeyserver() {
  setUpKeyservers("keyserver.1, keyserver.2, keyserver.3", true);
  const actualStates = createAllStates();

  Assert.equal(actualStates["hkps-keyserver.1"].protocol, 'hkps');
  Assert.equal(actualStates["hkps-keyserver.1"].keyserver, 'keyserver.1');
  Assert.equal(actualStates["hkps-keyserver.1"].next, 'hkp-keyserver.1');
  Assert.equal(actualStates["hkp-keyserver.1"].protocol, 'hkp');
  Assert.equal(actualStates["hkp-keyserver.1"].keyserver, 'keyserver.1');
  Assert.equal(actualStates["hkp-keyserver.1"].next, null);
});

test(function createStatesForMultipleKeyservers(){
  setUpKeyservers("keyserver.1, keyserver.2, keyserver.3", false);
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
