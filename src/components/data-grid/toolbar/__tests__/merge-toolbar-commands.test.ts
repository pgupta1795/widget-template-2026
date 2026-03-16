// src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts
import { describe, expect, it } from "vitest";
import { mergeToolbarCommands } from "../merge-toolbar-commands";
import type { ToolbarCommand } from "../toolbar.types";

const cmd = (id: string, label = id): ToolbarCommand => ({
	id,
	type: "command",
	enabled: true,
	label,
});

describe("mergeToolbarCommands", () => {
	it("returns base unchanged when overrides is undefined", () => {
		const base = [cmd("a"), cmd("b")];
		const result = mergeToolbarCommands(base, undefined);
		expect(result).toEqual(base);
		expect(result).not.toBe(base); // returns a copy
	});

	it("returns base unchanged when overrides is empty", () => {
		const base = [cmd("a"), cmd("b")];
		const result = mergeToolbarCommands(base, []);
		expect(result).toEqual(base);
	});

	it("replaces a base entry entirely when ids match", () => {
		const base = [cmd("a", "original"), cmd("b")];
		const overrides = [cmd("a", "replaced")];
		const result = mergeToolbarCommands(base, overrides);
		expect(result).toHaveLength(2);
		expect(result[0].label).toBe("replaced");
		expect(result[1].id).toBe("b");
	});

	it("full replacement — no partial field merge from base", () => {
		const base: ToolbarCommand[] = [
			{
				id: "a",
				type: "command",
				enabled: true,
				label: "base",
				className: "base-class",
			},
		];
		const overrides: ToolbarCommand[] = [
			{ id: "a", type: "command", enabled: false },
		];
		const result = mergeToolbarCommands(base, overrides);
		// Override object wins entirely — label and className from base are NOT preserved
		expect(result[0].label).toBeUndefined();
		expect(result[0].className).toBeUndefined();
		expect(result[0].enabled).toBe(false);
	});

	it("full replacement with minimal override — only id and type in override", () => {
		const base: ToolbarCommand[] = [
			{
				id: "search",
				type: "search",
				enabled: true,
				label: "Search",
				placeholder: "old...",
				debounceMs: 500,
				inputClassName: "old-class",
			},
		];
		const overrides: ToolbarCommand[] = [{ id: "search", type: "search" }];
		const result = mergeToolbarCommands(base, overrides);
		// All base fields except id/type are gone — the override object is used wholesale
		expect(result[0].enabled).toBeUndefined();
		expect(result[0].label).toBeUndefined();
		expect(result[0].placeholder).toBeUndefined();
		expect(result[0].debounceMs).toBeUndefined();
		expect(result[0].inputClassName).toBeUndefined();
		expect(result[0].id).toBe("search");
		expect(result[0].type).toBe("search");
	});

	it("appends override entries whose id is not in base", () => {
		const base = [cmd("a"), cmd("b")];
		const overrides = [cmd("c"), cmd("d")];
		const result = mergeToolbarCommands(base, overrides);
		expect(result).toHaveLength(4);
		expect(result.map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
	});

	it("preserves base order for non-overridden entries", () => {
		const base = [cmd("z"), cmd("a"), cmd("m")];
		const result = mergeToolbarCommands(base, []);
		expect(result.map((c) => c.id)).toEqual(["z", "a", "m"]);
	});

	it("handles mixed replace + append in one call", () => {
		const base = [cmd("search"), cmd("export")];
		const overrides = [cmd("search", "Custom Search"), cmd("my-btn")];
		const result = mergeToolbarCommands(base, overrides);
		expect(result).toHaveLength(3);
		expect(result[0].label).toBe("Custom Search");
		expect(result[1].id).toBe("export");
		expect(result[2].id).toBe("my-btn");
	});

	it("appended overrides maintain their relative order", () => {
		const base = [cmd("a")];
		const overrides = [cmd("z"), cmd("m"), cmd("b")];
		const result = mergeToolbarCommands(base, overrides);
		expect(result.map((c) => c.id)).toEqual(["a", "z", "m", "b"]);
	});
});
