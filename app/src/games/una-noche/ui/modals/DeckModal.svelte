<script lang="ts">
  // Configuración del MAZO de Una Noche (roles + cantidades). Vive en el lobby
  // (como «Elegir roles» de Los Hombres Lobo) y se guarda en settings.unaNoche.
  // El mazo debe sumar jugadores + 3 cartas; aquí se muestra el objetivo (según
  // los que jugarían ahora, o el nº exacto si se abre desde «Empezar»).
  import { app, matchOf } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import { setSettings } from '../../../../core/sync/group-actions';
  import { isActiveDevice } from '../../../../core/sync/presence';
  import { ROLES, CENTER_COUNT, recommendedComposition, compositionSize } from '../../roles';
  import type { RoleId } from '../../types';

  const MAX_OF: Partial<Record<RoleId, number>> = {
    doble: 1, lobo: 3, esbirro: 1, mason: 2, vidente: 1, ladron: 1,
    alborotadora: 1, borracho: 1, insomne: 1, aldeano: 8, cazador: 1, tanner: 1,
  };
  const roleIds = Object.keys(ROLES) as RoleId[];

  // ¿Cuántos jugarían? El nº exacto si se abrió desde «Empezar» (targetN); si
  // no, la estimación de dispositivos activos que juegan a Una Noche.
  const est = $derived.by(() => {
    const t = app.ui.modal?.targetN as number | undefined;
    if (typeof t === 'number') return t;
    const now = Date.now();
    return app.players.filter((p) => !matchOf(p.id)
      && (p.isPlayerFor?.una_noche ?? p.isPlayer) !== false && isActiveDevice(p, now)).length;
  });
  const need = $derived(est + CENTER_COUNT);

  const saved = $derived(app.group?.settings?.unaNoche as Record<string, number> | undefined);
  let comp = $state<Record<string, number>>({});
  let inited = false;
  $effect(() => {
    if (inited) return;
    inited = true;
    comp = saved && compositionSize(saved) > 0 ? { ...saved } : recommendedComposition(est || 5);
  });

  const total = $derived(compositionSize(comp));
  const countOf = (r: RoleId) => comp[r] || 0;
  function save(next: Record<string, number>) {
    comp = next;
    guard(() => setSettings({ unaNoche: Object.fromEntries(Object.entries(next).filter(([, v]) => (v || 0) > 0)) }));
  }
  function bump(r: RoleId, d: number) {
    const max = MAX_OF[r] ?? 1;
    save({ ...comp, [r]: Math.max(0, Math.min(max, countOf(r) + d)) });
  }
  function fit() { save(recommendedComposition(est || 5)); }
</script>

<h3>🎴 El mazo</h3>
<p class="small-note">
  Debe sumar <b>{need}</b> cartas ({est} jugador{est === 1 ? '' : 'es'} + {CENTER_COUNT} al centro).
  Llevas <b class:danger-text={total !== need}>{total}</b>.
  {#if total < need}Faltan {need - total}.{:else if total > need}Sobran {total - need}.{:else}✅ Perfecto.{/if}
  <button class="small ghost" style="margin-left:6px" data-a="una-deck-fit" onclick={fit}>🎲 Recomendado</button>
</p>
{#each roleIds as r (r)}
  {@const c = countOf(r)}
  <div class="settingrow" style="align-items:center">
    <div class="sinfo"><div class="sname" style="opacity:{c ? 1 : 0.55}">{ROLES[r].emoji} {ROLES[r].name}{c > 1 ? ` ×${c}` : ''}</div>
      <div class="sdesc">{ROLES[r].desc}</div></div>
    <!-- Stepper compacto: NO usa la clase .btnrow (su regla global estira cada
         botón a flex:1/min-width:130px y se comían 3/4 del ancho, tapando la ℹ️). -->
    <div class="stepper">
      <button class="small ghost" data-a="una-deck-info" data-p={r} aria-label="Ver el rol en detalle" title="Ver en detalle" onclick={() => {
        // Salta al detalle guardando el scroll (y el targetN si venía de
        // «Empezar»): al volver, este modal se restaura donde estaba (B12).
        const scroll = (document.querySelector('.modal') as HTMLElement | null)?.scrollTop ?? 0;
        app.ui.modal = { type: 'una-role-detail', role: r, back: 'una-deck', backScroll: scroll, backTargetN: app.ui.modal?.targetN };
      }}>ℹ️</button>
      <button class="small ghost" data-a="una-deck-dec" data-p={r} disabled={c <= 0} aria-label="Quitar una carta" onclick={() => bump(r, -1)}>−</button>
      <span class="cnt">{c}</span>
      <button class="small ghost" data-a="una-deck-inc" data-p={r} disabled={c >= (MAX_OF[r] ?? 1)} aria-label="Añadir una carta" onclick={() => bump(r, 1)}>+</button>
    </div>
  </div>
{/each}
<button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✔️ Listo</button>

<style>
  /* Stepper de cada carta: ℹ️ − nº + en compacto, pegados a la derecha de la
     fila. Al no llevar la clase .btnrow, sus botones NO heredan el estirado
     global (flex:1/min-width:130px) que los inflaba a 3/4 del ancho. */
  .stepper { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
  .stepper .cnt { min-width: 1.6em; text-align: center; font-variant-numeric: tabular-nums; }
</style>
