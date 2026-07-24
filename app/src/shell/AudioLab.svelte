<script lang="ts">
  import { audioState, isAudioUnlocked, onAudioState, unlockAudio } from '../core/audio/engine';
  import { cloudAvailable, getLastCloudError, testCloudSynth } from '../core/audio/tts';
  import { play, stopSpeech, INTER_PIECE_GAP_MS } from '../core/audio/player';
  import type { Utterance } from '../core/audio/player';
  import { ensureAmbience, stopAmbience, type SceneId } from '../core/audio/ambience';
  import { getVoiceConfig, setVoiceConfig, CLOUD_VOICES } from '../core/audio/voice-config';
  import { initDeviceVoice, speakDevice } from '../core/audio/device-voice';
  import { COMPO, ENAMORADOS_INTRO, narr } from '../games/hombres-lobo/texts/corpus';

  const version = __APP_VERSION__;
  let lines = $state<string[]>([]);
  let estado = $state(audioState());
  let cfg = $state(getVoiceConfig());
  let busy = $state(false);

  onAudioState((s) => (estado = s));
  initDeviceVoice();

  function log(msg: string) {
    const t = new Date().toLocaleTimeString('es-ES', { hour12: false });
    lines = [`${t} · ${msg}`, ...lines].slice(0, 40);
  }

  async function timedPlay(name: string, u: Utterance) {
    if (busy) return;
    busy = true;
    const t0 = performance.now();
    let lastSeg = t0;
    try {
      const outcome = await play(u, {
        onSegment: (i) => {
          const now = performance.now();
          if (i > 0) log(`  segmento ${i} arranca (+${Math.round(now - lastSeg)} ms desde el anterior)`);
          lastSeg = now;
        },
      });
      log(`${name}: ${outcome} en ${Math.round(performance.now() - t0)} ms`);
      if (outcome === 'fell-back') log(`  ⚠️ nube caída: ${getLastCloudError() || 'sin detalle'}`);
    } catch (e) {
      log(`${name}: ERROR ${e}`);
    } finally {
      busy = false;
    }
  }

  const fraseSuelta = () =>
    timedPlay('frase suelta', {
      id: 'lab:frase',
      segments: [{ kind: 'clip', text: 'La voz del narrador funciona correctamente. Uno, dos, tres.' }],
    });

  const cadenaTresPiezas = () =>
    timedPlay('cadena 3 piezas', {
      id: 'lab:cadena',
      segments: [
        { kind: 'clip', text: COMPO.vidente[0][0] },
        { kind: 'clip', text: COMPO.vidente[1][0] },
        { kind: 'clip', text: COMPO.vidente[2][0] },
      ],
    });

  const llamadaClave = () =>
    timedPlay('llamada con palabras clave', {
      id: 'lab:kw',
      segments: [
        { kind: 'clip', text: ENAMORADOS_INTRO },
        { kind: 'gap', ms: 600 },
        { kind: 'clip', text: 'Luna de Plata.' },
        { kind: 'gap', ms: 500 },
        { kind: 'clip', text: 'y Cuervo de Ceniza.' },
      ],
    });

  const locucionLarga = () =>
    timedPlay('locución multi-frase (pausas SSML)', {
      id: 'lab:larga',
      segments: [{ kind: 'clip', text: narr('noche_cae', 'lab:7') }],
    });

  async function probarSynth() {
    log('sintetizando (sin reproducir)…');
    const r = await testCloudSynth('Prueba de síntesis número ' + new Date().getSeconds() + '.');
    log(r.ok ? `síntesis ok en ${r.ms} ms` : `síntesis FALLÓ (${r.ms} ms): ${r.error}`);
  }

  async function probarDispositivo() {
    log('voz del dispositivo…');
    await speakDevice('Esta es la voz del propio dispositivo, el plan de reserva.');
    log('voz del dispositivo: fin');
  }

  function cambiarVoz(e: Event) {
    setVoiceConfig({ cloudVoice: (e.target as HTMLSelectElement).value });
    cfg = getVoiceConfig();
    log(`voz → ${cfg.cloudVoice}`);
  }

  // Escenas de ambiente, para auditarlas de una en una (B30).
  const SCENE_LIST: { id: SceneId; label: string }[] = [
    { id: 'night', label: '🌕 Pueblo de noche' },
    { id: 'day', label: '🐦 Pueblo de día' },
    { id: 'espia', label: '🕵️ Lugar público' },
    { id: 'insider', label: '🤫 Contrarreloj' },
    { id: 'chameleon', label: '🦎 Sala tranquila' },
    { id: 'coup', label: '🃏 Corte de intrigas' },
    { id: 'avalon', label: '🏰 Castillo' },
    { id: 'secret_hitler', label: '🏛️ Sala de gobierno' },
    { id: 'two_rooms', label: '💣 Cuenta atrás' },
    { id: 'codenames', label: '🕵️ Cuartel de espías' },
    { id: 'decrypto', label: '🔐 Sala de radio' },
    { id: 'good_cop', label: '🚔 Comisaría' },
    { id: 'shadow_hunters', label: '🌘 Bosque de sombras' },
    { id: 'sonar', label: '⚓ Submarino' },
    { id: 'wavelength', label: '📡 Sintonía' },
    { id: 'skull', label: '💀 Taberna' },
    { id: 'love_letter', label: '💌 Palacio' },
  ];
