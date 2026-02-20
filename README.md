# @truelist/svelte

Svelte actions, stores, and components for real-time email validation with [Truelist.io](https://truelist.io).

Validate emails at the point of entry with a Svelte action, a headless store, a context provider, or a pre-built input component.

```bash
npm install @truelist/svelte
```

## Quick Start

Use the `truelist` action on any input:

```svelte
<script>
  import { truelist } from '@truelist/svelte';

  let result = $state(null);
</script>

<input
  type="email"
  use:truelist={{
    apiKey: 'your-form-api-key',
    debounceMs: 500,
    validateOn: 'blur',
    onResult: (r) => result = r,
  }}
/>

{#if result?.state === 'valid'}
  <span>Valid!</span>
{:else if result?.state === 'invalid'}
  <span>Invalid email</span>
{/if}
```

## Store-Based Usage

Use `createEmailValidation` for headless state management:

```svelte
<script>
  import { createEmailValidation } from '@truelist/svelte';

  const validation = createEmailValidation({
    apiKey: 'your-form-api-key',
    debounceMs: 500,
  });

  const { email, result, isValidating, error } = validation;
</script>

<input type="email" bind:value={$email} />

{#if $isValidating}
  <span>Checking...</span>
{:else if $result?.state === 'valid'}
  <span>Valid!</span>
{:else if $result?.state === 'invalid'}
  <span>Invalid email</span>
{/if}

{#if $result?.suggestion}
  <span>Did you mean {$result.suggestion}?</span>
{/if}

{#if $error}
  <span>{$error}</span>
{/if}
```

### Store Return Value

| Property | Type | Description |
|---|---|---|
| `email` | `Writable<string>` | Writable store for the email value |
| `result` | `Readable<ValidationResult \| null>` | The validation result, or null |
| `isValidating` | `Readable<boolean>` | Whether a request is in-flight |
| `error` | `Readable<string \| null>` | Error message, or null |
| `validate` | `() => Promise<void>` | Trigger validation manually |
| `reset` | `() => void` | Clear result, error, and abort pending requests |
| `destroy` | `() => void` | Clean up timers and abort in-flight requests |

### Store Options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | -- | Your Truelist form API key |
| `baseUrl` | `string` | `https://api.truelist.io` | Custom API base URL |
| `debounceMs` | `number` | `500` | Debounce delay. Set to 0 to disable. |
| `validateOn` | `"blur" \| "change"` | `"blur"` | When to trigger automatic validation |
| `onResult` | `(result: ValidationResult) => void` | -- | Callback when validation succeeds |
| `onError` | `(error: string) => void` | -- | Callback when validation fails |

## Provider Pattern

Wrap your app with `TruelistProvider` to make the API key available via Svelte context:

```svelte
<!-- +layout.svelte -->
<script>
  import { TruelistProvider } from '@truelist/svelte';
</script>

<TruelistProvider apiKey="your-form-api-key">
  <slot />
</TruelistProvider>
```

Then use the store or component without passing the API key:

```svelte
<script>
  import { getTruelistConfig, createEmailValidation } from '@truelist/svelte';

  const config = getTruelistConfig();
  const validation = createEmailValidation({
    apiKey: config.apiKey,
  });
</script>
```

## Action: `use:truelist`

The action attaches validation directly to any `<input>` element. It sets `data-validation-state` on the element for CSS styling and handles cleanup automatically.

```svelte
<script>
  import { truelist } from '@truelist/svelte';

  let result = $state(null);
  let error = $state(null);
</script>

<input
  type="email"
  use:truelist={{
    apiKey: 'your-form-api-key',
    debounceMs: 500,
    validateOn: 'blur',
    onResult: (r) => result = r,
    onError: (e) => error = e,
  }}
/>
```

### Action Options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | -- | Your Truelist form API key |
| `baseUrl` | `string` | `https://api.truelist.io` | Custom API base URL |
| `debounceMs` | `number` | `500` | Debounce delay. Set to 0 to disable. |
| `validateOn` | `"blur" \| "change"` | `"blur"` | When to trigger automatic validation |
| `onResult` | `(result: ValidationResult) => void` | -- | Callback when validation succeeds |
| `onError` | `(error: string) => void` | -- | Callback when validation fails |

## Component: `EmailInput`

A composable, unstyled email input with built-in validation.

```svelte
<script>
  import { EmailInput } from '@truelist/svelte';

  let email = $state('');
</script>

<EmailInput
  bind:value={email}
  apiKey="your-form-api-key"
  validateOn="blur"
  debounceMs={500}
  placeholder="you@example.com"
  onvalidationresult={(result) => console.log(result)}
/>
```

### Snippets

Customize rendering with named snippets:

```svelte
<EmailInput bind:value={email} apiKey="your-form-api-key">
  {#snippet validating()}
    <span class="spinner">Verifying...</span>
  {/snippet}

  {#snippet suggestion({ suggestion })}
    <span class="suggestion">Did you mean {suggestion}?</span>
  {/snippet}

  {#snippet error({ error })}
    <span class="error">{error}</span>
  {/snippet}

  {#snippet result({ result })}
    {#if result.state === 'valid'}
      <span class="success">Looks good!</span>
    {/if}
  {/snippet}
</EmailInput>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | `""` | The email value (use `bind:value`) |
| `apiKey` | `string` | -- | Your Truelist form API key (or use provider) |
| `baseUrl` | `string` | `https://api.truelist.io` | Custom API base URL |
| `validateOn` | `"blur" \| "change"` | `"blur"` | When to trigger validation |
| `debounceMs` | `number` | `500` | Debounce delay for "change" mode |
| `placeholder` | `string` | -- | Input placeholder text |
| `disabled` | `boolean` | `false` | Disable the input |
| `name` | `string` | -- | Input name attribute |
| `id` | `string` | -- | Input id attribute |
| `onvalidationresult` | `(result: ValidationResult) => void` | -- | Callback when validation completes |

## Styling with Data Attributes

Both the action and component expose `data-validation-state` for CSS styling:

```css
input[data-validation-state="valid"] {
  border-color: green;
}

input[data-validation-state="invalid"] {
  border-color: red;
}

input[data-validation-state="risky"] {
  border-color: orange;
}

input[data-validation-state="validating"] {
  border-color: blue;
}

input[data-validation-state="idle"] {
  border-color: gray;
}
```

## Types

```ts
import type {
  ValidationState,
  ValidationSubState,
  ValidationResult,
  TruelistConfig,
  ValidateOn,
} from '@truelist/svelte'
```

### `ValidationState`

```ts
type ValidationState = "valid" | "invalid" | "risky" | "unknown";
```

### `ValidationSubState`

```ts
type ValidationSubState =
  | "ok"
  | "accept_all"
  | "disposable_address"
  | "role_address"
  | "failed_mx_check"
  | "failed_spam_trap"
  | "failed_no_mailbox"
  | "failed_greylisted"
  | "failed_syntax_check"
  | "unknown";
```

### `ValidationResult`

```ts
type ValidationResult = {
  state: ValidationState;
  subState: ValidationSubState;
  email: string;
  suggestion?: string;
  freeEmail?: boolean;
  role?: boolean;
};
```

### `TruelistConfig`

```ts
type TruelistConfig = {
  apiKey: string;
  baseUrl?: string;
};
```

## Configuration

### Provider Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | *required* | Your Truelist form API key |
| `baseUrl` | `string` | `https://api.truelist.io` | Custom API base URL |

### API Details

- **Endpoint**: `POST https://api.truelist.io/api/v1/form_verify`
- **Auth**: Bearer token (your form API key)
- **Rate limit**: 60 requests per minute for form keys
- **Billing**: Credits are only charged for definitive results (`valid`/`invalid`), not for `unknown`

Get your API key at [truelist.io](https://truelist.io).

## License

MIT
