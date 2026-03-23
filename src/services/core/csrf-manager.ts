import { getPlatformURL } from "@/services/core/platform-resolver";
import { wafAuthenticatedRequest } from "@/services/core/waf-transport";
import type { CsrfToken } from "@/services/types";

const CSRF_PATH = "/resources/v1/application/CSRF";

let cached: CsrfToken | null = null;
let pending: Promise<CsrfToken> | null = null;

export function resetCsrfManager(): void {
	cached = null;
	pending = null;
}

export function invalidate(): void {
	cached = null;
	// Do not clear `pending` — if a fetch is in-flight, let it complete
}

export function getToken(): Promise<CsrfToken> {
	if (cached) return Promise.resolve(cached);
	if (pending) return pending;

	pending = (async () => {
		const spaceUrl = await getPlatformURL("3DSpace");

		const response = await wafAuthenticatedRequest<{ csrf: CsrfToken }>(
			`${spaceUrl}${CSRF_PATH}`,
			{ type: "json" },
		);

		cached = response.data.csrf;
		pending = null;
		return cached;
	})().catch((err) => {
		pending = null;
		throw err;
	});

	return pending;
}
