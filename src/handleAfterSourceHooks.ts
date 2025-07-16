import type { YogaLogger } from 'graphql-yoga';
import { HookFunction, HookStatus, MemoizedFns, HookConfig } from './types';
import type { OperationDefinitionNode } from 'graphql';
//@ts-expect-error The dynamic import is a workaround for cjs
import importFn from './dynamicImport';
import {
	isModuleFn,
	isRemoteFn,
	getWrappedLocalHookFunction,
	getWrappedLocalModuleHookFunction,
	getWrappedRemoteHookFunction,
} from './utils';

export interface AfterSourceHookBuildConfig {
	baseDir: string;
	afterSource?: HookConfig[];
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

export interface AfterSourceHookPayload {
	sourceName: string;
	request: RequestInit;
	operation: OperationDefinitionNode;
}

export interface AfterSourceHookExecConfig {
	payload: AfterSourceHookPayload;
}

const getAfterSourceHookHandler = (fnBuildConfig: AfterSourceHookBuildConfig) => {
	return async (fnExecConfig: AfterSourceHookExecConfig) => {
		const { baseDir, logger, afterSource, memoizedFns } = fnBuildConfig;
		const { payload } = fnExecConfig;

		const afterSourceHooks = afterSource || [];

		// Initialize memoized functions array if not exists
		if (!memoizedFns.afterSource) {
			memoizedFns.afterSource = [];
		}

		// Ensure we have enough memoized functions for all hooks
		while (memoizedFns.afterSource.length < afterSourceHooks.length) {
			memoizedFns.afterSource.push(null);
		}

		for (let i = 0; i < afterSourceHooks.length; i++) {
			const hookConfig = afterSourceHooks[i];
			let hookFn: HookFunction | undefined;

			// Check if function is already memoized
			if (memoizedFns.afterSource[i] !== null) {
				hookFn = memoizedFns.afterSource[i] as HookFunction;
			} else {
				// Create and memoize the function
				if (isRemoteFn(hookConfig.composer || '')) {
					// Invoke remote endpoint
					logger.debug('Invoking remote function %s', hookConfig.composer);
					hookFn = await getWrappedRemoteHookFunction(hookConfig.composer!, {
						baseDir,
						importFn,
						logger,
						blocking: hookConfig.blocking,
					});
				} else if (isModuleFn(hookConfig)) {
					// Invoke function from imported module
					logger.debug('Invoking local module function %s %s', hookConfig.module, hookConfig.fn);
					hookFn = await getWrappedLocalModuleHookFunction(hookConfig.module!, hookConfig.fn!, {
						baseDir,
						importFn,
						logger,
						blocking: hookConfig.blocking,
					});
				} else {
					// Invoke local function at runtime
					logger.debug('Invoking local function %s', hookConfig.composer);
					hookFn = await getWrappedLocalHookFunction(hookConfig.composer!, {
						baseDir,
						importFn,
						logger,
						blocking: hookConfig.blocking,
					});
				}
				// Memoize the function
				memoizedFns.afterSource[i] = hookFn;
			}

			if (hookFn) {
				try {
					const hooksResponse = await hookFn(payload);
					if (hookConfig.blocking) {
						if (hooksResponse.status.toUpperCase() === HookStatus.SUCCESS) {
							// Handle success response if needed
						} else {
							throw new Error(hooksResponse.message);
						}
					}
				} catch (err: unknown) {
					logger.error('Error while invoking afterSource hook %o', err);
					if (err instanceof Error) {
						throw new Error(err.message);
					}
					if (err && typeof err === 'object' && 'message' in err) {
						throw new Error((err as { message?: string }).message);
					}
					throw new Error('Error while invoking afterSource hook');
				}
			}
		}
	};
};

export default getAfterSourceHookHandler;
