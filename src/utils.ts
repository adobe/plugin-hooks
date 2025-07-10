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

import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import type { YogaLogger } from 'graphql-yoga';
import type { ImportFn } from '@graphql-mesh/types';
import { default as Timeout } from 'await-timeout';
import makeCancellablePromise from 'make-cancellable-promise';
import fetch from 'node-fetch';
import { HookFunction, HookStatus, Module, HookResponse, HookFunctionPayload, SourceHookFunctionPayload } from './types';

export interface MetaConfig {
	logger: YogaLogger;
	blocking: boolean;
	baseDir: string;
	importFn: ImportFn;
}

/**
 * Execute a promise with a timeout. Defaults to 30 seconds.
 * @param promise Promise.
 * @param ms Duration in ms.
 */
export async function timedPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
	try {
		const { promise: newPromise, cancel } = makeCancellablePromise(promise);
		return Timeout.wrap(newPromise, ms, 'Timeout').catch((err: Error) => {
			if (err.message === 'Timeout') {
				cancel();
			}
			return Promise.reject(err);
		});
	} catch (err) {
		return Promise.reject(err);
	}
}

/**
 * Parse response body for hook response.
 * @param rawBody Response body string.
 * @param isOk Response status.
 */
export function parseResponseBody(rawBody: string, isOk: boolean): HookResponse {
	try {
		const body = JSON.parse(rawBody);
		if (body.status) {
			return body;
		} else {
			if (isOk) {
				return {
					status: HookStatus.SUCCESS,
					message: rawBody,
				};
			} else {
				return {
					status: HookStatus.ERROR,
					message: rawBody,
				};
			}
		}
	} catch {
		if (isOk) {
			return {
				status: HookStatus.SUCCESS,
				message: rawBody,
			};
		} else {
			return {
				status: HookStatus.ERROR,
				message: rawBody || 'Unable to parse hook function response',
			};
		}
	}
}

/**
 * Get remote hook function wrapped in utilities to handle timeouts, errors, and blocking state.
 * @param url Remote function URL.
 * @param metaConfig Meta configuration.
 */
export async function getWrappedRemoteHookFunction(
	url: string,
	metaConfig: MetaConfig,
): Promise<HookFunction> {
	return async (data: HookFunctionPayload | SourceHookFunctionPayload): Promise<HookResponse> => {
		const { logger, blocking } = metaConfig;
		try {
			logger.debug('Invoking remote fn %s', url);
			const requestOptions = {
				method: 'POST',
				body: JSON.stringify(data),
				headers: {
					'Content-Type': 'application/json',
				},
			};
			return new Promise<HookResponse>(async (resolve, reject: (reason?: HookResponse) => void) => {
				const response$ = fetch(url, requestOptions);
				if (blocking) {
					const response = await response$;
					const rawBody = await response.text();
					const body = parseResponseBody(rawBody, response.ok);
					if (body.status.toUpperCase() === HookStatus.SUCCESS) {
						resolve(body);
					} else {
						reject(body);
					}
				} else {
					resolve({
						status: HookStatus.SUCCESS,
						message: 'Remote function invoked successfully',
					});
				}
			});
		} catch (error: unknown) {
			logger.error('Error while invoking remote function %s', url);
			logger.error(error);
			return Promise.reject({
				status: HookStatus.ERROR,
				message:
					(error instanceof Error && error.message) || `Unable to invoke remote function ${url}`,
			});
		}
	};
}

/**
 * Get local module hook function wrapped in utilities to handle timeouts, errors, and blocking state.
 * @param mod Module.
 * @param functionName Function name.
 * @param metaConfig Meta configuration.
 */
