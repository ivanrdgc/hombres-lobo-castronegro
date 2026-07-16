<script lang="ts">
  // Tira de «Cartas en juego», junto a la crónica: cada carta se toca y abre su
  // detalle (qué hace y cómo se juega). Con composición pública enseña las
  // cartas reales y sus cantidades; con composición secreta, solo los roles
  // activados al empezar, sin desvelar cuáles juegan. Sustituye al antiguo
  // modal «Cartas» del menú ⋯.
  import { app } from '../../../core/sync/store.svelte';
  import { ROLES } from '../roles';
  import type { RoleDef, RoleId } from '../roles';
  import type { GameState } from '../types';

  const { game }: { game: GameState } = $props();

  const g = $derived(app.group);
  const pub = $derived(game.compositionPublic ?? !!(g?.settings || {}).showComposition);
  const list = $derived.by((): [RoleDef, number][] => {
    if (pub && game.composition) {
      return (Object.entries(game.composition) as [RoleId, number][])
        .map(([id, n]) => [ROLES[id], n] as [RoleDef, number])
        .filter(([r]) => !!r);
    }
    const ids = [...new Set<RoleId>(['hombre_lobo', ...((game.selectedRoles || []) as RoleId[]), 'aldeano'])];
    return ids.map((id) => [ROLES[id], 0] as [RoleDef, number]).filter(([r]) => !!r);
  });
  const alguacilOn = $derived(!!(g?.settings || {}).alguacil);
  const open = (id: string) => (app.ui.modal = { type: 'role-detail', role: id });

  // Roles caídos PÚBLICAMENTE: solo se tacha lo que la mesa ya sabe — muertos
  // con el rol anunciado (ajuste «revelar rol al morir») y abandonos (siempre
  // se revelan). Con composición secreta o roles ocultos, ni una pista.
  const fallen = $derived.by(() => {
    const counts: Record<string, number> = {};
    if (!pub) return counts;
    for (const p of app.players) {
      if (!p.inGame || p.alive !== false || !p.role) continue;
      if (!game.revealDead && p.causeOfDeath !== 'abandono') continue;
      counts[p.role] = (counts[p.role] || 0) + 1;
    }
    return counts;
  });
  const anyFallen = $derived(Object.keys(fallen).length > 0);
</script>

<div class="card">
  <h3>🎴 Cartas en juego</h3>
  <div class="chips">
    {#each list as [r, n] (r.id)}
      {@const f = Math.min(fallen[r.id] || 0, Math.max(n, 1))}
      <button class="chip rolechip {n > 0 && f >= n ? 'fallen' : ''}" data-a="role-detail" data-p={r.id} onclick={() => open(r.id)}>{r.emoji} {r.name}{n > 1 ? ` ×${n}` : ''}{f > 0 ? ` †${f}` : ''}</button>
    {/each}
    {#if alguacilOn}<button class="chip rolechip" data-a="role-detail" data-p="alguacil" onclick={() => open('alguacil')}>⭐ Alguacil</button>{/if}
  </div>
  <p class="small-note">{pub ? 'Composición pública: estas son las cartas en juego.' : 'Composición secreta: roles activados al empezar; nadie sabe cuáles juegan de verdad… ni cuántos.'} Toca una carta para ver cómo funciona.{#if anyFallen} Los † son cartas caídas con el rol ya revelado.{/if}</p>
</div>
