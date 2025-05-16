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
import handleBeforeAllHooks, { UpdateContext } from './handleBeforeAllHooks';
import { MeshPlugin } from '@graphql-mesh/types';
import type { HookConfig, MemoizedFns } from './types';
import type { YogaLogger } from 'graphql-yoga';

export interface Context {
	headers: Record<string, string>;
	params: Record<string, unknown>;
	request: Request;
	req: Request;
	body: Record<string, unknown>;
	secrets: Record<string, unknown>;
}

export interface PluginConfig {
	baseDir: string;
	beforeAll?: HookConfig;
	logger: YogaLogger;
}

export default async function hooksPlugin(config: PluginConfig): Promise<MeshPlugin<Context>> {
	try {
		const { beforeAll, baseDir, logger } = config;
		if (!beforeAll) {
			return { onExecute: async () => ({}) };
		}
		const memoizedFns: MemoizedFns = {};
		const handleBeforeAllHookFn = handleBeforeAllHooks({
			baseDir,
			beforeAll,
			logger,
			memoizedFns,
		});
		return {
			async onExecute({ args, setResultAndStopExecution, extendContext }) {
				const query = args.contextValue?.params?.query;
				const operationName = args.operationName;
				const { document, contextValue: context } = args;
				const { headers, params, request, req, secrets } = context || {};
				let body = {};
				if (req && req.body) {
					body = req.body;
				}
				const payload = {
					context: { headers, params, request, body, secrets },
					document,
				};
				const updateContext: UpdateContext = data => {
					const { headers: newHeaders } = data;
					if (newHeaders) {
						const updatedHeaders = {
							...args.contextValue.headers,
							...newHeaders,
						};
						extendContext({
							headers: updatedHeaders,
						});
					}
				};

				// Ignore introspection queries
				const isIntrospectionQuery =
					operationName === 'IntrospectionQuery' ||
					(query && query instanceof String && query.includes('query IntrospectionQuery'));
				if (isIntrospectionQuery) {
					return {};
				}

				/**
				 * Start Before All Hook
				 */
				try {
					await handleBeforeAllHookFn({ payload, updateContext });
				} catch (err: unknown) {
					setResultAndStopExecution({
						data: null,
						errors: [
							new GraphQLError(
								(err instanceof Error && err.message) || 'Error while executing hooks',
								{
									extensions: {
										code: 'HOOKS_ERROR',
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
