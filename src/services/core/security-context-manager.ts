import logger from "@/lib/logger";
import { getWidget } from "@/lib/widget/api";
import { getPlatformURL } from "@/services/core/platform-resolver";
import { wafAuthenticatedRequest } from "@/services/core/waf-transport";

const SC_PREFERENCE_NAME = "SecurityContext";
const SC_API_PATH =
	"/resources/modeler/pno/person?current=true&select=preferredcredentials&select=collabspaces";
let pending: Promise<void> | null = null;

type SecurityContextResponse = {
	preferredcredentials?: {
		collabspace: { name: string };
		role: { name: string };
		organization: { name: string };
	};
	collabspaces?: Array<{
		name: string;
		title: string;
		couples: Array<{
			organization: { name: string; title: string };
			role: { name: string; nls: string };
		}>;
	}>;
};

function buildOptions(data: SecurityContextResponse) {
	const collabspaces = data.collabspaces ?? [];
	// Detect if any collabspace has inconsistent org names across its couples
	const hasInconsistentOrg = collabspaces.some((cs) => {
		const orgNames = cs.couples.map((c) => c.organization.name);
		return new Set(orgNames).size > 1;
	});

	const options: Array<{ value: string; label: string }> = [];
	for (const cs of collabspaces) {
		for (const couple of cs.couples) {
			const value = `${couple.role.name}.${couple.organization.name}.${cs.name}`;
			const label = hasInconsistentOrg
				? `${cs.title} ● ${couple.organization.title} ● ${couple.role.nls}`
				: `${cs.title} ● ${couple.role.nls}`;
			options.push({ value, label });
		}
	}
	return options.sort((a, b) => a.label.localeCompare(b.label));
}

function getDefaultValue(data: SecurityContextResponse): string | undefined {
	const { collabspace, role, organization } = data.preferredcredentials ?? {};
	if (collabspace && role && organization) {
		return `${role.name}.${organization.name}.${collabspace.name}`;
	}
	return undefined;
}

export function initSecurityContext(): Promise<void> {
	if (pending) return pending;

	pending = (async () => {
		const spaceUrl = await getPlatformURL("3DSpace");
		const { data } = await wafAuthenticatedRequest<SecurityContextResponse>(
			`${spaceUrl}${SC_API_PATH}`,
			{ type: "json" },
		);

		const options = buildOptions(data);
		const defaultValue = getDefaultValue(data);
		const widget = getWidget();

		// Check if the user already has a saved preference
		const existingValue = widget.getValue(SC_PREFERENCE_NAME);
		const resolvedDefault =
			existingValue ??
			defaultValue ??
			(options.length > 0 ? options[0].value : "");

		widget.addPreference({
			name: SC_PREFERENCE_NAME,
			type: "list",
			label: "Credentials",
			defaultValue: resolvedDefault,
			options,
		});

		if (resolvedDefault) {
			widget.setValue(SC_PREFERENCE_NAME, resolvedDefault);
		}
		logger.info(`Security Context initialized: ${resolvedDefault}`);
	})().catch((err) => {
		pending = null;
		logger.error("Failed to initialize Security Context", err);
		throw err;
	});
	return pending;
}

export function getSecurityContext(): string | undefined {
	try {
		return getWidget().getValue(SC_PREFERENCE_NAME);
	} catch (err) {
		logger.error("Failed to get Security Context", err);
		return undefined;
	}
}
