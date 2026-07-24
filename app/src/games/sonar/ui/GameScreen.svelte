<script lang="ts">
  // Pantalla de partida de «Captain Sonar». Arriba y SIEMPRE a la vista (barra
  // pegajosa) lo público: vida, energía, quién puede ya disparar y de quién es
  // el turno. Debajo, el mapa PROPIO (solo tu tripulación), la tira de rumbos
  // del rival con el cuaderno, y el panel de acción.
  import { app } from '../../../core/sync/store.svelte';
  import { sonarGame, teamOf, rival } from '../actions';
  import { narrates, COST_TORPEDO, MAX_ENERGY, MAX_HP } from '../engine';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import type { Team } from '../types';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import MapGrid from './MapGrid.svelte';
  import Notebook from './Notebook.svelte';
  import TurnPanel from './TurnPanel.svelte';
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

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>⚓ {group.name}</h2>
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
          <span class="snhp">{hearts(game.subs[t].hp)} · ⚡ {game.subs[t].energy} de {MAX_ENERGY}</span>
          <!-- La energía es pública: avisar de que a un submarino YA le llega
               para un torpedo evita la sorpresa de «¿podía disparar?». -->
          {#if game.subs[t].energy >= COST_TORPEDO}<span class="snfire">🚀 ya puede disparar</span>{/if}
          <span class="sncrew">{crew(t)}</span>
        </div>
      {/each}
    </div>
    {#if game.phase === 'turn'}
      <!-- Una línea: quién juega. El «qué podéis ir haciendo mientras» va abajo,
           junto al cuaderno, para no comerse media pantalla con la barra fija. -->
      <p class="snturn" data-a="sn-turn">
        {#if myTurn}🎬 <b>Os toca:</b> elegid una acción abajo.
        {:else}🎬 Turno del {tag(game.turnTeam)} {label(game.turnTeam)}: deciden {crew(game.turnTeam)}.
        {/if}
      </p>
    {/if}
  </div>
</div>

{#if game.phase === 'end'}
  <EndPhase {game} {my} />
{:else}
  {#if myTeam}
    <div class="card">
      <h3>🗺️ Vuestro mapa (solo lo ve tu tripulación)</h3>
      <MapGrid sub={game.subs[myTeam]} team={myTeam} />
    </div>
    <Notebook {game} team={myTeam} />
  {:else}
    <div class="card">
      <h3>👀 Miráis la partida</h3>
      <p class="small-note" style="margin:0">No tripuláis ningún submarino, así que no veis mapas: las posiciones y las estelas son secretas de cada tripulación. Sí veis todo lo público: vida, energía, de quién es el turno y el diario de abajo, donde queda cada rumbo cantado.</p>
    </div>
  {/if}

  {#if myTurn && myTeam}
    <TurnPanel {game} team={myTeam} />
  {:else if myTeam}
    <div class="narration">🎬 Deciden ellos. Mientras, apuntad su último anuncio en el cuaderno y pensad vuestra jugada.</div>
    {#if game.subs[rival(myTeam)].energy >= COST_TORPEDO}
      <p class="small-note" style="text-align:center;margin:6px 0">⚠️ El rival lleva {game.subs[rival(myTeam)].energy} ⚡: le llega para un torpedo 🚀. No os quedéis donde os oyó por última vez.</p>
    {/if}
  {/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario (todo lo que ha oído la mesa)</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="sn-mycard" />

<style>
  /* Vida, energía y turno no deberían perderse de vista al bajar al mapa o al
     diario: la tarjeta de estado se queda pegada arriba. Sin fondo propio: lo que se desplaza pasa por DEBAJO de la tarjeta (que ya
     es opaca), así el degradado del fondo no se corta con un parche plano. */
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
</style>
