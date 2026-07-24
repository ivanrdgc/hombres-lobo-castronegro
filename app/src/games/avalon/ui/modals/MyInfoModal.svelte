<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu lealtad (con lo que sabes), la
  // CHULETA con los números de la partida y los roles EN JUEGO. Accesible en
  // cualquier fase: es la única vía de consultar reglas sin salir de la mesa.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { avalonGame } from '../../actions';
  import { ROLES, evilCountFor, teamSizes } from '../../roles';
  import type { RoleId } from '../../roles';
  import RefRows from '../../../../shell/RefRows.svelte';
  import RoleCard from '../RoleCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? avalonGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const n = $derived(game?.playerIds.length ?? 0);
  const rows = $derived(game
    ? [...new Set(Object.values(game.roles))].map((r) => ({
      emoji: ROLES[r as RoleId].emoji,
      name: ROLES[r as RoleId].name,
      note: ROLES[r as RoleId].team === 'good' ? 'Bien' : 'Mal',
      desc: ROLES[r as RoleId].desc,
    }))
    : []);

  // Los números que una mesa novata pregunta a media partida y que hasta ahora
  // solo estaban en el lobby (la ayuda no se abría con la partida en curso).
  const cheats = $derived(game ? [
    {
      emoji: '⚔️', name: 'Cuántos van a cada misión', note: `${n} jugadores`,
      desc: `Misiones 1 a 5: ${teamSizes(n).join(' · ')} caballeros. El líder elige, y puede incluirse.`,
    },
    {
      emoji: '😈', name: 'Cuántos malvados hay', note: `${evilCountFor(n)} de ${n}`,
      desc: `Sale de la tabla oficial, así que lo sabe todo el mundo: ${evilCountFor(n)} malvados y ${n - evilCountFor(n)} leales. Quiénes son, ya es otra cosa.`,
    },
    {
      emoji: '💥', name: 'Cuántos sabotajes hunden una misión',
      desc: n >= 7
        ? 'Uno basta… salvo la CUARTA misión, que con 7 o más jugadores necesita DOS. La app solo dice cuántos hubo, nunca de quién.'
        : 'Uno basta (con menos de 7 jugadores no hay excepción). La app solo dice cuántos hubo, nunca de quién.',
    },
    {
      emoji: '🏰', name: 'El Bien no puede sabotear',
      desc: 'A los leales la app ni siquiera les enseña el botón rojo: si una misión fracasa, el traidor iba dentro. Seguro.',
    },
    {
      emoji: '🗳️', name: 'Los votos son públicos',
      desc: 'Se destapan a la vez y con nombres: quién aprobó y quién rechazó cada equipo. Es la mejor pista de la partida.',
    },
    {
      emoji: '↪️', name: 'Cinco rechazos y gana el Mal',
      desc: 'Si se rechazan cinco propuestas SEGUIDAS en la misma misión, el reino cae en el caos. El contador está en el tablero.',
    },
    {
      emoji: '🗡️', name: 'El Asesino, tras tres éxitos',
      desc: 'Cuando el Bien completa tres misiones aún no ha ganado: el Asesino señala a quien crea Merlín y, si acierta, el Mal se lo lleva todo.',
    },
  ] : []);
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu carta</h3>
  {#if inGame}
    <RoleCard {game} pid={my.id} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="📖 Chuleta: los números" rows={cheats} />
  <RefRows title="🎭 Roles en juego" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
