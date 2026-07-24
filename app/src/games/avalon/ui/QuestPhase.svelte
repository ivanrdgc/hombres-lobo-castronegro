<script lang="ts">
  // Misión: cada miembro del equipo juega en secreto Éxito o Fracaso. El Bien
  // solo puede jugar Éxito (la app se lo impide sabotear); el Mal elige. La app
  // baraja las cartas: nadie sabe quién falló, solo cuántos. Cada botón explica
  // qué hace su carta, y al Bien se le dice POR QUÉ tiene el rojo bloqueado.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { isEvil, requiredFails } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const inGame = $derived(game.playerIds.includes(my.id));
  const onTeam = $derived(game.team.includes(my.id));
  const iPlayed = $derived(game.questCards[my.id] !== undefined);
  const amEvil = $derived(inGame && isEvil(game.roles[my.id]));
  const submitted = $derived(game.team.filter((pid) => game.questCards[pid] !== undefined).length);
  const req = $derived(requiredFails(game.playerIds.length, game.quest));
  const nm = (pid: string) => game.names[pid] || '¿?';
  // El equipo es público: decir quién no ha jugado aún no filtra su carta.
  const pend = $derived(game.team.filter((pid) => game.questCards[pid] === undefined).map(nm));
  const mates = $derived(game.team.filter((pid) => pid !== my.id).map(nm));
</script>

<div class="narration">⚔️ Misión {game.quest} en marcha: <b>{game.team.map(nm).join(', ')}</b>. {req === 2 ? 'Esta misión necesita 2 sabotajes para fracasar.' : 'Un solo sabotaje la hace fracasar.'}</div>

<div class="reqbox" data-a="av-quest-what">
  <span class="reqbig">Misión {game.quest} · {game.team.length} en el equipo</span>
  <span class="reqline">{req === 2 ? '💥 Hacen falta DOS cartas de sabotaje para hundirla (una sola no basta).' : '💥 Basta UNA carta de sabotaje para hundirla.'}</span>
  <span class="reqline">La app baraja las cartas: se anunciará cuántos sabotajes hubo, nunca de quién.</span>
</div>

{#if onTeam && !iPlayed}
  <div class="actionpanel"><h3>🎴 Tu carta de misión (secreta)</h3>
    <p class="hint">{mates.length ? `Van contigo: ${mates.join(', ')}.` : 'Vas tú solo a esta misión.'} Nadie sabrá qué carta echó cada uno.</p>
    {#if amEvil}
      <p class="hint">Estás en el Mal: puedes cumplir la misión (y no levantar sospechas) o sabotearla.</p>
      <div class="btnrow">
        <button class="primary" data-a="av-quest" data-p="ok" onclick={() => guard(() => A.questCard(true))}>✅ Éxito</button>
        <button class="danger" data-a="av-quest" data-p="fail" onclick={() => guard(() => A.questCard(false))}>💥 Sabotear</button>
      </div>
      <p class="small-note">✅ <b>Éxito</b>: la misión suma para el Bien, pero te tapa.</p>
      <p class="small-note">💥 <b>Sabotear</b>: {req === 2 ? 'suma un sabotaje; la misión solo cae si otro de los tuyos también sabotea.' : 'la misión FRACASA y el Mal se acerca a ganar… con vosotros dos dentro, sospecharán.'}</p>
    {:else}
      <button class="primary block" data-a="av-quest" data-p="ok" onclick={() => guard(() => A.questCard(true))}>✅ Cumplir la misión</button>
      <!-- El botón rojo se ve, pero bloqueado y con el motivo al lado: sin él,
           un leal no sabía si podía sabotear o si la app se había colgado. -->
      <button class="danger block locked" data-a="av-quest-locked" disabled>💥 Sabotear 🔒</button>
      <p class="small-note">🏰 Eres del Bien: la app no te deja sabotear ni queriendo. Por eso, si esta misión fracasa, el traidor iba dentro del equipo — seguro.</p>
    {/if}
  </div>
{:else if onTeam}
  <div class="card"><p class="hint">✅ Tu carta está echada. Faltan {game.team.length - submitted} del equipo.</p>
    {#if pend.length}<p class="small-note" data-a="av-quest-pending">⏳ Falta{pend.length === 1 ? '' : 'n'} por jugar su carta: <b>{pend.join(', ')}</b>.</p>{/if}</div>
{:else}
  <div class="card"><p class="hint">👀 No vas en esta misión: {submitted}/{game.team.length} cartas jugadas. Nadie fuera del equipo puede hacer nada ahora.</p>
    {#if pend.length}<p class="small-note" data-a="av-quest-pending">⏳ Falta{pend.length === 1 ? '' : 'n'} por jugar su carta: <b>{pend.join(', ')}</b>.</p>{/if}
    <p class="small-note">Mientras tanto: recuerda quién votó a favor de este equipo — si sale mal, ahí está la pista.</p></div>
{/if}
{#if inGame}<RoleCard {game} pid={my.id} mini={true} />{/if}

<style>
  .reqbox {
    display: flex; flex-direction: column; gap: 3px; margin: 10px 0 0;
    border: 1px solid var(--accent, #c8a24a); border-radius: var(--r-2, 14px);
    background: color-mix(in srgb, var(--accent, #c8a24a) 12%, transparent);
    padding: 10px 12px;
  }
  .reqbig { font-size: 1.06rem; font-weight: 700; }
  .reqline { font-size: 0.8rem; color: var(--muted); }
  .locked { margin-top: 8px; opacity: 0.5; }
</style>
