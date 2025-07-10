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
import getAfterAllHookHandler from './handleAfterAllHooks';
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
			? getBeforeAllHookHandler({
					baseDir,
					beforeAll,
					logger,
					memoizedFns,
				})
			: null;
		const afterAllHookHandler = afterAll
			? getAfterAllHookHandler({
					baseDir,
					afterAll,
					logger,
					memoizedFns,
				})
			: null;
		return {
			async onExecute({ args, setResultAndStopExecution, extendContext }) {
				const query = args.contextValue?.params?.query;
				const { document, contextValue: context } = args;
				const { params, request } = context || {};
				const headers = Object.fromEntries(request.headers.entries());
				const secrets = 'secrets' in context ? context.secrets : {};
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
				 * Start Before All Hook
				 */
				if (beforeAllHookHandler) {
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
								new GraphQLError(
									(err instanceof Error && err.message) || 'Error while executing hooks',
									{
										extensions: {
											code: 'PLUGIN_HOOKS_ERROR',
										},
									},
								),
							],
						});
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
							try {
								// Create payload with the execution result
								const payload = {
									context: { params, request, body, headers, secrets },
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
												(err instanceof Error && err.message) ||
													'Error while executing afterAll hook 222',
												{
													extensions: {
														code: 'AFTER_ALL_HOOK_ERROR',
													},
												},
											),
										],
									});
								}
							}
						},
					};
				}

				/**
				 * End Before All Hook
				 */
				return {};
			},
		};
	} catch (err: unknown) {
		console.error('Error while initializing "hooks" plugin', err);
		return { onExecute: async () => ({}) };
	}
}
