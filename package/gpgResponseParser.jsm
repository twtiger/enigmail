"use strict";

const EXPORTED_SYMBOLS = ["GpgResponseParser"];

function parse(message) {
  let status = "Success";
  if (message.indexOf("fetch error") > -1 || message.indexOf("Network is unreachable") > -1 || message.indexOf("Connection refused") > -1) {
    status = "Connection Error";
  } else if (message.indexOf("General error") > -1) {
    status = "General Error";
  } else if (message.indexOf("not changed") > -1) {
    status = "Key not changed";
  }

  return {
    status: status
  };
}

const GpgResponseParser = {
  parse: parse
};
