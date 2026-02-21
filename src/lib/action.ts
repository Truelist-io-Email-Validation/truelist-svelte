import type { Action } from "svelte/action";
import { verifyEmail, TruelistApiError } from "./client";
import type { TruelistConfig, ValidationResult, ValidateOn } from "./types";

export type TruelistActionOptions = {
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

/**
 * Svelte action for adding Truelist email validation to an input element.
 *
 * Attaches event listeners based on `validateOn`, handles debouncing,
 * request cancellation, and sets `data-validation-state` on the element.
 *
 * @example
 * ```svelte
 * <script>
 *   import { truelist } from '@truelist/svelte';
 *
 *   let result = $state(null);
 * </script>
 *
 * <input
 *   type="email"
 *   use:truelist={{
 *     apiKey: 'your-api-key',
 *     debounceMs: 500,
 *     validateOn: 'blur',
 *     onResult: (r) => result = r,
 *   }}
 * />
 * ```
 */
export const truelist: Action<HTMLInputElement, TruelistActionOptions> = (
  node,
  options
) => {
  let currentOptions = options;
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

  function getConfig(): TruelistConfig {
    return {
      apiKey: currentOptions.apiKey,
      baseUrl: currentOptions.baseUrl,
    };
  }

  async function runValidation(emailValue: string): Promise<void> {
    abortInFlight();

    const controller = new AbortController();
    abortController = controller;

    node.dataset.validationState = "validating";

    try {
      const result = await verifyEmail(
        emailValue,
        getConfig(),
        controller.signal
      );

      if (controller.signal.aborted) return;

      node.dataset.validationState = result.state;
      node.setAttribute(
        "aria-invalid",
        result.state === "email_invalid" ? "true" : "false"
      );
      currentOptions.onResult?.(result);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message =
        err instanceof TruelistApiError
          ? err.message
          : "Email validation failed. Please try again.";

      node.dataset.validationState = "idle";
      currentOptions.onError?.(message);
    }
  }

  function scheduleValidation(emailValue: string): void {
    clearDebounce();

    if (!emailValue || !emailValue.includes("@")) {
      node.dataset.validationState = "idle";
      return;
    }

    const delay = currentOptions.debounceMs ?? 500;

    if (delay > 0) {
      debounceTimer = setTimeout(() => {
        void runValidation(emailValue);
      }, delay);
    } else {
      void runValidation(emailValue);
    }
  }

  function handleBlur(): void {
    const email = node.value;
    if (email) {
      scheduleValidation(email);
    }
  }

  function handleInput(): void {
    const validateOn = currentOptions.validateOn ?? "blur";

    // Reset state when typing in blur mode
    if (validateOn === "blur") {
      clearDebounce();
      abortInFlight();
      node.dataset.validationState = "idle";
      return;
    }

    scheduleValidation(node.value);
  }

  // Initialize
  node.dataset.validationState = "idle";
  node.addEventListener("blur", handleBlur);
  node.addEventListener("input", handleInput);

  return {
    update(newOptions) {
      currentOptions = newOptions;
    },
    destroy() {
      clearDebounce();
      abortInFlight();
      node.removeEventListener("blur", handleBlur);
      node.removeEventListener("input", handleInput);
    },
  };
};
