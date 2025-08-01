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
import { HookType } from '../hooks/hook';
import type {
	AfterSourceHookFunctionPayload,
	BeforeSourceHookFunctionPayload,
	HookConfig,
	HookFunction,
	MemoizedFns,
} from '../types';
//@ts-expect-error The dynamic import is a workaround for cjs
import importFn from '../dynamicImport';
import {
	isModuleFn,
	isRemoteFn,
	getWrappedLocalHookFunction,
	getWrappedLocalModuleHookFunction,
	getWrappedRemoteHookFunction,
} from '../utils';

/**
 * Configuration for hook function resolution
 */
export interface HookResolverConfig {
	hookConfig: HookConfig;
	hookType: HookType;
	baseDir: string;
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

/**
 * Configuration for source hook resolution
 */
export interface SourceHookResolverConfig {
	hookConfigs: HookConfig[];
	hookType: 'beforeSource' | 'afterSource';
	baseDir: string;
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

/**
 * Configuration for source hook execution
 */
export interface SourceHookExecConfig {
	payload: BeforeSourceHookFunctionPayload | AfterSourceHookFunctionPayload;
	hookType: 'beforeSource' | 'afterSource';
	sourceName: string;
}

async function getHookFunction(
	config: HookResolverConfig | SourceHookResolverConfig,
	hookConfig: HookConfig,
) {
	const { baseDir, logger } = config;
	let hookFunction: HookFunction | undefined;

	// Resolve function based on configuration type
	if (isRemoteFn(hookConfig.composer || '')) {
		// Remote endpoint function
		logger.debug('Invoking remote function %s', hookConfig.composer);
		hookFunction = await getWrappedRemoteHookFunction(hookConfig.composer!, {
			baseDir,
			importFn,
			logger,
			blocking: hookConfig.blocking,
		});
	} else if (isModuleFn(hookConfig)) {
		// Module function (bundled scenarios)
		logger.debug('Invoking local module function %s %s', hookConfig.module, hookConfig.fn);
		hookFunction = await getWrappedLocalModuleHookFunction(hookConfig.module!, hookConfig.fn!, {
			baseDir,
			importFn,
			logger,
			blocking: hookConfig.blocking,
		});
	} else {
		// Local function at runtime
		logger.debug('Invoking local function %s', hookConfig.composer);
		hookFunction = await getWrappedLocalHookFunction(hookConfig.composer!, {
			baseDir,
			importFn,
			logger,
			blocking: hookConfig.blocking,
		});
	}

	return hookFunction;
}

/**
 * Resolves and memoizes hook functions with consistent logic for both beforeAll and afterAll hooks
 *
 * @param config - Configuration object containing hook config, type, and dependencies
 * @returns Promise<HookFunction | undefined> - The resolved hook function or undefined if none configured
 *
 * @example
 * ```typescript
 * const hookFn = await resolveHookFunction({
 *   hookConfig: beforeAllConfig,
 *   hookType: 'beforeAll',
 *   baseDir: '/path/to/base',
 *   logger: yogaLogger,
 *   memoizedFns: memoizedFunctions
 * });
 * ```
 */
export async function resolveHookFunction(
	config: HookResolverConfig,
): Promise<HookFunction | undefined> {
	const { hookConfig, hookType, memoizedFns } = config;

	// Check if function is already memoized
	const memoizedFn = memoizedFns[hookType] as HookFunction | undefined;
	if (memoizedFn) {
		return memoizedFn;
	}

	const hookFunction: HookFunction | undefined = await getHookFunction(config, hookConfig);

	// Memoize the resolved function
	if (hookFunction) {
		// @ts-expect-error zzz
		memoizedFns[hookType] = hookFunction;
	}

	return hookFunction;
}

/**
 * Resolves a single source hook function with memoization
 *
 * @param hookConfig - The hook configuration
 * @param index - The index of the hook in the array
 * @param config - Configuration object containing dependencies
 * @param sourceName - The name of the source for which the hook is being resolved
 * @returns Promise<HookFunction | undefined> - The resolved hook function or undefined
 */
export async function resolveSourceHookFunction(
	hookConfig: HookConfig,
	index: number,
	config: SourceHookResolverConfig,
	sourceName: string,
): Promise<HookFunction | undefined> {
	const { hookType, memoizedFns } = config;

	// Check if function is already memoized
	if (
		memoizedFns[hookType] &&
		memoizedFns[hookType][sourceName] &&
		memoizedFns[hookType][sourceName][index] !== null
	) {
		return memoizedFns[hookType][sourceName][index] as HookFunction;
	}

	const hookFunction: HookFunction | undefined = await getHookFunction(config, hookConfig);

	// Memoize the resolved function
	if (hookFunction) {
		if (!memoizedFns[hookType]) {
			memoizedFns[hookType] = {};
		}
		if (!memoizedFns[hookType][sourceName]) {
			memoizedFns[hookType][sourceName] = [];
		}
		memoizedFns[hookType][sourceName][index] = hookFunction;
	}

	return hookFunction;
}
