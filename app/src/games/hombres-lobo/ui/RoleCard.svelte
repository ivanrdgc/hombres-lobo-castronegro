<script lang="ts">
  // Tarjeta del rol propio con la información privada extra (port de roleCard()
  // de la v1). El «mini» va oculto por defecto (ui.roleOpen) y se auto-oculta
  // a los 12 s: los móviles quedan boca arriba sobre la mesa.
  import { app } from '../../../core/sync/store.svelte';
  import { ROLES, TEAMS, isWolfSide } from '../roles';
  import type { RoleId } from '../roles';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';

  const { player, group, mini = false }: { player: PlayerDoc; group: GroupDoc; mini?: boolean } = $props();

  const game = $derived<Partial<GameState>>(group.game || {});
  const r = $derived(player.role ? ROLES[player.role] : null);
  const team = $derived.by(() => {
    if (!r || !player.role) return null;
    return player.role === 'perro_lobo' && player.wolfSide
      ? TEAMS.lobos
      : TEAMS[isWolfSide(player) && r.team !== 'solitario' ? 'lobos' : r.team];
  });

  const nameOf = (pid: string) => app.players.find((p) => p.id === pid)?.name || '¿?';
  const roleDef = (rid: RoleId | null | undefined) => (rid ? ROLES[rid] : undefined);

  // En modo automático, los grupos se reconocen físicamente por la noche antes
  // de que la app muestre sus nombres (como en el juego real con narrador).
  const wolvesKnown = $derived(game.mode === 'manual' || !!game.wolvesKnown);
  const packmates = $derived(app.players.filter((p) => p.inGame && p.id !== player.id && isWolfSide(p)));
  const sisters = $derived(app.players.filter((p) => p.role === 'dos_hermanas' && p.id !== player.id));
  const brothers = $derived(app.players.filter((p) => p.role === 'tres_hermanos' && p.id !== player.id));
  const sectMine = $derived(app.players.filter((p) => p.inGame && p.sect === player.sect && p.id !== player.id).map((p) => p.name));
  const sectOthers = $derived(app.players.filter((p) => p.inGame && p.sect && p.sect !== player.sect).map((p) => p.name));
  const partner = $derived(app.players.find((p) => p.lover && p.id !== player.id));
  const model = $derived(player.modelId && player.modelId !== 'nadie'
    ? app.players.find((p) => p.id === player.modelId) : undefined);

  function toggle() {
    app.ui.roleOpen = !app.ui.roleOpen;
  }

  // La carta se oculta sola: que no se quede abierta a la vista de nadie.
  $effect(() => {
    if (!app.ui.roleOpen) return;
    const t = setTimeout(() => {
      app.ui.roleOpen = false;
    }, 12000);
    return () => clearTimeout(t);
  });
</script>

