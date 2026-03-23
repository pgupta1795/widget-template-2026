// src/components/data-grid/table-engine/adapters/no-auth-adapter.ts

import type { AuthRequestOptions } from "../types/api.types";
import type { IAuthAdapter, ServiceResponse } from "../types/auth.types";

export class NoAuthAdapter implements IAuthAdapter {
	readonly name = "none";

	async request<TResponse>(
		options: AuthRequestOptions,
	): Promise<ServiceResponse<TResponse>> {
		const url = new URL(
			options.url,
			typeof globalThis !== "undefined" && "location" in globalThis
				? (globalThis as unknown as Window).location.origin
				: "http://localhost",
		);
		if (options.queryParams) {
			for (const [k, v] of Object.entries(options.queryParams)) {
				url.searchParams.set(k, v);
			}
		}

		const start = Date.now();
		const res = await fetch(url.toString(), {
			method: options.method,
			headers: options.headers,
			body: options.body != null ? JSON.stringify(options.body) : undefined,
		});

		const data = (await res.json()) as TResponse;
		const headers: Record<string, string> = {};
		res.headers.forEach((v, k) => {
			headers[k] = v;
		});
		const text = JSON.stringify(data);

		return {
			data,
			status: res.status,
			statusText: res.statusText,
			headers,
			time: Date.now() - start,
			size: new TextEncoder().encode(text).length,
		};
	}
}
