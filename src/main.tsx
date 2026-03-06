import type {DSPlatformAPIs} from "@/lib/types";
import {RouterProvider} from "@tanstack/react-router";
import ReactDOM,{type Root} from "react-dom/client";
import "./index.css";
import {logger} from "./lib/logger";
import {loadModules} from "./lib/modules/loader";
import {getModule} from "./lib/modules/registry";
import {init} from "./lib/widget/api";
import {WidgetProvider} from "./lib/widget/context";
import {getRouter} from "./router";
import {initSecurityContext} from "./services/core/security-context-manager";

const waitFor = (predicate: () => boolean, timeout: number) => {
	return new Promise<boolean>((resolve, reject) => {
		const check = () => {
			if (!predicate()) return;
			clearInterval(interval);
			resolve(true);
		};
		const interval = setInterval(check, 100);
		check();
		if (!timeout) return;
		setTimeout(() => {
			clearInterval(interval);
			reject();
		}, timeout);
	});
};

const rootId = "root";
let root: Root | null = null;
let started = false;

const start = async () => {
	if (started) {
		logger.warn(
			"Widget application already started. Skipping duplicate start.",
		);
		return;
	}
	started = true;
	logger.info("Starting widget application ...");
	let rootEl = document.getElementById(rootId);
	if (!rootEl) {
		rootEl = document.createElement("div");
		rootEl.id = rootId;
		document.body.innerHTML = "";
		document.body.appendChild(rootEl);
	}

	await loadModules(["drag-drop", "uwa-core", "intercom"]);
	const apis: DSPlatformAPIs = {
		PlatformAPI: getModule("platform-api"),
		WAFData: getModule("waf-data"),
		i3DXCompassServices: getModule("compass-services"),
		DataDragAndDrop: getModule("drag-drop"),
		UWA_Core: getModule("uwa-core"),
		UWA_Utils_InterCom: getModule("intercom"),
		WebappsUtils: getModule("webapps-utils"),
	};

	init(apis, window.widget, window.UWA);
	await initSecurityContext();
	const widgetContext = { widget: window.widget, uwa: window.UWA, apis };
	const router = getRouter();
	root ??= ReactDOM.createRoot(rootEl);
	root.render(
		<WidgetProvider value={widgetContext}>
			<RouterProvider router={router} />
		</WidgetProvider>,
	);
	logger.info("Widget application rendered.");
};

waitFor(() => window.widget != null, 10000)
	.then(() => {
		logger.debug("Widget object detected.");
		window.widget.addEvent("onLoad", () => {
			logger.info("Widget onLoad event triggered.");
			window.widget.setTitle(window.widget.getValue("Title") ?? "");
			start();
		});

		window.widget.addEvent("onRefresh", () => {
			logger.info("Widget onRefresh event triggered. Reloading...");
			window.widget.setTitle(window.widget.getValue("Title") ?? "");
			start();
		});
	})
	.catch(() => {
		logger.error("Widget not available after 10s timeout.");
	});
