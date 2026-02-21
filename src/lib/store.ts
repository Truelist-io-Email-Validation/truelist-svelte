import { writable, derived, get } from "svelte/store";
import type { Readable, Writable } from "svelte/store";
import { verifyEmail, TruelistApiError } from "./client";
import type { TruelistConfig, ValidationResult, ValidateOn } from "./types";

export type CreateEmailValidationOptions = {
  /** Your Truelist API key. */
  apiKey: string;
  /** Base URL for the Truelist API. Defaults to `https://api.truelist.io`. */
  baseUrl?: string;
  /** Debounce delay in milliseconds. Set to 0 to disable. Default: 500. */
  debounceMs?: number;
  /** When to trigger automatic validation. Default: "blur". */
  validateOn?: ValidateOn;
  /** Callback fired when validation completes successfully. */
  onResult?: (result: ValidationResult) => void;
  /** Callback fired when validation fails. */
  onError?: (error: string) => void;
};

export type EmailValidation = {
  /** Writable store for the email value. */
  email: Writable<string>;
  /** Readable store for the most recent validation result. */
  result: Readable<ValidationResult | null>;
  /** Readable store for whether a validation request is in-flight. */
  isValidating: Readable<boolean>;
  /** Readable store for the error message from the last attempt. */
  error: Readable<string | null>;
  /** Trigger email validation manually. */
  validate: () => Promise<void>;
  /** Reset result and error state. */
  reset: () => void;
  /** Clean up timers and abort in-flight requests. Call when done. */
  destroy: () => void;
};

/**
 * Creates a headless email validation store powered by the Truelist API.
 *
 * Handles debouncing, request cancellation, and loading/error states.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createEmailValidation } from '@truelist/svelte';
 *
 *   const validation = createEmailValidation({
 *     apiKey: 'your-api-key',
 *   });
 *
 *   const { email, result, isValidating } = validation;
 * </script>
 *
 * <input type="email" bind:value={$email} />
 * {#if $isValidating}
 *   <span>Checking...</span>
 * {:else if $result?.state === 'ok'}
 *   <span>Valid!</span>
 * {/if}
 * ```
 */
export function createEmailValidation(
  options: CreateEmailValidationOptions
): EmailValidation {
  const {
    apiKey,
    baseUrl,
    debounceMs = 500,
    validateOn = "blur",
    onResult,
    onError,
  } = options;

  const config: TruelistConfig = { apiKey, baseUrl };

  if (!config.apiKey) {
    throw new Error(
      "createEmailValidation requires an API key. Pass `apiKey` in options " +
        "or use <TruelistProvider apiKey=\"...\"> and getContext."
    );
  }

  const email = writable("");
  const result = writable<ValidationResult | null>(null);
  const isValidating = writable(false);
  const error = writable<string | null>(null);

  let abortController: AbortController | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function clearDebounce() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function abortInFlight() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  async function runValidation(emailValue: string): Promise<void> {
    abortInFlight();

    const controller = new AbortController();
    abortController = controller;

    isValidating.set(true);
    error.set(null);

    try {
      const validationResult = await verifyEmail(
        emailValue,
        config,
        controller.signal
      );

      if (controller.signal.aborted) return;

      result.set(validationResult);
      isValidating.set(false);
      onResult?.(validationResult);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message =
        err instanceof TruelistApiError
          ? err.message
          : "Email validation failed. Please try again.";

      error.set(message);
      isValidating.set(false);
      onError?.(message);
    }
  }

  async function validate(): Promise<void> {
    clearDebounce();

    const emailValue = get(email);

    if (!emailValue || !emailValue.includes("@")) {
      result.set(null);
      error.set(null);
      isValidating.set(false);
      return;
    }

    await runValidation(emailValue);
  }

  function reset(): void {
    clearDebounce();
    abortInFlight();
    result.set(null);
    error.set(null);
    isValidating.set(false);
  }

  let unsubscribe: (() => void) | null = null;

  if (validateOn === "change") {
    unsubscribe = email.subscribe((newValue) => {
      clearDebounce();

      if (!newValue || !newValue.includes("@")) {
        result.set(null);
        error.set(null);
        isValidating.set(false);
        return;
      }

      if (debounceMs > 0) {
        debounceTimer = setTimeout(() => {
          void runValidation(newValue);
        }, debounceMs);
      } else {
        void runValidation(newValue);
      }
    });
  }

  function destroy(): void {
    clearDebounce();
    abortInFlight();
    unsubscribe?.();
  }

  return {
    email,
    result: derived(result, ($r) => $r),
    isValidating: derived(isValidating, ($v) => $v),
    error: derived(error, ($e) => $e),
    validate,
    reset,
    destroy,
  };
}
