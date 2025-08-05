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

import { mockSetResultAndStopExecution } from '../__mocks__/setResultAndStopExecution';
import getAfterAllHookHandler, { AfterAllHookBuildConfig } from '../handleAfterAllHooks';
import {
	HookResponse,
	HookStatus,
	GraphQLResult,
	HookFunctionPayloadContext,
	AfterAllHookResponse,
} from '../types';
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

describe('getAfterAllHookHandler (afterAll)', () => {
	const basePayload = {
		context: {} as unknown as HookFunctionPayloadContext,
		document: {},
		result: { data: { test: 'value' } },
	};

	let utils: typeof import('../utils');
	beforeEach(async () => {
		vi.clearAllMocks();
		utils = await import('../utils');
		// Reset all mocked functions
		vi.mocked(utils.isModuleFn).mockReset();
		vi.mocked(utils.isRemoteFn).mockReset();
		vi.mocked(utils.getWrappedLocalHookFunction).mockReset();
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockReset();
		vi.mocked(utils.getWrappedRemoteHookFunction).mockReset();
	});

	test('calls hook and returns response (blocking, success)', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const mockResponse: HookResponse = { status: HookStatus.SUCCESS, message: 'ok' };
		const mockHook = vi.fn().mockResolvedValue(mockResponse);
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await handler({
			payload: basePayload,
			setResultAndStopExecution: mockSetResultAndStopExecution,
		});
		expect(mockHook).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledWith(basePayload.result);
	});

	test('throws if blocking and status is ERROR', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const mockResponse: HookResponse = { status: HookStatus.ERROR, message: 'fail' };
		const mockHook = vi.fn().mockResolvedValue(mockResponse);
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await expect(
			handler({ payload: basePayload, setResultAndStopExecution: mockSetResultAndStopExecution }),
		).rejects.toThrow('fail');
	});

	test('does not throw if non-blocking and status is ERROR', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const mockResponse: HookResponse = { status: HookStatus.ERROR, message: 'fail' };
		const mockHook = vi.fn().mockResolvedValue(mockResponse);
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: false, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await handler({
			payload: basePayload,
			setResultAndStopExecution: mockSetResultAndStopExecution,
		});
		expect(mockHook).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledWith(basePayload.result);
	});

	test('returns modified result if present in response', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const modifiedResult = { data: { foo: 'bar' }, errors: [], extensions: {} };
		const mockResponse: AfterAllHookResponse = {
			status: HookStatus.SUCCESS,
			message: 'modified',
			data: { result: modifiedResult },
		};
		const mockHook = vi.fn().mockResolvedValue(mockResponse);
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await handler({
			payload: basePayload,
			setResultAndStopExecution: mockSetResultAndStopExecution,
		});
		expect(mockHook).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledWith(modifiedResult);
	});

	test('throws if hook throws (blocking)', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const mockHook = vi.fn().mockImplementation(() => {
			throw new Error('fail!');
		});
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await expect(
			handler({ payload: basePayload, setResultAndStopExecution: mockSetResultAndStopExecution }),
		).rejects.toThrow('fail!');
	});

	test('throws error if no hook is defined', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(false);
		vi.mocked(utils.isRemoteFn).mockReturnValue(false);
		vi.mocked(utils.getWrappedLocalHookFunction).mockRejectedValue(
			new Error('Unable to invoke local function undefined'),
		);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await expect(
			handler({ payload: basePayload, setResultAndStopExecution: mockSetResultAndStopExecution }),
		).rejects.toThrow('Unable to invoke local function undefined');
	});

	test('uses memoized function if present', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(false);
		const mockResponse: HookResponse = { status: HookStatus.SUCCESS, message: 'ok' };
		const memoized = vi.fn().mockResolvedValue(mockResponse);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: { afterAll: memoized },
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await handler({
			payload: basePayload,
			setResultAndStopExecution: mockSetResultAndStopExecution,
		});
		expect(memoized).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledWith(basePayload.result);
	});

	test('handles invalid response (missing status) for blocking', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const mockHook = vi.fn().mockResolvedValue({ message: 'no status' });
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await expect(
			handler({ payload: basePayload, setResultAndStopExecution: mockSetResultAndStopExecution }),
		).rejects.toThrow();
	});

	test('handles remote hook (success)', async () => {
		vi.mocked(utils.isRemoteFn).mockReturnValue(true);
		const mockRemoteHook = vi
			.fn()
			.mockResolvedValue({ status: HookStatus.SUCCESS, message: 'remote ok' });
		vi.mocked(utils.getWrappedRemoteHookFunction).mockResolvedValue(mockRemoteHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, composer: 'https://remote' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await handler({
			payload: basePayload,
			setResultAndStopExecution: mockSetResultAndStopExecution,
		});
		expect(mockRemoteHook).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledWith(basePayload.result);
	});

	test('handles remote hook (error, blocking)', async () => {
		vi.mocked(utils.isRemoteFn).mockReturnValue(true);
		const mockRemoteHook = vi
			.fn()
			.mockResolvedValue({ status: HookStatus.ERROR, message: 'remote fail' });
		vi.mocked(utils.getWrappedRemoteHookFunction).mockResolvedValue(mockRemoteHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, composer: 'https://remote' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await expect(
			handler({
				payload: basePayload,
				setResultAndStopExecution: mockSetResultAndStopExecution,
			}),
		).rejects.toThrow('remote fail');
	});

	test('handles remote hook (error, non-blocking)', async () => {
		vi.mocked(utils.isRemoteFn).mockReturnValue(true);
		const mockRemoteHook = vi
			.fn()
			.mockResolvedValue({ status: HookStatus.ERROR, message: 'remote fail' });
		vi.mocked(utils.getWrappedRemoteHookFunction).mockResolvedValue(mockRemoteHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: false, composer: 'https://remote' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await handler({
			payload: basePayload,
			setResultAndStopExecution: mockSetResultAndStopExecution,
		});
		expect(mockRemoteHook).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledWith(basePayload.result);
	});

	test('handles case-insensitive status comparison', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const mockResponse: HookResponse = { status: 'success' as HookStatus, message: 'ok' };
		const mockHook = vi.fn().mockResolvedValue(mockResponse);
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await handler({
			payload: basePayload,
			setResultAndStopExecution: mockSetResultAndStopExecution,
		});
		expect(mockHook).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledWith(basePayload.result);
	});

	test('handles error with non-Error object', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const mockHook = vi.fn().mockImplementation(() => {
			throw { message: 'custom error object' };
		});
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await expect(
			handler({ payload: basePayload, setResultAndStopExecution: mockSetResultAndStopExecution }),
		).rejects.toThrow('custom error object');
	});

	test('handles error without message property', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const mockHook = vi.fn().mockImplementation(() => {
			throw 'string error';
		});
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await expect(
			handler({ payload: basePayload, setResultAndStopExecution: mockSetResultAndStopExecution }),
		).rejects.toThrow('Error while invoking afterAll hook');
	});

	test('handles local function with composer path', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(false);
		vi.mocked(utils.isRemoteFn).mockReturnValue(false);
		const mockResponse: HookResponse = { status: HookStatus.SUCCESS, message: 'local ok' };
		const mockHook = vi.fn().mockResolvedValue(mockResponse);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, composer: './local-hook.js' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		await handler({
			payload: basePayload,
			setResultAndStopExecution: mockSetResultAndStopExecution,
		});
		expect(mockHook).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledWith(basePayload.result);
	});

	test('handles payload with null result', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const mockResponse: HookResponse = { status: HookStatus.SUCCESS, message: 'ok' };
		const mockHook = vi.fn().mockResolvedValue(mockResponse);
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		const payloadWithNullResult = {
			context: {} as unknown as HookFunctionPayloadContext,
			document: {},
			result: null as unknown as GraphQLResult,
		};
		await handler({
			payload: payloadWithNullResult,
			setResultAndStopExecution: mockSetResultAndStopExecution,
		});
		expect(mockHook).toHaveBeenCalledWith(payloadWithNullResult);
		expect(mockSetResultAndStopExecution).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledWith({});
	});

	test('handles payload with undefined result', async () => {
		vi.mocked(utils.isModuleFn).mockReturnValue(true);
		const mockResponse: HookResponse = { status: HookStatus.SUCCESS, message: 'ok' };
		const mockHook = vi.fn().mockResolvedValue(mockResponse);
		vi.mocked(utils.getWrappedLocalModuleHookFunction).mockResolvedValue(mockHook);
		vi.mocked(utils.getWrappedLocalHookFunction).mockResolvedValue(mockHook);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: { blocking: true, module: { mockHook }, fn: 'mockHook' },
		};
		const handler = getAfterAllHookHandler(mockConfig);
		const payloadWithUndefinedResult = {
			context: {} as unknown as HookFunctionPayloadContext,
			document: {},
			result: undefined,
		};
		await handler({
			payload: payloadWithUndefinedResult,
			setResultAndStopExecution: mockSetResultAndStopExecution,
		});
		expect(mockHook).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledOnce();
		expect(mockSetResultAndStopExecution).toHaveBeenCalledWith({});
	});
});
