<script lang="ts">
  // Cartas presentes en la partida (port de gameRolesModal de la v1): con
  // composición pública, las reales (y sus cantidades); con composición
  // secreta, solo los roles activados al empezar, sin desvelar cuáles juegan.
  import { app } from '../../core/sync/store.svelte';
  import { ROLES } from '../../games/hombres-lobo/roles';
  import type { RoleDef, RoleId } from '../../games/hombres-lobo/roles';

  const g = $derived(app.group);
  const game = $derived(g?.game);
  const pub = $derived(game?.compositionPublic ?? !!(g?.settings || {}).showComposition);
  const list = $derived.by((): [RoleDef, number][] => {
    if (pub && game?.composition) {
      return (Object.entries(game.composition) as [RoleId, number][])
        .map(([id, n]) => [ROLES[id], n] as [RoleDef, number])
        .filter(([r]) => !!r);
    }
    const ids = [...new Set<RoleId>(['hombre_lobo', ...(game?.selectedRoles || []), 'aldeano'])];
    return ids.map((id) => [ROLES[id], 1] as [RoleDef, number]).filter(([r]) => !!r);
  });
  const note = $derived(pub && game?.composition
    ? `Composición pública: estas son las cartas en juego.${game.centerCards ? ' (Con el Ladrón, 2 de ellas quedaron en el centro.)' : ''}`
    : 'Composición secreta: estos roles se activaron al empezar, pero nadie sabe cuáles están realmente en juego… ni cuántos.');
  const alguacilOn = $derived(!!(g?.settings || {}).alguacil);
</script>

<h3>🎴 Cartas de la partida</h3>
<p class="small-note">{note}</p>
{#each list as [r, n] (r.id)}
  <div class="roletoggle on"><span class="remoji">{r.emoji}</span>
    <div class="rinfo">
      <div class="rname">{#if n > 1}{r.name} <small>×{n}</small>{:else}{r.name}{/if}</div>
      <div class="rdesc">{r.desc}</div>
    </div>
  </div>
{/each}
{#if alguacilOn}<p class="small-note">⭐ Además, el pueblo elige Alguacil: su voto vale doble y nombra sucesor al morir.</p>{/if}
<button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✔️ Listo</button>
