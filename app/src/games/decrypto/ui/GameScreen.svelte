<script lang="ts">
  // Pantalla de partida de «Decrypto». ORDEN POR POSTURA (B28, juego 👥 EQUIPO):
  // primero el aviso de quién puede mirar, después lo PÚBLICO y compacto (ronda,
  // turno, fichas), luego LO QUE HAY QUE HACER AHORA y solo al final lo secreto
  // de equipo (vuestras palabras y la hoja). Si el móvil se queda apoyado, lo
  // que el rival lee desde su lado de la mesa es la franja de arriba: ahí no hay
  // nada que le sirva.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { decryptoGame } from '../actions';
  import { MAX_ROUNDS, TEAM_LABEL, TOKENS_TO_WIN, encoderId, teamMembers, teamOf } from '../engine';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import Shield from './Shield.svelte';
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
  // quién juega en cada equipo. Aquí también, en una tira compacta y ÚNICA (la
  // cabecera ya no repite las fichas).
  const myTeam = $derived(teamOf(game, my.id));
  const encName = $derived(game.names[encoderId(game, game.active)] || '¿?');
  const board = $derived((['red', 'blue'] as const).map((t) => ({
    t,
    who: teamMembers(game, t).map((p) => game.names[p] || '¿?').join(', '),
    tok: game.tokens[t],
  })));
  const pips = (n: number) => [...Array(TOKENS_TO_WIN)].map((_, i) => i < n);

  // Quién puede mirar ESTA pantalla ahora mismo. Todo lo que decide la variante
  // (espectador, encriptador de la ronda, tu equipo) es público en la mesa.
  const iEncode = $derived(game.phase === 'clue' && encoderId(game, game.active) === my.id);
  const shield = $derived.by(() => {
    if (game.phase === 'end') return { level: 'open' as const, text: 'Se acabó: ya está todo destapado y la pantalla se puede enseñar.' };
    if (iEncode) return { level: 'solo' as const, text: 'Aquí está el CÓDIGO: que no lo vea NADIE, ni los tuyos. Móvil hacia ti.' };
    if (myTeam) return { level: 'team' as const, text: `Pantalla del equipo ${TEAM_LABEL[myTeam]}: solo para los vuestros. El rival está enfrente.` };
    return { level: 'open' as const, text: 'Miras de espectador: en esta pantalla no hay palabras de nadie.' };
  });
</script>

<div class="topbar">
  <h2>🔐 Decrypto</h2>
  <GameMenu {game} {my} />
</div>
<Flash />
<Shield level={shield.level} text={shield.text} />

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
  <!-- Público y compacto: se ve desde el otro lado de la mesa sin que pase nada
       (el turno es lo único público) y deja sitio arriba para la acción. -->
  <div class="card destate" data-a="de-board">
    <p class="dshead"><b>📡 Transmite {TEAM_LABEL[game.active]}</b> · encripta {encName}<span class="dsround">Ronda {game.round} de {MAX_ROUNDS}</span></p>
    <div class="deboard">
      {#each board as b (b.t)}
        <div class="detk" class:mine={myTeam === b.t} class:live={game.active === b.t} data-a="de-tokens" data-p={b.t}>
          <div class="dtname">{TEAM_LABEL[b.t]}{myTeam === b.t ? ' · vosotros' : ''}</div>
          <div class="dtwho">{b.who}</div>
          <div class="dtpip"><span>🕵️</span>{#each pips(b.tok.intercepts) as on, i (i)}<i class:on></i>{/each}<span>❌</span>{#each pips(b.tok.errors) as on, i (i)}<i class="bad" class:on></i>{/each}</div>
        </div>
      {/each}
    </div>
    <p class="small-note" style="margin:6px 0 0">🕵️ {TOKENS_TO_WIN} intercepciones ganan la partida · ❌ {TOKENS_TO_WIN} errores propios la pierden.</p>
    {#if game.round === 1}<p class="small-note" style="margin:4px 0 0">🪑 Los equipos son nuevos: sentaos con los vuestros, el rival enfrente.</p>{/if}
  </div>
  {#if game.phase === 'clue'}
    <CluePhase {game} {my} />
  {:else if game.phase === 'intercept' || game.phase === 'decode'}
    <GuessPhase {game} {my} />
  {:else if game.phase === 'reveal'}
    <RevealPhase {game} {my} />
  {/if}
  <!-- Lo secreto, al fondo: hay que acercarse el móvil para leerlo. También para
       espectadores (sin palabras: siguen la hoja, que es pública). -->
  <TeamPanel {game} {my} />
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador.</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="de-mycard" />

<style>
  .destate { padding: 12px 13px; }
  .dshead { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px; font-size: 0.92rem; margin-bottom: 8px; }
  .dsround { margin-left: auto; font-size: 0.76rem; color: var(--muted, #a9a6c0); white-space: nowrap; }
  .deboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
  .detk { padding: 7px 9px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--bg-1, #12141f); }
  .detk.mine { border-color: var(--accent, #c8a24a); }
  .detk.live { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent, #c8a24a) 45%, transparent); }
  .dtname { font-size: 0.82rem; font-weight: 800; }
  .dtwho { font-size: 0.74rem; color: var(--muted, #a9a6c0); margin-bottom: 4px; overflow-wrap: break-word; }
  .dtpip { display: flex; align-items: center; gap: 4px; font-size: 0.74rem; }
  .dtpip i { width: 9px; height: 9px; border-radius: 50%; border: 1px solid var(--line-2, #3b4060); }
  .dtpip i.on { background: var(--accent, #c8a24a); border-color: var(--accent, #c8a24a); }
  .dtpip i.bad.on { background: var(--danger, #e0526b); border-color: var(--danger, #e0526b); }
  .dtpip span:last-of-type { margin-left: 6px; }
</style>
