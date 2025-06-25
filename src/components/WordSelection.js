
import React, { useState } from 'react';

const WordSelection = ({ words, onSelect }) => {
  const [selectedWord, setSelectedWord] = useState(null);

  const handleSelect = (word) => {
    setSelectedWord(word);
    setTimeout(() => {
      onSelect(word);
    }, 500);
  };

  return (
    <div className="word-selection-overlay">
      <div className="word-selection-modal">
        <h2>Choose a word to draw</h2>
        <p>Pick one of these three words:</p>
        
        <div className="word-options">
          {words.map((word, index) => (
            <button
              key={index}
              className={`word-option ${selectedWord === word ? 'selected' : ''}`}
              onClick={() => handleSelect(word)}
              disabled={selectedWord}
            >
              {word}
            </button>
          ))}
        </div>
        
        {selectedWord && (
          <div className="selection-confirmation">
            You selected: <strong>{selectedWord}</strong>
            <br />
            Get ready to draw!
          </div>
        )}
      </div>
    </div>
  );
};

export default WordSelection;
