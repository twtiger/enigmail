"use strict";

/*global Components: false */
Components.utils.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */

const EXPORTED_SYMBOLS = ["GpgResponseParser"];

function contains(superSet, subSet) {
  return superSet.indexOf(subSet) > -1;
}

function isErrorResponse(message, keyId, protocol, keyserverName) {
  if (contains(message, "fetch error") || contains(message, "Network is unreachable") || contains(message, "Connection refused")) {
    EnigmailLog.ERROR(protocol + " key request for Key ID: " + keyId + " at keyserver: " + keyserverName + " fails with: Connection Error\n");
    return true;
  } else if (contains(message, "General error")) {
    EnigmailLog.ERROR(protocol + " key request for Key ID: " + keyId + " at keyserver: " + keyserverName + " fails with: General Error\n");
    return true;
  } else if (contains(message, "not changed")) {
    EnigmailLog.WRITE("keyserver.jsm: Key ID " + keyId + " is the most up to date\n");
    return false;
  }

  EnigmailLog.WRITE("keyserver.jsm: Key ID " + keyId + " successfully imported from keyserver " + keyserverName + "\n");
  return false;
}

const GpgResponseParser = {
  isErrorResponse: isErrorResponse
};
