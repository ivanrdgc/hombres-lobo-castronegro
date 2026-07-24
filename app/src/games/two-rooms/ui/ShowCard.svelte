<script lang="ts">
  // ENSEÑAR MI CARTA — el mecanismo del juego, no una manera de consultarla
  // (B34.2). Consultar tu carta se hace por la pastilla 🎴 y es cosa tuya;
  // esto es un TRATO con otra persona: coges el móvil, se lo pones delante y
  // le enseñas el bando (o el bando y el rol).
  //
  // Por eso la pantalla es a sangre —sin reloj, sin tablero, sin diario, letra
  // legible a un palmo— y, a propósito, NO se apaga sola: enseñar dura lo que
  // dura, y que la carta se esfumara a mitad de intercambio rompía la jugada.
  // Se abre siempre por la cara MENOS comprometida (solo el color): destapar el
  // rol es una segunda decisión, no un descuido.
  import type { TwoRoomsState } from '../types';

  const { game, pid, onclose }: { game: TwoRoomsState; pid: string; onclose: () => void } = $props();
  const team = $derived(game.teams[pid]);
  const role = $derived(game.roles[pid]);
  const teamBig = $derived(team === 'blue' ? '🔵 EQUIPO AZUL' : '🔴 EQUIPO ROJO');
  const roleBig = $derived(role === 'president' ? '🎖️ PRESIDENTE' : role === 'bomber' ? '💣 BOMBARDERO' : '🎴 CARTA NORMAL');

  /** Cara que estás enseñando. */
  let face = $state<'color' | 'full'>('color');
</script>

<div class="trshow" role="dialog" aria-modal="true" aria-label="Enseñando mi carta">
  {#if face === 'color'}
    <div class="trface {team}" data-a="tr-color">
      <span class="showteam">{teamBig}</span>
      <span class="showsub">Solo el bando · el rol no sale en pantalla</span>
    </div>
  {:else}
    <div class="trface {team}" data-a="tr-show-card">
      <span class="showteam">{teamBig}</span>
      <span class="showrole">{roleBig}</span>
      <span class="showsub">Carta entera · bando y rol</span>
    </div>
  {/if}
  <div class="showbar">
    {#if face === 'color'}
      <button class="block" data-a="tr-show-full" onclick={() => (face = 'full')}>🎴 Enseñar también el rol</button>
    {:else}
      <button class="block" data-a="tr-show-color" onclick={() => (face = 'color')}>🎨 Enseñar solo el color</button>
    {/if}
    <button class="primary block" data-a="tr-show-close" onclick={onclose}>✋ Dejar de enseñarla</button>
    <p class="small-note" style="text-align:center;margin:2px 0 0">No se apaga sola: la guardas tú cuando hayáis acabado.</p>
  </div>
</div>

<style>
  .trshow {
    position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; gap: 10px;
    padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px));
    background: var(--bg-0, #0b0c14); overscroll-behavior: contain; touch-action: manipulation;
  }
  .trface {
    flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; text-align: center; border-radius: 18px; border: 3px solid; padding: 16px;
  }
  .trface.blue { background: #12336e; border-color: #6f9bea; color: #eef4ff; }
  .trface.red { background: #5c1526; border-color: #f0778c; color: #ffeef2; }
  /* Tamaños pensados para leerse A UN PALMO y de reojo por el de enfrente. */
  .showteam { font-size: clamp(2rem, 11vw, 3.6rem); font-weight: 900; line-height: 1.05; letter-spacing: 0.01em; }
  .showrole { font-size: clamp(1.4rem, 7.5vw, 2.4rem); font-weight: 800; line-height: 1.1; }
  .showsub { font-size: clamp(0.8rem, 3.4vw, 1rem); opacity: 0.85; }
  .showbar { flex: 0 0 auto; display: flex; flex-direction: column; gap: 8px; }
  .showbar button { margin-top: 0; }
</style>
