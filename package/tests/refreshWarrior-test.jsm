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
Components.utils.import("resource://enigmail/refreshWarrior.jsm"); /*global RefreshWarrior: false */

testing("refreshWarrior.jsm"); /*global RefreshWarrior: false, machine: false, createAllStates:false, buildKeyRequest: false, getKeyserversFrom:false, buildListener: false, submitRequest: false, sortKeyserversWithHkpsFirst: false */

function importKey() {
  EnigmailKeyRing.importKeyFromFile(do_get_file("resources/dev-tiger.asc", false), {}, {});
  return EnigmailKeyRing.getAllKeys().keyList[0];
}

function setupKeyservers(keyservers, autoOn) {
  EnigmailPrefs.setPref("keyserver", keyservers);
  EnigmailPrefs.setPref("autoKeyServerSelection", autoOn);
}

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

test(withTestGpgHome(withEnigmail(function testBuildingHkpsKeyRequest() {
  const key = importKey();
  setupKeyservers("pool.sks-keyservers.net", true);
  machine.init(MockKeyServerWithSuccess);

  const request = buildKeyRequest(key, buildListener(key));

  Assert.equal(request.actionFlags, Ci.nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "hkps://pool.sks-keyservers.net:443");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(function testBuildingHkpKeyRequest() {
  const key = importKey();
  setupKeyservers("pool.sks-keyservers.net", false);
  machine.init(MockKeyServerWithSuccess);
  machine.next(key);

  const request = buildKeyRequest(key, buildListener(key));

  Assert.equal(request.actionFlags, Ci.nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "hkp://pool.sks-keyservers.net:11371");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(function testBuildingLdapKeyRequest() {
  const key = importKey();
  setupKeyservers("ldap://pool.sks-keyservers.net", true);
  machine.init(MockKeyServerWithSuccess);

  const request = buildKeyRequest(key, buildListener(key));

  Assert.equal(request.actionFlags, Ci.nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "ldap://pool.sks-keyservers.net:389");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(function testHandlingUnsupportedProtocol() {
  const key = importKey();
  setupKeyservers("notaprotocol://pool.sks-keyservers.net", true);
  machine.init(MockKeyServerWithSuccess);

  submitRequest(key);

  assertLogContains("Keyserver ignored due to invalid protocol: notaprotocol");
})));


test(withTestGpgHome(withEnigmail(withLogFiles(function testHandlingUnchangedKey() {
  const key = importKey();
  setupKeyservers("pgp.mit.edu", false);
  machine.init(MockKeyServerWithSuccess);

  const listener = buildListener(key);
  listener.stderr("gpg: requesting key "+ key.keyId +" from hkps server pgp.mit.edu\n" +
    "gpg: key 2080080C: KEYOWNER <KEYOWNER@EMAIL> not changed\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:              unchanged: 1\n");
  listener.done();

  assertLogContains("[KEY REFRESH SERVICE]: Key ID "+ key.keyId +" is the most up to date\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHandlingSuccessfulImportOfMultipleMessages() {
  const key = importKey();
  const importSuccessMsg1 = "gpg: requesting key KEYID from hkps server pgp.mit.edu\n";
  const importSuccessMsg2 = "gpg: key KEYID: public key KEYOWNER <KEYOWNER@EMAIL> imported\n";
  const importSuccessMsg3 = "gpg: 3 marginal(s) needed, 1 complete(s) needed, PGP trust model\n";
  const importSuccessMsg4 = "gpg: depth: 0  valid:   2  signed:   0  trust: 0-, 0q, 0n, 0m, 0f, 2u\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:               imported: 1  (RSA: 1)\n";
  machine.init(MockKeyServerWithSuccess);

  const listener = buildListener(key);
  listener.stderr(importSuccessMsg1);
  listener.stderr(importSuccessMsg2);
  listener.stderr(importSuccessMsg3);
  listener.stderr(importSuccessMsg4);
  listener.done();

  assertLogContains("[KEY REFRESH SERVICE]: Key ID " + key.keyId + " successfully imported from keyserver pgp.mit.edu\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHkpResponseToGeneralError() {
  const key = importKey();
  const keyserver = "pgp.mit.edu";
  setupKeyservers(keyserver, false);
  machine.init(MockKeyServerWithError);

  const listener = buildListener(key);
  listener.stderr("gpg: keyserver receive failed: General error");
  listener.done();

  assertLogContains("[ERROR] hkp key request for Key ID: " + key.keyId +  " at keyserver: " + keyserver + " fails with: General Error\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function StateMachineChange() {
  const key = importKey();
  setupKeyservers("keyserver.1, keyserver.2", false);

  machine.init(MockKeyServerWithSuccess);
  Assert.deepEqual(machine.getCurrentState(), { protocol:'hkps', keyserver: 'keyserver.1' });

  machine.next(key);
  Assert.deepEqual(machine.getCurrentState(), { protocol:'hkps', keyserver:'keyserver.2' });

  machine.next(key);
  Assert.deepEqual(machine.getCurrentState(), { protocol:'hkp', keyserver: 'keyserver.1' });
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function hkpIsCalledWhenHkpsFails(){
  const key = importKey();
  setupKeyservers("keyserver.1", false);
  machine.init(MockKeyServerWithError);

  machine.start(key);

  assertLogContains("[ERROR] hkps key request for Key ID: " + key.keyId + " at keyserver: keyserver.1 fails with: General Error\n");
  assertLogContains("[ERROR] hkp key request for Key ID: " + key.keyId + " at keyserver: keyserver.1 fails with: General Error\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function hkpsTriesEachKeyServer(){
  const key = importKey();
  const keyservers = "keyserver.1, keyserver.2";
  setupKeyservers(keyservers, false);
  machine.init(MockKeyServerWithError);

  machine.start(key);

  assertLogContains("[ERROR] hkps key request for Key ID: " + key.keyId + " at keyserver: " + getKeyserversFrom(keyservers)[0] + " fails with: General Error\n");
  assertLogContains("[ERROR] hkps key request for Key ID: " + key.keyId + " at keyserver: " + getKeyserversFrom(keyservers)[1] + " fails with: General Error\n");
  Assert.equal(machine.getCurrentState(), null);
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function processEndsIfHkpsWorks(){
  const key =  importKey();
  const keyservers = "keyserver.6, keyserver.7";
  setupKeyservers(keyservers, false);
  machine.init(MockKeyServerWithSuccess);

  submitRequest(key);

  assertLogContains("[KEY REFRESH SERVICE]: Key ID " + key.keyId + " successfully imported from keyserver " + getKeyserversFrom(keyservers)[0] + "\n");
}))));

test(function splittingOverCommasSemicolonsAndRemovingSpaces(){
  const stringComma = "hello, world";
  const stringColon = "hello; world";
  const stringSpaces = "hello ; world";
  const expected = ["hello", "world"];

  Assert.deepEqual(getKeyserversFrom(stringComma), expected);
  Assert.deepEqual(getKeyserversFrom(stringColon), expected);
  Assert.deepEqual(getKeyserversFrom(stringSpaces), expected);
});

test(function filterFirstKeyserversIfAutoSelectPreferenceTrue(){
  setupKeyservers("keyserver.1, keyserver.2, keyserver.3", true);
  const keyserversFromPrefs = "keyserver.1, keyserver.2, keyserver.3";

  const keyservers = getKeyserversFrom(keyserversFromPrefs);

  Assert.deepEqual(keyservers, ["keyserver.1"]);
});

test(function returnAllKeyserversIfAutoSelectPreferenceFalse(){
  setupKeyservers("keyserver.1, keyserver.2, keyserver.3", false);
  const keyserversFromPrefs = "keyserver.1, keyserver.2, keyserver.3";

  const keyservers = getKeyserversFrom(keyserversFromPrefs);

  Assert.deepEqual(keyservers, ["keyserver.1", "keyserver.2", "keyserver.3"]);
});

test(function createStatesForOneKeyserver(){
  setupKeyservers("keyserver.1, keyserver.2, keyserver.3", true);

  const actualStates = createAllStates();

  const expectedStates = [
    { protocol: 'hkps', keyserver: 'keyserver.1' },
    { protocol: 'hkp', keyserver: 'keyserver.1' }
  ];
  Assert.deepEqual(actualStates, expectedStates);
});

test(function createStatesForMultipleKeyservers(){
  setupKeyservers("keyserver.1, keyserver.2, keyserver.3", false);

  const actualStates = createAllStates();

  const expectedStates = [
    { protocol: 'hkps', keyserver: 'keyserver.1' },
    { protocol: 'hkps', keyserver: 'keyserver.2' },
    { protocol: 'hkps', keyserver: 'keyserver.3' },
    { protocol: 'hkp', keyserver: 'keyserver.1' },
    { protocol: 'hkp', keyserver: 'keyserver.2' },
    { protocol: 'hkp', keyserver: 'keyserver.3' }
  ];
  Assert.deepEqual(actualStates[0], expectedStates[0]);
  Assert.deepEqual(actualStates[1], expectedStates[1]);
  Assert.deepEqual(actualStates[2], expectedStates[2]);
  Assert.deepEqual(actualStates[3], expectedStates[3]);
  Assert.deepEqual(actualStates[4], expectedStates[4]);
  Assert.deepEqual(actualStates[5], expectedStates[5]);
});

test(function checksForSpecifiedProtocol(){
  const keyservers = setupKeyservers("hkp://keyserver.1", true);
  const actualStates = createAllStates();
  const expectedStates = [
    { protocol: 'hkp', keyserver: 'keyserver.1'}
  ];
  Assert.deepEqual(actualStates, expectedStates);
});

test(function setsUpStatesWithMixOfSpecifiedProtocolsAndFirstKeyserverWithNoProtocol(){
  const keyservers = setupKeyservers("keyserver.1, hkp://keyserver.2, ldap://keyserver.3, hkps://keyserver.4", false);
  const actualStates = createAllStates();
  const expectedStates = [
    { protocol: 'hkps', keyserver: 'keyserver.1'},
    { protocol: 'hkps', keyserver: 'keyserver.4'},
    { protocol: 'hkp', keyserver: 'keyserver.2'},
    { protocol: 'ldap', keyserver: 'keyserver.3'},
    { protocol: 'hkp', keyserver: 'keyserver.1'}
  ];
  Assert.deepEqual(actualStates, expectedStates);
});

test(function setsUpStatesWithMixOfSpecifiedProtocols(){
  const keyservers = setupKeyservers("hkp://keyserver.1, hkps://keyserver.2, keyserver.3, hkps://keyserver.4, ldap://keyserver.5", false);
  const actualStates = createAllStates();
  const expectedStates = [
    { protocol: 'hkps', keyserver: 'keyserver.2'},
    { protocol: 'hkps', keyserver: 'keyserver.3'},
    { protocol: 'hkps', keyserver: 'keyserver.4'},
    { protocol: 'hkp', keyserver: 'keyserver.1'},
    { protocol: 'ldap', keyserver: 'keyserver.5'},
    { protocol: 'hkp', keyserver: 'keyserver.3'}
  ];
  Assert.deepEqual(actualStates[0], expectedStates[0]);
  Assert.deepEqual(actualStates[1], expectedStates[1]);
  Assert.deepEqual(actualStates[2], expectedStates[2]);
  Assert.deepEqual(actualStates[3], expectedStates[3]);
  Assert.deepEqual(actualStates[4], expectedStates[4]);
  Assert.deepEqual(actualStates[5], expectedStates[5]);
});

test(function orderHkpsKeyserversToBeginningOfKeyserverArray(){
  const keyservers = ["hkp://keyserver.1", "hkps://keyserver.2", "keyserver.3", "hkps://keyserver.4", "ldap://keyserver.5"];
  const orderedKeyservers = ["hkps://keyserver.2", "keyserver.3", "hkps://keyserver.4", "hkp://keyserver.1", "ldap://keyserver.5"];
  Assert.deepEqual(sortKeyserversWithHkpsFirst(keyservers), orderedKeyservers);
});

test(function doNotStartIfNoKeyserversProvided(){
  const keyservers = setupKeyservers(" ", false);
  const key = importKey();
  machine.getCurrentState();

  RefreshWarrior.refreshKey(key);

  assertLogContains("[KEY REFRESH SERVICE]: Not started as no keyservers available");
});
