<script lang="ts">
  // Puja: los demás suben la apuesta o pasan; el apostador espera. Todo lo que
  // hace falta para decidir está en pantalla —discos en la mesa (el tope),
  // apuesta actual y de quién, y quién sigue vivo en la subasta— y pasar, que
  // es irreversible, pide un segundo toque.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { totalPlaced, placedCount } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const myTurn = $derived(game.turn === my.id);
  const iAmBidder = $derived(game.bid?.by === my.id);
  const max = $derived(totalPlaced(game));
  const cur = $derived(game.bid?.n ?? 0);
  const nm = (pid: string) => game.names[pid] || '¿?';
  const who = (pid: string) => (pid === my.id ? 'tú' : nm(pid));
  const alive = $derived(game.playerIds.filter((pid) => game.alive[pid]));
  // «Sigue en la subasta» = vivo y sin pasar (el apostador incluido: puede
  // volver a subir si le pisan la apuesta).
  const stillIn = $derived(alive.filter((pid) => !game.passed[pid]));
  const gone = $derived(alive.filter((pid) => game.passed[pid]));
  const iPassed = $derived(!!game.passed[my.id]);
  const iBid = $derived(game.playerIds.includes(my.id) && !!game.alive[my.id]);
  const minePlaced = $derived(placedCount(game, my.id));
  let bid = $state(0);
  let askPass = $state(false);
  $effect(() => { const min = cur + 1; if (bid < min) bid = min; if (bid > max) bid = max; });
  // Si cambia la apuesta mientras dudabas, se recoge la confirmación de pasar.
  $effect(() => { void cur; askPass = false; });
</script>

<div class="narration">🗣️ Apuesta actual: <b>{cur}</b> flor{cur === 1 ? '' : 'es'}, de {nm(game.bid?.by || '')}. Le toca pujar a <b>{nm(game.turn)}</b>.</div>

<div class="card skfacts">
  <div class="skf"><span class="skfk">🧮 Discos en la mesa</span><span class="skfv"><b>{max}</b> — es el tope: nadie puede pedir más de {max}</span></div>
  <div class="skf"><span class="skfk">🗣️ Apuesta a batir</span><span class="skfv"><b>{cur}</b> ({nm(game.bid?.by || '')}) — {cur < max ? `para subir hay que decir ${cur + 1} o más` : 'ya está en el tope: no se puede subir'}</span></div>
  <div class="skf"><span class="skfk">🎯 Siguen en la subasta</span><span class="skfv">{stillIn.map(who).join(', ') || '—'}</span></div>
  <div class="skf"><span class="skfk">🤐 Ya han pasado</span><span class="skfv">{gone.map(who).join(', ') || 'nadie todavía'}</span></div>
</div>

