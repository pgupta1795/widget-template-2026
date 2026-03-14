import { describe, expect, it } from "vitest";

import { DAGValidationError } from "../core/dag-validator";
import { buildWaves } from "../core/dependency-resolver";
import type { DAGConfig } from "../types/dag.types";

function dag(
	nodes: string[],
	edges: [string, string][],
	root?: string,
): DAGConfig {
	return {
		nodes: nodes.map((id) => ({
			id,
			type: "api" as const,
			config: { url: "/", method: "GET" as const, authAdapterId: "none" },
		})),
		edges: edges.map(([from, to]) => ({ from, to })),
		rootNodeId: root ?? nodes[nodes.length - 1],
	};
}

describe("buildWaves", () => {
	it("single node with no edges → one wave containing that node", () => {
		const waves = buildWaves(dag(["a"], []));
		expect(waves).toHaveLength(1);
		expect(waves[0].map((n) => n.id)).toEqual(["a"]);
	});

	it("linear chain a→b→c produces 3 sequential waves", () => {
		const waves = buildWaves(
			dag(
				["a", "b", "c"],
				[
					["a", "b"],
					["b", "c"],
				],
			),
		);
		expect(waves).toHaveLength(3);
		expect(waves[0].map((n) => n.id)).toEqual(["a"]);
		expect(waves[1].map((n) => n.id)).toEqual(["b"]);
		expect(waves[2].map((n) => n.id)).toEqual(["c"]);
	});

	it("two independent roots a,b both feed c → wave 0 has 2 nodes", () => {
		const waves = buildWaves(
			dag(
				["a", "b", "c"],
				[
					["a", "c"],
					["b", "c"],
				],
			),
		);
		expect(waves[0].map((n) => n.id).sort()).toEqual(["a", "b"]);
		expect(waves[1].map((n) => n.id)).toEqual(["c"]);
	});

	it("lazy nodes (present in nodes[] but not in edges) are excluded from waves", () => {
		const cfg: DAGConfig = {
			nodes: [
				{
					id: "active",
					type: "api",
					config: { url: "/", method: "GET", authAdapterId: "none" },
				},
				{
					id: "lazy",
					type: "api",
					config: { url: "/", method: "GET", authAdapterId: "none" },
				},
			],
			edges: [],
			rootNodeId: "active",
		};
		const waves = buildWaves(cfg);
		const allIds = waves.flat().map((n) => n.id);
		expect(allIds).toContain("active");
		expect(allIds).not.toContain("lazy");
	});

	it("cycle throws DAGValidationError", () => {
		expect(() =>
			buildWaves(
				dag(
					["a", "b"],
					[
						["a", "b"],
						["b", "a"],
					],
				),
			),
		).toThrow(DAGValidationError);
	});

	it("edge referencing a node not in nodes[] throws DAGValidationError", () => {
		const cfg: DAGConfig = {
			nodes: [
				{
					id: "a",
					type: "api",
					config: { url: "/", method: "GET", authAdapterId: "none" },
				},
			],
			edges: [{ from: "a", to: "ghost" }],
			rootNodeId: "a",
		};
		expect(() => buildWaves(cfg)).toThrow(DAGValidationError);
	});
});
