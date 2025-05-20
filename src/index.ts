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
import type { HookConfig, MemoizedFns, UserContext } from './types';
import type { YogaLogger, Plugin, YogaInitialContext } from 'graphql-yoga';

export interface PluginConfig {
	baseDir: string;
	logger: YogaLogger;
	beforeAll?: HookConfig;
}

type HooksPlugin = Plugin<YogaInitialContext, Record<string, unknown>, UserContext>;

export default async function hooksPlugin(config: PluginConfig): Promise<HooksPlugin> {
	try {
		const { beforeAll, baseDir, logger } = config;
		if (!beforeAll) {
			return { onExecute: async () => ({}) };
		}
		const memoizedFns: MemoizedFns = {};
		const beforeAllHookHandler = getBeforeAllHookHandler({
			baseDir,
			beforeAll,
			logger,
			memoizedFns,
		});
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
