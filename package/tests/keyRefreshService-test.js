/*global do_load_module: false, do_get_file: false, do_get_cwd: false, test: false, Assert: false, resetting: false */
/*global Cc: false, Ci: false, testing: false, component: false*/
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global withEnigmail: false, withTestGpgHome: false, withLogFiles: false, assertLogContains: false, */

testing("keyRefreshService.jsm"); /*global ONE_HOUR_IN_MILLISEC, refreshWith, checkKeysWith, setupWith, setupNextKeyRefresh:false, KeyRefreshService: false, refreshKey: false, checkKeysAndRestart: false, getRandomKeyId: false */

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

test(withTestGpgHome(withEnigmail(withKeys(function setupNextRefreshWithInjectedHelpers(){
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
    initWithCallback: function(f, timeUntilNextRefresh, timerType) {
      Assert.equal(timeUntilNextRefresh, expectedRandomTime);
      Assert.equal(timerType, Ci.nsITimer.TYPE_ONE_SHOT);
      timer.initWithCallbackWasCalled = true;
    }
  };
  const refreshFunction = function(){};

  setupWith(timer, algorithm, refreshFunction);

  Assert.equal(algorithm.calculateWaitTimeInMillisecondsWasCalled, true, "algorithm.calculateWaitTimeInMilliseconds was not called");
  Assert.equal(timer.initWithCallbackWasCalled, true, "timer.initWithCallback was not called");
}))));

test(withTestGpgHome(withEnigmail(withKeys(function setupNextRefreshWithInjectedHelpers(){
  const expectedKeyId = importOneKey();
  const keyserver = {
    refreshWasCalled: false,
    refresh: function(keyId) {
      Assert.equal(keyId, expectedKeyId);
      keyserver.refreshWasCalled = true;
    }
  };
  let setupFunctionWasCalled = false;
  const setupFunction = function() {
    setupFunctionWasCalled = true;
  };

  refreshWith(keyserver, setupFunction);

  Assert.equal(keyserver.refreshWasCalled, true, "keyserver.refresh was not called");
  Assert.equal(setupFunctionWasCalled, true, "setupFunction was not called");
}))));

test(withTestGpgHome(withEnigmail(withKeys(function ifNoKeysAvailable_setupCheckKeysWithInjectedHelpers(){
  EnigmailLog.setLogLevel(9000);
  EnigmailLog.DEBUG("totalKeys: " + EnigmailKeyRing.getAllKeys().keyList.length);
  EnigmailKeyRing.clearCache();
  const timer = {
    initWithCallbackWasCalled: false,
    initWithCallback: function(f, time, timerType) {
      Assert.equal(time, ONE_HOUR_IN_MILLISEC);
      Assert.equal(timerType, Ci.nsITimer.TYPE_ONE_SHOT);
      timer.initWithCallbackWasCalled = true;
    }
  };
  let checkLaterFunctionWasCalled = false;
  const checkLaterFunction = function() {
    checkLaterFunctionWasCalled = true;
  };
  let setupKeyRefreshFunctionWasCalled = false;
  const setupKeyRefreshFunction = function() {
    setupKeyRefreshFunctionWasCalled = true;
  };

  checkKeysWith(timer, setupKeyRefreshFunction, checkLaterFunction);

  Assert.equal(timer.initWithCallbackWasCalled, true, "timer.initWithCallback was not called");
  Assert.equal(checkLaterFunctionWasCalled, true, "checkLaterFunction was not called");
  Assert.equal(setupKeyRefreshFunctionWasCalled, false, "setupKeyRefreshFunction was called when it should NOT be");
}))));

test(withTestGpgHome(withEnigmail(withKeys(function whenKeysExist_startRefreshService(){
  importKeys();
  const timer = {
    initWithCallbackWasCalled: false,
    initWithCallback: function(f, time, timerType) {
      Assert.equal(time, ONE_HOUR_IN_MILLISEC);
      Assert.equal(timerType, Ci.nsITimer.TYPE_ONE_SHOT);
      timer.initWithCallbackWasCalled = true;
    }
  };
  let checkLaterFunctionWasCalled = false;
  const checkLaterFunction = function() {
    checkLaterFunctionWasCalled = true;
  };
  let setupKeyRefreshFunctionWasCalled = false;
  const setupKeyRefreshFunction = function() {
    setupKeyRefreshFunctionWasCalled = true;
  };

  checkKeysWith(timer, setupKeyRefreshFunction, checkLaterFunction);

  Assert.equal(timer.initWithCallbackWasCalled, false, "timer.initWithCallback was called when it should NOT be");
  Assert.equal(checkLaterFunctionWasCalled, false, "checkLaterFunction was called");
  Assert.equal(setupKeyRefreshFunctionWasCalled, true, "checkLaterFunction was not called");
}))));

test(withTestGpgHome(withEnigmail(withKeys(function shouldGetDifferentRandomKeys() {
  importKeys();

  Assert.notEqual(getRandomKeyId(4), getRandomKeyId(5));
}))));

test(withTestGpgHome(withEnigmail(withKeys(function ifOnlyOneKey_shouldGetOnlyKey() {
  const expectedKeyId = importOneKey();

  Assert.equal(getRandomKeyId(), expectedKeyId);
}))));

test(function ifKeyserverListIsEmpty_checkAgainInAnHour(){
  EnigmailPrefs.setPref("keyserver", " ");

  KeyRefreshService.start();

  assertLogContains("[KEY REFRESH SERVICE]: No keyservers are available. Did not start refresh service.");
});

test(withTestGpgHome(withEnigmail(withLogFiles(withKeys(function initializingWithoutKeysWillUpdateLog() {
  KeyRefreshService.start();

  assertLogContains("[KEY REFRESH SERVICE]: No keys available to refresh yet. Will recheck in an hour.");
})))));
