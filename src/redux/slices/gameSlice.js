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
  settings: null, // Store game settings
  // Add progress tracking
  turnsInCurrentRound: 0,
  turnsPerRound: 0,
  completedTurns: 0,
  totalTurns: 0,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (state, action) => {
      console.log('🎮 Redux startGame action payload:', action.payload);
      const { 
        turnOrder, 
        currentRound, 
        totalRounds, 
        drawerId, 
        gameStartTime, 
        isActive = true, 
        settings,
        timeRemaining,
        ...rest 
      } = action.payload;
      
      // Set basic game state
      state.isActive = isActive;
      state.currentRound = currentRound || 1;
      state.totalRounds = totalRounds || settings?.rounds || 3; // Ensure totalRounds is set properly
      state.drawerId = drawerId;
      state.gameStartTime = gameStartTime || Date.now();
      state.isGameOver = false;
      state.currentTurnIndex = 0;
      
      // Set time remaining from settings if provided
      if (timeRemaining !== undefined) {
        state.timeRemaining = timeRemaining;
      } else if (settings?.drawingTime) {
        state.timeRemaining = settings.drawingTime;
      }
      
      // Set turn order and calculate turns per round
      if (turnOrder && Array.isArray(turnOrder) && turnOrder.length > 0) {
        state.turnOrder = turnOrder;
        state.turnsPerRound = turnOrder.length;
        state.totalTurns = state.turnsPerRound * state.totalRounds;
        state.turnsInCurrentRound = 1;
        state.completedTurns = 0;
      }
      
      // Store settings for future reference
      if (settings) {
        state.settings = settings;
      }
      
      // Apply any other payload properties
      Object.keys(rest).forEach(key => {
        if (rest[key] !== undefined && initialState.hasOwnProperty(key)) {
          state[key] = rest[key];
        }
      });
      
      console.log('🎮 Redux state after startGame:', {
        isActive: state.isActive,
        currentRound: state.currentRound,
        totalRounds: state.totalRounds,
        drawerId: state.drawerId,
        turnOrder: state.turnOrder,
        turnsPerRound: state.turnsPerRound,
        totalTurns: state.totalTurns,
        timeRemaining: state.timeRemaining,
        hasSettings: !!state.settings
      });
    },
    startRound: (state, action) => {
      console.log('🎯 Redux startRound action payload:', action.payload);
      const { round, roundNumber, drawerId, wordLength, drawingTime, turnIndex, wordOptions, isNewRound } = action.payload;
      console.log('🎯 Setting drawerId to:', drawerId, 'wordLength:', wordLength);
      
      // Only update round if it's actually a new round
      if (isNewRound || round || roundNumber) {
        state.currentRound = round || roundNumber || state.currentRound;
      }
      
      state.drawerId = drawerId;
      state.wordLength = wordLength || 0;
      state.timeRemaining = drawingTime || state.timeRemaining || 60;
      state.roundStartTime = Date.now();
      state.currentWord = null;
      state.wordOptions = wordOptions || [];
      
      if (turnIndex !== undefined) {
        state.currentTurnIndex = turnIndex;
        
        // Ensure turnsPerRound is set properly
        if (!state.turnsPerRound && state.turnOrder.length > 0) {
          state.turnsPerRound = state.turnOrder.length;
          state.totalTurns = state.turnsPerRound * state.totalRounds;
        }
        
        // Update progress tracking with proper validation
        if (state.turnsPerRound > 0) {
          state.turnsInCurrentRound = (turnIndex % state.turnsPerRound) + 1;
          state.completedTurns = (state.currentRound - 1) * state.turnsPerRound + state.turnsInCurrentRound;
        } else {
          // Fallback calculation
          state.turnsInCurrentRound = turnIndex + 1;
          state.completedTurns = (state.currentRound - 1) * state.turnOrder.length + state.turnsInCurrentRound;
        }
      }
      
      console.log('🎯 Redux state after startRound:', {
        currentRound: state.currentRound,
        drawerId: state.drawerId,
        wordLength: state.wordLength,
        wordOptions: state.wordOptions.length,
        currentTurnIndex: state.currentTurnIndex,
        timeRemaining: state.timeRemaining,
        turnsInCurrentRound: state.turnsInCurrentRound,
        completedTurns: state.completedTurns,
        turnsPerRound: state.turnsPerRound
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
      // Enhanced score update with validation and logging
      const newScores = action.payload;
      
      // Validate that payload contains valid scores
      if (!newScores || typeof newScores !== 'object') {
        console.warn('⚠️ Invalid scores payload received:', newScores);
        return;
      }
      
      // Validate individual scores
      const validatedScores = {};
      Object.entries(newScores).forEach(([playerId, score]) => {
        if (typeof score === 'number' && !isNaN(score) && score >= 0) {
          validatedScores[playerId] = score;
        } else {
          console.warn('⚠️ Invalid score for player', playerId, ':', score);
        }
      });
      
      console.log('📊 Updating scores:', validatedScores);
      
      state.scores = { ...state.scores, ...validatedScores };
      state.leaderboard = Object.entries(state.scores)
        .map(([playerId, score]) => ({ playerId, score }))
        .sort((a, b) => b.score - a.score);
        
      console.log('📊 Updated leaderboard:', state.leaderboard);
    },
    endRound: (state, action) => {
      const { 
        nextDrawer, 
        nextRound, 
        nextTurnIndex, 
        isGameOver, 
        scores, 
        isNewRound,
        gameProgress 
      } = action.payload;
      
      console.log('🏁 Redux endRound:', {
        nextDrawer,
        nextRound,
        nextTurnIndex,
        isGameOver,
        isNewRound,
        gameProgress,
        currentTurnsPerRound: state.turnsPerRound
      });
      
      if (scores) {
        state.scores = { ...state.scores, ...scores };
        state.leaderboard = Object.entries(state.scores)
          .map(([playerId, score]) => ({ playerId, score }))
          .sort((a, b) => b.score - a.score);
      }
      
      if (isGameOver) {
        state.isGameOver = true;
        state.isActive = false;
        console.log('🎉 Game marked as over');
      } else {
        // Update for next turn/round
        state.drawerId = nextDrawer;
        if (nextRound !== undefined) {
          state.currentRound = nextRound;
        }
        if (nextTurnIndex !== undefined) {
          state.currentTurnIndex = nextTurnIndex;
          
          // Ensure turnsPerRound is set properly
          if (!state.turnsPerRound && state.turnOrder.length > 0) {
            state.turnsPerRound = state.turnOrder.length;
            state.totalTurns = state.turnsPerRound * state.totalRounds;
          }
          
          // Update progress tracking with proper validation
          if (state.turnsPerRound > 0) {
            state.turnsInCurrentRound = (nextTurnIndex % state.turnsPerRound) + 1;
            state.completedTurns = (state.currentRound - 1) * state.turnsPerRound + state.turnsInCurrentRound;
          } else {
            // Fallback calculation
            state.turnsInCurrentRound = nextTurnIndex + 1;
            state.completedTurns = (state.currentRound - 1) * state.turnOrder.length + state.turnsInCurrentRound;
          }
        }
        
        // Clear current word and options for next turn
        state.currentWord = null;
        state.wordOptions = [];
        state.wordLength = 0;
        
        console.log('🔄 Updated for next turn:', {
          currentRound: state.currentRound,
          currentTurnIndex: state.currentTurnIndex,
          drawerId: state.drawerId,
          turnsInCurrentRound: state.turnsInCurrentRound,
          completedTurns: state.completedTurns,
          turnsPerRound: state.turnsPerRound,
          isNewRound
        });
      }
      
      // Update progress from backend if available (with validation)
      if (gameProgress) {
        if (gameProgress.completedTurns !== undefined && !isNaN(gameProgress.completedTurns)) {
          state.completedTurns = gameProgress.completedTurns;
        }
        if (gameProgress.totalTurns !== undefined && !isNaN(gameProgress.totalTurns)) {
          state.totalTurns = gameProgress.totalTurns;
        }
        if (gameProgress.turnsInCurrentRound !== undefined && !isNaN(gameProgress.turnsInCurrentRound)) {
          state.turnsInCurrentRound = gameProgress.turnsInCurrentRound;
        }
        if (gameProgress.turnsPerRound !== undefined && !isNaN(gameProgress.turnsPerRound)) {
          state.turnsPerRound = gameProgress.turnsPerRound;
        }
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
      console.log('🎉 Game ended, winner:', winner);
    },
    setTurnOrder: (state, action) => {
      state.turnOrder = action.payload;
      state.turnsPerRound = action.payload.length;
      state.totalTurns = state.turnsPerRound * state.totalRounds;
    },
    nextTurn: (state) => {
      state.currentTurn += 1;
      state.currentTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
      if (state.turnOrder.length > 0) {
        state.drawerId = state.turnOrder[state.currentTurnIndex];
      }
      
      // Update progress tracking
      state.turnsInCurrentRound = (state.currentTurnIndex % state.turnsPerRound) + 1;
      state.completedTurns += 1;
      
      // Check if we've completed a full round
      if (state.currentTurnIndex === 0 && state.currentTurn > 1) {
        state.currentRound += 1;
        console.log('🔄 New round started:', state.currentRound);
      }
    },
    setCurrentTurnIndex: (state, action) => {
      state.currentTurnIndex = action.payload;
      if (state.turnOrder.length > 0) {
        state.drawerId = state.turnOrder[state.currentTurnIndex];
        // Update progress tracking
        state.turnsInCurrentRound = (state.currentTurnIndex % state.turnsPerRound) + 1;
        state.completedTurns = (state.currentRound - 1) * state.turnsPerRound + state.turnsInCurrentRound;
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
