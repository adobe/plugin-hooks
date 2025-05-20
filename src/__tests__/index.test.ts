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

import { createYoga, YogaServer, YogaInitialContext } from 'graphql-yoga';
import { beforeEach } from 'vitest';
import {
	mockQuery,
	mockSchema,
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
			],
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
		await testFetch(yogaServer, 'query IntrospectionQuery { __schema { types { name } } }');
		expect(mockHook).toHaveBeenCalledTimes(0);
	});
	test('should update headers in context', async () => {
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
	});
	test('should invoke beforeAll hook', async () => {
		expect(mockHook).toHaveBeenCalledTimes(0);
		await testFetch(yogaServer, mockQuery);
		expect(mockHook).toHaveBeenCalledTimes(1);
	});
	// test('should return GraphQL error when error', async () => {
	// 	mockHook.mockImplementationOnce(() => mockErrorResponse);
	// 	expect(mockHook).toHaveBeenCalledTimes(0);
	// 	const response = await testFetch(yogaServer, mockQuery);
	// 	const data = await response.json();
	// 	expect(mockHook).toHaveBeenCalledTimes(1);
	// 	expect(data.errors.length).toBe(1);
	// 	expect(data.errors[0].message).toEqual(mockErrorResponse.message);
	// });
});
