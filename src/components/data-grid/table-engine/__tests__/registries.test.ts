import { describe, expect, it, vi } from "vitest";

import { AuthAdapterRegistry } from "../core/auth-registry";
import { DAGValidationError } from "../core/dag-validator";
import type { INodeExecutor } from "../core/node-registry";
import { NodeRegistry } from "../core/node-registry";
import type { IAuthAdapter } from "../types/auth.types";

const fakeExecutor = { execute: vi.fn() } as unknown as INodeExecutor<"api">;
const fakeAdapter: IAuthAdapter = { name: "test", request: vi.fn() };

describe("NodeRegistry", () => {
	it("register then resolve returns the same executor", () => {
		const reg = new NodeRegistry();
		reg.register("api", fakeExecutor);
		expect(reg.resolve("api")).toBe(fakeExecutor);
	});

	it("resolve throws DAGValidationError for unregistered type", () => {
		expect(() => new NodeRegistry().resolve("api")).toThrow(DAGValidationError);
	});

	it("register returns this for fluent chaining", () => {
		const reg = new NodeRegistry();
		expect(reg.register("api", fakeExecutor)).toBe(reg);
	});

	it("overwriting a registered type replaces executor", () => {
		const reg = new NodeRegistry();
		const exec2 = { execute: vi.fn() } as unknown as INodeExecutor<"api">;
		reg.register("api", fakeExecutor).register("api", exec2);
		expect(reg.resolve("api")).toBe(exec2);
	});
});

describe("AuthAdapterRegistry", () => {
	it("register then resolve returns the same adapter", () => {
		const reg = new AuthAdapterRegistry();
		reg.register("test", fakeAdapter);
		expect(reg.resolve("test")).toBe(fakeAdapter);
	});

	it("resolve throws DAGValidationError for unknown id", () => {
		expect(() => new AuthAdapterRegistry().resolve("missing")).toThrow(
			DAGValidationError,
		);
	});

	it("register returns this for fluent chaining", () => {
		const reg = new AuthAdapterRegistry();
		expect(reg.register("test", fakeAdapter)).toBe(reg);
	});

	it("ids() returns a set of all registered adapter ids", () => {
		const reg = new AuthAdapterRegistry();
		reg.register("wafdata", fakeAdapter).register("none", fakeAdapter);
		expect(reg.ids()).toEqual(new Set(["wafdata", "none"]));
	});
});
