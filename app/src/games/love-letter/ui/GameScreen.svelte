<script lang="ts">
  // Partida de «Love Letter», pensada para el móvil EN LA MANO y mirando hacia
  // ti (B28 · postura de mano): la pantalla es tu baraja. Todo lo que hace falta
  // para decidir cabe de una vez y sin gestos previos — tu carta con su efecto,
  // los descartes de todos, lo que queda sin salir, quién está protegido y de
  // quién es el turno. Lo accesorio (el diario) va plegado al pie.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { loveLetterGame, clearPeek, nextRound, resumeGame } from '../actions';
  import { myPeek } from '../engine';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { guard } from '../../../core/sync/guard';
  import { CARD_INFO, VALUE } from '../cards';
  import { lastLogLine } from '../texts';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import PlayersRow from './PlayersRow.svelte';
  import DeckStrip from './DeckStrip.svelte';
  import MyHand from './MyHand.svelte';
  import TurnPanel from './TurnPanel.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(loveLetterGame(group)!);
  // Foto del ajuste de la mesa al arrancar (B33): con el recuento apagado se
  // juega en MODO DIFÍCIL — sigue viéndose cuántas cartas quedan por robar, pero
  // la app no dice cuáles han salido ni cuáles quedan.
  const track = $derived((group.settings || {}).llTrack !== false);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const myTurn = $derived(game.turn === my.id && game.phase === 'turn');
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  const peekMine = $derived(myPeek(game, my.id));
  const paused = $derived(!!game.paused);
  // Cabecera: siempre se sabe de quién es el turno (B26·5).
  const turnChip = $derived(game.phase === 'roundEnd' ? '🏁 Fin de ronda'
    : myTurn ? '🎴 Te toca' : `🎴 Juega ${game.names[game.turn] || '¿?'}`);
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
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>💌 Love Letter</h2>
  <GameMenu {game} {my} />
</div>
{#if game.phase !== 'end'}
  <div class="statusbar">
    <span class="chip turnchip" data-a="ll-turn-chip">{turnChip}</span>
    <span class="chip">Ronda {game.round} · 💌 {game.need} favores para ganar</span>
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

<!-- La mesa: lo público de todos. Va arriba mientras miras (como las cartas boca
     arriba entre los jugadores) y pasa DEBAJO de tu panel cuando te toca: lo que
     hay que hacer ahora manda sobre el contexto (B29·2). -->
{#snippet board()}
  <div class="card table">
    <PlayersRow {game} meId={my.id} />
    <DeckStrip {game} {track} />
    {#if game.asideUp.length}
      <p class="small-note" style="margin:6px 0 0">🚫 Fuera de esta ronda, boca arriba: {game.asideUp.map((c) => `${CARD_INFO[c].emoji} ${CARD_INFO[c].name}`).join(', ')}.</p>
    {/if}
  </div>
{/snippet}

{#if game.phase === 'end'}
  <EndPhase {game} {my} />
{:else}
  {#if peekMine}
    <!-- Lo que has visto solo tú: arriba del todo, porque es con lo que decides. -->
    <div class="card peek"><p style="margin:0">
      {#if peekMine.via === 'baron'}🎩 En el duelo del Barón, <b>{game.names[peekMine.target] || '¿?'}</b> tenía{:else}🔍 Con el Sacerdote viste que <b>{game.names[peekMine.target] || '¿?'}</b> tiene{/if}:
      <b>{CARD_INFO[peekMine.card].emoji} {CARD_INFO[peekMine.card].name} ({VALUE[peekMine.card]})</b>. Solo tú lo ves.</p>
      <button class="ghost block" style="margin-top:8px" data-a="ll-peek-ok" onclick={() => guard(clearPeek)}>✅ Ya lo he memorizado · ocultarlo</button></div>
  {/if}

  {#if game.phase === 'turn'}
    {#if myTurn}
      <TurnPanel {game} {my} {track} />
      {@render board()}
    {:else}
      <!-- Tus cartas, SIEMPRE en el mismo sitio: arriba, te toque o no, para que
           la pantalla no salte de un turno a otro y tu mano no se vaya nunca por
           debajo del pliegue (B28 · postura de mano). -->
      {#if inGame}<MyHand {game} meId={my.id} {track} />{/if}
      <p class="waiting" data-a="ll-waiting">⏳ Le toca a <b>{game.names[game.turn] || '¿?'}</b>: tú no tienes nada que tocar. {track ? 'Mira los descartes de la mesa y ve pensando tu jugada.' : 'Ve contando lo que sale, que aquí no lo cuenta nadie por ti.'}</p>
      {#if turnAsleep}
        <p class="small-note" data-a="ll-turn-asleep">💤 El móvil de <b>{game.names[game.turn] || '¿?'}</b> lleva un rato sin dar señal. Si no vuelve, en el menú ⋯ tienes <b>🪑 La mesa</b> para verlo, y quien empezó la partida puede usar <b>⏭️ Retirar a un ausente</b> para seguir sin él esta ronda.</p>
      {/if}
      {@render board()}
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
    <button class="primary block" data-a="ll-next-round" disabled={paused} onclick={() => guard(nextRound)}>▶️ Repartir la ronda {game.round + 1}</button>
    <p class="small-note" style="text-align:center">{paused ? '⏸️ La partida está en pausa: reanúdala arriba.' : 'Puede pulsarlo cualquiera, cuando todos hayáis mirado. Vuelven TODOS, también los eliminados, y empieza quien ganó.'}</p>
    {@render board()}
  {/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Miras de espectador: ves los descartes y el diario, nunca las manos.</p>{/if}
{/if}

<!-- El diario es referencia, no decisión: al pie y plegado, con la última línea
     siempre visible (B29·2). -->
{#if game.log && game.log.length}
  <details class="diary">
    <summary data-a="ll-log">📜 {lastLogLine(game)}</summary>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div>
  </details>
{/if}

<CardFab modal="ll-mycard" />

<style>
  /* Fila de estado bajo la cabecera: turno + números públicos. Envuelve sola en
     360 px en vez de comerse el nombre de la mesa. */
  .statusbar { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 8px; }
  .statusbar .chip { font-size: 0.8rem; }
  .turnchip { border-color: #c86ab0; color: var(--moon); }
  .table { padding: 12px; margin: 8px 0; }
  /* Lo que ves solo tú: enmarcado para que no se confunda con lo público. */
  .peek { border-color: #c86ab0; font-size: 0.92rem; }
  .waiting { font-size: 0.92rem; color: var(--muted); margin: 12px 0 0; line-height: 1.4; }
  .diary { margin: 12px 0 0; }
  .diary summary {
    cursor: pointer; font-size: 0.85rem; color: var(--muted); padding: 12px 0;
    border-top: 1px solid var(--border); overflow-wrap: anywhere;
  }
</style>
