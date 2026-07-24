<script lang="ts">
  // Carta PRIVADA: tu bando (azul/rojo), tu rol y tu sala. Peekable para
  // consultarla con disimulo durante la ronda. Además del «todo», tiene el modo
  // SOLO COLOR: en la mesa, enseñar únicamente el bando (sin el rol) es la
  // jugada más habitual del Presidente y de quien negocia sin descubrirse.
  import type { TwoRoomsState } from '../types';

  const { game, pid, mini = false }: { game: TwoRoomsState; pid: string; mini?: boolean } = $props();
  const team = $derived(game.teams[pid]);
  const role = $derived(game.roles[pid]);
  let open = $state(!mini);
  let colorOnly = $state(false);
  function toggle() { if (mini) { open = !open; colorOnly = false; } }
</script>

{#if mini && !open}
  <div style="text-align:center;margin:8px 0"><button class="small ghost" data-a="tr-peek" onclick={toggle}>👁 Ver mi carta</button></div>
{:else if colorOnly}
  <!-- Solo el color: se enseña la pantalla sin descubrir el rol. -->
  <div class="tronly {team}" data-a="tr-color">
    <span class="bigteam">{team === 'blue' ? '🔵 EQUIPO AZUL' : '🔴 EQUIPO ROJO'}</span>
    <span class="onlynote">Solo el bando. Tu rol no sale en pantalla.</span>
  </div>
  <div style="text-align:center;margin:4px 0 8px"><button class="small ghost" data-a="tr-color-back" onclick={() => (colorOnly = false)}>↩️ Volver a mi carta entera</button></div>
{:else}
  <div class="trcard {team}" data-a="tr-card" role="button" tabindex="0" onclick={toggle} onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    <span class="teamline">{team === 'blue' ? '🔵 Equipo AZUL' : '🔴 Equipo ROJO'}</span>
    {#if role === 'president'}
      <span class="rolebig">🎖️ Eres el PRESIDENTE</span>
      <span class="roledesc">Eres el objetivo del Bombardero. Al final debes acabar en una sala distinta a la suya. Los tuyos (azules) te protegen… si te encuentran.</span>
    {:else if role === 'bomber'}
      <span class="rolebig">💣 Eres el BOMBARDERO</span>
      <span class="roledesc">Tu misión: acabar la última ronda en la MISMA sala que el Presidente. Si lo logras, ¡boom!, gana el rojo.</span>
    {:else}
      <span class="rolebig">🎴 Carta normal</span>
      <span class="roledesc">{team === 'blue' ? 'Ayuda a proteger al Presidente y a mantenerlo lejos del Bombardero.' : 'Ayuda a colar al Bombardero en la sala del Presidente.'}</span>
    {/if}
    <span class="roomline">🚪 {game.phase === 'reveal' ? 'Empiezas' : 'Estás'} en la Sala {game.room[pid] + 1}</span>
    {#if mini}<p class="small-note" style="margin:6px 0 0">Solo tú ves esto. Toca para ocultar.</p>{/if}
  </div>
  <div style="text-align:center;margin:0 0 8px"><button class="small ghost" data-a="tr-color-only" onclick={() => (colorOnly = true)}>🎨 Enseñar solo el color</button></div>
{/if}

<style>
  .trcard { display: flex; flex-direction: column; gap: 4px; border-radius: 12px; padding: 12px 14px; margin: 8px 0; border: 1px solid var(--line, #2a2f45); background: var(--card, #171a2b); cursor: pointer; }
  .trcard.blue { border-color: #4a6ba8; box-shadow: 0 0 0 1px #4a6ba8 inset; }
  .trcard.red { border-color: #a84a5a; box-shadow: 0 0 0 1px #a84a5a inset; }
  .teamline { font-weight: 700; }
  .rolebig { font-size: 1.05rem; font-weight: 700; margin-top: 2px; }
  .roledesc { font-size: 0.84rem; color: var(--muted, #97a); }
  .roomline { margin-top: 4px; font-weight: 600; }
  .tronly { display: flex; flex-direction: column; align-items: center; gap: 6px; border-radius: 12px; padding: 34px 14px; margin: 8px 0; border: 2px solid; }
  .tronly.blue { border-color: #4a6ba8; background: #1b2a4a; }
  .tronly.red { border-color: #a84a5a; background: #3a1e28; }
  .bigteam { font-size: 1.5rem; font-weight: 800; letter-spacing: 0.02em; }
  .onlynote { font-size: 0.78rem; color: var(--muted, #97a); }
</style>
