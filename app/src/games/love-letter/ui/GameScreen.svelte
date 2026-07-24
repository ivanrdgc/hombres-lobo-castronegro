<script lang="ts">
  // Pantalla de partida de «Love Letter»: cabecera + jugadores + tu carta + fase.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { loveLetterGame, clearPeek, nextRound, resumeGame } from '../actions';
  import { myPeek } from '../engine';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { guard } from '../../../core/sync/guard';
  import { CARD_INFO, VALUE } from '../cards';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import PlayersRow from './PlayersRow.svelte';
  import TurnPanel from './TurnPanel.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(loveLetterGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const myTurn = $derived(game.turn === my.id && game.phase === 'turn');
  const hand = $derived(game.hands[my.id] || []);
  const out = $derived(inGame && game.phase === 'turn' && !game.alive[my.id]);
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  const peekMine = $derived(myPeek(game, my.id));
  const paused = $derived(!!game.paused);
  // Cabecera: siempre se sabe de quién es el turno (B26·5).
  const turnChip = $derived(game.phase === 'roundEnd' ? '🏁 Fin de ronda'
    : myTurn ? '🎴 Te toca' : `🎴 ${game.names[game.turn] || '¿?'}`);
  // Prohibido el estado sin salida (B26·8): si el móvil de quien tiene el turno
  // lleva un rato sin latir, la mesa entera espera sin saber por qué. Se dice, y
  // se dice también cómo desatascarlo.
  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 15000); return () => clearInterval(t); });
  const turnAsleep = $derived.by(() => {
    if (game.phase !== 'turn' || myTurn) return false;
    const p = app.players.find((x) => x.id === game.turn);
    return !!p && !isActiveDevice(p, now);
  });

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  // Con los móviles sobre la mesa, la carta propia NO puede estar a la vista
  // permanente: el vecino la lee de reojo. Se destapa a petición y se vuelve a
  // tapar sola en cuanto cambia la mano (nueva ronda, Rey, Príncipe…).
  let reveal = $state(false);
  $effect(() => { void hand.join(','); reveal = false; });
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>💌 {group.name}</h2>
  <GameMenu {game} {my} />
