<script lang="ts">
  // El Bien ganó 3 misiones: el Asesino tiene la última palabra. Señala a quien
  // crea Merlín; si acierta, gana el Mal. Solo actúa el Asesino; los demás miran.
  // El tiro se decide con la HISTORIA de la partida delante (quién fue a qué
  // misión, quién propuso, quién votó qué): de memoria era imposible.
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf, assassinId, publicRecord, recordLine } from '../engine';
  import { isEvil } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';
  import AvGrid from './AvGrid.svelte';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const assassin = $derived(assassinId(game));
  const amAssassin = $derived(my.id === assassin);
  // Objetivos: solo el Bien. Los suyos no salen en la rejilla (Merlín nunca
  // está entre ellos), así que no se puede fallar el tiro por descuido.
  const players = $derived(playersOf(game).filter((p) => p.id !== assassin && !isEvil(game.roles[p.id])));
  const key = 'av-assassin';
  const pick = $derived(sel1(key));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const note = (pid: string) => recordLine(publicRecord(game, pid));
  const missions = $derived(game.missions || []);
  const proposals = $derived(game.proposals || []);
</script>

<div class="narration">🗡️ El Bien ha completado tres misiones… pero el Asesino aún puede robar la victoria si encuentra a Merlín.</div>

{#if amAssassin}
  <div class="actionpanel"><h3>🗡️ Tu última bala</h3>
    <p class="hint">Señala a quien creas que es <b>Merlín</b>. Si aciertas, el Mal gana la partida; si fallas, gana el Bien. Solo salen los del Bien: entre ellos está.</p>
    <AvGrid {players} selKey={key} meId={my.id} noteOf={note} />
    <p class="small-note">{pick ? `Vas a acusar a ${nm(pick)}. Toca a otro para cambiar.` : 'Toca un nombre para elegir tu blanco (debajo de cada uno, lo que hizo en la partida): el botón se activa al elegirlo.'}</p>
    <button class="danger block" data-a="av-assassinate" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.assassinate(pick); clearSel(); }) : undefined)}>🗡️ {pick ? `Acusar a ${nm(pick)} de ser Merlín` : 'Señala a Merlín'}</button>

    <details class="avref" open>
      <summary data-a="av-ref">📖 Las misiones que se jugaron</summary>
      <p class="small-note">Merlín suele ser quien empujó los equipos limpios y rechazó los sucios sin explicar del todo por qué.</p>
      {#each missions as m (m.quest)}
        <div class="hrow">
          <b>{m.success ? '✅' : '💥'} Misión {m.quest}</b> · fueron {m.team.map(nm).join(', ')}{m.leaderId ? ` · los propuso ${nm(m.leaderId)}` : ''}{m.fails ? ` · ${m.fails} sabotaje${m.fails === 1 ? '' : 's'}` : ''}
        </div>
      {/each}
      {#if !missions.length}<p class="small-note">Todavía no hay misiones resueltas.</p>{/if}
    </details>
    <details class="avref">
      <summary data-a="av-ref-votes">🗳️ Quién votó qué en cada propuesta ({proposals.length})</summary>
      {#each proposals as p, i (i)}
        <div class="hrow small">
          {p.approved ? '👍 aprobada' : '👎 rechazada'} · M{p.quest ?? '?'} · {nm(p.leaderId)} propuso {p.team.map(nm).join(', ')} — a favor: {p.approvals.length ? p.approvals.map(nm).join(', ') : '—'} · en contra: {p.rejections.length ? p.rejections.map(nm).join(', ') : '—'}
        </div>
      {/each}
      {#if !proposals.length}<p class="small-note">Sin votaciones registradas.</p>{/if}
    </details>
  </div>
{:else}
  <div class="card"><p class="hint">🗡️ El Asesino medita su golpe: busca a Merlín entre vosotros. Nadie más puede hacer nada; si acierta, el Mal gana la partida.</p>
    {#if assassin && game.playerIds.includes(my.id)}<p class="small-note">⏳ Se espera a una sola persona: el Asesino (la app ya sabe quién es). Mientras tanto, ni una palabra de más.</p>{/if}</div>
{/if}

<style>
  .avref { margin-top: 14px; border-top: 1px solid var(--border, #333); padding-top: 8px; }
  .avref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent, #c8a24a); padding: 6px 0; }
  .hrow { font-size: 0.8rem; color: var(--muted); padding: 5px 0; border-bottom: 1px solid var(--border, #2a2f45); line-height: 1.35; }
  .hrow.small { font-size: 0.75rem; }
  .hrow:last-child { border-bottom: none; }
</style>
