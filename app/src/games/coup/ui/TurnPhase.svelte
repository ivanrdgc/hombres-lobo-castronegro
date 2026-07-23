<script lang="ts">
  // Turno de Coup: el jugador de turno elige una acción (y víctima si hace
  // falta). Los demás esperan. Con 10+ monedas, solo el golpe.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ACTIONS } from '../chars';
  import { legalActionTypes, targetsFor, mustCoup, isAlive } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CoupState } from '../types';
  import type { ActionType } from '../types';

  const { game, my }: { game: CoupState; my: PlayerDoc } = $props();
  const turnPid = $derived(game.playerIds[game.turnIdx]);
  const myTurn = $derived(turnPid === my.id && isAlive(game, my.id) && game.playerIds.includes(my.id));
  const turnName = $derived(game.names[turnPid] || '¿?');
  const actions = $derived(myTurn ? legalActionTypes(game, my.id) : []);
  const forced = $derived(myTurn && mustCoup(game, my.id));

  let chosen = $state<ActionType | null>(null);
  let target = $state<string | null>(null);
  const chosenInfo = $derived(chosen ? ACTIONS[chosen] : null);
  const targets = $derived(chosen ? targetsFor(game, my.id, chosen) : []);
  const nm = (pid: string) => game.names[pid] || '¿?';

  function pick(t: ActionType) {
    chosen = t;
    target = ACTIONS[t].needsTarget ? null : null;
  }
  function go() {
    if (!chosen) return;
    if (chosenInfo!.needsTarget && !target) return;
    const t = chosen; const tg = target;
    guard(async () => { await A.act(t, tg); chosen = null; target = null; });
  }
</script>

{#if myTurn}
  <div class="narration">🎯 Es tu turno. Declara tu jugada… di la verdad o farolea.</div>
  {#if forced}<p class="small-note">💰 Tienes 10 o más monedas: estás obligado a dar un golpe de Estado.</p>{/if}

  <div class="actionpanel">
    <div class="acts">
      {#each actions as t (t)}
        <button class="act {chosen === t ? 'sel' : ''}" data-a="coup-action" data-p={t} onclick={() => pick(t)}>
          <span class="ae">{ACTIONS[t].emoji}</span>
          <span class="an">{ACTIONS[t].name}{ACTIONS[t].cost ? ` · 🪙${ACTIONS[t].cost}` : ''}</span>
          <span class="ad">{ACTIONS[t].short}</span>
        </button>
      {/each}
    </div>

    {#if chosenInfo?.needsTarget}
      <h3 style="margin:10px 0 4px">¿A quién?</h3>
      <div class="players">
        {#each targets as pid (pid)}
          <div class="player selectable {target === pid ? 'selected' : ''}" data-a="coup-target" data-p={pid}
            role="button" tabindex="0" onclick={() => (target = pid)} onkeydown={(e) => { if (e.key === 'Enter') target = pid; }}>
            <span class="pname">{nm(pid)}</span>{#if target === pid}<span>✔️</span>{/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if chosen}
      <button class="primary block" data-a="coup-do" disabled={chosenInfo?.needsTarget && !target}
        onclick={go}>{chosenInfo?.emoji} {chosenInfo?.name}{chosenInfo?.needsTarget && target ? ` → ${nm(target)}` : ''}</button>
    {/if}
  </div>
{:else}
  <div class="narration">⏳ Es el turno de <b>{turnName}</b>. A ver qué se atreve a declarar…</div>
{/if}

<style>
  .acts { display: flex; flex-direction: column; gap: 8px; }
  .act {
    display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 10px;
    text-align: left; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line, #2a2f45);
    background: var(--card, #171a2b); color: inherit; cursor: pointer;
  }
  .act.sel { border-color: var(--accent, #d8a24a); box-shadow: 0 0 0 1px var(--accent, #d8a24a) inset; }
  .ae { grid-row: 1 / 3; font-size: 1.5rem; align-self: center; }
  .an { font-weight: 700; }
  .ad { font-size: 0.8rem; color: var(--muted, #97a); }
</style>
