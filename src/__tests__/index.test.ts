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

import { TypedExecutionArgs } from '@envelop/core';
import { createYoga, YogaServer, YogaInitialContext } from 'graphql-yoga';
import { Readable } from 'node:stream';
import { beforeEach } from 'vitest';
import {
	extractArgsPlugin,
	mockErrorResponse,
	mockQuery,
	mockSchema,
	mockSecrets,
	mockSuccessResponse,
	testFetch,
} from '../__fixtures__/hooksTestHelper';
import { mockLogger } from '../__mocks__/yogaLogger';
import hooksPlugin from '../index';
import { HookFunction, Module, UserContext } from '../types';

let mockHook: ReturnType<typeof vi.fn>;
let mockModule: Module;

describe('hooksPlugin', () => {
	let yogaServer: YogaServer<YogaInitialContext, UserContext>;
	const argsReference = {} as
		| TypedExecutionArgs<YogaInitialContext & UserContext>
		| TypedExecutionArgs<YogaInitialContext>;
	beforeEach(async () => {
		mockHook = vi.fn<HookFunction>();
		mockModule = { mockHook };
		yogaServer = createYoga<YogaInitialContext, UserContext>({
			plugins: [
				await hooksPlugin({
					baseDir: '',
					logger: mockLogger,
					beforeAll: {
						blocking: true,
						module: mockModule,
						fn: 'mockHook',
					},
				}),
				await extractArgsPlugin(argsReference),
			],
			context: initialContext => {
				return {
					...initialContext,
					secrets: mockSecrets,
				};
			},
			schema: mockSchema,
		});
		vi.resetAllMocks();
	});
	test('should run with no hooks', async () => {
		yogaServer = createYoga<YogaInitialContext, UserContext>({
			plugins: [
				await hooksPlugin({
					baseDir: '',
					logger: mockLogger,
				}),
			],
			schema: mockSchema,
		});
		expect(mockHook).toHaveBeenCalledTimes(0);
		await testFetch(yogaServer, mockQuery);
		expect(mockHook).toHaveBeenCalledTimes(0);
	});
	test('should skip introspection queries', async () => {
		expect(mockHook).toHaveBeenCalledTimes(0);
		await testFetch(
			yogaServer,
			'query IntrospectionQuery { __schema { types { name } } }',
			'IntrospectionQuery',
		);
		expect(mockHook).toHaveBeenCalledTimes(0);
	});
	test('should have access to expected context/payload', async () => {
		mockHook.mockImplementationOnce(() => mockSuccessResponse);
		expect(mockHook).toHaveBeenCalledTimes(0);
		await testFetch(yogaServer, mockQuery);
		expect(mockHook).toHaveBeenCalledTimes(1);
		expect(argsReference.contextValue.params).toBeDefined();
		expect(argsReference.contextValue.request).toBeDefined();
		expect(argsReference.contextValue.request.body).toBeInstanceOf(Readable);
		const headers =
			'headers' in argsReference.contextValue ? argsReference.contextValue.headers : undefined;
		expect(headers).toEqual(undefined);
		const secrets =
			'secrets' in argsReference.contextValue ? argsReference.contextValue.secrets : undefined;
		expect(secrets).toEqual(mockSecrets);
	});
	test('should be able to update headers in context', async () => {
		mockHook.mockImplementation(() => {
			return {
				...mockSuccessResponse,
				data: {
					headers: {
						'x-mock-header': 'mock-value',
					},
				},
			};
		});
		expect(mockHook).toHaveBeenCalledTimes(0);
		await testFetch(yogaServer, mockQuery);
		expect(mockHook).toHaveBeenCalledTimes(1);
		expect(argsReference.contextValue.params.query).toEqual(`query TestQuery{hello}`);
		expect(argsReference.operationName).toEqual('TestQuery');
		const headers =
			'headers' in argsReference.contextValue ? argsReference.contextValue.headers : {};
		expect(headers).toEqual(
			expect.objectContaining({
				'x-mock-header': 'mock-value',
			}),
		);
	});
	test('should invoke beforeAll hook', async () => {
		expect(mockHook).toHaveBeenCalledTimes(0);
		await testFetch(yogaServer, mockQuery);
		expect(mockHook).toHaveBeenCalledTimes(1);
	});
	test('should return GraphQL error when error', async () => {
		mockHook.mockImplementationOnce(() => mockErrorResponse);
		expect(mockHook).toHaveBeenCalledTimes(0);
		const response = await testFetch(yogaServer, mockQuery);
		expect(mockHook).toHaveBeenCalledTimes(1);
		expect(response.data).toBeNull();
		expect(response.errors).not.toBeUndefined();
		const errors = response.errors!;
		expect(errors.length).toBe(1);
		expect(errors[0].message).toEqual(mockErrorResponse.message);
	});
});
