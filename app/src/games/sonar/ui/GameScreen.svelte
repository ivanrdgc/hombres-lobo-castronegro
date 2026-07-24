<script lang="ts">
  // Pantalla de partida de «Captain Sonar»: estado público (vida/energía),
  // mapa PROPIO (solo tu tripulación), tira de rumbos del rival y turno.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { sonarGame, teamOf, rival } from '../actions';
  import { narrates } from '../engine';
  import { DIR_ARROW } from '../map';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import type { Announce, Team } from '../types';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import MapGrid from './MapGrid.svelte';
  import TurnPanel from './TurnPanel.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(sonarGame(group)!);
  const myTeam = $derived(teamOf(game, my.id));
  const inGame = $derived(!!myTeam && !!matchOf(my.id));
  const myTurn = $derived(game.phase === 'turn' && !!myTeam && game.turnTeam === myTeam);
  const needsUnlock = $derived(narrates(game, my.id, group.masterId ?? null) && !app.ui.audioReady && !app.ui.muted);
  const tag = (t: Team) => (t === 'red' ? '🔴' : '🔵');
  const arrow = (a: Announce) => (a === 'silence' ? '🤫' : a === 'surface' ? '⏫' : DIR_ARROW[a]);
  const crew = (t: Team) => game.teams[t].map((p) => game.names[p] || '¿?').join(', ');

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>📡 {group.name}</h2>
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

<div class="card">
  <div class="snstatus">
    {#each ['red', 'blue'] as const as t (t)}
      <div class="snteam {game.phase === 'turn' && game.turnTeam === t ? 'active' : ''}">
        <b>{tag(t)} {t === 'red' ? 'Rojo' : 'Azul'}</b>
        <span>❤️ {game.subs[t].hp} · ⚡ {game.subs[t].energy}</span>
        <span class="sncrew">{crew(t)}</span>
      </div>
    {/each}
  </div>
</div>

{#if game.phase === 'end'}
  <EndPhase {game} {my} />
{:else}
  {#if myTeam}
    <div class="card">
      <h3>🗺️ Vuestro mapa (solo lo ve tu tripulación)</h3>
      <MapGrid sub={game.subs[myTeam]} team={myTeam} />
      <p class="small-note" style="margin:0">Estela: casillas ya usadas (no se pueden cruzar; ⏫ emerger la borra).</p>
    </div>
    <div class="card">
      <h3>🎧 Rumbos anunciados por {tag(rival(myTeam))} el rival</h3>
      {#if game.moves[rival(myTeam)].length}
        <p class="sntrack">{#each game.moves[rival(myTeam)] as a, i (i)}<span>{arrow(a)}</span>{/each}</p>
        <p class="small-note" style="margin:0">Síguelos desde varios orígenes posibles: islas y bordes descartan rutas. 🤫 = se movió en silencio; ⏫ = emergió (cantó cuadrante).</p>
      {:else}
        <p class="small-note" style="margin:0">Aún no ha navegado: atento a sus anuncios.</p>
      {/if}
    </div>
  {:else}
    <p class="small-note" style="text-align:center">👀 Sigues la partida de espectador: sin mapas (son secretos de cada tripulación).</p>
  {/if}

  {#if myTurn && myTeam}
    <TurnPanel {game} team={myTeam} />
  {:else}
    <div class="narration">🎬 Turno de {tag(game.turnTeam)} el submarino {game.turnTeam === 'red' ? 'Rojo' : 'Azul'}: su tripulación decide en su móvil…</div>
  {/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="sn-mycard" />

<style>
  .snstatus { display: flex; gap: 8px; }
  .snteam { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 7px 9px; border-radius: 10px; border: 1px solid var(--border, #333); font-size: 0.85rem; }
  .snteam.active { border-color: #c8a24a; box-shadow: 0 0 0 1px #c8a24a inset; }
  .sncrew { font-size: 0.72rem; opacity: 0.7; }
  .sntrack { font-size: 1.15rem; letter-spacing: 2px; margin: 6px 0; word-break: break-all; }
</style>
