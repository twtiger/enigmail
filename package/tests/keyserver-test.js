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

Components.utils.import("resource://enigmail/locale.jsm"); /*global EnigmailLocale: false */
Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Components.utils.import("resource://enigmail/gpgAgent.jsm"); /*global EnigmailGpgAgent: false */
Components.utils.import("resource://enigmail/tor.jsm"); /*global EnigmailTor: false */
// Components.utils.import("resource://enigmail/httpProxy.jsm"); global EnigmailHttpProxy: false 

testing("keyserver.jsm"); /*global EnigmailKeyServer: false, nsIEnigmail: false, build: false, buildHkpsKeyRequest: false, getKeyserver: false, buildHkpKeyRequest: false, buildHkpsListener: false, buildListener: false, StateMachine: false */

const HttpProxyBuilder = {
  build: function() {
    this.httpProxy = {getHttpProxy: function(keyserver) {return null;}};
    return this.httpProxy;
  }
};

const TorBuilder = {
  build: function() {
    this.tor = {};
    this.tor.gpgActions = {downloadKey: true, refreshKeys: false, searchKey: false, uploadKey: false};
    this.tor.getConfiguration = {}; // TODO what to set if tor is not available?
    return this;
  },
  withConfiguration: function(port) {
    this.tor.getConfiguration = {host: '127.0.0.1', port: port};
    return this;
  },
  withGpgActions: function(action, value){
    this.tor.gpgActions[action] = value;
    return this;
  },
  get: function() {
    return this.tor;
  }
};

const dummyStates = {
  "hkps": {exec: function(){}, next: "hkp"},
  "hkp": {exec: function(){}, next: null}
};

function importKey() {
  const tigerKey = do_get_file("resources/dev-tiger.asc", false);
  EnigmailKeyRing.importKeyFromFile(tigerKey, {}, {});
}

test(function testBasicQuery() {
  var actionFlags = nsIEnigmail.REFRESH_KEY;
  var keyserver = "keyserver0005";
  var searchTerms = "1";
  var errorMsgObj = {};
  var httpProxy = HttpProxyBuilder.build();
  var tor = TorBuilder.build().get();

  var keyRequestProps = build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor);
  Assert.ok(keyRequestProps.args.indexOf("--refresh-keys") != -1);
  Assert.ok(keyRequestProps.args.indexOf("keyserver0005") != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, null);
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, nsIEnigmail.REFRESH_KEY);
});

test(withTestGpgHome(withEnigmail(function testBasicQueryWithInputData() {
  let actionFlags = nsIEnigmail.SEARCH_KEY;
  let keyserver = "keyserver0005";
  let searchTerms = "1";
  let errorMsgObj = {};
  let httpProxy = HttpProxyBuilder.build();
  let tor = TorBuilder.build().get();

  let keyRequestProps = build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor);

  Assert.ok(keyRequestProps.args.indexOf("--search-keys") != -1);
  Assert.ok(keyRequestProps.args.indexOf("keyserver0005") != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, "quit\n");
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, 0);
})));

test(function testReceiveKey() {
  var actionFlags = nsIEnigmail.DOWNLOAD_KEY;
  var keyserver = "keyserver0005";
  var searchTerms = "0001";
  var errorMsgObj = {};
  var httpProxy = HttpProxyBuilder.build();
  var tor = TorBuilder.build().get();

  var keyRequestProps = build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor);
  Assert.ok(keyRequestProps.args["--recv-keys"] != -1);
  Assert.ok(keyRequestProps.args.indexOf("0001") != -1);
  Assert.ok(keyRequestProps.args.indexOf("keyserver0005") != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, null);
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, nsIEnigmail.DOWNLOAD_KEY);
});

test(withTestGpgHome(withEnigmail(function testUploadKey() {
  var actionFlags = nsIEnigmail.UPLOAD_KEY;
  var keyserver = "keyserver0005";
  var searchTerms = "0001";
  var errorMsgObj = {};
  var httpProxy = HttpProxyBuilder.build();
  var tor = TorBuilder.build().get();

  var keyRequestProps = build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor);

  Assert.ok(keyRequestProps.args.indexOf("--send-keys") != -1);
  Assert.ok(keyRequestProps.args.indexOf("0001") != -1);
  Assert.ok(keyRequestProps.args.indexOf("keyserver0005") != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, null);
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, 0);
})));

