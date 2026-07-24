<script lang="ts">
  // Revelado: quien ganó la puja levanta discos desde el tablero de arriba
  // (primero los suyos, obligatoriamente). Aquí se ve el marcador de la
  // hazaña —flores llevadas, cuántas faltan— y de QUÉ pila toca levantar
  // ahora, que era justo lo que había que adivinar mirando los botones.
  import { flippedFlowers, flipTargets, placedCount, totalPlaced } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const by = $derived(game.reveal?.by || '');
  const need = $derived(game.reveal?.need ?? 0);
  const got = $derived(flippedFlowers(game));
  const iReveal = $derived(by === my.id);
  const nm = (pid: string) => game.names[pid] || '¿?';
  const targets = $derived(flipTargets(game));
  // Discos propios del que revela que aún no ha levantado: mientras queden, la
  // única pila legal es la suya.
  const ownLeft = $derived(
    placedCount(game, by) - (game.reveal?.flipped || []).filter((f) => f.owner === by).length,
  );
  const mustOwn = $derived(ownLeft > 0);
  const left = $derived(totalPlaced(game) - (game.reveal?.flipped || []).length);
  const others = $derived(targets.filter((pid) => pid !== by).map(nm));
</script>

<div class="narration">
  🎲 <b>{nm(by)}</b> se la juega: prometió {need} flor{need === 1 ? '' : 'es'} seguidas sin topar calavera.
</div>

<div class="card skprog">
  <div class="skpips">
    {#each Array.from({ length: need }, (_, i) => i) as i (i)}
      <span class="skpip {i < got ? 'on' : ''}">{i < got ? '🌸' : '⚪'}</span>
    {/each}
  </div>
  <p class="skpt"><b>{got}</b> de {need} flor{need === 1 ? '' : 'es'} · faltan <b>{Math.max(0, need - got)}</b> · quedan {left} disco{left === 1 ? '' : 's'} sin levantar en la mesa</p>
</div>

{#if iReveal}
  <div class="actionpanel">
    <h3>🎲 Te toca levantar</h3>
    {#if mustOwn}
      <p class="hint">👆 <b>Obligatorio empezar por TU pila</b>, de arriba abajo: te quedan {ownLeft} disco{ownLeft === 1 ? '' : 's'} propios. Toca «🃏 Levantar el de arriba de TU pila» en tu fila del tablero (arriba, marcada en rojo).</p>
    {:else}
      <p class="hint">✅ Tu pila ya está levantada entera. Ahora <b>eliges de qué rival sigues</b>: {others.join(', ') || '—'}. Siempre sale el disco de ARRIBA de esa pila. Toca «🃏 Levantar…» en su fila del tablero.</p>
    {/if}
    <p class="small-note">Cada flor 🌸 suma; con {need} ganas el reto ⭐ (dos ⭐ ganan la partida). En cuanto salga una calavera 💀 se acaba: pierdes un disco al azar, puede ser tu propia calavera.</p>
    <details class="skref">
      <summary data-a="sk-ref-reveal">📖 Por qué mi pila va primero</summary>
      <p class="small-note">Quien apuesta se juega lo suyo antes que lo ajeno: por eso esconder tu calavera en tu propia pila también te penaliza a ti.</p>
      <p class="small-note">De las pilas ajenas solo se levanta el disco de arriba, uno cada vez; puedes cambiar de pila entre disco y disco.</p>
    </details>
  </div>
{:else}
  <div class="card">
    <p class="hint" style="margin:0">👀 {nm(by)} {mustOwn ? 'está levantando su propia pila (le quedan ' + ownLeft + ')' : 'ya ha vaciado su pila y ahora va a por las ajenas'}.</p>
    <p class="small-note">
      {targets.includes(my.id) && !iReveal
        ? '⚠️ Tu pila es una de las que puede levantar ahora mismo.'
        : 'Solo levanta el disco de arriba de cada pila. Si sale una calavera, falla y pierde un disco.'}
    </p>
  </div>
{/if}

<style>
  .skprog { padding: 10px 14px; }
  .skpips { display: flex; gap: 4px; flex-wrap: wrap; font-size: 1.3rem; line-height: 1.2; }
  .skpip.on { filter: drop-shadow(0 0 6px color-mix(in srgb, var(--ok, #58b98c) 60%, transparent)); }
  .skpt { margin-top: 6px; font-size: 0.85rem; color: var(--muted, #999); }
  .skref { margin-top: 12px; border-top: 1px solid var(--border, #2c3047); padding-top: 8px; }
  .skref summary { font-size: 0.85rem; color: var(--muted, #999); cursor: pointer; min-height: 30px; }
</style>
