import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isActive: false,
  currentRound: 1,
  currentTurn: 1,
  currentTurnIndex: 0,
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
      console.log('🎮 Redux startGame action payload:', action.payload);
      const { round, nextDrawer, drawerId, wordOptions, turnOrder, gameState } = action.payload;
      console.log('🎮 Setting drawerId to:', nextDrawer || drawerId);
      
      state.isActive = true;
      state.currentRound = round || 1;
      state.currentTurn = 1;
      state.currentTurnIndex = 0;
      state.drawerId = nextDrawer || drawerId; // Use either field
      state.wordOptions = wordOptions || [];
      state.turnOrder = turnOrder || [];
      state.gameStartTime = Date.now();
      state.isGameOver = false;
      
      // If we have full game state, use it
      if (gameState) {
        state.totalRounds = gameState.totalRounds || 3;
        state.scores = gameState.scores || {};
      }
      
      console.log('🎮 Redux state after startGame:', {
        isActive: state.isActive,
        drawerId: state.drawerId,
        currentRound: state.currentRound,
        turnOrder: state.turnOrder,
        wordOptions: state.wordOptions.length
      });
    },
    startRound: (state, action) => {
      console.log('🎯 Redux startRound action payload:', action.payload);
      const { round, roundNumber, drawerId, wordLength, drawingTime, turnIndex, wordOptions } = action.payload;
      console.log('🎯 Setting drawerId to:', drawerId);
      
      state.currentRound = round || roundNumber;
      state.drawerId = drawerId;
      state.wordLength = wordLength;
      state.timeRemaining = drawingTime || 60;
      state.roundStartTime = Date.now();
      state.currentWord = null;
      state.wordOptions = wordOptions || [];
      
      if (turnIndex !== undefined) {
        state.currentTurnIndex = turnIndex;
      }
      
      console.log('🎯 Redux state after startRound:', {
        currentRound: state.currentRound,
        drawerId: state.drawerId,
        wordOptions: state.wordOptions.length,
        currentTurnIndex: state.currentTurnIndex
      });
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
      const { nextDrawer, nextRound, nextTurnIndex, isGameOver, scores } = action.payload;
      
      if (scores) {
        state.scores = { ...state.scores, ...scores };
        state.leaderboard = Object.entries(state.scores)
          .map(([playerId, score]) => ({ playerId, score }))
          .sort((a, b) => b.score - a.score);
      }
      
      if (isGameOver) {
        state.isGameOver = true;
        state.isActive = false;
      } else {
        state.drawerId = nextDrawer;
        state.currentRound = nextRound || state.currentRound;
        state.currentTurnIndex = nextTurnIndex !== undefined ? nextTurnIndex : state.currentTurnIndex;
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
      state.currentTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
      if (state.turnOrder.length > 0) {
        state.drawerId = state.turnOrder[state.currentTurnIndex];
      }
      
      // Check if we've completed a full round
      if (state.currentTurnIndex === 0 && state.currentTurn > 1) {
        state.currentRound += 1;
      }
    },
    setCurrentTurnIndex: (state, action) => {
      state.currentTurnIndex = action.payload;
      if (state.turnOrder.length > 0) {
        state.drawerId = state.turnOrder[state.currentTurnIndex];
      }
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
  setCurrentTurnIndex,
  resetGame,
  setLoading,
  setError,
} = gameSlice.actions;

export default gameSlice.reducer;