export async function getWrappedLocalModuleHookFunction(
	mod: Module,
	functionName: string,
	metaConfig: MetaConfig,
): Promise<HookFunction> {
	const { logger, blocking } = metaConfig;
	const exportName = functionName || 'default';
	let composerFn: HookFunction | null = null;
	try {
		composerFn = (mod[exportName] ||
			(mod.default && mod.default[exportName]) ||
			mod.default ||
			mod) as HookFunction;
	} catch (error: unknown) {
		logger.error('Error while invoking local module function %s', composerFn);
		logger.error(error);
		return Promise.reject({
			status: HookStatus.ERROR,
			message:
				(error instanceof Error && error.message) ||
				`Unable to invoke local module function ${composerFn}`,
		});
	}
	return (data: HookFunctionPayload | SourceHookFunctionPayload) => {
		return new Promise<HookResponse>((resolve, reject: (reason?: HookResponse) => void) => {
			try {
				if (!composerFn) {
					reject({
						status: HookStatus.ERROR,
						message: `Unable to invoke local function ${composerFn}`,
					});
				}
				logger.debug('Invoking local module function %o', composerFn);
				const result = composerFn(data);
				if (blocking) {
					if (result instanceof Promise) {
						timedPromise(result, 30000)
							.then((res: HookResponse) => {
								if (res.status.toUpperCase() === HookStatus.SUCCESS) {
									resolve(res);
								} else {
									reject(res);
								}
							})
							.catch((error: unknown) => {
								logger.error('Error while invoking local module function %o', composerFn);
								logger.error(error);
								reject({
									status: HookStatus.ERROR,
									message:
										(error instanceof Error && error.message) ||
										`Error while invoking local module function ${composerFn}`,
								});
							});
					} else {
						if (result.status.toUpperCase() === HookStatus.SUCCESS) {
							resolve(result);
						} else {
							reject(result);
						}
					}
				} else {
					resolve({
						status: HookStatus.SUCCESS,
						message: 'Local module function invoked successfully',
					});
				}
			} catch (error: unknown) {
				logger.error('Error while invoking local module function %o', composerFn);
				logger.error(error);
				reject({
					status: HookStatus.ERROR,
					message:
						(error instanceof Error && error.message) ||
						`Error while invoking local module function ${composerFn}`,
				});
			}
		});
	};
}

/**
 * Get local module hook function wrapped in utilities to handle timeouts, errors, and blocking state.
 * @param composerFnPath Composer function path/function name delimited with `#`. Example: `./hooks.js#example`.
 * @param metaConfig Meta configuration.
 */
export async function getWrappedLocalHookFunction(
	composerFnPath: string,
	metaConfig: MetaConfig,
): Promise<HookFunction> {
	const { baseDir, logger, importFn, blocking } = metaConfig;
	let composerFn: HookFunction | null = null;
	try {
		composerFn = (await loadFromModuleExportExpression(composerFnPath, {
			cwd: baseDir,
			defaultExportName: 'default',
			importFn,
		})) as unknown as HookFunction;
	} catch (error: unknown) {
		logger.error('error while invoking local function %s', composerFnPath);
		logger.error(error);
		return Promise.reject({
			status: HookStatus.ERROR,
			message:
				(error instanceof Error && error.message) ||
				`Unable to invoke local function ${composerFnPath}`,
		});
	}
	return (data: HookFunctionPayload | SourceHookFunctionPayload) => {
		return new Promise<HookResponse>((resolve, reject: (reason?: HookResponse) => void) => {
			try {
				if (!composerFn) {
					reject({
						status: HookStatus.ERROR,
						message: `Unable to invoke local function ${composerFnPath}`,
					});
				}
				logger.debug('Invoking local function %o', composerFn);
				const result = composerFn(data);
				if (blocking) {
					if (result instanceof Promise) {
						timedPromise(result, 30000)
							.then((res: HookResponse) => {
								if (res.status.toUpperCase() === HookStatus.SUCCESS) {
									resolve(res);
								} else {
									reject(res);
								}
							})
							.catch((error: Error) => {
								logger.error('error while invoking local function %o', composerFn);
								logger.error(error);
								reject({
									status: HookStatus.ERROR,
									message: error.message || `Error while invoking local function ${composerFn}`,
								});
							});
					} else {
						if (result.status.toUpperCase() === HookStatus.SUCCESS) {
							resolve(result);
						} else {
							reject(result);
						}
					}
				} else {
					resolve({
						status: HookStatus.SUCCESS,
						message: 'Local function invoked successfully',
					});
				}
			} catch (error: unknown) {
				logger.error('Error while invoking local function %o', composerFn);
				logger.error(error);
				reject({
					status: HookStatus.ERROR,
					message:
						(error instanceof Error && error.message) ||
						`Error while invoking local function ${composerFn}`,
				});
			}
		});
	};
}

export function isRemoteFn(composer: string): boolean {
	const urlRegex =
		/^(https:\/\/)([\w-?%$-.+!*'(),&=]+\.)+[\w-]+[.a-zA-Z]+(\/[\/a-zA-Z0-9-?_%$-.+!*'(),&=]*)?$/;
	return urlRegex.test(composer);
}

export function isModuleFn(beforeAll: { module?: unknown; fn?: string }): boolean {
	return !!(beforeAll.module && beforeAll.fn);
}
