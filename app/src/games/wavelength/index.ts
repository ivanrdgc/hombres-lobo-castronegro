// «Wavelength» (Sintonía) como juego enchufable de la mesa. Cooperativo: la app
// custodia el objetivo del dial (solo lo ve el Psíquico), lleva el marcador y
// puntúa la cercanía.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';

export const wavelength: GameDefinition = {
  id: 'wavelength',
  emoji: '📡',
  name: 'Wavelength',
  desc: 'Sintonía pura y cooperativa: cada ronda hay un espectro entre dos ideas opuestas y un objetivo secreto que solo ve el Psíquico. Él da una pista y el equipo coloca el marcador; cuanto más os leáis, más puntos. Sin respuestas correctas, solo lo bien que os entendáis.',
  minPlayers: 2,
  maxPlayers: 12,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'wl-help': HelpModal,
    'wl-demo': DemoModal,
    'wl-leave': LeaveModal,
    'wl-end': EndConfirmModal,
  },
};
