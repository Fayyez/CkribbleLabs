
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateProfile } from '../redux/slices/authSlice';

const AVATAR_OPTIONS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🦄', '🐺', '🦝', '🦆', '🐧', '🦋', '🐝', '🐞'
];

const Profile = () => {
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const dispatch = useDispatch();

  const handleSave = () => {
    if (displayName.trim()) {
      dispatch(updateProfile({
        displayName: displayName.trim(),
        avatarUrl: selectedAvatar,
      }));
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1>Create Your Player Profile</h1>
        
        <div className="profile-form">
          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field"
              maxLength={20}
            />
            <small>{displayName.length}/20 characters</small>
          </div>

          <div className="form-group">
            <label>Choose Your Avatar</label>
            <div className="avatar-grid">
              {AVATAR_OPTIONS.map((avatar, index) => (
                <button
                  key={index}
                  className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                  onClick={() => setSelectedAvatar(avatar)}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-preview">
            <div className="preview-avatar">{selectedAvatar}</div>
            <div className="preview-name">{displayName || 'Your Name'}</div>
          </div>

          <button
            onClick={handleSave}
            disabled={!displayName.trim()}
            className="btn-primary"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
