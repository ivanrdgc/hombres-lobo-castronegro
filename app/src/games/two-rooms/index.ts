// «Two Rooms and a Boom» como juego enchufable de la mesa (adaptación digital).
// La app hace de máster oculto: reparte bandos y roles (Presidente/Bombardero),
// coloca a la gente en dos salas, lleva el reloj de cada ronda, cuenta el voto
// de rehén de cada sala e intercambia, y dictamina el ganador al final.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import MyInfoModal from './ui/modals/MyInfoModal.svelte';

export const twoRooms: GameDefinition = {
  id: 'two_rooms',
  emoji: '💣',
  name: 'Two Rooms and a Boom',
  desc: 'Dos salas y dos bandos secretos: entre los azules, un Presidente; entre los rojos, un Bombardero. Contrarreloj, cada sala manda rehenes a la otra. Si al final el Bombardero acaba junto al Presidente, ¡boom!, gana el rojo; si no, gana el azul. Para grupos grandes (6+).',
  minPlayers: 6,
  maxPlayers: 30,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'tr-mycard': MyInfoModal,
    'tr-demo': DemoModal,
    'tr-help': HelpModal,
    'tr-leave': LeaveModal,
    'tr-end': EndConfirmModal,
  },
};
