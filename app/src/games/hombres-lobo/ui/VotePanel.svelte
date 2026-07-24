<script lang="ts">
  // Votación del pueblo: UNA lista (el pueblo entero, vivos tocables) y un
  // botón que confirma con nombre — sin modal intermedio. Dos toques.
  // B25/B26: antes de tocar nada se ve QUIÉN decide, QUÉ pesa en el recuento
  // (⭐ Alguacil ×2, 🐦‍⬛ Cuervo +2, 🤪 Tontos sin voto) y qué hacen las dos
  // salidas sin condena; y la referencia del juicio se despliega aquí mismo.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { canRegisterVote } from '../engine';
  import { selIds } from '../../../shell/selection';
  import { cuervoMarkId } from './labels';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import ActionGrid from './ActionGrid.svelte';

  const { group, my, players }: { group: GroupDoc; my: PlayerDoc; players: PlayerDoc[] } = $props();

  const game = $derived(group.game!);
  // El Tonto descubierto no vota, pero SÍ registra (mismo criterio que el
  // motor): negárselo colgaba el día si el Cabeza de Turco lo designaba.
  const canVote = $derived(canRegisterVote(game, my));
  const solo = $derived(game.soloVoteId ? players.find((p) => p.id === game.soloVoteId) : null);
  const key = $derived(`vote:d${game.dayNum}:${game.votesLeft}`);
  const selP = $derived(players.find((p) => p.id === selIds(key)[0]));

  const alive = $derived(players.filter((p) => p.alive));
  const alguacil = $derived(players.find((p) => p.id === game.alguacilId && p.alive));
  // El señalado del Cuervo es PÚBLICO: la voz lo anunció al amanecer.
  const marked = $derived.by(() => {
    const id = cuervoMarkId(game);
    return id ? players.find((p) => p.id === id && p.alive) : undefined;
  });
  const mutedTontos = $derived(players.filter((p) => p.alive && p.revealedTonto));
  const second = $derived(!!game.juezSecondActive);

  function voteNow() {
    const pid = selP?.id;
    if (!pid) return;
    void guard(() => A.castVote(pid));
  }
</script>

{#if !canVote}
  <div class="narration">🗳️ {#if solo}Hoy solo <b>{solo.name}</b> puede registrar la decisión (designado por el Cabeza de Turco).{:else}El pueblo delibera quién morirá hoy…{/if}</div>
{:else}
  <div class="actionpanel"><h3>🗳️ El juicio del pueblo{second ? ' · 2.ª votación' : ''}</h3>
    <p class="hint">Se debate <b>en voz alta</b> y se vota a mano alzada, como en la mesa: la app no cuenta votos, solo <b>anota</b> el resultado. {#if solo}Te ha designado el <b>Cabeza de Turco</b>: hoy solo tú registras la decisión, y es definitiva.{:else}<b>Cualquiera</b> de los {alive.length} vivos puede anotarla, y la primera anotada es definitiva.{/if}{#if my.revealedTonto} 🤪 Recuerda: tú ya no votas, solo <b>anotas</b> lo que decida el pueblo.{/if}</p>
    <!-- Lo público, en pantalla: nadie tiene que acordarse de los modificadores. -->
    <div class="vfacts">
      {#if alguacil}<span class="vfact">⭐ El voto de <b>{alguacil.name}</b> vale <b>doble</b></span>{/if}
      {#if marked}<span class="vfact">🐦‍⬛ <b>{marked.name}</b> arranca con <b>2 votos</b> en contra (Cuervo)</span>{/if}
      {#each mutedTontos as t (t.id)}<span class="vfact">🤪 <b>{t.name}</b> no vota (Tonto al descubierto)</span>{/each}
      {#if second}<span class="vfact">⚖️ Alguien exigió una <b>segunda votación</b>: esta es definitiva</span>{/if}
    </div>
    <ActionGrid {players} selKey={key} showAlguacil={game.alguacilId || null} marked={marked?.id ?? null} />
    {#if selP}
      <div class="vplan">⚖️ Vas a condenar a <b>{selP.name}</b>: se revelará su suerte al momento y no hay vuelta atrás.</div>
    {/if}
    <button class="danger block" data-a="vote-confirm" disabled={!selP} onclick={voteNow}>⚖️ {selP ? `Condenar a ${selP.name}` : 'Condenar al elegido'}</button>
    {#if !selP}<p class="small-note">Toca antes en la lista a quien haya condenado el pueblo.</p>{/if}
    <p class="small-note" style="margin-top:12px">¿El juicio acabó sin condena?</p>
    <div class="btnrow"><button class="ghost" data-a="vote-nadie" onclick={() => guard(() => A.castVote('nadie'))}>🕊️ El pueblo perdona</button><button class="ghost" data-a="vote-empate" onclick={() => guard(() => A.castVote('empate'))}>🤝 Hubo empate</button></div>
    <p class="small-note">🕊️ <b>Perdona</b>: hoy no muere nadie y cae la noche. · 🤝 <b>Empate</b>: nadie se desempata; si hay 🐐 Cabeza de Turco en juego, muere él en lugar de los empatados y decide quién anotará el juicio de mañana.</p>
    <details class="vref">
      <summary data-a="hl-ref-juicio">📖 Cómo funciona el juicio</summary>
      <ol class="howlist">
        <li>Se debate en alto y el pueblo decide a quién condena; el móvil solo <b>registra</b> la decisión.</li>
        <li>⭐ El Alguacil vale por dos votos. 🐦‍⬛ El señalado por el Cuervo empieza con dos votos en contra.</li>
        <li>🤪 El Tonto del Pueblo descubierto ya no vota, pero sigue debatiendo (y puede anotar).</li>
        <li>El condenado muere al instante… salvo sorpresas: el Tonto se salva revelándose y hay cartas que pueden intervenir sin anunciarse.</li>
        <li>Al cerrar el juicio, cualquiera manda al pueblo a dormir con 🌙 Empezar la noche.</li>
      </ol>
    </details>
  </div>
{/if}

<style>
  .vfacts { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 2px; }
  .vfact {
    font-size: 0.78rem; color: var(--text); background: var(--bg2);
    border: 1px solid var(--border); border-radius: var(--r-full); padding: 4px 10px;
  }
  .vplan {
    margin: 10px 0 8px; padding: 10px 12px; border-radius: var(--r-1);
    border: 1px solid var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    font-size: 0.9rem; line-height: 1.4;
  }
  .vref { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 8px; }
  .vref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); min-height: 24px; }
</style>
