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

import getAfterAllHookHandler, { AfterAllHookBuildConfig } from '../handleAfterAllHooks';
import { PayloadContext, HookResponse, HookStatus } from '../types';
import { mockLogger } from '../__mocks__/yogaLogger';
import { describe, expect, test, vi } from 'vitest';

describe('getAfterAllHookHandler', () => {
	test('should return afterAllHook function', async () => {
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
			},
		};
		expect(getAfterAllHookHandler(mockConfig)).toBeTypeOf('function');
	});

	describe('should call hook without error', () => {
		test('when blocking and success', async () => {
			const mockResponse: HookResponse = {
				status: HookStatus.SUCCESS,
				message: 'ok',
			};
			const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
			const mockModule = { mockHook };
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: true,
					module: mockModule,
					fn: 'mockHook',
				},
			};
			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
			expect(mockHook).toHaveBeenCalledTimes(0);
			await afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
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
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: false,
					module: mockModule,
					fn: 'mockHook',
				},
			};
			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
			expect(mockHook).toHaveBeenCalledTimes(0);
			await afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
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
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: false,
					module: mockModule,
					fn: 'mockHook',
				},
			};
			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
			expect(mockHook).toHaveBeenCalledTimes(0);
			await afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			});
			expect(mockHook).toHaveBeenCalledOnce();
		});

		test('should update context when blocking hook returns headers', async () => {
			const mockResponse: HookResponse = {
				status: HookStatus.SUCCESS,
				message: 'ok',
				data: {
					headers: {
						'x-afterall-header': 'modified-value',
					},
				},
			};
			const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
			const mockModule = { mockHook };
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: true,
					module: mockModule,
					fn: 'mockHook',
				},
			};
			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
			const updateContext = vi.fn();

			await afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext,
			});

			expect(updateContext).toHaveBeenCalledWith({
				headers: {
					'x-afterall-header': 'modified-value',
				},
			});
		});
	});

	test('should throw when blocking and error', async () => {
		const mockResponse: HookResponse = {
			status: HookStatus.ERROR,
			message: 'mock error message',
		};
		const mockHook = vi.fn().mockReturnValue(Promise.resolve(mockResponse));
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
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
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {
				afterAll: mockMemoizedHook,
			},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
		expect(mockHook).toHaveBeenCalledTimes(0);
		expect(mockMemoizedHook).toHaveBeenCalledTimes(0);
		await afterAllHookHandler({
			payload: {
				context: {} as unknown as PayloadContext,
				document: {},
				result: { data: { test: 'value' } },
			},
			updateContext: () => {},
		});
		expect(mockHook).toHaveBeenCalledTimes(0);
		expect(mockMemoizedHook).toHaveBeenCalledOnce();
	});

	test('should handle invalid response structure gracefully', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				invalidField: 'This should cause an error',
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: false,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		// Should not throw for non-blocking hooks
		await afterAllHookHandler({
			payload: {
				context: {} as unknown as PayloadContext,
				document: {},
				result: { data: { test: 'value' } },
			},
			updateContext: () => {},
		});

		expect(mockHook).toHaveBeenCalledOnce();
	});

	test('should pass result data to hook function', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: HookStatus.SUCCESS,
				message: 'ok',
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: false,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
		const testResult = { data: { user: { id: '123', name: 'Test User' } } };

		await afterAllHookHandler({
			payload: { context: {} as unknown as PayloadContext, document: {}, result: testResult },
			updateContext: () => {},
		});

		expect(mockHook).toHaveBeenCalledWith({
			context: {} as unknown as PayloadContext,
			document: {},
			result: testResult,
		});
	});

	test('should handle result modification with data transformation', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: HookStatus.SUCCESS,
				message: 'data transformed',
				data: {
					result: {
						data: { transformed: true, originalData: 'modified' },
						errors: [],
					},
				},
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
		const updateContext = vi.fn();

		await afterAllHookHandler({
			payload: {
				context: {} as unknown as PayloadContext,
				document: {},
				result: { data: { original: 'data' } },
			},
			updateContext,
		});

		expect(updateContext).toHaveBeenCalledWith({
			result: {
				data: { transformed: true, originalData: 'modified' },
				errors: [],
			},
		});
	});

	test('should handle result modification with error addition', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: HookStatus.SUCCESS,
				message: 'errors added',
				data: {
					result: {
						data: { original: 'data' },
						errors: [
							{
								message: 'Validation error from afterAll',
								extensions: { code: 'VALIDATION_ERROR' },
							},
						],
					},
				},
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
		const updateContext = vi.fn();

		await afterAllHookHandler({
			payload: {
				context: {} as unknown as PayloadContext,
				document: {},
				result: { data: { original: 'data' } },
			},
			updateContext,
		});

		expect(updateContext).toHaveBeenCalledWith({
			result: {
				data: { original: 'data' },
				errors: [
					{
						message: 'Validation error from afterAll',
						extensions: { code: 'VALIDATION_ERROR' },
					},
				],
			},
		});
	});

	test('should handle empty result data', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: HookStatus.SUCCESS,
				message: 'empty result handled',
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: false,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await afterAllHookHandler({
			payload: { context: {} as unknown as PayloadContext, document: {}, result: { data: null } },
			updateContext: () => {},
		});

		expect(mockHook).toHaveBeenCalledWith({
			context: {} as unknown as PayloadContext,
			document: {},
			result: { data: null },
		});
	});

	test('should handle undefined result data', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: HookStatus.SUCCESS,
				message: 'undefined result handled',
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: false,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await afterAllHookHandler({
			payload: {
				context: {} as unknown as PayloadContext,
				document: {},
				result: { data: undefined },
			},
			updateContext: () => {},
		});

		expect(mockHook).toHaveBeenCalledWith({
			context: {} as unknown as PayloadContext,
			document: {},
			result: { data: undefined },
		});
	});

	test('should handle hook function throwing error', async () => {
		const mockHook = vi.fn().mockImplementation(() => {
			throw new Error('Hook function error');
		});
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError('Hook function error');
	});

	test('should handle hook function returning invalid status', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: 'INVALID_STATUS',
				message: 'invalid status',
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError('invalid status');
	});

	test('should handle non-blocking hook with invalid response structure', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				invalidField: 'This should not cause an error for non-blocking hooks',
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: false,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		// Should not throw for non-blocking hooks with invalid response
		await afterAllHookHandler({
			payload: {
				context: {} as unknown as PayloadContext,
				document: {},
				result: { data: { test: 'value' } },
			},
			updateContext: () => {},
		});

		expect(mockHook).toHaveBeenCalledOnce();
	});

	test('should handle blocking hook with missing status field', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				message: 'missing status field',
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError("Cannot read properties of undefined (reading 'toUpperCase')");
	});

	test('should handle updateContext with both headers and result', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: HookStatus.SUCCESS,
				message: 'both headers and result',
				data: {
					headers: {
						'x-custom-header': 'custom-value',
					},
					result: {
						data: { modified: true },
						errors: [],
					},
				},
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
		const updateContext = vi.fn();

		await afterAllHookHandler({
			payload: {
				context: {} as unknown as PayloadContext,
				document: {},
				result: { data: { original: 'data' } },
			},
			updateContext,
		});

		expect(updateContext).toHaveBeenCalledWith({
			headers: {
				'x-custom-header': 'custom-value',
			},
			result: {
				data: { modified: true },
				errors: [],
			},
		});
	});

	test('should handle blocking hook with success but no data property', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: HookStatus.SUCCESS,
				message: 'success but no data',
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
		const updateContext = vi.fn();

		await afterAllHookHandler({
			payload: {
				context: {} as unknown as PayloadContext,
				document: {},
				result: { data: { test: 'value' } },
			},
			updateContext,
		});

		expect(mockHook).toHaveBeenCalledOnce();
		expect(updateContext).not.toHaveBeenCalled(); // Should not call updateContext when no data
	});

	test('should handle blocking hook with success and empty data object', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: HookStatus.SUCCESS,
				message: 'success with empty data',
				data: {},
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
		const updateContext = vi.fn();

		await afterAllHookHandler({
			payload: {
				context: {} as unknown as PayloadContext,
				document: {},
				result: { data: { test: 'value' } },
			},
			updateContext,
		});

		expect(mockHook).toHaveBeenCalledOnce();
		expect(updateContext).toHaveBeenCalledWith({}); // Should call updateContext with empty object
	});

	test('should handle non-blocking hook with data (should not call updateContext)', async () => {
		const mockHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: HookStatus.SUCCESS,
				message: 'non-blocking with data',
				data: {
					result: {
						data: { modified: true },
						errors: [],
					},
				},
			}),
		);
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: false,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
		const updateContext = vi.fn();

		await afterAllHookHandler({
			payload: {
				context: {} as unknown as PayloadContext,
				document: {},
				result: { data: { test: 'value' } },
			},
			updateContext,
		});

		expect(mockHook).toHaveBeenCalledOnce();
		expect(updateContext).not.toHaveBeenCalled(); // Non-blocking hooks should not call updateContext
	});

	test('should handle hook function returning non-Error object with message', async () => {
		const mockHook = vi.fn().mockImplementation(() => {
			throw { message: 'Non-Error object with message' };
		});
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError('Error while invoking local module function');
	});

	test('should handle hook function returning object without message property', async () => {
		const mockHook = vi.fn().mockImplementation(() => {
			throw { someOtherProperty: 'no message property' };
		});
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError('Error while invoking local module function');
	});

	test('should handle hook function returning primitive value', async () => {
		const mockHook = vi.fn().mockImplementation(() => {
			throw 'Primitive string error';
		});
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError('Error while invoking local module function');
	});

	test('should handle memoized function throwing error', async () => {
		const mockMemoizedHook = vi.fn().mockImplementation(() => {
			throw new Error('Memoized function error');
		});
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {
				afterAll: mockMemoizedHook,
			},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError('Memoized function error');
	});

	test('should handle memoized function returning invalid response', async () => {
		const mockMemoizedHook = vi.fn().mockReturnValue(
			Promise.resolve({
				status: HookStatus.ERROR,
				message: 'Memoized function error response',
			}),
		);
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {
				afterAll: mockMemoizedHook,
			},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError('Memoized function error response');
	});

	test('should handle afterAll function not being defined', async () => {
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				// No module or composer defined
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		// Should throw when no function is defined
		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError('Unable to invoke local function undefined');
	});

	test('should handle afterAll function returning null', async () => {
		const mockHook = vi.fn().mockReturnValue(Promise.resolve(null));
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError("Cannot read properties of null (reading 'status')");
	});

	test('should handle afterAll function returning undefined', async () => {
		const mockHook = vi.fn().mockReturnValue(Promise.resolve(undefined));
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError("Cannot read properties of undefined (reading 'status')");
	});

	test('should handle afterAll function returning primitive value', async () => {
		const mockHook = vi.fn().mockReturnValue(Promise.resolve('string response'));
		const mockModule = { mockHook };
		const mockConfig: AfterAllHookBuildConfig = {
			memoizedFns: {},
			baseDir: '',
			logger: mockLogger,
			afterAll: {
				blocking: true,
				module: mockModule,
				fn: 'mockHook',
			},
		};
		const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

		await expect(
			afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			}),
		).rejects.toThrowError("Cannot read properties of undefined (reading 'toUpperCase')");
	});

	describe('Remote Hook Tests', () => {
		test('should handle remote hook with success response', async () => {
			const mockRemoteHook = vi.fn().mockReturnValue(
				Promise.resolve({
					status: HookStatus.SUCCESS,
					message: 'Remote hook success',
					data: {
						headers: {
							'x-remote-header': 'remote-value',
						},
					},
				}),
			);
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: true,
					composer: 'https://example.com/remote-hook',
				},
			};

			// Mock the getWrappedRemoteHookFunction to return our mock
			const originalGetWrappedRemoteHookFunction = await import('../utils');
			vi.spyOn(
				originalGetWrappedRemoteHookFunction,
				'getWrappedRemoteHookFunction',
			).mockResolvedValue(mockRemoteHook);

			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
			const updateContext = vi.fn();

			await afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext,
			});

			expect(mockRemoteHook).toHaveBeenCalledOnce();
			expect(updateContext).toHaveBeenCalledWith({
				headers: {
					'x-remote-header': 'remote-value',
				},
			});
		});

		test('should handle remote hook with error response', async () => {
			const mockRemoteHook = vi.fn().mockReturnValue(
				Promise.resolve({
					status: HookStatus.ERROR,
					message: 'Remote hook error',
				}),
			);
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: true,
					composer: 'https://example.com/remote-hook',
				},
			};

			// Mock the getWrappedRemoteHookFunction to return our mock
			const originalGetWrappedRemoteHookFunction = await import('../utils');
			vi.spyOn(
				originalGetWrappedRemoteHookFunction,
				'getWrappedRemoteHookFunction',
			).mockResolvedValue(mockRemoteHook);

			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

			await expect(
				afterAllHookHandler({
					payload: {
						context: {} as unknown as PayloadContext,
						document: {},
						result: { data: { test: 'value' } },
					},
					updateContext: () => {},
				}),
			).rejects.toThrowError('Remote hook error');
		});

		test('should handle non-blocking remote hook', async () => {
			const mockRemoteHook = vi.fn().mockReturnValue(
				Promise.resolve({
					status: HookStatus.ERROR,
					message: 'Remote hook error',
				}),
			);
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: false,
					composer: 'https://example.com/remote-hook',
				},
			};

			// Mock the getWrappedRemoteHookFunction to return our mock
			const originalGetWrappedRemoteHookFunction = await import('../utils');
			vi.spyOn(
				originalGetWrappedRemoteHookFunction,
				'getWrappedRemoteHookFunction',
			).mockResolvedValue(mockRemoteHook);

			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

			// Should not throw for non-blocking remote hooks
			await afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			});

			expect(mockRemoteHook).toHaveBeenCalledOnce();
		});

		test('should handle remote hook with result modification', async () => {
			const mockRemoteHook = vi.fn().mockReturnValue(
				Promise.resolve({
					status: HookStatus.SUCCESS,
					message: 'Remote hook with result modification',
					data: {
						result: {
							data: { modified: true, remoteModified: true },
							errors: [],
						},
					},
				}),
			);
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: true,
					composer: 'https://example.com/remote-hook',
				},
			};

			// Mock the getWrappedRemoteHookFunction to return our mock
			const originalGetWrappedRemoteHookFunction = await import('../utils');
			vi.spyOn(
				originalGetWrappedRemoteHookFunction,
				'getWrappedRemoteHookFunction',
			).mockResolvedValue(mockRemoteHook);

			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
			const updateContext = vi.fn();

			await afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { original: 'data' } },
				},
				updateContext,
			});

			expect(mockRemoteHook).toHaveBeenCalledOnce();
			expect(updateContext).toHaveBeenCalledWith({
				result: {
					data: { modified: true, remoteModified: true },
					errors: [],
				},
			});
		});

		test('should handle remote hook throwing error', async () => {
			const mockRemoteHook = vi.fn().mockImplementation(() => {
				throw new Error('Remote hook network error');
			});
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: true,
					composer: 'https://example.com/remote-hook',
				},
			};

			// Mock the getWrappedRemoteHookFunction to return our mock
			const originalGetWrappedRemoteHookFunction = await import('../utils');
			vi.spyOn(
				originalGetWrappedRemoteHookFunction,
				'getWrappedRemoteHookFunction',
			).mockResolvedValue(mockRemoteHook);

			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

			await expect(
				afterAllHookHandler({
					payload: {
						context: {} as unknown as PayloadContext,
						document: {},
						result: { data: { test: 'value' } },
					},
					updateContext: () => {},
				}),
			).rejects.toThrowError('Remote hook network error');
		});

		test('should memoize remote hook function', async () => {
			const mockRemoteHook = vi.fn().mockReturnValue(
				Promise.resolve({
					status: HookStatus.SUCCESS,
					message: 'Remote hook success',
				}),
			);
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: true,
					composer: 'https://example.com/remote-hook',
				},
			};

			// Mock the getWrappedRemoteHookFunction to return our mock
			const originalGetWrappedRemoteHookFunction = await import('../utils');
			const getWrappedRemoteHookFunctionSpy = vi
				.spyOn(originalGetWrappedRemoteHookFunction, 'getWrappedRemoteHookFunction')
				.mockResolvedValue(mockRemoteHook);

			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);

			// First call should create the remote hook function
			await afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			});

			// Second call should use memoized function
			await afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { test: 'value' } },
				},
				updateContext: () => {},
			});

			// getWrappedRemoteHookFunction should only be called once
			expect(getWrappedRemoteHookFunctionSpy).toHaveBeenCalledOnce();
			expect(mockRemoteHook).toHaveBeenCalledTimes(2);
		});

		test('should handle remote hook with both headers and result', async () => {
			const mockRemoteHook = vi.fn().mockReturnValue(
				Promise.resolve({
					status: HookStatus.SUCCESS,
					message: 'Remote hook with both headers and result',
					data: {
						headers: {
							'x-remote-header': 'remote-value',
						},
						result: {
							data: { remoteModified: true },
							errors: [],
						},
					},
				}),
			);
			const mockConfig: AfterAllHookBuildConfig = {
				memoizedFns: {},
				baseDir: '',
				logger: mockLogger,
				afterAll: {
					blocking: true,
					composer: 'https://example.com/remote-hook',
				},
			};

			// Mock the getWrappedRemoteHookFunction to return our mock
			const originalGetWrappedRemoteHookFunction = await import('../utils');
			vi.spyOn(
				originalGetWrappedRemoteHookFunction,
				'getWrappedRemoteHookFunction',
			).mockResolvedValue(mockRemoteHook);

			const afterAllHookHandler = getAfterAllHookHandler(mockConfig);
			const updateContext = vi.fn();

			await afterAllHookHandler({
				payload: {
					context: {} as unknown as PayloadContext,
					document: {},
					result: { data: { original: 'data' } },
				},
				updateContext,
			});

			expect(mockRemoteHook).toHaveBeenCalledOnce();
			expect(updateContext).toHaveBeenCalledWith({
				headers: {
					'x-remote-header': 'remote-value',
				},
				result: {
					data: { remoteModified: true },
					errors: [],
				},
			});
		});
	});
});
