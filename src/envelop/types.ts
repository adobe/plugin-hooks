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

/**
 * Envelop lifecycle events that can be used to register hooks.
 */
export enum EnvelopLifecycleEvent {
	/**
	 * Triggered before an operation is executed.
	 */
	ON_EXECUTE = 'onExecute',
	/**
	 * Triggered after execution of an operation is done.
	 */
	ON_EXECUTE_DONE = 'onExecuteDone',
	/**
	 * Triggered before a fetch request is made to a source. Specific to GraphQL Mesh servers.
	 */
	ON_FETCH = 'onFetch',
	/**
	 * Triggered after a fetch request to a source is done. Specific to GraphQL Mesh servers.
	 */
	ON_FETCH_DONE = 'onFetchDone',
}

/**
 * Parameters sent in each lifecycle event.
 */
export type EnvelopLifecycleEventParams = {
	event: EnvelopLifecycleEvent;
};

/**
 * Parameters for the `onExecute` lifecycle event.
 */
export type EnvelopLifecycleOnExecuteParams = EnvelopLifecycleEventParams & {
	event: EnvelopLifecycleEvent.ON_EXECUTE;
	payload: HookFunctionPayload;
	updateContext: UpdateContextFn;
	setResultAndStopExecution: SetResultAndStopExecutionFn;
};

/**
 * Parameters for the `onExecuteDone` lifecycle event.
 */
export type EnvelopLifecycleOnExecuteDoneParams = EnvelopLifecycleEventParams & {
	event: EnvelopLifecycleEvent.ON_EXECUTE_DONE;
	payload: HookFunctionPayload & {
		result: { data?: GraphQLData; errors?: GraphQLErrorType[] };
	};
	setResultAndStopExecution: SetResultAndStopExecutionFn;
};

/**
 * Parameters for the `onFetch` lifecycle event.
 */
export type EnvelopLifecycleOnFetchParams = EnvelopLifecycleEventParams & {
	event: EnvelopLifecycleEvent.ON_FETCH;
	payload: HookFunctionPayload & {
		request: RequestInit;
	};
	sourceName: string;
};

/**
 * Parameters for the `onFetchDone` lifecycle event.
 */
export type EnvelopLifecycleOnFetchDoneParams = EnvelopLifecycleEventParams & {
	event: EnvelopLifecycleEvent.ON_FETCH_DONE;
	payload: HookFunctionPayload & {
		response: Response;
	};
	sourceName: string;
	setResponse: SetResponseFn;
};

/**
 * Union type for all lifecycle event parameters.
 */
export type EnvelopLifecycleInvokeHooksParams =
	| EnvelopLifecycleOnExecuteParams
	| EnvelopLifecycleOnExecuteDoneParams
	| EnvelopLifecycleOnFetchParams
	| EnvelopLifecycleOnFetchDoneParams;
