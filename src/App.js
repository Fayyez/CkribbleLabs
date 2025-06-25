
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from './lib/supabase';
import { setUser, clearUser } from './redux/slices/authSlice';
import Login from './pages/Login';
import Profile from './pages/Profile';
import RoomSelection from './pages/RoomSelection';
import CreateRoom from './pages/CreateRoom';
import WaitingRoom from './pages/WaitingRoom';
import GamePage from './pages/GamePage';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(setUser(session.user));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        dispatch(setUser(session.user));
      } else {
        dispatch(clearUser());
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  if (!user) {
    return <Login />;
  }

  if (!profile.displayName) {
    return <Profile />;
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
