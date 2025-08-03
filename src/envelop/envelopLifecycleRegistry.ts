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

import { YogaLogger } from 'graphql-yoga';
import { Hook } from '../hooks/hook';
import { SourceHook } from '../hooks/sourceHook';
import { EnvelopLifecycleEvent, EnvelopLifecycleInvokeHooksParams } from './types';

/**
 * Registry for managing hooks and invoking hooks associated with Envelop lifecycle events. Hooks can be added to the
 * registry and invoked based on their lifecycle events. Invoking hooks from the registry will only execute hooks based
 * on their attributed lifecycle event (and source name if applicable).
 *
 * To extend the lifecycle registry with new Envelop lifecycle events you must add them to the enum
 * {@link EnvelopLifecycleEvent}, implement a container property in the class, and handle the lifecycle event based on
 * whether it is a global or source hook in the methods.
 *
 * @example Usage
 * ```typescript
 * import { EnvelopLifecycleRegistry } from './envelopLifecycleRegistry';
 * const lifecycleRegistry = new EnvelopLifecycleRegistry();
 * // Add a global hook
 * lifecycleRegistry.addHookToRegistry(...);
 * // Add a source hook
 * lifecycleRegistry.addHookToRegistry(...)
 * // Invoke hooks for a specific lifecycle event
 * await lifecycleRegistry.invokeHooks({
 * 	event: EnvelopLifecycleEvent.ON_EXECUTE,
 *});
 * ```
 */
class EnvelopLifecycleRegistry {
	/**
	 * Logger for logging messages related to the lifecycle registry.
	 * @private
	 */
	private readonly logger: YogaLogger;

	/**
	 * Hooks to be executed for the ON_EXECUTE lifecycle event.
	 * @private
	 */
	private readonly onExecute: Hook[];

	/**
	 * Hooks to be executed for the ON_EXECUTE_DONE lifecycle event.
	 * @private
	 */
	private readonly onExecuteDone: Hook[];

	/**
	 * Hooks to be executed for the ON_FETCH lifecycle event, indexed by source name.
	 * @private
	 */
	private readonly onFetch: Record<string, SourceHook[]>;

	/**
	 * Hooks to be executed for the ON_FETCH_DONE lifecycle event, indexed by source name.
	 * @private
	 */
	private readonly onFetchDone: Record<string, SourceHook[]>;

	constructor(logger?: YogaLogger) {
		this.logger = logger || console;
		this.onExecute = [];
		this.onExecuteDone = [];
		this.onFetch = {};
		this.onFetchDone = {};
	}

	/**
	 * Add a global hook to the registry based on its lifecycle event. Global hooks are not specific to any one source.
	 * @param hook Hook.
	 */
	private addGlobalHookToRegistry(hook: Hook): void {
		const lifecycleEvent = hook.getLifecycleEvent();
		switch (lifecycleEvent) {
			case EnvelopLifecycleEvent.ON_EXECUTE:
				this.onExecute.push(hook);
				break;
			case EnvelopLifecycleEvent.ON_EXECUTE_DONE:
				this.onExecuteDone.push(hook);
				break;
			default:
				throw new Error(
					`Error adding global hook to registry. Hook has invalid or unimplemented lifecycle event "${lifecycleEvent}".`,
				);
		}
	}

	/**
	 * Add a source hook to the registry based on its lifecycle event. Source hooks are specific to a source name and will
	 * only be invoked for that source.
	 * @param hook Hook.
	 */
	private addSourceHookToRegistry(hook: SourceHook): void {
		const lifecycleEvent = hook.getLifecycleEvent();
		const sourceName = hook.getSourceName();
		switch (lifecycleEvent) {
			case EnvelopLifecycleEvent.ON_FETCH:
				if (!Array.isArray(this.onFetch[sourceName])) {
					this.onFetch[sourceName] = [];
				}
				this.onFetch[sourceName].push(hook);
				break;
			case EnvelopLifecycleEvent.ON_FETCH_DONE:
				if (!Array.isArray(this.onFetchDone[sourceName])) {
					this.onFetchDone[sourceName] = [];
				}
				this.onFetchDone[sourceName].push(hook);
				break;
			default:
				throw new Error(
					`Error adding source hook to registry. Hook has invalid or unimplemented lifecycle event "${lifecycleEvent}".`,
				);
		}
	}

	/**
	 * Add a hook to the registry based on its lifecycle event.
	 * @param hook Hook.
	 */
	public addHookToRegistry(hook: Hook): void {
		this.logger.debug(
			'Adding "%s" hook to registry at "%s" event',
			hook.getType(),
			hook.getLifecycleEvent(),
		);
		if (hook instanceof SourceHook) {
			this.addSourceHookToRegistry(hook);
		} else {
			this.addGlobalHookToRegistry(hook);
		}
	}

	/**
	 * Add multiple hooks to the registry based on their lifecycle events.
	 * @param hooks Array of hooks.
	 */
	public addHooksToRegistry(hooks: Hook[]): void {
		hooks.forEach(hook => {
			this.addHookToRegistry(hook);
		});
	}

	/**
	 * Get all hooks associated with a specific lifecycle event.
	 * @param params Hook lifecycle parameters that include the context and payload
	 */
	public getHooks(params: EnvelopLifecycleInvokeHooksParams): Hook[] {
		const { event } = params;
		switch (event) {
			case EnvelopLifecycleEvent.ON_EXECUTE:
				return this.onExecute;
			case EnvelopLifecycleEvent.ON_EXECUTE_DONE:
				return this.onExecuteDone;
			case EnvelopLifecycleEvent.ON_FETCH:
				return this.onFetch[params.sourceName] || [];
			case EnvelopLifecycleEvent.ON_FETCH_DONE:
				return this.onFetchDone[params.sourceName] || [];
			default:
				throw new Error(
					`Error retrieving hooks. Invalid or unimplemented lifecycle event "${event}".`,
				);
		}
	}

	/**
	 * Invoke all hooks of a specific lifecycle type with the provided parameters.
	 * @param params Hook lifecycle parameters that include the context and payload
	 */
	public async invokeHooks(params: EnvelopLifecycleInvokeHooksParams): Promise<void> {
		const hooks = this.getHooks(params);
		this.logger.debug(
			'Preparing to invoke %d hooks for lifecycle event "%s".',
			hooks.length,
			params.event,
		);
		for (const hook of hooks) {
			await hook.invoke(params);
		}
	}
}

export { EnvelopLifecycleRegistry };
