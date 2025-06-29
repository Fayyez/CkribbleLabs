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
      
      // CRITICAL: Completely reset game state to prevent corruption
      state.isActive = true;
      state.isGameOver = false; // Explicitly reset game over state
      state.currentRound = round || 1;
      state.currentTurn = 1;
      state.currentTurnIndex = 0;
      state.drawerId = nextDrawer || drawerId; // Use either field
      state.wordOptions = wordOptions || [];
      state.turnOrder = turnOrder || [];
      state.gameStartTime = Date.now();
      state.winner = null; // Reset winner
      state.currentWord = null; // Reset current word
      state.wordLength = 0; // Reset word length
      state.timeRemaining = 60; // Reset timer
      state.error = null; // Clear any errors
      
      // If we have full game state, use it
      if (gameState) {
        state.totalRounds = gameState.totalRounds || 3;
        state.scores = gameState.scores || {};
        state.timeRemaining = gameState.settings?.drawingTime || 60;
      }
      
      console.log('🎮 Redux state after startGame (full reset):', {
        isActive: state.isActive,
        isGameOver: state.isGameOver,
        drawerId: state.drawerId,
        currentRound: state.currentRound,
        turnOrder: state.turnOrder,
        wordOptions: state.wordOptions.length,
        currentWord: state.currentWord,
        timeRemaining: state.timeRemaining
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
      console.log('📝 Redux selectWord action payload:', action.payload);
      const word = action.payload;
      state.currentWord = word;
      state.wordLength = word ? word.length : 0;
      state.wordOptions = [];
      
      // Activate the game when word is selected
      if (word) {
        state.isActive = true;
        console.log('✅ Game activated after word selection');
      }
      
      console.log('📝 Redux state after selectWord:', {
        currentWord: state.currentWord,
        wordLength: state.wordLength,
        isActive: state.isActive
      });
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
    resetGameOverState: (state) => {
      console.log('🔄 Forcing reset of game over state');
      state.isGameOver = false;
      if (!state.currentWord && state.wordOptions.length === 0) {
        // If no word is selected and no options, the game should be active for word selection
        state.isActive = true;
      }
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
  resetGameOverState,
} = gameSlice.actions;

export default gameSlice.reducer;
