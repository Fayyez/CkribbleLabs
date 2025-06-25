
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import roomReducer from './slices/roomSlice';
import gameReducer from './slices/gameSlice';
import canvasReducer from './slices/canvasSlice';
import chatReducer from './slices/chatSlice';
import presenceReducer from './slices/presenceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    room: roomReducer,
    game: gameReducer,
    canvas: canvasReducer,
    chat: chatReducer,
    presence: presenceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['canvas/updatePath'],
        ignoredPaths: ['canvas.paths'],
      },
    }),
});
