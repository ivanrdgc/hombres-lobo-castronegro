<script lang="ts">
  // Modo manual: el máster dirige la partida al estilo clásico.
  // Port de manualScreen() + manualMasterPanel() de la v1 (public/js/ui.js).
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { ROLES } from '../roles';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import PhaseChip from './PhaseChip.svelte';
  import LogPanel from './LogPanel.svelte';
  import PlayersGrid from './PlayersGrid.svelte';
  import RevealGate from './RevealGate.svelte';
  import RoleCard from './RoleCard.svelte';
  import EndPhase from './EndPhase.svelte';
  import GameMenu from './GameMenu.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(group.game!);
  const master = $derived(isMaster());
  const players = $derived(app.players.filter((p) => p.inGame));

  function openManualPlayer(pid: string) {
    app.ui.modal = { type: 'manual-player', pid };
  }
</script>

{#if game.phase === 'end'}
  <div class="topbar"><h2>{group.name}</h2><PhaseChip game={game} /></div>
  <EndPhase group={group} my={my} />
  <LogPanel game={game} />
{:else if !master && !my.inGame}
  <!-- Espectador: dispositivo que no juega ni narra (spectatorScreen de la v1). -->
  <div class="topbar"><h2>{group.name}</h2><span class="chip">🌙 En curso</span></div>
  <div class="card" style="text-align:center">
    <span class="moon">🌙</span>
    <h3>Hay una partida en curso</h3>
    <p class="small-note">Este dispositivo no participa. La pantalla cambiará sola cuando termine.</p>
  </div>
{:else}
  <div class="topbar"><h2>{group.name}</h2><PhaseChip game={game} /><GameMenu group={group} /></div>
  <Flash />
  {#if master}
    <div class="card">
      <h3>🎩 Panel del narrador</h3>
      <p class="small-note">Tú diriges la partida al estilo clásico. Toca un jugador para: marcarlo muerto o vivo, enseñar su rol a pantalla completa, marcar enamorados o aplicar el cambio del Ladrón.</p>
    </div>
    <div class="card"><h3>👥 Jugadores y roles</h3>
      <div class="players">
        {#each players as p (p.id)}
          <div
            class="player selectable {p.alive === false ? 'dead' : ''}"
            data-a="manual-player"
            data-p={p.id}
            onclick={() => openManualPlayer(p.id)}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') openManualPlayer(p.id); }}
          >
            <span>{p.role ? ROLES[p.role].emoji : '❔'}</span>
            <span class="pname">{p.name}<br /><small style="color:var(--muted)">{p.role ? ROLES[p.role].name : ''}</small></span>
            {#if p.lover}<span>💘</span>{/if}
            {#if p.alive === false}<span>💀</span>{/if}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    {#if my.inGame && !my.roleSeen}<RevealGate group={group} my={my} />{/if}
    {#if my.inGame && my.roleSeen}<RoleCard player={my} group={group} mini={true} />{/if}
    <PlayersGrid players={players} title="🏘️ El pueblo" viewer={my} />
  {/if}
  <LogPanel game={game} />
{/if}
