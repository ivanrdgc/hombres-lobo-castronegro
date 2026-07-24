<script lang="ts">
  // El Presidente nomina Canciller entre los elegibles. Cada ficha dice EN
  // TEXTO por qué se puede elegir o por qué no (los límites de mandato no se
  // recuerdan de memoria), y antes de proponer el gobierno se ve en claro qué
  // se va a votar y qué pasa si cae. Los demás ven a quién se espera.
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf, presidentId, eligibleChancellors, aliveCount } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import ShGrid from './ShGrid.svelte';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const pres = $derived(presidentId(game));
  const amPres = $derived(my.id === pres);
  const inGame = $derived(game.playerIds.includes(my.id));
  const eligible = $derived(eligibleChancellors(game));
  const players = $derived(playersOf(game));
  const excluded = $derived(game.playerIds.filter((pid) => !eligible.includes(pid)));
  const alive = $derived(aliveCount(game));
  // Clave de selección propia de ESTA nominación: una marca vieja no puede
  // reaparecer ya elegida en la ronda siguiente.
  const selKey = $derived(`sh-nom:${game.elections}:${pres}`);
  const pick = $derived(sel1(selKey));
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
  const fallen = $derived(game.electionTracker);

  // Motivo, por jugador, de que pueda o no ser Canciller (contrato B25/B26: lo
  // deshabilitado explica por qué, y en pantalla, no en un `title`).
  const why = $derived(Object.fromEntries(game.playerIds.map((pid): [string, string] => {
    if (!game.alive[pid]) return [pid, '💀 Ejecutado: ya no puede gobernar.'];
    if (pid === pres) return [pid, '🪙 Presides tú: no puedes ser tu propio Canciller.'];
    if (pid === game.lastChancellor) return [pid, '🎩 Fue Canciller en el último gobierno electo: no repite.'];
    if (alive > 5 && pid === game.lastPresident) return [pid, `🪙 Fue Presidente en el último gobierno electo: con ${alive} vivos tampoco repite.`];
    return [pid, '✅ Puede ser tu Canciller.'];
  })));
</script>

{#if amPres}
  <div class="actionpanel"><h3>🤝 Nomina Canciller</h3>
    <p class="hint">Presides tú. Elige un Canciller: la mesa votará ese gobierno (🪙 tú + 🎩 quien elijas). Si sale Ja, legisláis los dos en secreto; si sale Nein, el gobierno cae y la presidencia pasa al siguiente.</p>
    {#if game.fascistPolicies >= 3}
      <p class="danger-note" data-a="sh-nom-warn">⚠️ Ya hay {game.fascistPolicies} decretos fascistas: si a quien nombres resulta ser Hitler y la mesa vota Ja, los fascistas GANAN en el acto.</p>
    {/if}
    {#if fallen >= 1}
      <p class="small-note">🗳️ Van <b>{fallen}/3</b> gobiernos caídos: {fallen === 2 ? 'si este también cae, el país entra en caos y se promulga un decreto a ciegas.' : 'al tercero, el país entra en caos.'}</p>
    {/if}
    <ShGrid {players} {selKey} exclude={excluded} presidentId={pres} lastPresidentId={game.lastPresident} lastChancellorId={game.lastChancellor} {why} />
    {#if pick}
      <div class="plan" data-a="sh-nom-plan">
        <p><b>▶️ Vas a proponer:</b> 🪙 {nm(pres)} + 🎩 {nm(pick)}.</p>
        <p class="small-note" style="margin-top:4px">Lo votará toda la mesa. Con mayoría de Ja gobernáis los dos; con empate o mayoría de Nein cae ({fallen + 1}/3 hacia el caos) y presidirá el siguiente.</p>
      </div>
      <button class="ghost block small" style="margin:8px 0" data-a="sh-nom-back" onclick={() => clearSel()}>↩️ Cambiar de candidato</button>
    {/if}
    <button class="primary block" data-a="sh-nominate" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.nominateChancellor(pick); clearSel(); }) : undefined)}>🤝 {pick ? `Proponer gobierno con ${nm(pick)}` : 'Elige Canciller'}</button>
    {#if !pick}<p class="small-note">Toca antes a uno de los candidatos con ✅ (los demás explican por qué no pueden).</p>{/if}
  </div>
{:else}
  <div class="card"><h3>🪙 Preside {nm(pres)}</h3>
    <p class="hint">Está eligiendo Canciller en su móvil. Cuando lo proponga, votaréis todos ese gobierno.</p>
    <p class="small-note">Mientras tanto: repasa el tablero (quién votó qué la última vez) y, si te hace falta, mira tu carta abajo.</p>
  </div>
{/if}
{#if inGame}<RoleCard {game} pid={my.id} mini={true} />{/if}

<style>
  .plan {
    margin-top: 10px; padding: 10px 12px; border-radius: var(--r-2);
    border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--card2));
    font-size: 0.92rem;
  }
  .danger-note {
    margin: 6px 0; padding: 8px 10px; border-radius: 8px; font-size: 0.9rem;
    background: color-mix(in srgb, var(--danger) 16%, var(--bg-1)); border: 1px solid var(--danger);
  }
</style>
