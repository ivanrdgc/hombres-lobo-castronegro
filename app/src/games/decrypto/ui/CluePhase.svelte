<script lang="ts">
  // Fase de pistas: SOLO el encriptador del equipo activo ve el código y escribe
  // las 3 pistas. Cada casilla lleva delante su cifra, SU palabra y lo que el
  // equipo ya dijo para ese número (repetir un campo es lo que regala la palabra
  // al rival). Su equipo y el rival esperan, sabiendo a quién y para qué.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { cluesForWord, encoderId, teamMembers, teamOf, other, TEAM_LABEL } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { DecryptoState } from '../types';

  const { game, my }: { game: DecryptoState; my: PlayerDoc } = $props();
  const iEncode = $derived(encoderId(game, game.active) === my.id);
  const encName = $derived(game.names[encoderId(game, game.active)] || '¿?');
  const myTeam = $derived(teamOf(game, my.id));
  const words = $derived(game.words[game.active]);
  const ORD = ['1.ª', '2.ª', '3.ª'];
  // Sin esto el encriptador repite pistas ya dadas sin enterarse (y en Decrypto
  // repetir es justo lo que regala la palabra al rival).
  const rows = $derived([0, 1, 2].map((i) => {
    const n = game.code[i];
    return { i, n, word: words[n - 1], past: cluesForWord(game, game.active, n) };
  }));
  // Relevo: si el móvil del encriptador muere, su equipo puede seguir jugando.
  const canRelieve = $derived(game.teams[my.id] === game.active && !iEncode && teamMembers(game, game.active).length >= 2);
  const cl = $state(['', '', '']);
  const ready = $derived(cl.every((c) => !!c.trim()));
  const missing = $derived([0, 1, 2].filter((i) => !cl[i].trim()).map((i) => ORD[i]));
  // Aviso (no bloquea: lo juzga la mesa) cuando la pista ES la palabra o huele a
  // derivado suyo, que es la falta más común y la que rompe la partida.
  const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/gu, '');
  function warnOf(clue: string, word: string): string | null {
    const c = norm(clue); const w = norm(word);
    if (!c || c.length < 3 || w.length < 4) return null;
    if (c === w) return `«${clue.trim()}» ES la palabra clave: no vale, elige otra.`;
    if (c.startsWith(w.slice(0, 4)) || w.startsWith(c.slice(0, 4))) return `«${clue.trim()}» parece un derivado de «${word}»: tampoco vale.`;
    return null;
  }
</script>

{#if iEncode}
  <div class="actionpanel"><h3>🔐 Eres el encriptador ({TEAM_LABEL[game.active]})</h3>
    <div class="kwbox">
      <span class="kwlabel">Tu código secreto</span>
      <span class="kw">{game.code.join(' - ')}</span>
      <span class="kwhint">Solo lo ves tú. Nadie más, ni los tuyos.</span>
    </div>
    <p class="hint" style="margin:10px 0 4px">Escribe <b>una pista por cifra, en este orden</b>, y dilas también en voz alta. La pista no puede ser la palabra clave ni un derivado suyo.</p>
    {#each rows as r (r.i)}
      {@const warn = warnOf(cl[r.i], r.word)}
      <div class="declue">
        <div class="dchead"><span class="dcord">{ORD[r.i]} pista</span><span class="dcarrow">→</span><span class="dn">{r.n}</span><span class="dw">{r.word}</span></div>
        {#if r.past.length}
          <p class="depast" data-a="de-past-clues">Ya dijisteis para el {r.n}: {r.past.map((p) => `«${p.clue}» (R${p.round})`).join(' · ')}</p>
        {:else}
          <p class="depast">Primera pista que dais para el {r.n}.</p>
        {/if}
        <input class="block" data-a="de-clue-{r.i}" bind:value={cl[r.i]}
          maxlength="30" placeholder="Pista para «{r.word}»" autocomplete="off" />
        {#if warn}<p class="dewarn" data-a="de-clue-warn">⚠️ {warn}</p>{/if}
      </div>
    {/each}
    {#if ready}
      <p class="desay" data-a="de-clue-say">Vas a transmitir <b>{game.code.join('-')}</b>: {rows.map((r) => `«${cl[r.i].trim()}» → ${r.n} ${r.word}`).join(', ')}.</p>
    {/if}
    <button class="primary block" style="margin-top:8px" data-a="de-clue-give" disabled={!ready}
      onclick={() => guard(() => A.giveClues([cl[0], cl[1], cl[2]]))}>💬 Dar las 3 pistas y decirlas en voz alta</button>
    {#if !ready}
      <p class="small-note" style="margin:6px 0 0">Falta{missing.length > 1 ? 'n' : ''} la {missing.join(' y la ')} pista: con las tres se enciende el botón.</p>
    {/if}
  </div>
{:else}
  <div class="narration">🔐 <b>{encName}</b> (equipo {TEAM_LABEL[game.active]}) está preparando las pistas de su código…</div>
  <div class="card"><p class="hint" style="margin:0">
    {#if myTeam === game.active}🤝 Es vuestro encriptador: cuando diga las 3 pistas tendréis que descifrar su código (sin él). Id repasando vuestras 4 palabras de arriba.
    {:else if myTeam === other(game.active)}🕵️ Sois el rival: en cuanto las diga intentaréis interceptar. Mientras, repasad la hoja de pistas del equipo {TEAM_LABEL[game.active]}: lo que ya dijeron para cada número.
    {:else}👀 Espectador: verás las pistas en cuanto {encName} las dé (las palabras de los equipos siguen tapadas).{/if}
  </p></div>
  {#if canRelieve}
    <button class="ghost block" data-a="de-relieve" onclick={() => guard(A.relieveEncoder)}>🔄 {encName} no puede: que encripte otro</button>
    <p class="small-note" style="text-align:center">Se reparte un código nuevo (el anterior ya lo ha visto) y encripta el siguiente de vuestro equipo.</p>
  {/if}
{/if}

<style>
  .declue { border: 1px solid var(--border, #333); border-radius: 12px; padding: 8px 9px 9px; margin: 8px 0; background: color-mix(in srgb, var(--bg-1, #12141f) 70%, transparent); }
  .dchead { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
  .dchead .dcord { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: var(--moon, #ffd98a); }
  .dchead .dcarrow { opacity: 0.6; }
  .declue .dn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: 0 0 auto; border-radius: 50%; background: var(--accent, #c8a24a); color: #000; font-weight: 800; font-size: 0.82rem; }
  .declue .dw { font-size: 0.98rem; font-weight: 800; overflow-wrap: anywhere; }
  .depast { margin: 0 0 6px; font-size: 0.78rem; opacity: 0.78; }
  .dewarn { margin: 6px 0 0; font-size: 0.8rem; color: #f3c2c2; }
  .desay { margin: 10px 0 0; padding: 9px 11px; border-radius: 10px; font-size: 0.86rem; line-height: 1.4; border: 1px solid var(--accent, #c8a24a); background: color-mix(in srgb, var(--accent, #c8a24a) 12%, transparent); }
</style>
