// «Wavelength» (Sintonía) como juego enchufable de la mesa. Cooperativo: la app
// custodia el objetivo del dial (solo lo ve el Psíquico), lleva los puntos y
// puntúa la cercanía.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import SkipConfirmModal from './ui/modals/SkipConfirmModal.svelte';
import MyInfoModal from './ui/modals/MyInfoModal.svelte';

export const wavelength: GameDefinition = {
  id: 'wavelength',
  emoji: '📡',
  name: 'Wavelength',
  desc: 'Sintonía pura y cooperativa: cada ronda hay un espectro entre dos ideas opuestas y un objetivo secreto que solo ve el Psíquico. Él da una pista y el equipo coloca la marca; cuanto más os leáis, más puntos. Sin respuestas correctas, solo lo bien que os entendáis.',
  minPlayers: 3,
  maxPlayers: 12,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    // Sin «wl-leave»: en Wavelength irse cierra la partida igual que terminarla,
    // así que la salida destructiva es UNA sola («wl-end»).
    'wl-mycard': MyInfoModal,
    'wl-help': HelpModal,
    'wl-demo': DemoModal,
    'wl-end': EndConfirmModal,
    'wl-skip': SkipConfirmModal,
  },
};
