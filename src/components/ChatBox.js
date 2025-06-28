import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentGuess, addMessage, addReaction, setRateLimit } from '../redux/slices/chatSlice';

const EMOJI_REACTIONS = ['👍', '😂', '😮', '🤔', '🔥'];
const RATE_LIMIT_DELAY = 1000; // 1 second between guesses

const ChatBox = ({ onGuessSubmit, canGuess = true }) => {
  const dispatch = useDispatch();
  const messagesEndRef = useRef(null);
  const [message, setMessage] = useState('');
  
  const {
    messages,
    reactions,
    currentGuess,
    isGuessCorrect,
    isGuessClose,
    rateLimitedUntil,
    lastGuessTime,
    correctGuesses
  } = useSelector(state => state.chat);
  
  const { user, profile } = useSelector(state => state.auth);
  const { drawerId, isActive, currentWord } = useSelector(state => state.game);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isRateLimited = rateLimitedUntil && Date.now() < rateLimitedUntil;
  const isDrawer = user?.id === drawerId;
  const hasGuessedCorrectly = correctGuesses.some(g => g.playerId === user?.id);
  const shouldShowInput = canGuess && isActive && !isDrawer && !isRateLimited;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !shouldShowInput) return;

    const guess = message.trim();
    
    // Check rate limiting
    if (lastGuessTime && Date.now() - lastGuessTime < RATE_LIMIT_DELAY) {
      dispatch(setRateLimit(Date.now() + RATE_LIMIT_DELAY));
      return;
    }

    setMessage('');
    dispatch(setRateLimit(Date.now() + RATE_LIMIT_DELAY));

    // Submit guess
    if (onGuessSubmit) {
      onGuessSubmit(guess);
    }
  };

  const handleReaction = (emoji) => {
    dispatch(addReaction({
      emoji,
      playerId: user.id,
      playerName: profile.displayName || 'Anonymous'
    }));
  };

  const formatMessage = (msg) => {
    switch (msg.type) {
      case 'system':
        return msg.text;
      case 'system-close':
        return msg.text;
      case 'correct':
        return `${msg.playerName} guessed correctly! 🎉`;
      case 'guess':
        return `${msg.playerName}: ${msg.text}`;
      default:
        return `${msg.playerName}: ${msg.text}`;
    }
  };

  const getMessageClass = (msg) => {
    const baseClass = 'message';
    const typeClass = msg.type || 'guess';
    const isOwnMessage = msg.playerId === user?.id ? 'own' : '';
    
    return `${baseClass} ${typeClass} ${isOwnMessage}`.trim();
  };

  const getTimeRemaining = () => {
    if (!rateLimitedUntil) return 0;
    return Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h3>💬 Chat & Guesses</h3>
        {isDrawer && (
          <span className="drawer-badge">🎨 Drawing</span>
        )}
        {hasGuessedCorrectly && !isDrawer && isActive && currentWord && (
          <span className="guessed-badge">✅ Guessed!</span>
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="no-messages">
            {isDrawer ? "Players' guesses will appear here..." : "Start guessing!"}
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id || msg.timestamp}
            className={getMessageClass(msg)}
          >
            <div className="message-content">
              {formatMessage(msg)}
            </div>
            {msg.timestamp && (
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            )}
          </div>
        ))}
        
        {reactions.map((reaction) => (
          <div key={reaction.id} className="reaction-message">
            <span className="reaction-emoji">{reaction.emoji}</span>
            <span className="reaction-player">{reaction.playerName}</span>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {shouldShowInput && (
        <form onSubmit={handleSubmit} className="guess-form">
          <div className="input-container">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={currentWord ? "Type your guess..." : "Waiting for word..."}
              className={`guess-input ${isGuessCorrect ? 'correct' : ''} ${isGuessClose ? 'close' : ''}`}
              maxLength={50}
              disabled={isRateLimited || !currentWord}
              autoComplete="off"
            />
            <span className="char-count">{message.length}/50</span>
          </div>
          
          {isGuessClose && (
            <div className="guess-feedback close">
              🔥 You're close! Keep trying!
            </div>
          )}
          
          {isRateLimited && (
            <div className="rate-limit-warning">
              ⏱️ Wait {getTimeRemaining()}s before next guess...
            </div>
          )}
          
          <button
            type="submit"
            disabled={!message.trim() || isRateLimited || !currentWord}
            className="guess-submit"
          >
            {isRateLimited ? `Wait ${getTimeRemaining()}s` : 'Guess'}
          </button>
        </form>
      )}

      {!shouldShowInput && !isDrawer && (
        <div className="guess-disabled">
          {hasGuessedCorrectly ? "You've already guessed correctly! 🎉" : 
           !isActive ? "Game not active" :
           !currentWord ? "Waiting for word selection..." : 
           "You can't guess right now"}
        </div>
      )}

      <div className="reaction-bar">
        <span className="reaction-label">Quick reactions: </span>
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="reaction-btn"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Game status indicators */}
      <div className="chat-status">
        {isDrawer && (
          <div className="status-message drawer">
            🎨 You're drawing! Watch the guesses come in...
          </div>
        )}
        {!isActive && (
          <div className="status-message inactive">
            ⏸️ Game is paused
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBox;
