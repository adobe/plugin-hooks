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

import getBeforeSourceHookHandler, {
	BeforeSourceHookBuildConfig,
} from '../handleBeforeSourceHooks';
import { HookResponse, HookStatus } from '../types';
import { mockLogger } from '../__mocks__/yogaLogger';
import { describe, expect, test, vi } from 'vitest';
import { OperationDefinitionNode } from 'graphql';

describe('getBeforeSourceHookHandler', () => {
	test('should return beforeSourceHook function', async () => {
		const mockConfig: BeforeSourceHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			beforeSource: [],
		};
		expect(getBeforeSourceHookHandler(mockConfig)).toBeTypeOf('function');
	});

	describe('should call hook without error', () => {
		test('when blocking and success', async () => {
			const mockResponse: HookResponse = {
				status: HookStatus.SUCCESS,
				message: 'ok',
			};
			const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
			const mockModule = { mockHook };
			const mockConfig: BeforeSourceHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				beforeSource: [
					{
						blocking: true,
						module: mockModule,
						fn: 'mockHook',
					},
				],
			};
			const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
			expect(mockHook).toHaveBeenCalledTimes(0);
			await beforeSourceHookHandler({
				payload: {
					sourceName: 'testSource',
					request: { method: 'GET' },
					operation: {} as OperationDefinitionNode,
				},
				hookType: 'beforeSource',
			});
			expect(mockHook).toHaveBeenCalledOnce();
		});

		test('when non-blocking and success', async () => {
			const mockResponse: HookResponse = {
				status: HookStatus.SUCCESS,
				message: 'ok',
			};
			const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
			const mockModule = { mockHook };
			const mockConfig: BeforeSourceHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				beforeSource: [
					{
						blocking: false,
						module: mockModule,
						fn: 'mockHook',
					},
				],
			};
			const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
			expect(mockHook).toHaveBeenCalledTimes(0);
			await beforeSourceHookHandler({
				payload: {
					sourceName: 'testSource',
					request: { method: 'GET' },
					operation: {} as OperationDefinitionNode,
				},
				hookType: 'beforeSource',
			});
			expect(mockHook).toHaveBeenCalledOnce();
		});

		test('when non-blocking and error', async () => {
			const mockResponse: HookResponse = {
				status: HookStatus.ERROR,
				message: 'mock error message',
			};
			const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
			const mockModule = { mockHook };
			const mockConfig: BeforeSourceHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				beforeSource: [
					{
						blocking: false,
						module: mockModule,
						fn: 'mockHook',
					},
				],
			};
			const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
			expect(mockHook).toHaveBeenCalledTimes(0);
			await beforeSourceHookHandler({
				payload: {
					sourceName: 'testSource',
					request: { method: 'GET' },
					operation: {} as OperationDefinitionNode,
				},
				hookType: 'beforeSource',
			});
			expect(mockHook).toHaveBeenCalledOnce();
		});

		test('with multiple hooks', async () => {
			const mockResponse1: HookResponse = {
				status: HookStatus.SUCCESS,
				message: 'ok1',
			};
			const mockResponse2: HookResponse = {
				status: HookStatus.SUCCESS,
				message: 'ok2',
			};
			const mockHook1 = vi.fn().mockReturnValue(Promise.resolve(mockResponse1));
			const mockHook2 = vi.fn().mockReturnValue(Promise.resolve(mockResponse2));
			const mockModule1 = { mockHook1 };
			const mockModule2 = { mockHook2 };
			const mockConfig: BeforeSourceHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				beforeSource: [
					{
						blocking: false,
						module: mockModule1,
						fn: 'mockHook1',
					},
					{
						blocking: false,
						module: mockModule2,
						fn: 'mockHook2',
					},
				],
			};
			const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
			expect(mockHook1).toHaveBeenCalledTimes(0);
			expect(mockHook2).toHaveBeenCalledTimes(0);
			await beforeSourceHookHandler({
				payload: {
					sourceName: 'testSource',
					request: { method: 'GET' },
					operation: {} as OperationDefinitionNode,
				},
				hookType: 'beforeSource',
			});
			expect(mockHook1).toHaveBeenCalledOnce();
			expect(mockHook2).toHaveBeenCalledOnce();
		});

		test('with empty beforeSource array', async () => {
			const mockConfig: BeforeSourceHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				beforeSource: [],
			};
			const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
			await expect(
				beforeSourceHookHandler({
					payload: {
						sourceName: 'testSource',
						request: { method: 'GET' },
						operation: {} as OperationDefinitionNode,
					},
					hookType: 'beforeSource',
				}),
			).resolves.not.toThrow();
		});

		test('with undefined beforeSource', async () => {
			const mockConfig: BeforeSourceHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				beforeSource: undefined,
			};
			const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
			await expect(
				beforeSourceHookHandler({
					payload: {
						sourceName: 'testSource',
						request: { method: 'GET' },
						operation: {} as OperationDefinitionNode,
					},
					hookType: 'beforeSource',
				}),
			).resolves.not.toThrow();
		});
	});

	test('should throw when blocking and error', async () => {
		const mockResponse: HookResponse = {
			status: HookStatus.ERROR,
			message: 'mock error message',
		};
		const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
		const mockModule = { mockHook };
		const mockConfig: BeforeSourceHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			beforeSource: [
				{
					blocking: true,
					module: mockModule,
					fn: 'mockHook',
				},
			],
		};
		const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
		await expect(
			beforeSourceHookHandler({
				payload: {
					sourceName: 'testSource',
					request: { method: 'GET' },
					operation: {} as OperationDefinitionNode,
				},
				hookType: 'beforeSource',
			}),
		).rejects.toThrowError(mockResponse.message);
	});

	test('should return memoized function when previously invoked', async () => {
		const mockResponse: HookResponse = {
			status: HookStatus.SUCCESS,
			message: 'ok',
		};
		const mockMemoizedHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
		const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
		const mockModule = { mockHook };
		const mockConfig: BeforeSourceHookBuildConfig = {
			memoizedFns: {
				beforeSource: [mockMemoizedHook],
			},
			baseDir: '',
			logger: mockLogger,
			beforeSource: [
				{
					blocking: true,
					module: mockModule,
					fn: 'mockHook',
				},
			],
		};
		const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
		expect(mockHook).toHaveBeenCalledTimes(0);
		expect(mockMemoizedHook).toHaveBeenCalledTimes(0);
		await beforeSourceHookHandler({
			payload: {
				sourceName: 'testSource',
				request: { method: 'GET' },
				operation: {} as OperationDefinitionNode,
			},
			hookType: 'beforeSource',
		});
		expect(mockHook).toHaveBeenCalledTimes(0);
		expect(mockMemoizedHook).toHaveBeenCalledOnce();
	});

	test('should handle hook function throwing error', async () => {
		const mockHook = vi.fn().mockRejectedValue(new Error('Hook execution failed'));
		const mockConfig: BeforeSourceHookBuildConfig = {
			memoizedFns: {
				beforeSource: [mockHook],
			},
			baseDir: '',
			logger: mockLogger,
			beforeSource: [
				{
					blocking: false,
					module: {},
					fn: 'mockHook',
				},
			],
		};
		const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
		await expect(
			beforeSourceHookHandler({
				payload: {
					sourceName: 'testSource',
					request: { method: 'GET' },
					operation: {} as OperationDefinitionNode,
				},
				hookType: 'beforeSource',
			}),
		).rejects.toThrowError('Hook execution failed');
	});

	test('should handle hook function throwing non-Error object', async () => {
		const mockHook = vi.fn().mockRejectedValue({ message: 'Custom error object' });
		const mockConfig: BeforeSourceHookBuildConfig = {
			memoizedFns: {
				beforeSource: [mockHook],
			},
			baseDir: '',
			logger: mockLogger,
			beforeSource: [
				{
					blocking: false,
					module: {},
					fn: 'mockHook',
				},
			],
		};
		const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
		await expect(
			beforeSourceHookHandler({
				payload: {
					sourceName: 'testSource',
					request: { method: 'GET' },
					operation: {} as OperationDefinitionNode,
				},
				hookType: 'beforeSource',
			}),
		).rejects.toThrowError('Custom error object');
	});

	test('should handle hook function throwing object without message', async () => {
		const mockHook = vi.fn().mockRejectedValue({ someOtherProperty: 'value' });
		const mockConfig: BeforeSourceHookBuildConfig = {
			memoizedFns: {
				beforeSource: [mockHook],
			},
			baseDir: '',
			logger: mockLogger,
			beforeSource: [
				{
					blocking: false,
					module: {},
					fn: 'mockHook',
				},
			],
		};
		const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
		await expect(
			beforeSourceHookHandler({
				payload: {
					sourceName: 'testSource',
					request: { method: 'GET' },
					operation: {} as OperationDefinitionNode,
				},
				hookType: 'beforeSource',
			}),
		).rejects.toThrowError('Error while invoking beforeSource hook');
	});

	test('should handle hook function throwing primitive value', async () => {
		const mockHook = vi.fn().mockRejectedValue('String error');
		const mockConfig: BeforeSourceHookBuildConfig = {
			memoizedFns: {
				beforeSource: [mockHook],
			},
			baseDir: '',
			logger: mockLogger,
			beforeSource: [
				{
					blocking: false,
					module: {},
					fn: 'mockHook',
				},
			],
		};
		const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
		await expect(
			beforeSourceHookHandler({
				payload: {
					sourceName: 'testSource',
					request: { method: 'GET' },
					operation: {} as OperationDefinitionNode,
				},
				hookType: 'beforeSource',
			}),
		).rejects.toThrowError('Error while invoking beforeSource hook');
	});

	test('should pass correct payload to hook function', async () => {
		const mockResponse: HookResponse = {
			status: HookStatus.SUCCESS,
			message: 'ok',
		};
		const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
		const mockModule = { mockHook };
		const mockConfig: BeforeSourceHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			beforeSource: [
				{
					blocking: false,
					module: mockModule,
					fn: 'mockHook',
				},
			],
		};
		const beforeSourceHookHandler = getBeforeSourceHookHandler(mockConfig);
		const payload = {
			sourceName: 'testSource',
			request: { method: 'POST', body: 'test body' },
			operation: { kind: 'OperationDefinition' } as OperationDefinitionNode,
		};
		await beforeSourceHookHandler({ payload, hookType: 'beforeSource' });
		expect(mockHook).toHaveBeenCalledWith(payload);
	});
});
