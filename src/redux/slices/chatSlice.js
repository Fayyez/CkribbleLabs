import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [],
  reactions: [],
  correctGuesses: [],
  currentGuess: '',
  isGuessCorrect: false,
  isGuessClose: false,
  rateLimitedUntil: null,
  lastGuessTime: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      const message = {
        id: Date.now(),
        timestamp: Date.now(),
        ...action.payload,
      };
      state.messages.push(message);
      
      // Keep only last 50 messages
      if (state.messages.length > 50) {
        state.messages = state.messages.slice(-50);
      }
    },
    addReaction: (state, action) => {
      const reaction = {
        id: Date.now(),
        timestamp: Date.now(),
        ...action.payload,
      };
      state.reactions.push(reaction);
      
      // Remove reactions older than 5 seconds
      const now = Date.now();
      state.reactions = state.reactions.filter(r => now - r.timestamp < 5000);
    },
    addCorrectGuess: (state, action) => {
      console.log('🔥 Redux addCorrectGuess called with:', action.payload);
      const { playerId, playerName, timeTaken } = action.payload;
      if (!state.correctGuesses.find(g => g.playerId === playerId)) {
        console.log('✅ Adding new correct guess for player:', playerId, playerName);
        state.correctGuesses.push({
          playerId,
          playerName,
          timeTaken,
          timestamp: Date.now(),
        });
      } else {
        console.log('⚠️ Correct guess already exists for player:', playerId);
      }
      console.log('📊 CorrectGuesses array after update:', state.correctGuesses);
    },
    setCurrentGuess: (state, action) => {
      state.currentGuess = action.payload;
    },
    setGuessResult: (state, action) => {
      const { isCorrect, isClose } = action.payload;
      state.isGuessCorrect = isCorrect;
      state.isGuessClose = isClose;
    },
    setRateLimit: (state, action) => {
      state.rateLimitedUntil = action.payload;
      state.lastGuessTime = Date.now();
    },
    clearGuessResult: (state) => {
      state.isGuessCorrect = false;
      state.isGuessClose = false;
    },
    clearChat: (state) => {
      console.log('🧹 Redux clearChat called - clearing all chat data');
      console.log('📊 CorrectGuesses before clear:', state.correctGuesses);
      state.messages = [];
      state.reactions = [];
      state.correctGuesses = [];
      state.currentGuess = '';
      state.isGuessCorrect = false;
      state.isGuessClose = false;
      console.log('✅ Chat cleared successfully');
    },
    clearCorrectGuesses: (state) => {
      state.correctGuesses = [];
    },
  },
});

export const {
  addMessage,
  addReaction,
  addCorrectGuess,
  setCurrentGuess,
  setGuessResult,
  setRateLimit,
  clearGuessResult,
  clearChat,
  clearCorrectGuesses,
} = chatSlice.actions;

export default chatSlice.reducer;
