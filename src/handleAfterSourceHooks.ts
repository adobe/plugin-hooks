import type { YogaLogger } from 'graphql-yoga';
import { HookFunction, HookStatus, MemoizedFns, HookConfig } from './types';
import type { SourceHookExecConfig } from './utils/hookResolver';
import { resolveSourceHookFunction } from './utils/hookResolver';

export interface AfterSourceHookBuildConfig {
	baseDir: string;
	afterSource?: HookConfig[];
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

const getAfterSourceHookHandler = (fnBuildConfig: AfterSourceHookBuildConfig) => {
	return async (fnExecConfig: SourceHookExecConfig) => {
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
			const hookFn: HookFunction | undefined = await resolveSourceHookFunction(hookConfig, i, {
				hookConfigs: afterSourceHooks,
				hookType: 'afterSource',
				baseDir,
				logger,
				memoizedFns,
			});

			if (hookFn) {
				try {
					const hooksResponse = await hookFn(payload);
					if (hookConfig.blocking) {
						if (hooksResponse.status.toUpperCase() === HookStatus.ERROR) {
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
