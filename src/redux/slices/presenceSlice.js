
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  onlineUsers: [],
  userStatus: {},
};

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    addUser: (state, action) => {
      const user = action.payload;
      if (!state.onlineUsers.find(u => u.id === user.id)) {
        state.onlineUsers.push(user);
      }
    },
    removeUser: (state, action) => {
      const userId = action.payload;
      state.onlineUsers = state.onlineUsers.filter(u => u.id !== userId);
    },
    updateUserStatus: (state, action) => {
      const { userId, status } = action.payload;
      state.userStatus[userId] = status;
    },
    clearPresence: (state) => {
      state.onlineUsers = [];
      state.userStatus = {};
    },
  },
});

export const {
  setOnlineUsers,
  addUser,
  removeUser,
  updateUserStatus,
  clearPresence,
} = presenceSlice.actions;

export default presenceSlice.reducer;
