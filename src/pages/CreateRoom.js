
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { callEdgeFunction } from '../lib/supabase';
import { setRoom, setLoading, setError } from '../redux/slices/roomSlice';

const THEMES = [
  { value: 'default', label: 'Mixed' },
  { value: 'animals', label: 'Animals' },
  { value: 'geography', label: 'Geography' },
  { value: 'comp_sci', label: 'Computer Science' },
];

const CreateRoom = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { loading } = useSelector((state) => state.room);

  const [settings, setSettings] = useState({
    rounds: 3,
    maxWordLength: 15,
    theme: 'default',
    isThemedGame: false,
    isTeamGame: false,
    teamNames: ['Red', 'Blue'],
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateTeamName = (index, name) => {
    const newTeamNames = [...settings.teamNames];
    newTeamNames[index] = name;
    setSettings(prev => ({ ...prev, teamNames: newTeamNames }));
  };

  const handleCreate = async () => {
    dispatch(setLoading(true));
    
    try {
      const response = await callEdgeFunction('create-room', {
        hostId: user.id,
        settings,
      });

      dispatch(setRoom({
        roomId: response.roomId,
        hostId: user.id,
        settings,
      }));

      navigate(`/room/${response.roomId}/waiting`);
    } catch (error) {
      dispatch(setError(error.message));
    }
  };

  return (
    <div className="create-room-container">
      <div className="create-room-card">
        <header className="card-header">
          <button onClick={() => navigate(-1)} className="btn-back">
            ← Back
          </button>
          <h1>Create Game Room</h1>
        </header>

        <div className="settings-form">
          <div className="setting-group">
            <label>Number of Rounds</label>
            <div className="range-input">
              <input
                type="range"
                min="2"
                max="10"
                value={settings.rounds}
                onChange={(e) => updateSetting('rounds', parseInt(e.target.value))}
              />
              <span className="range-value">{settings.rounds}</span>
            </div>
          </div>

          <div className="setting-group">
            <label>Max Word Length</label>
            <div className="range-input">
              <input
                type="range"
                min="5"
                max="25"
                value={settings.maxWordLength}
                onChange={(e) => updateSetting('maxWordLength', parseInt(e.target.value))}
                disabled={settings.isThemedGame}
              />
              <span className="range-value">{settings.maxWordLength}</span>
            </div>
            {settings.isThemedGame && (
              <small className="setting-note">Disabled for themed games</small>
            )}
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.isThemedGame}
                onChange={(e) => updateSetting('isThemedGame', e.target.checked)}
              />
              <span className="checkmark"></span>
              Themed Game
            </label>
            {settings.isThemedGame && (
              <select
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value)}
                className="select-field"
              >
                {THEMES.map(theme => (
                  <option key={theme.value} value={theme.value}>
                    {theme.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.isTeamGame}
                onChange={(e) => updateSetting('isTeamGame', e.target.checked)}
              />
              <span className="checkmark"></span>
              Team Game
            </label>
            {settings.isTeamGame && (
              <div className="team-settings">
                <div className="team-input">
                  <label>Team 1 Name</label>
                  <input
                    type="text"
                    value={settings.teamNames[0]}
                    onChange={(e) => updateTeamName(0, e.target.value)}
                    className="input-field"
                    maxLength={10}
                  />
                </div>
                <div className="team-input">
                  <label>Team 2 Name</label>
                  <input
                    type="text"
                    value={settings.teamNames[1]}
                    onChange={(e) => updateTeamName(1, e.target.value)}
                    className="input-field"
                    maxLength={10}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="settings-preview">
          <h3>Game Preview</h3>
          <div className="preview-grid">
            <div className="preview-item">
              <span className="preview-label">Rounds:</span>
              <span className="preview-value">{settings.rounds}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Theme:</span>
              <span className="preview-value">
                {settings.isThemedGame 
                  ? THEMES.find(t => t.value === settings.theme)?.label 
                  : 'Mixed'}
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Mode:</span>
              <span className="preview-value">
                {settings.isTeamGame 
                  ? `Teams (${settings.teamNames.join(' vs ')})` 
                  : 'Individual'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="btn-primary btn-large"
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      </div>
    </div>
  );
};

export default CreateRoom;
