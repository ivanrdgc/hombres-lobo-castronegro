<script lang="ts">
  // Sesión legislativa (secreta): el Presidente ve 3 decretos y DESCARTA uno; el
  // Canciller ve los 2 restantes y PROMULGA uno (con veto si está desbloqueado).
  // Solo el actor de turno ve las cartas; los demás ven un panel neutral.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { presidentId } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const pres = $derived(presidentId(game));
  const chan = $derived(game.nominatedChancellor);
  const inGame = $derived(game.playerIds.includes(my.id));
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
  const ICON = (p: string) => (p === 'liberal' ? '🕊️' : '🐷');
  const LABEL = (p: string) => (p === 'liberal' ? 'Liberal' : 'Fascista');
</script>

{#if game.phase === 'legislativePresident'}
  {#if my.id === pres && game.presidentDraw}
    <div class="actionpanel"><h3>📜 Descarta un decreto</h3>
      <p class="hint">Has robado tres decretos (en secreto). DESCARTA uno; los otros dos pasan al Canciller {nm(chan)}. Nadie verá cuál descartas.</p>
      <div class="policies">
        {#each game.presidentDraw as pol, i (i)}
          <button class="policy {pol}" data-a="sh-pres-discard" data-p={String(i)} onclick={() => guard(() => A.presidentDiscard(i))}>
            <span class="picon">{ICON(pol)}</span><span>{LABEL(pol)}</span><small>Descartar</small>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div class="card"><p class="hint">📜 El Presidente <b>{nm(pres)}</b> estudia tres decretos en secreto…</p></div>
  {/if}
{:else if game.phase === 'legislativeChancellor'}
  {#if my.id === chan && game.chancellorDraw}
    <div class="actionpanel"><h3>📜 Promulga un decreto</h3>
      <p class="hint">El Presidente te pasó dos decretos. PROMULGA uno (el otro se descarta). El decreto promulgado será público; el descarte, no.</p>
      <div class="policies">
        {#each game.chancellorDraw as pol, i (i)}
          <button class="policy {pol}" data-a="sh-chan-enact" data-p={String(i)} onclick={() => guard(() => A.chancellorEnact(i))}>
            <span class="picon">{ICON(pol)}</span><span>{LABEL(pol)}</span><small>Promulgar</small>
          </button>
        {/each}
      </div>
      {#if game.vetoUnlocked && !game.vetoRefused}
        <button class="ghost block" data-a="sh-veto" onclick={() => guard(A.requestVeto)}>✋ Proponer VETO de esta agenda</button>
      {:else if game.vetoUnlocked && game.vetoRefused}
        <p class="hint">✋ Veto rechazado por el Presidente: estás obligado a promulgar.</p>
      {/if}
    </div>
  {:else}
    <div class="card"><p class="hint">📜 El Canciller <b>{nm(chan)}</b> decide qué decreto promulgar…</p></div>
  {/if}
{:else if game.phase === 'vetoDecision'}
  {#if my.id === pres}
    <div class="actionpanel"><h3>✋ Decisión de veto</h3>
      <p class="hint">El Canciller {nm(chan)} propone descartar TODA la agenda. Si aceptas, no se promulga nada y el contador de caos sube. Si rechazas, el Canciller deberá promulgar.</p>
      <div class="btnrow">
        <button class="danger" data-a="sh-veto-yes" onclick={() => guard(() => A.decideVeto(true))}>✋ Aceptar el veto</button>
        <button class="primary" data-a="sh-veto-no" onclick={() => guard(() => A.decideVeto(false))}>📜 Rechazar (que promulgue)</button>
      </div>
    </div>
  {:else}
    <div class="card"><p class="hint">✋ El Canciller propuso vetar: decide el Presidente <b>{nm(pres)}</b>…</p></div>
  {/if}
{/if}
{#if inGame}<RoleCard {game} pid={my.id} mini={true} />{/if}

<style>
  .policies { display: flex; gap: 10px; justify-content: center; margin: 6px 0; }
  .policy {
    flex: 1; max-width: 140px; display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 14px 8px; border-radius: 12px; border: 2px solid var(--border, #333); cursor: pointer;
    font-weight: 700; color: var(--fg, #eee); background: var(--surface, #1a1c28);
  }
  .policy .picon { font-size: 2rem; }
  .policy small { font-weight: 500; color: var(--muted); }
  .policy.liberal { border-color: #3a86b0; background: #12293a; }
  .policy.fascist { border-color: #b0603a; background: #2f1a12; }
</style>
