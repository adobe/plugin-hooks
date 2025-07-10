import type { YogaLogger } from 'graphql-yoga';
import { HookFunction, HookFunctionPayload, HookStatus, MemoizedFns, HookConfig } from './types';
//@ts-expect-error The dynamic import is a workaround for cjs
import importFn from './dynamicImport';
import {
	isModuleFn,
	isRemoteFn,
	getWrappedLocalHookFunction,
	getWrappedLocalModuleHookFunction,
	getWrappedRemoteHookFunction,
} from './utils';

export interface BeforeSourceHookBuildConfig {
	baseDir: string;
	beforeSource?: HookConfig[];
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

export interface BeforeSourceHookPayload {
	sourceName: string;
	request: RequestInit;
	operation: any;
}

export interface BeforeSourceHookExecConfig {
	payload: BeforeSourceHookPayload;
}

const getBeforeSourceHookHandler = (fnBuildConfig: BeforeSourceHookBuildConfig) => {
	return async (fnExecConfig: BeforeSourceHookExecConfig) => {
		const { baseDir, logger, beforeSource } = fnBuildConfig;
		const { payload } = fnExecConfig;

		const beforeSourceHooks = beforeSource || [];

		for (const hookConfig of beforeSourceHooks) {
			let hookFn: HookFunction | undefined;

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
					logger.error('Error while invoking beforeSource hook %o', err);
					if (err instanceof Error) {
						throw new Error(err.message);
					}
					if (err && typeof err === 'object' && 'message' in err) {
						throw new Error((err as { message?: string }).message);
					}
					throw new Error('Error while invoking beforeSource hook');
				}
			}
		}
	};	
};

export default getBeforeSourceHookHandler;