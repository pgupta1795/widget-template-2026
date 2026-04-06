// src/components/form-engine/FormEngineProvider.tsx

import { createContext, useContext, type ReactNode } from "react";
import type { FormEngineContextValue } from "./types";

const FormEngineContext = createContext<FormEngineContextValue | null>(null);

export function useFormEngineContext(): FormEngineContextValue {
	const ctx = useContext(FormEngineContext);
	if (!ctx) {
		throw new Error(
			"useFormEngineContext must be used within a FormEngineProvider",
		);
	}
	return ctx;
}

interface FormEngineProviderProps {
	value: FormEngineContextValue;
	children: ReactNode;
}

export function FormEngineProvider({
	value,
	children,
}: FormEngineProviderProps) {
	return (
		<FormEngineContext.Provider value={value}>
			{children}
		</FormEngineContext.Provider>
	);
}
