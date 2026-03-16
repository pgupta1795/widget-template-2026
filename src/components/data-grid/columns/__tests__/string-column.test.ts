import { describe, expect, it } from "vitest";
import { stringColumn } from "../string-column";

describe("stringColumn", () => {
	it("creates a basic string column", () => {
		const col = stringColumn({
			accessorKey: "name",
			header: "Name",
		});

		expect(col.accessorKey).toBe("name");
		expect(col.header).toBe("Name");
		expect(col.meta?.type).toBe("string");
	});

	it("includes renderType in meta when provided", () => {
		const col = stringColumn({
			accessorKey: "state",
			header: "State",
			meta: { renderType: "badge" },
		});

		expect(col.meta?.renderType).toBe("badge");
	});

	it("includes classNameCell in meta when provided", () => {
		const col = stringColumn({
			accessorKey: "name",
			header: "Name",
			meta: { classNameCell: "text-blue-600 font-bold" },
		});

		expect(col.meta?.classNameCell).toBe("text-blue-600 font-bold");
	});

	it("includes classNameHeader in meta when provided", () => {
		const col = stringColumn({
			accessorKey: "name",
			header: "Name",
			meta: { classNameHeader: "font-bold uppercase" },
		});

		expect(col.meta?.classNameHeader).toBe("font-bold uppercase");
	});

	it("includes both renderType and className in meta together", () => {
		const col = stringColumn({
			accessorKey: "state",
			header: "State",
			meta: {
				renderType: "badge",
				classNameCell: "text-sm",
				classNameHeader: "font-bold",
			},
		});

		expect(col.meta?.renderType).toBe("badge");
		expect(col.meta?.classNameCell).toBe("text-sm");
		expect(col.meta?.classNameHeader).toBe("font-bold");
	});
});
