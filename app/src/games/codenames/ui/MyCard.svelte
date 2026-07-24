<script lang="ts">
  // Carta privada: tu equipo y si eres el Jefe de espías o un agente.
  import { teamOf, isSpymaster } from '../engine';
  import type { CodenamesState } from '../types';

  const { game, pid }: { game: CodenamesState; pid: string } = $props();
  const team = $derived(teamOf(game, pid));
  const spy = $derived(isSpymaster(game, pid));
</script>

<div class="rolecard {team === 'red' ? 'red' : 'blue'}">
  <span class="remoji">{spy ? '🕵️' : '🔎'}</span>
  <span class="rname">{spy ? 'Jefe de espías' : 'Agente'} · equipo {team === 'red' ? '🔴 Rojo' : '🔵 Azul'}</span>
  <div class="rdesc">
    {#if spy}Ves el mapa: da pistas de una palabra y un número para que tus agentes toquen VUESTRAS casillas… lejos del asesino. No hagas gestos.
    {:else}No ves el mapa: escucha la pista de tu Jefe y toca las palabras que creas de tu equipo.{/if}
  </div>
</div>

<style>
  .rolecard.red { border-color: #a03a52; box-shadow: 0 0 0 1px #a03a52 inset; }
  .rolecard.blue { border-color: #3a5aa0; box-shadow: 0 0 0 1px #3a5aa0 inset; }
</style>
