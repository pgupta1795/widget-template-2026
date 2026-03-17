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

// module DS/WAFData/WAFData

// Provides access to the 3DEXPERIENCE Platform and external services.

// Methods

// (static) authenticatedRequest(url, options) → {Object}

//     Perform an HTTP (Ajax) request using DS Passport authentication. It must be used for services of the 3DEXPERIENCE.
//     Parameters:
//     Name 	Type 	Description

//     url
//     	String

//     A string containing the URL to which the request is sent.

//     options
//     	Object

//     A set of key/value pairs that configure the request. All settings are optional but most of the time, you would like to specify at least the success and failure callbacks.
//     Properties
//     Name 	Type 	Attributes 	Default 	Description

//     method
//     	String

//     <optional>

//     "GET"

//     The HTTP method to use for the request (e.g. "POST", "GET", "PUT", "OPTIONS", "PATCH", ...). Defaults to "GET".

//     onComplete
//     	function

//     <optional>

//     A function to be called when the request is completed. It receives the following arguments : 1) The successful backend response as a DOMString, JSON plain Object, ArrayBuffer, Blob, or Document (depending on what was set for responseType.) 2) A plain Object containing the response headers as key/value pairs.

//     onFailure
//     	function

//     <optional>

//     A function to be called if the request fails. It receives the following arguments : 1) An instance of Error object. 2) The failure backend response as a DOMString, JSON plain Object, ArrayBuffer, Blob, or Document (depending on what was set for responseType.) 3) A plain Object containing the response headers as key/value pairs.

//     onPassportError
//     	function

//     <optional>

//     A function to be called if the request fails due to a Passport-related error. Bypasses the global passport error handler. If receives the following arguments : 1) An instance of Error object. 2) Optionally, an URL where the user can authenticate.

//     onTimeout
//     	function

//     <optional>

//     A function to be called if the request times out

//     onProgress
//     	function

//     <optional>

//     Callback to monitor the progression of the request. Receives a progress event : https://xhr.spec.whatwg.org/#progressevent

//     onUploadProgress
//     	function

//     <optional>

//     Callback to monitor the progression of an upload transfer. Simply use onProgress for download transfers. Receives a progress event : https://xhr.spec.whatwg.org/#progressevent

//     async
//     	boolean

//     <optional>

//     true

//     By default, all requests are sent asynchronously (i.e. this is set to true by default). If you need synchronous requests, set this option to false. Cross-domain requests do not support synchronous operation. Note that synchronous requests may temporarily lock the browser, disabling any actions while the request is active. Note that synchronous requests on the main thread have been deprecated due to their negative effect on the user experience.

//     data
//     	Void

//     <optional>

//     Data to add to the request, that will be sent to the server. Can be of type arrayBufferView, Blob, document, string, FormData. Please see https://xhr.spec.whatwg.org/ It is converted to a query string, if not already a string. It's appended to the URL for GET-requests.

//     type
//     	String

//     <optional>

//     Helper to set responseType ("json", "text", "arraybuffer", "blob" or "document") but also the Accept header accordingly for 'xml' and 'json' cases.

//     responseType
//     	String

//     <optional>

//     Tells the clients (browser, ...) what format we want for the response data returned to onComplete callback. Can be "json", "text", "arraybuffer", "blob" or "document". Setting options.responseType = '' (or omitting) will default the response's type to be "text". Please use options.type instead of options.responseType if you want necessary headers to be added automatically.

//     headers
//     	Object

//     <optional>

//     {'X-Requested-With':'XMLHttpRequest'}

//     An object of additional header key/value pairs to send along with requests using the XMLHttpRequest transport. The header X-Requested-With: XMLHttpRequest is always added, but its default XMLHttpRequest value can be changed here.

//     timeout
//     	Integer

//     <optional>

//     25000

//     Timeout for the request in milliseconds. Providing a non-zero value will cause fetching to terminate after the given time has passed. When set to zero, there is no timeout. The default value is 25 seconds.

//     cache
//     	Number

