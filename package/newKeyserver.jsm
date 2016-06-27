/* global Components:false */
"use strict";

var EXPORTED_SYMBOLS = ["NewKeyserver"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://enigmail/subprocess.jsm"); /*global subprocess: false */
Cu.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Cu.import("resource://enigmail/files.jsm"); /*global EnigmailFiles: false */
Cu.import("resource://enigmail/os.jsm"); /*global EnigmailOS: false */
Cu.import("resource://enigmail/gpgAgent.jsm"); /*global EnigmailGpgAgent: false */
Cu.import("resource://enigmail/gpg.jsm"); /*global EnigmailGpg: false */
Cu.import("resource://enigmail/core.jsm"); /*global EnigmailCore: false */
Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Cu.import("resource://enigmail/tor.jsm"); /*global EnigmailTor: false */

const KEYSERVER_PREF = "keyserver";

function getKeyservers(){
  const keyservers = EnigmailPrefs.getPref(KEYSERVER_PREF).split(/\s*[,;]\s*/g);
  return EnigmailPrefs.getPref("autoKeyServerSelection") ? [keyservers[0]] : keyservers;
}

function getProtocolAndKeyserver(keyserverInput){
  return keyserverInput.split("://");
}

function protocolIncluded(keyserverInput){
  return (getProtocolAndKeyserver(keyserverInput).length === 2) ? true : false;
}

function isHkpsOrEmpty(keyserverInput){
  return (protocolIncluded(keyserverInput) === false || getProtocolAndKeyserver(keyserverInput)[0] === "hkps") ? true : false;
}

function sortKeyserversWithHkpsFirst(keyservers){
  return keyservers.sort(function(a, b){
    if (isHkpsOrEmpty(b) && !isHkpsOrEmpty(a)){
      return 1;
    }
    if (isHkpsOrEmpty(a) && !isHkpsOrEmpty(b)){
      return -1;
    }
    return 0;
  });
}

function setUpStateForProtocolAndKeyserver(protocol, keyserver){
  if (protocolIncluded(keyserver) === true){
    const protocolAndKeyserver = getProtocolAndKeyserver(keyserver);
    protocol = protocolAndKeyserver[0];
    keyserver = protocolAndKeyserver[1];
  }
  return { protocol: protocol, keyserverName: keyserver };
}


function organizeProtocols() {
  const keyservers = sortKeyserversWithHkpsFirst(getKeyservers());
  const states = [];
  for (let i=0; i < keyservers.length; i++) {
    states.push(setUpStateForProtocolAndKeyserver("hkps", keyservers[i]));
  }
  for (let i=0; i < keyservers.length; i++) {
    if (protocolIncluded(keyservers[i]) === false){
      states.push(setUpStateForProtocolAndKeyserver('hkp', keyservers[i]));
    }
  }
  return states;
}

let environment = null;
function resolvePath(executable) {
  if (environment === null) environment = Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);
  return EnigmailFiles.resolvePath(executable, environment.get("PATH"), EnigmailOS.isDosLike());
}

function requestWithTor(torProperties, refreshKeyArgs) {
  return {
    command: torProperties.command === 'gpg' ? EnigmailGpgAgent.agentPath : resolvePath(torProperties.command),
    args: torProperties.args.concat(refreshKeyArgs)
  };
}

// TODO: TEST FOR UNKNOWN KEYSERVER CASE
function getKeyserverAddress(protocol) {
  if (protocol.protocol === "hkps") {
    return "hkps://" + protocol.keyserverName + ":443";
  } if (protocol.protocol === "hkp") {
    return "hkp://" + protocol.keyserverName + ":11371";
  } if (protocol.protocol === "ldap") {
    return "ldap://" + protocol.keyserverName + ":389";
  }
  return '';
}

function createRefreshKeyArgs(keyId, protocol) {
  return EnigmailGpg.getStandardArgs(true).concat(['--keyserver', getKeyserverAddress(protocol)]).concat(['--recv-keys', keyId]);
}

function normalRequest(refreshKeyArgs) {
  return {
    command: EnigmailGpgAgent.agentPath,
    args: refreshKeyArgs
  };
}

function desparateRequest(keyId, protocol) {
  return {
    command: EnigmailGpgAgent.agentPath,
    args: EnigmailGpg.getStandardArgs(true).concat(['--keyserver', 'hkp://'+protocol.keyserverName+':11371']).concat(['--recv-keys', keyId])
  };
}

function setupKeyserverRequests(keyId, tor) {
  const torProperties = tor.torProperties(Ci.nsIEnigmail.DOWNLOAD_KEY);
  const protocols = organizeProtocols();

  if (torProperties.torExists == false
    && tor.userRequiresTor(Ci.nsIEnigmail.DOWNLOAD_KEY)) return [];

  const requests = [];
  for (let i=0; i<protocols.length; i++) {
    const refreshKeyArgs = createRefreshKeyArgs(keyId, protocols[i]);
    if (torProperties.torExists === true)  {
      requests.push(requestWithTor(torProperties, refreshKeyArgs));
    } else {
      requests.push(normalRequest(refreshKeyArgs));
    }
  }

  if (torProperties.torExists === true)
    requests.push(desparateRequest(keyId, protocols[0]));

  return requests;
}

function contains(superSet, subSet) {
  return superSet.indexOf(subSet) > -1;
}

function executesSuccessfully(request, subproc) {
  EnigmailLog.CONSOLE("enigmail> " + EnigmailFiles.formatCmdLine(request.command, request.args) + "\n");

  let stdout = '';
  let stderr = '';
  let successful = false;
  subproc.call({
    command: request.command,
    arguments: request.args,
    environment: EnigmailCore.getEnvList(),
    charset: null,
    stdin: null,
    done: function(result) {
      // TODO: NEED TO LOCALIZE THIS
      successful = contains(stderr, "not changed")
        || contains(stderr, "imported")
        && !contains(stderr, "fetch error")
        && !contains(stderr, "Network is unreachable")
        && !contains(stderr, "Connection refused")
        && !contains(stderr, "General error")
        && !contains(stderr, "Configuration error");
      EnigmailLog.CONSOLE("done: Exit Code "+ result.exitCode +"\n");
    },
    stdout: function(data) {
      stdout += data;
      EnigmailLog.CONSOLE("stdout: "+ data +"\n");
    },
    stderr: function(data) {
      stderr += data;
      EnigmailLog.CONSOLE("stderr: "+ data +"\n");
    }
  }).wait();

  return successful;
}

const NewKeyserver = {
  refresh: function(keyId) {
    const orderedRequests = setupKeyserverRequests(keyId, EnigmailTor);
    for (let i=0; i<orderedRequests.length; i++) {
      if (executesSuccessfully(orderedRequests[i], subprocess) === true) break;
    }
  }
};