test(withTestGpgHome(withEnigmail(function testRefreshKeyOverTorProxy9050() {
  var actionFlags = (nsIEnigmail.DOWNLOAD_KEY);
  var keyserver = "keyserver0005";
  var searchTerms = "0001";
  var errorMsgObj = {};
  var httpProxy = HttpProxyBuilder.build();
  var tor = TorBuilder.build().withConfiguration(9050).get();

  var keyRequestProps = build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor);
  Assert.ok(keyRequestProps.args.indexOf("--recv-keys") != -1);
  Assert.ok(keyRequestProps.args.indexOf("--keyserver-options") != -1);
  Assert.ok(keyRequestProps.args.indexOf("http-proxy=socks5-hostname://127.0.0.1:9050") != -1);
  Assert.ok(keyRequestProps.args.indexOf("0001") != -1);
  Assert.ok(keyRequestProps.args.indexOf("keyserver0005") != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, null);
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, nsIEnigmail.DOWNLOAD_KEY);
})));

test(withTestGpgHome(withEnigmail(function testRefreshKeyOverTorProxy9150() {
  var actionFlags = (nsIEnigmail.DOWNLOAD_KEY);
  var keyserver = "keyserver0005";
  var searchTerms = "0001";
  var errorMsgObj = {};
  var httpProxy = HttpProxyBuilder.build();
  var tor = TorBuilder.build().withConfiguration(9150).get();

  var keyRequestProps = build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor);
  Assert.ok(keyRequestProps.args.indexOf("--recv-keys") != -1);
  Assert.ok(keyRequestProps.args.indexOf("--keyserver-options") != -1);
  Assert.ok(keyRequestProps.args.indexOf("http-proxy=socks5-hostname://127.0.0.1:9150") != -1);
  Assert.ok(keyRequestProps.args.indexOf("0001") != -1);
  Assert.ok(keyRequestProps.args.indexOf("keyserver0005") != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, null);
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, nsIEnigmail.DOWNLOAD_KEY);
})));

test(function testErrorQueryWithNoKeyserver() {
  var actionFlags = nsIEnigmail.UPLOAD_KEY;
  var keyserver = null;
  var searchTerms = "0001";
  var errorMsgObj = {};
  var httpProxy = HttpProxyBuilder.build();
  var tor = TorBuilder.build().get();

  var keyRequestProps = build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor);
  Assert.equal(keyRequestProps, null);
  Assert.equal(errorMsgObj.value, EnigmailLocale.getString("failNoServer"));
});

test(function testErrorSearchQueryWithNoID() {
  var actionFlags = nsIEnigmail.SEARCH_KEY;
  var keyserver = "keyserver0005";
  var searchTerms = null;
  var errorMsgObj = {};
  var httpProxy = HttpProxyBuilder.build();
  var tor = TorBuilder.build().get();

  var keyRequestProps = build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor);
  Assert.equal(keyRequestProps, null);
  Assert.equal(errorMsgObj.value, EnigmailLocale.getString("failNoID"));
});

