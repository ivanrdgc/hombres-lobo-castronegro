<script lang="ts">
  // «Empezar partida» de Una Noche: quién juega y en qué orden (SeatPicker) y
  // qué dispositivo pone la voz. El MAZO se configura en el lobby (settings.
  // unaNoche); aquí solo se valida que sume jugadores + 3 y, si no cuadra
  // (cambió el nº de jugadores), se ofrece ajustarlo sin salir.
  // B29: tres decisiones, tres tarjetas, y el botón final dice a cuántos reparte
  // (la lista de quién juega ya está arriba, no se repite abajo).
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { defaultNarrator } from '../../../shell/ui-helpers';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import * as A from '../actions';
  import { ROLES, CENTER_COUNT, MIN_PLAYERS, MAX_PLAYERS, recommendedComposition, compositionSize } from '../roles';
  import type { RoleId } from '../types';
  import Flash from '../../../shell/Flash.svelte';
  import SeatPicker from '../../../shell/SeatPicker.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  const now0 = Date.now();
  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 10000); return () => clearInterval(t); });

  const meId = $derived(me()?.id);

  // ——— ¿Quién juega? ———
  let seat = $state<{ order: string[]; chosen: string[] }>({ order: [], chosen: [] });
  const byId = (id: string) => app.players.find((p) => p.id === id);
  const rows = $derived(seat.order.map(byId).filter((p): p is PlayerDoc => !!p));
  const chosen = $derived(seat.chosen.map(byId).filter((p): p is PlayerDoc => !!p));
  const n = $derived(chosen.length);
  const need = $derived(n + CENTER_COUNT);

  // ——— ¿Dónde suena la voz? ———
  let narrPick = $state<string | null>(null);
  const narrator = $derived.by(() => {
    const cand = narrPick ?? defaultNarrator(app.players, group.lastNarratorId, meId, now0);
    return cand && !matchOf(cand) ? cand : meId ?? null;
  });
  const narratorP = $derived(app.players.find((p) => p.id === narrator));

  // ——— Mazo (configurado en el lobby) ———
  const comp = $derived.by(() => {
    const s = group.settings?.unaNoche as Record<string, number> | undefined;
    return s && compositionSize(s) > 0 ? s : recommendedComposition(n || 5);
  });
  const total = $derived(compositionSize(comp));
  const deckRoles = $derived((Object.keys(comp) as RoleId[]).filter((r) => (comp[r] || 0) > 0 && ROLES[r]));
  const deckOk = $derived(total === need);
  const okStart = $derived(deckOk && n >= MIN_PLAYERS && n <= MAX_PLAYERS);

  function startNow() {
    const pids = chosen.map((p) => p.id);
    const clean = Object.fromEntries(Object.entries(comp).filter(([, v]) => (v || 0) > 0));
    if (narrator === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que caiga la noche.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startUnaNoche(pids, narrator, clean));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/una_noche`)}>←</button>
  <h2>🌘 Una Noche: empezar</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="una_noche" onState={(s) => (seat = s)} />
</div>

<div class="card">
  <h3>🔊 ¿Qué móvil pone la voz?</h3>
  <p class="small-note" style="margin-top:6px">Ese móvil llama a cada carta en voz alta para toda la mesa: déjalo en el centro, sonando. Puede jugar además de narrar.</p>
  <div class="btnrow" style="margin-top:6px">
    {#each rows.filter((p) => !matchOf(p.id)) as p (p.id)}
      <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
        {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
      </button>
    {/each}
  </div>
  {#if narratorP}<p class="small-note">🔊 <b>{narratorP.name}</b> pone la voz{seat.chosen.includes(narratorP.id) ? ' y también juega' : ' (no juega: tele o altavoz)'}.</p>{/if}
</div>

<div class="card">
  <h3>🎴 El mazo · {total} carta{total === 1 ? '' : 's'}</h3>
  <div class="chips" style="margin-top:2px">
    {#each deckRoles as r (r)}<button class="chip rolechip" data-a="una-role" data-p={r} onclick={() => (app.ui.modal = { type: 'una-role-detail', role: r })}>{ROLES[r].emoji} {ROLES[r].name}{(comp[r] || 0) > 1 ? ` ×${comp[r]}` : ''}</button>{/each}
  </div>
  {#if !deckOk}
    <p class="small-note">⚠️ Para <b>{n}</b> jugadores el mazo debe sumar <b>{need}</b> ({n} + {CENTER_COUNT} al centro): {total < need ? `te faltan ${need - total}` : `te sobran ${total - need}`}.</p>
    <button class="block" data-a="una-fix-deck" onclick={() => (app.ui.modal = { type: 'una-deck', targetN: n })}>🎴 Ajustar el mazo</button>
  {:else}
    <p class="small-note">✅ Cuadra: {n} para repartir + {CENTER_COUNT} al centro. <button class="small ghost" data-a="una-fix-deck" onclick={() => (app.ui.modal = { type: 'una-deck', targetN: n })}>Cambiarlo</button></p>
  {/if}
</div>

<div class="card">
  {#if n < MIN_PLAYERS}<p class="small-note" style="margin-top:0">⚠️ Una Noche necesita al menos {MIN_PLAYERS} jugadores (marca arriba a quién juega).</p>{/if}
  {#if n > MAX_PLAYERS}<p class="small-note" style="margin-top:0">⚠️ Máximo {MAX_PLAYERS} jugadores.</p>{/if}
  <div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
  <button class="primary block" disabled={!okStart} data-a="una-start" onclick={startNow}>🌘 Repartir y empezar la noche{n ? ` (${n})` : ''}</button>
</div>
