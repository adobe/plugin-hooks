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

export async function getHookFunction(config: HookResolverConfig) {
	const { baseDir, logger, hookConfig } = config;
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
