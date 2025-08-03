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

import { PluginHooksErrorCode } from '../types';
import { Hook, HookBuildConfig } from './hook';
import { EnvelopLifecycleEvent } from '../envelop';

/**
 * Abstract class representing a source specific hook in the system.
 */
abstract class SourceHook extends Hook {
	/**
	 * The name of the source this hook is associated with.
	 * @private
	 */
	private readonly sourceName: string;

	protected constructor(
		type: string,
		lifecycleEvent: EnvelopLifecycleEvent,
		errorCode: PluginHooksErrorCode,
		hookConfig: HookBuildConfig,
		sourceName: string,
	) {
		super(type, lifecycleEvent, errorCode, hookConfig);
		this.sourceName = sourceName;
	}

	/**
	 * Gets the name of the source this hook is associated with.
	 */
	public getSourceName() {
		return this.sourceName;
	}
}

export { SourceHook };
