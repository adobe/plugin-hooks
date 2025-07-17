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

import { UpdateContextFn } from './handleBeforeAllHooks';
import { createBeforeAllHookHandler, executeBeforeAllHook } from './beforeAllExecutor';
import { createAfterAllHookHandler, executeAfterAllHook } from './afterAllExecutor';
import type {
	HookConfig,
	MemoizedFns,
	UserContext,
	GraphQLData,
	GraphQLError as GraphQLErrorType,
} from './types';
import type { YogaLogger, Plugin, YogaInitialContext } from 'graphql-yoga';

// Export types for developer experience working w/ plugins
export type { HookFunction, HookFunctionPayload, HookResponse, HookStatus } from './types';

interface PluginConfig {
	baseDir: string;
	logger: YogaLogger;
	beforeAll?: HookConfig;
	afterAll?: HookConfig;
}

type HooksPlugin = Plugin<YogaInitialContext, Record<string, unknown>, UserContext>;

export default async function hooksPlugin(config: PluginConfig): Promise<HooksPlugin> {
	try {
		const { beforeAll, afterAll, baseDir, logger } = config;

		if (!beforeAll && !afterAll) {
			return { onExecute: async () => ({}) };
		}
		const memoizedFns: MemoizedFns = {};
		const beforeAllHookHandler = beforeAll
			? createBeforeAllHookHandler(beforeAll, baseDir, logger, memoizedFns)
			: null;
		const afterAllHookHandler = afterAll
			? createAfterAllHookHandler(afterAll, baseDir, logger, memoizedFns)
			: null;
		return {
			async onExecute({ args, setResultAndStopExecution, extendContext }) {
				const query = args.contextValue?.params?.query;
				const { document, contextValue: context } = args;
				const { params, request } = context || {};
				const headers = Object.fromEntries(request.headers.entries());
				const secrets = ('secrets' in context ? context.secrets : {}) as Record<string, string>;
				let body = {};
				if (request && request.body) {
					body = request.body;
				}

				const updateContext: UpdateContextFn = data => {
					const { headers: newHeaders } = data;
					if (newHeaders) {
						const updatedHeaders = {
							...headers,
							...newHeaders,
						};
						extendContext({
							headers: updatedHeaders,
						});
					}
				};

				// Ignore introspection queries
				const operationName = args.operationName;
				const isIntrospectionQuery =
					operationName === 'IntrospectionQuery' ||
					(query && query.includes('query IntrospectionQuery'));
				if (isIntrospectionQuery) {
					return {};
				}

				/**
				 * Execute Before All Hook
				 */
				if (beforeAllHookHandler) {
					try {
						await executeBeforeAllHook(beforeAllHookHandler, {
							params,
							request,
							body,
							headers,
							secrets,
							document,
							updateContext,
							setResultAndStopExecution,
						});
					} catch {
						// Error already handled by executeBeforeAllHook, just return to stop execution
						return {};
					}
				}

				if (afterAllHookHandler) {
					return {
						onExecuteDone: async ({
							result,
						}: {
							result: { data?: GraphQLData; errors?: GraphQLErrorType[] };
						}) => {
							await executeAfterAllHook(afterAllHookHandler, {
								params,
								request,
								body,
								headers,
								secrets,
								document,
								result,
								setResultAndStopExecution,
								logger,
								afterAll: afterAll!,
							});
						},
					};
				}

				return {};
			},
		};
	} catch (err: unknown) {
		console.error('Error while initializing "hooks" plugin', err);
		return { onExecute: async () => ({}) };
	}
}
