<script lang="ts">
  // Turno: elige UNA acción — pista secreta, atacar (dados), descansar o
  // revelarte y usar tu poder. La app valida qué puedes hacer.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { isAlive, charOf } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ShadowHState } from '../types';

  const { game, my }: { game: ShadowHState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const others = $derived(game.playerIds.filter((pid) => pid !== my.id && isAlive(game, pid)));
  const c = $derived(charOf(game, my.id));
  let mode = $state<'menu' | 'pista' | 'attack' | 'reveal'>('menu');
  // Fuka puede elegirse a sí misma como objetivo de su poder.
  const revealTargets = $derived(c.id === 'fuka' ? [my.id, ...others] : others);
</script>

<div class="actionpanel"><h3>🎬 Tu turno: una acción</h3>
  {#if mode === 'menu'}
    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="primary block" data-a="sh-mode-pista" onclick={() => (mode = 'pista')}>🔮 Dar una pista secreta a alguien</button>
      <button class="block" data-a="sh-mode-attack" onclick={() => (mode = 'attack')}>⚔️ Atacar (la app tira los dados)</button>
      <button class="block" data-a="sh-rest" onclick={() => guard(A.rest)}>💊 Descansar (+1 punto de vida)</button>
      <button class="danger block" data-a="sh-mode-reveal" disabled={game.revealed[my.id]}
        onclick={() => { if (c.powerTarget) { mode = 'reveal'; } else { guard(() => A.revealSelf(null)); } }}>
        🎭 {game.revealed[my.id] ? 'Ya estás revelado' : `Revelarte y usar tu poder`}</button>
      {#if !game.revealed[my.id]}<p class="hint" style="margin:2px 0 0">Tu poder ({c.emoji} {c.name}): {c.power}</p>{/if}
    </div>
  {:else if mode === 'pista'}
    <p class="hint">¿A quién le das la pista? La app le enseñará EN SECRETO una carta («si eres X, pierdes/curas 1 punto de vida») y la mesa solo verá el resultado.</p>
    <div class="btnrow" style="flex-wrap:wrap">
      {#each others as pid (pid)}
        <button class="small primary" data-a="sh-pista-target" data-p={pid} onclick={() => { mode = 'menu'; guard(() => A.givePista(pid)); }}>🔮 {nm(pid)}</button>
      {/each}
    </div>
    <button class="ghost block" style="margin-top:8px" data-a="sh-back" onclick={() => (mode = 'menu')}>← Volver</button>
  {:else if mode === 'attack'}
    <p class="hint">¿A quién atacas? La app tira dos dados: el daño es su diferencia (si empatan, fallas).</p>
    <div class="btnrow" style="flex-wrap:wrap">
      {#each others as pid (pid)}
        <button class="small danger" data-a="sh-attack-target" data-p={pid} onclick={() => { mode = 'menu'; guard(() => A.attack(pid)); }}>⚔️ {nm(pid)}</button>
      {/each}
    </div>
    <button class="ghost block" style="margin-top:8px" data-a="sh-back" onclick={() => (mode = 'menu')}>← Volver</button>
  {:else if mode === 'reveal'}
    <p class="hint">Te revelas como {c.emoji} {c.name} ante toda la mesa. {c.power} ¿Sobre quién?</p>
    <div class="btnrow" style="flex-wrap:wrap">
      {#each revealTargets as pid (pid)}
        <button class="small danger" data-a="sh-reveal-target" data-p={pid} onclick={() => { mode = 'menu'; guard(() => A.revealSelf(pid)); }}>🎭 {pid === my.id ? 'Tú mismo' : nm(pid)}</button>
      {/each}
    </div>
    <button class="ghost block" style="margin-top:8px" data-a="sh-back" onclick={() => (mode = 'menu')}>← Volver</button>
  {/if}
</div>
