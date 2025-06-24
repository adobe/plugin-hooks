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

import { beforeEach, vi, describe, test, expect } from 'vitest';
import fetch from 'node-fetch';
import { HookStatus, Module } from '../types';
import {
	importFn,
	getWrappedLocalHookFunction,
	getWrappedLocalModuleHookFunction,
	getWrappedRemoteHookFunction,
	isModuleFn,
	isRemoteFn,
	parseResponseBody,
	timedPromise,
} from '../utils';
import { mockLogger } from '../__mocks__/yogaLogger';
import {
	mockSuccessResponse,
	mockErrorResponse,
	convertMockResponseToContext,
} from '../__fixtures__/hooksTestHelper';

vi.mock('node-fetch');
vi.mock('graphql-yoga');

const setFetchMockResponse = ({
	ok,
	status,
	body,
}: {
	ok?: boolean;
	status?: number;
	body?: unknown;
} = {}) => {
	vi.mocked(fetch).mockReturnValueOnce(
		Promise.resolve({
			ok: ok || true,
			status: status || 200,
			json: () => Promise.resolve(body || {}),
			text: () => Promise.resolve(body ? JSON.stringify(body) : ''),
		} as Partial<import('node-fetch').Response> as import('node-fetch').Response),
	);
};

describe('utils', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});
	describe('importFn', async () => {
		test('should import function', async () => {
			expect(await importFn('./__fixtures__/hookAsync.js')).toBeTypeOf('object');
		});
	});
	describe('timedPromise', async () => {
		test('should resolve promise', async () => {
			expect(await timedPromise(Promise.resolve('test'), 30000)).toBe('test');
		});
		test('should reject promise', async () => {
			await expect(timedPromise(Promise.reject(new Error('test')), 30000)).rejects.toThrow('test');
		});
		test('should timeout promise', async () => {
			await expect(timedPromise(new Promise(() => {}), 1)).rejects.toThrow('Timeout');
		});
	});
	describe('parseResponseBody', async () => {
		test('should return body when it contains status', () => {
			expect(parseResponseBody('{"status": "ok"}', true)).toEqual({ status: 'ok' });
		});
		test('should return success when body does not contain status and is ok', () => {
			expect(parseResponseBody(JSON.stringify(mockSuccessResponse), true)).toEqual({
				status: HookStatus.SUCCESS,
				message: mockSuccessResponse.message,
			});
		});
		test('should return error when body does not contain status and is not ok', () => {
			expect(parseResponseBody(JSON.stringify(mockErrorResponse), false)).toEqual({
				status: HookStatus.ERROR,
				message: mockErrorResponse.message,
			});
		});
		test('should return success when error and is ok', () => {
			const mockRawBody = '{';
			expect(parseResponseBody(mockRawBody, true)).toEqual({
				status: HookStatus.SUCCESS,
				message: mockRawBody,
			});
		});
		test('should return error when error and is not ok', () => {
			expect(parseResponseBody(undefined as unknown as string, false)).toEqual({
				status: HookStatus.ERROR,
				message: 'Unable to parse hook function response',
			});
		});
	});
	describe('getWrappedRemoteHookFunction', async () => {
		test('should wrap remote function call', async () => {
			setFetchMockResponse();
			const result = await getWrappedRemoteHookFunction('https://localhost:9999/mockRemoteHook', {
				baseDir: '',
				importFn: vi.fn(),
				logger: mockLogger,
				blocking: false,
			});
			expect(result).toBeTypeOf('function');
		});
		describe('wrapped hook function', () => {
			describe('with blocking set to true', () => {
				test('should return expected success object', async () => {
					setFetchMockResponse({ body: mockSuccessResponse });
					const hookFunction = await getWrappedRemoteHookFunction(
						'https://localhost:9999/mockRemoteHook',
						{
							baseDir: '',
							importFn: vi.fn(),
							logger: mockLogger,
							blocking: true,
						},
					);
					expect(await hookFunction(convertMockResponseToContext(mockSuccessResponse))).toEqual(
						mockSuccessResponse,
					);
				});
				test('should return expected error object with message', async () => {
					setFetchMockResponse({ body: mockErrorResponse });
					const hookFunction = await getWrappedRemoteHookFunction(
						'https://localhost:9999/mockRemoteHook',
						{
							baseDir: '',
							importFn: vi.fn(),
							logger: mockLogger,
							blocking: true,
						},
					);
					await expect(
						hookFunction(convertMockResponseToContext(mockErrorResponse)),
					).rejects.toEqual(mockErrorResponse);
				});
			});
			describe('with blocking set to false', async () => {
				test('should return generic success object', async () => {
					setFetchMockResponse({ body: mockSuccessResponse });
					const hookFunction = await getWrappedRemoteHookFunction(
						'https://localhost:9999/mockRemoteHook',
						{
							baseDir: '',
							importFn: vi.fn(),
							logger: mockLogger,
							blocking: false,
						},
					);
					expect(await hookFunction(convertMockResponseToContext(mockSuccessResponse))).toEqual({
						...mockSuccessResponse,
						message: 'Remote function invoked successfully',
					});
				});
			});
		});
	});
	describe('getWrappedLocalModuleFunction', async () => {
		test('should wrap named export', async () => {
			// @ts-expect-error mock hook function with no type declaration
			const mockModule = await import('../__fixtures__/hookAsync.js');
			const result = await getWrappedLocalModuleHookFunction(mockModule, 'mockHook', {
				baseDir: '',
				importFn: vi.fn(),
				logger: mockLogger,
				blocking: false,
			});
			expect(result).toBeTypeOf('function');
		});
		test('should wrap named default export', async () => {
			// @ts-expect-error mock hook function with no type declaration
			const mockModule = await import('../__fixtures__/hookNamedDefaultExportAsync.js');
			const result = await getWrappedLocalModuleHookFunction(mockModule, 'mockHook', {
				baseDir: '',
				importFn: vi.fn(),
				logger: mockLogger,
				blocking: false,
			});
			expect(result).toBeTypeOf('function');
		});
		test('should wrap default export', async () => {
			// @ts-expect-error mock hook function with no type declaration
			const mockModule = await import('../__fixtures__/hookDefaultExportAsync.js');
			const result = await getWrappedLocalModuleHookFunction(mockModule, 'mockHook', {
				baseDir: '',
				importFn: vi.fn(),
				logger: mockLogger,
				blocking: false,
			});
			expect(result).toBeTypeOf('function');
		});
		test('should reject with error when function not found', async () => {
			await expect(
				getWrappedLocalModuleHookFunction(undefined as unknown as Module, 'doesNotExist', {
					baseDir: '',
					importFn: vi.fn(),
					logger: mockLogger,
					blocking: true,
				}),
			).rejects.toEqual({
				status: 'ERROR',
				message: "Cannot read properties of undefined (reading 'doesNotExist')",
			});
		});
		describe('wrapped hook function', () => {
			describe('with blocking set to true', () => {
				test('should return expected success object', async () => {
					// @ts-expect-error mock hook function with no type declaration
					const mockModule = await import('../__fixtures__/hookAsync.js');
					const hookFunction = await getWrappedLocalModuleHookFunction(mockModule, 'mockHook', {
						baseDir: '',
						importFn: vi.fn(),
						logger: mockLogger,
						blocking: true,
					});
					expect(await hookFunction(convertMockResponseToContext(mockSuccessResponse))).toEqual(
						mockSuccessResponse,
					);
				});
				test('should return expected error object with message', async () => {
					// @ts-expect-error mock hook function with no type declaration
					const mockModule = await import('../__fixtures__/hookAsync.js');
					const hookFunction = await getWrappedLocalModuleHookFunction(mockModule, 'mockHook', {
						baseDir: '',
						importFn: vi.fn(),
						logger: mockLogger,
						blocking: true,
					});
					await expect(
						hookFunction(convertMockResponseToContext(mockErrorResponse)),
					).rejects.toEqual(mockErrorResponse);
				});
			});
			describe('with blocking set to false', async () => {
				test('should return generic success object', async () => {
					// @ts-expect-error mock hook function with no type declaration
					const mockModule = await import('../__fixtures__/hookAsync.js');
					const hookFunction = await getWrappedLocalModuleHookFunction(mockModule, 'mockHook', {
						baseDir: '',
						importFn: vi.fn(),
						logger: mockLogger,
						blocking: false,
					});
					expect(await hookFunction(convertMockResponseToContext(mockErrorResponse))).toEqual({
						...mockSuccessResponse,
						message: 'Local module function invoked successfully',
					});
				});
			});
		});
	});
	describe('getWrappedLocalModuleHookFunction', async () => {
		test('should wrap named export', async () => {
			const result = await getWrappedLocalHookFunction('../__fixtures__/hookAsync.js#mockHook', {
				baseDir: __dirname,
				importFn: importFn,
				logger: mockLogger,
				blocking: false,
			});
			expect(result).toBeTypeOf('function');
		});
		test('should wrap named default export', async () => {
			const result = await getWrappedLocalHookFunction(
				'../__fixtures__/hookNamedDefaultExportAsync.js#mockHook',
				{
					baseDir: __dirname,
					importFn: importFn,
					logger: mockLogger,
					blocking: false,
				},
			);
			expect(result).toBeTypeOf('function');
		});
		test('should wrap default export', async () => {
			const result = await getWrappedLocalHookFunction(
				'../__fixtures__/hookDefaultExportAsync.js#mockHook',
				{
					baseDir: __dirname,
					importFn: importFn,
					logger: mockLogger,
					blocking: false,
				},
			);
			expect(result).toBeTypeOf('function');
		});
		test('should reject with error when function not found', async () => {
			await expect(
				getWrappedLocalHookFunction('../__fixtures__/hookAsync.js#doesNotExist', {
					baseDir: '',
					importFn: vi.fn(),
					logger: mockLogger,
					blocking: true,
				}),
			).rejects.toEqual({
				status: HookStatus.ERROR,
				message: "Cannot read properties of undefined (reading 'doesNotExist')",
			});
		});
		describe('wrapped hook function', () => {
			describe('with blocking set to true', () => {
				test('should return expected success object', async () => {
					const hookFunction = await getWrappedLocalHookFunction(
						'../__fixtures__/hookAsync.js#mockHook',
						{
							baseDir: __dirname,
							importFn: importFn,
							logger: mockLogger,
							blocking: true,
						},
					);
					expect(await hookFunction(convertMockResponseToContext(mockSuccessResponse))).toEqual(
						mockSuccessResponse,
					);
				});
				test('should return expected error object with message', async () => {
					const hookFunction = await getWrappedLocalHookFunction(
						'../__fixtures__/hookAsync.js#mockHook',
						{
							baseDir: __dirname,
							importFn: importFn,
							logger: mockLogger,
							blocking: true,
						},
					);
					await expect(
						hookFunction(convertMockResponseToContext(mockErrorResponse)),
					).rejects.toEqual(mockErrorResponse);
				});
			});
			describe('with blocking set to false', async () => {
				test('should return generic success object', async () => {
					const hookFunction = await getWrappedLocalHookFunction(
						'../__fixtures__/hookAsync.js#mockHook',
						{
							baseDir: __dirname,
							importFn: importFn,
							logger: mockLogger,
							blocking: false,
						},
					);
					expect(await hookFunction(convertMockResponseToContext(mockErrorResponse))).toEqual({
						...mockSuccessResponse,
						message: 'Local function invoked successfully',
					});
				});
			});
		});
	});
	test('isModuleFn', () => {
		expect(isModuleFn({ module: 'module', fn: 'fn' })).toBe(true);
		expect(isModuleFn({ module: 'module' })).toBe(false);
		expect(isModuleFn({ fn: 'fn' })).toBe(false);
		expect(isModuleFn({})).toBe(false);
	});
	test('isRemoteFn', () => {
		expect(isRemoteFn('https://example.com')).toBe(true);
		expect(isRemoteFn('http://example.com')).toBe(false);
		expect(isRemoteFn('example.com')).toBe(false);
		expect(isRemoteFn('https://example.com/path?query=string&another=value')).toBe(true);
	});
});
