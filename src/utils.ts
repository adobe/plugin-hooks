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
import { HookFunction, HookStatus, Module, ResponseBody } from './types';

export interface MetaConfig {
	logger: YogaLogger;
	blocking: boolean;
	baseDir: string;
	importFn: ImportFn;
}

export async function importFn(modulePath: string) {
	return Promise.resolve(import(modulePath)).then(module => module);
}

export async function timedPromise<T>(promise: Promise<T>): Promise<T> {
	try {
		const { promise: newPromise, cancel } = makeCancellablePromise(promise);
		return Timeout.wrap(newPromise, 30000, 'Timeout').catch((err: Error) => {
			if (err.message === 'Timeout') {
				cancel();
			}
			return Promise.reject(err);
		});
	} catch (err) {
		return Promise.reject(err);
	}
}

export function parseResponseBody(rawBody: string, isOk: boolean): ResponseBody {
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
				message: rawBody || 'Unable to parse remove function response',
			};
		}
	}
}

export async function invokeRemoteFunction(
	url: string,
	metaConfig: MetaConfig,
): Promise<HookFunction> {
	return async (data: unknown): Promise<ResponseBody> => {
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
			return new Promise<ResponseBody>(async (resolve, reject: (reason?: ResponseBody) => void) => {
				const response$ = fetch(url, requestOptions);
				if (blocking) {
					const response = await response$;
					const rawBody = await response.text();
					const body = parseResponseBody(rawBody, response.ok);
					if (body.status.toUpperCase() === 'SUCCESS') {
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

export async function invokeLocalModuleFunction(
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
		logger.error('error while invoking local function %s', composerFn);
		logger.error(error);
		return Promise.reject({
			status: HookStatus.ERROR,
			message:
				(error instanceof Error && error.message) ||
				`Unable to invoke local module function ${composerFn}`,
		});
	}
	return (data: unknown) => {
		return new Promise<ResponseBody>((resolve, reject: (reason?: ResponseBody) => void) => {
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
						timedPromise(result)
							.then((res: ResponseBody) => {
								if (res.status.toUpperCase() === 'SUCCESS') {
									resolve(res);
								} else {
									reject(res);
								}
							})
							.catch((error: unknown) => {
								logger.error('error while invoking local module function %o', composerFn);
								logger.error(error);
								reject({
									status: HookStatus.ERROR,
									message:
										(error instanceof Error && error.message) ||
										`Error while invoking local module function ${composerFn}`,
								});
							});
					} else {
						if (result.status.toUpperCase() === 'SUCCESS') {
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

export async function invokeLocalFunction(
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
	return (data: unknown) => {
		return new Promise<ResponseBody>((resolve, reject: (reason?: ResponseBody) => void) => {
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
						timedPromise(result)
							.then((res: ResponseBody) => {
								if (res.status.toUpperCase() === 'SUCCESS') {
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
						if (result.status.toUpperCase() === 'SUCCESS') {
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
