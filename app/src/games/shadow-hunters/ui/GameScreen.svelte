<script lang="ts">
  // Pantalla de partida de «Shadow Hunters»: tablero + turno + pista + fin.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { shadowHGame, clearPista } from '../actions';
  import { guard } from '../../../core/sync/guard';
  import { PISTAS } from '../chars';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import PlayersBoard from './PlayersBoard.svelte';
  import TurnPanel from './TurnPanel.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(shadowHGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const myTurn = $derived(game.turn === my.id && game.phase === 'turn' && game.alive[my.id]);
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  // La pista en curso: quien la RECIBE lee el texto completo; quien la dio ve
  // la confirmación (también con el texto: la carta la leen ambos).
  const pistaMine = $derived(game.pista && (game.pista.target === my.id || game.pista.by === my.id) ? game.pista : null);

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>🌘 {group.name}</h2>
  <GameMenu {game} {my} />
</div>
<Flash />

{#if needsUnlock}
  <div class="card" style="text-align:center"><span class="moon">🔊</span><h3>Este dispositivo pone la voz</h3>
    <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la voz</button></div>
{/if}
{#if game.paused}
  <div class="card" style="text-align:center"><span class="moon">⏸️</span><h3>Partida en pausa</h3>
    <p class="small-note">La ha pausado {game.paused.name || 'alguien'}.</p></div>
{/if}

{#if game.phase === 'end'}
  <EndPhase {game} {my} />
{:else}
  <div class="card"><PlayersBoard {game} {my} /></div>

  {#if pistaMine}
    <div class="card" style="border-color:#c8a24a">
      <p class="small-note" style="margin:0">🔮 {pistaMine.target === my.id ? 'Has recibido una pista' : `Tu pista para ${game.names[pistaMine.target] || '¿?'}`} (solo la leéis quien la dio y quien la recibió):</p>
      <p style="margin:8px 0"><b>«{PISTAS[pistaMine.idx].text}»</b></p>
      <p class="small-note" style="margin:0">Resultado público: {pistaMine.outcome}.</p>
      <button class="ghost block" style="margin-top:6px" data-a="sh-pista-ok" onclick={() => guard(clearPista)}>Entendido</button></div>
  {/if}

  {#if myTurn}
    <TurnPanel {game} {my} />
  {:else}
    <div class="narration">🎬 Turno de <b>{game.names[game.turn] || '¿?'}</b>: pista, ataque, descanso… o revelarse.</div>
  {/if}
  {#if inGame && !game.alive[my.id]}<p class="small-note" style="text-align:center">☠️ Estás fuera: tu personaje quedó destapado. Mira cómo acaba.</p>{/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador (sin ver identidades ocultas).</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="sh-mycard" />
