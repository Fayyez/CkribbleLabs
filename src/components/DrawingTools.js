import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setBrushSize, setColor, setTool, undo, redo, clearCanvas } from '../redux/slices/canvasSlice';
import '../styles/DrawingTools.css';

const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB',
  '#A52A2A', '#808080', '#000080', '#008000', '#800000'
];

const DrawingTools = ({ onCanvasClear }) => {
  const dispatch = useDispatch();
  const { brushSize, color, tool, canDraw } = useSelector(state => state.canvas);

  if (!canDraw) return null;

  const handleClearCanvas = () => {
    dispatch(clearCanvas());
    if (onCanvasClear) {
      onCanvasClear();
    }
  };

  // Get appropriate sizes based on tool
  const getSizes = () => {
    if (tool === 'eraser') {
      return [
        { size: 8, label: 'Small', active: brushSize <= 10 },
        { size: 15, label: 'Medium', active: brushSize > 10 && brushSize <= 20 },
        { size: 25, label: 'Large', active: brushSize > 20 }
      ];
    } else {
      return [
        { size: 2, label: 'Small', active: brushSize <= 3 },
        { size: 5, label: 'Medium', active: brushSize > 3 && brushSize <= 8 },
        { size: 12, label: 'Large', active: brushSize > 8 }
      ];
    }
  };

  const sizes = getSizes();

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

      {/* Colors - hide when eraser is selected */}
      {tool !== 'eraser' && (
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
      )}

      {/* Brush/Eraser Size */}
      <div className="size-group">
        <span className="size-label">{tool === 'eraser' ? 'Eraser:' : 'Size:'}</span>
        <div className="size-buttons">
          {sizes.map((sizeOption, index) => (
            <button
              key={index}
              className={`size-btn ${sizeOption.active ? 'active' : ''}`}
              onClick={() => dispatch(setBrushSize(sizeOption.size))}
              title={`${sizeOption.label} ${tool}`}
              style={{
                fontSize: tool === 'eraser' ? '10px' : `${6 + index * 2}px`
              }}
            >
              ●
            </button>
          ))}
        </div>
        <input
          type="range"
          min={tool === 'eraser' ? "5" : "1"}
          max={tool === 'eraser' ? "40" : "20"}
          value={brushSize}
          onChange={(e) => dispatch(setBrushSize(parseInt(e.target.value)))}
          className="size-slider-compact"
          title={`${tool} size: ${brushSize}px`}
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
          onClick={handleClearCanvas}
          title="Clear canvas"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default DrawingTools;
