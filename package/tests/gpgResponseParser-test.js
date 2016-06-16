/* global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert:false */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js");

testing("gpgResponseParser.jsm"); /* global GpgResponseParser:false */

test(function testRegisteringGeneralError() {
  let errMsg = "gpg: keyserver receive failed: General error\n";
  let response = GpgResponseParser.parse(errMsg);
  Assert.equal(response.status, "General Error");
});

test(function testRegisteringFetchError() {
  let errMsg = "gpg: requesting key KEYID from hkps server keys.gnupg.net\n" +
    "gpgkeys: HTTP fetch error 60: Peer's Certificate has expired.\n" +
    "gpg: no valid OpenPGP data found.\n";
  let response = GpgResponseParser.parse(errMsg);
  Assert.equal(response.status, "Connection Error");
});

test(function testRegisteringFetchError() {
  let errMsg = "[GNUPG:] FAILURE recv-keys KEYID\n" +
    "gpg: keyserver receive failed: Network is unreachable\n";
  let response = GpgResponseParser.parse(errMsg);
  Assert.equal(response.status, "Connection Error");
});

test(function testRegisteringFetchError() {
  let errMsg = "[GNUPG:] FAILURE recv-keys KEYID\n" +
    "gpg: keyserver receive failed: Connection refused\n";
  let response = GpgResponseParser.parse(errMsg);
  Assert.equal(response.status, "Connection Error");
});

//change to accommodate language
test(function testRegisteringUnchangedKeyError() {
  let errMsg = "gpg: requesting key KEYID from hkps server pgp.mit.edu\n" +
    "gpg: key KEYID: KEYOWNER <KEYOWNER@EMAIL> not changed\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:              unchanged: 1\n";
  let response = GpgResponseParser.parse(errMsg);
  Assert.equal(response.status, "Key not changed");
});

//change to accommodate language
test(function testRegisteringSuccessfulNewImport() {
  let importSuccessMsg = "gpg: requesting key KEYID from hkps server pgp.mit.edu\n" +
    "gpg: key KEYID: public key KEYOWNER <KEYOWNER@EMAIL> imported\n" +
    "gpg: 3 marginal(s) needed, 1 complete(s) needed, PGP trust model\n" +
    "gpg: depth: 0  valid:   2  signed:   0  trust: 0-, 0q, 0n, 0m, 0f, 2u\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:               imported: 1  (RSA: 1)\n";
  let response = GpgResponseParser.parse(importSuccessMsg);
  Assert.equal(response.status, "Success");
});

