/* global test: false, do_load_module: false, do_get_cwd: false */
"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js");

testing("randomNumber.jsm"); /* global RandomNumberGenerator: false, testing: false, Assert: false, bytesToUInt: false */

test(function testConversionFromByteObjectToUnsignedInteger(){
  // 1100 1110 0000 1001 1100 0111 1101 1111
  let expected = 3456747487;
  let byteObject = {
    0:206, // 1100 1110
    1:9,   // 0000 1001
    2:199, // 1100 0111
    3:223  // 1101 1111
  };

  Assert.equal(bytesToUInt(byteObject), expected);
});

test(function getDifferentUint32(){
  Assert.notEqual(RandomNumberGenerator.getUint32(), RandomNumberGenerator.getUint32());
});
