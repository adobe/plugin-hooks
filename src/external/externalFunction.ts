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
import type { HookConfig, HookFunction } from '../types';
//@ts-expect-error The dynamic import is a workaround for cjs
import importFn from '../dynamicImport';
import {
	isModuleFn,
	isRemoteFn,
	getWrappedLocalHookFunction,
	getWrappedLocalModuleHookFunction,
	getWrappedRemoteHookFunction,
} from './utils';

/**
 * Configuration for an external function.
 */
export interface ExternalFunctionConfig {
	hookConfig: HookConfig;
	baseDir: string;
	logger: YogaLogger;
}

/**
 * Get the external function based on its configuration. An external function can be a remote endpoint, a local module
 * function, or a local function at runtime. External functions are a blackbox that must be wrapped to ensure
 * validation of input/output and to handle uniform behavior across different types of functions.
 * @param config External function configuration.
 */
export async function getExternalFunction(config: ExternalFunctionConfig) {
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
