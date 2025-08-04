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
import {
	HookFunction,
	HookStatus,
	MemoizedFns,
	HookConfig,
	AfterSourceHookFunctionPayload,
} from './types';
import { handleHookExecutionError } from './errors';
import type { SourceHookExecConfig } from './utils/hookResolver';
import { resolveSourceHookFunction } from './utils/hookResolver';

export interface AfterSourceHookBuildConfig {
	baseDir: string;
	afterSource?: HookConfig[];
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

/**
 * Gets the handler function for the `afterSource` hook. Wraps the blackbox hook function with common logic/error handling.
 * @param fnBuildConfig Build configuration.
 */
const getAfterSourceHookHandler = (fnBuildConfig: AfterSourceHookBuildConfig) => {
	return async (fnExecConfig: SourceHookExecConfig): Promise<Response | undefined> => {
		const { baseDir, logger, afterSource, memoizedFns } = fnBuildConfig;
		const { payload, sourceName } = fnExecConfig;

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
					const hooksResponse = await hookFn(payload);
					if (!hooksResponse) {
						continue;
					}
					if (hookConfig.blocking) {
						if (hooksResponse.status.toUpperCase() === HookStatus.ERROR) {
							throw new Error(hooksResponse.message);
						}
						// Handle response modification from hook data
						if (hooksResponse.data?.response) {
							const modifiedResponseData = hooksResponse.data.response;
							const afterSourcePayload = payload as AfterSourceHookFunctionPayload;

							// Get original body if hook didn't provide one
							let bodyToUse = modifiedResponseData.body;
							if (!bodyToUse && afterSourcePayload.response) {
								// Clone original response to read its body without consuming the original
								const originalResponseClone = afterSourcePayload.response.clone();
								bodyToUse = await originalResponseClone.text();
							}

							// Fallback to error message only if no original body exists
							if (!bodyToUse) {
								bodyToUse = '{"errors":[{"message":"Hook did not return response body"}]}';
							}

							modifiedResponse = new Response(bodyToUse, {
								status: modifiedResponseData.status || afterSourcePayload.response?.status || 200,
								statusText:
									modifiedResponseData.statusText ||
									afterSourcePayload.response?.statusText ||
									'OK',
								headers: modifiedResponseData.headers || {},
							});
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
