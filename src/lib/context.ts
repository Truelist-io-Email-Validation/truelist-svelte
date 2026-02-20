import { setContext, getContext } from "svelte";
import type { TruelistConfig } from "./types";

/** Context key for the Truelist configuration. */
export const TRUELIST_CONFIG_KEY = "truelist-config";

/**
 * Sets the Truelist configuration in Svelte context.
 * Called internally by TruelistProvider.
 */
export function setTruelistConfig(config: TruelistConfig): void {
  setContext(TRUELIST_CONFIG_KEY, config);
}

/**
 * Retrieves the Truelist configuration from Svelte context.
 * Returns undefined if no provider is found.
 */
export function getTruelistConfig(): TruelistConfig | undefined {
  try {
    return getContext<TruelistConfig>(TRUELIST_CONFIG_KEY);
  } catch {
    return undefined;
  }
}
