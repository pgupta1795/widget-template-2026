// src/components/layout-engine/core/layout-context.tsx
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import type {
	DAGLayoutConfig,
	LayoutContextValue,
	PanelState,
} from "../types/layout.types";

const LayoutContext = createContext<LayoutContextValue | null>(null);
LayoutContext.displayName = "LayoutContext";

export function useLayoutContext(): LayoutContextValue {
	const ctx = useContext(LayoutContext);
	if (!ctx) {
		throw new Error(
			"useLayoutContext must be used inside <LayoutContextProvider>",
		);
	}
	return ctx;
}

interface LayoutContextProviderProps {
	/**
	 * Layout configuration — must be referentially stable across the provider's lifetime.
	 * Panel state is initialized from this config once on mount and will not re-initialize if config changes.
	 */
	config: DAGLayoutConfig;
	initialParams?: Record<string, JsonPrimitive>;
	children: React.ReactNode;
}

export function LayoutContextProvider({
	config,
	initialParams = {},
	children,
}: LayoutContextProviderProps) {
	// Initialise panel states from config
	const [panels, setPanels] = useState<Record<string, PanelState>>(() => {
		const initial: Record<string, PanelState> = {};

		if (config.type === "split" || config.type === "stack") {
			for (const panel of config.panels) {
				initial[panel.id] = { isCollapsed: false, size: panel.defaultSize };
			}
		} else if (config.type === "sidebar") {
			initial[config.mainPanel.id] = {
				isCollapsed: false,
				size: config.mainPanel.defaultSize,
			};
			initial[config.sidePanel.id] = {
				isCollapsed: config.sidePanel.defaultCollapsed ?? false,
				size: config.sidePanel.defaultSize,
			};
		}
		return initial;
	});

	const [params, setParamsState] =
		useState<Record<string, JsonPrimitive>>(initialParams);

	const togglePanel = useCallback((panelId: string) => {
		setPanels((prev) => {
			const current = prev[panelId];
			if (!current) return prev;
			return {
				...prev,
				[panelId]: { ...current, isCollapsed: !current.isCollapsed },
			};
		});
	}, []);

	const setPanelSize = useCallback((panelId: string, size: number) => {
		setPanels((prev) => {
			const current = prev[panelId];
			if (!current) return prev;
			return { ...prev, [panelId]: { ...current, size } };
		});
	}, []);

	const setParams = useCallback((next: Record<string, JsonPrimitive>) => {
		setParamsState(next);
	}, []);

	const value = useMemo<LayoutContextValue>(
		() => ({ panels, togglePanel, setPanelSize, params, setParams }),
		[panels, togglePanel, setPanelSize, params, setParams],
	);

	return (
		<LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
	);
}
