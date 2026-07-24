<script lang="ts">
  // Aviso de POSTURA (B28). Decrypto es un juego 👥 EQUIPO: los tuyos se sientan
  // A TU LADO y el rival, ENFRENTE. Esta tira dice en todo momento quién puede
  // mirar esta pantalla, y va la primera a propósito: la franja de arriba es
  // justo la que se lee desde el otro lado de la mesa si el móvil se queda
  // apoyado, así que ahí no puede haber nada secreto — y un aviso no lo es.
  //
  // Las tres variantes tienen la MISMA forma y el mismo alto: lo único que las
  // distingue es el texto, y lo que cuentan (ser espectador, ser el encriptador
  // de la ronda, el equipo en el que juegas) ya es público en la mesa. El rival
  // no puede deducir nada nuevo por la silueta.
  const { level, text }: { level: 'solo' | 'team' | 'open'; text: string } = $props();
  const ICON = { solo: '🙈', team: '👥', open: '🔓' } as const;
</script>

<p class="deshield" class:solo={level === 'solo'} class:open={level === 'open'} data-a="de-shield" data-p={level}>
  <span class="dsemo" aria-hidden="true">{ICON[level]}</span><span class="dstxt">{text}</span>
</p>

<style>
  .deshield {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 44px;
    margin: 8px 0 10px;
    padding: 8px 12px;
    border-radius: var(--r-2, 12px);
    border: 1px solid color-mix(in srgb, var(--accent, #c8a24a) 55%, transparent);
    background: color-mix(in srgb, var(--accent, #c8a24a) 10%, var(--bg-1, #12141f));
    font-size: 0.82rem;
    line-height: 1.35;
  }
  .deshield.solo { border-color: color-mix(in srgb, var(--danger, #e0526b) 60%, transparent); background: color-mix(in srgb, var(--danger, #e0526b) 12%, var(--bg-1, #12141f)); }
  .deshield.open { border-color: var(--border, #333); background: var(--bg-1, #12141f); color: var(--muted, #a9a6c0); }
  .dsemo { font-size: 1.15rem; line-height: 1; flex: 0 0 auto; }
  .dstxt { min-width: 0; overflow-wrap: break-word; }
</style>
