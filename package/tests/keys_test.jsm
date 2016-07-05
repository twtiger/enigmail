
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

test(function testbasicquery() {
  var actionflags = nsienigmail.refresh_key;
  var keyserver = "keyserver0005";
  var searchterms = "1";
  var errormsgobj = {};

  var keyrequestprops = enigmailkeyserver.build(actionflags, keyserver, searchterms, errormsgobj);
  assert.ok(keyrequestprops.args["--refresh-keys"] != -1);
  assert.ok(keyrequestprops.args["keyserver0005"] != -1); // eslint-disable-line dot-notation
  assert.equal(keyrequestprops.inputdata, null);
  assert.equal(keyrequestprops.errors.value, null);
  assert.equal(keyrequestprops.isdownload, nsienigmail.refresh_key);
});

test(function testbasicquerywithinputdata() {
  var actionflags = nsienigmail.search_key;
  var keyserver = "keyserver0005";
  var searchterms = "1";
  var errormsgobj = {};

  var keyrequestprops = enigmailkeyserver.build(actionflags, keyserver, searchterms, errormsgobj);
  assert.ok(keyrequestprops.args["--refresh-keys"] != -1);
  assert.ok(keyrequestprops.args["keyserver0005"] != -1); // eslint-disable-line dot-notation
  assert.equal(keyrequestprops.inputdata, "quit\n");
  assert.equal(keyrequestprops.errors.value, null);
  assert.equal(keyrequestprops.isdownload, 0);
});

test(function testreceivekey() {
  var actionflags = nsienigmail.download_key;
  var keyserver = "keyserver0005";
  var searchterms = "0001";
  var errormsgobj = {};

  var keyrequestprops = enigmailkeyserver.build(actionflags, keyserver, searchterms, errormsgobj);
  assert.ok(keyrequestprops.args["--recv-keys"] != -1);
  assert.ok(keyrequestprops.args["0001"] != -1);
  assert.ok(keyrequestprops.args["keyserver0005"] != -1); // eslint-disable-line dot-notation
  assert.equal(keyrequestprops.inputdata, null);
  assert.equal(keyrequestprops.errors.value, null);
  assert.equal(keyrequestprops.isdownload, nsienigmail.download_key);
});

test(function testuploadkey() {
  var actionflags = nsienigmail.upload_key;
  var keyserver = "keyserver0005";
  var searchterms = "0001";
  var errormsgobj = {};

  var keyrequestprops = enigmailkeyserver.build(actionflags, keyserver, searchterms, errormsgobj);
  assert.ok(keyrequestprops.args["--send-keys"] != -1);
  assert.ok(keyrequestprops.args["0001"] != -1);
  assert.ok(keyrequestprops.args["keyserver0005"] != -1); // eslint-disable-line dot-notation
  assert.equal(keyrequestprops.inputdata, null);
  assert.equal(keyrequestprops.errors.value, null);
  assert.equal(keyrequestprops.isdownload, 0);
});

test(function testerrorquerywithnokeyserver() {
  var actionflags = nsienigmail.upload_key;
  var keyserver = null;
  var searchterms = "0001";
  var errormsgobj = {};

  var keyrequestprops = enigmailkeyserver.build(actionflags, keyserver, searchterms, errormsgobj);
  assert.equal(keyrequestprops, null);
  assert.equal(errormsgobj.value, enigmaillocale.getstring("failnoserver"));
});

test(function testerrorsearchquerywithnoid() {
  var actionflags = nsienigmail.search_key;
  var keyserver = "keyserver0005";
  var searchterms = null;
  var errormsgobj = {};

  var keyrequestprops = enigmailkeyserver.build(actionflags, keyserver, searchterms, errormsgobj);
  assert.equal(keyrequestprops, null);
  assert.equal(errormsgobj.value, enigmaillocale.getstring("failnoid"));
});
