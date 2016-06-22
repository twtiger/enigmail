/* global do_load_module: false, do_get_cwd: false, testing: false, test: false, Assert:false */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js");

testing("gpgResponseParser.jsm"); /* global GpgResponseParser:false */

test(function testRegisteringGeneralError() {
  const response = GpgResponseParser.isErrorResponse("gpg: keyserver receive failed: General error\n");

  Assert.equal(response, true);
});

test(function testRegisteringFetchError() {
  const response = GpgResponseParser.isErrorResponse("gpg: requesting key KEYID from hkps server keys.gnupg.net\n" +
    "gpgkeys: HTTP fetch error 60: Peer's Certificate has expired.\n" +
    "gpg: no valid OpenPGP data found.\n");

  Assert.equal(response, true);
});

test(function testRegisteringFetchError() {
  const response = GpgResponseParser.isErrorResponse("[GNUPG:] FAILURE recv-keys KEYID\n" +
    "gpg: keyserver receive failed: Network is unreachable\n");

  Assert.equal(response, true);
});

test(function testRegisteringFetchError() {
  const response = GpgResponseParser.isErrorResponse("[GNUPG:] FAILURE recv-keys KEYID\n" +
    "gpg: keyserver receive failed: Connection refused\n");

  Assert.equal(response, true);
});

//change to accommodate language
test(function testRegisteringUnchangedKeyError() {
  const response = GpgResponseParser.isErrorResponse("gpg: requesting key KEYID from hkps server pgp.mit.edu\n" +
    "gpg: key KEYID: KEYOWNER <KEYOWNER@EMAIL> not changed\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:              unchanged: 1\n");

  Assert.equal(response, false);
});

//change to accommodate language
test(function testRegisteringSuccessfulNewImport() {
  const response = GpgResponseParser.isErrorResponse("gpg: requesting key KEYID from hkps server pgp.mit.edu\n" +
    "gpg: key KEYID: public key KEYOWNER <KEYOWNER@EMAIL> imported\n" +
    "gpg: 3 marginal(s) needed, 1 complete(s) needed, PGP trust model\n" +
    "gpg: depth: 0  valid:   2  signed:   0  trust: 0-, 0q, 0n, 0m, 0f, 2u\n" +
    "gpg: Total number processed: 1\n" +
    "gpg:               imported: 1  (RSA: 1)\n");

  Assert.equal(response, false);
});

