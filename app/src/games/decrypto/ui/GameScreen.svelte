<script lang="ts">
  // Pantalla de partida de «Decrypto»: cabecera con fichas + tu panel de equipo
  // + fase. La fase decide quién actúa (encriptador, rival o propio equipo).
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { decryptoGame } from '../actions';
  import { MAX_ROUNDS, TEAM_LABEL, TOKENS_TO_WIN, encoderId, teamMembers } from '../engine';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import TeamPanel from './TeamPanel.svelte';
  import CluePhase from './CluePhase.svelte';
  import GuessPhase from './GuessPhase.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(decryptoGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });

  // Marcador público: en la mesa real las fichas están a la vista y todos saben
  // quién juega en cada equipo. Aquí también, con los puntos que faltan dichos.
  const myTeam = $derived(game.teams[my.id] ?? null);
  const encName = $derived(game.names[encoderId(game, game.active)] || '¿?');
  const board = $derived((['red', 'blue'] as const).map((t) => ({
    t,
    who: teamMembers(game, t).map((p) => game.names[p] || '¿?').join(', '),
    tok: game.tokens[t],
  })));
  const pips = (n: number) => [...Array(TOKENS_TO_WIN)].map((_, i) => i < n);
</script>

<div class="topbar">
  <h2>🔐 Decrypto</h2>
  <!-- El detalle (qué es 🕵️, qué es ❌, quién va en cada equipo) está en el
       marcador de abajo: en un `title=` no se ve desde un móvil. -->
  {#if game.phase !== 'end'}<span class="chip">R{game.round}/{MAX_ROUNDS} · 🔴 🕵️{game.tokens.red.intercepts} ❌{game.tokens.red.errors} · 🔵 🕵️{game.tokens.blue.intercepts} ❌{game.tokens.blue.errors}</span>{/if}
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
  <TeamPanel {game} {my} />
{:else}
  <!-- El panel también para espectadores: las pistas son públicas y quien
       sostiene el altavoz necesita seguir la hoja (sus palabras no las ve). -->
  <TeamPanel {game} {my} />
  <div class="card">
    <p class="small-note" style="margin:0 0 8px">📡 Ronda {game.round} de {MAX_ROUNDS} · transmite el equipo <b>{TEAM_LABEL[game.active]}</b> · encripta <b>{encName}</b></p>
    <div class="deboard">
      {#each board as b (b.t)}
        <div class="detk" class:mine={myTeam === b.t} class:live={game.active === b.t} data-a="de-tokens" data-p={b.t}>
          <div class="dtname">{TEAM_LABEL[b.t]}{game.active === b.t ? ' 📡' : ''}</div>
          <div class="dtwho">{myTeam === b.t ? 'vosotros: ' : ''}{b.who}</div>
          <div class="dtpip"><span>🕵️</span>{#each pips(b.tok.intercepts) as on, i (i)}<i class:on></i>{/each}<em>{b.tok.intercepts} de {TOKENS_TO_WIN}</em></div>
          <div class="dtpip"><span>❌</span>{#each pips(b.tok.errors) as on, i (i)}<i class="bad" class:on></i>{/each}<em>{b.tok.errors} de {TOKENS_TO_WIN}</em></div>
        </div>
      {/each}
    </div>
    <p class="small-note" style="margin:8px 0 0">🕵️ intercepciones logradas: con {TOKENS_TO_WIN} ese equipo GANA · ❌ errores propios al descifrar: con {TOKENS_TO_WIN} PIERDE.</p>
  </div>
  {#if game.phase === 'clue'}
    <CluePhase {game} {my} />
  {:else if game.phase === 'intercept' || game.phase === 'decode'}
    <GuessPhase {game} {my} />
  {:else if game.phase === 'reveal'}
    <RevealPhase {game} {my} />
  {/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador (sin ver las palabras de los equipos).</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="de-mycard" />

<style>
  .deboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
  .detk { padding: 8px 10px; border-radius: 12px; border: 1px solid var(--border, #333); background: var(--bg-1, #12141f); }
  .detk.mine { border-color: var(--accent, #c8a24a); }
  .detk.live { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent, #c8a24a) 45%, transparent); }
  .dtname { font-size: 0.86rem; font-weight: 800; white-space: nowrap; }
  .dtwho { font-size: 0.76rem; color: var(--muted, #a9a6c0); margin-bottom: 5px; overflow-wrap: break-word; }
  .dtpip { display: flex; align-items: center; gap: 4px; font-size: 0.76rem; margin-top: 3px; }
  .dtpip i { width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--line-2, #3b4060); }
  .dtpip i.on { background: var(--accent, #c8a24a); border-color: var(--accent, #c8a24a); }
  .dtpip i.bad.on { background: var(--danger, #e0526b); border-color: var(--danger, #e0526b); }
  .dtpip em { font-style: normal; color: var(--muted, #a9a6c0); margin-left: 2px; }
</style>
