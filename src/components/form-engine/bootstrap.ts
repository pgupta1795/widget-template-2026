// src/components/form-engine/bootstrap.ts
// Called from src/main.tsx before the app renders.
// Registers all built-in field type renderers into the global FieldTypeRegistry.
import { registerDefaultFields } from "./core/register-default-fields";

let bootstrapped = false;

export function bootstrapFormEngine(): void {
	if (bootstrapped) return;
	registerDefaultFields();
	bootstrapped = true;
}
