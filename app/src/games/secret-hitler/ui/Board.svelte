<script lang="ts">
  // Tablero público: los dos marcadores de decretos CON SU CUENTA (2/5, 3/6), la
  // casilla que viene marcada y dicha en texto («el siguiente 🐷 desbloquea 💀
  // Ejecutar»), los gobiernos caídos, el mazo, presidente/canciller, las fichas
  // de la mesa y el DESTAPE de la última votación con nombres (los votos son
  // públicos: son la prueba principal para deducir).
  import { presidentId, playersOf, POWER_LABEL } from '../engine';
  import { powerFor, LIBERAL_TRACK, FASCIST_TRACK, VETO_AT } from '../roles';
  import type { PowerType } from '../roles';
  import type { SHState } from '../types';

  const { game }: { game: SHState } = $props();

  const n = $derived(game.playerIds.length);
  const nm = (pid: string | null) => (pid && game.names[pid]) || '—';
  const POWER_ICON: Record<string, string> = { peek: '🔮', investigate: '🔎', special: '🗳️', execution: '💀' };
  const fascistSlots = $derived([1, 2, 3, 4, 5, 6].map((i) => ({
    i, filled: game.fascistPolicies >= i, next: game.fascistPolicies === i - 1,
    power: i <= 5 ? powerFor(n, i) : null, win: i === 6,
  })));
  const libSlots = $derived([1, 2, 3, 4, 5].map((i) => ({
    i, filled: game.liberalPolicies >= i, next: game.liberalPolicies === i - 1, win: i === 5,
  })));
  const lastEl = $derived(game.lastElection);
  const players = $derived(playersOf(game));
  const pres = $derived(presidentId(game));
  // Qué pasa con el PRÓXIMO decreto de cada color: es lo que todo el mundo
  // pregunta en voz alta y lo que nadie tiene por qué recordar.
  const nextLib = $derived((() => {
    const falta = LIBERAL_TRACK - game.liberalPolicies;
    if (falta <= 0) return '';
    if (falta === 1) return '🏁 El siguiente decreto liberal es el 5.º: con él gana la República.';
    return `🕊️ Faltan ${falta} decretos liberales para que gane la República.`;
  })());
  const nextFas = $derived((() => {
    const i = game.fascistPolicies + 1;
    if (i > FASCIST_TRACK) return '';
    if (i === FASCIST_TRACK) return '🏁 El siguiente decreto fascista es el 6.º: con él ganan los fascistas.';
    const p = powerFor(n, i);
    const veto = i === VETO_AT ? ' y desbloquea el ✋ veto' : '';
    const falta = FASCIST_TRACK - game.fascistPolicies;
    return `🐷 El siguiente decreto fascista (el ${i}.º) ${p ? `da al Presidente ${POWER_LABEL[p]}` : 'no da ningún poder'}${veto}. Faltan ${falta} para la victoria fascista.`;
  })());
  // Leyenda de poderes de ESTA mesa: los iconos del tablero no dicen nada por sí
  // solos en un móvil (no hay tooltip que valga).
  const legend = $derived((() => {
    const out: { nums: number[]; power: PowerType }[] = [];
    for (let i = 1; i <= 5; i++) {
      const p = powerFor(n, i);
      if (!p) continue;
      const prev = out[out.length - 1];
      if (prev && prev.power === p) prev.nums.push(i);
      else out.push({ nums: [i], power: p });
    }
    return out.map((it) => `${it.nums.map((x) => `${x}.º`).join(' y ')} ${POWER_LABEL[it.power]}`);
  })());
</script>

