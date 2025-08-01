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

import type { YogaLogger } from 'graphql-yoga';
import { HookConfig, HookFunctionPayload, HookStatus, MemoizedFns, HookResponse } from './types';
import { handleHookExecutionError, handleHookHandlerError } from './errors';
import { resolveHookFunction } from './utils/hookResolver';

export interface AfterAllHookBuildConfig {
	baseDir: string;
	afterAll: HookConfig;
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

export interface AfterAllHookExecConfig {
	payload: HookFunctionPayload;
}

/**
 * Gets the handler function for the `afterAll` hook. Wraps the blackbox hook function with common logic/error handling.
 * @param fnBuildConfig Build configuration.
 */
const getAfterAllHookHandler =
	(fnBuildConfig: AfterAllHookBuildConfig) =>
	async (fnExecConfig: AfterAllHookExecConfig): Promise<HookResponse | undefined> => {
		try {
			const { memoizedFns, baseDir, logger, afterAll } = fnBuildConfig;
			const { payload } = fnExecConfig;

			// Resolve hook function using shared utility
			const afterAllFn = await resolveHookFunction({
				hookConfig: afterAll,
				hookType: 'afterAll',
				baseDir,
				logger,
				memoizedFns,
			});

			if (afterAllFn) {
				try {
					const hooksResponse = await afterAllFn(payload);
					if (afterAll.blocking && hooksResponse.status.toUpperCase() !== HookStatus.SUCCESS) {
						throw new Error(hooksResponse.message);
					}
					return hooksResponse;
				} catch (err: unknown) {
					handleHookExecutionError(err, logger, 'afterAll');
				}
			}
		} catch (err: unknown) {
			handleHookHandlerError(err, 'afterAll');
		}
	};

export default getAfterAllHookHandler;
