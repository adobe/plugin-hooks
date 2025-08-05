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

import {
	HookFunction,
	HookStatus,
	HookConfig,
	BeforeSourceHookFunctionPayload,
	BeforeSourceHookResponse,
	HookBuildConfig,
	SourceHookExecConfig,
} from './types';
import { handleHookExecutionError } from './errors';
import { resolveSourceHookFunction } from './utils/hookResolver';

/**
 * Configuration required when building/memoizing the handler wrapping the black box hook function.
 */
export interface BeforeSourceHookBuildConfig extends HookBuildConfig {
	beforeSource?: HookConfig[];
}

/**
 * Configuration required when executing the hook handler.
 */
export interface BeforeSourceHookExecConfig extends SourceHookExecConfig {
	payload: BeforeSourceHookFunctionPayload;
}

/**
 * Gets the handler function for the `beforeSource` hook. Wraps the blackbox hook function with common logic/error handling.
 * @param fnBuildConfig Build configuration.
 */
const getBeforeSourceHookHandler = (fnBuildConfig: BeforeSourceHookBuildConfig) => {
	return async (fnExecConfig: BeforeSourceHookExecConfig): Promise<void> => {
		const { baseDir, logger, beforeSource, memoizedFns } = fnBuildConfig;
		const {
			sourceName,
			payload,
		}: {
			sourceName: string;
			payload: BeforeSourceHookFunctionPayload;
		} = fnExecConfig;

		const beforeSourceHooks = beforeSource || [];

		// Initialize memoized functions array if not exists
		if (!memoizedFns.beforeSource) {
			memoizedFns.beforeSource = {};
		}
		if (!memoizedFns.beforeSource[sourceName]) {
			memoizedFns.beforeSource[sourceName] = [];
		}

		// Ensure we have enough memoized functions for all hooks
		while (memoizedFns.beforeSource[sourceName].length < beforeSourceHooks.length) {
			memoizedFns.beforeSource[sourceName].push(null);
		}

		for (let i = 0; i < beforeSourceHooks.length; i++) {
			const hookConfig = beforeSourceHooks[i];
			const hookFn: HookFunction | undefined = await resolveSourceHookFunction(
				hookConfig,
				i,
				{
					hookConfigs: beforeSourceHooks,
					hookType: 'beforeSource',
					baseDir,
					logger,
					memoizedFns,
				},
				sourceName,
			);

			if (hookFn) {
				try {
					const hooksResponse: BeforeSourceHookResponse = await hookFn(payload);
					if (!hooksResponse) {
						continue;
					}
					if (hookConfig.blocking) {
						if (hooksResponse.status.toUpperCase() === HookStatus.ERROR) {
							throw new Error(hooksResponse.message);
						}

						// Handle request modification from hook data using callback pattern (like beforeAll)
						const originalRequest = payload.request;
						const hookResponseRequest = hooksResponse.data?.request;
						if (hookResponseRequest) {
							const { headers: newHeaders, ...otherModifications } = hookResponseRequest;
							// Handle header merging
							if (newHeaders) {
								const originalHeaders = originalRequest.headers || {};
								if (originalHeaders instanceof Headers) {
									const headersObj = Object.fromEntries(originalHeaders.entries());
									originalRequest.headers = { ...headersObj, ...newHeaders };
								} else {
									originalRequest.headers = { ...originalHeaders, ...newHeaders };
								}
							}
							// Apply other modifications
							Object.assign(originalRequest, otherModifications);
						}
					}
				} catch (err: unknown) {
					handleHookExecutionError(err, logger, 'beforeSource');
				}
			}
		}
	};
};

export default getBeforeSourceHookHandler;
