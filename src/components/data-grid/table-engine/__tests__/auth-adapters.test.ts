// src/components/data-grid/table-engine/__tests__/auth-adapters.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BearerAuthAdapter } from "../adapters/bearer-auth-adapter";
import { NoAuthAdapter } from "../adapters/no-auth-adapter";
import { WAFDataAuthAdapter } from "../adapters/wafdata-auth-adapter";

vi.mock("@/services", () => ({
	httpClient: { execute: vi.fn() },
}));

import { httpClient } from "@/services";

const mockExecute = vi.mocked(httpClient.execute);
const okResponse = {
	data: {},
	status: 200,
	statusText: "OK",
	headers: {},
	time: 0,
	size: 0,
};

describe("WAFDataAuthAdapter", () => {
	beforeEach(() => mockExecute.mockReset());

	it('name is "wafdata"', () => {
		expect(new WAFDataAuthAdapter().name).toBe("wafdata");
	});

	it("calls httpClient.execute with positional (method, url, opts)", async () => {
		mockExecute.mockResolvedValue(okResponse);
		await new WAFDataAuthAdapter().request({ url: "/api/test", method: "GET" });
		expect(mockExecute).toHaveBeenCalledWith(
			"GET",
			"/api/test",
			expect.any(Object),
		);
	});

	it("maps queryParams to opts.params", async () => {
		mockExecute.mockResolvedValue(okResponse);
		await new WAFDataAuthAdapter().request({
			url: "/api",
			method: "GET",
			queryParams: { $mask: "Default" },
		});
		expect(mockExecute).toHaveBeenCalledWith(
			"GET",
			"/api",
			expect.objectContaining({ params: { $mask: "Default" } }),
		);
	});

	it("maps body to opts.data and serializes to JSON", async () => {
		mockExecute.mockResolvedValue(okResponse);
		await new WAFDataAuthAdapter().request({
			url: "/api",
			method: "POST",
			body: { key: "val" },
		});
		expect(mockExecute).toHaveBeenCalledWith(
			"POST",
			"/api",
			expect.objectContaining({
				data: '{"key":"val"}',
				headers: expect.objectContaining({
					"Content-Type": "application/json",
				}),
			}),
		);
	});
});

describe("BearerAuthAdapter", () => {
	beforeEach(() => mockExecute.mockReset());

	it('name is "bearer"', () => {
		expect(new BearerAuthAdapter("tok").name).toBe("bearer");
	});

	it("injects Authorization: Bearer <token> header", async () => {
		mockExecute.mockResolvedValue(okResponse);
		await new BearerAuthAdapter("mytoken").request({
			url: "/x",
			method: "GET",
		});
		expect(mockExecute).toHaveBeenCalledWith(
			"GET",
			"/x",
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: "Bearer mytoken" }),
			}),
		);
	});

	it("preserves caller-supplied headers alongside Authorization", async () => {
		mockExecute.mockResolvedValue(okResponse);
		await new BearerAuthAdapter("tok").request({
			url: "/x",
			method: "GET",
			headers: { "X-Custom": "yes" },
		});
		expect(mockExecute).toHaveBeenCalledWith(
			"GET",
			"/x",
			expect.objectContaining({
				headers: expect.objectContaining({
					"X-Custom": "yes",
					Authorization: "Bearer tok",
				}),
			}),
		);
	});
});

describe("NoAuthAdapter", () => {
	beforeEach(() => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: "OK",
			headers: {
				forEach: (cb: (v: string, k: string) => void) =>
					cb("application/json", "content-type"),
			},
			json: () => Promise.resolve({ result: "ok" }),
		} as unknown as Response);
	});

	it('name is "none"', () => {
		expect(new NoAuthAdapter().name).toBe("none");
	});

	it("calls fetch and returns ServiceResponse-shaped result", async () => {
		const result = await new NoAuthAdapter().request({
			url: "/open",
			method: "GET",
		});
		expect(result.status).toBe(200);
		expect(result.data).toEqual({ result: "ok" });
	});

	it("appends queryParams to URL", async () => {
		await new NoAuthAdapter().request({
			url: "http://localhost/open",
			method: "GET",
			queryParams: { foo: "bar" },
		});
		const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
			.calls[0][0] as string;
		expect(calledUrl).toContain("foo=bar");
	});
});
