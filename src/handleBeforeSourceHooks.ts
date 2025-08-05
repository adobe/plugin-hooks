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
import { HookFunction, HookStatus, MemoizedFns, HookConfig } from './types';
import { handleHookExecutionError } from './errors';
import type { SourceHookExecConfig } from './utils/hookResolver';
import { resolveSourceHookFunction } from './utils/hookResolver';

export interface BeforeSourceHookBuildConfig {
	baseDir: string;
	beforeSource?: HookConfig[];
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

/**
 * Gets the handler function for the `beforeSource` hook. Wraps the blackbox hook function with common logic/error handling.
 * @param fnBuildConfig Build configuration.
 */
const getBeforeSourceHookHandler = (fnBuildConfig: BeforeSourceHookBuildConfig) => {
	return async (fnExecConfig: SourceHookExecConfig): Promise<void> => {
		const { baseDir, logger, beforeSource, memoizedFns } = fnBuildConfig;
		const { payload, sourceName, updateRequest } = fnExecConfig;

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
					const hooksResponse = await hookFn(payload);
					if (!hooksResponse) {
						continue;
					}
					if (hookConfig.blocking) {
						if (hooksResponse.status.toUpperCase() === HookStatus.ERROR) {
							throw new Error(hooksResponse.message);
						}

						// Handle request modification from hook data using callback pattern (like beforeAll)
						if (hooksResponse.data?.request) {
							// Use callback to apply modifications (consistent with beforeAll pattern)
							if (updateRequest) {
								updateRequest(hooksResponse.data.request);
							} else {
								logger.warn(
									'beforeSource hook returned request modifications but no updateRequest callback provided',
								);
							}
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