//     <optional>

//     Seconds of proxy caching. Negative values by-pass browser cache (both for proxyfied and CORS requests).

//     Returns:

//     An object that contains a cancel method, allowing to cancel the request (if it is asynchronous) and the request XHR object itself trough the xhr property.

//     Type
//         Object

// (static) proxifiedRequest(url, options) → {Object}

//     Perform an HTTP (Ajax) request proxied through 3DDashboard's .
//     Parameters:
//     Name 	Type 	Description

//     url
//     	String

//     A string containing the URL to which the request is sent.

//     options
//     	Object

//     A set of key/value pairs that configure the request. All settings are optional but most of the time, you would like to specify at least the success and failure callbacks.
//     Properties
//     Name 	Type 	Attributes 	Default 	Description

//     method
//     	String

//     <optional>

//     "GET"

//     The HTTP method to use for the request (e.g. "POST", "GET", "PUT", "OPTIONS", "PATCH", ...). Defaults to "GET".

//     onComplete
//     	function

//     <optional>

//     A function to be called when the request is completed. It receives the following arguments : 1) The successful backend response as a DOMString, JSON plain Object, ArrayBuffer, Blob, or Document (depending on what was set for responseType.) 2) A plain Object containing the response headers as key/value pairs.

//     onFailure
//     	function

//     <optional>

//     A function to be called if the request fails. It receives the following arguments : 1) An instance of Error object. 2) A response created by the proxification API. Its format is json if responseType is JSON otherwise it is always text. See the CAA Encyclopedia technical article "Web and Widget Apps Javascript | Widget and HTTP Request | WAFData and onFailure Callback" for more details. 3) A plain Object containing the response headers as key/value pairs.

//     onPassportError
//     	function

//     <optional>

//     A function to be called if the request fails due to a Passport-related error. Bypasses the global passport error handler. If receives the following arguments : 1) An instance of Error object. 2) Optionally, an URL where the user can authenticate.

//     onTimeout
//     	function

//     <optional>

//     A function to be called if the request times out

//     async
//     	boolean

//     <optional>

//     true

//     By default, all requests are sent asynchronously (i.e. this is set to true by default). If you need synchronous requests, set this option to false. Cross-domain requests do not support synchronous operation. Note that synchronous requests may temporarily lock the browser, disabling any actions while the request is active. Note that synchronous requests on the main thread have been deprecated due to their negative effect on the user experience.

//     data
//     	Void

//     <optional>

//     Data to add to the request, that will be sent to the server. Can be of type arrayBufferView, Blob, document, string, FormData. Please see https://xhr.spec.whatwg.org/ It is converted to a query string, if not already a string. It's appended to the URL for GET-requests.

//     type
//     	String

//     <optional>

//     text

//     Tells the client (browser, ...) what format we want for the response data returned to onComplete callback. Can be "json", "text", "arraybuffer", "blob" or "document". Setting options.type = '' (or omitting) will default the response's type to be "text".

//     headers
//     	Object

//     <optional>

//     {'X-Requested-With':'XMLHttpRequest'}

//     An object of additional header key/value pairs to send along with requests using the XMLHttpRequest transport. The header X-Requested-With: XMLHttpRequest is always added, but its default XMLHttpRequest value can be changed here.

//     timeout
//     	Integer

//     <optional>

//     25000

//     Timeout for the request in milliseconds. Providing a non-zero value will cause fetching to terminate after the given time has passed. When set to zero, there is no timeout. The default value is 25 seconds, which is also the maximum timeout value allowed by the 3DDashboard's proxy.

//     proxy
//     	String

//     <optional>

//     'ajax'

//     The proxy to be used : can be 'passport', 'ajax', 'feed', 'xml', 'soap'.

//     cache
//     	Number

//     <optional>

//     Seconds of proxy caching. Negative values by-pass browser cache.

//     Returns:

//     An object that contains a cancel method, allowing to cancel the request (if it is asynchronous) and the request XHR object itself trough the xhr property.
