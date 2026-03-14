import { describe, expect, it } from "vitest";
import { NodeContext } from "../core/node-context";
import { ColumnNodeExecutor } from "../nodes/column-node";
import type { ColumnNodeConfig } from "../types/table.types";

const executor = new ColumnNodeExecutor();
const ctx = new NodeContext();

describe("ColumnNodeExecutor", () => {
	it("maps a string ColumnDef to GridColumnDef", async () => {
		const config: ColumnNodeConfig = {
			columns: [{ field: "name", header: "Name", type: "string" }],
		};
		const result = await executor.execute(config, ctx, []);
		expect(result.columns).toHaveLength(1);
		// accessorKey or id should match the field
		const col = result.columns[0] as { accessorKey?: string; id?: string };
		expect(col.accessorKey ?? col.id).toBe("name");
	});

	it("maps a number ColumnDef to GridColumnDef", async () => {
		const config: ColumnNodeConfig = {
			columns: [{ field: "age", header: "Age", type: "number" }],
		};
		const result = await executor.execute(config, ctx, []);
		expect(result.columns).toHaveLength(1);
	});

	it("hidden column appears in visibility map with value false", async () => {
		const config: ColumnNodeConfig = {
			columns: [{ field: "secret", header: "Secret", hidden: true }],
		};
		const result = await executor.execute(config, ctx, []);
		expect(result.visibility["secret"]).toBe(false);
	});

	it("visible column is absent from visibility map", async () => {
		const config: ColumnNodeConfig = {
			columns: [{ field: "name", header: "Name" }],
		};
		const result = await executor.execute(config, ctx, []);
		expect("name" in result.visibility).toBe(false);
	});

	it("sortable:false sets enableSorting:false on the column", async () => {
		const config: ColumnNodeConfig = {
			columns: [{ field: "x", header: "X", sortable: false }],
		};
		const result = await executor.execute(config, ctx, []);
		expect(result.columns[0].enableSorting).toBe(false);
	});

	it("filterable:false sets enableColumnFilter:false on the column", async () => {
		const config: ColumnNodeConfig = {
			columns: [{ field: "x", header: "X", filterable: false }],
		};
		const result = await executor.execute(config, ctx, []);
		expect(result.columns[0].enableColumnFilter).toBe(false);
	});

	it("empty columns array produces empty output", async () => {
		const result = await executor.execute({ columns: [] }, ctx, []);
		expect(result.columns).toHaveLength(0);
		expect(result.visibility).toEqual({});
	});

	it("multiple columns produce correct length", async () => {
		const config: ColumnNodeConfig = {
			columns: [
				{ field: "a", header: "A" },
				{ field: "b", header: "B" },
				{ field: "c", header: "C", hidden: true },
			],
		};
		const result = await executor.execute(config, ctx, []);
		expect(result.columns).toHaveLength(3);
		expect(result.visibility).toEqual({ c: false });
	});
});
