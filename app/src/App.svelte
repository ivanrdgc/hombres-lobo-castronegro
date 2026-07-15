<script lang="ts">
  import AudioLab from './shell/AudioLab.svelte';

  const version = __APP_VERSION__;

  // Rutas de desarrollo por hash mientras se construye el shell (F4 trae el
  // enrutado real por pathname, compatible con /g/<slug> de la v1).
  let hash = $state(location.hash);
  window.addEventListener('hashchange', () => (hash = location.hash));
</script>

{#if hash === '#audio'}
  <AudioLab />
{:else}
  <main>
    <section class="card">
      <div class="moon" aria-hidden="true"></div>
      <p class="kicker">Juegos digitales</p>
      <h1>Castronegro <span class="v2">v2</span></h1>
      <p class="sub">
        La nueva versión está en construcción. La app de siempre sigue funcionando en su dirección
        habitual: aquí solo se prueba lo nuevo.
      </p>
      <p class="dev"><a href="#audio">🔬 Laboratorio de audio</a></p>
      <p class="stamp">{version}</p>
    </section>
  </main>
{/if}

<style>
  main {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: var(--sp-5);
  }

  .card {
    position: relative;
    max-width: 440px;
    width: 100%;
    padding: var(--sp-6) var(--sp-5);
    background: linear-gradient(180deg, var(--bg-2), var(--bg-1));
    border: 1px solid var(--line);
    border-radius: var(--r-3);
    box-shadow: var(--shadow-2);
    text-align: center;
    overflow: hidden;
    animation: subir 500ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
  }

  .moon {
    position: absolute;
    top: -70px;
    right: -70px;
    width: 180px;
    height: 180px;
    border-radius: var(--r-full);
    background: radial-gradient(
      circle at 35% 35%,
      var(--luna-2),
      var(--luna) 45%,
      transparent 72%
    );
    opacity: 0.22;
    pointer-events: none;
  }

  .kicker {
    margin: 0 0 var(--sp-2);
    color: var(--ink-3);
    font-size: var(--fs-0);
    text-transform: uppercase;
    letter-spacing: 0.18em;
  }

  h1 {
    margin: 0 0 var(--sp-4);
    font-family: var(--font-display);
    font-size: var(--fs-5);
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .v2 {
    color: var(--luna);
  }

  .sub {
    margin: 0 auto var(--sp-4);
    max-width: 34ch;
    color: var(--ink-2);
  }

  .dev {
    margin: 0 0 var(--sp-5);
  }

  .dev a {
    color: var(--luna);
  }

  .stamp {
    margin: 0;
    color: var(--ink-3);
    font-size: var(--fs-0);
    font-variant-numeric: tabular-nums;
  }

  @keyframes subir {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
