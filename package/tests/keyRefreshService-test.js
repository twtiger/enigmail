/*global do_load_module: false, do_get_file: false, do_get_cwd: false, test: false, Assert: false, resetting: false */
/*global Cc: false, Ci: false, testing: false, component: false*/
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, assertLogContains: false, */

testing("keyRefreshService.jsm"); /*global startWith, ONE_HOUR_IN_MILLISEC, refreshWith, setupWith, KeyRefreshService: false, refreshKey: false, checkKeysAndRestart: false, getRandomKeyId: false */

component("enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
component("enigmail/log.jsm"); /*global EnigmailLog: false */
component("enigmail/files.jsm"); /*global EnigmailFiles: false */
component("enigmail/core.jsm"); /*global EnigmailCore: false */
component("enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
component("enigmail/randomNumber.jsm"); /*global RandomNumberGenerator: false */

function withKeys(f) {
  return function() {
    try{
      EnigmailKeyRing.clearCache();
      f();
    } finally {
      EnigmailKeyRing.clearCache();
    }
  };
}

const emptyFunction = function() {};

function importKeys() {
  const publicKey = do_get_file("resources/dev-tiger.asc", false);
  const anotherKey = do_get_file("resources/notaperson.asc", false);
  const strikeKey = do_get_file("resources/dev-strike.asc", false);
  EnigmailKeyRing.importKeyFromFile(publicKey, {}, {});
  EnigmailKeyRing.importKeyFromFile(anotherKey, {}, {});
  EnigmailKeyRing.importKeyFromFile(strikeKey, {}, {});
  return EnigmailKeyRing.getAllKeys().keyList.length;
}

function importOneKey() {
  EnigmailKeyRing.importKeyFromFile(do_get_file("resources/dev-strike.asc", false), {}, {});
  return EnigmailKeyRing.getAllKeys().keyList[0].keyId;
}

test(withTestGpgHome(withEnigmail(withKeys(function shouldBeAbleToGetAllKeyIdsFromKeyList(){
  importKeys();

  const publicKeyId = "8439E17046977C46";
  const anotherKeyId = "8A411E28A056E2A3";
  const strikeKeyId = "781617319CE311C4";

  Assert.equal(getRandomKeyId(0), publicKeyId);
  Assert.equal(getRandomKeyId(1), anotherKeyId);
  Assert.equal(getRandomKeyId(2), strikeKeyId);
  Assert.equal(getRandomKeyId(3), publicKeyId);
  Assert.equal(getRandomKeyId(4), anotherKeyId);

}))));

test(withTestGpgHome(withEnigmail(withKeys(function shouldGetDifferentRandomKeys() {
  importKeys();

  Assert.notEqual(getRandomKeyId(4), getRandomKeyId(5));
}))));

test(withTestGpgHome(withEnigmail(withKeys(function ifOnlyOneKey_shouldGetOnlyKey() {
  const expectedKeyId = importOneKey();

  Assert.equal(getRandomKeyId(100), expectedKeyId);
}))));

test(withTestGpgHome(withEnigmail(withKeys(function setupNextRefreshWithInjectedHelpers(){
  const expectedKeyId = importOneKey();
  const expectedRandomTime = RandomNumberGenerator.getUint32();
  const algorithm = {
    calculateWaitTimeInMillisecondsWasCalled: false,
    calculateWaitTimeInMilliseconds: function(totalPublicKeys) {
      Assert.equal(totalPublicKeys, 1);
      algorithm.calculateWaitTimeInMillisecondsWasCalled = true;
      return expectedRandomTime;
    }
  };
  const timer = {
    initWithCallbackWasCalled: false,
    initWithCallback: function(f, timeUntilNextRefresh, timerType) {
      Assert.equal(timeUntilNextRefresh, expectedRandomTime);
      Assert.equal(timerType, Ci.nsITimer.TYPE_ONE_SHOT);
      timer.initWithCallbackWasCalled = true;
    }
  };
  const keyserver = {
    refreshWasCalled: false,
    refresh: function(keyId) {
      Assert.equal(keyId, expectedKeyId);
      keyserver.refreshWasCalled = true;
    }
  };

  refreshWith(keyserver, timer, algorithm, emptyFunction);

  Assert.equal(algorithm.calculateWaitTimeInMillisecondsWasCalled, true, "algorithm.calculateWaitTimeInMilliseconds was not called");
  Assert.equal(keyserver.refreshWasCalled, true, "keyserver.refresh was not called");
  Assert.equal(timer.initWithCallbackWasCalled, true, "timer.initWithCallback was not called");
}))));

test(withTestGpgHome(withEnigmail(withKeys(function whenKeysExist_startRefreshService(){
  const expectedNumberOfKeys = importKeys();
  const expectedRandomTime = RandomNumberGenerator.getUint32();
  const algorithm = {
    calculateWaitTimeInMillisecondsWasCalled: false,
    calculateWaitTimeInMilliseconds: function(totalPublicKeys) {
      Assert.equal(totalPublicKeys, expectedNumberOfKeys);
      algorithm.calculateWaitTimeInMillisecondsWasCalled = true;
      return expectedRandomTime;
    }
  };
  const timer = {
    initWithCallbackWasCalled: false,
    initWithCallback: function(f, time, timerType) {
      Assert.equal(time, expectedRandomTime);
      Assert.equal(timerType, Ci.nsITimer.TYPE_ONE_SHOT);
      timer.initWithCallbackWasCalled = true;
    }
  };

  startWith(timer, algorithm);

  Assert.equal(algorithm.calculateWaitTimeInMillisecondsWasCalled, true, "algorithm.calculateWaitTimeInMilliseconds was not called");
  Assert.equal(timer.initWithCallbackWasCalled, true, "timer.initWithCallback was not called");
}))));

test(withTestGpgHome(withEnigmail(withKeys(function whenNoKeysExist_retryInOneHour(){
  const timer = {
    initWithCallbackWasCalled: false,
    initWithCallback: function(f, time, timerType) {
      Assert.equal(time, ONE_HOUR_IN_MILLISEC);
      Assert.equal(timerType, Ci.nsITimer.TYPE_ONE_SHOT);
      timer.initWithCallbackWasCalled = true;
    }
  };

  startWith(timer);

  Assert.equal(timer.initWithCallbackWasCalled, true, "timer.initWithCallback was not called");
  assertLogContains("[KEY REFRESH SERVICE]: No keys available to refresh yet. Will recheck in an hour.");
}))));

test(function ifKeyserverListIsEmpty_checkAgainInAnHour(){
  EnigmailPrefs.setPref("keyserver", " ");
  const timer = {
    initWithCallbackWasCalled: false,
    initWithCallback: function(f, time, timerType) {
      Assert.equal(time, ONE_HOUR_IN_MILLISEC);
      Assert.equal(timerType, Ci.nsITimer.TYPE_ONE_SHOT);
      timer.initWithCallbackWasCalled = true;
    }
  };

  startWith(timer);

  assertLogContains("[KEY REFRESH SERVICE]: No keyservers are available. Will recheck in an hour.");
  Assert.equal(timer.initWithCallbackWasCalled, true, "timer.initWithCallback was not called");
});
