import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { callEdgeFunction, supabase } from '../lib/supabase';
import { setRoom, setLoading, setError } from '../redux/slices/roomSlice';

const THEMES = [
  { value: 'default', label: 'Mixed' },
  { value: 'animals', label: 'Animals' },
  { value: 'geography', label: 'Geography' },
  { value: 'comp_sci', label: 'Computer Science' },
];

const DEFAULT_SETTINGS = {
  drawingTime: 80,
  rounds: 10,
  maxWordLength: 15,
  theme: 'default',
  isThemedGame: false,
  isTeamGame: false,
  teamNames: ['Red', 'Blue'],
};

const CreateRoom = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { loading } = useSelector((state) => state.room);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Fetch user_settings on mount
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_settings')
        .select('default_room_settings')
        .eq('user_id', user.id)
        .single();
      if (data && data.default_room_settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.default_room_settings });
      }
    };
    fetchUserSettings();
  }, [user]);

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
    setSaving(true);
    setMsg('');
    try {
      // Save as favorite settings
      console.log(">> user settins being fetched", user.id);
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        default_room_settings: settings,
      });
      // Prepare payload for create-room
      console.log(">> settings being saved", settings);
      const payload = {
        hostId: user.id,
        settings: {
          rounds: settings.rounds,
          maxWordLength: settings.maxWordLength,
          theme: settings.theme,
          isThemedGame: settings.isThemedGame,
          isTeamGame: settings.isTeamGame,
          teamNames: settings.teamNames,
          drawingTime: settings.drawingTime,
        },
      };
      console.log(">> payload being sent to create-room", payload);
      const response = await callEdgeFunction('create-room', payload);
      dispatch(setRoom({
        roomId: response.roomId,
        hostId: user.id,
        settings: payload.settings,
      }));
      // Copy room link to clipboard
      const roomLink = `${window.location.origin}/room/${response.roomId}/waiting`;
      await navigator.clipboard.writeText(roomLink);
      setMsg('Room link copied to clipboard!');
      setTimeout(() => {
        navigate(`/room/${response.roomId}/waiting`);
      }, 1000);
    } catch (error) {
      dispatch(setError(error.message));
      setMsg('Error creating room.');
    }
    setSaving(false);
    dispatch(setLoading(false));
  };

  return (
    <div className="create-room-container" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="create-room-card" style={{ display: 'flex', flexDirection: 'row', minHeight: 420, maxWidth: 900, width: '100%', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', background: 'white', padding: 0, overflow: 'hidden' }}>
        {/* Settings Form */}
        <div className="settings-form" style={{ flex: 2, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <header className="card-header" style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <button onClick={() => navigate(-1)} className="btn-back" style={{ marginRight: 16 }}>
              ← Back
            </button>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Create Game Room</h1>
          </header>
          <div style={{ flex: 1 }}>
            <div className="setting-group">
              <label>Drawing Time (seconds)</label>
              <div className="range-input">
                <input
                  type="range"
                  min="20"
                  max="120"
                  value={settings.drawingTime}
                  onChange={(e) => updateSetting('drawingTime', parseInt(e.target.value))}
                />
                <span className="range-value">{settings.drawingTime}</span>
              </div>
            </div>
            <div className="setting-group">
              <label>Number of Rounds</label>
              <div className="range-input">
                <input
                  type="range"
                  min="1"
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
              <div className="team-settings" style={{ minHeight: 60 }}>
                {settings.isTeamGame && (
                  <div style={{ display: 'flex', gap: 12 }}>
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
          </div>
          <button
            onClick={handleCreate}
            disabled={loading || saving}
            className="btn-primary btn-large"
            style={{ marginTop: 24 }}
          >
            {loading || saving ? 'Creating...' : 'Create Room'}
          </button>
          {msg && <div style={{ marginTop: 12, color: msg.includes('Error') ? '#c0392b' : '#27ae60', fontWeight: 500 }}>{msg}</div>}
        </div>
        {/* Summary Panel */}
        <div className="settings-preview" style={{ flex: 1, background: '#f7f7fb', padding: 32, borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 260 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 24 }}>Game Preview</h3>
          <div className="preview-grid" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="preview-item"><span className="preview-label">Drawing Time:</span> <span className="preview-value">{settings.drawingTime} seconds</span></div>
            <div className="preview-item"><span className="preview-label">Rounds:</span> <span className="preview-value">{settings.rounds}</span></div>
            <div className="preview-item"><span className="preview-label">Theme:</span> <span className="preview-value">{settings.isThemedGame ? THEMES.find(t => t.value === settings.theme)?.label : 'Mixed'}</span></div>
            <div className="preview-item"><span className="preview-label">Mode:</span> <span className="preview-value">{settings.isTeamGame ? `Teams (${settings.teamNames.join(' vs ')})` : 'Individual'}</span></div>
            <div className="preview-item"><span className="preview-label">Max Word Length:</span> <span className="preview-value">{settings.maxWordLength}</span></div>
          </div>
        </div>
      </div>
      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .create-room-card { flex-direction: column !important; min-height: unset !important; }
          .settings-form, .settings-preview { padding: 20px !important; }
          .settings-preview { border-left: none !important; border-top: 1px solid #eee !important; min-width: unset !important; }
        }
      `}</style>
    </div>
  );
};

export default CreateRoom;
