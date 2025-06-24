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

import getBeforeAllHookHandler, { BeforeAllHookBuildConfig } from '../handleBeforeAllHooks';
import { PayloadContext, HookResponse, HookStatus } from '../types';
import { mockLogger } from '../__mocks__/yogaLogger';
import { describe, expect, test, vi } from 'vitest';

describe('getBeforeAllHookHandler', () => {
	test('should return beforeAllHook function', async () => {
		const mockConfig: BeforeAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			beforeAll: {
				blocking: true,
			},
		};
		expect(getBeforeAllHookHandler(mockConfig)).toBeTypeOf('function');
	});
	describe('should call hook without error', () => {
		test('when blocking and success', async () => {
			const mockResponse: HookResponse = {
				status: HookStatus.SUCCESS,
				message: 'ok',
			};
			const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
			const mockModule = { mockHook };
			const mockConfig: BeforeAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				beforeAll: {
					blocking: true,
					module: mockModule,
					fn: 'mockHook',
				},
			};
			const beforeAllHookHandler = getBeforeAllHookHandler(mockConfig);
			expect(mockHook).toHaveBeenCalledTimes(0);
			await beforeAllHookHandler({
				payload: { context: {} as unknown as PayloadContext, document: {} },
				updateContext: () => {},
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
			const mockConfig: BeforeAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				beforeAll: {
					blocking: false,
					module: mockModule,
					fn: 'mockHook',
				},
			};
			const beforeAllHookHandler = getBeforeAllHookHandler(mockConfig);
			expect(mockHook).toHaveBeenCalledTimes(0);
			await beforeAllHookHandler({
				payload: { context: {} as unknown as PayloadContext, document: {} },
				updateContext: () => {},
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
			const mockConfig: BeforeAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				beforeAll: {
					blocking: false,
					module: mockModule,
					fn: 'mockHook',
				},
			};
			const beforeAllHookHandler = getBeforeAllHookHandler(mockConfig);
			expect(mockHook).toHaveBeenCalledTimes(0);
			await beforeAllHookHandler({
				payload: { context: {} as unknown as PayloadContext, document: {} },
				updateContext: () => {},
			});
			expect(mockHook).toHaveBeenCalledOnce();
		});
	});

	test('should throw when blocking and error', async () => {
		const mockResponse: HookResponse = {
			status: HookStatus.ERROR,
			message: 'mock error message',
		};
		const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
		const mockModule = { mockHook };
		const mockConfig: BeforeAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			beforeAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const beforeAllHookHandler = getBeforeAllHookHandler(mockConfig);
		await expect(
			beforeAllHookHandler({
				payload: { context: {} as unknown as PayloadContext, document: {} },
				updateContext: () => {},
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
		const mockConfig: BeforeAllHookBuildConfig = {
			memoizedFns: {
				beforeAll: mockMemoizedHook,
			},
			baseDir: '',
			logger: mockLogger,
			beforeAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const beforeAllHookHandler = getBeforeAllHookHandler(mockConfig);
		expect(mockHook).toHaveBeenCalledTimes(0);
		expect(mockMemoizedHook).toHaveBeenCalledTimes(0);
		await beforeAllHookHandler({
			payload: { context: {} as unknown as PayloadContext, document: {} },
			updateContext: () => {},
		});
		expect(mockHook).toHaveBeenCalledTimes(0);
		expect(mockMemoizedHook).toHaveBeenCalledOnce();
	});
});
