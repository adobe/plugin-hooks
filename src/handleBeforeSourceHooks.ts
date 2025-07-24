import type { YogaLogger } from 'graphql-yoga';
import { HookFunction, HookStatus, MemoizedFns, HookConfig } from './types';
import type { SourceHookExecConfig } from './utils/hookResolver';
import { resolveSourceHookFunction } from './utils/hookResolver';

export interface BeforeSourceHookBuildConfig {
	baseDir: string;
	beforeSource?: HookConfig[];
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

const getBeforeSourceHookHandler = (fnBuildConfig: BeforeSourceHookBuildConfig) => {
	return async (fnExecConfig: SourceHookExecConfig) => {
		const { baseDir, logger, beforeSource, memoizedFns } = fnBuildConfig;
		const { payload, sourceName } = fnExecConfig;

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
					if (hookConfig.blocking) {
						if (hooksResponse.status.toUpperCase() === HookStatus.ERROR) {
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
