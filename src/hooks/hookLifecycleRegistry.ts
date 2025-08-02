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

import type { GraphQLError as GraphQLErrorType } from 'graphql/error/GraphQLError';
import {
	type GraphQLData,
	type HookFunctionPayload,
	SetResponseFn,
	SetResultAndStopExecutionFn,
	UpdateContextFn,
} from '../types';
import { Hook } from './hook';
import { SourceHook } from './sourceHook';

export enum HookLifecycleEvent {
	ON_EXECUTE = 'onExecute',
	ON_FETCH = 'onFetch',
	ON_FETCH_DONE = 'onFetchDone',
	ON_EXECUTE_DONE = 'onExecuteDone',
}

export type HookLifecycleEventParams = {
	event: HookLifecycleEvent;
};

export type HookLifecycleOnExecuteParams = HookLifecycleEventParams & {
	event: HookLifecycleEvent.ON_EXECUTE;
	payload: HookFunctionPayload;
	updateContext: UpdateContextFn;
	setResultAndStopExecution: SetResultAndStopExecutionFn;
};

export type HookLifecycleOnFetchParams = HookLifecycleEventParams & {
	event: HookLifecycleEvent.ON_FETCH;
	payload: HookFunctionPayload & {
		request: RequestInit;
	};
	sourceName: string;
};

export type HookLifecycleOnFetchDoneParams = HookLifecycleEventParams & {
	event: HookLifecycleEvent.ON_FETCH_DONE;
	payload: HookFunctionPayload & {
		response: Response;
	};
	sourceName: string;
	setResponse: SetResponseFn;
};

export type HookLifecycleOnExecuteDoneParams = HookLifecycleEventParams & {
	event: HookLifecycleEvent.ON_EXECUTE_DONE;
	payload: HookFunctionPayload & {
		result: { data?: GraphQLData; errors?: GraphQLErrorType[] };
	};
	setResultAndStopExecution: SetResultAndStopExecutionFn;
};

export type HookLifecycleInvokeHooksParams =
	| HookLifecycleOnExecuteParams
	| HookLifecycleOnFetchParams
	| HookLifecycleOnFetchDoneParams
	| HookLifecycleOnExecuteDoneParams;

class HookLifecycleRegistry {
	private readonly onExecute: Hook[];
	private readonly onExecuteDone: Hook[];
	private readonly onFetch: Record<string, SourceHook[]>;
	private readonly onFetchDone: Record<string, SourceHook[]>;

	constructor() {
		this.onExecute = [];
		this.onExecuteDone = [];
		this.onFetch = {};
		this.onFetchDone = {};
	}

	/**
	 * Add a hook to the registry based on its lifecycle event.
	 * @param hook Hook.
	 */
	public addHookToRegistry(hook: Hook): void {
		const lifeCycleEvent = hook.getLifecycleEvent();
		switch (lifeCycleEvent) {
			case HookLifecycleEvent.ON_EXECUTE:
				this.onExecute.push(hook);
				break;
			case HookLifecycleEvent.ON_EXECUTE_DONE:
				this.onExecuteDone.push(hook);
				break;
			default:
				throw new Error(`Unknown lifecycle hook type: ${lifeCycleEvent}`);
		}
	}

	/**
	 * Add a hook to the registry based on its lifecycle event.
	 * @param hook Hook.
	 */
	public addSourceHookToRegistry(hook: SourceHook): void {
		const lifeCycleEvent = hook.getLifecycleEvent();
		const sourceName = hook.getSourceName();
		switch (lifeCycleEvent) {
			case HookLifecycleEvent.ON_FETCH:
				if (!Array.isArray(this.onFetch[sourceName])) {
					this.onFetch[sourceName] = [];
				}
				this.onFetch[sourceName].push(hook);
				break;
			case HookLifecycleEvent.ON_FETCH_DONE:
				if (!Array.isArray(this.onFetchDone[sourceName])) {
					this.onFetchDone[sourceName] = [];
				}
				this.onFetchDone[sourceName].push(hook);
				break;
			default:
				throw new Error(`Unknown lifecycle hook type: ${lifeCycleEvent}`);
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
	 * Invoke all hooks of a specific lifecycle type with the provided parameters.
	 * @param params Hook lifecycle parameters that include the context and payload
	 */
	public async invokeHooks(params: HookLifecycleInvokeHooksParams): Promise<void> {
		let hooks: Hook[];

		const { event } = params;

		switch (event) {
			case HookLifecycleEvent.ON_EXECUTE:
				hooks = this.onExecute;
				break;
			case HookLifecycleEvent.ON_EXECUTE_DONE:
				hooks = this.onExecuteDone;
				break;
			case HookLifecycleEvent.ON_FETCH:
				hooks = this.onFetch[params.sourceName];
				break;
			case HookLifecycleEvent.ON_FETCH_DONE:
				hooks = this.onFetchDone[params.sourceName];
				break;
			default:
				throw new Error(`Unknown lifecycle hook type: ${event}`);
		}

		for (const hook of hooks) {
			await hook.invoke(params);
		}
	}
}

export { HookLifecycleRegistry };
