// src/components/data-grid/toolbar/__tests__/toolbar-defaults.test.ts
import { describe, expect, it } from "vitest";
import {
	DEFAULT_SEARCH,
	DEFAULT_COLUMN_VISIBILITY,
	DEFAULT_DENSITY,
	DEFAULT_EXPAND_ALL,
	DEFAULT_REFRESH,
	DEFAULT_EXPORT,
	DEFAULT_ADD_ROW,
	TOOLBAR_DEFAULTS,
} from "../toolbar-defaults";

describe("toolbar defaults", () => {
	const allDefaults = [
		DEFAULT_SEARCH,
		DEFAULT_COLUMN_VISIBILITY,
		DEFAULT_DENSITY,
		DEFAULT_EXPAND_ALL,
		DEFAULT_REFRESH,
		DEFAULT_EXPORT,
		DEFAULT_ADD_ROW,
	];

	it("every default has enabled: false", () => {
		for (const cmd of allDefaults) {
			expect(cmd.enabled, `${cmd.id} should be disabled`).toBe(false);
		}
	});

	it("every default has a unique id", () => {
		const ids = allDefaults.map((c) => c.id);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});

	it("every default has a valid type", () => {
		const validTypes = ["command", "menu", "search", "spacer", "separator"];
		for (const cmd of allDefaults) {
			expect(validTypes, `${cmd.id} has invalid type`).toContain(cmd.type);
		}
	});

	it("DEFAULT_SEARCH is type search on the left", () => {
		expect(DEFAULT_SEARCH.type).toBe("search");
		expect(DEFAULT_SEARCH.align).toBe("left");
	});

	it("TOOLBAR_DEFAULTS contains all 7 named defaults + 1 spacer", () => {
		expect(TOOLBAR_DEFAULTS).toHaveLength(8);
		const ids = TOOLBAR_DEFAULTS.map((c) => c.id);
		expect(ids).toContain("search");
		expect(ids).toContain("spacer");
		expect(ids).toContain("columnVisibility");
		expect(ids).toContain("density");
		expect(ids).toContain("expandAll");
		expect(ids).toContain("refresh");
		expect(ids).toContain("export");
		expect(ids).toContain("addRow");
	});

	it("TOOLBAR_DEFAULTS spacer is enabled: false", () => {
		const spacer = TOOLBAR_DEFAULTS.find((c) => c.id === "spacer");
		expect(spacer?.enabled).toBe(false);
	});

	it("right-side defaults have align: right", () => {
		const rightIds = [
			"columnVisibility",
			"density",
			"refresh",
			"export",
			"addRow",
		];
		for (const id of rightIds) {
			const cmd = TOOLBAR_DEFAULTS.find((c) => c.id === id);
			expect(cmd?.align, `${id} should be right`).toBe("right");
		}
	});
});
