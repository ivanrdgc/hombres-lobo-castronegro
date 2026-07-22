// Semilla de test para los e2e (jamás activa en producción: solo la enciende
// Playwright con addInitScript, poniendo window.__hlcTest = true ANTES de que
// cargue la app). Con ella:
//   • las locuciones NO se sintetizan ni suenan: se registran en un transcript
//     y resuelven al instante (adiós al colchón mudo de 800 ms por locución);
//   • los colchones del narrador se comprimen (el fakeConfirmHold de 4–9 s y
//     compañía dejan de dominar el reloj del e2e);
//   • la ambientación no arranca.
// El transcript (window.__hlcNarration) permite además VERIFICAR qué diría la
// voz (contrato pantalla=voz), no solo escrapear el DOM.

interface TestWindow {
  __hlcTest?: boolean;
  __hlcNarration?: NarrationEntry[];
}

export interface NarrationEntry {
  id: string;
  text: string;
  priority: string;
}

function testWindow(): TestWindow | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as TestWindow;
  return w.__hlcTest ? w : null;
}

/** ¿Estamos en un e2e con la semilla de test activa? */
export function e2eTestMode(): boolean {
  return testWindow() !== null;
}

/** Registra una locución en el transcript (solo en modo test). */
export function logNarration(entry: NarrationEntry): void {
  const w = testWindow();
  if (!w) return;
  (w.__hlcNarration ||= []).push(entry);
}
