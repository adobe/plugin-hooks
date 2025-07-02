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
	GraphQLData,
	GraphQLError,
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

export type UpdateContextFn = (data: {
	headers?: Record<string, string>;
	result?: {
		data?: GraphQLData;
		errors?: GraphQLError[];
	};
}) => void;

const getBeforeAllHookHandler =
	(fnBuildConfig: BeforeAllHookBuildConfig) =>
	async (fnExecConfig: BeforeAllHookExecConfig): Promise<void> => {
		try {
			const { memoizedFns, baseDir, logger, beforeAll } = fnBuildConfig;
			const { payload, updateContext } = fnExecConfig;
			let beforeAllFn: HookFunction | undefined;

			if (!memoizedFns.beforeAll) {
				if (isRemoteFn(beforeAll.composer || '')) {
					// Invoke remote endpoint
					logger.debug('Invoking remote function %s', beforeAll.composer);
					beforeAllFn = await getWrappedRemoteHookFunction(beforeAll.composer!, {
						baseDir,
						importFn,
						logger,
						blocking: beforeAll.blocking,
					});
				} else if (isModuleFn(beforeAll)) {
					// Invoke function from imported module. This handles bundled scenarios such as local development where the
					// module needs to be known statically at build time.
					logger.debug('Invoking local module function %s %s', beforeAll.module, beforeAll.fn);
					beforeAllFn = await getWrappedLocalModuleHookFunction(beforeAll.module!, beforeAll.fn!, {
						baseDir,
						importFn,
						logger,
						blocking: beforeAll.blocking,
					});
				} else {
					// Invoke local function at runtime
					logger.debug('Invoking local function %s', beforeAll.composer);
					beforeAllFn = await getWrappedLocalHookFunction(beforeAll.composer!, {
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
						if (hooksResponse.status.toUpperCase() === HookStatus.SUCCESS) {
							if (hooksResponse.data) {
								updateContext(hooksResponse.data);
							}
						} else {
							throw new Error(hooksResponse.message);
						}
					}
				} catch (err: unknown) {
					logger.error('Error while invoking beforeAll hook %o', err);
					if (err instanceof Error) {
						throw new Error(err.message);
					}
					if (err && typeof err === 'object' && 'message' in err) {
						throw new Error((err as { message?: string }).message);
					}
					throw new Error('Error while invoking beforeAll hook');
				}
			}
		} catch (err: unknown) {
			throw new Error(
				(err instanceof Error && err.message) || 'Error while invoking beforeAll hook',
			);
		}
	};

export default getBeforeAllHookHandler;
