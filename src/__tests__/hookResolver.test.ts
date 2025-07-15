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

import { resolveHookFunction, HookResolverConfig } from '../utils/hookResolver';
import { HookFunction, MemoizedFns } from '../types';
import { mockLogger } from '../__mocks__/yogaLogger';
import { describe, expect, test, vi, beforeEach } from 'vitest';

// Mock the utility functions
vi.mock('../utils', async () => {
	const actual = await vi.importActual('../utils');
	return {
		...actual,
		getWrappedLocalHookFunction: vi.fn(),
		getWrappedLocalModuleHookFunction: vi.fn(),
		getWrappedRemoteHookFunction: vi.fn(),
		isRemoteFn: vi.fn(),
		isModuleFn: vi.fn(),
	};
});

describe('hookResolver', () => {
	let utils: typeof import('../utils');
	let baseConfig: HookResolverConfig;
	let mockHookFunction: HookFunction;
	let memoizedFns: MemoizedFns;

	beforeEach(async () => {
		vi.clearAllMocks();
		utils = await import('../utils');

		// Reset all mocked functions
		vi.mocked(utils.isModuleFn).mockReset();
		vi.mocked(utils.isRemoteFn).mockReset();
		vi.mocked(utils.getWrappedLocalHookFunction).mockReset();
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockReset();
		vi.mocked(utils.getWrappedRemoteHookFunction).mockReset();

		// Create mock hook function
		mockHookFunction = vi.fn().mockResolvedValue({
			status: 'SUCCESS',
			message: 'ok',
		});

		// Create fresh memoized functions object
		memoizedFns = {};

		// Base configuration
		baseConfig = {
			hookConfig: {
				blocking: true,
				composer: 'test-composer',
			},
			hookType: 'beforeAll',
			baseDir: '/test/base',
			logger: mockLogger,
			memoizedFns,
		};
	});

	describe('memoization', () => {
		test('should return memoized function if already cached', async () => {
			// Pre-populate memoized functions
			memoizedFns.beforeAll = mockHookFunction;

			const result = await resolveHookFunction(baseConfig);

			expect(result).toBe(mockHookFunction);
			// Should not call any resolution functions
			expect(utils.isRemoteFn).not.toHaveBeenCalled();
			expect(utils.isModuleFn).not.toHaveBeenCalled();
			expect(utils.getWrappedLocalHookFunction).not.toHaveBeenCalled();
		});

		test('should memoize resolved function for beforeAll', async () => {
			vi.mocked(utils.isModuleFn).mockReturnValue(true);
			vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHookFunction);

			const config = {
				...baseConfig,
				hookType: 'beforeAll' as const,
				hookConfig: {
					blocking: true,
					module: { testFn: mockHookFunction },
					fn: 'testFn',
				},
			};

			const result = await resolveHookFunction(config);

			expect(result).toBe(mockHookFunction);
			expect(memoizedFns.beforeAll).toBe(mockHookFunction);
		});

		test('should memoize resolved function for afterAll', async () => {
			vi.mocked(utils.isModuleFn).mockReturnValue(true);
			vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHookFunction);

			const config = {
				...baseConfig,
				hookType: 'afterAll' as const,
				hookConfig: {
					blocking: true,
					module: { testFn: mockHookFunction },
					fn: 'testFn',
				},
			};

			const result = await resolveHookFunction(config);

			expect(result).toBe(mockHookFunction);
			expect(memoizedFns.afterAll).toBe(mockHookFunction);
		});
	});

	describe('remote function resolution', () => {
		test('should resolve remote function', async () => {
			vi.mocked(utils.isRemoteFn).mockReturnValue(true);
			vi.mocked(utils.getWrappedRemoteHookFunction).mockResolvedValue(mockHookFunction);

			const config = {
				...baseConfig,
				hookConfig: {
					blocking: true,
					composer: 'https://remote.example.com/hook',
				},
			};

			const result = await resolveHookFunction(config);

			expect(result).toBe(mockHookFunction);
			expect(utils.getWrappedRemoteHookFunction).toHaveBeenCalledWith(
				'https://remote.example.com/hook',
				{
					baseDir: '/test/base',
					importFn: expect.any(Function),
					logger: mockLogger,
					blocking: true,
				},
			);
		});

		test('should log remote function invocation', async () => {
			vi.mocked(utils.isRemoteFn).mockReturnValue(true);
			vi.mocked(utils.getWrappedRemoteHookFunction).mockResolvedValue(mockHookFunction);

			const config = {
				...baseConfig,
				hookConfig: {
					blocking: true,
					composer: 'https://remote.example.com/hook',
				},
			};

			await resolveHookFunction(config);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Invoking remote function %s',
				'https://remote.example.com/hook',
			);
		});
	});

	describe('module function resolution', () => {
		test('should resolve module function', async () => {
			vi.mocked(utils.isRemoteFn).mockReturnValue(false);
			vi.mocked(utils.isModuleFn).mockReturnValue(true);
			vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHookFunction);

			const mockModule = { testFn: mockHookFunction };
			const config = {
				...baseConfig,
				hookConfig: {
					blocking: true,
					module: mockModule,
					fn: 'testFn',
				},
			};

			const result = await resolveHookFunction(config);

			expect(result).toBe(mockHookFunction);
			expect(utils.getWrappedLocalModuleHookFunction).toHaveBeenCalledWith(mockModule, 'testFn', {
				baseDir: '/test/base',
				importFn: expect.any(Function),
				logger: mockLogger,
				blocking: true,
			});
		});

		test('should log module function invocation', async () => {
			vi.mocked(utils.isRemoteFn).mockReturnValue(false);
			vi.mocked(utils.isModuleFn).mockReturnValue(true);
			vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHookFunction);

			const mockModule = { testFn: mockHookFunction };
			const config = {
				...baseConfig,
				hookConfig: {
					blocking: true,
					module: mockModule,
					fn: 'testFn',
				},
			};

			await resolveHookFunction(config);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Invoking local module function %s %s',
				mockModule,
				'testFn',
			);
		});
	});

	describe('local function resolution', () => {
		test('should resolve local function', async () => {
			vi.mocked(utils.isRemoteFn).mockReturnValue(false);
			vi.mocked(utils.isModuleFn).mockReturnValue(false);
			vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHookFunction);

			const config = {
				...baseConfig,
				hookConfig: {
					blocking: true,
					composer: './local-hook.js#testFn',
				},
			};

			const result = await resolveHookFunction(config);

			expect(result).toBe(mockHookFunction);
			expect(utils.getWrappedLocalHookFunction).toHaveBeenCalledWith('./local-hook.js#testFn', {
				baseDir: '/test/base',
				importFn: expect.any(Function),
				logger: mockLogger,
				blocking: true,
			});
		});

		test('should log local function invocation', async () => {
			vi.mocked(utils.isRemoteFn).mockReturnValue(false);
			vi.mocked(utils.isModuleFn).mockReturnValue(false);
			vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHookFunction);

			const config = {
				...baseConfig,
				hookConfig: {
					blocking: true,
					composer: './local-hook.js#testFn',
				},
			};

			await resolveHookFunction(config);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Invoking local function %s',
				'./local-hook.js#testFn',
			);
		});
	});

	describe('edge cases', () => {
		test('should handle hook function resolution failure', async () => {
			vi.mocked(utils.isRemoteFn).mockReturnValue(false);
			vi.mocked(utils.isModuleFn).mockReturnValue(false);
			vi.mocked(utils.getWrappedLocalHookFunction).mockRejectedValue(
				new Error('Hook resolution failed'),
			);

			await expect(resolveHookFunction(baseConfig)).rejects.toThrow('Hook resolution failed');
			// Should not memoize failed functions
			expect('beforeAll' in memoizedFns).toBe(false);
		});

		test('should handle empty composer', async () => {
			vi.mocked(utils.isRemoteFn).mockReturnValue(false);
			vi.mocked(utils.isModuleFn).mockReturnValue(false);
			vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHookFunction);

			const config = {
				...baseConfig,
				hookConfig: {
					blocking: true,
					composer: '',
				},
			};

			await resolveHookFunction(config);

			expect(utils.isRemoteFn).toHaveBeenCalledWith('');
			expect(utils.getWrappedLocalHookFunction).toHaveBeenCalledWith('', expect.any(Object));
		});

		test('should handle missing composer', async () => {
			vi.mocked(utils.isRemoteFn).mockReturnValue(false);
			vi.mocked(utils.isModuleFn).mockReturnValue(false);
			vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHookFunction);

			const config = {
				...baseConfig,
				hookConfig: {
					blocking: true,
					// No composer property
				},
			};

			await resolveHookFunction(config);

			expect(utils.isRemoteFn).toHaveBeenCalledWith('');
		});
	});
});
