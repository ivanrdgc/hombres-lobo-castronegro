<script lang="ts">
  // Un disco de TU mano: se ve siempre (cuántos te quedan) y es el botón para
  // ponerlo. Cuando no se puede colocar no se apaga en silencio: dice por qué
  // —«no es tu turno», «ya colocaste», «no te quedan flores»—.
  const { disc, count, label, desc, blocked = '', a, onpick }: {
    disc: 'flower' | 'skull';
    count: number;
    label: string;
    desc: string;
    blocked?: string;
    a: string;
    onpick: () => void;
  } = $props();
  const face = $derived(disc === 'skull' ? '💀' : '🌸');
</script>

<button class="skopt {disc}" data-a={a} disabled={!!blocked} onclick={onpick}>
  <span class="skfaces">{count > 0 ? face.repeat(count) : '—'}</span>
  <span class="skoh">{label}</span>
  <!-- O lo que hace, o por qué no puedes: nunca las dos cosas (ocupa el doble
       y en un móvil eso es hacer scroll para decidir). -->
  {#if blocked}<span class="skox">🚫 {blocked}</span>{:else}<span class="skod">{desc}</span>{/if}
</button>

<style>
  .skopt {
    display: flex; flex-direction: column; gap: 1px; width: 100%; text-align: left;
    padding: 6px 9px; min-height: 44px; border-radius: var(--r-2, 12px);
    border: 1px solid var(--line-2, #3b4060); background: var(--card2, #222639);
  }
  .skopt.skull { border-color: color-mix(in srgb, var(--danger, #e0526b) 55%, var(--line-2, #3b4060)); }
  .skopt:disabled { opacity: 1; border-style: dashed; }
  .skfaces { font-size: 1.35rem; line-height: 1.15; letter-spacing: 1px; }
  .skopt:disabled .skfaces { filter: grayscale(0.5) brightness(0.85); }
  .skoh { font-size: 0.85rem; font-weight: 700; color: var(--moon, #ffd98a); line-height: 1.2; }
  .skopt:disabled .skoh { color: var(--muted, #999); }
  .skod { font-size: 0.72rem; font-weight: 400; color: var(--muted, #999); white-space: normal; line-height: 1.25; }
  .skox { font-size: 0.72rem; font-weight: 400; color: var(--danger, #e0526b); white-space: normal; line-height: 1.25; }
</style>
