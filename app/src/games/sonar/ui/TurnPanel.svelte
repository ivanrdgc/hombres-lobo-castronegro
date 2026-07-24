<script lang="ts">
  // Turno del submarino: navegar (N/S/E/O), torpedo (elige casilla en el mapa),
  // dron, silencio o emerger. La app deshabilita lo ilegal y muestra costes.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { legalDirs, torpedoTargets, COST_TORPEDO, COST_DRONE, COST_SILENCE } from '../engine';
  import { DIR_LABEL, DIR_ARROW, type Cell, type Dir } from '../map';
  import type { SonarState, Team } from '../types';
  import MapGrid from './MapGrid.svelte';

  const { game, team }: { game: SonarState; team: Team } = $props();
  const sub = $derived(game.subs[team]);
  const dirs = $derived(legalDirs(game, team));
  let mode = $state<'menu' | 'torpedo' | 'silence'>('menu');
  const ORDER: Dir[] = ['N', 'W', 'E', 'S'];

  function fire(c: Cell) { mode = 'menu'; guard(() => A.torpedo(c)); }
</script>

<div class="actionpanel"><h3>🎬 Turno de vuestro submarino</h3>
  {#if mode === 'menu'}
    <p class="hint" style="margin-top:0">🧭 Navegar (+1 ⚡, se anuncia el rumbo):</p>
    <div class="btnrow">
      {#each ORDER as d (d)}
        <button class="small {dirs.includes(d) ? 'primary' : 'ghost'}" data-a="sn-move" data-p={d} disabled={!dirs.includes(d)}
          onclick={() => guard(() => A.move(d))}>{DIR_ARROW[d]} {DIR_LABEL[d]}</button>
      {/each}
    </div>
    {#if !dirs.length}<p class="small-note">⛔ Sin rumbos legales: la estela os encierra. Toca emerger.</p>{/if}
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">
      <button class="block danger" data-a="sn-mode-torpedo" disabled={sub.energy < COST_TORPEDO} onclick={() => (mode = 'torpedo')}>🚀 Torpedo ({COST_TORPEDO} ⚡) — casilla a distancia 4</button>
      <button class="block" data-a="sn-drone" disabled={sub.energy < COST_DRONE} onclick={() => guard(A.drone)}>🛰️ Dron ({COST_DRONE} ⚡) — canta su cuadrante</button>
      <button class="block" data-a="sn-mode-silence" disabled={sub.energy < COST_SILENCE || !dirs.length} onclick={() => (mode = 'silence')}>🤫 Silencio ({COST_SILENCE} ⚡) — mover sin anunciar</button>
      <button class="block ghost" data-a="sn-surface" onclick={() => guard(A.surface)}>⏫ Emerger — borra la estela, cantas tu cuadrante</button>
    </div>
  {:else if mode === 'torpedo'}
    <p class="hint">🚀 Toca la casilla del torpedo (🎯 = a tiro). Directo: 2 de daño; pegadas: 1 — ¡la onda también os alcanza a vosotros!</p>
    <MapGrid {sub} {team} targets={torpedoTargets(game, team)} onPick={fire} />
    <button class="ghost block" data-a="sn-back" onclick={() => (mode = 'menu')}>← Volver</button>
  {:else if mode === 'silence'}
    <p class="hint">🤫 ¿Hacia dónde? La mesa solo sabrá que os habéis movido… no el rumbo.</p>
    <div class="btnrow">
      {#each ORDER as d (d)}
        <button class="small {dirs.includes(d) ? 'primary' : 'ghost'}" data-a="sn-silence" data-p={d} disabled={!dirs.includes(d)}
          onclick={() => { mode = 'menu'; guard(() => A.silence(d)); }}>{DIR_ARROW[d]} {DIR_LABEL[d]}</button>
      {/each}
    </div>
    <button class="ghost block" style="margin-top:8px" data-a="sn-back" onclick={() => (mode = 'menu')}>← Volver</button>
  {/if}
</div>
