<script lang="ts">
  // Reparto, en postura 🍽️ MESA (B28): todos los móviles enseñan la MISMA
  // tarjeta neutra y la carta se mira dentro de la cortina de privacidad, que se
  // cierra sola. Antes la carta se desplegaba en la pantalla de la fase, teñida
  // por bando y más larga para los fascistas: el chivato más caro de la partida,
  // porque aquí es cuando todo el mundo mira los móviles de al lado.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { presidentId } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import PrivacySheet from './PrivacySheet.svelte';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const seen = $derived(!!game.seen[my.id]);
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));

  let open = $state(false);

  function memorized() {
    guard(async () => { await A.confirmSeen(); });
    open = false;
  }
</script>

<div class="narration">🏛️ Bandos repartidos. Mirad vuestra carta de uno en uno, con el móvil hacia vosotros.</div>

{#if inGame}
  <div class="actionpanel">
    <h3>🎴 Tu carta está repartida</h3>
    <p class="hint">Coge el móvil, tápalo con la mano y ábrelo: tu bando —y a quién conoces— solo aparece mientras lo miras y se oculta solo. <b>Todos los móviles enseñan esta misma tarjeta</b>, así que de reojo no se deduce nada.</p>
    <button class="primary block" data-a="sh-reveal" onclick={() => (open = true)}>👁 Ver mi carta en secreto</button>
    <p class="why">{seen ? '✅ Ya la has confirmado.' : '⏳ Ábrela y confirma para que empiece la partida.'}{pend.length ? ` Faltan: ${pend.join(', ')}.` : ' Todos listos.'}</p>
  </div>
{:else if pend.length}
  <div class="waitlist">Esperando a que confirmen: {pend.join(', ')}</div>
{/if}

{#if !pend.length}
  <div class="card">
    <h3>🏛️ Preside {game.names[presidentId(game)] || '¿?'}</h3>
    <p class="small-note" style="margin-top:0">Nominará Canciller y la mesa lo votará. Puede empezar cualquiera.</p>
    <button class="primary block" data-a="sh-begin" onclick={() => guard(A.beginGame)}>🏛️ Empezar la primera legislatura</button>
  </div>
{/if}

{#if open}
  <PrivacySheet title="🎴 Tu carta" onclose={() => (open = false)}>
    <RoleCard {game} pid={my.id} />
    {#if !seen}
      <button class="primary block" data-a="sh-seen" onclick={memorized}>✅ Lo he memorizado</button>
    {:else}
      <p class="small-note" style="margin-top:10px">Ya la habías confirmado: repásala y vuelve a ocultarla. El 🎴 de la esquina te la devuelve en cualquier momento.</p>
    {/if}
  </PrivacySheet>
{/if}

<style>
  .why { margin-top: 8px; font-size: 0.8rem; color: var(--muted); line-height: 1.35; }
</style>
