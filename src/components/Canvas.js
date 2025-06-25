
import React, { useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { startPath, addPoint, endPath, addRemotePath } from '../redux/slices/canvasSlice';

const Canvas = ({ onPathUpdate }) => {
  const canvasRef = useRef(null);
  const dispatch = useDispatch();
  const {
    paths,
    currentPath,
    isDrawing,
    brushSize,
    color,
    tool,
    canDraw
  } = useSelector(state => state.canvas);

  const getCanvasPoint = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (!canDraw) return;
    
    const point = getCanvasPoint(e.clientX, e.clientY);
    dispatch(startPath(point));
  }, [canDraw, getCanvasPoint, dispatch]);

  const handleMouseMove = useCallback((e) => {
    if (!canDraw || !isDrawing) return;
    
    const point = getCanvasPoint(e.clientX, e.clientY);
    dispatch(addPoint(point));
  }, [canDraw, isDrawing, getCanvasPoint, dispatch]);

  const handleMouseUp = useCallback(() => {
    if (!canDraw || !isDrawing) return;
    
    dispatch(endPath());
    if (currentPath && onPathUpdate) {
      onPathUpdate(currentPath);
    }
  }, [canDraw, isDrawing, currentPath, dispatch, onPathUpdate]);

  // Touch events for mobile
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  }, [handleMouseDown]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }, [handleMouseMove]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    handleMouseUp();
  }, [handleMouseUp]);

  // Drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all completed paths
    paths.forEach(path => {
      if (path.points.length > 1) {
        ctx.beginPath();
        ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
      }
    });
    
    // Draw current path
    if (currentPath && currentPath.points.length > 1) {
      ctx.beginPath();
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(currentPath.points[0].x, currentPath.points[0].y);
      for (let i = 1; i < currentPath.points.length; i++) {
        ctx.lineTo(currentPath.points[i].x, currentPath.points[i].y);
      }
      ctx.stroke();
    }
  }, [paths, currentPath, brushSize, color, tool]);

  // Redraw when paths change
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle remote path updates
  useEffect(() => {
    // This would be called when receiving remote canvas updates
    // The actual subscription would be in the parent component
  }, []);

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className={`drawing-canvas ${canDraw ? 'drawable' : 'readonly'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: canDraw ? (tool === 'eraser' ? 'crosshair' : 'crosshair') : 'default'
        }}
      />
      {!canDraw && (
        <div className="canvas-overlay">
          <p>Wait for your turn to draw!</p>
        </div>
      )}
    </div>
  );
};

export default Canvas;