<div class="card shboard">
  <div class="track lib">
    <span class="tlabel">🕊️ Liberal</span>
    <div class="slots">{#each libSlots as s (s.i)}<span class="slot {s.filled ? 'on' : ''} {s.next ? 'next' : ''}">{s.filled ? '🕊️' : s.win ? '🏁' : ''}</span>{/each}</div>
    <span class="tcount" data-a="sh-lib-count">{game.liberalPolicies}/{LIBERAL_TRACK}</span>
  </div>
  <div class="track fas">
    <span class="tlabel">🐷 Fascista</span>
    <div class="slots">{#each fascistSlots as s (s.i)}<span class="slot {s.filled ? 'on' : ''} {s.next ? 'next' : ''}" title={s.power ? POWER_LABEL[s.power] : ''}>{s.filled ? '🐷' : s.win ? '🏁' : s.power ? POWER_ICON[s.power] : ''}</span>{/each}</div>
    <span class="tcount" data-a="sh-fas-count">{game.fascistPolicies}/{FASCIST_TRACK}</span>
  </div>
  <div class="nextbox" data-a="sh-next">
    {#if nextFas}<p>{nextFas}</p>{/if}
    {#if nextLib}<p>{nextLib}</p>{/if}
  </div>
  {#if legend.length}
    <p class="small-note legend" data-a="sh-powers-legend">⚡ Poderes de esta mesa, según el nº de decreto 🐷: {legend.join(' · ')}. Los ejerce el Presidente del gobierno que lo promulgue.</p>
  {/if}
  <div class="shmeta">
    <span>🪙 Presidente: <b>{nm(pres)}</b></span>
    <span>🎩 Canciller: <b>{nm(game.nominatedChancellor)}</b></span>
  </div>
  <div class="shmeta">
    <span class="eltrack">🗳️ Gobiernos caídos: {#each [0, 1, 2] as i (i)}<span class="dot {i < game.electionTracker ? 'on' : ''}"></span>{/each} <b>{game.electionTracker}/3</b></span>
    <span class="small-note" style="margin-top:0">🃏 Mazo: {game.draw.length} · 🗑️ descartes: {game.discard.length}{game.vetoUnlocked ? ' · ✋ veto disponible' : ''}</span>
  </div>
  {#if game.electionTracker >= 1}
    <p class="small-note chaosnote">{game.electionTracker === 2 ? 'Si cae otro gobierno' : 'Al tercer gobierno caído'} el país entra en caos: se promulga a ciegas el decreto de arriba del mazo, sin poder presidencial, y se borran los límites de mandato.</p>
  {/if}
  <div class="pchips" data-a="sh-players">
    {#each players as p (p.id)}
      <span class="pchip {p.alive ? '' : 'dead'}" data-p={p.id}>
        {p.id === pres ? '🪙 ' : ''}{p.id === game.nominatedChancellor ? '🎩 ' : ''}{p.name}{p.alive ? '' : ' 💀'}
      </span>
    {/each}
  </div>
  {#if players.some((p) => !p.alive)}
    <p class="small-note chipkey">💀 = ejecutado: ya no vota ni puede gobernar, y su carta no se destapa hasta el final.</p>
  {/if}
  {#if lastEl}
    <!-- Destape: los votos son públicos y van CON NOMBRE (R1). -->
    <div class="votes" data-a="sh-last-votes">
      <p class="vhead">🗳️ Última votación · 🪙 {nm(lastEl.president)} + 🎩 {nm(lastEl.chancellor)}: {lastEl.passed ? '✅ APROBADO' : '❌ RECHAZADO'}</p>
      <p class="small-note">👍 Ja ({lastEl.ja.length}): <b>{lastEl.ja.length ? lastEl.ja.map(nm).join(', ') : '—'}</b></p>
      <p class="small-note">👎 Nein ({lastEl.nein.length}): <b>{lastEl.nein.length ? lastEl.nein.map(nm).join(', ') : '—'}</b></p>
    </div>
  {/if}
</div>

<style>
  .shboard { padding: 12px 14px; }
  .track { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .tlabel { min-width: 92px; font-weight: 700; font-size: 0.9rem; }
  .tcount { font-size: 0.85rem; font-weight: 700; color: var(--muted); min-width: 30px; text-align: right; }
  .track.lib .tlabel { color: #7fd0ff; }
  .track.fas .tlabel { color: #f3a88a; }
  .slots { display: flex; gap: 5px; flex: 1; }
  .slot {
    flex: 1; aspect-ratio: 1; max-width: 40px; display: flex; align-items: center; justify-content: center;
    border-radius: 8px; background: var(--surface, #1a1c28); border: 1px solid var(--border, #333);
    font-size: 0.95rem; opacity: 0.55;
  }
  .track.lib .slot.on { background: #163247; border-color: #3a86b0; opacity: 1; }
  .track.fas .slot.on { background: #3a1f16; border-color: #b0603a; opacity: 1; }
  /* La casilla que viene: se ve de un vistazo cuál es el próximo decreto. */
  .slot.next { opacity: 1; border-style: dashed; border-color: var(--accent); }
  .nextbox {
    margin: 8px 0 0; padding: 8px 10px; border-radius: var(--r-1);
    background: var(--card2); border: 1px solid var(--border);
    font-size: 0.84rem; line-height: 1.4;
  }
  .nextbox p + p { margin-top: 4px; }
  .legend { margin: 6px 0 0; line-height: 1.35; }
  .chaosnote { margin-top: 4px; line-height: 1.35; }
  .chipkey { margin-top: 5px; }
  .shmeta { display: flex; justify-content: space-between; gap: 8px; font-size: 0.9rem; margin-top: 8px; flex-wrap: wrap; }
  .eltrack { display: inline-flex; align-items: center; gap: 4px; }
  .eltrack .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--border, #444); display: inline-block; }
  .eltrack .dot.on { background: #f3a0a0; }
  .pchips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
  .pchip {
    padding: 3px 8px; border-radius: 999px; font-size: 0.82rem;
    background: var(--surface, #1a1c28); border: 1px solid var(--border, #333);
  }
  .pchip.dead { opacity: 0.45; text-decoration: line-through; }
  .votes { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border, #333); }
  .votes .vhead { margin: 0 0 3px; font-size: 0.88rem; font-weight: 700; }
  .votes .small-note { margin: 1px 0; }
</style>
