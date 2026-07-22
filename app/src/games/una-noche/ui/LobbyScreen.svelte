<script lang="ts">
  // Lobby de Una Noche: introducción, «cómo se juega» y «Empezar partida».
  // El mazo (qué roles entran) se elige en la pantalla de empezar, cuando ya se
  // sabe cuántos jugáis (el mazo debe sumar jugadores + 3).
  import { app, navigate } from '../../../core/sync/store.svelte';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🌘 {group.name}</h2>
  <button class="small ghost" data-a="leave" onclick={() => (app.ui.modal = { type: 'confirm-leave' })}>🚪 Salir</button>
</div>
<Flash />
<div class="card">
  <h3>🌘 Una Noche en Castronegro</h3>
  <p style="margin:9px 0">Una <b>sola</b> noche. Los roles se despiertan por turnos y, a oscuras, miran y se <b>roban e intercambian las cartas</b> unos a otros: al amanecer puede que ya no seas quien empezaste… y quizá ni lo sepas.</p>
  <p style="margin:9px 0">De día se debate una vez y todos señalan <b>a la vez</b> a quien creen lobo. Gana el Pueblo si cae un lobo; ganan los Lobos si ninguno cae; y el Curtidor gana si logra que lo linchen a él.</p>
  <button class="block" data-a="una-open-help" onclick={() => (app.ui.modal = { type: 'una-help' })}>🎲 Cómo se juega y los roles</button>
</div>
<div class="card">
  <p class="small-note" style="margin-top:0">De 3 a 10 jugadores. El narrador (voz de la app) llama a cada rol; puede jugar también o solo poner la voz.</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/una_noche/empezar`)}>🌘 Empezar partida</button>
</div>