test(withTestGpgHome(withEnigmail(function testBuildingHkpsKeyRequest() {
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  let stateMachine = new StateMachine("hkps", dummyStates);
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "pool.sks-keyservers.net");

  let request = buildKeyRequest(key, 0, stateMachine);

  Assert.equal(request.actionFlags, nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "hkps://pool.sks-keyservers.net:443");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(function testBuildingHkpKeyRequest() {
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "pool.sks-keyservers.net");

  let stateMachine = new StateMachine("hkp", dummyStates);
  let request = buildKeyRequest(key, 0, stateMachine);

  Assert.equal(request.actionFlags, nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "hkp://pool.sks-keyservers.net:11371");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHandlingUnchangedKey() {
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  let stateMachine = new StateMachine("hkps", dummyStates);
  let errMsg = "gpg: requesting key "+ key.keyId +" from hkps server pgp.mit.edu\n" +
    "gpg: key 2080080C: KEYOWNER <KEYOWNER@EMAIL> not changed\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:              unchanged: 1\n";
  let listener = buildListener(key, stateMachine, 0, ["pgp.mit.edu"]);
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
  let listener = buildListener(key, dummyStates, 0, ["pgp.mit.edu"]);
  listener.stderr(importSuccessMsg1);
  listener.stderr(importSuccessMsg2);
  listener.stderr(importSuccessMsg3);
  listener.stderr(importSuccessMsg4);
  listener.done();
  assertLogContains("keyserver.jsm: Key ID " + key.keyId + " successfully imported!\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHkpResponseToGeneralError() {
  importKey();
  const key = EnigmailKeyRing.getAllKeys().keyList[0];
  const keyservers = ["pgp.mit.edu"];

  let stateMachine = new StateMachine("hkp", dummyStates);
  let listener = buildListener(key, stateMachine, 0, keyservers);

  let errMsg = "gpg: keyserver receive failed: General error";
  listener.stderr(errMsg);
  listener.done();
  assertLogContains("[ERROR] key request for Key ID: " + key.keyId +  " at keyserver: " + keyservers[0] + " fails with: General Error\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function StateMachineChange() {
  let stateMachine = new StateMachine("hkps", dummyStates);
  Assert.equal(stateMachine.currentState, "hkps");
  stateMachine.next();
  Assert.equal(stateMachine.currentState, "hkp");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function hkpIsCalledWhenHkpsFails(){
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];

  let stateMachine = new StateMachine("hkps", dummyStates);
  Assert.equal(stateMachine.currentState, "hkps")
  let listener = buildListener(key, stateMachine, 0, ["pgp.mit.edu"]);
  let errMsg = "gpg: keyserver receive failed: General error";
  listener.stderr(errMsg);
  listener.done();

  Assert.equal(stateMachine.currentState, "hkp");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function hkpsTriesEachKeyServer(){ //mock out the keyservers to speed up test
  EnigmailLog.setLogLevel(2000);
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  let keyservers = ["keys.gnupg.net", "keys.gnupg.net"]
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "keys.gnupg.net, keys.gnupg.net");
  EnigmailPrefs.setPref("extensions.enigmail.autoKeyServerSelection", false);

  let stateMachine = new StateMachine("hkps", dummyStates);

  submitRequest(key, 0, stateMachine);
  assertLogContains("[ERROR] key request for Key ID: " + key.keyId + " at keyserver: " + keyservers[0] + " fails with: General Error\n");
  assertLogContains("[ERROR] key request for Key ID: " + key.keyId + " at keyserver: " + keyservers[1] + " fails with: General Error\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function hkpIsCalledIfHkpsFailsOverAllServers(){
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  const keyservers = ["keys.gnupg.net", "keys.gnupg.net", "keys.gnupg.net"];
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "keys.gnupg.net, keys.gnupg.net, keys.gnupg.net");
  EnigmailPrefs.setPref("extensions.enigmail.autoKeyServerSelection", false);

  let stateMachine = new StateMachine("hkps", dummyStates);

  submitRequest(key, 2, stateMachine);
  assertLogContains("[ERROR] key request for Key ID: " + key.keyId + " at keyserver: " + keyservers[2] + " fails with: General Error\n");
  Assert.equal(stateMachine.currentState, "hkp");
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
})

test(function filterFirstKeyserversIfAutoSelectPreferenceTrue(){
  const keyserversFromPrefs = "keyserver.1, keyserver.2, keyserver.3"; 
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "keyserver.1, keyserver.2, keyserver.3");
  EnigmailPrefs.setPref("extensions.enigmail.autoKeyServerSelection", true);
  let keyservers = getKeyserversFrom(keyserversFromPrefs);
  Assert.equal(EnigmailPrefs.getPref("extensions.enigmail.autoKeyServerSelection"), true);
  Assert.deepEqual(keyservers, ["keyserver.1"]);
})

test(function returnAllKeyserversIfAutoSelectPreferenceFalse(){
  const keyserversFromPrefs = "keyserver.1, keyserver.2, keyserver.3"; 
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "keyserver.1, keyserver.2, keyserver.3");
  EnigmailPrefs.setPref("extensions.enigmail.autoKeyServerSelection", false);
  let keyservers = getKeyserversFrom(keyserversFromPrefs);
  Assert.deepEqual(keyservers, ["keyserver.1", "keyserver.2", "keyserver.3"]);
})
