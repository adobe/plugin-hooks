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

import { buildHTTPExecutor, SyncFetchFn } from '@graphql-tools/executor-http';
import { createSchema, YogaInitialContext, YogaServer } from 'graphql-yoga';
import { parse } from 'graphql';
import { HookFunctionPayload, HookResponse, HookStatus, UserContext } from '../types';

const mockSuccessResponse: HookResponse = {
	status: HookStatus.SUCCESS,
	message: 'mock ok',
};

const mockErrorResponse: HookResponse = {
	status: HookStatus.ERROR,
	message: 'mock error',
};

const convertMockResponseToContext = (mockResponse: HookResponse) =>
	({
		body: mockResponse,
	}) as unknown as HookFunctionPayload;

const testFetch = (yogaServer: YogaServer<YogaInitialContext, UserContext>, query: string) => {
	if (!('fetch' in yogaServer)) {
		throw new Error('Unable to test YogaServer via fetch executor');
	}

	const executor = buildHTTPExecutor({
		fetch: yogaServer.fetch as SyncFetchFn,
	});

	return Promise.resolve(
		executor({
			document: parse(query),
		}),
	);
};

const mockSchema = createSchema<UserContext>({
	typeDefs: /* GraphQL */ `
		type Query {
			hello: String
		}
	`,
	resolvers: {
		Query: {
			hello: () => 'world',
		},
	},
});

const mockQuery = /* GraphQL */ `
	query {
		hello
	}
`;

export {
	convertMockResponseToContext,
	mockErrorResponse,
	mockSchema,
	mockSuccessResponse,
	mockQuery,
	testFetch,
};
