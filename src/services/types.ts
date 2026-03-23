import type { WAFDataBaseRequestOptions } from "@/lib/types/WAFData";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** WAFData options the pipeline owns — callers must not set these directly */
type ManagedByPipeline =
	| "onComplete"
	| "onFailure"
	| "onPassportError"
	| "onTimeout"
	| "method";

/**
 * Per-request options.
 * Extends WAFDataBaseRequestOptions so callers have access to all base WAFData
 * options (async, data, type, responseType, headers, timeout, cache,
 * onProgress, onUploadProgress) plus service-layer additions.
 */
export interface RequestOptions
	extends Omit<WAFDataBaseRequestOptions, ManagedByPipeline> {
	/** URL query parameters — merged into the URL before dispatch */
	params?: Record<string, string>;
	/** Caller-supplied CSRF token — skips auto-inject when provided */
	csrfOverride?: string;
	/** Force proxifiedRequest instead of authenticatedRequest */
	useProxy?: boolean;
	/** Proxy channel when useProxy is true. Maps to WAFData proxy option */
	proxyType?: "ajax" | "passport" | "feed" | "xml" | "soap";
	/** Per-request retry override */
	retry?: RetryConfig;
}

/** Global service configuration — set once at createHttpClient() */
export interface ServiceConfig {
	defaultTimeout?: number;
	retry?: RetryConfig;
	defaultHeaders?: Record<string, string>;
	/** Optional base URL override — if set, skips auto-resolving 3DSpace URL in the pipeline */
	baseUrl?: string;
}

export interface RetryConfig {
	maxAttempts: number;
	shouldRetry?: (error: ServiceError) => boolean;
	delayMs?: number;
}

export interface ServiceResponse<T = unknown> {
	data: T;
	status: number;
	statusText: string;
	headers: Record<string, string>;
	time: number; // ms
	size: number; // bytes
}

export interface CsrfToken {
	name: string;
	value: string;
}

export class ServiceError extends Error {
	constructor(
		public readonly status: number,
		public readonly statusText: string,
		public readonly response: unknown,
		public readonly headers: Record<string, string>,
	) {
		super(`${status} ${statusText}`);
		this.name = "ServiceError";
		// Restore prototype chain (needed for instanceof checks in transpiled code)
		Object.setPrototypeOf(this, new.target.prototype);
	}

	get isCsrfExpiry(): boolean {
		return this.status === 403;
	}
	get isUnauthorized(): boolean {
		return this.status === 401;
	}
	get isTimeout(): boolean {
		return this.status === 408;
	}
}
