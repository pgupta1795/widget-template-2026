import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {},
	clientPrefix: "VITE_",
	client: {
		VITE_WIDGET_BASE_PATH: z
			.string()
			.min(1)
			.default("/3ddashboard/api/widget/frame"),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});
