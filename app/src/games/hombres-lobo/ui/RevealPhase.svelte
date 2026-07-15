<script lang="ts">
  // Fase de reparto (port de revealPhase() de la v1): bienvenida, puerta de
  // revelado y lista de espera hasta que todos confirmen su rol.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { narr } from '../texts/corpus';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import RevealGate from './RevealGate.svelte';
  import RoleCard from './RoleCard.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(group.game!);
  const pend = $derived(app.players.filter((p) => p.inGame && !p.roleSeen));
</script>

<div class="narration">📜 {narr('bienvenida', String(game.seed))}</div>
{#if !my.roleSeen && my.inGame}
  <!-- Tras confirmar: carta oculta al instante y pantalla uniforme para todos. -->
  <RevealGate {group} {my} />
{:else}
  {#if my.inGame}<RoleCard player={my} {group} mini={true} />{/if}
  {#if pend.length}
    <div class="waitlist">Esperando a que confirmen: {pend.map((p) => p.name).join(', ')}</div>
  {:else}
    <div class="card"><h3>🌆 Todos listos</h3>
      <p class="small-note">Cuando terminéis de memorizar cartas y palabras clave, que alguien mande al pueblo a dormir.</p>
      <button class="primary block" data-a="begin-first-night" onclick={() => guard(A.startFirstNight)}>🌙 Empezar la noche</button></div>
  {/if}
{/if}
