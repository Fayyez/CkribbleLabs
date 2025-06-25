
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  roomId: null,
  hostId: null,
  players: [],
  settings: {
    rounds: 3,
    maxWordLength: 15,
    theme: 'default',
    isThemedGame: false,
    isTeamGame: false,
    teamNames: ['Red', 'Blue'],
  },
  status: 'idle', // idle, waiting, active, ended
  loading: false,
  error: null,
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRoom: (state, action) => {
      const { roomId, hostId, settings } = action.payload;
      state.roomId = roomId;
      state.hostId = hostId;
      state.settings = { ...state.settings, ...settings };
      state.status = 'waiting';
    },
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    addPlayer: (state, action) => {
      const player = action.payload;
      if (!state.players.find(p => p.id === player.id)) {
        state.players.push(player);
      }
    },
    removePlayer: (state, action) => {
      const playerId = action.payload;
      state.players = state.players.filter(p => p.id !== playerId);
    },
    updatePlayer: (state, action) => {
      const { playerId, updates } = action.payload;
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        state.players[playerIndex] = { ...state.players[playerIndex], ...updates };
      }
    },
    setPlayers: (state, action) => {
      state.players = action.payload;
    },
    setRoomStatus: (state, action) => {
      state.status = action.payload;
    },
    clearRoom: (state) => {
      return initialState;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setRoom,
  updateSettings,
  addPlayer,
  removePlayer,
  updatePlayer,
  setPlayers,
  setRoomStatus,
  clearRoom,
  setLoading,
  setError,
} = roomSlice.actions;

export default roomSlice.reducer;
