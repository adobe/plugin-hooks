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

import { MeshPlugin } from '@graphql-mesh/types';
import { GraphQLError, GraphQLResolveInfo } from 'graphql';
import type { Plugin, YogaInitialContext, YogaLogger } from 'graphql-yoga';
import getAfterSourceHookHandler from './handleAfterSourceHooks';
import getBeforeSourceHookHandler from './handleBeforeSourceHooks';
import { AfterAllHook } from './hooks/afterAllHook';
import { BeforeAllHook } from './hooks/beforeAllHook';
import { HookLifecycleEvent, HookLifecycleRegistry } from './hooks/hookLifecycleRegistry';
import {
	AfterSourceHookFunctionPayload,
	BeforeSourceHookFunctionPayload,
	GraphQLData,
	HookConfig,
	MemoizedFns,
	PLUGIN_HOOKS_ERROR_CODES,
	SourceHookConfig,
	StateApi,
	UpdateContextFn,
	UserContext,
} from './types';

// Export types for developer experience working w/ plugins
export type { HookFunction, HookFunctionPayload, HookResponse, HookStatus } from './types';

interface PluginConfig {
	baseDir: string;
	logger: YogaLogger;
	beforeAll?: HookConfig;
	beforeSource?: SourceHookConfig;
	afterSource?: SourceHookConfig;
	afterAll?: HookConfig;
}

type GraphQLResolveInfoWithSourceName = GraphQLResolveInfo & {
	sourceName: string;
};

type HooksPlugin = Plugin<YogaInitialContext, Record<string, unknown>, UserContext> &
	MeshPlugin<UserContext>;

