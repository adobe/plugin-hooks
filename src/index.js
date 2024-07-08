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
const newrelic = require("newrelic");
const handleBeforeAllHooks = require("./handleBeforeAllHooks");

async function hooksPlugin(config) {
  try {
    const { beforeAll, baseDir, logger } = config;

    if (!beforeAll) {
      return {};
    }

    const memoizedFns = {
      beforeAll: null,
    };

    // Generating bound beforeAll function
    const handleBeforeAllHookFn = handleBeforeAllHooks({
      beforeAll,
      memoizedFns,
      baseDir,
      logger,
    });

    return {
      async onExecute({ args, setResultAndStopExecution, extendContext }) {
        await newrelic.startSegment('handleBeforeAllHooks:onExecute', true, async() => {
          
         
        const query = args.contextValue.params.query;

        const { document, contextValue: context } = args;
        const { headers, params, request, req, secrets } = context;

        let body = {};

        if (req && req.body) {
          body = req.body;
        }

        const payload = {
          context: { headers, params, request, body, secrets },
          document,
        };

        const updateContext = (newContext) => {
          const { headers: newHeaders } = newContext;

          if (newHeaders) {
            const updatedHeaders = {
              ...args.contextValue.headers,
              ...newHeaders,
            };

            extendContext({
              headers: updatedHeaders,
            });
          }
        };

        const isIntrospectionQuery =
          args.operationName === "IntrospectionQuery" ||
          (query && query.includes("query IntrospectionQuery"));

        if (isIntrospectionQuery) {
          return {};
        }

        /**
         * Start Before All Hook
         */

        try {
          await handleBeforeAllHookFn({ payload, updateContext });
        } catch (err) {
          setResultAndStopExecution({
            data: null,
            errors: [err.message],
          });
        }

        /**
         * End Before All Hook
         */

        return {};
      });
      
    },
    };
  } catch (err) {
    console.error('Error while initializing "hooks" plugin', err);

    return {};
  }
}

module.exports = hooksPlugin;
