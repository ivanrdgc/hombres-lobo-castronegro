<script lang="ts">
  // Composición de la partida: roles por expansión, número de lobos y aldeanos
  // reservados, y el alguacil (port de rolesModal v1 + handlers de main.js).
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
  import { ROLES, EXPANSIONS, wolfCountFor, NEIGHBOR_ROLES } from '../../roles';
  import type { RoleDef, RoleId } from '../../roles';

  const NEIGHBOR = NEIGHBOR_ROLES as string[];
  import type { TableSettings } from '../../../../core/sync/schema';

  const ALL_ROLES: RoleDef[] = Object.values(ROLES);
  const rolesOf = (expId: string) => ALL_ROLES.filter((r) => r.expansion === expId);

  // Svelte recorta los espacios al borde de un bloque {#if}: este espacio en
  // variable conserva el «nombre <small>…</small>» exacto de la v1.
  const sp = ' ';

  const g = $derived(app.group);
  const extra = $derived<string[]>(g?.extraRoles ?? []);
  const wc = $derived((g?.settings || {}).wolvesCount || null);
  const alguacilOn = $derived(!!(g?.settings || {}).alguacil);
  const vc = $derived((g?.settings || {}).villagersCount);
  const vAuto = $derived(vc === null || vc === undefined);
  const wolvesAuto = $derived(!wc);
  const wolvesShown = $derived(wc || wolfCountFor(Math.max(1, app.players.length - 1)));
  const nJugWarn = $derived(Math.max(0, app.players.length - 1));

  function toggleRole(roleId: string) {
    const cur: string[] = app.group?.extraRoles || [];
    const next = cur.includes(roleId) ? cur.filter((r) => r !== roleId) : cur.concat([roleId]);
    guard(() => A.setExtraRoles(next as RoleId[]));
  }

  // Detalle «cómo se juega» de un rol; vuelve a este modal al cerrarse,
  // restaurando la posición de scroll (la restaura ModalHost via .scroll).
  function openDetail(e: Event, roleId: string) {
    e.stopPropagation();
    const scroll = (document.querySelector('.modal') as HTMLElement | null)?.scrollTop ?? 0;
    app.ui.modal = { type: 'role-detail', role: roleId, back: 'roles', backScroll: scroll };
  }

  function toggleSetting(key: string) {
    const cur = (app.group?.settings || {}) as Record<string, unknown>;
    guard(() => A.setSettings({ [key]: !cur[key] } as Partial<TableSettings>));
  }

  const wolvesManual = () => guard(() => A.setSettings({ wolvesCount: wolfCountFor(Math.max(1, app.players.length - 1)) }));
  function wolvesInc() {
    const cur = (app.group?.settings || {}).wolvesCount || 1;
    guard(() => A.setSettings({ wolvesCount: Math.min(4, cur + 1) }));
  }
  function wolvesDec() {
    const cur = (app.group?.settings || {}).wolvesCount || 1;
    guard(() => A.setSettings({ wolvesCount: Math.max(1, cur - 1) }));
  }
  function villagersManual() {
    // Punto de partida: los huecos que quedarían ahora mismo con el relleno auto.
    const nJug = Math.max(1, app.players.filter((p) => p.isPlayer !== false).length);
    const lobos = (app.group?.settings || {}).wolvesCount || wolfCountFor(nJug);
    const extras = (app.group?.extraRoles || []).length;
    guard(() => A.setSettings({ villagersCount: Math.max(0, nJug - lobos - extras) }));
  }
  function villagersInc() {
    const cur = (app.group?.settings || {}).villagersCount || 0;
    guard(() => A.setSettings({ villagersCount: Math.min(17, cur + 1) }));
  }
  function villagersDec() {
    const cur = (app.group?.settings || {}).villagersCount || 0;
    guard(() => A.setSettings({ villagersCount: Math.max(0, cur - 1) }));
  }
</script>

