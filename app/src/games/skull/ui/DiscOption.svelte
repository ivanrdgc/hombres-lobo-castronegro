<script lang="ts">
  // Opción de «poner disco» con su efecto escrito debajo y, si no se puede, el
  // motivo a la vista (nunca un botón gris mudo). La decisión de Skull es 🌸 o
  // 💀 y no debería tomarse leyendo solo dos palabras.
  const { disc, label, desc, blocked = '', a, onpick }: {
    disc: 'flower' | 'skull';
    label: string;
    desc: string;
    blocked?: string;
    a: string;
    onpick: () => void;
  } = $props();
</script>

<button class="skopt {disc}" data-a={a} disabled={!!blocked} onclick={onpick}>
  <span class="skoh"><span class="skoe">{disc === 'skull' ? '💀' : '🌸'}</span>{label}</span>
  <span class="skod">{desc}</span>
  {#if blocked}<span class="skox">🚫 {blocked}</span>{/if}
</button>

<style>
  .skopt {
    display: block; width: 100%; text-align: left; padding: 12px; min-height: 44px;
    border-radius: var(--r-2, 12px); border: 1px solid var(--line-2, #3b4060);
    background: var(--card2, #222639); margin-top: 8px;
  }
  .skopt.skull { border-color: color-mix(in srgb, var(--danger, #e0526b) 55%, var(--line-2, #3b4060)); }
  .skopt:disabled { opacity: 1; border-style: dashed; color: var(--muted, #999); }
  .skoh { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 700; color: var(--moon, #ffd98a); }
  .skopt:disabled .skoh { color: var(--muted, #999); }
  .skoe { font-size: 1.5rem; }
  .skod { display: block; margin-top: 5px; font-size: 0.85rem; font-weight: 400; color: var(--muted, #999); white-space: normal; line-height: 1.35; }
  .skox { display: block; margin-top: 6px; font-size: 0.8rem; font-weight: 400; color: var(--danger, #e0526b); white-space: normal; }
</style>
