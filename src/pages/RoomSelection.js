
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import { clearUser } from '../redux/slices/authSlice';

const RoomSelection = () => {
  const [roomCode, setRoomCode] = useState('');
  const [joinMethod, setJoinMethod] = useState('code'); // code or link
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.auth);

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;
    
    // In a real app, you'd validate the room exists
    navigate(`/room/${roomCode.trim()}/waiting`);
  };

  const handleCreateRoom = () => {
    navigate('/create-room');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    dispatch(clearUser());
  };

  return (
    <div className="room-selection-container">
      <header className="app-header">
        <h1>Draw & Guess</h1>
        <div className="user-info">
          <span className="user-avatar">{profile.avatarUrl}</span>
          <span className="user-name">{profile.displayName}</span>
          <button onClick={handleSignOut} className="btn-logout">
            Sign Out
          </button>
        </div>
      </header>

      <div className="room-selection-content">
        <div className="welcome-section">
          <h2>Welcome back, {profile.displayName}!</h2>
          <p>Ready to draw and guess? Join a room or create your own!</p>
        </div>

        <div className="room-options">
          <div className="option-card">
            <h3>Join a Room</h3>
            <div className="join-methods">
              <div className="method-selector">
                <button
                  className={`method-btn ${joinMethod === 'code' ? 'active' : ''}`}
                  onClick={() => setJoinMethod('code')}
                >
                  Room Code
                </button>
                <button
                  className={`method-btn ${joinMethod === 'link' ? 'active' : ''}`}
                  onClick={() => setJoinMethod('link')}
                >
                  Room Link
                </button>
              </div>

              <div className="join-form">
                <input
                  type="text"
                  placeholder={joinMethod === 'code' ? 'Enter room code' : 'Paste room link'}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="input-field"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomCode.trim()}
                  className="btn-primary"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="option-card">
            <h3>Create New Room</h3>
            <p>Set up a private room with custom rules</p>
            <button onClick={handleCreateRoom} className="btn-secondary">
              Create Room
            </button>
          </div>
        </div>

        <div className="info-section">
          <div className="info-item">
            <span className="info-icon">👥</span>
            <span>Max 22 players per room</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🎨</span>
            <span>Real-time drawing and guessing</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🏆</span>
            <span>Team or individual play</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomSelection;
