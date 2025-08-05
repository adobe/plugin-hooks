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
	AfterSourceHookFunctionPayload,
	AfterSourceHookResponse,
	SourceHookExecConfig,
	HookBuildConfig,
} from './types';
import { handleHookExecutionError } from './errors';
import { resolveSourceHookFunction } from './utils/hookResolver';

/**
 * Configuration required when building/memoizing the handler wrapping the black box hook function.
 */
export interface AfterSourceHookBuildConfig extends HookBuildConfig {
	afterSource?: HookConfig[];
}

/**
 * Configuration required when executing the hook handler.
 */
export interface AfterSourceHookExecConfig extends SourceHookExecConfig {
	payload: AfterSourceHookFunctionPayload;
}

/**
 * Gets the handler function for the `afterSource` hook. Wraps the blackbox hook function with common logic/error handling.
 * @param fnBuildConfig Build configuration.
 */
const getAfterSourceHookHandler = (fnBuildConfig: AfterSourceHookBuildConfig) => {
	return async (fnExecConfig: AfterSourceHookExecConfig): Promise<Response | undefined> => {
		const { baseDir, logger, afterSource, memoizedFns } = fnBuildConfig;
		const {
			sourceName,
			payload,
		}: {
			sourceName: string;
			payload: AfterSourceHookFunctionPayload;
		} = fnExecConfig;

		const afterSourceHooks = afterSource || [];
		let modifiedResponse: Response | undefined = undefined;

		// Initialize memoized functions array if not exists
		if (!memoizedFns.afterSource) {
			memoizedFns.afterSource = {};
		}
		if (!memoizedFns.afterSource[sourceName]) {
			memoizedFns.afterSource[sourceName] = [];
		}

		// Ensure we have enough memoized functions for all hooks
		while (memoizedFns.afterSource[sourceName].length < afterSourceHooks.length) {
			memoizedFns.afterSource[sourceName].push(null);
		}

		for (let i = 0; i < afterSourceHooks.length; i++) {
			const hookConfig = afterSourceHooks[i];
			const hookFn: HookFunction | undefined = await resolveSourceHookFunction(
				hookConfig,
				i,
				{
					hookConfigs: afterSourceHooks,
					hookType: 'afterSource',
					baseDir,
					logger,
					memoizedFns,
				},
				sourceName,
			);

			if (hookFn) {
				try {
					const hooksResponse: AfterSourceHookResponse = await hookFn(payload);
					if (!hooksResponse) {
						continue;
					}
					if (hookConfig.blocking) {
						if (hooksResponse.status.toUpperCase() === HookStatus.ERROR) {
							throw new Error(hooksResponse.message);
						}
						// Handle response modification from hook data
						const originalResponse = payload.response;
						const newResponse = hooksResponse.data?.response;
						if (originalResponse && newResponse) {
							const body = 'body' in newResponse ? newResponse.body : payload?.response?.body;

							// Handle header merging
							const originalHeaders = originalResponse.headers || {};
							const mergedHeaders = new Headers(originalHeaders);

							let newHeaders = newResponse.headers;

							// Normalize headers
							if (newHeaders instanceof Headers) {
								newHeaders = Object.fromEntries(newHeaders.entries());
							}

							// Merge headers
							if (newHeaders) {
								Object.entries(newHeaders).forEach(([key, value]) => {
									if (value || typeof value === 'boolean') {
										mergedHeaders.set(key, value.toString());
									}
								});
							}

							modifiedResponse = new Response(body, {
								status: newResponse.status || originalResponse.status,
								statusText: newResponse.statusText || originalResponse.statusText,
								headers: mergedHeaders,
							});
							payload.response = modifiedResponse;
						}
					}
				} catch (err: unknown) {
					handleHookExecutionError(err, logger, 'afterSource');
				}
			}
		}

		// Return modified response for the wrapping function to apply
		return modifiedResponse;
	};
};

export default getAfterSourceHookHandler;
