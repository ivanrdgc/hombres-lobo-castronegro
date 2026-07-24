<script lang="ts">
  // «🎴 Mi carta y las reglas» (B19/B21/B34): tu lealtad (con lo que sabes), los
  // números de la partida y los roles EN JUEGO. Se abre desde la pastilla
  // flotante, que es la ÚNICA puerta a tu carta una vez empezada la partida:
  // ninguna fase pinta ya su propio «👁 Ver mi carta» en el cuerpo.
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

  // Las reglas que una mesa novata pregunta a media partida y que hasta ahora
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
      desc: 'Los dos botones salen iguales en todos los móviles (si no, se sabría tu bando de reojo), pero si eres leal y tocas el rojo, la app te lo impide. Por eso, si una misión fracasa, el traidor iba dentro. Seguro.',
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
  <!-- El mismo rótulo que la pastilla que abre esto: «Mi carta» y «las reglas»
       (B34: un nombre por cosa; «la chuleta» no existe como tercer nombre). -->
  <h3 style="margin:0 0 4px">🎴 Mi carta</h3>
  {#if inGame}
    <!-- Abrir la pastilla YA es el gesto, así que la carta entra desplegada…
         pero se auto-oculta igual: el modal se queda abierto mientras se
         consultan las reglas y el móvil vuelve a la mesa. -->
    <RoleCard {game} pid={my.id} startOpen={true} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia. Las reglas de abajo sí son para ti.</p>
  {/if}
  <RefRows title="📖 Las reglas: los números de la partida" rows={cheats} />
  <RefRows title="🎭 Las reglas: los roles en juego" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
