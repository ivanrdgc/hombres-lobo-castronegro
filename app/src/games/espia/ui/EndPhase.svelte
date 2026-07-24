<script lang="ts">
  // Fin de la ronda, en tres tarjetas: qué ha pasado (con el espía y el lugar
  // ya destapados), el marcador acumulado y la próxima ronda —quién juega,
  // quién se suma y los dos botones que la mesa puede pulsar—.
  import { app, ctxMatch, matchOf } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ESPIA_MIN_PLAYERS, ESPIA_MAX_PLAYERS } from '../engine';
  import { locationById } from '../locations';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';

  const { game }: { game: EspiaState; my: PlayerDoc } = $props();

  const o = $derived(game.outcome);
  const loc = $derived(locationById(game.locationId));
  // La ronda anulada (sin quórum) no la gana nadie: ni espía ni agentes.
  const voided = $derived(o?.type === 'round_void');
  const spyWon = $derived(!!o && ['wrong_accusation', 'spy_guessed', 'spy_survived'].includes(o.type));
  const board = $derived(game.playerIds
    .map((pid) => ({ pid, name: game.names[pid] || pid, pts: game.scores[pid] || 0, delta: o?.delta[pid] || 0 }))
    .sort((a, b) => b.pts - a.pts));
  // Los empates llevan 🥇 los dos (o los tres): coronar solo al primero de la
  // lista era un liderato inventado por el orden de mesa.
  const best = $derived(Math.max(0, ...board.map((r) => r.pts)));

  // ——— Entre rondas: quién juega la siguiente ———
  const tooFew = $derived(game.playerIds.length < ESPIA_MIN_PLAYERS);
  const mid = $derived(ctxMatch()?.id ?? null);
  // Candidatos: gente de la mesa que no juega y está libre (o es el altavoz de
  // ESTA partida, que puede animarse a jugar).
  const candidates = $derived(app.players.filter((p) => {
    if (game.playerIds.includes(p.id)) return false;
    const m = matchOf(p.id);
    return !m || m.id === mid;
  }));
  let adds = $state<string[]>([]);
  const picked = $derived(adds.filter((pid) => candidates.some((p) => p.id === pid)));
  // El botón nombra a quién sienta (B25: el botón dice lo que hace).
  const pickedNames = $derived(picked.map((pid) => candidates.find((p) => p.id === pid)?.name || '¿?').join(', '));
  const roomLeft = $derived(ESPIA_MAX_PLAYERS - game.playerIds.length);
  const nextDealer = $derived(game.names[game.playerIds[game.round % game.playerIds.length]] || '¿?');

  function toggle(pid: string) {
    adds = adds.includes(pid) ? adds.filter((x) => x !== pid) : [...adds, pid];
  }
  function addNow() {
    const pids = picked;
    if (!pids.length) return;
    void guard(async () => { await A.addPlayers(pids); adds = []; });
  }
</script>

{#if o}
  <div class="card" style="text-align:center;border-color:var(--accent)">
    <span class="moon">{voided ? '🚪' : spyWon ? '🕵️' : '🎉'}</span>
    <h3>{voided ? 'Ronda anulada' : spyWon ? 'Gana el espía' : 'Ganan los agentes'}</h3>
    <p style="margin:10px 0">{o.txt}</p>
    <p class="small-note">🕵️ El espía era <b>{game.names[game.spyId] || '¿?'}</b> · 📍 estabais en <b>{loc ? `${loc.emoji} ${loc.name}` : game.locationId}</b>.</p>
  </div>
{/if}

<div class="card">
  <h3>🏆 Marcador</h3>
  <div class="players">
    {#each board as row (row.pid)}
      <div class="player">
        <span class="pname">{row.pts > 0 && row.pts === best ? '🥇 ' : ''}{row.name}{row.pid === game.spyId ? ' 🕵️' : ''}</span>
        <span class="badge">{row.pts} pt{row.pts === 1 ? '' : 's'}{row.delta ? ` (+${row.delta})` : ''}</span>
      </div>
    {/each}
  </div>
  {#if game.history.length > 1}
    <p class="small-note" style="margin-top:10px"><b>Rondas anteriores:</b></p>
    {#each game.history.slice(0, -1).reverse() as h (h.round)}
      <p class="small-note">R{h.round}: {h.txt}</p>
    {/each}
  {/if}
</div>

<div class="card">
  <h3>👥 ¿Quién juega la próxima ronda?</h3>
  <p class="small-note" style="margin-top:0">Sentados <b>{game.playerIds.length}</b>: {game.playerIds.map((pid) => game.names[pid] || pid).join(', ')}{tooFew ? '' : ` · reparte ${nextDealer}`}. Para retirarte: ⋯ → 🚪 Dejar la ronda.</p>
  {#if candidates.length && roomLeft > 0}
    <p class="small-note">Se puede sumar gente (hasta {ESPIA_MAX_PLAYERS}). Añade solo a quien esté delante: si no confirma su carta, la ronda no arranca.</p>
    <div class="players">
      {#each candidates as p (p.id)}
        <div class="player selectable {adds.includes(p.id) ? 'selected' : ''}" data-a="espia-add-pick" data-p={p.id}
          onclick={() => toggle(p.id)} role="button" tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') toggle(p.id); }}>
          <span class="pname">{p.name}</span>
        </div>
      {/each}
    </div>
    <button class="block" data-a="espia-add-players" disabled={!picked.length || picked.length > roomLeft} onclick={addNow}>
      ➕ {picked.length ? `Sentar a ${pickedNames}` : 'Toca arriba a quien se sume'}
    </button>
    {#if picked.length > roomLeft}<p class="small-note">⚠️ Solo caben {roomLeft} más (máximo {ESPIA_MAX_PLAYERS}: 7 papeles y el espía).</p>{/if}
  {:else if roomLeft <= 0}
    <p class="small-note">Mesa llena ({ESPIA_MAX_PLAYERS}): nadie más cabe hasta que alguien deje la ronda.</p>
  {/if}
  {#if tooFew}
    <p class="small-note">⚠️ Sois {game.playerIds.length}: hacen falta {ESPIA_MIN_PLAYERS} para repartir otra vez. Sentad a alguien más… o terminad el juego.</p>
  {/if}
  <button class="primary block" style="margin-top:10px" data-a="espia-next-round" disabled={tooFew} onclick={() => guard(A.nextRound)}>🎴 Repartir la ronda {game.round + 1}</button>
  <button class="ghost block" data-a="espia-end-game" onclick={() => guard(A.endEspia)}>🏳️ Terminar el juego (se cierra el marcador)</button>
</div>
