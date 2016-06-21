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
Components.utils.import("resource://enigmail/files.jsm"); /*global EnigmailFiles: false */
Components.utils.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */
Components.utils.import("resource://enigmail/subprocess.jsm"); /*global subprocess: false */
Components.utils.import("resource://enigmail/core.jsm"); /*global EnigmailCore: false */

testing("keyserver.jsm"); /*global createAllStates:false, EnigmailKeyServer: false, nsIEnigmail: false, build: false, buildKeyRequest: false, getKeyserversFrom: false, buildListener: false, StateMachine: false, submitRequest: false, submit: false */

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
    this.tor.userWantsActionOverTor = function() { return false; };
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

test(withTestGpgHome(withEnigmail(function testTorsocksUsage() {
  const actionFlags = (nsIEnigmail.DOWNLOAD_KEY);
  const keyserver = "keyserver0005";
  const searchTerms = "0001";
  const errorMsgObj = {};
  const httpProxy = HttpProxyBuilder.build();
  const tor = {
    userWantsActionOverTor: function() { return true; },
    torIsAvailable: function(os, evaluator) { return { status:true, type: 'torsocks'}; },
    buildGpgProxyArguments: function(type, os) {EnigmailTor.buildGpgProxyArguments(type, os);}
  };

  var keyRequestProps = build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy, tor);

  Assert.assertArrayContains(keyRequestProps.prefix, 'torsocks');
  Assert.assertArrayContains(keyRequestProps.prefix, '--user');
  Assert.assertArrayContains(keyRequestProps.prefix, '--pass');
  Assert.equal(keyRequestProps.prefix.length, 5);

  Assert.equal(keyRequestProps.isDownload, nsIEnigmail.DOWNLOAD_KEY);
  Assert.assertArrayContains(keyRequestProps.args, "--recv-keys");
  Assert.assertArrayNotContains(keyRequestProps.args, "--keyserver-options");
  Assert.assertArrayNotContains(keyRequestProps.args, "http-proxy=socks5-hostname://127.0.0.1:9050");
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
