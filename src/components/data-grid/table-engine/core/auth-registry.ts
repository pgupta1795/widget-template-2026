import type { IAuthAdapter } from "../types/auth.types";
import { DAGValidationError } from "./dag-validator";

export class AuthAdapterRegistry {
	private readonly map = new Map<string, IAuthAdapter>();

	register(id: string, adapter: IAuthAdapter): this {
		this.map.set(id, adapter);
		return this;
	}

	resolve(id: string): IAuthAdapter {
		const adapter = this.map.get(id);
		if (!adapter) {
			throw new DAGValidationError(
				`No auth adapter registered for id: "${id}"`,
			);
		}
		return adapter;
	}

	ids(): Set<string> {
		return new Set(this.map.keys());
	}
}
