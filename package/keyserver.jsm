/* global Components:false */
"use strict";

var EXPORTED_SYMBOLS = ["EnigmailKeyServer"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://enigmail/subprocess.jsm"); /*global subprocess: false */
Cu.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Cu.import("resource://enigmail/files.jsm"); /*global EnigmailFiles: false */
Cu.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */
Cu.import("resource://enigmail/gpgAgent.jsm"); /*global EnigmailGpgAgent: false */
Cu.import("resource://enigmail/gpg.jsm"); /*global EnigmailGpg: false */
Cu.import("resource://enigmail/httpProxy.jsm"); /*global EnigmailHttpProxy: false */
Cu.import("resource://enigmail/core.jsm"); /*global EnigmailCore: false */
Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Cu.import("resource://enigmail/tor.jsm"); /*global EnigmailTor: false */
Cu.import("resource://enigmail/locale.jsm"); /*global EnigmailLocale: false */
Cu.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Cu.import("resource://enigmail/executableEvaluator.jsm"); /* global ExecutableEvaluator: false */
Cu.import("resource://enigmail/keyserverUris.jsm"); /*global KeyserverURIs: false */

function resolvePath(executable) {
  return ExecutableEvaluator.findExecutable(executable);
}

function buildReceiveRequest(keys) {
  return ['--recv-keys'].concat(keys);
}

function buildSearchRequest(keys) {
  return ['--search-keys'].concat(keys);
}

function buildUploadRequest(keys) {
  return ['--send-keys'].concat(keys);
}

function buildRefreshRequest(keys) {
  return ['--refresh-keys'];
}

function getRequestActionBuilder(actionFlags) {
  if (actionFlags & Ci.nsIEnigmail.DOWNLOAD_KEY) {return buildReceiveRequest;}
  if (actionFlags & Ci.nsIEnigmail.SEARCH_KEY) {return buildSearchRequest;}
  if (actionFlags & Ci.nsIEnigmail.UPLOAD_KEY) {return buildUploadRequest;}
  if (actionFlags & Ci.nsIEnigmail.REFRESH_KEY) {return buildRefreshRequest;}
  return null;
}

// TODO this needs to be added to Tor requests in extending to other actions
function getInputData(actionFlags) {
  if (actionFlags & Ci.nsIEnigmail.SEARCH_KEY) {return 'quit\n';}
  return null;
}

function gpgRequestOverTor(keyId, uri, torProperties, action) {
  let standardArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', uri]);
  let result = { envVars: torProperties.envVars, usingTor: true };
  const requestActionBuilder = getRequestActionBuilder(action);

  if (torProperties.command === 'gpg') {
    result.command =  EnigmailGpgAgent.agentPath;
    result.args = standardArgs.concat(buildProxyInfo(torProperties.args)).concat(requestActionBuilder(keyId));
  } else {
    result.command = resolvePath(torProperties.command);
    let torHelperArgs = standardArgs.concat(requestActionBuilder(keyId));
    result.args = torProperties.args.concat(torHelperArgs);
  }
  return result;
}

function buildProxyInfo(proxyInfo) {
  return ["--keyserver-options", "http-proxy=" + proxyInfo];
}

function buildStandardArgs(action) {
  if (action & Ci.nsIEnigmail.SEARCH_KEY) {
    return EnigmailGpg.getStandardArgs(false).concat(["--command-fd", "0", "--fixed-list", "--with-colons"]);
  }
  return EnigmailGpg.getStandardArgs(true);
}

function createArgsForNormalRequests(keyId, uri, httpProxy, action) {
  const proxyHost = httpProxy.getHttpProxy(uri.keyserverName);

  let args = buildStandardArgs(action);
  if (proxyHost) {
    args = args.concat(buildProxyInfo(proxyHost));
  }
  return args.concat(['--keyserver', uri]);
}

function gpgRequest(keyId, uri, httpProxy, action) {
  const requestActionBuilder = getRequestActionBuilder(action);

  let refreshArgs = createArgsForNormalRequests(keyId, uri, httpProxy, action);
  refreshArgs = refreshArgs.concat(requestActionBuilder(keyId));
  return {
    command: EnigmailGpgAgent.agentPath,
    usingTor: false,
    args: refreshArgs,
    inputData: getInputData(action),
    envVars: []
  };
}

function buildManyRequests(requestBuilder, keyId, proxyInfo, action) {
  const requests = [];
  KeyserverURIs.prioritiseEncryption().forEach(function(uri) {
    requests.push(buildRequest(requestBuilder, keyId, proxyInfo, action, uri));
  });
  return requests;
}

function buildRequest(requestBuilder, keyId, proxyInfo, actionFlags, keyserver) {
  let request = requestBuilder(keyId, keyserver, proxyInfo, actionFlags);
  const isDownload = actionFlags & (Ci.nsIEnigmail.REFRESH_KEY | Ci.nsIEnigmail.DOWNLOAD_KEY);
  request.isDownload = isDownload;
  return request;
}

// TODO this should probably be in tor
const TOR_USER_PREFERENCES= {
  DOWNLOAD:{requires: "downloadKeyRequireTor", uses: "downloadKeyWithTor", constant: Ci.nsIEnigmail.DOWNLOAD_KEY},
  SEARCH: {requires: "searchKeyRequireTor", uses: "searchKeyWithTor", constant: Ci.nsIEnigmail.SEARCH_KEY},
  UPLOAD: {requires: "uploadKeyRequireTor", uses: "uploadKeyWithTor", constant: Ci.nsIEnigmail.UPLOAD_KEY},
  REFRESH: {requires: "refreshKeyRequireTor", uses: "refreshKeyWithTor", constant: Ci.nsIEnigmail.REFRESH_KEY}
};

// TODO this could be collapsed with userWantsTor, with required maybe set as a boolean
function userRequiresTor(actionFlags) {
  for (let key in TOR_USER_PREFERENCES) {
    if (TOR_USER_PREFERENCES[key].constant & actionFlags) {
      const pref = TOR_USER_PREFERENCES[key].requires;
      return EnigmailPrefs.getPref(pref) === true;
    }
  }
  return null;
}

// TODO this should probably be in tor
function userWantsTor(actionFlags) {
  for (let key in TOR_USER_PREFERENCES) {
    if (TOR_USER_PREFERENCES[key].constant & actionFlags) {
      const pref = TOR_USER_PREFERENCES[key].uses;
      return EnigmailPrefs.getPref(pref) === true;
    }
  }
  return null;
}

function buildRefreshRequests(keyId, tor, httpProxy) {
  const torProperties = tor.torProperties();
  const refreshAction = Ci.nsIEnigmail.DOWNLOAD_KEY;

  if (userRequiresTor(refreshAction)) {
    if (!torProperties.torExists) {
      EnigmailLog.CONSOLE("Unable to refresh key because Tor is required but not available.\n");
      return [];
    }
    return buildManyRequests(gpgRequestOverTor, keyId, torProperties, refreshAction);
  }

  if (userWantsTor(refreshAction) && torProperties.torExists === true) {
    const torRequests = buildManyRequests(gpgRequestOverTor, keyId, torProperties, refreshAction);
    const regularRequests = buildManyRequests(gpgRequest, keyId, httpProxy, refreshAction);
    return torRequests.concat(regularRequests);
  }
  return buildManyRequests(gpgRequest, keyId, httpProxy, refreshAction);
}

function contains(superSet, subSet) {
  return superSet.indexOf(subSet) > -1;
}

function execute(request, subproc) {
  EnigmailLog.CONSOLE("Refreshing over Tor: " + request.usingTor + " using: " + request.command.path + "\n");

  function convertRequestArgsToStrings(args) {
    for (let i=0; i<args.length; i++) {
      if (typeof args[i] !== 'string') {
        args[i] = args[i].toString();
      }
    }
    return args;
  }

  EnigmailLog.CONSOLE("enigmail> " + EnigmailFiles.formatCmdLine(request.command, request.args) + "\n");

  let stdout = '';
  let stderr = '';
  let successful = false;
  let envVars = request.envVars.concat(EnigmailCore.getEnvList());

  let proc = subproc.call({
    command: request.command,
    arguments: convertRequestArgsToStrings(request.args),
    environment: envVars,
    charset: null,
    stdin: null,
    done: function(result) {
      successful = contains(stderr, "IMPORT_OK");
      EnigmailLog.CONSOLE("Refreshed successfully: " + successful + ", with Exit Code: "+ result.exitCode +"\n\n");
    },
    stdout: function(data) {
      stdout += data;
      EnigmailLog.CONSOLE("stdout: "+ data);
    },
    stderr: function(data) {
      stderr += data;
      EnigmailLog.CONSOLE("stderr: "+ data);
    }
  }).wait();

  return successful;
}

/**
 * search, download or upload key on, from or to a keyserver
 *
 * @actionFlags: Integer - flags (bitmap) to determine the required action
 *                         (see nsIEnigmail - Keyserver action flags for details)
 * @keyserver:   String  - keyserver URL (optionally incl. protocol)
 * @searchTerms: String  - space-separated list of search terms or key IDs
 * @listener:    Object  - execStart Listener Object. See execStart for details.
 * @errorMsgObj: Object  - object to hold error message in .value
 *
 * @return:      Subprocess object, or null in case process could not be started
 */
function access(actionFlags, keyserver, searchTerms, listener, errorMsgObj) {
  const request = build(keyserver, searchTerms, actionFlags, errorMsgObj, EnigmailHttpProxy);
  if (request === null) return null;
  return submit(request.args, request.inputData, listener, request.isDownload);
}

function build(actionFlags, keyserver, searchTerms, errorMsgObj, httpProxy) {
  let args = EnigmailGpg.getStandardArgs(true);

  if (!keyserver) {
    errorMsgObj.value = EnigmailLocale.getString("failNoServer");
    return null;
  }

  if (!searchTerms && !(actionFlags & Ci.nsIEnigmail.REFRESH_KEY)) {
    errorMsgObj.value = EnigmailLocale.getString("failNoID");
    return null;
  }
  const searchTermsList = searchTerms.split(" ");
  return buildRequest(gpgRequest, searchTermsList, httpProxy, actionFlags, keyserver.trim());
}

function submit(args, inputData, listener, isDownload) {
  EnigmailLog.CONSOLE("enigmail> " + EnigmailFiles.formatCmdLine(EnigmailGpgAgent.agentPath, args) + "\n");

  let proc = null;
  try {
    let exitCode = null;
    proc = subprocess.call(
      {
        command: EnigmailGpgAgent.agentPath,
        arguments: args,
        environment: EnigmailCore.getEnvList(),
        charset: null,
        stdin: inputData,
        stdout: function(data) {
          listener.stdout(data);
        },
        stderr: function(data) {
          if (data.search(/^\[GNUPG:\] ERROR/m) >= 0) {
            exitCode = 4;
          }
          listener.stderr(data);
        },
        done: function(result) {
          try {
            if (result.exitCode === 0 && isDownload) {
              EnigmailKeyRing.clearCache();
            }
            if (exitCode === null) {
              exitCode = result.exitCode;
            }
            listener.done(exitCode);
          }
          catch (ex) {}
        },
        mergeStderr: false
      });
  } catch (ex) {
    EnigmailLog.ERROR("keyserver.jsm: access: subprocess.call failed with '" + ex.toString() + "'\n");
    throw ex;
  }

  if (proc === null) {
    EnigmailLog.ERROR("keyserver.jsm: access: subprocess failed due to unknown reasons\n");
  }

  return proc;
}

const EnigmailKeyServer= {
  access: access,

  refresh: function(keyId) {
    EnigmailLog.WRITE("[KEYSERVER]: Trying to refresh key: " + keyId + " at time: " + new Date().toUTCString()+ "\n");

    const requests = buildRefreshRequests(keyId, EnigmailTor, EnigmailHttpProxy);
    for (let i=0; i<requests.length; i++) {
      if (execute(requests[i], subprocess) === true) return;
    }
  }
};
