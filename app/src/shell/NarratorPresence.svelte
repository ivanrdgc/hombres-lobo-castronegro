<script lang="ts">
  // Presencia del narrador: si su latido envejece (móvil bloqueado, batería,
  // app cerrada), cualquier dispositivo puede tomar la narración al vuelo.
  // (La v1 se quedaba muda sin aviso: mejora de la v2.)
  import { app, isMaster, me } from '../core/sync/store.svelte';
  import { guard } from '../core/sync/guard';
  import * as A from '../games/hombres-lobo/actions';
  import { unlockAudio } from '../core/audio/engine';
  import type { GroupDoc } from '../core/sync/schema';

  const { group }: { group: GroupDoc } = $props();

  const STALE_MS = 60000;
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 5000);
    return () => clearInterval(t);
  });

  const narrator = $derived(app.players.find((p) => p.id === group.masterId));
  const stale = $derived.by(() => {
    if (isMaster() || !me()) return false;
    const game = group.game;
    if (!game || game.mode !== 'auto' || game.phase === 'end' || game.paused) return false;
    if (!narrator) return false;
    const hb = narrator.heartbeatAt;
    if (!hb) return false; // partidas antiguas sin latido: sin falsas alarmas
    return now - hb > STALE_MS;
  });

  function tomar() {
    unlockAudio();
    const my = me();
    if (!my) return;
    guard(() => A.setNarratorDevice(my.id));
  }
</script>

{#if stale}
  <div class="flash">
    📵 El narrador ({narrator?.name || '…'}) parece desconectado: su dispositivo lleva un rato sin dar señales.
    <button class="violet block" data-a="become-narrator" onclick={tomar}>🔊 Narrar desde este dispositivo</button>
  </div>
{/if}
