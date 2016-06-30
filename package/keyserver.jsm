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


const KEYSERVER_PREF = "keyserver";

function getKeyservers(){
  const keyservers = EnigmailPrefs.getPref(KEYSERVER_PREF).split(/\s*[,;]\s*/g);
  return EnigmailPrefs.getPref("autoKeyServerSelection") ? [keyservers[0]] : keyservers;
}

function isHkps(keyserver){
  return keyserver.protocol === "hkps";
}

function sortWithHkpsFirst(keyservers){
  EnigmailLog.DEBUG("--------keyservers: " + keyservers + "\n");
  return keyservers.sort(function(a, b){
    if (isHkps(b) && !isHkps(a)){
      return 1;
    }
    if (isHkps(a) && !isHkps(b)){
      return -1;
    }
    return 0;
  });
}



// TODO: TEST FOR UNKNOWN KEYSERVER CASE
function setUpStateForProtocolAndKeyserver(protocol, keyserver){
  const supportedProtocols = {
    "hkps": "443",
    "hkp": "11371",
    "ldap": "389"
  };

  const protocolAndKeyserver = keyserver.split("://");
  const protocolIncluded = protocolAndKeyserver.length === 2;

  if (protocolIncluded) {
    EnigmailLog.setLogLevel(2000);
    EnigmailLog.DEBUG("--------protocolAndKeyserverIn: " + protocol + " " + keyserver + "\n");
    protocol = protocolAndKeyserver[0];
    keyserver = protocolAndKeyserver[1];
    const port = supportedProtocols[protocol];
    return { protocol: protocol, keyserverName: keyserver, port: port};
  }
    EnigmailLog.DEBUG("--------protocolAndKeyserverOut: " + protocol + " " + keyserver + "\n");
    return { protocol: protocol, keyserverName: keyserver, port: supportedProtocols[protocol]};
}

function setUpStateForHkpProtocolAndKeyserver(keyserver){
    return { protocol: "hkp", keyserverName: keyserver, port: "11371"};
}

function organizeProtocols() {
  const keyservers = getKeyservers();
  let states = [];
  for (let i=0; i < keyservers.length; i++) {
    states.push(setUpStateForProtocolAndKeyserver("hkps", keyservers[i]));
  }
  for (let i=0; i < keyservers.length; i++) {
    const protocolAndKeyserver = keyservers[i].split("://");
    const protocolIncluded = protocolAndKeyserver.length === 2;
    if (!protocolIncluded){
      states.push(setUpStateForHkpProtocolAndKeyserver(keyservers[i]));
    }
  }
  states = sortWithHkpsFirst(states);
  return states;
}

function resolvePath(executable) {
  return ExecutableEvaluator.executor.findExecutable(executable);
}

function requestWithTor(torProperties, keyId, protocol) {
  let standardArgs = EnigmailGpg.getStandardArgs(true).concat(['--keyserver', getKeyserverAddress(protocol)]);
  let result = { envVars: torProperties.envVars, usingTor: true };

  if (torProperties.command === 'gpg') {
    result.command =  EnigmailGpgAgent.agentPath;
    result.args = standardArgs.concat(torProperties.args).concat(['--recv-keys', keyId]);
  } else {
    result.command = resolvePath(torProperties.command);
    let torHelperArgs = standardArgs.concat(['--recv-keys', keyId]);
    result.args = torProperties.args.concat(torHelperArgs);
  }
  return result;
}

function getKeyserverAddress(protocol) {
  return protocol.protocol + "://" + protocol.keyserverName + ":" + protocol.port;
}

function createRefreshKeyArgsForNormalRequests(keyId, protocol, httpProxy) {
  const proxyHost = httpProxy.getHttpProxy(protocol.keyserverName);
  let args = EnigmailGpg.getStandardArgs(true);
  if (proxyHost) {
    args = args.concat(["--keyserver-options", "http-proxy=" + proxyHost]);
  }
  return args.concat(['--keyserver', getKeyserverAddress(protocol)]).concat(['--recv-keys', keyId]);
}

function buildNormalRequest(refreshKeyArgs) {
  return {
    command: EnigmailGpgAgent.agentPath,
    usingTor: false,
    args: refreshKeyArgs,
    envVars: []
  };
}

function buildRefreshRequests(keyId, tor, httpProxy) {
  const torProperties = tor.torProperties(Ci.nsIEnigmail.DOWNLOAD_KEY);

  if (!torProperties.torExists && tor.userRequiresTor(Ci.nsIEnigmail.DOWNLOAD_KEY)) {
    EnigmailLog.CONSOLE("Unable to refresh key because Tor is required but not available.\n");
    return [];
  }

  const protocols = organizeProtocols();
  const requests = [];

  // TODO we could build everything, and then sort at the end
  if (torProperties.torExists === true)  {
    for (let i=0; i<protocols.length; i++) {
      requests.push(requestWithTor(torProperties, keyId, protocols[i]));
    }
  }

  for (let i=0; i<protocols.length; i++) {
    if (!tor.userRequiresTor(Ci.nsIEnigmail.DOWNLOAD_KEY)) {
      const refreshArgs = createRefreshKeyArgsForNormalRequests(keyId, protocols[i], httpProxy);
      requests.push(buildNormalRequest(refreshArgs));
    }
  }

  return requests;
}

function contains(superSet, subSet) {
  return superSet.indexOf(subSet) > -1;
}

function executesSuccessfully(request, subproc) {
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

  subproc.call({
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
  let args = EnigmailGpg.getStandardArgs(true);

  if (!keyserver) {
    errorMsgObj.value = EnigmailLocale.getString("failNoServer");
    return null;
  }

  if (!searchTerms && !(actionFlags & Ci.nsIEnigmail.REFRESH_KEY)) {
    errorMsgObj.value = EnigmailLocale.getString("failNoID");
    return null;
  }

  if (actionFlags & Ci.nsIEnigmail.SEARCH_KEY) {
    args = EnigmailGpg.getStandardArgs(false).
      concat(["--command-fd", "0", "--fixed-list", "--with-colons"]);
  }

  const proxyHost = EnigmailHttpProxy.getHttpProxy(keyserver);
  if (proxyHost) {
    args = args.concat(["--keyserver-options", "http-proxy=" + proxyHost]);
  }

  args = args.concat(["--keyserver", keyserver.trim()]);

  let inputData = null;
  const searchTermsList = searchTerms.split(" ");

  if (actionFlags & Ci.nsIEnigmail.DOWNLOAD_KEY) {
    args.push("--recv-keys");
    args = args.concat(searchTermsList);
  }
  else if (actionFlags & Ci.nsIEnigmail.REFRESH_KEY) {
    args.push("--refresh-keys");
  }
  else if (actionFlags & Ci.nsIEnigmail.SEARCH_KEY) {
    args.push("--search-keys");
    args = args.concat(searchTermsList);
    inputData = "quit\n";
  }
  else if (actionFlags & Ci.nsIEnigmail.UPLOAD_KEY) {
    args.push("--send-keys");
    args = args.concat(searchTermsList);
  }

  const isDownload = actionFlags & (Ci.nsIEnigmail.REFRESH_KEY | Ci.nsIEnigmail.DOWNLOAD_KEY);

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
    const orderedRequests = buildRefreshRequests(keyId, EnigmailTor, EnigmailHttpProxy);
    for (let i=0; i<orderedRequests.length; i++) {
      if (executesSuccessfully(orderedRequests[i], subprocess) === true) break;
    }
  }
};
