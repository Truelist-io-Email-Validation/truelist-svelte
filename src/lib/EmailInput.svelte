<script lang="ts">
  import { createEmailValidation } from "./store";
  import { getTruelistConfig } from "./context";
  import type { ValidateOn, ValidationResult } from "./types";
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import type { Snippet } from "svelte";

  interface Props {
    /** The email value. Use bind:value for two-way binding. */
    value?: string;
    /** Your Truelist form API key. Can be omitted if using TruelistProvider. */
    apiKey?: string;
    /** Base URL for the Truelist API. Defaults to `https://api.truelist.io`. */
    baseUrl?: string;
    /** When to trigger automatic validation. Default: "blur". */
    validateOn?: ValidateOn;
    /** Debounce delay in milliseconds. Default: 500. */
    debounceMs?: number;
    /** Input placeholder text. */
    placeholder?: string;
    /** Disable the input. */
    disabled?: boolean;
    /** Input name attribute. */
    name?: string;
    /** Input id attribute. */
    id?: string;
    /** Callback fired when validation completes. */
    onvalidationresult?: (result: ValidationResult) => void;
    /** Slot for validating state. */
    validating?: Snippet;
    /** Slot for suggestion display. */
    suggestion?: Snippet<[{ suggestion: string }]>;
    /** Slot for error display. */
    error?: Snippet<[{ error: string }]>;
    /** Slot for result display. */
    result?: Snippet<[{ result: ValidationResult }]>;
    [key: string]: unknown;
  }

  let {
    value = $bindable(""),
    apiKey,
    baseUrl,
    validateOn = "blur",
    debounceMs = 500,
    placeholder,
    disabled = false,
    name,
    id,
    onvalidationresult,
    validating: validatingSnippet,
    suggestion: suggestionSnippet,
    error: errorSnippet,
    result: resultSnippet,
    ...restProps
  }: Props = $props();

  const contextConfig = getTruelistConfig();
  const resolvedApiKey = apiKey ?? contextConfig?.apiKey ?? "";
  const resolvedBaseUrl = baseUrl ?? contextConfig?.baseUrl;

  const validation = createEmailValidation({
    apiKey: resolvedApiKey,
    baseUrl: resolvedBaseUrl,
    debounceMs,
    validateOn,
    onResult: (r) => {
      onvalidationresult?.(r);
    },
  });

  const {
    email,
    result: resultStore,
    isValidating,
    error: errorStore,
    validate,
    reset,
    destroy,
  } = validation;

  // Sync external value -> store
  $effect(() => {
    if (value !== get(email)) {
      email.set(value);
    }
  });

  // Sync store -> external value
  const unsubEmail = email.subscribe((v) => {
    if (v !== value) {
      value = v;
    }
  });

  // Derive data-validation-state
  let dataState = $derived.by(() => {
    const validating = get(isValidating);
    const res = get(resultStore);
    if (validating) return "validating";
    if (res?.state) return res.state;
    return "idle";
  });

  // Subscribe to stores for reactive access in template
  let isValidatingValue = $state(false);
  let resultValue = $state<ValidationResult | null>(null);
  let errorValue = $state<string | null>(null);

  const unsubValidating = isValidating.subscribe((v) => {
    isValidatingValue = v;
  });
  const unsubResult = resultStore.subscribe((v) => {
    resultValue = v;
  });
  const unsubError = errorStore.subscribe((v) => {
    errorValue = v;
  });

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    email.set(target.value);
  }

  function handleBlur() {
    if (validateOn === "blur" && get(email)) {
      void validate();
    }
  }

  // Reset when typing in blur mode
  const unsubReset = email.subscribe((newValue) => {
    if (validateOn === "blur" && (get(resultStore) || get(errorStore))) {
      const currentResult = get(resultStore);
      if (!newValue || newValue !== currentResult?.email) {
        reset();
      }
    }
  });

  onDestroy(() => {
    unsubEmail();
    unsubValidating();
    unsubResult();
    unsubError();
    unsubReset();
    destroy();
  });
</script>

<div data-truelist-wrapper>
  <input
    {id}
    {name}
    {placeholder}
    {disabled}
    type="email"
    value={get(email)}
    data-validation-state={dataState}
    aria-invalid={resultValue?.state === "invalid" ? true : undefined}
    oninput={handleInput}
    onblur={handleBlur}
    {...restProps}
  />

  {#if isValidatingValue && validatingSnippet}
    {@render validatingSnippet()}
  {/if}

  {#if resultValue?.suggestion}
    {#if suggestionSnippet}
      {@render suggestionSnippet({ suggestion: resultValue.suggestion })}
    {:else}
      <span data-truelist-suggestion>Did you mean {resultValue.suggestion}?</span>
    {/if}
  {/if}

  {#if errorValue}
    {#if errorSnippet}
      {@render errorSnippet({ error: errorValue })}
    {:else}
      <span data-truelist-error>{errorValue}</span>
    {/if}
  {/if}

  {#if resultValue && resultSnippet}
    {@render resultSnippet({ result: resultValue })}
  {/if}
</div>
