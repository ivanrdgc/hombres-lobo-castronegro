<script lang="ts">
  // Turno: elige UNA acción — investigar (blanco + cuál de sus cartas), armarte,
  // apuntar o disparar. La app valida qué puedes hacer.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { isAlive } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GoodCopState } from '../types';

  const { game, my }: { game: GoodCopState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const others = $derived(game.playerIds.filter((pid) => pid !== my.id && isAlive(game, pid)));
  let mode = $state<'menu' | 'investigate' | 'aim'>('menu');
  let tgt = $state<string | null>(null);
  const targetCards = $derived(tgt ? game.cards[tgt] : []);
</script>

<div class="actionpanel"><h3>🎬 Tu turno: una acción</h3>
  {#if mode === 'menu'}
    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="primary block" data-a="gc-mode-investigate" onclick={() => { mode = 'investigate'; tgt = null; }}>🔍 Investigar una carta ajena (en secreto)</button>
      <button class="block" data-a="gc-arm" disabled={game.armed[my.id]} onclick={() => guard(A.arm)}>🔫 {game.armed[my.id] ? 'Ya vas armado' : 'Armarte (coger pistola)'}</button>
      <button class="block" data-a="gc-mode-aim" disabled={!game.armed[my.id]} onclick={() => { mode = 'aim'; tgt = null; }}>🎯 Apuntar {game.armed[my.id] ? '' : '(necesitas armarte antes)'}</button>
      <button class="danger block" data-a="gc-shoot" disabled={!game.armed[my.id] || !game.aimAt[my.id] || !isAlive(game, game.aimAt[my.id]!)}
        onclick={() => guard(A.shoot)}>💥 Disparar{game.aimAt[my.id] ? ` a ${nm(game.aimAt[my.id]!)}` : ' (apunta primero)'}</button>
    </div>
  {:else if mode === 'investigate'}
    <p class="hint">¿A quién investigas?{tgt ? ` ¿Cuál de sus cartas miras (en secreto)?` : ''}</p>
    <div class="btnrow" style="flex-wrap:wrap">
      {#each others as pid (pid)}
        <button class="small {tgt === pid ? 'primary' : 'ghost'}" data-a="gc-inv-target" data-p={pid} onclick={() => (tgt = pid)}>{nm(pid)}</button>
      {/each}
    </div>
    {#if tgt}
      <div class="btnrow" style="margin-top:6px">
        {#each targetCards as c, i (i)}
          <button class="small {c.up ? 'ghost' : 'primary'}" data-a="gc-inv-card" data-p={String(i)} disabled={c.up}
            onclick={() => { const t = tgt!; mode = 'menu'; guard(() => A.investigate(t, i)); }}>{c.up ? 'destapada' : `carta ${i + 1}`}</button>
        {/each}
      </div>
    {/if}
    <button class="ghost block" style="margin-top:8px" data-a="gc-back" onclick={() => (mode = 'menu')}>← Volver</button>
  {:else if mode === 'aim'}
    <p class="hint">¿A quién apuntas? (la mesa lo verá)</p>
    <div class="btnrow" style="flex-wrap:wrap">
      {#each others as pid (pid)}
        <button class="small danger" data-a="gc-aim-target" data-p={pid} onclick={() => { mode = 'menu'; guard(() => A.aim(pid)); }}>🎯 {nm(pid)}</button>
      {/each}
    </div>
    <button class="ghost block" style="margin-top:8px" data-a="gc-back" onclick={() => (mode = 'menu')}>← Volver</button>
  {/if}
</div>
