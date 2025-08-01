import type { YogaLogger } from 'graphql-yoga';
import { GraphQLError } from 'graphql/error';
import { type HookConfig, HookFunctionPayload, MemoizedFns, PluginHooksErrorCode } from '../types';
import {
	HookLifecycleEvent,
	HookLifecycleInvokeHooksParams,
	HookLifecycleRegistry,
} from './hookLifecycleRegistry';

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
	 * Gets the type of hook.
	 * @protected
	 */
	protected getType() {
		return this.type;
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
	public abstract getWrappedHookFunction(): WrappedHookFunction;

	/**
	 * Adds the hook to the hook lifecycle registry.
	 * @param hookLifecycleRegistry The registry to which the hook should be added.
	 */
	public addToHookLifecycleRegistry(hookLifecycleRegistry: HookLifecycleRegistry): void {
		hookLifecycleRegistry.addHookToRegistry(HookLifecycleEvent.ON_EXECUTE, this);
	}

	/**
	 * Invoke the wrapped hook function with parameters associated with the lifecycle event
	 * @param params Hook lifecycle parameters that include the context and payload
	 */
	public async invoke(params: HookLifecycleInvokeHooksParams) {
		this.getBuildConfig().logger.info('Invoking hook %s', this.getType());
		if (!this.wrappedHookFunction) {
			this.getBuildConfig().logger.info('Memoize hook %s', this.getType());
			this.wrappedHookFunction = this.getWrappedHookFunction();
		}
		return await this.wrappedHookFunction(params);
	}

	/**
	 * Handles errors thrown during hook execution with consistent error processing
	 * @param err The unknown error that was caught
	 * @throws {Error} Always throws a standardized Error
	 */
	public normalizeError(err: unknown): GraphQLError {
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
