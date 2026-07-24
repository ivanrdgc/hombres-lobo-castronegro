<script lang="ts">
  // Fase de propuesta: el LÍDER elige quiénes van a la misión; los demás miran.
  // Lo que exige ESTA misión (cuántos van, cuántos sabotajes la hunden, cuántos
  // rechazos llevamos) va delante, y cada ficha lleva su historial público: el
  // líder decide con la mesa a la vista, no de memoria.
  import { guard } from '../../../core/sync/guard';
  import { selIds, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf, leaderId, publicRecord, recordLine } from '../engine';
  import { teamSize, teamSizes, requiredFails, evilCountFor } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';
  import AvGrid from './AvGrid.svelte';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const players = $derived(playersOf(game));
  const leader = $derived(leaderId(game));
  const amLeader = $derived(my.id === leader);
  const inGame = $derived(game.playerIds.includes(my.id));
  const n = $derived(game.playerIds.length);
  const size = $derived(teamSize(n, game.quest));
  const req = $derived(requiredFails(n, game.quest));
  const key = $derived(`av-team:q${game.quest}:t${game.voteTrack}`);
  const sel = $derived(selIds(key));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const note = (pid: string) => recordLine(publicRecord(game, pid));
  const left = $derived(size - sel.length);

  function propose() {
    if (sel.length !== size) return;
    void guard(async () => { await A.proposeTeam(sel); clearSel(); });
  }
</script>

{#if amLeader}
  <!-- Lo que exige la misión va DENTRO del panel (B29): antes era una caja
       aparte encima que repetía el número de misión del tablero y empujaba la
       parrilla fuera de la pantalla. -->
  <div class="actionpanel"><h3>🧭 Te toca: forma el equipo</h3>
    <p class="hint" data-a="av-req">A la misión {game.quest} van <b>{size}</b> caballero{size === 1 ? '' : 's'} y {req === 2 ? '💥 necesita DOS sabotajes para fracasar' : '💥 basta UN sabotaje para hundirla'}. Tócalos en la lista (puedes incluirte); luego vota toda la mesa.</p>
    <AvGrid {players} selKey={key} max={size} leaderId={leader} meId={my.id} noteOf={note} />
    {#if sel.length}<p class="small-note" data-a="av-sel-count">{left > 0 ? `Te falta${left === 1 ? '' : 'n'} ${left} por elegir (${sel.length}/${size}).` : `Equipo completo: ${sel.map(nm).join(', ')}. Toca a alguien para quitarlo.`}</p>{/if}
    <button class="primary block" data-a="av-propose" disabled={sel.length !== size} onclick={propose}>⚔️ {sel.length === size ? `Proponer a ${sel.map(nm).join(', ')}` : `Elige a ${size} (${sel.length}/${size})`}</button>
    {#if game.voteTrack}<p class="small-note {game.voteTrack >= 4 ? 'warn' : ''}">↪️ Van <b>{game.voteTrack}/5</b> propuestas rechazadas seguidas{game.voteTrack >= 4 ? ' — si tumban esta, GANA EL MAL' : ''}.</p>{/if}

    <!-- La referencia, DENTRO del panel: nadie debe salir de la pantalla en la
         que está decidiendo. -->
    <details class="avref">
      <summary data-a="av-ref">📖 Cómo elegir (los números de la partida)</summary>
      <p class="small-note">Debajo de cada nombre tienes lo PÚBLICO: en qué misiones estuvo, si alguna se saboteó con él dentro, cuántos equipos propuso y si aprobó o rechazó la última propuesta.</p>
      <p class="small-note">Equipos de las misiones 1 a 5 con {n} jugadores: <b>{teamSizes(n).join(' · ')}</b>. Vas por la {game.quest}.</p>
      <p class="small-note">😈 Hay <b>{evilCountFor(n)}</b> malvados entre los {n}: un solo infiltrado hunde casi cualquier misión{req === 2 ? ', aunque ESTA aguanta un sabotaje (hacen falta dos)' : ''}. Los del Bien no pueden sabotear ni queriendo.</p>
      <p class="small-note">Rechazar es un arma con la mecha corta: cinco propuestas seguidas rechazadas en la misma misión y gana el Mal sin sabotear nada.</p>
    </details>
  </div>
{:else}
  <div class="card">
    <h3>🧭 {nm(leader)} forma el equipo</h3>
    <p class="hint" data-a="av-req">A la misión {game.quest} van <b>{size}</b> caballero{size === 1 ? '' : 's'} y {req === 2 ? '💥 necesita DOS sabotajes para fracasar' : '💥 basta UN sabotaje para hundirla'}.</p>
    <p class="small-note" data-a="av-propose-pending">⏳ Su elección no aparece hasta que la propone. Mientras esperas a <b>{nm(leader)}</b>: repasa el tablero y decide ya si vas a aprobar o rechazar.</p>
    <details class="avref">
      <summary data-a="av-ref">📖 Qué está pasando y qué haré yo</summary>
      <p class="small-note">Cuando {nm(leader)} proponga, votaréis TODOS (vayáis o no en la misión): 👍 aprobar o 👎 rechazar ese equipo. Los votos se destapan a la vez y son públicos.</p>
      <p class="small-note">Equipos de las misiones 1 a 5 con {n} jugadores: <b>{teamSizes(n).join(' · ')}</b>. {req === 2 ? 'Esta misión necesita DOS sabotajes para fracasar.' : 'Un solo sabotaje hunde esta misión.'}</p>
      <p class="small-note">↪️ Van {game.voteTrack} de 5 propuestas rechazadas seguidas: a las cinco, gana el Mal.</p>
    </details>
  </div>
{/if}
<!-- Plegada y con el mismo botón en los 5 móviles: en la mesa, quien mira de
     reojo no puede distinguir una pantalla de otra. -->
{#if inGame}<RoleCard {game} pid={my.id} />{/if}

<style>
  .warn { color: #f3a0a0; }
  .avref { margin-top: 14px; border-top: 1px solid var(--border, #333); padding-top: 8px; }
  .avref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent, #c8a24a); padding: 6px 0; }
</style>
