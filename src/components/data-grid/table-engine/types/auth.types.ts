// src/components/data-grid/table-engine/types/auth.types.ts
import type { ServiceResponse } from "@/services";
import type { AuthRequestOptions } from "./api.types";

export interface IAuthAdapter {
	readonly name: string;
	/**
	 * TResponse is caller-asserted. Type correctness is the caller's responsibility;
	 * runtime shape is validated via responseTransform in ApiNode.
	 */
	request<TResponse>(
		options: AuthRequestOptions,
	): Promise<ServiceResponse<TResponse>>;
}

export type { ServiceResponse };
