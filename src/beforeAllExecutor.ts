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
import getBeforeAllHookHandler, { UpdateContextFn } from './handleBeforeAllHooks';
import type { HookConfig, MemoizedFns, GraphQLResult } from './types';
import type { YogaLogger, GraphQLParams } from 'graphql-yoga';
import { PLUGIN_HOOKS_ERROR_CODES } from './errorCodes';

export interface BeforeAllExecutionContext {
	params: GraphQLParams;
	request: Request;
	body: unknown;
	headers: Record<string, string>;
	secrets: Record<string, string>;
	document: unknown;
	updateContext: UpdateContextFn;
	setResultAndStopExecution: (result: GraphQLResult) => void;
}

export async function executeBeforeAllHook(
	beforeAllHookHandler: ReturnType<typeof getBeforeAllHookHandler>,
	context: BeforeAllExecutionContext,
): Promise<void> {
	const {
		params,
		request,
		body,
		headers,
		secrets,
		document,
		updateContext,
		setResultAndStopExecution,
	} = context;

	try {
		const payload = {
			context: { params, request, body, headers, secrets },
			document,
		};
		await beforeAllHookHandler({ payload, updateContext });
	} catch (err: unknown) {
		setResultAndStopExecution({
			data: null,
			errors: [
				new GraphQLError((err instanceof Error && err.message) || 'Error while executing hooks', {
					extensions: {
						code: PLUGIN_HOOKS_ERROR_CODES.ERROR_PLUGIN_HOOKS_BEFORE_ALL,
					},
				}),
			],
		});
		throw err; // Re-throw to indicate execution should stop
	}
}

export function createBeforeAllHookHandler(
	beforeAll: HookConfig,
	baseDir: string,
	logger: YogaLogger,
	memoizedFns: MemoizedFns,
) {
	return getBeforeAllHookHandler({
		memoizedFns,
		baseDir,
		logger,
		beforeAll,
	});
}
