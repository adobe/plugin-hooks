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

import { EnvelopLifecycleEvent } from '../envelop';
import { PluginHooksErrorCode } from '../errors';
import { Hook, HookBuildConfig } from '../hooks/hook';
import { SourceHook } from '../hooks/sourceHook';

/**
 * Configurable mock class for testing purposes.
 */
class MockHook extends Hook {
	constructor(
		type: string,
		lifecycleEvent: EnvelopLifecycleEvent,
		errorCode: PluginHooksErrorCode,
		config: HookBuildConfig,
	) {
		super(type, lifecycleEvent, errorCode, config);
	}

	public wrapHookFunction = vi.fn();

	public invoke = vi.fn();
}

/**
 * Configurable mock class for testing purposes.
 */
class MockSourceHook extends SourceHook {
	constructor(
		type: string,
		lifecycleEvent: EnvelopLifecycleEvent,
		errorCode: PluginHooksErrorCode,
		config: HookBuildConfig,
		sourceName: string,
	) {
		super(type, lifecycleEvent, errorCode, config, sourceName);
	}

	public wrapHookFunction = vi.fn();

	public invoke = vi.fn();
}

const mockHookFactory = (lifeCycleEvent: EnvelopLifecycleEvent) =>
	new MockHook('mockHook', lifeCycleEvent, 'ERROR_PLUGIN_HOOKS', {} as unknown as HookBuildConfig);

const mockSourceHookFactory = (lifeCycleEvent: EnvelopLifecycleEvent, sourceName: string) =>
	new MockSourceHook(
		'mockHook',
		lifeCycleEvent,
		'ERROR_PLUGIN_HOOKS',
		{} as unknown as HookBuildConfig,
		sourceName,
	);

export { mockHookFactory, mockSourceHookFactory };
