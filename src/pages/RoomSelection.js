import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase, callEdgeFunction } from '../lib/supabase';
import { clearUser, updateProfile } from '../redux/slices/authSlice';

const RoomSelection = () => {
  const [roomCode, setRoomCode] = useState('');
  const [joinMethod, setJoinMethod] = useState('code'); // code or link
  const [displayName, setDisplayName] = useState('');
  const [avatars, setAvatars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [error, setError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);

  // Get dynamic avatar bucket URL
  const getAvatarUrl = (avatarName) => {
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarName);
    console.log('Avatar URL:', data.publicUrl);
    return data.publicUrl;
  };

  const fetchAvatars = async () => {
    try {
      setAvatarError('');
      console.log('Fetching avatars from storage...');
      
      // First, try to list files from the avatars bucket
      const { data, error } = await supabase.storage.from('avatars').list('', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
      
      if (error) {
        console.error('Error listing avatars from storage:', error);
        
        // If storage fails, use fallback avatars from public folder
        console.log('Using fallback avatars from public folder');
        const fallbackAvatars = [
          'default-pfp.jpg',
          'pfp-2.jpg'
        ];
        
        setAvatars(fallbackAvatars.map(name => ({ name, isPublic: true })));
        setAvatarError('Using default avatars (storage unavailable)');
        return;
      }
      
      if (data && data.length > 0) {
        // Filter for image files
        const imageFiles = data.filter(file => 
          file.name.toLowerCase().endsWith('.jpg') || 
          file.name.toLowerCase().endsWith('.jpeg') || 
          file.name.toLowerCase().endsWith('.png') ||
          file.name.toLowerCase().endsWith('.gif') ||
          file.name.toLowerCase().endsWith('.webp')
        );
        
        console.log(`Found ${imageFiles.length} avatar images:`, imageFiles.map(f => f.name));
        setAvatars(imageFiles.map(file => ({ ...file, isPublic: false })));
        
        if (imageFiles.length === 0) {
          setAvatarError('No avatar images found in storage');
        }
      } else {
        console.log('No files found in avatars storage, using fallback');
        
        // Use fallback avatars from public folder
        const fallbackAvatars = [
          'default-pfp.jpg',
          'pfp-2.jpg'
        ];
        
        setAvatars(fallbackAvatars.map(name => ({ name, isPublic: true })));
        setAvatarError('No avatars in storage, using defaults');
      }
    } catch (err) {
      console.error('Failed to fetch avatars:', err);
      setAvatarError('Failed to load avatars');
      
      // Fallback to public folder avatars
      const fallbackAvatars = [
        'default-pfp.jpg',
        'pfp-2.jpg'
      ];
      
      setAvatars(fallbackAvatars.map(name => ({ name, isPublic: true })));
    }
  };

  // Fetch avatars from Supabase Storage
  useEffect(() => {
    fetchAvatars();
  }, []);

  // Set initial profile values
  useEffect(() => {
    setDisplayName(profile.displayName || '');
    setSelectedAvatar(profile.avatarUrl || '/images/default-pfp.jpg');
  }, [profile]);

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileLoading(true);
    setProfileMsg('');
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: displayName.trim(), avatar_url: selectedAvatar })
        .eq('id', user.id);
      if (error) throw error;
      dispatch(updateProfile({ displayName: displayName.trim(), avatarUrl: selectedAvatar }));
      setProfileMsg('Profile updated!');
      setTimeout(() => setProfileMsg(''), 2000);
    } catch (err) {
      setProfileMsg('Error updating profile.');
    }
    setProfileLoading(false);
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;
    
    setError('');
    
    // Extract room ID from input (handles both direct codes and full URLs)
    let extractedRoomId = roomCode.trim();
    
    try {
      // If it looks like a URL, extract the room ID from it
      if (extractedRoomId.includes('/room/')) {
        const urlMatch = extractedRoomId.match(/\/room\/([^/]+)/);
        if (urlMatch && urlMatch[1]) {
          extractedRoomId = urlMatch[1];
        }
      }
      
      // Remove any trailing parts (like /waiting, /game, etc.)
      extractedRoomId = extractedRoomId.split('/')[0];
      
      // Validate that we have something that looks like a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(extractedRoomId)) {
        setError('Invalid room code format. Please check your room code or link.');
        return;
      }
      
      console.log('Attempting to join room:', extractedRoomId);
      
      const response = await callEdgeFunction('join-room', {
        roomId: extractedRoomId,
        playerId: user.id
      });
      
      console.log('Join room response:', response);
      
      if (response.success) {
        // Navigate to the waiting room with the extracted room ID
        navigate(`/room/${extractedRoomId}/waiting`);
      } else {
        setError(response.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Room not found or invalid room code. Please check your input and try again.');
    }
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
        <h1>Ckribble Labs</h1>
        <div className="user-info">
          <img 
            src={selectedAvatar || '/images/default-pfp.jpg'} 
            alt="avatar" 
            className="user-avatar" 
            style={{ width: 36, height: 36, borderRadius: '50%' }}
            onError={(e) => {
              e.target.src = '/images/default-pfp.jpg';
            }}
          />
          <span className="user-name">{displayName}</span>
          <button onClick={handleSignOut} className="btn-logout">
            Sign Out
          </button>
        </div>
      </header>

      {/* Profile Section */}
      <div className="profile-section" style={{ maxWidth: 400, margin: '24px auto', background: 'white', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 24 }}>
        <h2 style={{ marginBottom: 12 }}>Your Profile</h2>
        <label style={{ fontWeight: 500 }}>Display Name</label>
        <input
          type="text"
          className="input-field"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          maxLength={20}
          style={{ marginBottom: 16, marginTop: 4, width: '100%' }}
        />
        <label style={{ fontWeight: 500 }}>Choose Avatar</label>
        <div className="avatar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8, margin: '12px 0' }}>
          {avatars.map((avatar) => {
            const avatarUrl = avatar.isPublic ? `/images/${avatar.name}` : getAvatarUrl(avatar.name);
            const isSelected = selectedAvatar === avatarUrl;
            
            return (
              <img
                key={avatar.name}
                src={avatarUrl}
                alt={avatar.name}
                className={`avatar-option${isSelected ? ' selected' : ''}`}
                style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: '50%', 
                  border: isSelected ? '2px solid #ff6b6b' : '2px solid #ddd', 
                  cursor: 'pointer', 
                  boxShadow: isSelected ? '0 0 8px #ff6b6b55' : 'none' 
                }}
                onClick={() => setSelectedAvatar(avatarUrl)}
                onError={(e) => {
                  // Fallback to default avatar if image fails to load
                  e.target.src = '/images/default-pfp.jpg';
                  if (isSelected) {
                    setSelectedAvatar('/images/default-pfp.jpg');
                  }
                }}
              />
            );
          })}
        </div>
        {avatarError && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {avatarError}
          </div>
        )}
        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          onClick={handleProfileSave}
          disabled={profileLoading || !displayName.trim()}
        >
          {profileLoading ? 'Saving...' : 'Save Profile'}
        </button>
        {profileMsg && <div style={{ marginTop: 8, color: profileMsg.includes('Error') ? '#c0392b' : '#27ae60', fontWeight: 500 }}>{profileMsg}</div>}
      </div>

      <div className="room-selection-content">
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
                  placeholder={joinMethod === 'code' ? 'Enter room code (e.g., abc123-def4-5678...)' : 'Paste room link (e.g., http://localhost:3000/room/abc123/waiting)'}
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
                <div className="join-help" style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  {joinMethod === 'code' 
                    ? 'Enter the UUID room code provided by the room creator'
                    : 'Paste the full room link that was shared with you'
                  }
                </div>
                {error && (
                  <div className="mt-2 text-red-600 text-sm">{error}</div>
                )}
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
        {/* Game Features Section */}
        <div className="info-section" style={{ marginTop: 32 }}>
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
