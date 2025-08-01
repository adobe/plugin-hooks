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

/**
 * Uniform error codes for plugin hooks
 * Format: ERROR_PLUGIN_HOOKS_[HOOK_TYPE]
 */
export const PLUGIN_HOOKS_ERROR_CODES = {
	/** Error during general hook execution */
	ERROR_PLUGIN_HOOKS: 'ERROR_PLUGIN_HOOKS',

	/** Error during beforeAll hook execution */
	ERROR_PLUGIN_HOOKS_BEFORE_ALL: 'ERROR_PLUGIN_HOOKS_BEFORE_ALL',

	/** Error during beforeSource hook execution */
	ERROR_PLUGIN_HOOKS_BEFORE_SOURCE: 'ERROR_PLUGIN_HOOKS_BEFORE_SOURCE',

	/** Error during afterSource hook execution */
	ERROR_PLUGIN_HOOKS_AFTER_SOURCE: 'ERROR_PLUGIN_HOOKS_AFTER_SOURCE',

	/** Error during afterAll hook execution */
	ERROR_PLUGIN_HOOKS_AFTER_ALL: 'ERROR_PLUGIN_HOOKS_AFTER_ALL',
} as const;

/**
 * Type for plugin hooks error codes
 */
export type PluginHooksErrorCode =
	(typeof PLUGIN_HOOKS_ERROR_CODES)[keyof typeof PLUGIN_HOOKS_ERROR_CODES];
