import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  profile: {
    displayName: '',
    avatarUrl: '',
  },
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.loading = false;
    },
    setUserWithProfile: (state, action) => {
      const { user, profile } = action.payload;
      state.user = user;
      state.profile = {
        displayName: profile?.display_name || profile?.displayName || '',
        avatarUrl: profile?.avatar_url || profile?.avatarUrl || '',
      };
      state.loading = false;
    },
    clearUser: (state) => {
      state.user = null;
      state.profile = { displayName: '', avatarUrl: '' };
    },
    updateProfile: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
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

export const { setUser, setUserWithProfile, clearUser, updateProfile, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
