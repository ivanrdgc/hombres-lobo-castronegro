<script lang="ts">
  // Panel de tu equipo: tus 4 palabras clave numeradas (solo las ve tu equipo) y
  // la HOJA DE PISTAS de ambos equipos. En el juego físico cada equipo lleva una
  // hoja de 4 filas —una por palabra— y una columna por transmisión, donde va
  // apuntando las pistas: eso es lo que de verdad se deduce. Aquí se pinta igual
  // (fila = número de palabra, columna = ronda), con scroll lateral cuando la
  // partida se alarga y la primera columna anclada para no perder el número.
  import { TEAM_LABEL, cluesForWord } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { DecryptoState } from '../types';

  const { game, my }: { game: DecryptoState; my: PlayerDoc } = $props();
  const team = $derived(game.teams[my.id]);
  // Al acabar se destapa todo: es el momento «ahhh, era Faro».
  const revealed = $derived(game.phase === 'end');
  const sheet = $derived(
    (['red', 'blue'] as const).map((t) => {
      const trans = game.history.filter((h) => h.team === t);
      return {
        t,
        mine: t === team,
        rounds: trans.map((h) => h.round),
        rows: [1, 2, 3, 4].map((n) => ({
          n,
          word: t === team || revealed ? game.words[t][n - 1] : null,
          count: cluesForWord(game, t, n).length,
          cells: trans.map((h) => {
            const j = h.code.indexOf(n);
            return j >= 0 ? h.clues[j] : null;
          }),
        })),
      };
    }),
  );
  const mineCount = (n: number) => (team ? cluesForWord(game, team, n).length : 0);
</script>

{#if team && !revealed}
  <div class="card">
    <h3 style="margin:0 0 6px">🔑 Vuestras palabras ({TEAM_LABEL[team]})</h3>
    <div class="dewords">
      {#each game.words[team] as w, i (i)}
        <div class="deword"><span class="denum">{i + 1}</span><span class="dwtxt">{w}{#if mineCount(i + 1)}<i class="dwc">{mineCount(i + 1)} pista{mineCount(i + 1) > 1 ? 's' : ''} dada{mineCount(i + 1) > 1 ? 's' : ''}</i>{/if}</span></div>
      {/each}
    </div>
    <p class="small-note" style="margin:6px 0 0">Solo tu equipo ve estas palabras. El número de cada una es lo que se transmite.</p>
  </div>
{/if}

{#if game.history.length}
  <div class="card">
    <h3 style="margin:0 0 4px">📻 Hoja de pistas</h3>
    <p class="small-note" style="margin:0 0 8px">Cada fila es un número de palabra; cada columna, una transmisión. Dos pistas del mismo campo en la misma fila delatan la palabra.</p>
    {#each sheet as blk (blk.t)}
      <div class="dhblock" class:mine={blk.mine} data-a="de-sheet" data-p={blk.t} style="--cols:{Math.max(1, blk.rounds.length)}">
        <!-- Con 3 columnas o más la hoja ya no cabe en un móvil: se dice que se
             desliza, que un scroll lateral sin aviso no se descubre. -->
        <div class="dhteam"><span>{TEAM_LABEL[blk.t]}{blk.mine ? ' · vosotros' : ''}</span><i>{blk.rounds.length ? `${blk.rounds.length} transmisión${blk.rounds.length > 1 ? 'es' : ''}${blk.rounds.length >= 3 ? ' · desliza →' : ''}` : 'aún no ha transmitido'}</i></div>
        <div class="dhscroll">
          <div class="dhgrid">
            <div class="dhhead">
              <span class="dhkey">palabra</span>
              {#each blk.rounds as r, i (i)}<span class="dhcol">R{r}</span>{:else}<span class="dhcol">—</span>{/each}
            </div>
            {#each blk.rows as r (r.n)}
              <div class="dhrow" class:hot={r.count > 1}>
                <span class="dhkey"><span class="denum">{r.n}</span>{#if r.word}<span class="dhword">{r.word}</span>{:else}<span class="dhword secret">¿?</span>{/if}</span>
                {#each r.cells as c, i (i)}
                  {#if c}<span class="dhcell" data-a="de-sheet-clue">{c}</span>{:else}<span class="dhcell none">·</span>{/if}
                {:else}
                  <span class="dhcell none">·</span>
                {/each}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/each}
    <details class="dhdet">
      <summary>Ver transmisión a transmisión</summary>
      {#each game.history as h, i (i)}
        <p class="small-note" style="margin:4px 0">{h.team === 'red' ? '🔴' : '🔵'} R{h.round}: {h.clues.join(' · ')} → <b>{h.code.join('-')}</b></p>
      {/each}
    </details>
  </div>
{/if}

<style>
  .dewords { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .deword { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--surface, #1c1e28); font-weight: 700; }
  .deword .dwtxt { flex: 1; min-width: 0; overflow-wrap: break-word; }
  .deword .dwc { display: block; font-size: 0.68rem; font-style: normal; font-weight: 600; opacity: 0.62; }
  .denum { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: 0 0 auto; border-radius: 50%; background: var(--accent, #c8a24a); color: #000; font-size: 0.8rem; font-weight: 800; }

  .dhblock { margin-top: 10px; padding: 8px; border-radius: 12px; border: 1px solid var(--border, #333); background: var(--bg-1, #12141f); }
  .dhblock.mine { border-color: var(--accent, #c8a24a); }
  .dhteam { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 2px 8px; font-size: 0.86rem; font-weight: 800; margin-bottom: 6px; }
  .dhteam span { white-space: nowrap; }
  .dhteam i { font-style: normal; font-size: 0.72rem; font-weight: 600; opacity: 0.68; white-space: nowrap; }
  .dhscroll { overflow-x: auto; overscroll-behavior-x: contain; }
  .dhgrid { min-width: min-content; }
  .dhhead, .dhrow { display: grid; grid-template-columns: 112px repeat(var(--cols), minmax(84px, 1fr)); align-items: center; gap: 6px; }
  .dhhead { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; padding-bottom: 2px; }
  .dhrow { padding: 5px 0; border-top: 1px solid var(--border, #333); }
  .dhrow.hot .dhword { color: var(--moon, #ffd98a); }
  .dhkey { position: sticky; left: 0; z-index: 1; display: flex; align-items: center; gap: 6px; padding-right: 6px; background: var(--bg-1, #12141f); }
  .dhword { font-size: 0.82rem; font-weight: 700; overflow-wrap: anywhere; }
  .dhword.secret { opacity: 0.45; font-weight: 600; }
  .dhcol { text-align: center; }
  .dhcell { font-size: 0.82rem; padding: 3px 8px; border-radius: 999px; border: 1px solid var(--border, #333); background: var(--card2, #222639); text-align: center; overflow-wrap: anywhere; }
  .dhcell.none { border: none; background: none; opacity: 0.3; }
  .dhdet { margin-top: 10px; }
  .dhdet summary { font-size: 0.78rem; opacity: 0.7; cursor: pointer; }
</style>
