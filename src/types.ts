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

import { GraphQLParams, YogaInitialContext, YogaLogger } from 'graphql-yoga';
import type { GraphQLError, ExecutionResult } from 'graphql';

// Re-export GraphQLError from graphql package
export type { GraphQLError };

// Use the standard GraphQL data type from ExecutionResult
export type GraphQLData = ExecutionResult['data'];

// Define the GraphQL execution result type
export type GraphQLResult = {
	data?: GraphQLData;
	errors?: GraphQLError[];
	extensions?: Record<string, unknown>;
};

/**
 * State API interface for managing key-value pairs.
 */
export interface StateApi {
	/**
	 * Get a value by key.
	 * @param key Key to retrieve.
	 */
	get(key: string): Promise<string | null>;

	/**
	 * Put a key-value pair with optional TTL.
	 * @param key Key to store.
	 * @param value Value to store.
	 * @param config Optional configuration object that may contain a TTL value in seconds.
	 */
	put(key: string, value: string, config?: { ttl?: number }): Promise<void>;

	/**
	 * Delete a key-value pair.
	 * @param key
	 */
	delete(key: string): Promise<void>;
}

export interface UserContext extends YogaInitialContext {
	operationName?: string;
	document?: unknown;
	headers?: Record<string, string>;
	secrets?: Record<string, string>;
	state?: StateApi;
}

export type SourceHookConfig = Record<string, HookConfig[]>;

export interface HookConfig {
	blocking: boolean;
	composer?: string;
	module?: Module;
	fn?: string;
}

export interface MemoizedFns {
	beforeAll?: HookFunction;
	beforeSource?: Record<string, (HookFunction | null)[]>;
	afterSource?: Record<string, (HookFunction | null)[]>;
	afterAll?: HookFunction;
}

export interface Module {
	[key: string]: object | HookFunction | undefined;
	default?: Module;
}

/**
 * Configuration required when building/memoizing the handler wrapping the black box hook function.
 */
export interface HookBuildConfig {
	baseDir: string;
	logger: YogaLogger;
	memoizedFns: MemoizedFns;
}

/**
 * Configuration required when executing the hook handler.
 */
export interface HookExecConfig {
	payload: HookFunctionPayload;
}

/**
 * Configuration required when executing the source hook handler.
 */
export interface SourceHookExecConfig extends HookExecConfig {
	sourceName: string;
	hookType: string;
	payload: SourceHookFunctionPayload;
}

export interface HookFunctionPayloadContext {
	request: Request;
	params: GraphQLParams;
	body?: unknown;
	headers?: Record<string, string>;
	secrets?: Record<string, string>;
	state?: StateApi;
	logger?: YogaLogger;
}

export type HookFunctionPayload = {
	context: HookFunctionPayloadContext;
	document?: unknown;
};

export type SourceHookFunctionPayload = HookFunctionPayload & {
	sourceName?: string;
};

export type BeforeAllHookFunctionPayload = HookFunctionPayload & {};

export type BeforeSourceHookFunctionPayload = SourceHookFunctionPayload & {
	request: RequestInit;
};

export type AfterSourceHookFunctionPayload = SourceHookFunctionPayload & {
	response?: Response;
};

export type AfterAllHookFunctionPayload = HookFunctionPayload & {
	result?: GraphQLResult;
};

export type HookFunction = (
	payload: HookFunctionPayload | SourceHookFunctionPayload,
) => Promise<HookResponse> | HookResponse;

export interface HookResponse {
	status: HookStatus;
	message: string;
}

export interface BeforeAllHookResponse extends HookResponse {
	data?: {
		headers?: {
			[headerName: string]: string;
		};
	};
}

export interface BeforeSourceHookResponse extends HookResponse {
	data?: {
		request?:
			| RequestInit
			| {
					body?: string | ReadableStream<Uint8Array>;
					headers?: Record<string, string>;
					method?: string;
					url?: string;
			  };
	};
}

export interface AfterSourceHookResponse extends HookResponse {
	data?: {
		response?:
			| Response
			| {
					body?: string | ReadableStream<Uint8Array>;
					headers?: Record<string, string>;
					status?: number;
					statusText?: string;
			  };
	};
}

export interface AfterAllHookResponse extends HookResponse {
	data?: {
		result?: GraphQLResult;
	};
}

export enum HookStatus {
	SUCCESS = 'SUCCESS',
	ERROR = 'ERROR',
}

/**
 * Updates the context with new headers.
 */
export type UpdateContextFn = (data: { headers?: Record<string, string> }) => void;

/**
 * Sets GraphQL result and stops further execution.
 */
export type SetResultAndStopExecutionFn = (result: ExecutionResult) => void;

// Export error codes for uniform error handling
export { PLUGIN_HOOKS_ERROR_CODES, type PluginHooksErrorCode } from './errors';
