<script lang="ts">
  // La cara de una carta, IGUAL en toda la partida (tu mano, el panel de turno y
  // el destape del final). Love Letter se juega con el móvil en la mano y
  // mirando hacia ti (B28 · postura de mano), así que la jerarquía es la de una
  // carta de verdad: el valor GRANDE —lo único que se compara al final—, el
  // nombre, y el efecto entero debajo (B26·1: nunca solo el nombre).
  import { CARD_INFO, VALUE } from '../cards';
  import type { Card } from '../cards';

  const { card, effect = '', foot = '', tone = 'plain' }: {
    card: Card;
    /** Efecto a mostrar; por defecto, el resumen de la carta. */
    effect?: string;
    /** Línea al pie: copias que quedan, por qué está bloqueada, qué te quedas… */
    foot?: string;
    /** `mine` tu mano · `chosen` la que vas a jugar · `locked` no jugable. */
    tone?: 'plain' | 'mine' | 'chosen' | 'locked';
  } = $props();
  const info = $derived(CARD_INFO[card]);
</script>

<div class="face {tone}">
  <div class="val"><b>{VALUE[card]}</b><small>valor</small></div>
  <div class="body">
    <div class="nm"><span class="emo">{info.emoji}</span>{info.name}</div>
    <div class="eff">{effect || info.short}</div>
    {#if foot}<div class="foot">{foot}</div>{/if}
  </div>
</div>

<style>
  .face {
    display: flex; align-items: flex-start; gap: 12px; width: 100%;
    padding: 11px; border-radius: var(--r-2); text-align: left;
    border: 1px solid var(--line-2); background: var(--card2);
    /* Dentro del panel de turno la carta va en un <button> (negrita por defecto):
       el texto tiene que leerse igual aquí que en tu mano. */
    font-weight: 400;
  }
  /* El valor, como la esquina de una carta: se lee a 30 cm sin acercar el móvil. */
  .val {
    flex: 0 0 auto; min-width: 46px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1px;
    border-radius: 10px; padding: 4px 6px;
    background: color-mix(in srgb, #c86ab0 16%, transparent);
    border: 1px solid color-mix(in srgb, #c86ab0 45%, transparent);
  }
  .val b { font-family: var(--font-display); font-size: 2rem; line-height: 1; color: var(--moon); }
  /* Rótulo del número, no información por sí mismo (el número ya se ve a 2 rem). */
  .val small { font-size: 0.66rem; letter-spacing: 0.5px; text-transform: uppercase; color: var(--muted); }
  .body { flex: 1 1 auto; min-width: 0; }
  .nm { display: flex; align-items: center; gap: 7px; font-size: 1.12rem; font-weight: 700; color: var(--moon); }
  .emo { font-size: 1.35rem; }
  /* Efecto: 0,92 rem — es lo que más se lee de la pantalla. */
  .eff { font-size: 0.92rem; line-height: 1.35; color: var(--text); margin-top: 3px; }
  .foot { font-size: 0.82rem; line-height: 1.3; color: var(--muted); margin-top: 6px; }

  .face.mine { border-color: #c86ab0; background: color-mix(in srgb, #c86ab0 10%, var(--card2)); }
  .face.chosen { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--card2)); }
  .face.locked { opacity: 0.62; border-style: dashed; }
  .face.locked .val { background: none; }
</style>
