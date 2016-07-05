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

function getRequestAction(actionFlags, keys) {
  if (actionFlags & Ci.nsIEnigmail.DOWNLOAD_KEY) { return ['--recv-keys'].concat(keys); }
  if (actionFlags & Ci.nsIEnigmail.SEARCH_KEY) { return ['--search-keys'].concat(keys); }
  if (actionFlags & Ci.nsIEnigmail.UPLOAD_KEY) { return ['--send-keys'].concat(keys); }
  if (actionFlags & Ci.nsIEnigmail.REFRESH_KEY) { return ['--refresh-keys']; }
  return null;
}

function getInputData(actionFlags) {
  if (actionFlags & Ci.nsIEnigmail.SEARCH_KEY) {return 'quit\n';}
  return null;
}

function gpgRequestOverTor(keyId, uri, torProperties, action) {
  let result = { envVars: torProperties.envVars, usingTor: true };

  if (torProperties.command === 'gpg') {
    result.command =  EnigmailGpgAgent.agentPath;
    result.args = requestArgsBuilder.init()
      .withStandardArgs(action)
      .withKeyserver(uri)
      .withTorProxy(torProperties.args)
      .withAction(action, keyId)
      .get();
  } else {
    result.command = resolvePath(torProperties.command);
    result.args = requestArgsBuilder.init()
      .withTorArgs(torProperties.args)
      .withStandardArgs(action)
      .withKeyserver(uri)
      .withAction(action, keyId)
      .get();
  }
  return result;
}

function buildProxyInfo(httpProxy, uri) {
  const proxyHost = httpProxy.getHttpProxy(uri.keyserverName);
  if (proxyHost !== null) {
    return ["--keyserver-options", "http-proxy=" + proxyHost];
  }
  return [];
}

function buildStandardArgs(action) {
  if (action & Ci.nsIEnigmail.SEARCH_KEY) {
    return EnigmailGpg.getStandardArgs(false).concat(["--command-fd", "0", "--fixed-list", "--with-colons"]);
  }
  return EnigmailGpg.getStandardArgs(true);
}

const requestArgsBuilder = {
  init: function() {
    this.args = [];
    return this;
  },
  withStandardArgs: function(action) {
    this.args = this.args.concat(buildStandardArgs(action));
    return this;
  },
  withKeyserver: function(uri) {
    this.args = this.args.concat(['--keyserver', uri]);
    return this;
  },
  withHttpProxy: function(httpProxy, uri) {
    this.args = this.args.concat(buildProxyInfo(httpProxy, uri));
    return this;
  },
  withTorArgs: function(args) {
    this.args = this.args.concat(args);
    return this;
  },
  withTorProxy: function(proxyInfo) {
    this.args = this.args.concat(["--keyserver-options", "http-proxy=" + proxyInfo]);
    return this;
  },
  withAction: function(action, keys) {
    this.args = this.args.concat(getRequestAction(action, keys));
    return this;
  },
  get: function() {
    return this.args;
  }
};

