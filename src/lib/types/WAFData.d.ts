// -----------------------------------------------------
// DS/WAFData/WAFData
// Docs: module-DS_WAFData_WAFData
// -----------------------------------------------------

export type WAFDataResponseType =
	| "json"
	| "text"
	| "arraybuffer"
	| "blob"
	| "document";

export interface WAFDataProgressEvent extends ProgressEvent<EventTarget> {}

export interface WAFDataRequestHandle {
	/** Abort the request (if asynchronous). */
	cancel(): void;
	/** Underlying XHR object. */
	xhr: XMLHttpRequest;
}

/** Common options for authenticatedRequest / proxifiedRequest. */
export interface WAFDataBaseRequestOptions<
	TResponse = unknown,
	TError = Error,
> {
	method?: string;
	onComplete?(response: TResponse, headers: Record<string, string>): void;
	onFailure?(
		error: TError,
		response: TResponse | undefined,
		headers: Record<string, string>,
	): void;
	onPassportError?(error: Error, authenticationUrl?: string): void;
	onTimeout?(): void;
	onProgress?(event: WAFDataProgressEvent): void;
	onUploadProgress?(event: WAFDataProgressEvent): void;
	async?: boolean;
	data?: ArrayBufferView | Blob | Document | string | FormData;
	/**
	 * Helper for setting responseType and Accept header.
	 * For WAFData.authenticatedRequest, sets responseType and Accept; for
	 * proxifiedRequest it is the primary selector.
	 */
	type?: WAFDataResponseType | "xml";
	/** Raw responseType override (prefer `type` when possible). */
	responseType?: WAFDataResponseType;
	headers?: Record<string, string>;
	timeout?: number;
	/** Seconds of proxy caching; negative to bypass browser cache. */
	cache?: number;
}

export interface WAFDataAuthenticatedRequestOptions<
	TResponse = unknown,
	TError = Error,
> extends WAFDataBaseRequestOptions<TResponse, TError> {}

export interface WAFDataProxifiedRequestOptions<
	TResponse = unknown,
	TError = Error,
> extends WAFDataBaseRequestOptions<TResponse, TError> {
	/** For proxifiedRequest: 'passport' | 'ajax' | 'feed' | 'xml' | 'soap'. */
	proxy?: "passport" | "ajax" | "feed" | "xml" | "soap" | string;
}

export interface WAFData {
	authenticatedRequest<TResponse = unknown, TError = Error>(
		url: string,
		options: WAFDataAuthenticatedRequestOptions<TResponse, TError>,
	): WAFDataRequestHandle;

	proxifiedRequest<TResponse = unknown, TError = Error>(
		url: string,
		options: WAFDataProxifiedRequestOptions<TResponse, TError>,
	): WAFDataRequestHandle;
}
