import type { GraphQLError as GraphQLErrorType } from 'graphql/error/GraphQLError';
import {
	type GraphQLData,
	type HookFunctionPayload,
	SetResultAndStopExecutionFn,
	UpdateContextFn,
} from '../types';
import { Hook } from './hook';

export enum HookLifecycleEvent {
	ON_EXECUTE = 'onExecute',
	ON_FETCH = 'onFetch',
	ON_FETCH_DONE = 'onFetchDone',
	ON_EXECUTE_DONE = 'onExecuteDone',
}

export type HookLifecycleOnExecuteParams = {
	event: HookLifecycleEvent.ON_EXECUTE;
	payload: HookFunctionPayload;
	updateContext: UpdateContextFn;
	setResultAndStopExecution: SetResultAndStopExecutionFn;
};

export type HookLifecycleOnFetchParams = {
	event: HookLifecycleEvent.ON_FETCH;
	payload: HookFunctionPayload;
};

export type HookLifecycleOnFetchDoneParams = {
	event: HookLifecycleEvent.ON_FETCH_DONE;
	payload: HookFunctionPayload;
};

export type HookLifecycleOnExecuteDoneParams = {
	event: HookLifecycleEvent.ON_EXECUTE_DONE;
	payload: HookFunctionPayload;
	result: { data?: GraphQLData; errors?: GraphQLErrorType[] };
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
	private readonly onFetch: Hook[];
	private readonly onFetchDone: Hook[];

	constructor() {
		this.onExecute = [];
		this.onExecuteDone = [];
		this.onFetch = [];
		this.onFetchDone = [];
	}

	public addHookToRegistry(hookLifecycleEvent: HookLifecycleEvent, hook: Hook): void {
		switch (hookLifecycleEvent) {
			case HookLifecycleEvent.ON_EXECUTE:
				this.onExecute.push(hook);
				break;
			case HookLifecycleEvent.ON_EXECUTE_DONE:
				this.onExecuteDone.push(hook);
				break;
			case HookLifecycleEvent.ON_FETCH:
				this.onFetch.push(hook);
				break;
			case HookLifecycleEvent.ON_FETCH_DONE:
				this.onFetchDone.push(hook);
				break;
			default:
				throw new Error(`Unknown lifecycle hook type: ${hookLifecycleEvent}`);
		}
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
				hooks = this.onFetch;
				break;
			case HookLifecycleEvent.ON_FETCH_DONE:
				hooks = this.onFetchDone;
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
