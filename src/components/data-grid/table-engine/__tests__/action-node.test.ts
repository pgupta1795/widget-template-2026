// src/components/data-grid/table-engine/__tests__/action-node.test.ts
import { describe, expect, it } from "vitest";
import { NodeContext } from "../core/node-context";
import { ActionNodeExecutor } from "../nodes/action-node";
import type { ActionNodeConfig } from "../types/table.types";

const executor = new ActionNodeExecutor();

describe("ActionNodeExecutor", () => {
	it("passes rowActions through from config", async () => {
		const config: ActionNodeConfig = {
			rowActions: [
				{ id: "promote", label: "Promote", apiNodeId: "promote-api" },
			],
		};
		const result = await executor.execute(config, new NodeContext(), []);
		expect(result.rowActions).toHaveLength(1);
		expect(result.rowActions[0].id).toBe("promote");
		expect(result.rowActions[0].apiNodeId).toBe("promote-api");
	});

	it("defaults to empty arrays when config has no actions", async () => {
		const result = await executor.execute({}, new NodeContext(), []);
		expect(result.rowActions).toEqual([]);
		expect(result.cellActions).toEqual([]);
	});

	it("all two action lists are independent", async () => {
		const config: ActionNodeConfig = {
			rowActions: [{ id: "r", label: "Row", apiNodeId: "r-api" }],
			cellActions: [{ id: "c", label: "Cell", apiNodeId: "c-api" }],
		};
		const result = await executor.execute(config, new NodeContext(), []);
		expect(result.rowActions).toHaveLength(1);
		expect(result.cellActions).toHaveLength(1);
	});
});
