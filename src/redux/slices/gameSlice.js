
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isActive: false,
  currentRound: 1,
  currentTurn: 1,
  totalRounds: 3,
  drawerId: null,
  currentWord: null,
  wordOptions: [],
  wordLength: 0,
  timeRemaining: 60,
  scores: {},
  leaderboard: [],
  turnOrder: [],
  gameStartTime: null,
  roundStartTime: null,
  isGameOver: false,
  winner: null,
  teamScores: {},
  loading: false,
  error: null,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (state, action) => {
      const { round, nextDrawer, wordOptions, turnOrder } = action.payload;
      state.isActive = true;
      state.currentRound = round || 1;
      state.currentTurn = 1;
      state.drawerId = nextDrawer;
      state.wordOptions = wordOptions || [];
      state.turnOrder = turnOrder || [];
      state.gameStartTime = Date.now();
      state.isGameOver = false;
    },
    startRound: (state, action) => {
      const { round, drawerId, wordLength, drawingTime } = action.payload;
      state.currentRound = round;
      state.drawerId = drawerId;
      state.wordLength = wordLength;
      state.timeRemaining = drawingTime || 60;
      state.roundStartTime = Date.now();
      state.currentWord = null;
      state.wordOptions = [];
    },
    selectWord: (state, action) => {
      state.currentWord = action.payload;
      state.wordOptions = [];
    },
    setWordOptions: (state, action) => {
      state.wordOptions = action.payload;
    },
    updateTimer: (state, action) => {
      state.timeRemaining = action.payload;
    },
    updateScores: (state, action) => {
      state.scores = { ...state.scores, ...action.payload };
      state.leaderboard = Object.entries(state.scores)
        .map(([playerId, score]) => ({ playerId, score }))
        .sort((a, b) => b.score - a.score);
    },
    endRound: (state, action) => {
      const { nextDrawer, nextRound, gameOver, scores } = action.payload;
      if (scores) {
        state.scores = { ...state.scores, ...scores };
      }
      
      if (gameOver) {
        state.isGameOver = true;
        state.isActive = false;
      } else {
        state.drawerId = nextDrawer;
        state.currentRound = nextRound || state.currentRound;
        state.currentTurn += 1;
      }
    },
    endGame: (state, action) => {
      const { winner, teamScores, finalScores } = action.payload;
      state.isGameOver = true;
      state.isActive = false;
      state.winner = winner;
      state.teamScores = teamScores || {};
      if (finalScores) {
        state.scores = finalScores;
      }
    },
    setTurnOrder: (state, action) => {
      state.turnOrder = action.payload;
    },
    nextTurn: (state) => {
      state.currentTurn += 1;
      const nextDrawerIndex = (state.currentTurn - 1) % state.turnOrder.length;
      state.drawerId = state.turnOrder[nextDrawerIndex];
    },
    resetGame: (state) => {
      return { ...initialState, totalRounds: state.totalRounds };
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
  startGame,
  startRound,
  selectWord,
  setWordOptions,
  updateTimer,
  updateScores,
  endRound,
  endGame,
  setTurnOrder,
  nextTurn,
  resetGame,
  setLoading,
  setError,
} = gameSlice.actions;

export default gameSlice.reducer;
