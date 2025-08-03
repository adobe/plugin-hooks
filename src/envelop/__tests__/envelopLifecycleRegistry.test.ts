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

import { beforeEach, describe } from 'vitest';
import { mockHookFactory, mockSourceHookFactory } from '../../__mocks__/hook';
import { mockLogger } from '../../__mocks__/yogaLogger';
import { EnvelopLifecycleRegistry } from '../envelopLifecycleRegistry';
import { EnvelopLifecycleEvent, EnvelopLifecycleInvokeHooksParams } from '../types';

let lifecycleEventRegistry: EnvelopLifecycleRegistry;
beforeEach(() => {
	lifecycleEventRegistry = new EnvelopLifecycleRegistry(mockLogger);
});

describe('envelopLifecycleRegistry', () => {
	test('should instantiate with default values', () => {
		const lifecycleRegistry = new EnvelopLifecycleRegistry(mockLogger);
		expect(lifecycleRegistry).toBeDefined();
	});

	describe('addHookToRegistry', () => {
		const invalidLifecycleEvents = [
			null,
			undefined,
			'unimplemented' as unknown as EnvelopLifecycleEvent,
		];
		test.each(invalidLifecycleEvents)(
			'should throw error when hook has invalid/unimplemented lifecycle event %s',
			lifecycleEvent => {
				const mockHook = mockHookFactory(lifecycleEvent as unknown as EnvelopLifecycleEvent);
				expect(() => lifecycleEventRegistry.addHookToRegistry(mockHook)).toThrowError(
					`Error adding global hook to registry. Hook has invalid or unimplemented lifecycle event`,
				);
			},
		);

		const globalLifecycleEvents = [
			EnvelopLifecycleEvent.ON_EXECUTE,
			EnvelopLifecycleEvent.ON_EXECUTE_DONE,
		];
		test.each(globalLifecycleEvents)(
			'should add a global hook to the registry %s',
			lifecycleEvent => {
				const mockHook = mockHookFactory(lifecycleEvent);
				lifecycleEventRegistry.addHookToRegistry(mockHook);
				const hooks = lifecycleEventRegistry.getHooks({
					event: lifecycleEvent,
				} as unknown as EnvelopLifecycleInvokeHooksParams);
				expect(typeof hooks).toBe('object');
				expect(hooks.length).toBe(1);
				expect(hooks[0]).toBe(mockHook);
			},
		);

		const sourceLifecycleEvents = [
			EnvelopLifecycleEvent.ON_FETCH,
			EnvelopLifecycleEvent.ON_FETCH_DONE,
		];
		test.each(sourceLifecycleEvents)(
			'should add a source hook to the registry %s',
			lifecycleEvent => {
				const mockHook = mockSourceHookFactory(lifecycleEvent, 'mockSource');
				lifecycleEventRegistry.addHookToRegistry(mockHook);
				const hooks = lifecycleEventRegistry.getHooks({
					event: lifecycleEvent,
					sourceName: 'mockSource',
				} as unknown as EnvelopLifecycleInvokeHooksParams);
				expect(typeof hooks).toBe('object');
				expect(hooks.length).toBe(1);
				expect(hooks[0]).toBe(mockHook);
			},
		);
	});

	describe('invokeHooks', () => {
		test('should return without errors when no global hooks are registered for the event', () => {
			expect(() =>
				lifecycleEventRegistry.invokeHooks({
					event: EnvelopLifecycleEvent.ON_EXECUTE,
					payload: {},
				} as unknown as EnvelopLifecycleInvokeHooksParams),
			).not.toThrowError();
		});

		test('should return without errors when no source hooks are registered for the event', () => {
			expect(() =>
				lifecycleEventRegistry.invokeHooks({
					event: EnvelopLifecycleEvent.ON_FETCH,
					payload: {},
					sourceName: 'mockSource',
				} as unknown as EnvelopLifecycleInvokeHooksParams),
			).not.toThrowError();
		});

		const testCases = [
			{
				lifecycleEvent: EnvelopLifecycleEvent.ON_EXECUTE,
				onExecuteInvocations: 2,
				onExecuteDoneInvocations: 0,
				onFetchInvocationsSource1: 0,
				onFetchDoneInvocationsSource1: 0,
				onFetchInvocationsSource2: 0,
				onFetchDoneInvocationsSource2: 0,
			},
			{
				lifecycleEvent: EnvelopLifecycleEvent.ON_EXECUTE_DONE,
				onExecuteInvocations: 0,
				onExecuteDoneInvocations: 3,
				onFetchInvocationsSource1: 0,
				onFetchDoneInvocationsSource1: 0,
				onFetchInvocationsSource2: 0,
				onFetchDoneInvocationsSource2: 0,
			},
			{
				lifecycleEvent: EnvelopLifecycleEvent.ON_FETCH,
				sourceName: 'mockSource1',
				onExecuteInvocations: 0,
				onExecuteDoneInvocations: 0,
				onFetchInvocationsSource1: 1,
				onFetchDoneInvocationsSource1: 0,
				onFetchInvocationsSource2: 0,
				onFetchDoneInvocationsSource2: 0,
			},
			{
				lifecycleEvent: EnvelopLifecycleEvent.ON_FETCH_DONE,
				sourceName: 'mockSource1',
				onExecuteInvocations: 0,
				onExecuteDoneInvocations: 0,
				onFetchInvocationsSource1: 0,
				onFetchDoneInvocationsSource1: 1,
				onFetchInvocationsSource2: 0,
				onFetchDoneInvocationsSource2: 0,
			},
			{
				lifecycleEvent: EnvelopLifecycleEvent.ON_FETCH,
				sourceName: 'mockSource2',
				onExecuteInvocations: 0,
				onExecuteDoneInvocations: 0,
				onFetchInvocationsSource1: 0,
				onFetchDoneInvocationsSource1: 0,
				onFetchInvocationsSource2: 1,
				onFetchDoneInvocationsSource2: 0,
			},
			{
				lifecycleEvent: EnvelopLifecycleEvent.ON_FETCH_DONE,
				sourceName: 'mockSource2',
				onExecuteInvocations: 0,
				onExecuteDoneInvocations: 0,
				onFetchInvocationsSource1: 0,
				onFetchDoneInvocationsSource1: 0,
				onFetchInvocationsSource2: 0,
				onFetchDoneInvocationsSource2: 1,
			},
		];
		test.each(testCases)(
			'should invoke associated hooks %s',
			async ({
				lifecycleEvent,
				sourceName,
				onExecuteInvocations,
				onExecuteDoneInvocations,
				onFetchInvocationsSource1,
				onFetchDoneInvocationsSource1,
				onFetchInvocationsSource2,
				onFetchDoneInvocationsSource2,
			}) => {
				const mockOnExecuteHook = mockHookFactory(EnvelopLifecycleEvent.ON_EXECUTE);
				const mockOnExecuteDoneHook = mockHookFactory(EnvelopLifecycleEvent.ON_EXECUTE_DONE);
				const mockOnFetchHookSource1 = mockSourceHookFactory(
					EnvelopLifecycleEvent.ON_FETCH,
					'mockSource1',
				);
				const mockOnFetchDoneHookSource1 = mockSourceHookFactory(
					EnvelopLifecycleEvent.ON_FETCH_DONE,
					'mockSource1',
				);
				const mockOnFetchHookSource2 = mockSourceHookFactory(
					EnvelopLifecycleEvent.ON_FETCH,
					'mockSource2',
				);
				const mockOnFetchDoneHookSource2 = mockSourceHookFactory(
					EnvelopLifecycleEvent.ON_FETCH_DONE,
					'mockSource2',
				);
				lifecycleEventRegistry.addHooksToRegistry([
					mockOnExecuteHook,
					mockOnExecuteHook,
					mockOnExecuteDoneHook,
					mockOnExecuteDoneHook,
					mockOnExecuteDoneHook,
					mockOnFetchHookSource1,
					mockOnFetchDoneHookSource1,
					mockOnFetchHookSource2,
					mockOnFetchDoneHookSource2,
				]);
				await lifecycleEventRegistry.invokeHooks({
					event: lifecycleEvent,
					payload: {},
					sourceName: sourceName,
				} as unknown as EnvelopLifecycleInvokeHooksParams);
				expect(mockOnExecuteHook.invoke).toBeCalledTimes(onExecuteInvocations);
				expect(mockOnExecuteDoneHook.invoke).toBeCalledTimes(onExecuteDoneInvocations);
				expect(mockOnFetchHookSource1.invoke).toBeCalledTimes(onFetchInvocationsSource1);
				expect(mockOnFetchDoneHookSource1.invoke).toBeCalledTimes(onFetchDoneInvocationsSource1);
				expect(mockOnFetchHookSource2.invoke).toBeCalledTimes(onFetchInvocationsSource2);
				expect(mockOnFetchDoneHookSource2.invoke).toBeCalledTimes(onFetchDoneInvocationsSource2);
			},
		);
	});
});
