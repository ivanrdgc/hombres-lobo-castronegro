<script lang="ts">
  // Resultado de la transmisión: se destapa el código real, pista a pista, y se
  // ve dónde falló cada equipo (cifra a cifra, no solo «4-2-1 ≠ 2-4-1»).
  // Cualquiera pasa al siguiente medio-turno (o al desenlace, si las fichas ya
  // deciden).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { other, pendingWin, teamOf, TEAM_LABEL, TOKENS_TO_WIN } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { DecryptoState } from '../types';

  const { game, my }: { game: DecryptoState; my: PlayerDoc } = $props();
  const last = $derived(game.history[game.history.length - 1]);
  const myTeam = $derived(teamOf(game, my.id));
  // Las palabras siguen siendo secretas para el rival: solo el equipo que acaba
  // de transmitir ve a qué palabra apuntaba cada pista.
  const words = $derived(myTeam === game.active ? game.words[game.active] : null);
  const over = $derived(!!pendingWin(game));
  const ORD = ['1.ª', '2.ª', '3.ª'];
  const okCode = $derived(!!game.decode && game.decode.join('-') === game.code.join('-'));
  const okInter = $derived(!!game.intercept && game.intercept.join('-') === game.code.join('-'));
</script>

<div class="narration">📻 El código del equipo {TEAM_LABEL[game.active]} era <b>{game.code.join(' - ')}</b>.</div>

{#if last}
  <div class="card">
    <h3 style="margin:0 0 6px">🔎 A qué apuntaba cada pista</h3>
    {#each last.clues as c, i (i)}
      <div class="rvrow"><span class="rvord">{ORD[i]} pista</span><b class="rvclue">«{c}»</b><span class="rvarrow">→</span><span class="denum">{game.code[i]}</span>{#if words}<span class="rvword">{words[game.code[i] - 1]}</span>{/if}</div>
    {/each}

    <div class="rvres" class:bad={!okCode}>
      <b>🔓 {TEAM_LABEL[game.active]} descifraba su código:</b>
      {#if okCode}acertó ({game.decode?.join('-')}). Sin fichas.
      {:else}dijo <b>{game.decode?.join('-') || '—'}</b> y era {game.code.join('-')}: <b>+1 ❌ error</b> ({game.tokens[game.active].errors} de {TOKENS_TO_WIN}; con {TOKENS_TO_WIN} pierde).{/if}
    </div>
    <div class="rvres" class:good={okInter}>
      <b>🕵️ {TEAM_LABEL[other(game.active)]} interceptaba:</b>
      {#if !game.intercept}en la primera transmisión de cada equipo todavía no se puede interceptar.
      {:else if okInter}¡acertó ({game.intercept.join('-')})! <b>+1 🕵️ intercepción</b> ({game.tokens[other(game.active)].intercepts} de {TOKENS_TO_WIN}; con {TOKENS_TO_WIN} gana).
      {:else}apostó <b>{game.intercept.join('-')}</b> y no era: sin fichas (fallar interceptando no cuesta nada).{/if}
    </div>
  </div>
{/if}

<button class="primary block" data-a="de-next" onclick={() => guard(A.nextTransmission)}>
  {over ? '🏁 Ver el desenlace' : `▶️ Siguiente transmisión: transmite el ${TEAM_LABEL[other(game.active)]}`}
</button>
<p class="small-note" style="text-align:center">Lo puede pulsar cualquiera, cuando todos hayáis visto el resultado.</p>

<style>
  .rvrow { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 5px 0; border-top: 1px solid var(--border, #333); }
  .rvrow:first-of-type { border-top: none; }
  .rvord { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: var(--moon, #ffd98a); }
  .rvclue { font-size: 0.95rem; overflow-wrap: anywhere; }
  .rvarrow { opacity: 0.55; }
  .rvword { font-size: 0.88rem; font-weight: 700; }
  .denum { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: 0 0 auto; border-radius: 50%; background: var(--accent, #c8a24a); color: #000; font-size: 0.8rem; font-weight: 800; }
  .rvres { margin-top: 8px; padding: 8px 10px; border-radius: 10px; font-size: 0.84rem; line-height: 1.45; border: 1px solid var(--border, #333); background: var(--bg-1, #12141f); }
  .rvres.bad { border-color: color-mix(in srgb, var(--danger, #e0526b) 55%, transparent); }
  .rvres.good { border-color: color-mix(in srgb, var(--accent, #c8a24a) 65%, transparent); }
</style>
