<script lang="ts">
  // La pista viva, ENCIMA del tablero y en letra grande: es el dato que la mesa
  // mira cada dos segundos mientras discute, y en un juego de mesa se lee desde
  // la otra punta. Es pública (equipo, rival y espectadores ven lo mismo), así
  // que aquí no se esconde nada.
  import { TEAM_LABEL } from '../engine';
  import type { CodenamesState } from '../types';

  const { game }: { game: CodenamesState } = $props();
  const clue = $derived(game.clue);
  // El 0 se enseña tal cual (dice «ninguna es mía»); lo que no acota es el
  // número de toques, y eso se lee al lado.
  const num = $derived(clue?.unlimited ? '∞' : String(clue?.num ?? 0));
  const left = $derived(game.guessesLeft < 0 ? 'sin límite' : String(game.guessesLeft));
  // El 0 y el ∞ son las dos jugadas que la mesa no recuerda: van traducidas
  // aquí mismo, que es donde se leen, y no solo en la referencia.
  const means = $derived(clue?.unlimited
    ? 'las pendientes de antes'
    : clue?.num === 0 ? 'ninguna es suya' : null);
</script>

{#if clue}
  <div class="cnclue" data-a="cn-clue-band">
    <div class="cc-word">«{clue.word}» · {num}</div>
    <div class="cc-meta">
      Pista de {TEAM_LABEL[game.turn]}{means ? ` · ${means}` : ''} · toques que le quedan: <b>{left}</b>
    </div>
  </div>
{/if}

<style>
  .cnclue {
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent2, #8f7ff0) 22%, var(--bg-1, #12141f)), color-mix(in srgb, var(--accent2, #8f7ff0) 8%, var(--bg-1, #12141f)));
    border: 1px solid var(--accent2, #8f7ff0);
    border-radius: var(--r-2, 12px);
    padding: 10px 14px; margin: 10px 0; text-align: center;
  }
  .cc-word {
    font-family: var(--font-display, Georgia, serif); font-weight: 800;
    font-size: clamp(1.3rem, 6.5vw, 1.9rem); line-height: 1.15; color: #efe9ff;
    word-break: break-word;
  }
  .cc-meta { font-size: 0.8rem; color: #cfc6f0; margin-top: 2px; }
</style>
