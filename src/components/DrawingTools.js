import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setBrushSize, setColor, setTool, undo, redo, clearCanvas } from '../redux/slices/canvasSlice';

const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB',
  '#A52A2A', '#808080', '#000080', '#008000', '#800000'
];

const DrawingTools = () => {
  const dispatch = useDispatch();
  const { brushSize, color, tool, canDraw } = useSelector(state => state.canvas);

  if (!canDraw) return null;

  return (
    <div className="drawing-tools-compact">
      {/* Tools */}
      <div className="tool-group">
        <button
          className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
          onClick={() => dispatch(setTool('brush'))}
          title="Brush"
        >
          🖌️
        </button>
        <button
          className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => dispatch(setTool('eraser'))}
          title="Eraser"
        >
          🧽
        </button>
      </div>

      {/* Colors */}
      <div className="color-group">
        {COLORS.slice(0, 10).map((c) => (
          <button
            key={c}
            className={`color-btn-compact ${color === c ? 'active' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => dispatch(setColor(c))}
            title={`Color: ${c}`}
          />
        ))}
      </div>

      {/* Brush Size */}
      <div className="size-group">
        <span className="size-label">Size:</span>
        <div className="size-buttons">
          <button
            className={`size-btn ${brushSize <= 3 ? 'active' : ''}`}
            onClick={() => dispatch(setBrushSize(2))}
            title="Small brush"
          >
            ●
          </button>
          <button
            className={`size-btn ${brushSize > 3 && brushSize <= 8 ? 'active' : ''}`}
            onClick={() => dispatch(setBrushSize(5))}
            title="Medium brush"
          >
            ●
          </button>
          <button
            className={`size-btn ${brushSize > 8 ? 'active' : ''}`}
            onClick={() => dispatch(setBrushSize(12))}
            title="Large brush"
          >
            ●
          </button>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={brushSize}
          onChange={(e) => dispatch(setBrushSize(parseInt(e.target.value)))}
          className="size-slider-compact"
          title={`Brush size: ${brushSize}px`}
        />
        <span className="size-display">{brushSize}</span>
      </div>

      {/* Actions */}
      <div className="action-group">
        <button
          className="action-btn-compact"
          onClick={() => dispatch(undo())}
          title="Undo"
        >
          ↶
        </button>
        <button
          className="action-btn-compact"
          onClick={() => dispatch(redo())}
          title="Redo"
        >
          ↷
        </button>
        <button
          className="action-btn-compact danger"
          onClick={() => dispatch(clearCanvas())}
          title="Clear canvas"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default DrawingTools;
