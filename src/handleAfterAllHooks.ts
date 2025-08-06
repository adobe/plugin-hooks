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

import { ExecutionResult } from 'graphql';
import {
	HookConfig,
	HookStatus,
	AfterAllHookResponse,
	AfterAllHookFunctionPayload,
	SetResultAndStopExecutionFn,
	HookBuildConfig,
	HookExecConfig,
} from './types';
import { handleHookExecutionError, handleHookHandlerError } from './errors';
import { resolveHookFunction } from './utils/hookResolver';

/**
 * Configuration required when building/memoizing the handler wrapping the black box hook function.
 */
export interface AfterAllHookBuildConfig extends HookBuildConfig {
	afterAll: HookConfig;
}

/**
 * Configuration required when executing the hook handler.
 */
export interface AfterAllHookExecConfig extends HookExecConfig {
	setResultAndStopExecution: SetResultAndStopExecutionFn;
}

/**
 * Gets the handler function for the `afterAll` hook. Wraps the blackbox hook function with common logic/error handling.
 * @param fnBuildConfig Build configuration.
 */
const getAfterAllHookHandler =
	(fnBuildConfig: AfterAllHookBuildConfig) =>
	async (fnExecConfig: AfterAllHookExecConfig): Promise<void> => {
		try {
			const { memoizedFns, baseDir, logger, afterAll } = fnBuildConfig;
			const {
				setResultAndStopExecution,
				payload,
			}: {
				setResultAndStopExecution: SetResultAndStopExecutionFn;
				payload: AfterAllHookFunctionPayload;
			} = fnExecConfig;

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
					const hookResponse: AfterAllHookResponse = await afterAllFn(payload);
					if (afterAll.blocking && hookResponse.status.toUpperCase() !== HookStatus.SUCCESS) {
						throw new Error(hookResponse.message);
					}

					// Apply the modified result if hook returned one in data.result format
					const originalResult = payload.result || {};
					const newResult: ExecutionResult = Object.fromEntries(
						Object.entries({
							data: hookResponse?.data?.result?.data || originalResult.data,
							errors: hookResponse?.data?.result?.errors || originalResult.errors,
							extensions: hookResponse?.data?.result?.extensions || originalResult.extensions,
						}).filter(([, value]) => value !== undefined),
					);
					setResultAndStopExecution(newResult);
				} catch (err: unknown) {
					handleHookExecutionError(err, logger, 'afterAll');
				}
			}
		} catch (err: unknown) {
			handleHookHandlerError(err, 'afterAll');
		}
	};

export default getAfterAllHookHandler;
