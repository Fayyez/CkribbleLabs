import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase, getOrCreateUserProfile } from './lib/supabase';
import { setUserWithProfile, clearUser, setLoading, setError } from './redux/slices/authSlice';
import Login from './pages/Login';
import RoomSelection from './pages/RoomSelection';
import CreateRoom from './pages/CreateRoom';
import WaitingRoom from './pages/WaitingRoom';
import GamePage from './pages/GamePage';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);

  const handleAuthUser = async (user) => {
    if (!user) {
      dispatch(clearUser());
      return;
    }

    try {
      dispatch(setLoading(true));
      
      // Fetch or create user profile from database
      const profile = await getOrCreateUserProfile(user);
      
      // Set user and profile data in Redux store
      dispatch(setUserWithProfile({ user, profile }));
    } catch (error) {
      console.error('Error handling authenticated user:', error);
      dispatch(setError('Failed to load user profile'));
      // Still set the user even if profile fetch fails
      dispatch(setUserWithProfile({ user, profile: null }));
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthUser(session?.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthUser(session?.user);
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<RoomSelection />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/room/:roomId/waiting" element={<WaitingRoom />} />
          <Route path="/room/:roomId/game" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
