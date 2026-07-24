<script lang="ts">
  // Resultado: se revela el objetivo y la marca del equipo, y se reparten los
  // puntos. Otra ronda rota el Psíquico y cambia el espectro; si se cumplió la
  // meta, el botón principal lleva al resumen final.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { goalMet, psychicId, scoreLabel } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { WavelengthState } from '../types';
  import Dial from './Dial.svelte';
  import ScoreBoard from './ScoreBoard.svelte';

  const { game, my }: { game: WavelengthState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const done = $derived(goalMet(game));
  const psyName = $derived(nm(psychicId(game)));
  const iAmPsychic = $derived(psychicId(game) === my.id);
</script>

<!-- La distancia exacta la canta el pie del dial, junto a las dos agujas: aquí
     va solo el veredicto. (`scoreLabel` ya trae su propio emoji: el 🎯 que
     había delante dejaba dos seguidos, «🎯 😬 Fuera de la diana».) -->
<div class="narration">{game.lastScore !== null ? scoreLabel(game.lastScore) : ''}{game.lastScore === 4 ? ' — clavado.' : ''}</div>

<!-- Se destapa todo: el objetivo que solo veía el Psíquico y la marca que puso
     el equipo, en el mismo dial. El espectro no hace falta repetirlo: son los
     dos extremos de esa misma barra. -->
<div class="card" style="text-align:center">
  {#if game.clueText}<p class="clue">💬 La pista era <b>«{game.clueText}»</b></p>{/if}
  <Dial spectrumId={game.spectrumId} target={game.target} marker={game.marker} legend="result" />
  <p class="tally">🔮 {iAmPsychic ? 'Tú, de Psíquico' : `${psyName}, de Psíquico`}, {game.lastScore === 0 ? 'no suma esta ronda' : `suma ${game.lastScore} ${game.lastScore === 1 ? 'punto' : 'puntos'}`}.</p>
</div>

<ScoreBoard {game} highlightPsychic={true} />

<!-- Terminar a media partida ya vive en el menú ⋯ (con confirmación): aquí
     estaba otra vez, en un botón que borraba la partida de un solo toque. -->
{#if done}
  <div class="narration">🏁 Meta cumplida: {game.goal?.label}. Podéis cerrar con el resumen o seguir jugando rondas sueltas.</div>
  <button class="primary block" data-a="wl-finish" onclick={() => guard(A.finishGame)}>🏁 Ver el resumen final</button>
  <button class="block" data-a="wl-again" onclick={() => guard(A.nextRound)}>🔁 Otra ronda de propina (rota el Psíquico)</button>
{:else}
  <button class="primary block" data-a="wl-again" onclick={() => guard(A.nextRound)}>🔁 Otra ronda (rota el Psíquico)</button>
  <p class="small-note" style="text-align:center;margin:6px 0 0">La puede pulsar cualquiera, no solo el Psíquico.</p>
{/if}

<style>
  /* La leyenda de agujas (amarilla = objetivo, roja = vuestra marca) la pinta
     ya el propio dial con `legend="result"`: aquí va el recuento. */
  .clue { background: var(--card2); border: 1px solid var(--border); border-radius: 10px; padding: 7px 12px; margin: 6px 0 2px; font-size: 0.92rem; }
  .clue b { color: var(--moon); }
  .tally { font-size: 0.86rem; color: var(--muted); margin-top: 8px; }
</style>
