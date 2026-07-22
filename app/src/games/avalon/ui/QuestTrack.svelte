<script lang="ts">
  // Tablero público: las 5 misiones (tamaño de equipo + resultado), el marcador
  // Bien/Mal, el contador de propuestas rechazadas y quién lidera ahora.
  import { teamSize, requiredFails } from '../roles';
  import { tally, leaderId } from '../engine';
  import type { AvalonState } from '../types';

  const { game }: { game: AvalonState } = $props();

  const n = $derived(game.playerIds.length);
  const score = $derived(tally(game));
  const quests = $derived([1, 2, 3, 4, 5].map((q) => ({
    q,
    size: teamSize(n, q),
    twoFails: requiredFails(n, q) === 2,
    result: game.results[q - 1] || null,
    current: q === game.quest && game.phase !== 'end',
  })));
  const nm = (pid: string) => game.names[pid] || '¿?';
</script>

<div class="card qtrack">
  <div class="qscore"><span class="good">🏰 Bien {score.success}</span><span class="evil">Mal {score.fail} 🗡️</span></div>
  <div class="qrow">
    {#each quests as m (m.q)}
      <div class="qnode {m.result || ''} {m.current ? 'current' : ''}" title="Misión {m.q}: equipo de {m.size}{m.twoFails ? ' · pide 2 sabotajes' : ''}">
        <span class="qsize">{m.result === 'success' ? '✅' : m.result === 'fail' ? '💥' : m.size}</span>
        {#if m.twoFails && !m.result}<span class="qtwo">2✗</span>{/if}
      </div>
    {/each}
  </div>
  <div class="qdots" aria-label="Propuestas rechazadas seguidas">
    {#each [0, 1, 2, 3, 4] as i (i)}<span class="dot {i < game.voteTrack ? 'on' : ''} {i === 4 ? 'last' : ''}"></span>{/each}
    <span class="small-note" style="margin-left:6px">rechazos {game.voteTrack}/5</span>
  </div>
  {#if game.phase !== 'end' && game.phase !== 'reveal'}
    <p class="small-note" style="margin:6px 0 0">🧭 Lidera <b>{nm(leaderId(game))}</b>.</p>
  {/if}
</div>

<style>
  .qtrack { padding: 12px 14px; }
  .qscore { display: flex; justify-content: space-between; font-weight: 700; font-size: 1.05rem; }
  .qscore .good { color: #7fb0ff; }
  .qscore .evil { color: #f3a0a0; }
  .qrow { display: flex; gap: 8px; justify-content: space-between; margin: 10px 0 6px; }
  .qnode {
    flex: 1; aspect-ratio: 1; max-width: 56px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; border-radius: 12px;
    background: var(--surface, #1a1c28); border: 2px solid var(--border, #333);
    font-size: 1.2rem; font-weight: 700; position: relative;
  }
  .qnode.current { border-color: var(--moon, #cfc0ff); box-shadow: 0 0 0 2px var(--moon, #cfc0ff) inset; }
  .qnode.success { background: #1d3a26; border-color: #3aa564; }
  .qnode.fail { background: #3a1d1d; border-color: #b04a4a; }
  .qtwo { font-size: 0.6rem; color: var(--muted); font-weight: 600; }
  .qdots { display: flex; align-items: center; gap: 5px; margin-top: 4px; }
  .qdots .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border, #444); }
  .qdots .dot.on { background: #f3a0a0; }
  .qdots .dot.last { outline: 1px solid #b04a4a; }
</style>
