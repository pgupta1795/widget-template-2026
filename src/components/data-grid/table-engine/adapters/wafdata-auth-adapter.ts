// src/components/data-grid/table-engine/adapters/wafdata-auth-adapter.ts

import type { RequestOptions } from "@/services";
import { httpClient } from "@/services";
import type { AuthRequestOptions } from "../types/api.types";
import type { IAuthAdapter, ServiceResponse } from "../types/auth.types";

export class WAFDataAuthAdapter implements IAuthAdapter {
	readonly name = "wafdata";

	request<TResponse>(
		options: AuthRequestOptions,
	): Promise<ServiceResponse<TResponse>> {
		const opts: RequestOptions = {};
		if (options.headers) opts.headers = options.headers;
		if (options.queryParams) opts.params = options.queryParams;
		if (options.formData != null) {
			opts.data = options.formData;
		} else if (options.body != null) {
			// Serialize body to JSON and set Content-Type header
			const isObject =
				typeof options.body === "object" &&
				!(options.body instanceof Blob) &&
				!(options.body instanceof FormData) &&
				!(options.body instanceof ArrayBuffer);

			if (isObject) {
				opts.data = JSON.stringify(options.body);
				opts.headers = {
					"Content-Type": "application/json",
					...(options.headers ?? {}),
				};
			} else {
				opts.data = options.body as RequestOptions["data"];
			}
		}
		if (options.responseType) opts.responseType = options.responseType;
		return httpClient.execute<TResponse>(options.method, options.url, opts);
	}
}