{#if myTurn && !iAmBidder}
  <div class="actionpanel">
    <h3>📈 ¿Subes o pasas?</h3>
    <p class="hint">Si te quedas el último sin pasar, <b>levantas tú</b>: empezando por tu pila ({minePlaced} disco{minePlaced === 1 ? '' : 's'}) y siguiendo por las ajenas que elijas.</p>
    {#if cur < max}
      <p class="small-note" style="margin:0 0 4px">Sube a un número entre {cur + 1} y {max}:</p>
      <div class="btnrow" style="flex-wrap:wrap;gap:6px">
        {#each Array.from({ length: max - cur }, (_, i) => cur + 1 + i) as k (k)}
          <button class="small skn {bid === k ? 'primary' : 'ghost'}" data-a="sk-raise-num" data-p={String(k)} onclick={() => (bid = k)}>{k}{k === max ? ' 🔝' : ''}</button>
        {/each}
      </div>
      <p class="small-note" style="margin:10px 0 0">
        ▶️ Te comprometes a levantar <b>{bid}</b> flor{bid === 1 ? '' : 'es'} seguidas sin topar calavera.
        {#if bid >= max}Es el tope: nadie podrá subir y revelas tú, ahora mismo.{/if}
      </p>
      <button class="primary block" style="margin-top:6px" data-a="sk-raise" onclick={() => guard(() => A.raiseBid(bid))}>📈 Subir a {bid} flor{bid === 1 ? '' : 'es'}</button>
    {:else}
      <p class="small-note">La apuesta ya está en el tope ({max}): no se puede subir más, solo pasar.</p>
    {/if}

    {#if !askPass}
      <button class="ghost block" style="margin-top:10px;min-height:44px" data-a="sk-pass-ask" onclick={() => (askPass = true)}>🤐 Pasar (salirme de la subasta)</button>
    {:else}
      <div class="skwarn">
        ⚠️ Pasar es <b>definitivo</b>: no vuelves a pujar en esta ronda pase lo que pase. Si todos pasan, quien levanta es {nm(game.bid?.by || '')}.
      </div>
      <button class="danger block" style="margin-top:8px" data-a="sk-pass" onclick={() => guard(A.passBid)}>🤐 Sí, paso: fuera de la subasta</button>
      <button class="ghost block" style="margin-top:6px" data-a="sk-pass-cancel" onclick={() => (askPass = false)}>↩️ Seguir pujando</button>
    {/if}

    <details class="skref">
      <summary data-a="sk-ref-bid">📖 Cómo funciona la subasta</summary>
      <p class="small-note">Se puja por turnos: subes a un número mayor o pasas. Quien pasa queda fuera de la subasta de esta ronda.</p>
      <p class="small-note">Cuando todos menos uno han pasado —o alguien apuesta el tope—, ese se la juega y levanta discos.</p>
      <p class="small-note">Levanta primero de su propia pila y luego el disco de arriba de las pilas que elija. Si llega a las flores apostadas gana un reto ⭐; si topa una calavera, pierde un disco al azar.</p>
    </details>
  </div>
{:else if iAmBidder}
  <div class="card">
    <p class="hint" style="margin:0">🗣️ Tu apuesta de <b>{cur}</b> flor{cur === 1 ? '' : 'es'} está sobre la mesa. Esperando a {nm(game.turn)}.</p>
    <p class="small-note">Si nadie sube, te toca levantar a ti: primero tu pila ({minePlaced} disco{minePlaced === 1 ? '' : 's'}) y luego las ajenas. Si alguien sube, podrás volver a pujar cuando te llegue el turno.</p>
  </div>
{:else}
  <div class="card">
    <p class="hint" style="margin:0">👀 Esperando la decisión de {nm(game.turn)}: subir de {cur} o pasar.</p>
    <p class="small-note">
      {#if iPassed}🤐 Tú ya pasaste: ves la subasta desde fuera hasta el revelado.
      {:else if iBid}Cuando te llegue el turno podrás subir a partir de {cur + 1} (tope {max}) o pasar.
      {:else}Sigues la subasta desde fuera: no pujas en esta partida.{/if}
    </p>
  </div>
{/if}

<style>
  .skfacts { padding: 10px 14px; }
  .skf { display: flex; gap: 8px; flex-wrap: wrap; padding: 5px 0; border-bottom: 1px solid var(--border, #2c3047); font-size: 0.85rem; }
  .skf:last-child { border-bottom: none; }
  .skfk { min-width: 150px; color: var(--muted, #999); }
  .skfv { flex: 1; min-width: 140px; }
  .skwarn { margin-top: 10px; padding: 10px 12px; border-radius: var(--r-1, 8px); font-size: 0.85rem; color: #f3c2c2; background: color-mix(in srgb, var(--danger, #e0526b) 14%, transparent); border: 1px solid var(--danger, #e0526b); }
  .skn { min-width: 48px; flex: 0 0 auto; min-height: 44px; }
  .skref { margin-top: 12px; border-top: 1px solid var(--border, #2c3047); padding-top: 8px; }
  .skref summary { font-size: 0.85rem; color: var(--muted, #999); cursor: pointer; min-height: 30px; }
</style>
