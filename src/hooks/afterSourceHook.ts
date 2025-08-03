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
import { HookBuildConfig, WrappedHookFunction } from './hook';
import {
	EnvelopLifecycleEvent,
	EnvelopLifecycleInvokeHooksParams,
	EnvelopLifecycleOnFetchDoneParams,
} from '../envelop';
import { SourceHook } from './sourceHook';

class AfterSourceHook extends SourceHook {
	constructor(buildConfig: HookBuildConfig, sourceName: string) {
		super(
			'afterSource',
			EnvelopLifecycleEvent.ON_FETCH_DONE,
			PLUGIN_HOOKS_ERROR_CODES.ERROR_PLUGIN_HOOKS_AFTER_SOURCE,
			buildConfig,
			sourceName,
		);
	}

	public wrapHookFunction(): WrappedHookFunction {
		return async (execConfig: EnvelopLifecycleInvokeHooksParams) => {
			const buildConfig = this.getBuildConfig();
			const { baseDir, logger, config } = buildConfig;
			const hookType = this.getType();
			const { payload, sourceName, setResponse } = execConfig as EnvelopLifecycleOnFetchDoneParams;

			// Ensure the hooks source name matches the executing source
			if (this.getSourceName() !== sourceName) {
				return;
			}

			// Resolve hook function using shared utility
			const afterSourceFn = await getExternalFunction({
				hookConfig: config,
				baseDir,
				logger,
			});

			if (!afterSourceFn) {
				return;
			}

			try {
				// Invoke the hook function with the payload
				const hooksResponse = await afterSourceFn(payload);

				// Non-blocking hooks can return immediately
				if (!config.blocking) {
					return;
				}

				// Blocking hooks should always return a successful response, otherwise consider this an error
				if (hooksResponse?.status?.toUpperCase() !== HookStatus.SUCCESS) {
					throw this.getNormalizedHookError(hooksResponse);
				}

				// Update Response with serialized data from hook
				if (hooksResponse && hooksResponse.data?.response) {
					const { body, headers, status, statusText } = hooksResponse.data.response;
					setResponse(
						new Response(body || payload.response.body, {
							status: status || payload.response.status,
							statusText: statusText || payload.response.statusText,
							headers: {
								...Object.fromEntries(payload.response.headers.entries()),
								...headers,
							},
						}),
					);
				}
			} catch (err: unknown) {
				logger.error('Error while invoking %s hook %o', hookType, err);
				throw this.getNormalizedHookError(err);
			}
		};
	}
}

export { AfterSourceHook };
