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
import { HookConfig, HookFunctionPayload, HookStatus, MemoizedFns } from './types';
import { handleHookExecutionError, handleHookHandlerError } from './utils/errorHandler';
import { resolveHookFunction } from './utils/hookResolver';

export interface BeforeAllHookBuildConfig {
	baseDir: string;
	beforeAll: HookConfig;
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

export interface BeforeAllHookExecConfig {
	payload: HookFunctionPayload;
	updateContext: UpdateContextFn;
}

export type UpdateContextFn = (data: { headers?: Record<string, string> }) => void;

const getBeforeAllHookHandler =
	(fnBuildConfig: BeforeAllHookBuildConfig) =>
	async (fnExecConfig: BeforeAllHookExecConfig): Promise<void> => {
		try {
			const { memoizedFns, baseDir, logger, beforeAll } = fnBuildConfig;
			const { payload, updateContext } = fnExecConfig;

			// Resolve hook function using shared utility
			const beforeAllFn = await resolveHookFunction({
				hookConfig: beforeAll,
				hookType: 'beforeAll',
				baseDir,
				logger,
				memoizedFns,
			});

			if (beforeAllFn) {
				try {
					const hooksResponse = await beforeAllFn(payload);
					if (beforeAll.blocking) {
						if (hooksResponse.status.toUpperCase() === HookStatus.SUCCESS) {
							if (hooksResponse.data) {
								updateContext(hooksResponse.data);
							}
						} else {
							throw new Error(hooksResponse.message);
						}
					}
				} catch (err: unknown) {
					handleHookExecutionError(err, logger, 'beforeAll');
				}
			}
		} catch (err: unknown) {
			handleHookHandlerError(err, 'beforeAll');
		}
	};

export default getBeforeAllHookHandler;
