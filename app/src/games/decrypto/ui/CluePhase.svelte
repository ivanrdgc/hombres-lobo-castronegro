<script lang="ts">
  // Fase de pistas: SOLO el encriptador del equipo activo ve el código y escribe
  // las 3 pistas. Cada casilla lleva delante su cifra, SU palabra y lo que el
  // equipo ya dijo para ese número (repetir un campo es lo que regala la palabra
  // al rival). Su equipo y el rival esperan, sabiendo a quién y para qué.
  //
  // Postura (B28): esta es la pantalla más delicada del juego —el código no lo
  // puede ver NI su propio equipo—, así que el código no encabeza el panel: va
  // después de la instrucción, en cifras del tamaño de las de las casillas, y
  // con el aviso de que se mira de cerca. El grito de «no lo enseñes» lo da la
  // tira de postura de arriba.
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
  <div class="actionpanel"><h3>🔐 Encriptas tú: una pista por cifra</h3>
    <p class="hint" style="margin:0 0 8px">En el orden de las cifras. Escríbelas aquí y dilas en voz alta: la pista no puede ser la palabra clave ni un derivado suyo.</p>
    <div class="decodebox" data-a="de-code">
      <span class="dcblab">🙈 Tu código, solo tuyo</span>
      <span class="dcbnums">{#each game.code as d, i (i)}<span class="dn">{d}</span>{/each}</span>
    </div>
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
      onclick={() => guard(() => A.giveClues([cl[0], cl[1], cl[2]]))}>💬 Transmitir las 3 pistas y decirlas en voz alta</button>
    {#if !ready}
      <p class="small-note" style="margin:6px 0 0">Falta{missing.length > 1 ? 'n' : ''} la {missing.join(' y la ')} pista: con las tres se enciende el botón.</p>
    {/if}
  </div>
{:else}
  <div class="narration">🔐 <b>{encName}</b> ({TEAM_LABEL[game.active]}) está preparando las pistas de su código…</div>
  <div class="card"><p class="hint" style="margin:0">
    {#if myTeam === game.active}🤝 Es vuestro encriptador: cuando diga las 3 pistas tendréis que descifrar su código, sin él. Id repasando vuestras 4 palabras, al final de la pantalla.
    {:else if myTeam === other(game.active)}🕵️ Sois el rival: en cuanto las diga intentaréis interceptar. Mientras, repasad en la hoja de pistas (al final de la pantalla) lo que el {TEAM_LABEL[game.active]} ya dijo para cada número.
    {:else}👀 Espectador: verás las pistas en cuanto {encName} las dé (las palabras de los equipos siguen tapadas).{/if}
  </p>
  {#if canRelieve}
    <button class="ghost block" style="margin-top:10px" data-a="de-relieve" onclick={() => guard(A.relieveEncoder)}>🔄 {encName} no puede: que encripte otro</button>
    <p class="small-note" style="margin:6px 0 0">Se reparte un código nuevo (el anterior ya lo ha visto) y encripta el siguiente de vuestro equipo.</p>
  {/if}
  </div>
{/if}

<style>
  /* El código, en las mismas cifras que las casillas de abajo: legible en la
     mano, ilegible desde el otro lado de la mesa. Nada de titular gigante. */
  .decodebox { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; padding: 8px 10px; margin-bottom: 4px; border-radius: 10px; border: 1px dashed color-mix(in srgb, var(--danger, #e0526b) 55%, transparent); background: color-mix(in srgb, var(--danger, #e0526b) 8%, transparent); }
  .dcblab { font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted, #a9a6c0); }
  .dcbnums { display: flex; gap: 5px; margin-left: auto; }
  .declue { border: 1px solid var(--border, #333); border-radius: 12px; padding: 8px 9px 9px; margin: 8px 0; background: color-mix(in srgb, var(--bg-1, #12141f) 70%, transparent); }
  .dchead { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
  .dchead .dcord { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: var(--moon, #ffd98a); }
  .dchead .dcarrow { opacity: 0.6; }
  .dn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: 0 0 auto; border-radius: 50%; background: var(--accent, #c8a24a); color: #000; font-weight: 800; font-size: 0.82rem; }
  .declue .dw { font-size: 0.98rem; font-weight: 800; overflow-wrap: anywhere; }
  .depast { margin: 0 0 6px; font-size: 0.78rem; opacity: 0.78; }
  .dewarn { margin: 6px 0 0; font-size: 0.8rem; color: #f3c2c2; }
  .desay { margin: 10px 0 0; padding: 9px 11px; border-radius: 10px; font-size: 0.86rem; line-height: 1.4; border: 1px solid var(--accent, #c8a24a); background: color-mix(in srgb, var(--accent, #c8a24a) 12%, transparent); }
</style>
