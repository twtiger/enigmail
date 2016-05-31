/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false */
/*global Components: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false, component: false, Cc: false, Ci: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";
do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, getKeyListEntryOfKey: false, gKeyListObj: true */

Components.utils.import("resource://enigmail/locale.jsm"); /*global EnigmailLocale: false */

testing("keyserver.jsm"); /*global EnigmailKeyServer: false, nsIEnigmail: false*/

test(function testBasicQuery() {
  var actionFlags = nsIEnigmail.REFRESH_KEY;
  var keyserver = "keyserver0005";
  var searchTerms = "1";
  var errorMsgObj = {};

  var keyRequestProps = EnigmailKeyServer.build(actionFlags, keyserver, searchTerms, errorMsgObj);
  Assert.ok(keyRequestProps.args["--refresh-keys"] != -1);
  Assert.ok(keyRequestProps.args["keyserver0005"] != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, null);
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, nsIEnigmail.REFRESH_KEY);
});

test(function testBasicQueryWithInputData() {
  var actionFlags = nsIEnigmail.SEARCH_KEY;
  var keyserver = "keyserver0005";
  var searchTerms = "1";
  var errorMsgObj = {};

  var keyRequestProps = EnigmailKeyServer.build(actionFlags, keyserver, searchTerms, errorMsgObj);
  Assert.ok(keyRequestProps.args["--refresh-keys"] != -1);
  Assert.ok(keyRequestProps.args["keyserver0005"] != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, "quit\n");
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, 0);
});

test(function testReceiveKey() {
  var actionFlags = nsIEnigmail.DOWNLOAD_KEY;
  var keyserver = "keyserver0005";
  var searchTerms = "0001";
  var errorMsgObj = {};

  var keyRequestProps = EnigmailKeyServer.build(actionFlags, keyserver, searchTerms, errorMsgObj);
  Assert.ok(keyRequestProps.args["--recv-keys"] != -1);
  Assert.ok(keyRequestProps.args["0001"] != -1);
  Assert.ok(keyRequestProps.args["keyserver0005"] != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, null);
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, nsIEnigmail.DOWNLOAD_KEY);
});

test(function testUploadKey() {
  var actionFlags = nsIEnigmail.UPLOAD_KEY;
  var keyserver = "keyserver0005";
  var searchTerms = "0001";
  var errorMsgObj = {};

  var keyRequestProps = EnigmailKeyServer.build(actionFlags, keyserver, searchTerms, errorMsgObj);
  Assert.ok(keyRequestProps.args["--send-keys"] != -1);
  Assert.ok(keyRequestProps.args["0001"] != -1);
  Assert.ok(keyRequestProps.args["keyserver0005"] != -1); // eslint-disable-line dot-notation
  Assert.equal(keyRequestProps.inputData, null);
  Assert.equal(keyRequestProps.errors.value, null);
  Assert.equal(keyRequestProps.isDownload, 0);
});

test(function testErrorQueryWithNoKeyserver() {
  var actionFlags = nsIEnigmail.UPLOAD_KEY;
  var keyserver = null;
  var searchTerms = "0001";
  var errorMsgObj = {};

  var keyRequestProps = EnigmailKeyServer.build(actionFlags, keyserver, searchTerms, errorMsgObj);
  Assert.equal(keyRequestProps, null);
  Assert.equal(errorMsgObj.value, EnigmailLocale.getString("failNoServer"));
});

test(function testErrorSearchQueryWithNoID() {
  var actionFlags = nsIEnigmail.SEARCH_KEY;
  var keyserver = "keyserver0005";
  var searchTerms = null;
  var errorMsgObj = {};

  var keyRequestProps = EnigmailKeyServer.build(actionFlags, keyserver, searchTerms, errorMsgObj);
  Assert.equal(keyRequestProps, null);
  Assert.equal(errorMsgObj.value, EnigmailLocale.getString("failNoID"));
});
