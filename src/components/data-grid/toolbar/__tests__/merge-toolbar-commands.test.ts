// src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts
import { describe, expect, it } from "vitest";
import { mergeToolbarCommands } from "../merge-toolbar-commands";
import type { SerializableToolbarCommand } from "../toolbar.types";

const cmd = (id: string, label = id): SerializableToolbarCommand => ({
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
		expect((result[0] as any).label).toBe("replaced");
		expect(result[1].id).toBe("b");
	});

	it("full replacement — no partial field merge from base", () => {
		const base: SerializableToolbarCommand[] = [
			{
				id: "a",
				type: "command",
				enabled: true,
				label: "base",
				className: "base-class",
			},
		];
		const overrides: SerializableToolbarCommand[] = [
			{ id: "a", type: "command", enabled: false },
		];
		const result = mergeToolbarCommands(base, overrides);
		// Override object wins entirely — label and className from base are NOT preserved
		expect((result[0] as any).label).toBeUndefined();
		expect((result[0] as any).className).toBeUndefined();
		expect(result[0].enabled).toBe(false);
	});

	it("full replacement with minimal override — only id and type in override", () => {
		const base: SerializableToolbarCommand[] = [
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
		const overrides: SerializableToolbarCommand[] = [
			{ id: "search", type: "search" },
		];
		const result = mergeToolbarCommands(base, overrides);
		// All base fields except id/type are gone — the override object is used wholesale
		expect((result[0] as any).enabled).toBeUndefined();
		expect((result[0] as any).label).toBeUndefined();
		expect((result[0] as any).placeholder).toBeUndefined();
		expect((result[0] as any).debounceMs).toBeUndefined();
		expect((result[0] as any).inputClassName).toBeUndefined();
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
		expect((result[0] as any).label).toBe("Custom Search");
		expect(result[1].id).toBe("export");
		expect(result[2].id).toBe("my-btn");
	});

	it("appended overrides maintain their relative order", () => {
		const base = [cmd("a")];
		const overrides = [cmd("z"), cmd("m"), cmd("b")];
		const result = mergeToolbarCommands(base, overrides);
		expect(result.map((c) => c.id)).toEqual(["a", "z", "m", "b"]);
	});

	it("merges SerializableToolbarCommand base with consumer overrides (mixed types)", () => {
		const base: SerializableToolbarCommand[] = [
			{
				id: "refresh",
				type: "command",
				label: "Refresh",
				action: "api-refresh",
			},
			{ id: "search", type: "search", placeholder: "Search..." },
			{ id: "spacer-1", type: "spacer" },
		];

		const consumer: SerializableToolbarCommand[] = [
			{
				id: "refresh",
				type: "command",
				label: "Custom Refresh",
				action: "api-custom-refresh",
			},
			{ id: "delete", type: "command", label: "Delete" },
		];

		const result = mergeToolbarCommands(base, consumer);

		expect(result).toHaveLength(4); // refresh (override), search, spacer-1, delete
		expect(result[0]).toEqual(consumer[0]); // 'refresh' from consumer (wins)
		expect(result[1]).toEqual(base[1]); // 'search' unchanged
		expect(result[2]).toEqual(base[2]); // 'spacer-1' unchanged
		expect(result[3]).toEqual(consumer[1]); // 'delete' appended
		expect(result.find((c) => c.id === "delete")).toEqual(consumer[1]); // 'delete' added
	});
});
