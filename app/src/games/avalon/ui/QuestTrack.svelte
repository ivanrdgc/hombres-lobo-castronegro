<script lang="ts">
  // Tablero público: las 5 misiones (tamaño de equipo + resultado), el marcador
  // Bien/Mal, el contador de propuestas rechazadas y quién lidera ahora. Lo que
  // antes vivía en un `title=` (invisible en un móvil) se toca y se lee: cada
  // misión abre su ficha con el equipo que fue, quién lo propuso y cómo acabó.
  import { teamSize, requiredFails, evilCountFor } from '../roles';
  import { tally, leaderId } from '../engine';
  import type { AvalonState } from '../types';

  const { game }: { game: AvalonState } = $props();

  const n = $derived(game.playerIds.length);
  // Cuántos traidores hay es información PÚBLICA (sale de la tabla oficial),
  // pero en partida solo se veía antes de empezar: sin ella no se puede razonar.
  const evil = $derived(evilCountFor(n));
  const score = $derived(tally(game));
  const quests = $derived([1, 2, 3, 4, 5].map((q) => ({
    q,
    size: teamSize(n, q),
    twoFails: requiredFails(n, q) === 2,
    result: game.results[q - 1] || null,
    current: q === game.quest && game.phase !== 'end',
  })));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const missionOf = (q: number) => (game.missions || []).find((m) => m.quest === q) || null;

  let openQ: number | null = $state(null);
  const open = $derived(openQ === null ? null : quests.find((m) => m.q === openQ) || null);
  const openMission = $derived(openQ === null ? null : missionOf(openQ));
</script>

<div class="card qtrack">
  <div class="qscore"><span class="good">🏰 Bien {score.success}</span><span class="qgoal">3 misiones ganan</span><span class="evil">Mal {score.fail} 🗡️</span></div>
  <div class="qrow">
    {#each quests as m (m.q)}
      <button
        class="qnode {m.result || ''} {m.current ? 'current' : ''} {openQ === m.q ? 'open' : ''}"
        data-a="av-quest-node" data-p={String(m.q)}
        aria-label="Misión {m.q}: equipo de {m.size}"
        onclick={() => (openQ = openQ === m.q ? null : m.q)}
      >
        <span class="qsize">{m.result === 'success' ? '✅' : m.result === 'fail' ? '💥' : m.size}</span>
        {#if m.twoFails && !m.result}<span class="qtwo">2✗</span>{/if}
        <span class="qlabel">M{m.q}</span>
      </button>
    {/each}
  </div>
  <p class="small-note qlegend" style="margin:0">
    Cada casilla es una misión: el número son los caballeros que van (misiones 1 a 5: {[1, 2, 3, 4, 5].map((q) => teamSize(n, q)).join(' · ')}). Tócala para ver su ficha.
  </p>

  {#if open}
    <div class="qdetail" data-a="av-quest-detail">
      <b>Misión {open.q}</b> · equipo de {open.size} · {open.twoFails ? 'necesita 2 sabotajes para fracasar' : 'un sabotaje la hunde'}
      {#if openMission}
        <div>{openMission.success ? '✅ Cumplida' : '💥 Fracasada'} {openMission.fails === 0 ? 'sin ningún sabotaje' : `con ${openMission.fails} sabotaje${openMission.fails === 1 ? '' : 's'}`}.</div>
        <div>Fueron: <b>{openMission.team.map(nm).join(', ')}</b>{openMission.leaderId ? ` · los propuso ${nm(openMission.leaderId)}` : ''}.</div>
      {:else if open.current}
        <div>Es la misión EN CURSO.</div>
      {:else}
        <div>Todavía no se ha jugado.</div>
      {/if}
    </div>
  {/if}

  <div class="qdots" aria-label="Propuestas rechazadas seguidas">
    {#each [0, 1, 2, 3, 4] as i (i)}<span class="dot {i < game.voteTrack ? 'on' : ''} {i === 4 ? 'last' : ''}"></span>{/each}
    <span class="small-note" style="margin-left:6px">↪️ {game.voteTrack}/5 rechazos seguidos{game.voteTrack >= 4 ? ' — otro y gana el Mal' : ''}</span>
  </div>
  <p class="small-note" style="margin:6px 0 0" data-a="av-evil-count">😈 Entre los {n} caballeros hay <b>{evil}</b> malvados.{#if game.phase !== 'end' && game.phase !== 'reveal'} · 🧭 Lidera <b>{nm(leaderId(game))}</b>.{/if}</p>
</div>

<style>
  .qtrack { padding: 12px 14px; }
  .qscore { display: flex; justify-content: space-between; align-items: baseline; font-weight: 700; font-size: 1.05rem; }
  .qscore .good { color: #7fb0ff; }
  .qscore .evil { color: #f3a0a0; }
  .qscore .qgoal { font-size: 0.7rem; font-weight: 400; color: var(--muted); }
  .qrow { display: flex; gap: 8px; justify-content: space-between; margin: 10px 0 6px; }
  .qnode {
    flex: 1; min-height: 56px; max-width: 62px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1px; border-radius: 12px;
    background: var(--surface, #1a1c28); border: 2px solid var(--border, #333);
    font-size: 1.2rem; font-weight: 700; position: relative; padding: 6px 0; color: inherit;
  }
  .qnode.current { border-color: var(--moon, #cfc0ff); box-shadow: 0 0 0 2px var(--moon, #cfc0ff) inset; }
  .qnode.open { outline: 2px solid var(--accent, #c8a24a); }
  .qnode.success { background: #1d3a26; border-color: #3aa564; }
  .qnode.fail { background: #3a1d1d; border-color: #b04a4a; }
  .qtwo { font-size: 0.6rem; color: var(--muted); font-weight: 600; }
  .qlabel { font-size: 0.62rem; font-weight: 600; color: var(--muted); }
  .qlegend { font-size: 0.74rem; }
  .qdetail {
    margin: 8px 0 2px; padding: 9px 11px; border-radius: 10px; font-size: 0.82rem;
    background: color-mix(in srgb, var(--accent, #c8a24a) 12%, transparent);
    border: 1px solid var(--border, #333); line-height: 1.4;
  }
  .qdots { display: flex; align-items: center; gap: 5px; margin-top: 8px; }
  .qdots .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border, #444); }
  .qdots .dot.on { background: #f3a0a0; }
  .qdots .dot.last { outline: 1px solid #b04a4a; }
</style>
