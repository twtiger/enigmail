/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false */
/*global Components: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false, component: false, Cc: false, Ci: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// QA NOTES
// Good response
// gpg: requesting key 2080080C from hkps server pgp.mit.edu
// gpg: key 2080080C: "Andrew Ayer <agwa@andrewayer.name>" not changed
// gpg: Total number processed: 1
// gpg:              unchanged: 1
//
// Error 1
// gpg: requesting key 2080080C from hkps server keys.gnupg.net
// gpgkeys: HTTP fetch error 60: Peer's Certificate has expired.
// gpg: no valid OpenPGP data found.
//
// Error2
// gpg: keyserver receive failed: General error
//


"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true, assertLogContains: false, withLogFiles: false */

Components.utils.import("resource://enigmail/locale.jsm"); /*global EnigmailLocale: false */
Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Components.utils.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Components.utils.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */

testing("keyserver.jsm"); /*global EnigmailKeyServer: false, nsIEnigmail: false, build: false, buildHkpsKeyRequest: false, getKeyserver: false, buildHkpKeyRequest: false, buildHkpsListener: false, buildHkpListener: false */

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

test(function testBasicQueryWithInputData() {
  var actionFlags = nsIEnigmail.SEARCH_KEY;
  var keyserver = "keyserver0005";
  var searchTerms = "1";
  var errorMsgObj = {};
  var httpProxy = HttpProxyBuilder.build();
  var tor = TorBuilder.build().get();

  var keyRequestProps = build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor);
  Assert.ok(keyRequestProps.args.indexOf("--search-keys") != -1);
  Assert.ok(keyRequestProps.args.indexOf("keyserver0005") != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, "quit\n");
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, 0);
});

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

test(function testUploadKey() {
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
});

test(function testRefreshKeyOverTorProxy9050() {
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
});

test(function testRefreshKeyOverTorProxy9150() {
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
});

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

function importKey() {
  const tigerKey = do_get_file("resources/dev-tiger.asc", false);
  EnigmailKeyRing.importKeyFromFile(tigerKey, {}, {});
}

test(withTestGpgHome(withEnigmail(function testBuildingHkpsKeyRequest() {
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "pool.sks-keyservers.net");

  let request = buildHkpsKeyRequest(key);

  Assert.equal(request.actionFlags, nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "hkps://pool.sks-keyservers.net:443");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(function testBuildingHkpKeyRequest() {
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  EnigmailPrefs.setPref("extensions.enigmail.keyserver", "pool.sks-keyservers.net");

  let request = buildHkpKeyRequest(key);

  Assert.equal(request.actionFlags, nsIEnigmail.DOWNLOAD_KEY);
  Assert.equal(request.keyserver, "hkp://pool.sks-keyservers.net:11371");
  Assert.equal(request.searchTerms, key.keyId);
})));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHandlingUnchangedKey() {
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  let errMsg = "gpg: requesting key "+ key.keyId +" from hkps server pgp.mit.edu\n" +
    "gpg: key 2080080C: KEYOWNER <KEYOWNER@EMAIL> not changed\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:              unchanged: 1\n";
  let listener = buildHkpsListener(key);
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
  let listener = buildHkpsListener(key);
  listener.stderr(importSuccessMsg1);
  listener.stderr(importSuccessMsg2);
  listener.stderr(importSuccessMsg3);
  listener.stderr(importSuccessMsg4);
  listener.done();
  assertLogContains("keyserver.jsm: Key ID " + key.keyId + " successfully imported!\n");
}))));

test(withTestGpgHome(withEnigmail(withLogFiles(function testHkpResponseToGeneralError() {
  importKey();
  let key = EnigmailKeyRing.getAllKeys().keyList[0];
  let listener = buildHkpListener(key);

  let errMsg = "gpg: keyserver receive failed: General error";
  listener.stderr(errMsg);
  listener.done();
  assertLogContains("[ERROR] hkp key request for Key ID: " + key.keyId + " fails with: " + errMsg + "\n");
}))));