function gpgRequest(keyId, uri, httpProxy, action) {
  const args = requestArgsBuilder.init()
    .withStandardArgs(action)
    .withHttpProxy(httpProxy, uri)
    .withKeyserver(uri)
    .withAction(action, keyId)
    .get();

  return {
    command: EnigmailGpgAgent.agentPath,
    usingTor: false,
    args: args,
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

// TODO maybe this should be in tor
const TOR_USER_PREFERENCES= {
  DOWNLOAD:{requires: "downloadKeyRequireTor", uses: "downloadKeyWithTor", constant: Ci.nsIEnigmail.DOWNLOAD_KEY},
  SEARCH: {requires: "searchKeyRequireTor", uses: "searchKeyWithTor", constant: Ci.nsIEnigmail.SEARCH_KEY},
  UPLOAD: {requires: "uploadKeyRequireTor", uses: "uploadKeyWithTor", constant: Ci.nsIEnigmail.UPLOAD_KEY},
  REFRESH: {requires: "refreshKeyRequireTor", uses: "refreshKeyWithTor", constant: Ci.nsIEnigmail.REFRESH_KEY}
};

function getUserTorPrefs(actionFlags, isRequired) {
  for (let key in TOR_USER_PREFERENCES) {
    if (TOR_USER_PREFERENCES[key].constant & actionFlags) {
      if (isRequired) {
        const prefName = TOR_USER_PREFERENCES[key].requires;
        return EnigmailPrefs.getPref(prefName);
      }
      const prefName = TOR_USER_PREFERENCES[key].uses;
      return EnigmailPrefs.getPref(prefName);
    }
  }
  return false;
}

function buildRefreshRequests(keyId, tor, httpProxy) {
  const torProperties = tor.torProperties();
  const refreshAction = Ci.nsIEnigmail.DOWNLOAD_KEY;

  if (getUserTorPrefs(refreshAction, true)) {
    if (!torProperties.torExists) {
      EnigmailLog.CONSOLE("Unable to refresh key because Tor is required but not available.\n");
      return [];
    }
    return buildManyRequests(gpgRequestOverTor, keyId, torProperties, refreshAction);
  }

  if (getUserTorPrefs(refreshAction, false) && torProperties.torExists === true) {
    const torRequests = buildManyRequests(gpgRequestOverTor, keyId, torProperties, refreshAction);
    const regularRequests = buildManyRequests(gpgRequest, keyId, httpProxy, refreshAction);
    return torRequests.concat(regularRequests);
  }
  return buildManyRequests(gpgRequest, keyId, httpProxy, refreshAction);
}

function stringContains(stringToCheck, substring) {
  return stringToCheck.indexOf(substring) > -1;
}

function executeRefresh(request, subproc) {
  EnigmailLog.CONSOLE("Refreshing over Tor: " + request.usingTor + " using: " + request.command.path + "\n\n");

  let stdout = '';
  let stderr = '';

  const listener = {
    done: function(exitCode) {
      EnigmailLog.CONSOLE("Refreshed successfully: " + successful + ", with Exit Code: "+ exitCode +"\n\n");
    },
    stderr: function(data) {
      if (data !== "") { EnigmailLog.CONSOLE("stderr: " + data);}
      stderr += data;
    },
    stdout: function(data) {
      if (data !== "") { EnigmailLog.CONSOLE("stdout: " + data);}
      stdout += data;
    }
  };
  const proc = execute(request, listener, subproc);
  proc.wait();
  const successful = stringContains(stderr, "IMPORT_OK");
  return successful;
}

function convertRequestArgsToStrings(args) {
  for (let i=0; i<args.length; i++) {
    if (typeof args[i] !== 'string') {
      args[i] = args[i].toString();
    }
  }
  return args;
}

function execute(request, listener, subproc) {
  EnigmailLog.CONSOLE("enigmail> " + EnigmailFiles.formatCmdLine(request.command, request.args) + "\n");

  let envVars = request.envVars.concat(EnigmailCore.getEnvList());

  let exitCode = null;
  let proc = null;
  try {
    proc = subproc.call({
      command: request.command,
      arguments: convertRequestArgsToStrings(request.args),
      environment: envVars,
      charset: null,
      stdin: request.inputData,
      done: function(result) {
        try {
          if (result.exitCode === 0 && request.isDownload) {
            EnigmailKeyRing.clearCache();
          }
          if (exitCode === null) {
            exitCode = result.exitCode;
          }
          listener.done(exitCode);
        }
        catch (ex) {
          EnigmailLog.ERROR("keyserver.jsm: execute: subprocess.call failed at finish with '" + ex.toString() + "'\n");
        }
      },
      stdout: function(data) {
        listener.stdout(data);
      },
      stderr: function(data) {
        if (data.search(/^\[GNUPG:\] ERROR/m) >= 0) {
          exitCode = 4;
        }
        listener.stderr(data);
      },
      mergeStderr: false
    });
  } catch (ex) {
    EnigmailLog.ERROR("keyserver.jsm: execute: subprocess.call failed with '" + ex.toString() + "'\n");
    throw ex;
  }

  if (proc === null) {
    EnigmailLog.ERROR("keyserver.jsm: execute: subprocess failed due to unknown reasons\n");
  }
  return proc;
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
  const request = build(actionFlags, keyserver, searchTerms, errorMsgObj, EnigmailHttpProxy);
  if (request === null) return null;
  return execute(request, listener, subprocess);
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

function refresh(keyId){
  EnigmailLog.WRITE("[KEYSERVER]: Trying to refresh key: " + keyId + " at time: " + new Date().toUTCString()+ "\n");
  const requests = buildRefreshRequests(keyId, EnigmailTor, EnigmailHttpProxy);
  for (let i=0; i<requests.length; i++) {
    if (executeRefresh(requests[i], subprocess) === true) return;
  }
}

const EnigmailKeyServer= {
  access: access,
  refresh: refresh
};
