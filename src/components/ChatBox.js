
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentGuess, addMessage, addReaction } from '../redux/slices/chatSlice';
import { callEdgeFunction } from '../lib/supabase';

const EMOJI_REACTIONS = ['👍', '😂', '😮', '🤔', '🔥'];

const ChatBox = ({ onGuessSubmit }) => {
  const dispatch = useDispatch();
  const messagesEndRef = useRef(null);
  const [message, setMessage] = useState('');
  
  const {
    messages,
    reactions,
    currentGuess,
    isGuessCorrect,
    isGuessClose,
    rateLimitedUntil
  } = useSelector(state => state.chat);
  
  const { user } = useSelector(state => state.auth);
  const { drawerId, isActive } = useSelector(state => state.game);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isRateLimited = rateLimitedUntil && Date.now() < rateLimitedUntil;
  const isDrawer = user?.id === drawerId;
  const canGuess = isActive && !isDrawer && !isRateLimited;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !canGuess) return;

    const guess = message.trim();
    setMessage('');

    // Add guess to chat
    dispatch(addMessage({
      type: 'guess',
      text: guess,
      playerId: user.id,
      playerName: user.displayName || 'Anonymous'
    }));

    // Submit guess for validation
    if (onGuessSubmit) {
      onGuessSubmit(guess);
    }
  };

  const handleReaction = (emoji) => {
    dispatch(addReaction({
      emoji,
      playerId: user.id,
      playerName: user.displayName || 'Anonymous'
    }));
  };

  const formatMessage = (msg) => {
    if (msg.type === 'guess' && msg.isCorrect) {
      return `${msg.playerName} guessed correctly! 🎉`;
    }
    if (msg.type === 'system') {
      return msg.text;
    }
    return `${msg.playerName}: ${msg.text}`;
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h3>Guesses</h3>
        {isDrawer && (
          <span className="drawer-badge">You're drawing!</span>
        )}
      </div>

      <div className="messages-container">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.type} ${msg.isCorrect ? 'correct' : ''}`}
          >
            {formatMessage(msg)}
          </div>
        ))}
        
        {reactions.map((reaction) => (
          <div key={reaction.id} className="reaction-message">
            {reaction.playerName} reacted {reaction.emoji}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {canGuess && (
        <form onSubmit={handleSubmit} className="guess-form">
          <div className="input-container">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your guess..."
              className={`guess-input ${isGuessCorrect ? 'correct' : ''} ${isGuessClose ? 'close' : ''}`}
              maxLength={50}
              disabled={isRateLimited}
            />
            <span className="char-count">{message.length}/50</span>
          </div>
          
          {isGuessClose && (
            <div className="guess-feedback close">
              You're close! Keep trying! 🔥
            </div>
          )}
          
          {isRateLimited && (
            <div className="rate-limit-warning">
              Please wait before sending another guess...
            </div>
          )}
          
          <button
            type="submit"
            disabled={!message.trim() || isRateLimited}
            className="guess-submit"
          >
            Guess
          </button>
        </form>
      )}

      <div className="reaction-bar">
        <span>React: </span>
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="reaction-btn"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatBox;
