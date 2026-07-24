<script lang="ts">
  // Fin de la ronda: desenlace, puntos, marcador acumulado e historial. Entre
  // rondas la mesa también se recompone: quien llega puede sentarse y quien se
  // va usa ⋯ → Dejar la ronda.
  import { app, ctxMatch, matchOf } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ESPIA_MIN_PLAYERS, ESPIA_MAX_PLAYERS } from '../engine';
  import { locationById } from '../locations';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import LugaresGrid from './LugaresGrid.svelte';

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
  const roomLeft = $derived(ESPIA_MAX_PLAYERS - game.playerIds.length);

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
    <h3>{voided ? 'Ronda anulada' : spyWon ? 'El espía gana la ronda' : 'Los agentes ganan la ronda'}</h3>
    <p style="margin:10px 0">{o.txt}</p>
    <p class="small-note">El espía era <b>{game.names[game.spyId] || '¿?'}</b> · el lugar, <b>{loc ? `${loc.emoji} ${loc.name}` : game.locationId}</b>.</p>
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
  <h3>📍 El lugar era…</h3>
  <LugaresGrid reveal={game.locationId} />
</div>

<div class="card">
  <h3>🪑 La mesa de la próxima ronda</h3>
  <p class="small-note" style="margin-top:0">Juegan <b>{game.playerIds.length}</b>: {game.playerIds.map((pid) => game.names[pid] || pid).join(', ')}. Quien quiera retirarse, ⋯ → 🚪 Dejar la ronda.</p>
  {#if candidates.length && roomLeft > 0}
    <p class="small-note">Entre rondas se puede sumar gente (hasta {ESPIA_MAX_PLAYERS}). Añade solo a quien esté delante: si no confirma su carta, la ronda no arranca.</p>
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
      ➕ {picked.length ? `Sentar a ${picked.length} en la próxima ronda` : 'Sentar a alguien en la próxima ronda'}
    </button>
    {#if picked.length > roomLeft}<p class="small-note">⚠️ Solo caben {roomLeft} más (máximo {ESPIA_MAX_PLAYERS}: 7 papeles y el espía).</p>{/if}
  {:else if roomLeft <= 0}
    <p class="small-note">Mesa llena ({ESPIA_MAX_PLAYERS} jugadores): nadie más cabe hasta que alguien deje la ronda.</p>
  {:else}
    <p class="small-note">Nadie más libre en la mesa. Quien llegue ahora tiene que entrar en la mesa (y no estar en otra partida) para poder sentarse aquí.</p>
  {/if}
</div>

<div class="card">
  {#if tooFew}
    <p class="small-note" style="margin-top:0">⚠️ Sois {game.playerIds.length}: El Espía necesita {ESPIA_MIN_PLAYERS} para otra ronda. Sentad a alguien más… o terminad el juego.</p>
  {/if}
  <button class="primary block" data-a="espia-next-round" disabled={tooFew} onclick={() => guard(A.nextRound)}>▶️ Otra ronda{tooFew ? '' : ` (reparte ${game.names[game.playerIds[(game.round) % game.playerIds.length]] || '¿?'})`}</button>
  <button class="ghost block" data-a="espia-end-game" onclick={() => guard(A.endEspia)}>🏁 Terminar el juego</button>
</div>
