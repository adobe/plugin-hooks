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

import type { YogaLogger } from 'graphql-yoga';
import { GraphQLError } from 'graphql/error';
import {
	type HookConfig,
	HookFunctionPayload,
	MemoizedFns,
	PLUGIN_HOOKS_ERROR_CODES,
	PluginHooksErrorCode,
} from '../types';
import { HookLifecycleEvent, HookLifecycleInvokeHooksParams } from './hookLifecycleRegistry';

export enum HookType {
	BEFORE_ALL = 'beforeAll',
	BEFORE_SOURCE = 'beforeSource',
	AFTER_SOURCE = 'afterSource',
	AFTER_ALL = 'afterAll',
}

/**
 * Configuration passed when building a hook.
 */
export interface HookBuildConfig {
	baseDir: string;
	config: HookConfig;
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

/**
 * Configuration passed when executing a hook.
 */
export interface HookExecutionConfig {
	/**
	 * Payload passed to the hook function.
	 */
	payload: HookFunctionPayload;
}

/**
 * Wrapper around the black box hook function that includes the necessary configuration and context from the associated
 * lifecycle event.
 */
export type WrappedHookFunction = (params: HookLifecycleInvokeHooksParams) => Promise<void>;

/**
 * Abstract class representing a hook in the system.
 */
abstract class Hook {
	/**
	 * The type of hook, e.g., beforeAll, beforeSource, afterSource, afterAll.
	 * @private
	 */
	private readonly type: HookType;

	/**
	 * The lifecycle event associated with the hook.
	 * @private
	 */
	private readonly lifecycleEvent: HookLifecycleEvent;

	/**
	 * The error code used for error handling in the hook.
	 * @private
	 */
	private readonly errorCode: PluginHooksErrorCode;

	/**
	 * The build configuration for the hook.
	 * @private
	 */
	private readonly buildConfig: HookBuildConfig;

	private wrappedHookFunction: WrappedHookFunction | null = null;

	protected constructor(
		type: HookType,
		lifecycleEvent: HookLifecycleEvent,
		errorCode: PluginHooksErrorCode,
		hookConfig: HookBuildConfig,
	) {
		this.type = type;
		this.lifecycleEvent = lifecycleEvent;
		this.errorCode = errorCode;
		this.buildConfig = hookConfig;
	}

	/**
	 * Gets a generic error for when a hook fails to execute.
	 * @static
	 */
	static getGenericError() {
		return new GraphQLError(`Error while invoking hook`, {
			extensions: {
				code: PLUGIN_HOOKS_ERROR_CODES.ERROR_PLUGIN_HOOKS,
			},
		});
	}

	/**
	 * Gets the type of hook.
	 * @protected
	 */
	protected getType() {
		return this.type;
	}

	/**
	 * Gets the lifecycle event associated with the hook.
	 */
	public getLifecycleEvent() {
		return this.lifecycleEvent;
	}

	/**
	 * Gets the build configuration for the hook.
	 * @protected
	 */
	protected getBuildConfig() {
		return this.buildConfig;
	}

	/**
	 * Gets the error code associated with the hook.
	 * @protected
	 */
	protected getErrorCode() {
		return this.errorCode;
	}

	/**
	 * Gets the black box hook function wrapped with the necessary configuration, context, and error handling.
	 */
	public abstract wrapHookFunction(): WrappedHookFunction;

	/**
	 * Invoke the wrapped hook function with parameters associated with the lifecycle event. Hooks should be self-contained
	 * and throw hook specific errors if they fail.
	 * @param params Hook lifecycle parameters that include the context and payload
	 * @throws {GraphQLError} Throws a GraphQLError with the hook's error code if an error occurs during execution
	 */
	public async invoke(params: HookLifecycleInvokeHooksParams) {
		this.getBuildConfig().logger.info('Invoking hook %s', this.getType());
		if (!this.wrappedHookFunction) {
			this.getBuildConfig().logger.info('Memoize hook %s', this.getType());
			this.wrappedHookFunction = this.wrapHookFunction();
		}
		return await this.wrappedHookFunction(params);
	}

	/**
	 * Handles errors thrown during hook execution with consistent error processing. Hooks could throw an error, reject a
	 * promise, or return an object with an error message. This method normalizes all of these cases into a standardized
	 * GraphQLError with an appropriate error code for the hook.
	 * @param err The unknown error that was caught
	 */
	public getNormalizedHookError(err: unknown): GraphQLError {
		let message = `Error while invoking ${this.getType()} hook`;

		if (err instanceof Error) {
			message = err.message;
		} else if (err && typeof err === 'object' && 'message' in err) {
			message = (err as { message: string }).message;
		} else if (typeof err === 'string') {
			message = err;
		}

		return new GraphQLError(message, {
			extensions: {
				code: this.getErrorCode(),
			},
		});
	}
}

export { Hook };
