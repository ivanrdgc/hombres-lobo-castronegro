<script lang="ts">
  // Cuenta atrás en segundos (port del setInterval de main.js v1: cada 500 ms).
  const { deadline }: { deadline: number } = $props();

  let now = $state(Date.now());

  $effect(() => {
    const t = setInterval(() => {
      now = Date.now();
    }, 500);
    return () => clearInterval(t);
  });

  const left = $derived(Math.max(0, Math.ceil((deadline - now) / 1000)));
</script>

<span class="countdown" data-deadline={deadline}>({left}s)</span>
