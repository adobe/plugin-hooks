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

/**
 * Handles errors thrown during hook execution with consistent error processing
 * @param err - The unknown error that was caught
 * @param logger - Logger instance for error reporting
 * @param hookType - The type of hook (beforeAll, afterAll) for error messages
 * @throws {Error} - Always throws a standardized Error
 */
export function handleHookExecutionError(
	err: unknown,
	logger: YogaLogger,
	hookType: string,
): never {
	logger.error('Error while invoking %s hook %o', hookType, err);

	if (err instanceof Error) {
		throw new Error(err.message);
	}

	if (err && typeof err === 'object' && 'message' in err) {
		throw new Error((err as { message?: string }).message);
	}

	throw new Error(`Error while invoking ${hookType} hook`);
}

/**
 * Handles errors thrown during hook handler execution with simplified error processing
 * @param err - The unknown error that was caught
 * @param hookType - The type of hook (beforeAll, afterAll) for error messages
 * @throws {Error} - Always throws a standardized Error
 */
export function handleHookHandlerError(err: unknown, hookType: string): never {
	throw new Error((err instanceof Error && err.message) || `Error while invoking ${hookType} hook`);
}
