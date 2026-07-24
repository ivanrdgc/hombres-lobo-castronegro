<script lang="ts">
  // Pantalla de partida de «Captain Sonar», partida en dos zonas bien separadas
  // porque el juego se juega en dos corros dentro de la MISMA sala (postura 👥
  // equipo · B28):
  //   · PÚBLICO — arriba y pegajoso (vida, energía, turno y lo último que cantó
  //     cada submarino) y abajo el diario: lo que en una mesa real está a la
  //     vista de todos no se esconde ni se memoriza. Los espectadores ven esto.
  //   · SECRETO DE EQUIPO — la consola de tu tripulación (mapa, estela, rumbos
  //     del rival y cuaderno), anunciada como secreta y con tapadera.
  import { app } from '../../../core/sync/store.svelte';
  import { sonarGame, teamOf } from '../actions';
  import { narrates, COST_TORPEDO, MAX_ENERGY, MAX_HP } from '../engine';
  import { DIR_ARROW } from '../map';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import type { Announce, Team } from '../types';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import CrewConsole from './CrewConsole.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(sonarGame(group)!);
  const myTeam = $derived(teamOf(game, my.id));
  const myTurn = $derived(game.phase === 'turn' && !!myTeam && game.turnTeam === myTeam);
  const needsUnlock = $derived(narrates(game, my.id, group.masterId ?? null) && !app.ui.audioReady && !app.ui.muted);
  const tag = (t: Team) => (t === 'red' ? '🔴' : '🔵');
  const label = (t: Team) => (t === 'red' ? 'Rojo' : 'Azul');
  const crew = (t: Team) => game.teams[t].map((p) => game.names[p] || '¿?').join(', ');
  // Vida como cascos (❤️ enteros, 🤍 perdidos): se lee de un vistazo, sin contar.
  const hearts = (hp: number) => '❤️'.repeat(hp) + '🤍'.repeat(Math.max(0, MAX_HP - hp));
  // Lo que ha cantado cada submarino es PÚBLICO: lo ha oído la sala entera. Aquí
  // va solo lo ÚLTIMO de cada uno, para todos (incluidos los espectadores). La
  // tira entera del rival —la que se usa para triangular— vive numerada en el
  // cuaderno de sonar y no se repite aquí (B29 · un dato, un sitio).
  const arrow = (a: Announce) => (a === 'silence' ? '🤫' : a === 'surface' ? '⏫' : DIR_ARROW[a]);
  const heard = (t: Team) => { const m = game.moves[t]; return m.length ? arrow(m[m.length - 1]) : '—'; };

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>⚓ Captain Sonar</h2>
  <GameMenu {game} {my} />
</div>
<Flash />

{#if needsUnlock}
  <div class="card" style="text-align:center"><span class="moon">🔊</span><h3>Este dispositivo pone la voz</h3>
    <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la voz</button></div>
{/if}
{#if game.paused}
  <div class="card" style="text-align:center"><span class="moon">⏸️</span><h3>Partida en pausa</h3>
    <p class="small-note">La ha pausado {game.paused.name || 'alguien'}. Nadie puede actuar hasta que se reanude desde el menú ⋯.</p></div>
{/if}

<div class="snbar">
  <div class="card">
    <div class="snstatus">
      {#each ['red', 'blue'] as const as t (t)}
        <div class="snteam {game.phase === 'turn' && game.turnTeam === t ? 'active' : ''}">
          <b>{tag(t)} {label(t)}{myTeam === t ? ' (vosotros)' : ''}</b>
          <span class="sncrew">{crew(t)}</span>
          <span class="snhp">{hearts(game.subs[t].hp)} · ⚡ {game.subs[t].energy} de {MAX_ENERGY}</span>
          <!-- La energía es pública: avisar de que a un submarino YA le llega
               para un torpedo evita la sorpresa de «¿podía disparar?». -->
          {#if game.subs[t].energy >= COST_TORPEDO}<span class="snfire">🚀 ya puede disparar</span>{/if}
        </div>
      {/each}
    </div>
    {#if game.phase === 'turn'}
      <!-- De quién es el turno se dice AQUÍ y solo aquí: el panel de abajo ya
           no lo repite, dice qué hacer (B29 · un dato, un sitio). -->
      <p class="snturn" data-a="sn-turn">
        {#if myTurn}🎬 <b>Os toca a vosotros.</b>
        {:else}🎬 Turno del {tag(game.turnTeam)} {label(game.turnTeam)}.
        {/if}
      </p>
    {/if}
    <p class="snheard">🎧 Lo último cantado: {tag('red')} {heard('red')} · {tag('blue')} {heard('blue')}</p>
  </div>
</div>

{#if game.phase === 'end'}
  <EndPhase {game} {my} />
{:else if myTeam}
  <!-- El aviso de «al rival le llega para un torpedo» va DENTRO de la consola,
       en la línea de espera: aquí sería la tercera vez que se dice lo mismo
       (la barra ya lo marca con 🚀 en el submarino que puede disparar). -->
  <CrewConsole {game} team={myTeam} active={myTurn && !game.paused} />
{:else}
  <div class="card">
    <h3>👀 Miráis la partida</h3>
    <p class="small-note" style="margin:0">Sin submarino no hay mapa: las posiciones y las estelas son secretas de cada tripulación. De lo público no os perdéis nada — vida, energía, turno, lo último que cantó cada uno y, abajo, todo lo que ha oído la mesa.</p>
  </div>
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Lo que ha oído la mesa</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="sn-rules" />

<style>
  /* Vida, energía y turno no deberían perderse de vista al bajar al mapa o al
     diario: la tarjeta de estado se queda pegada arriba. Sin fondo propio: lo
     que se desplaza pasa por DEBAJO de la tarjeta (que ya es opaca), así el
     degradado del fondo no se corta con un parche plano. */
  .snbar { position: sticky; top: 0; z-index: 4; margin: 8px 0 4px; }
  .snbar .card { margin: 0; padding: 9px 11px; }
  .snstatus { display: flex; gap: 8px; }
  .snteam { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 7px 9px; border-radius: 10px; border: 1px solid var(--border, #333); font-size: 0.8rem; }
  .snteam.active { border-color: #c8a24a; box-shadow: 0 0 0 1px #c8a24a inset; }
  .snteam b { font-size: 0.85rem; }
  .snhp { font-size: 0.82rem; }
  .snfire { font-size: 0.74rem; color: var(--danger); }
  .sncrew { font-size: 0.7rem; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .snturn { font-size: 0.83rem; color: var(--muted); margin-top: 8px; line-height: 1.4; }
  .snheard { font-size: 0.78rem; color: var(--muted); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
