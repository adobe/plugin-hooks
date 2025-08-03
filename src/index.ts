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
import { AfterAllHook, AfterSourceHook, BeforeAllHook, BeforeSourceHook } from './hooks';
import { Hook } from './hooks/hook';
import { EnvelopLifecycleEvent, EnvelopLifecycleRegistry } from './envelop';
import {
	GraphQLData,
	HookConfig,
	SetResponseFn,
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

		const hookLifecycleRegistry = new EnvelopLifecycleRegistry();

		if (beforeAll) {
			hookLifecycleRegistry.addHookToRegistry(
				new BeforeAllHook({
					config: beforeAll,
					baseDir,
					logger,
				}),
			);
		}

		if (afterAll) {
			hookLifecycleRegistry.addHookToRegistry(
				new AfterAllHook({
					config: afterAll,
					baseDir,
					logger,
				}),
			);
		}

		if (beforeSource) {
			Object.entries(beforeSource).forEach(([sourceName, hookConfigs]) => {
				hookConfigs.forEach(beforeSourceConfig => {
					hookLifecycleRegistry.addHookToRegistry(
						new BeforeSourceHook(
							{
								config: beforeSourceConfig,
								baseDir,
								logger,
							},
							sourceName,
						),
					);
				});
			});
		}

		if (afterSource) {
			Object.entries(afterSource).forEach(([sourceName, hookConfigs]) => {
				hookConfigs.forEach(beforeSourceConfig => {
					hookLifecycleRegistry.addHookToRegistry(
						new AfterSourceHook(
							{
								config: beforeSourceConfig,
								baseDir,
								logger,
							},
							sourceName,
						),
					);
				});
			});
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
					const { headers: newHeaders } = data || {};
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
				 * OnExecute lifecycle hooks
				 */
				try {
					await hookLifecycleRegistry.invokeHooks({
						event: EnvelopLifecycleEvent.ON_EXECUTE,
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
						errors: [Hook.getGenericError()],
					});
				}

				return {
					onExecuteDone: async ({
						result,
					}: {
						result: { data?: GraphQLData; errors?: GraphQLError[] };
					}) => {
						/**
						 * OnExecuteDone lifecycle hooks
						 */
						try {
							await hookLifecycleRegistry.invokeHooks({
								event: EnvelopLifecycleEvent.ON_EXECUTE_DONE,
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
									result,
								},
								setResultAndStopExecution,
							});
						} catch (err: unknown) {
							logger.error('Error while invoking hook %o', err);
							setResultAndStopExecution({
								data: null,
								errors: [Hook.getGenericError()],
							});
						}
					},
				};
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
					beforeSourceHooks.map(beforeSource => {
						new BeforeSourceHook(
							{
								config: beforeSource,
								baseDir,
								logger,
							},
							sourceName,
						);
					});

					/**
					 * OnFetch lifecycle hooks
					 */
					try {
						await hookLifecycleRegistry.invokeHooks({
							event: EnvelopLifecycleEvent.ON_FETCH,
							payload: {
								context: {
									request: context.request,
									params: context.params,
									secrets: secrets!,
									state: state!,
									logger,
								},
								document: context.document,
								request: options,
							},
							sourceName,
						});
					} catch (err: unknown) {
						logger.error('Error while invoking hook %o', err);
						// Individual hooks should throw specific errors if they fail
						throw err;
					}
				}

				/**
				 * Execute After Source Hooks
				 */
				return async ({
					response,
					setResponse,
				}: {
					response: Response;
					setResponse: SetResponseFn;
				}) => {
					try {
						await hookLifecycleRegistry.invokeHooks({
							event: EnvelopLifecycleEvent.ON_FETCH_DONE,
							payload: {
								context: {
									request: context.request,
									params: context.params,
									secrets: secrets!,
									state: state!,
									logger,
								},
								document: context.document,
								response,
							},
							sourceName,
							setResponse,
						});
					} catch (err: unknown) {
						logger.error('Error while invoking hook %o', err);
						// Individual hooks should throw specific errors if they fail
						throw err;
					}
				};
			},
		};
	} catch (err: unknown) {
		console.error('Error while initializing "hooks" plugin', err);
		return { onExecute: async () => ({}) };
	}
}
