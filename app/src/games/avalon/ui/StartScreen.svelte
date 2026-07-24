<script lang="ts">
  // «Empezar partida» de Ávalon: quién juega y en qué orden (SeatPicker) y qué
  // dispositivo pone la voz (opcional: todos pueden jugar y uno de ellos narra).
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { defaultNarrator } from '../../../shell/ui-helpers';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import * as A from '../actions';
  import { ROLES, OPTIONAL_ROLES, MIN_PLAYERS, MAX_PLAYERS, evilCountFor } from '../roles';
  import type { RoleId } from '../roles';
  import Flash from '../../../shell/Flash.svelte';
  import SeatPicker from '../../../shell/SeatPicker.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  const now0 = Date.now();
  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 10000); return () => clearInterval(t); });

  const meId = $derived(me()?.id);

  let seat = $state<{ order: string[]; chosen: string[] }>({ order: [], chosen: [] });
  const byId = (id: string) => app.players.find((p) => p.id === id);
  const rows = $derived(seat.order.map(byId).filter((p): p is PlayerDoc => !!p));
  const chosen = $derived(seat.chosen.map(byId).filter((p): p is PlayerDoc => !!p));
  const n = $derived(chosen.length);

  let narrPick = $state<string | null>(null);
  const narrator = $derived.by(() => {
    const cand = narrPick ?? defaultNarrator(app.players, group.lastNarratorId, meId, now0);
    return cand && !matchOf(cand) ? cand : meId ?? null;
  });
  const narratorP = $derived(app.players.find((p) => p.id === narrator));

  const enabled = $derived(((group.settings?.avalon as string[] | undefined) ?? ['percival', 'morgana']) as RoleId[]);
  const okStart = $derived(n >= MIN_PLAYERS && n <= MAX_PLAYERS);

  function startNow() {
    const pids = chosen.map((p) => p.id);
    if (narrator === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que comience Ávalon.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startAvalon(pids, narrator, enabled));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/avalon`)}>←</button>
  <h2>🏰 Empezar partida</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="avalon" onState={(s) => (seat = s)} />
  <p class="small-note">El orden es el de la mesa (el liderazgo de las misiones rota en ese sentido).</p>
</div>

<div class="card">
  <h3>🔊 ¿Dónde suena la voz?</h3>
  <p class="small-note" style="margin-top:6px">La voz solo ambienta y anuncia misiones y resultados (todo el secreto va en las cartas). Puede ponerla alguien que también juega.</p>
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
  <h3>🎭 Roles</h3>
  <div class="chips" style="margin-top:2px">
    <span class="chip">🧙 Merlín</span><span class="chip">🗡️ Asesino</span>
    {#each OPTIONAL_ROLES.filter((r) => enabled.includes(r)) as r (r)}<span class="chip">{ROLES[r].emoji} {ROLES[r].name}</span>{/each}
  </div>
  <p class="small-note">El resto se rellena con Leales y Esbirros. {n >= MIN_PLAYERS ? `Con ${n} jugadores: ${evilCountFor(n)} del Mal y ${n - evilCountFor(n)} del Bien.` : ''} <button class="small ghost" data-a="av-edit-roles" onclick={() => navigate(`/g/${group.id}/avalon`)}>Editar roles</button></p>
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">🏰 Jugarán <b>{n}</b>{n ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span></p>
  {#if n < MIN_PLAYERS}<p class="small-note">⚠️ Ávalon necesita al menos {MIN_PLAYERS} jugadores.</p>{/if}
  {#if n > MAX_PLAYERS}<p class="small-note">⚠️ Máximo {MAX_PLAYERS} jugadores.</p>{/if}
  <div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
  <button class="primary block" disabled={!okStart} data-a="av-start" onclick={startNow}>🏰 ¡Empezar!</button>
</div>
