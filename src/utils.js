/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const fetch = require("node-fetch");
const Timeout = require("await-timeout");
const { default: makeCancellablePromise } = require("make-cancellable-promise");
const utils = require("@graphql-mesh/utils");

/** Test code */

const __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        let desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });

const __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });

const __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    const result = {};
    if (mod != null)
      for (const k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };

function importFn(modulePath) {
  return Promise.resolve(import(modulePath)).then((module) => __importStar(module));
}

/** Test code end */

function timedPromise(promise) {
  try {
    const { promise: newPromise, cancel } = makeCancellablePromise(promise);

    return Timeout.wrap(newPromise, 30000, "Timeout").catch((err) => {
      if (err.message === "Timeout") {
        cancel();
      }

      return Promise.reject(err);
    });
  } catch (err) {
    return Promise.reject(err);
  }
}

const parseResponseBody = (rawBody, isOk) => {
  try {
    const body = JSON.parse(rawBody);

    if (body.status) {
      return body;
    } else {
      if (isOk) {
        // returned OK JSON response without status
        return {
          status: "SUCCESS",
          message: rawBody,
        };
      } else {
        // returned NON OK JSON response without status
        return {
          status: "ERROR",
          message: rawBody,
        };
      }
    }
  } catch (err) {
    if (isOk) {
      // returned OK String response
      return {
        status: "SUCCESS",
        message: rawBody,
      };
    } else {
      // returned NON OK String response or some unknown error
      return {
        status: "ERROR",
        message: rawBody || "Unable to parse remove function response",
      };
    }
  }
};

const invokeRemoteFunction = async (url, metaConfig) => (data) => {
  const { logger, blocking } = metaConfig;

  try {
    logger.debug("Invoking remote fn %s", url);

    const requestOptions = {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    };

    return new Promise(async (resolve, reject) => {
      const response$ = fetch(url, requestOptions);

      if (blocking) {
        const response = await response$;
        const rawBody = await response.text();
        const body = parseResponseBody(rawBody, response.ok);

        if (body.status.toUpperCase() === "SUCCESS") {
          resolve(body);
        } else {
          reject(body);
        }
      } else {
        resolve({
          status: "SUCCESS",
          message: "Remote function invoked successfully",
        });
      }
    });
  } catch (error) {
    logger.error("error while invoking remote function %s", url);
    logger.error(error);

    return Promise.reject({
      status: "ERROR",
      message: error.message || `Unable to invoke remote function ${url}`,
    });
  }
};

const invokeLocalFunction = async (composerFnPath, metaConfig) => {
  const { baseDir, logger, importFn, blocking } = metaConfig;

  let composerFn = null;

  try {
    composerFn = await utils.loadFromModuleExportExpression(composerFnPath, {
      cwd: baseDir,
      defaultExportName: "default",
      importFn: importFn,
    });
  } catch (err) {
    logger.error("error while invoking local function %s", composerFnPath);
    logger.error(err);

    return Promise.reject({
      status: "ERROR",
      message:
        err.message || `Unable to invoke local function ${composerFnPath}`,
    });
  }

  return (data) => {
    return new Promise((resolve, reject) => {
      try {
        if (!composerFn) {
          reject({
            status: "ERROR",
            message: `Unable to invoke local function ${composerFnPath}`,
          });
        }

        logger.debug("Invoking local fn %o", composerFn);

        const result = composerFn(data);

        if (blocking) {
          if (result instanceof Promise) {
            timedPromise(result)
              .then((res) => {
                if (res.status.toUpperCase() === "SUCCESS") {
                  resolve(res);
                } else {
                  reject(res);
                }
              })
              .catch((error) => {
                logger.error(
                  "error while invoking local function %o",
                  composerFn
                );
                logger.error(error);

                reject({
                  status: "ERROR",
                  message:
                    error.message ||
                    `Error while invoking local function ${composerFn}`,
                });
              });
          } else {
            if (result.status.toUpperCase() === "SUCCESS") {
              resolve(result);
            } else {
              reject(result);
            }
          }
        } else {
          resolve({
            status: "SUCCESS",
            message: "Local function invoked successfully",
          });
        }
      } catch (error) {
        logger.error("error while invoking local function %o", composerFn);
        logger.error(error);

        reject({
          status: "ERROR",
          message:
            error.message ||
            `Error while invoking local function ${composerFn}`,
        });
      }
    });
  };
};

const isRemoteFn = (composer) => {
  const urlRegex =
    /^(https:\/\/)([\w-?%$-.+!*'(),&=]+\.)+[\w-]+[.a-zA-Z]+(\/[\/a-zA-Z0-9-?_%$-.+!*'(),&=]*)?$/;

  return urlRegex.test(composer);
};

module.exports = {
  invokeRemoteFunction,
  invokeLocalFunction,
  isRemoteFn,
  importFn,
};
