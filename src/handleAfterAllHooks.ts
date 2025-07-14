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
	HookConfig,
	HookFunction,
	HookFunctionPayload,
	HookStatus,
	MemoizedFns,
	HookResponse,
} from './types';
//@ts-expect-error The dynamic import is a workaround for cjs
import importFn from './dynamicImport';
import {
	isModuleFn,
	isRemoteFn,
	getWrappedLocalHookFunction,
	getWrappedLocalModuleHookFunction,
	getWrappedRemoteHookFunction,
} from './utils';
import { handleHookExecutionError, handleHookHandlerError } from './utils/errorHandler';

export interface AfterAllHookBuildConfig {
	baseDir: string;
	afterAll: HookConfig;
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

export interface AfterAllHookExecConfig {
	payload: HookFunctionPayload;
}

const getAfterAllHookHandler =
	(fnBuildConfig: AfterAllHookBuildConfig) =>
	async (fnExecConfig: AfterAllHookExecConfig): Promise<HookResponse | undefined> => {
		try {
			const { memoizedFns, baseDir, logger, afterAll } = fnBuildConfig;
			const { payload } = fnExecConfig;
			let afterAllFn: HookFunction | undefined;

			if (!memoizedFns.afterAll) {
				if (isRemoteFn(afterAll.composer || '')) {
					// Invoke remote endpoint
					logger.debug('Invoking remote function %s', afterAll.composer);
					afterAllFn = await getWrappedRemoteHookFunction(afterAll.composer!, {
						baseDir,
						importFn,
						logger,
						blocking: afterAll.blocking,
					});
				} else if (isModuleFn(afterAll)) {
					// Invoke function from imported module. This handles bundled scenarios such as local development where the
					// module needs to be known statically at build time.
					logger.debug('Invoking local module function %s %s', afterAll.module, afterAll.fn);
					afterAllFn = await getWrappedLocalModuleHookFunction(afterAll.module!, afterAll.fn!, {
						baseDir,
						importFn,
						logger,
						blocking: afterAll.blocking,
					});
				} else {
					// Invoke local function at runtime
					logger.debug('Invoking local function %s', afterAll.composer);
					afterAllFn = await getWrappedLocalHookFunction(afterAll.composer!, {
						baseDir,
						importFn,
						logger,
						blocking: afterAll.blocking,
					});
				}
				memoizedFns.afterAll = afterAllFn;
			} else {
				afterAllFn = memoizedFns.afterAll;
			}

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
