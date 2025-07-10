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

import { GraphQLParams, YogaInitialContext } from 'graphql-yoga';
import type { GraphQLError } from 'graphql/error';

// Re-export GraphQLError from graphql package
export type { GraphQLError };

// Define types for GraphQL result data
export type GraphQLData = Record<string, unknown> | null;

// Define the GraphQL execution result type
export type GraphQLResult = {
	data?: GraphQLData;
	errors?: GraphQLError[];
};

export interface UserContext extends YogaInitialContext {
	headers?: Record<string, string>;
	secrets?: Record<string, string>;
	modifiedResult?: GraphQLResult;
}

export interface HookConfig {
	blocking: boolean;
	composer?: string;
	module?: Module;
	fn?: string;
}

export interface MemoizedFns {
	beforeAll?: HookFunction;
	afterAll?: HookFunction;
}

export interface Module {
	[key: string]: object | HookFunction | undefined;
	default?: Module;
}

export type HookFunctionPayload = {
	context: PayloadContext;
	document: unknown;
	result?: GraphQLResult;
};

export interface PayloadContext {
	request: Request;
	params: GraphQLParams;
	body: unknown;
	headers?: Record<string, string>;
	secrets?: Record<string, string>;
}

export type HookFunction = (payload: HookFunctionPayload) => Promise<HookResponse> | HookResponse;

export interface HookResponse {
	status: HookStatus;
	message: string;
	data?: {
		headers?: {
			[headerName: string]: string;
		};
		result?: GraphQLResult;
	};
}

export enum HookStatus {
	SUCCESS = 'SUCCESS',
	ERROR = 'ERROR',
}
