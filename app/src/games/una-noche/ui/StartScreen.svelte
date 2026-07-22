<script lang="ts">
  // «Empezar partida» de Una Noche: quién juega y en qué orden (SeatPicker),
  // qué dispositivo pone la voz, y el MAZO (qué roles entran). El mazo debe
  // sumar exactamente jugadores + 3 cartas (las 3 sobrantes van al centro).
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

  // ——— Mazo (roles + cantidades) ———
  const MAX_OF: Partial<Record<RoleId, number>> = {
    doble: 1, lobo: 3, esbirro: 1, mason: 2, vidente: 1, ladron: 1,
    alborotadora: 1, borracho: 1, insomne: 1, aldeano: 8, cazador: 1, tanner: 1,
  };
  const initial = (group.settings?.unaNoche as Record<string, number> | undefined);
  let comp = $state<Record<string, number>>(
    initial && compositionSize(initial) > 0 ? { ...initial } : recommendedComposition(5),
  );
  const total = $derived(compositionSize(comp));
  const roleIds = Object.keys(ROLES) as RoleId[];
  const countOf = (r: RoleId) => comp[r] || 0;
  function bump(r: RoleId, d: number) {
    const max = MAX_OF[r] ?? 1;
    const v = Math.max(0, Math.min(max, countOf(r) + d));
    comp = { ...comp, [r]: v };
  }
  function fitRecommended() { comp = recommendedComposition(n || 5); }

  const okDeck = $derived(total === need && n >= MIN_PLAYERS && n <= MAX_PLAYERS);
  const wolvesIn = $derived((comp.lobo || 0) + (comp.esbirro || 0));

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
  <h2>🌘 Empezar partida</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="una_noche" onState={(s) => (seat = s)} />
  <p class="small-note">El orden es el de la mesa (importa para intercambios entre vecinos que añadamos más adelante).</p>
</div>

<div class="card">
  <h3>🔊 ¿Dónde suena la voz?</h3>
  <p class="small-note" style="margin-top:6px">La app llama a cada rol en su orden. Todos juegan, también quien pone la voz.</p>
  <div class="btnrow" style="margin-top:6px">
    {#each rows.filter((p) => !matchOf(p.id)) as p (p.id)}
      <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
        {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
      </button>
    {/each}
  </div>
  {#if narratorP}<p class="small-note">🔊 <b>{narratorP.name}</b> pone la voz{seat.chosen.includes(narratorP.id) ? ' y también juega' : ' (no juega: tele o altavoz)'}.</p>{/if}
  <button class="ghost block" data-a="voice-open" onclick={() => { app.ui.modal = { type: 'voice' }; app.ui.voiceTest = null; }}>🗣️ Probar o configurar la voz</button>
</div>

<div class="card">
  <div style="display:flex;align-items:center;gap:8px">
    <h3 style="flex:1;margin:0">🎴 El mazo</h3>
    <button class="small ghost" data-a="una-fit" onclick={fitRecommended}>🎲 Recomendado</button>
  </div>
  <p class="small-note" style="margin-top:6px">
    Debe sumar <b>{need}</b> cartas ({n} jugador{n === 1 ? '' : 'es'} + {CENTER_COUNT} al centro).
    Llevas <b class:danger-text={total !== need}>{total}</b>.
    {#if total < need}Faltan {need - total}.{:else if total > need}Sobran {total - need}.{:else}✅ Perfecto.{/if}
  </p>
  {#each roleIds as r (r)}
    {@const c = countOf(r)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname" style="opacity:{c ? 1 : 0.55}">{ROLES[r].emoji} {ROLES[r].name}{c > 1 ? ` ×${c}` : ''}</div></div>
      <div class="btnrow" style="flex:0 0 auto">
        <button class="small ghost" data-a="una-dec" data-p={r} disabled={c <= 0} onclick={() => bump(r, -1)}>−</button>
        <span style="min-width:1.5em;text-align:center">{c}</span>
        <button class="small ghost" data-a="una-inc" data-p={r} disabled={c >= (MAX_OF[r] ?? 1)} onclick={() => bump(r, 1)}>+</button>
      </div>
    </div>
  {/each}
  {#if wolvesIn === 0}<p class="small-note">⚠️ No hay lobos ni esbirro en el mazo: puede acabar sin bando lobo (válido, pero raro).</p>{/if}
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">🌘 Jugarán <b>{n}</b>{n ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span></p>
  {#if n < MIN_PLAYERS}<p class="small-note">⚠️ Una Noche necesita al menos {MIN_PLAYERS} jugadores.</p>{/if}
  {#if n > MAX_PLAYERS}<p class="small-note">⚠️ Máximo {MAX_PLAYERS} jugadores.</p>{/if}
  <div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
  <button class="primary block" disabled={!okDeck} data-a="una-start" onclick={startNow}>🌘 ¡Empezar!</button>
</div>