export default async function hooksPlugin(config: PluginConfig): Promise<HooksPlugin> {
	try {
		// Configure hooks
		const { beforeAll, afterAll, beforeSource, afterSource, baseDir, logger } = config;
		let isIntrospectionQuery = false;

		// Check if any hooks are configured
		const hasAnyHooks = beforeAll || afterAll || beforeSource || afterSource;
		if (!hasAnyHooks) {
			return {
				onExecute: async () => ({}),
				onFetch: async () => {},
			};
		}
		const memoizedFns: MemoizedFns = {
			afterSource: {},
			beforeSource: {},
		};

		const hookLifecycleRegistry = new HookLifecycleRegistry();

		if (beforeAll) {
			new BeforeAllHook({
				config: beforeAll,
				baseDir,
				logger,
				memoizedFns,
			}).addToHookLifecycleRegistry(hookLifecycleRegistry);
		}

		if (afterAll) {
			new AfterAllHook({
				config: afterAll,
				baseDir,
				logger,
				memoizedFns,
			}).addToHookLifecycleRegistry(hookLifecycleRegistry);
		}

		return {
			// Execute hooks
			async onExecute({ args, setResultAndStopExecution, extendContext }) {
				const { document, contextValue: context, operationName } = args;
				const { params, request } = context || {};

				// Ignore introspection queries
				const query = args.contextValue?.params?.query;
				isIntrospectionQuery =
					(operationName && operationName === 'IntrospectionQuery') ||
					(query && query.includes('query IntrospectionQuery'));
				if (isIntrospectionQuery) {
					isIntrospectionQuery = true;
					return {};
				}

				// Make the operation document available in the user context
				extendContext({
					document,
				});

				const headers = Object.fromEntries(request.headers.entries());
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

				const secrets = ('secrets' in context ? context.secrets : {}) as Record<string, string>;
				const state = ('state' in context ? context.state : {}) as StateApi;

				/**
				 * Execute Before All Hook
				 */
				try {
					await hookLifecycleRegistry.invokeHooks({
						event: HookLifecycleEvent.ON_EXECUTE,
						payload: {
							context: {
								params,
								request,
								headers,
								body,
								secrets,
								state,
								logger,
							},
							document,
						},
						updateContext,
						setResultAndStopExecution,
					});
				} catch (err: unknown) {
					logger.error('Error while invoking hook %o', err);
					setResultAndStopExecution({
						data: null,
						errors: [
							new GraphQLError(
								(err instanceof Error && err.message) || `Error while invoking hook`,
								{
									extensions: {
										code: PLUGIN_HOOKS_ERROR_CODES.ERROR_PLUGIN_HOOKS,
									},
								},
							),
						],
					});
				}

				if (afterAll) {
					return {
						onExecuteDone: async ({
							result,
						}: {
							result: { data?: GraphQLData; errors?: GraphQLError[] };
						}) => {
							try {
								console.log('zzz');
								console.log(JSON.stringify(result));
								await hookLifecycleRegistry.invokeHooks({
									event: HookLifecycleEvent.ON_EXECUTE_DONE,
									payload: {
										context: {
											params,
											request,
											headers,
											body,
											secrets,
											state,
											logger,
										},
										document,
									},
									result,
									setResultAndStopExecution,
								});
							} catch (err: unknown) {
								logger.error('Error while invoking hook %o', err);
								setResultAndStopExecution({
									data: null,
									errors: [
										new GraphQLError(
											(err instanceof Error && err.message) || `Error while invoking hook`,
											{
												extensions: {
													code: PLUGIN_HOOKS_ERROR_CODES.ERROR_PLUGIN_HOOKS,
												},
											},
										),
									],
								});
							}
						},
					};
				}

				return {};
			},
			async onFetch({ info, options, context }) {
				// Ignore situations where info is not defined (schema generation) or when not configured
				if (!info || (!config.afterSource && !config.beforeSource)) {
					return;
				}

				// Ignore introspection queries
				if (isIntrospectionQuery) {
					return;
				}

				const secrets = (context && 'secrets' in context ? context.secrets : {}) as Record<
					string,
					string
				>;
				const state = (context && 'state' in context ? context.state : {}) as StateApi;
				const sourceName = (info as GraphQLResolveInfoWithSourceName).sourceName;
				const beforeSourceHooks = config.beforeSource?.[sourceName] || [];
				if (beforeSourceHooks) {
					const beforeSourceHookHandler = getBeforeSourceHookHandler({
						baseDir,
						beforeSource: beforeSourceHooks,
						logger,
						memoizedFns,
					});

					try {
						const payload: BeforeSourceHookFunctionPayload = {
							context: {
								request: context.request,
								params: context.params,
								secrets: secrets!,
								state: state!,
								logger,
							},
							request: options,
							document: context.document,
							sourceName,
						};

						await beforeSourceHookHandler({
							payload,
							hookType: 'beforeSource',
							sourceName,
						});
					} catch (err: unknown) {
						throw new GraphQLError(
							(err instanceof Error && err.message) || 'Error while executing beforeSource hook',
							{
								extensions: {
									code: PLUGIN_HOOKS_ERROR_CODES.ERROR_PLUGIN_HOOKS_BEFORE_SOURCE,
								},
							},
						);
					}
				}

				return async ({
					response,
					setResponse,
				}: {
					response: Response;
					setResponse: (response: Response) => void;
				}) => {
					const afterSourceHooks = config.afterSource?.[sourceName] || [];
					const afterSourceHookHandler = getAfterSourceHookHandler({
						baseDir,
						afterSource: afterSourceHooks,
						logger,
						memoizedFns,
					});
					try {
						const payload: AfterSourceHookFunctionPayload = {
							context: {
								request: context.request,
								params: context.params,
								secrets: secrets!,
								state: state!,
								logger,
							},
							document: context.document,
							sourceName,
							response,
							setResponse,
						};
						await afterSourceHookHandler({
							payload,
							hookType: 'afterSource',
							sourceName,
						});
					} catch (err: unknown) {
						throw new GraphQLError(
							(err instanceof Error && err.message) || 'Error while executing afterSource hook',
							{
								extensions: {
									code: PLUGIN_HOOKS_ERROR_CODES.ERROR_PLUGIN_HOOKS_AFTER_SOURCE,
								},
							},
						);
					}
				};
			},
		};
	} catch (err: unknown) {
		console.error('Error while initializing "hooks" plugin', err);
		return { onExecute: async () => ({}) };
	}
}
