
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
    <div className="drawing-tools">
      <div className="tool-section">
        <h4>Tools</h4>
        <div className="tool-buttons">
          <button
            className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
            onClick={() => dispatch(setTool('brush'))}
          >
            🖌️ Brush
          </button>
          <button
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => dispatch(setTool('eraser'))}
          >
            🧽 Eraser
          </button>
        </div>
      </div>

      <div className="tool-section">
        <h4>Brush Size</h4>
        <div className="size-control">
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => dispatch(setBrushSize(parseInt(e.target.value)))}
            className="size-slider"
          />
          <span className="size-display">{brushSize}px</span>
        </div>
      </div>

      <div className="tool-section">
        <h4>Colors</h4>
        <div className="color-palette">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`color-btn ${color === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => dispatch(setColor(c))}
            />
          ))}
        </div>
      </div>

      <div className="tool-section">
        <h4>Actions</h4>
        <div className="action-buttons">
          <button
            className="action-btn"
            onClick={() => dispatch(undo())}
          >
            ↶ Undo
          </button>
          <button
            className="action-btn"
            onClick={() => dispatch(redo())}
          >
            ↷ Redo
          </button>
          <button
            className="action-btn danger"
            onClick={() => dispatch(clearCanvas())}
          >
            🗑️ Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawingTools;
