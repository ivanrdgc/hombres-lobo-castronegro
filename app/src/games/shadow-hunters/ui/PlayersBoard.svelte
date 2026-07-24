<script lang="ts">
  // Tablero público: quién sigue en pie, cuánta vida le queda, quién se ha
  // destapado y DE QUÉ BANDO. La pastilla lleva el bando escrito («🧛 Vampiro ·
  // 🌑 Sombra»): recordar a qué facción pertenece cada uno de los ocho
  // personajes era justo la información por la que se juega.
  import { CHARS, FACTION_SHORT, factionSummary } from '../chars';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ShadowHState } from '../types';

  const { game, my }: { game: ShadowHState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const charFor = (pid: string) => CHARS[game.chars[pid]];
  const aliveN = $derived(game.playerIds.filter((p) => game.alive[p]).length);
  // «¿Los demás ven mi carta?» era la primera duda de toda mesa nueva: se
  // responde debajo de la lista, y solo mientras tu identidad siga oculta.
  const mineHidden = $derived(game.playerIds.includes(my.id) && !game.revealed[my.id]);
  // Cuántos destapados de cada bando: es información PÚBLICA (al revelarse o al
  // morir se canta el personaje) y es la cuenta que toda la mesa lleva a mano.
  const shown = $derived.by(() => {
    const out = { hunter: 0, shadow: 0, neutral: 0 } as Record<string, number>;
    for (const p of game.playerIds) if (game.revealed[p]) out[charFor(p).faction]++;
    return out;
  });
  const shownTxt = $derived([
    shown.hunter ? `${shown.hunter} 🏹` : '', shown.shadow ? `${shown.shadow} 🌑` : '', shown.neutral ? `${shown.neutral} 🧭` : '',
  ].filter(Boolean).join(' · '));
</script>

<div class="shboard">
  {#each game.playerIds as pid (pid)}
    {@const mine = pid === my.id}
    {@const c = charFor(pid)}
    {@const seen = game.revealed[pid] || mine}
    {@const turno = game.turn === pid && game.phase === 'turn' && game.alive[pid]}
    <div class="shrow {turno ? 'active' : ''} {game.alive[pid] ? '' : 'out'}">
      <div class="shname">
        {game.alive[pid] ? '' : '☠️ '}{nm(pid)}{mine ? ' (tú)' : ''}
        {#if turno}<span class="shtag">🎬 su turno</span>{/if}
        {#if !game.alive[pid]}<span class="shtag">fuera</span>{/if}
      </div>
      <div class="shchar">
        {#if seen && c}
          <span class="shid {game.revealed[pid] ? 'pub' : 'priv'}">{c.emoji} {c.name} · {FACTION_SHORT[c.faction]}{game.revealed[pid] ? '' : ' 🤫'}</span>
        {:else}
          <span class="shid back">❓ sin destapar</span>
        {/if}
      </div>
      <div class="shhp">
        {#if game.alive[pid]}
          <span class="hpnum">❤️ {game.hp[pid]} de {game.maxHp}</span>
          <span class="hpbar"><span class="hpfill" style={`width:${Math.round((game.hp[pid] / game.maxHp) * 100)}%`}></span></span>
        {:else}
          <span class="hpnum">💀 0 de {game.maxHp}</span>
        {/if}
      </div>
    </div>
  {/each}
</div>
<!-- Los números que en la mesa real están a la vista no se memorizan: el
     reparto por número de jugadores (público, como en el juego de mesa), quién
     sigue en pie y cuántos se han destapado ya de cada bando. -->
{#if mineHidden}
  <p class="small-note" style="margin:6px 0 0">🤫 Tu personaje solo lo ves tú: en las demás pantallas sales como «sin destapar».</p>
{/if}
<p class="small-note" style="margin:6px 0 0">{factionSummary(game.playerIds.length)}</p>
<p class="small-note" style="margin:2px 0 0">🧍 En pie: {aliveN} de {game.playerIds.length} · 🎭 Destapados: {shownTxt || 'nadie todavía'}</p>
<p class="small-note" style="margin:2px 0 0">🏹 Los Cazadores ganan cuando no queda ninguna 🌑 Sombra en pie; las Sombras, cuando no queda ningún Cazador. Los 🧭 neutrales tienen su propio objetivo.</p>

<style>
  .shboard { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
  .shrow { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--surface, #1c1e28); flex-wrap: wrap; }
  .shrow.active { border-color: #c8a24a; box-shadow: 0 0 0 1px #c8a24a inset; }
  .shrow.out { opacity: 0.55; }
  .shname { font-size: 0.84rem; font-weight: 700; min-width: 96px; flex: 1; }
  .shtag { font-size: 0.68rem; font-weight: 400; color: var(--muted); border: 1px solid var(--border); border-radius: 6px; padding: 1px 5px; margin-left: 5px; white-space: nowrap; }
  .shchar { display: flex; justify-content: flex-end; }
  .shid { font-size: 0.74rem; padding: 3px 7px; border-radius: 7px; border: 1px solid var(--border, #444); display: inline-block; }
  .shid.back { opacity: 0.6; }
  .shid.priv { background: #1d3a4a; border-color: #3a7ca0; }
  .shid.pub { background: #3a2d1d; border-color: #a0763a; }
  .shhp { font-size: 0.78rem; font-weight: 700; min-width: 84px; text-align: right; margin-left: auto; }
  .hpnum { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .hpbar { display: block; height: 5px; border-radius: 3px; background: var(--bg2, #12141c); border: 1px solid var(--border, #333); margin-top: 3px; overflow: hidden; }
  .hpfill { display: block; height: 100%; background: #c05a5a; }
</style>
