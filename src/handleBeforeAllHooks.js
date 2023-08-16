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

const {
  isRemoteFn,
  invokeLocalFunction,
  invokeRemoteFunction,
  importFn,
} = require("./utils");

const handleBeforeAllHooks = (fnBuildConfig) => async (fnExecConfig) => {
  try {
    const { memoizedFns, baseDir, logger, beforeAll } = fnBuildConfig;
    const { payload, updateContext } = fnExecConfig;
    let beforeAllFn = null;

    if (!memoizedFns.beforeAll) {
      if (isRemoteFn(beforeAll.composer)) {
        beforeAllFn = await invokeRemoteFunction(beforeAll.composer, {
          baseDir,
          importFn,
          logger,
          blocking: beforeAll.blocking,
        });
      } else {
        beforeAllFn = await invokeLocalFunction(beforeAll.composer, {
          baseDir,
          importFn,
          logger,
          blocking: beforeAll.blocking,
        });
      }

      memoizedFns.beforeAll = beforeAllFn;
    } else {
      beforeAllFn = memoizedFns.beforeAll;
    }

    if (beforeAllFn) {
      try {
        const hooksResponse = await beforeAllFn(payload);

        if (beforeAll.blocking) {
          if (hooksResponse.status.toUpperCase() === "SUCCESS") {
            // take data from response and merge it with context

            if (hooksResponse.data) {
              updateContext(hooksResponse.data);
            }
          } else {
            throw new Error(hooksResponse.message);
          }
        }
      } catch (err) {
        logger.error("Error while invoking beforeAll hook %o", err);

        throw new Error(err.message);
      }
    }
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = handleBeforeAllHooks;
