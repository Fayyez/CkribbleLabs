import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentGuess, addMessage, addReaction, setRateLimit } from '../redux/slices/chatSlice';

const EMOJI_REACTIONS = ['👍', '😂', '😮', '🤔', '🔥'];
const RATE_LIMIT_DELAY = 100; // Reduced to 100ms for better responsiveness

const ChatBox = ({ onGuessSubmit, canGuess = true }) => {
  const dispatch = useDispatch();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
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
  const shouldShowInput = canGuess && isActive && !isDrawer && !hasGuessedCorrectly;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !shouldShowInput) return;

    const guess = message.trim();
    
    // Check rate limiting (reduced to 100ms)
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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
        return `🎉 ${msg.playerName} guessed correctly! (+${msg.points || 0} points)`;
      case 'guess':
        // Only show the guess if it was wrong or close
        if (msg.isClose) {
          return `${msg.playerName}: ${msg.text} 🔥`;
        }
        return `${msg.playerName}: ${msg.text}`;
      default:
        return `${msg.playerName}: ${msg.text}`;
    }
  };

  const getMessageClass = (msg) => {
    const baseClass = 'message-compact';
    const typeClass = msg.type || 'guess';
    const isOwnMessage = msg.playerId === user?.id ? 'own' : '';
    const isCloseClass = msg.isClose ? 'close' : '';
    
    return `${baseClass} ${typeClass} ${isOwnMessage} ${isCloseClass}`.trim();
  };

  const getTimeRemaining = () => {
    if (!rateLimitedUntil) return 0;
    return Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
  };

  return (
    <div className="chat-box-compact">
      <div className="chat-header-compact">
        <h4>💬 Chat</h4>
        {isDrawer && <span className="drawer-badge-compact">🎨</span>}
        {hasGuessedCorrectly && !isDrawer && isActive && currentWord && (
          <span className="guessed-badge-compact">✅</span>
        )}
      </div>

      <div className="messages-container-compact">
        {messages.length === 0 && (
          <div className="no-messages-compact">
            {isDrawer ? "Guesses appear here..." : "Start guessing!"}
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id || msg.timestamp}
            className={getMessageClass(msg)}
          >
            <div className="message-content-compact">
              {formatMessage(msg)}
            </div>
            {msg.timestamp && (
              <div className="message-time-compact">
                {new Date(msg.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            )}
          </div>
        ))}
        
        {reactions.map((reaction) => (
          <div key={reaction.id} className="reaction-message-compact">
            <span className="reaction-emoji">{reaction.emoji}</span>
            <span className="reaction-player">{reaction.playerName}</span>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {shouldShowInput && (
        <div className="input-section-compact">
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={currentWord ? "Type guess & press Enter..." : "Waiting..."}
              className={`guess-input-compact ${isGuessClose ? 'close' : ''}`}
              maxLength={30}
              disabled={isRateLimited || !currentWord}
              autoComplete="off"
            />
          </form>
          
          {isGuessClose && (
            <div className="guess-feedback-compact close">
              🔥 Close!
            </div>
          )}
          
          {isRateLimited && (
            <div className="rate-limit-warning-compact">
              ⏱️ {getTimeRemaining()}s
            </div>
          )}
        </div>
      )}

      {!shouldShowInput && !isDrawer && (
        <div className="guess-disabled-compact">
          {hasGuessedCorrectly ? "✅ Correct!" : 
           !isActive ? "Game paused" :
           !currentWord ? "Waiting..." : 
           isRateLimited ? `Wait ${getTimeRemaining()}s` :
           "Can't guess"}
        </div>
      )}
      
      {isDrawer && isActive && currentWord && (
        <div className="drawer-status-compact">
          🎨 Keep drawing!
        </div>
      )}

      <div className="reaction-bar-compact">
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="reaction-btn-compact"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Compact CSS Styles */}
      <style jsx>{`
        .chat-box-compact {
          display: flex;
          flex-direction: column;
          height: 100%;
          font-size: 12px;
        }

        .chat-header-compact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }

        .chat-header-compact h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .drawer-badge-compact, .guessed-badge-compact {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          background: #007bff;
          color: white;
        }

        .messages-container-compact {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          max-height: calc(100vh - 200px);
        }

        .no-messages-compact {
          text-align: center;
          color: #6c757d;
          font-style: italic;
          padding: 20px;
          font-size: 11px;
        }

        .message-compact {
          margin-bottom: 4px;
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 11px;
          line-height: 1.3;
        }

        .message-compact.system {
          background: #e3f2fd;
          color: #1976d2;
          text-align: center;
          font-style: italic;
        }

        .message-compact.system-close {
          background: #fff3e0;
          color: #f57c00;
          text-align: center;
          font-style: italic;
        }

        .message-compact.correct {
          background: #d4edda;
          color: #155724;
          text-align: center;
          font-style: italic;
          font-weight: bold;
        }

        .message-compact.guess {
          background: #f8f9fa;
        }

        .message-compact.guess.own {
          background: #e3f2fd;
          text-align: right;
        }

        .message-compact.guess.close {
          background: #fff3e0;
          border-left: 3px solid #ff9800;
        }

        .message-content-compact {
          word-wrap: break-word;
        }

        .message-time-compact {
          font-size: 9px;
          color: #6c757d;
          margin-top: 2px;
        }

        .input-section-compact {
          padding: 8px;
          border-top: 1px solid #e9ecef;
          background: #ffffff;
        }

        .guess-input-compact {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 12px;
          outline: none;
        }

        .guess-input-compact:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }



        .guess-input-compact.close {
          border-color: #ffc107;
          background: #fff3cd;
        }

        .guess-feedback-compact {
          margin-top: 4px;
          padding: 4px;
          border-radius: 4px;
          text-align: center;
          font-size: 10px;
        }

        .guess-feedback-compact.close {
          background: #fff3cd;
          color: #856404;
        }

        .rate-limit-warning-compact {
          margin-top: 4px;
          text-align: center;
          color: #6c757d;
          font-size: 10px;
        }

        .guess-disabled-compact, .drawer-status-compact {
          padding: 8px;
          text-align: center;
          background: #f8f9fa;
          color: #6c757d;
          font-size: 11px;
          border-top: 1px solid #e9ecef;
        }

        .reaction-bar-compact {
          display: flex;
          justify-content: center;
          gap: 4px;
          padding: 6px 8px;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }

        .reaction-btn-compact {
          background: none;
          border: none;
          font-size: 14px;
          padding: 2px 4px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .reaction-btn-compact:hover {
          background: #e9ecef;
        }

        .reaction-message-compact {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 4px;
          font-size: 10px;
          color: #6c757d;
        }
      `}</style>
    </div>
  );
};

export default ChatBox;
