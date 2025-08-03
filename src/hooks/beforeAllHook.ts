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
	EnvelopLifecycleOnExecuteParams,
} from '../envelop';

class BeforeAllHook extends Hook {
	constructor(buildConfig: HookBuildConfig) {
		super(
			'beforeAll',
			EnvelopLifecycleEvent.ON_EXECUTE,
			PLUGIN_HOOKS_ERROR_CODES.ERROR_PLUGIN_HOOKS_BEFORE_ALL,
			buildConfig,
		);
	}

	public wrapHookFunction(): WrappedHookFunction {
		return async (execConfig: EnvelopLifecycleInvokeHooksParams) => {
			const { baseDir, logger, config } = this.getBuildConfig();
			const hookType = this.getType();
			const { payload, updateContext, setResultAndStopExecution } =
				execConfig as EnvelopLifecycleOnExecuteParams;

			// Resolve hook function using shared utility
			const beforeAllFn = await getExternalFunction({
				hookConfig: config,
				baseDir,
				logger,
			});

			if (!beforeAllFn) {
				return;
			}

			try {
				// Invoke the hook function with the payload
				const hooksResponse = await beforeAllFn(payload);

				// Non-blocking hooks can return immediately
				if (!config.blocking) {
					return;
				}

				// Blocking hooks should always return a successful response, otherwise consider this an error
				if (hooksResponse?.status?.toUpperCase() !== HookStatus.SUCCESS) {
					throw this.getNormalizedHookError(hooksResponse);
				}

				if (hooksResponse.data) {
					updateContext(hooksResponse.data);
				}
			} catch (err: unknown) {
				logger.error('Error while invoking %s hook %o', hookType, err);
				setResultAndStopExecution({
					data: null,
					errors: [this.getNormalizedHookError(err)],
				});
			}
		};
	}
}

export { BeforeAllHook };