{#if player.inGame && player.role && r && team}
  {#if mini && !app.ui.roleOpen}
    <div style="text-align:center;margin:10px 0"><button class="small ghost" data-a="toggle-rolecard" onclick={toggle}>👁 Mostrar mi rol</button></div>
  {:else}
    <div class="rolecard" data-a="toggle-rolecard" onclick={toggle} role="button" tabindex="0"
      onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
      <span class="remoji">{r.emoji}</span>
      <span class="rname">{r.name}</span>
      <div class="rteam">{team.emoji} Bando: {team.name}</div>
      <div class="rdesc">{r.desc}</div>
      {#if player.keyword}
        <div class="rextra">🔑 Tu palabra clave{#if player.kwRenewedNight != null} <b>se RENOVÓ la noche {player.kwRenewedNight}</b> (la anterior ya se pronunció). Ahora es{/if}: <b>{player.keyword}</b>. Si el narrador la pronuncia, el mensaje va por ti: abre los ojos con disimulo y mira tu pantalla.</div>
      {/if}
      {#if (player.videnteLog || []).length}
        <div class="rextra">🔮 Tus visiones: {#each player.videnteLog || [] as e, i (i)}{i ? ' · ' : ''}{#if e.role !== undefined}noche {e.night}: <b>{nameOf(e.pid)}</b> es {roleDef(e.role)?.emoji || ''} {roleDef(e.role)?.name || '¿?'}{:else}noche {e.night}: <b>{nameOf(e.pid)}</b> {e.wolf ? 'ES LOBO 🐺' : 'no es lobo 🏡'}{/if}{/each}</div>
      {/if}
      {#if isWolfSide(player)}
        {#if wolvesKnown}
          <div class="rextra">🐺 Tu manada: {packmates.length ? packmates.map((p) => p.name).join(', ') : 'cazas en solitario'}</div>
        {:else}
          <div class="rextra">🐺 Esta noche abriréis los ojos para reconoceros como manada. Hasta entonces, nadie conoce a nadie.</div>
        {/if}
      {/if}
      {#if player.infected}<div class="rextra">🧛 Has sido infectado: ahora eres un hombre lobo en secreto (conservas tu carta).</div>{/if}
      {#if player.transformed}<div class="rextra">🐾 Tu modelo ha muerto: te has transformado en hombre lobo.</div>{/if}
      {#if player.role === 'dos_hermanas'}
        {#if (game.mode === 'manual' || game.hermanasKnown) && sisters.length}
          <div class="rextra">👭 Tu hermana: {sisters.map((p) => p.name).join(', ')}</div>
        {:else}
          <div class="rextra">👭 Esta noche abriréis los ojos para reconoceros.</div>
        {/if}
      {/if}
      {#if player.role === 'tres_hermanos'}
        {#if (game.mode === 'manual' || game.hermanosKnown) && brothers.length}
          <div class="rextra">👨‍👨‍👦 Tus hermanos: {brothers.map((p) => p.name).join(', ')}</div>
        {:else}
          <div class="rextra">👨‍👨‍👦 Esta noche abriréis los ojos para reconoceros.</div>
        {/if}
      {/if}
      {#if player.role === 'sectario'}
        <div class="rextra">🌗 Tu mitad: {sectMine.join(', ') || '(solo tú)'}<br />🎯 Debes eliminar a: {sectOthers.join(', ')}</div>
      {/if}
      {#if player.lover && partner}
        <div class="rextra">💘 Estás enamorado/a de <b>{partner.name}</b>. Si muere, morirás de pena. Ganáis juntos.</div>
      {/if}
      {#if player.charmed}
        <div class="rextra">🎶 Estás <b>encantado</b> por el Gaitero. Encantados: {app.players.filter((p) => p.charmed).map((p) => p.name).join(', ')}</div>
      {/if}
      {#if player.role === 'nino_salvaje' && model}
        <div class="rextra">🐾 Tu modelo: {model.name} {model.alive === false ? '(💀 ha muerto)' : ''}</div>
      {/if}
      {#if player.role === 'bruja' && player.powers}
        <div class="rextra">🧪 Pociones: {player.powers.heal !== false ? '💚 vida' : ''} {player.powers.poison !== false ? '☠️ muerte' : ''} {player.powers.heal === false && player.powers.poison === false ? 'ninguna' : ''}</div>
      {/if}
      {#if game.alguacilId === player.id}<div class="rextra">⭐ Eres el Alguacil: tu voto vale doble.</div>{/if}
      {#if player.revealedTonto}<div class="rextra">🤪 Te has librado del linchamiento, pero ya no puedes votar.</div>{/if}
      {#if game.powersLost && r.team === 'pueblo' && !['aldeano', 'tonto'].includes(player.role)}
        <div class="rextra">⚠️ El Anciano murió a manos del pueblo: los aldeanos habéis perdido vuestros poderes.</div>
      {/if}
      {#if mini}<p class="small-note" style="margin-top:8px">Se ocultará sola en unos segundos; toca la carta para ocultarla ya.</p>{/if}
    </div>
  {/if}
{/if}
