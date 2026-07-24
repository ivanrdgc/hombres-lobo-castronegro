<script lang="ts">
  // Colocación de salida: cada jugador pone 1 disco boca abajo (a la vez). Se
  // ve qué tienes en la mano y qué implica cada disco antes de elegir: es la
  // única decisión de la ronda que se toma sin ver nada de los demás.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { placedCount, inHand } from '../engine';
  import DiscOption from './DiscOption.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const done = $derived(placedCount(game, my.id) >= 1);
  const hand = $derived(inGame ? inHand(game, my.id) : { flowers: 0, skulls: 0 });
  const pend = $derived(game.playerIds.filter((pid) => game.alive[pid] && placedCount(game, pid) < 1).map((pid) => game.names[pid] || pid));
  const alive = $derived(game.playerIds.filter((pid) => game.alive[pid]).length);
  const ready = $derived(alive - pend.length);
</script>

<div class="narration">🌸💀 Ronda {game.round}: colocad a la vez vuestro disco de salida, boca abajo. Nadie ve lo que pones —ni la voz lo dice—. Van {ready} de {alive}.</div>

{#if inGame && !game.alive[my.id]}
  <!-- Sin esto, el eliminado veía «Tu disco de salida» con los botones muertos. -->
  <div class="card"><p class="hint">☠️ Estás fuera de la partida: te quedaste sin discos. Sigues viéndola como espectador.</p></div>
{:else if inGame && !done}
  <div class="actionpanel">
    <h3>1️⃣ Tu disco de salida</h3>
    <p class="hint">
      En la mano: <b>{'🌸'.repeat(hand.flowers) || '—'}</b> {hand.flowers} flor{hand.flowers === 1 ? '' : 'es'}
      · <b>{'💀'.repeat(hand.skulls) || '—'}</b> {hand.skulls} calavera{hand.skulls === 1 ? '' : 's'}.
      Elige uno: se pone boca abajo y solo tú sabrás cuál es.
    </p>

    <DiscOption disc="flower" a="sk-place-flower" label="Poner una flor"
      desc="Lo seguro: si acabas apostando tú, tu propia pila te suma flores sin riesgo… y te guardas la calavera para más adelante."
      blocked={hand.flowers <= 0 ? 'no te queda ninguna flor: las has perdido al fallar retos' : ''}
      onpick={() => guard(() => A.placeInitial('flower'))} />

    <DiscOption disc="skull" a="sk-place-skull" label="Poner la calavera"
      desc="La trampa: quien se atreva a levantar tu pila falla y pierde un disco. Arma de doble filo: si el que apuesta acabas siendo tú, tu pila es la PRIMERA que levantas."
      blocked={hand.skulls <= 0 ? 'ya no tienes calavera: la perdiste al fallar un reto' : ''}
      onpick={() => guard(() => A.placeInitial('skull'))} />

    <details class="skref">
      <summary data-a="sk-ref-setup">📖 Qué viene después de colocar</summary>
      <p class="small-note">Cuando estén todos, se juega por turnos: en el tuyo pones OTRO disco sobre tu pila o abres la apuesta.</p>
      <p class="small-note">Apostar es decir «levantaré N flores seguidas sin topar una calavera», empezando obligatoriamente por tu propia pila.</p>
      <p class="small-note">Al cerrar la ronda cada uno RECOGE toda su pila: lo único que se pierde es el disco de quien falla un reto.</p>
    </details>
  </div>
{:else if inGame}
  <div class="card">
    <p class="hint" style="margin:0">✅ Tu disco de salida ya está en la mesa: lo ves en tu fila del tablero (solo tú).</p>
    <p class="small-note">{pend.length ? `⏳ Faltan por colocar: ${pend.join(', ')}. Mientras, repasa el tablero o el 🎴 de abajo.` : 'Arrancando la ronda…'}</p>
  </div>
{:else}
  <div class="card">
    <p class="hint" style="margin:0">👀 Están colocando los discos de salida.</p>
    <p class="small-note">{pend.length ? `Faltan: ${pend.join(', ')}.` : 'Ya están todos.'}</p>
  </div>
{/if}

<style>
  .skref { margin-top: 12px; border-top: 1px solid var(--border, #2c3047); padding-top: 8px; }
  .skref summary { font-size: 0.85rem; color: var(--muted, #999); cursor: pointer; min-height: 30px; }
</style>
