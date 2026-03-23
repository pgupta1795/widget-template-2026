// src/components/data-grid/table-engine/adapters/bearer-auth-adapter.ts

import type { RequestOptions } from "@/services";
import { httpClient } from "@/services";
import type { AuthRequestOptions } from "../types/api.types";
import type { IAuthAdapter, ServiceResponse } from "../types/auth.types";

export class BearerAuthAdapter implements IAuthAdapter {
	readonly name = "bearer";

	constructor(private readonly token: string) {}

	request<TResponse>(
		options: AuthRequestOptions,
	): Promise<ServiceResponse<TResponse>> {
		const opts: RequestOptions = {
			headers: {
				...options.headers,
				Authorization: `Bearer ${this.token}`,
			},
		};
		if (options.queryParams) opts.params = options.queryParams;
		if (options.body != null)
			opts.data = options.body as RequestOptions["data"];
		if (options.formData != null) opts.data = options.formData;
		if (options.responseType) opts.responseType = options.responseType;
		return httpClient.execute<TResponse>(options.method, options.url, opts);
	}
}
