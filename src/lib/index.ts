// Action
export { truelist } from "./action";
export type { TruelistActionOptions } from "./action";

// Store
export { createEmailValidation } from "./store";
export type {
  CreateEmailValidationOptions,
  EmailValidation,
} from "./store";

// Components
export { default as EmailInput } from "./EmailInput.svelte";
export { default as TruelistProvider } from "./TruelistProvider.svelte";

// Context
export { getTruelistConfig, TRUELIST_CONFIG_KEY } from "./context";

// Client
export { verifyEmail, TruelistApiError } from "./client";

// Types
export type {
  ValidationState,
  ValidationSubState,
  ValidationResult,
  TruelistConfig,
  ValidateOn,
} from "./types";