</div>
{#if game.phase !== 'end'}
  <!-- Los números públicos de la mesa, siempre a la vista y sin comerle sitio al
       nombre de la mesa en un móvil de 360 px (B26·5 y B26·7). -->
  <div class="statusbar">
    <span class="chip turnchip" data-a="ll-turn-chip">{turnChip}</span>
    <span class="chip" data-a="ll-deck-left">Ronda {game.round} · 🃏 {game.deck.length} por robar</span>
    <span class="chip">💌 {game.need} favores para ganar</span>
  </div>
{/if}
<Flash />

{#if needsUnlock}
  <div class="card" style="text-align:center"><span class="moon">🔊</span><h3>Este dispositivo pone la voz</h3>
    <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la voz</button></div>
{/if}
{#if game.paused}
  <!-- Nunca un estado sin salida (B26·8): la pausa se levanta desde aquí mismo,
       sin tener que buscar el menú ⋯. -->
  <div class="card" style="text-align:center"><span class="moon">⏸️</span><h3>Partida en pausa</h3>
    <p class="small-note">La ha pausado {game.paused.name || 'alguien'}. Nadie puede jugar hasta reanudarla; puede hacerlo cualquiera.</p>
    <button class="primary block" data-a="ll-resume-here" onclick={() => guard(resumeGame)}>▶️ Reanudar la partida</button></div>
{/if}

{#if game.phase === 'end'}
  <EndPhase {game} {my} />
{:else}
  <div class="card">
    <PlayersRow {game} meId={my.id} />
    <p class="small-note" style="margin:6px 0 0">🃏 Quedan <b>{game.deck.length}</b> cartas por robar · 1 apartada boca abajo{#if game.asideUp.length} · fuera de la ronda, boca arriba: {game.asideUp.map((c) => `${CARD_INFO[c].emoji} ${CARD_INFO[c].name}`).join(', ')}{/if}.</p>
  </div>

  {#if peekMine}
    <div class="card" style="border-color:#c86ab0"><p class="small-note" style="margin:0">
      {#if peekMine.via === 'baron'}🎩 En el duelo del Barón, <b>{game.names[peekMine.target] || '¿?'}</b> tenía{:else}🔍 Con el Sacerdote viste que <b>{game.names[peekMine.target] || '¿?'}</b> tiene{/if}:
      <b>{CARD_INFO[peekMine.card].emoji} {CARD_INFO[peekMine.card].name}</b>. Solo tú lo ves.</p>
      <button class="ghost block" style="margin-top:6px" data-a="ll-peek-ok" onclick={() => guard(clearPeek)}>✅ Entendido · ocultarlo (no vuelve a salir)</button></div>
  {/if}

  {#if out}
    <div class="card" style="text-align:center" data-a="ll-out-banner"><span class="moon">❌</span>
      <h3 style="margin:6px 0">Fuera de esta ronda</h3>
      <p class="small-note">Solo de ESTA ronda: en la siguiente se reparte otra vez y vuelves a jugar. Mientras, mira arriba los descartes de cada uno y repasa las 8 cartas en 🎴 (abajo a la derecha).</p></div>
  {/if}

  {#if game.phase === 'turn'}
    {#if myTurn}
      <TurnPanel {game} {my} />
    {:else}
      <div class="narration">🎴 Turno de <b>{game.names[game.turn] || '¿?'}</b>: roba una carta y juega una de las dos. Tú esperas — mientras, mira arriba los descartes de cada uno y cuenta lo que queda por salir.</div>
      {#if turnAsleep}
        <p class="small-note" data-a="ll-turn-asleep">💤 El móvil de <b>{game.names[game.turn] || '¿?'}</b> lleva un rato sin dar señal. Si no vuelve, en el menú ⋯ tienes <b>🪑 La mesa</b> para verlo, y quien empezó la partida puede usar <b>⏭️ Retirar a un ausente</b> para seguir sin él esta ronda.</p>
      {/if}
      {#if inGame && hand.length}
        <div class="card">
          {#if reveal}
            <p class="small-note" style="margin:0">Tu carta: <b>{CARD_INFO[hand[0]].emoji} {CARD_INFO[hand[0]].name}</b>. {CARD_INFO[hand[0]].short}</p>
            <button class="ghost block" style="margin-top:6px" data-a="ll-hide-card" onclick={() => (reveal = false)}>🙈 Volver a taparla</button>
          {:else}
            <button class="ghost block" data-a="ll-show-card" onclick={() => (reveal = true)}>👁 Ver mi carta (solo tú)</button>
            <p class="small-note" style="margin:6px 0 0">Tapada a propósito: con el móvil en la mesa, el vecino la lee de reojo.</p>
          {/if}
        </div>
      {/if}
    {/if}
  {:else if game.phase === 'roundEnd'}
    {#if game.roundResult}
      {@const rr = game.roundResult}
      <div class="narration">💌 {game.names[rr.winner] || '¿?'} gana la ronda: {rr.reason}. Suma un favor: lleva {game.tokens[rr.winner] || 0} de {game.need}.</div>
      {#if rr.reveal?.length}
        <div class="card"><h3>🃏 Las manos, destapadas</h3>
          {#each rr.reveal as r (r.pid)}
            <div class="settingrow" style="align-items:center">
              <div class="sinfo"><div class="sname">{game.names[r.pid] || '¿?'}{rr.winner === r.pid ? ' 💌' : ''}</div></div>
              <b>{CARD_INFO[r.card].emoji} {CARD_INFO[r.card].name} ({VALUE[r.card]})</b>
            </div>
          {/each}</div>
      {/if}
    {/if}
    <p class="small-note" style="text-align:center">Se baraja de nuevo y vuelven TODOS, también los eliminados; empieza quien ganó la ronda. Gana la partida el primero que reúna {game.need} favores.</p>
    <button class="primary block" data-a="ll-next-round" disabled={paused} onclick={() => guard(nextRound)}>▶️ Siguiente ronda (la {game.round + 1}): repartir de nuevo</button>
    <p class="small-note" style="text-align:center">{paused ? '⏸️ La partida está en pausa: reanúdala arriba.' : 'Puede pulsarlo cualquiera: esperad a que todos hayan leído las manos.'}</p>
  {/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador: ves los descartes y el diario, no las manos. Con el menú ⋯ puedes abrir 🪑 la mesa, pausar o terminar.</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="ll-mycard" />

<style>
  /* Fila de estado bajo la cabecera: turno + números públicos. Envuelve sola en
     360 px en vez de comerse el nombre de la mesa. */
  .statusbar { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 8px; }
  .statusbar .chip { font-size: 0.8rem; }
  .turnchip { border-color: var(--accent); color: var(--moon); }
</style>
