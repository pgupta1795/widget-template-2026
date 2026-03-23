import { getPlatformURL } from "@/services/core/platform-resolver";
import type { ServiceType } from "../openapi/types";

/**
 * Resolves the base URL for the given 3DExperience service type.
 * Delegates entirely to the platform-resolver singleton in src/services/core.
 */
export async function resolveServiceUrl(
	serviceType: ServiceType,
): Promise<string> {
	return getPlatformURL(serviceType);
}
