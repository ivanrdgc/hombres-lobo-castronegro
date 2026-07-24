<script lang="ts">
  // Final: se destapan todas las lealtades, el bando ganador y el porqué.
  // Mientras la mesa lee quién era quién, un toque suelto no puede rebarajar ni
  // borrar la partida: la revancha pide confirmar y terminar pasa por su modal.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ROLES, isEvil } from '../roles';
  import { WIN_LABELS } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const players = $derived(game.playerIds);
  const meId = my.id;
  const inGame = $derived(game.playerIds.includes(my.id));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const rn = (pid: string) => `${ROLES[game.roles[pid]].emoji} ${ROLES[game.roles[pid]].name}`;
  const merlin = $derived(players.find((pid) => game.roles[pid] === 'merlin'));

  // Doble toque en vez de modal: la revancha es frecuente y un modal cansa; lo
  // que hay que evitar es el dedo despistado. Se desarma sola a los 5 s.
  let armed = $state(false);
  $effect(() => {
    if (!armed) return;
    const t = setTimeout(() => (armed = false), 5000);
    return () => clearTimeout(t);
  });
</script>

<div class="narration">🌅 Cae el telón sobre Ávalon: se destapan todas las lealtades.</div>

<div class="card" style="text-align:center">
  <h3 style="margin:6px 0">{game.winner ? WIN_LABELS[game.winner] : ''}</h3>
  {#if game.winReason}<p class="small-note">{game.winReason}</p>{/if}
</div>

<div class="card">
  <h3>🎭 Las lealtades</h3>
  {#each players as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo">
        <div class="sname">{nm(pid)}{pid === meId ? ' (tú)' : ''} {pid === merlin ? '🧙' : ''} {game.assassinTarget === pid ? '🗡️' : ''}</div>
        <div class="sdesc">{isEvil(game.roles[pid]) ? '🗡️' : '🏰'} {rn(pid)}</div>
      </div>
    </div>
  {/each}
  {#if game.assassinTarget}<p class="small-note" style="margin-top:8px">🗡️ El Asesino señaló a <b>{nm(game.assassinTarget)}</b>{game.roles[game.assassinTarget] === 'merlin' ? ' — ¡y era Merlín!' : ' — que no era Merlín.'}</p>{/if}
</div>

{#if inGame}
  <button class="{armed ? 'danger' : 'primary'} block" data-a="av-again"
    onclick={() => { if (!armed) { armed = true; return; } armed = false; guard(A.playAgain); }}>
    {armed ? '🔁 Toca otra vez para repartir de nuevo' : '🔁 Otra partida (mismos jugadores)'}
  </button>
  {#if armed}<p class="small-note" style="text-align:center;margin:2px 0 0">Se borra este resumen y se reparten lealtades nuevas.</p>{/if}
  <button class="ghost block" data-a="av-back-lobby" onclick={() => (app.ui.modal = { type: 'av-end' })}>🏁 Terminar y volver al lobby</button>
{:else}
  <p class="small-note" style="text-align:center">👀 Miras de espectador: la revancha la deciden los que han jugado.</p>
{/if}
