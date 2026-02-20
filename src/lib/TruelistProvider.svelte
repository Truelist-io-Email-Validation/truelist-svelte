<script lang="ts">
  import { setTruelistConfig } from "./context";
  import type { Snippet } from "svelte";

  interface Props {
    /** Your Truelist form API key. */
    apiKey: string;
    /** Base URL for the Truelist API. Defaults to `https://api.truelist.io`. */
    baseUrl?: string;
    children?: Snippet;
  }

  const props: Props = $props();

  setTruelistConfig({ apiKey: props.apiKey, baseUrl: props.baseUrl });
</script>

{#if props.children}
  {@render props.children()}
{/if}
