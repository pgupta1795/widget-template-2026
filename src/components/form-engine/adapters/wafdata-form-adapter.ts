// src/components/form-engine/adapters/wafdata-form-adapter.ts

import { httpClient } from "@/services";
import type { FormApiAdapter, FetchConfig, UpdateConfig } from "../types";

/**
 * Concrete FormApiAdapter backed by the WAFData httpClient.
 * Reuses the existing service layer — no new HTTP abstractions.
 */
export const wafdataFormAdapter: FormApiAdapter = {
	async fetchData(config: FetchConfig): Promise<Record<string, unknown>> {
		const response = await httpClient.get<Record<string, unknown>>(config.url, {
			params: config.params,
			headers: config.headers,
		});
		return response.data;
	},

	async updateField(config: UpdateConfig): Promise<unknown> {
		const response = await httpClient.execute(config.method, config.url, {
			data: JSON.stringify(config.body),
			headers: {
				"Content-Type": "application/json",
				...config.headers,
			},
		});
		return response.data;
	},

	async batchUpdate(fields: UpdateConfig[]): Promise<void> {
		await Promise.all(fields.map((f) => this.updateField(f)));
	},
};
