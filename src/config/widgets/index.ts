import logger from '@/lib/logger';
import type {WidgetConfig} from "@/types/config";
import {engineeringBomConfig} from "./engineering-bom";

type WidgetProps = {
	id: string;
	title: string;
	description?: string;
}

const WIDGET_CONFIGS: Record<string, WidgetConfig> = {
	"engineering-bom": engineeringBomConfig,
};

export function getWidgetConfig(id: string): WidgetConfig {
	const config = WIDGET_CONFIGS[id];
	if (!config) {
		const err = `Widget config "${id}" not found. Available: ${Object.keys(WIDGET_CONFIGS).join(", ")}`;
		logger.error(err);
		throw new Error(err);
	}
	return config;
}

export function getAvailableWidgets(): WidgetProps[] {
	return Object.values(WIDGET_CONFIGS).map(({ id, title, description }) => ({
		id,
		title,
		description,
	}));
}

export function registerWidgetConfig(config: WidgetConfig) {
	WIDGET_CONFIGS[config.id] = config;
}
