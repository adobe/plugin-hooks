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

import { GraphQLError } from 'graphql/error';
import getAfterAllHookHandler from './handleAfterAllHooks';
import type { HookConfig, GraphQLResult, StateApi } from './types';
import type { YogaLogger, GraphQLParams } from 'graphql-yoga';
import { PLUGIN_HOOKS_ERROR_CODES } from './errors';

export interface AfterAllExecutionContext {
	params: GraphQLParams;
	request: Request;
	body: unknown;
	headers: Record<string, string>;
	secrets: Record<string, string>;
	state: StateApi;
	logger: YogaLogger;
	document: unknown;
	result: GraphQLResult;
	setResultAndStopExecution: (result: GraphQLResult) => void;
	afterAll: HookConfig;
}

/**
 * Executes the `beforeAll` hook handler with the provided context.
 * @param afterAllHookHandler Before all hook handler function.
 * @param context Context.
 */
export async function executeAfterAllHook(
	afterAllHookHandler: ReturnType<typeof getAfterAllHookHandler>,
	context: AfterAllExecutionContext,
): Promise<void> {
	const {
		params,
		request,
		body,
		headers,
		secrets,
		state,
		logger,
		document,
		result,
		setResultAndStopExecution,
		afterAll,
	} = context;

	try {
		// Create payload with the execution result
		const payload = {
			context: { params, request, body, headers, secrets, state, logger },
			document,
			result, // This is the GraphQL execution result
		};

		// Execute the afterAll hook and get the response
		const hookResponse = await afterAllHookHandler({ payload });

		logger.debug('onExecuteDone executed successfully for afterAll hook');

		// Apply the modified result if hook returned one in data.result format
		if (hookResponse?.data?.result && afterAll?.blocking) {
			setResultAndStopExecution({
				data: hookResponse.data.result.data || result.data,
				errors: hookResponse.data.result.errors || result.errors,
				extensions: hookResponse.data.result.extensions || result.extensions,
			});
		}
	} catch (err: unknown) {
		logger.error('Error in onExecuteDone for afterAll hook:', err);

		// For blocking hooks, throw the error to propagate it to the GraphQL response
		if (afterAll?.blocking) {
			setResultAndStopExecution({
				data: null,
				errors: [
					new GraphQLError(
						(err instanceof Error && err.message) || 'Error while executing afterAll hook',
						{
							extensions: {
								code: PLUGIN_HOOKS_ERROR_CODES.ERROR_PLUGIN_HOOKS_AFTER_ALL,
							},
						},
					),
				],
			});
		}
	}
}
