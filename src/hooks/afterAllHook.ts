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

import { PLUGIN_HOOKS_ERROR_CODES } from '../errors';
import { HookStatus } from '../types';
import { getExternalFunction } from '../external';
import { Hook, HookBuildConfig, WrappedHookFunction } from './hook';
import {
	EnvelopLifecycleEvent,
	EnvelopLifecycleInvokeHooksParams,
	EnvelopLifecycleOnExecuteDoneParams,
} from '../envelop';

class AfterAllHook extends Hook {
	constructor(buildConfig: HookBuildConfig) {
		super(
			'afterAll',
			EnvelopLifecycleEvent.ON_EXECUTE_DONE,
			PLUGIN_HOOKS_ERROR_CODES.ERROR_PLUGIN_HOOKS_AFTER_ALL,
			buildConfig,
		);
	}

	public wrapHookFunction(): WrappedHookFunction {
		return async (execConfig: EnvelopLifecycleInvokeHooksParams) => {
			const { baseDir, logger, config } = this.getBuildConfig();
			const hookType = this.getType();
			const { payload, setResultAndStopExecution } =
				execConfig as EnvelopLifecycleOnExecuteDoneParams;

			// Resolve hook function using shared utility
			const afterAllFn = await getExternalFunction({
				hookConfig: config,
				baseDir,
				logger,
			});

			if (!afterAllFn) {
				return;
			}

			try {
				// Invoke the hook function with the payload
				const hookResponse = await afterAllFn(payload);

				// Non-blocking hooks can return immediately
				if (!config.blocking) {
					return;
				}

				// Blocking hooks should always return a successful response, otherwise consider this an error
				if (hookResponse?.status?.toUpperCase() !== HookStatus.SUCCESS) {
					throw this.getNormalizedHookError(hookResponse);
				}

				if (hookResponse?.data?.result) {
					setResultAndStopExecution({
						data: hookResponse?.data?.result?.data || payload?.result?.data,
						errors: hookResponse?.data?.result?.errors || payload?.result?.errors,
					});
				}
			} catch (err: unknown) {
				logger.error('Error while invoking %s hook %o', hookType, err);
				if (config.blocking) {
					setResultAndStopExecution({
						data: null,
						errors: [this.getNormalizedHookError(err)],
					});
				}
			}
		};
	}
}

export { AfterAllHook };
