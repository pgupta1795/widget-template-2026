import { logger } from "@/lib/logger";
import { getModule } from "@/lib/modules/registry";
import { getWidget } from "@/lib/widget/api";
import type { I3DXCompassServices, WAFData } from "@/lib/widget/types";
import type { EndpointDefinition } from "@/types/config";

let spaceUrlCache: string | null = null;

export async function get3DSpaceUrl(): Promise<string> {
	if (spaceUrlCache) return spaceUrlCache;
	const compassServices = getModule<I3DXCompassServices>("compass-services");
	const widget = getWidget();
	const tenant = widget.getValue("tenant") || "OnPremise";

	return new Promise((resolve, reject) => {
		(compassServices as any).getPlatformServices({
			tenant,
			onComplete: (data: any) => {
				const services = Array.isArray(data) ? data[0] : data;
				const url = services["3DSpace"];
				if (url) {
					spaceUrlCache = url;
					resolve(url);
				} else {
					reject(new Error("3DSpace service URL not found"));
				}
			},
			onFailure: reject,
		});
	});
}

let csrfCache: { token: string; timestamp: number } | null = null;
const CSRF_TTL = 5 * 60 * 1000;

export async function getCsrfToken(): Promise<string> {
	if (csrfCache && Date.now() - csrfCache.timestamp < CSRF_TTL) {
		return csrfCache.token;
	}

	const spaceUrl = await get3DSpaceUrl();
	const wafData = getModule<WAFData>("waf-data");

	return new Promise((resolve, reject) => {
		(wafData as any).authenticatedRequest(
			`${spaceUrl}/resources/v1/application/CSRF`,
			{
				method: "GET",
				onComplete: (data: string) => {
					try {
						const response = JSON.parse(data);
						const token = response.csrf.value;
						csrfCache = { token, timestamp: Date.now() };
						resolve(token);
					} catch {
						reject(new Error("Failed to parse CSRF response"));
					}
				},
				onFailure: reject,
			},
		);
	});
}

function interpolateUrl(url: string, params: Record<string, string>): string {
	return url.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? "");
}

function interpolatePayload(
	payload: unknown,
	params: Record<string, string>,
): unknown {
	if (typeof payload === "string") {
		return payload.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? "");
	}
	if (Array.isArray(payload)) {
		return payload.map((item) => interpolatePayload(item, params));
	}
	if (payload && typeof payload === "object") {
		return Object.fromEntries(
			Object.entries(payload).map(([k, v]) => [
				k,
				interpolatePayload(v, params),
			]),
		);
	}
	return payload;
}

export type RequestOptions = {
	params?: Record<string, string>;
	body?: Record<string, unknown>;
	signal?: AbortSignal;
};

export async function executeEndpoint(
	endpoint: EndpointDefinition,
	options: RequestOptions = {},
): Promise<unknown> {
	const spaceUrl = await get3DSpaceUrl();
	const wafData = getModule<WAFData>("waf-data");
	const params = options.params ?? {};
	const url = `${spaceUrl}${interpolateUrl(endpoint.url, params)}`;

	const requestOptions: Record<string, unknown> = {
		method: endpoint.method,
		type: "json",
	};

	if (endpoint.requiresCsrf) {
		const token = await getCsrfToken();
		requestOptions.headers = {
			...endpoint.headers,
			ENO_CSRF_TOKEN: token,
		};
	} else if (endpoint.headers) {
		requestOptions.headers = endpoint.headers;
	}

	if (endpoint.method !== "GET") {
		const payload = options.body ?? endpoint.payload;
		if (payload) {
			requestOptions.data = JSON.stringify(interpolatePayload(payload, params));
			requestOptions.headers = {
				...(requestOptions.headers as Record<string, string> | undefined),
				"Content-Type": "application/json",
			};
		}
	}

	logger.debug(`API ${endpoint.method} ${url}`, requestOptions);

	return new Promise((resolve, reject) => {
		(wafData as any).authenticatedRequest(url, {
			...requestOptions,
			onComplete: (data: string) => {
				try {
					resolve(typeof data === "string" ? JSON.parse(data) : data);
				} catch {
					resolve(data);
				}
			},
			onFailure: (err: unknown) => {
				logger.error(`API call failed: ${endpoint.id}`, err);
				reject(err);
			},
		});
	});
}