<h3>🎴 Roles de la partida</h3>
<p class="small-note">Los aldeanos rellenan los huecos automáticamente. Activa los demás roles que quieras incluir; si hay más roles que sitios, se elegirá un subconjunto al azar.</p>
{#each EXPANSIONS as exp (exp.id)}
  <div class="exp">{exp.emoji} {exp.name.toUpperCase()}</div>
  {#each rolesOf(exp.id) as r (r.id)}
    {#if r.id === 'hombre_lobo'}
      <div class="roletoggle locked on"><span class="remoji">{r.emoji}</span>
        <div class="rinfo"><div class="rname">{r.name} <small>(siempre en juego)</small></div>
        <div class="rdesc">{r.desc} La tabla oficial pone 2 con 8-11 jugadores, 3 con 12-17 y 4 con 18.</div>
        <div class="btnrow" style="margin-top:6px">
          <button class={wolvesAuto ? 'primary small' : 'ghost small'} data-a="wolves-auto" onclick={() => guard(() => A.setSettings({ wolvesCount: null }))}>{wolvesAuto ? `🎯 Auto · ${wolvesShown} 🐺` : '🎯 Auto'}</button>
          {#if wolvesAuto}<button class="ghost small" data-a="wolves-manual" onclick={wolvesManual}>✋ Elegir número</button>{:else}<span style="display:inline-flex;align-items:center;gap:10px"><button class="ghost small" data-a="wolves-dec" onclick={wolvesDec}>−</button><b style="font-size:1.05rem">{wc} 🐺</b><button class="ghost small" data-a="wolves-inc" onclick={wolvesInc}>+</button></span>{/if}
        </div></div>
        <button class="roleinfo" data-a="role-detail" data-p={r.id} aria-label="Cómo se juega" title="Cómo se juega" onclick={(e) => openDetail(e, r.id)}>ℹ️</button>
        <span class="state">🔒</span></div>
    {:else if r.id === 'aldeano'}
      <div class="roletoggle locked on"><span class="remoji">{r.emoji}</span>
        <div class="rinfo"><div class="rname">{r.name} <small>(relleno del pueblo)</small></div>
        <div class="rdesc">{r.desc} Por defecto rellenan los huecos libres. Si fijas cuántos reservar y no caben todos los roles activados, se sortea cuáles entran: la partida siempre es jugable.</div>
        <div class="btnrow" style="margin-top:6px">
          <button class={vAuto ? 'primary small' : 'ghost small'} data-a="villagers-auto" onclick={() => guard(() => A.setSettings({ villagersCount: null }))}>{vAuto ? '🎯 Auto · relleno' : '🎯 Auto'}</button>
          {#if vAuto}<button class="ghost small" data-a="villagers-manual" onclick={villagersManual}>✋ Fijar número</button>{:else}<span style="display:inline-flex;align-items:center;gap:10px"><button class="ghost small" data-a="villagers-dec" onclick={villagersDec}>−</button><b style="font-size:1.05rem">{vc} 🧑‍🌾</b><button class="ghost small" data-a="villagers-inc" onclick={villagersInc}>+</button></span>{/if}
        </div></div>
        <button class="roleinfo" data-a="role-detail" data-p={r.id} aria-label="Cómo se juega" title="Cómo se juega" onclick={(e) => openDetail(e, r.id)}>ℹ️</button>
        <span class="state">🔒</span></div>
    {:else if r.always}
      <div class="roletoggle locked on"><span class="remoji">{r.emoji}</span>
        <div class="rinfo"><div class="rname">{r.name} <small>(automático)</small></div><div class="rdesc">{r.desc}</div></div>
        <button class="roleinfo" data-a="role-detail" data-p={r.id} aria-label="Cómo se juega" title="Cómo se juega" onclick={(e) => openDetail(e, r.id)}>ℹ️</button>
        <span class="state">🔒</span></div>
    {:else}
      {@const on = extra.includes(r.id)}
      {@const minWarn = !!r.minPlayers && nJugWarn < r.minPlayers}
      {@const neighborWarn = NEIGHBOR.includes(r.id)}
      <div class="roletoggle {on ? 'on' : ''}" data-a="toggle-role" data-p={r.id}
        onclick={() => toggleRole(r.id)}
        role="button" tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') toggleRole(r.id); }}>
        <span class="remoji">{r.emoji}</span>
        <div class="rinfo"><div class="rname">{r.name}{#if r.multi}{sp}<small>(×{r.multi} cartas)</small>{/if}{#if r.minPlayers}{sp}<small>(regla: ≥{r.minPlayers} jugadores)</small>{/if}</div>
        <div class="rdesc">{r.desc}{#if minWarn && on}{sp}<b>⚠️ Ahora mismo no hay jugadores suficientes: no se repartirá.</b>{/if}{#if neighborWarn && on}{sp}<b>⚠️ Este rol depende de quién se sienta al lado de quién: al empezar, cuida que el orden de los jugadores coincida con cómo estáis sentados de verdad.</b>{/if}</div></div>
        <button class="roleinfo" data-a="role-detail" data-p={r.id} aria-label="Cómo se juega" title="Cómo se juega" onclick={(e) => openDetail(e, r.id)}>ℹ️</button>
        <span class="state">{on ? '✅' : '⬜'}</span></div>
    {/if}
  {/each}
  {#if exp.id === 'base'}
    <div class="roletoggle {alguacilOn ? 'on' : ''}" data-a="toggle-setting" data-p="alguacil"
      onclick={() => toggleSetting('alguacil')}
      role="button" tabindex="0"
      onkeydown={(e) => { if (e.key === 'Enter') toggleSetting('alguacil'); }}>
      <span class="remoji">⭐</span>
      <div class="rinfo"><div class="rname">El Alguacil <small>(cargo electo, no es una carta)</small></div>
      <div class="rdesc">El primer día el pueblo elige a su Alguacil, cuya voz vale por dos. Al morir, señala a su sucesor.</div></div>
      <button class="roleinfo" data-a="role-detail" data-p="alguacil" aria-label="Cómo se juega" title="Cómo se juega" onclick={(e) => openDetail(e, 'alguacil')}>ℹ️</button>
      <span class="state">{alguacilOn ? '✅' : '⬜'}</span></div>
  {/if}
{/each}
<button class="ghost block" data-a="reset-roles" onclick={() => guard(() => A.resetRolesConfig())}>↩️ Restaurar composición recomendada</button>
<button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✔️ Listo</button>