</script>

<main>
  <h1>🔬 Laboratorio de audio</h1>
  <p class="meta">
    {version} · clave TTS: {cloudAvailable() ? 'sí' : 'NO'} · contexto: <b>{estado.state}</b> ·
    desbloqueado: <b>{estado.unlocked ? 'sí' : 'no'}</b> · gap entre piezas: {INTER_PIECE_GAP_MS} ms
  </p>

  <section class="grid">
    <button data-a="lab-unlock" onclick={() => { unlockAudio(); log(`unlock → ${JSON.stringify(audioState())} (unlocked=${isAudioUnlocked()})`); }}>
      🔓 Desbloquear audio
    </button>
    <button data-a="lab-synth" onclick={probarSynth}>🌩️ Probar síntesis</button>
    <button data-a="lab-frase" disabled={busy} onclick={fraseSuelta}>▶️ Frase suelta</button>
    <button data-a="lab-cadena" disabled={busy} onclick={cadenaTresPiezas}>⛓️ Cadena de 3 piezas</button>
    <button data-a="lab-kw" disabled={busy} onclick={llamadaClave}>📣 Llamada con palabras</button>
    <button data-a="lab-larga" disabled={busy} onclick={locucionLarga}>🌙 Multi-frase (pausas)</button>
    <button data-a="lab-device" onclick={probarDispositivo}>📱 Voz del dispositivo</button>
    <button data-a="lab-stop" onclick={() => { stopSpeech('hard'); log('stop hard'); }}>⏹️ Parar</button>
    <button data-a="lab-amb-off" onclick={() => { stopAmbience(); log('ambience: off'); }}>🔇 Ambiente off</button>
  </section>

  <!-- Banco de escenas: para escucharlas una a una sin montar una partida. -->
  <section class="btns">
    {#each SCENE_LIST as sc (sc.id)}
      <button data-a="lab-amb" data-p={sc.id} onclick={() => { ensureAmbience(sc.id); log('ambiente: ' + sc.id); }}>{sc.label}</button>
    {/each}
  </section>

  <label class="voz">
    Voz neuronal:
    <select onchange={cambiarVoz} value={cfg.cloudVoice}>
      {#each CLOUD_VOICES as v (v.id)}
        <option value={v.id}>{v.label}</option>
      {/each}
    </select>
  </label>

  <section class="log" aria-live="polite">
    {#each lines as l, i (i)}
      <div>{l}</div>
    {:else}
      <div class="hint">Pulsa 🔓 primero (gesto de desbloqueo) y luego prueba los botones. En iPhone, prueba también tras bloquear y desbloquear la pantalla.</div>
    {/each}
  </section>

  <p class="back"><a href="#/">← volver</a></p>
</main>

<style>
  main {
    max-width: 640px;
    margin: 0 auto;
    padding: var(--sp-5);
  }

  h1 {
    font-family: var(--font-display);
    font-size: var(--fs-4);
    margin: 0 0 var(--sp-2);
  }

  .meta {
    color: var(--ink-2);
    font-size: var(--fs-0);
    margin: 0 0 var(--sp-4);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: var(--sp-2);
    margin-bottom: var(--sp-4);
  }

  button {
    padding: var(--sp-3);
    background: var(--bg-2);
    border: 1px solid var(--line);
    border-radius: var(--r-2);
    color: var(--ink-1);
    cursor: pointer;
    transition: background var(--t-fast), transform var(--t-fast);
  }

  button:active {
    transform: scale(0.97);
  }

  button:hover {
    background: var(--bg-3);
  }

  button:disabled {
    opacity: 0.5;
  }

  .voz {
    display: flex;
    gap: var(--sp-2);
    align-items: center;
    color: var(--ink-2);
    margin-bottom: var(--sp-4);
  }

  select {
    background: var(--bg-2);
    color: var(--ink-1);
    border: 1px solid var(--line);
    border-radius: var(--r-1);
    padding: var(--sp-2);
  }

  .log {
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--r-2);
    padding: var(--sp-3);
    font-family: ui-monospace, monospace;
    font-size: var(--fs-0);
    min-height: 160px;
    max-height: 320px;
    overflow-y: auto;
    color: var(--ink-2);
  }

  .hint {
    color: var(--ink-3);
  }

  .back a {
    color: var(--luna);
  }
</style>
