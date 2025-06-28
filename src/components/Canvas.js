import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { startPath, addPoint, endPath, addRemotePath } from '../redux/slices/canvasSlice';

const Canvas = ({ onPathUpdate }) => {
  const canvasRef = useRef(null);
  const [isConnected, setIsConnected] = useState(true);
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

  const { isActive, currentWord } = useSelector(state => state.game);
  const { user } = useSelector(state => state.auth);

  const getCanvasPoint = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (!canDraw || !currentWord) return;
    
    const point = getCanvasPoint(e.clientX, e.clientY);
    dispatch(startPath({ 
      x: point.x, 
      y: point.y, 
      tool, 
      color: tool === 'eraser' ? 'transparent' : color, 
      size: brushSize 
    }));
  }, [canDraw, currentWord, getCanvasPoint, dispatch, tool, color, brushSize]);

  const handleMouseMove = useCallback((e) => {
    if (!canDraw || !isDrawing || !currentWord) return;
    
    const point = getCanvasPoint(e.clientX, e.clientY);
    dispatch(addPoint(point));
  }, [canDraw, isDrawing, currentWord, getCanvasPoint, dispatch]);

  const handleMouseUp = useCallback(() => {
    if (!canDraw || !isDrawing || !currentWord) return;
    
    dispatch(endPath());
    
    // Send the complete path immediately after ending
    if (currentPath && onPathUpdate) {
      const completePath = {
        ...currentPath,
        id: currentPath.id || Date.now(),
        playerId: user?.id,
        timestamp: Date.now()
      };
      onPathUpdate(completePath);
    }
  }, [canDraw, isDrawing, currentWord, currentPath, dispatch, onPathUpdate, user?.id]);

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

  // Optimized drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set default composition mode
    ctx.globalCompositeOperation = 'source-over';
    
    // Draw all completed paths
    paths.forEach(path => {
      if (path.points && path.points.length > 1) {
        ctx.beginPath();
        ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = path.tool === 'eraser' ? 'rgba(0,0,0,1)' : (path.color || '#000000');
        ctx.lineWidth = path.size || 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
      }
    });
    
    // Draw current path being drawn
    if (currentPath && currentPath.points && currentPath.points.length > 1) {
      ctx.beginPath();
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Redraw canvas when window resizes
      setTimeout(draw, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Connection status indicator
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(navigator.onLine);
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    
    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  const getCanvasClass = () => {
    let className = 'drawing-canvas';
    if (canDraw) className += ' drawable';
    if (!currentWord) className += ' waiting';
    if (!isConnected) className += ' disconnected';
    return className;
  };

  const getCursorStyle = () => {
    if (!canDraw) return 'default';
    if (tool === 'eraser') return 'crosshair';
    return 'crosshair';
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className={getCanvasClass()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: getCursorStyle()
        }}
      />
      
      {/* Canvas overlays */}
      {!canDraw && (
        <div className="canvas-overlay">
          {!currentWord ? (
            <div className="overlay-content">
              <p>🎨 Waiting for word selection...</p>
            </div>
          ) : (
            <div className="overlay-content">
              <p>👀 Watch the drawing!</p>
              <small>Someone else is drawing</small>
            </div>
          )}
        </div>
      )}

      {canDraw && !currentWord && (
        <div className="canvas-overlay">
          <div className="overlay-content">
            <p>✏️ Select a word to start drawing!</p>
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="connection-status offline">
          📡 Connection lost - drawings may not sync
        </div>
      )}

      {/* Drawing status indicator */}
      <div className="canvas-status">
        {canDraw && currentWord && (
          <div className="drawing-active">
            🎨 You're drawing: <strong>{tool}</strong> 
            {tool === 'brush' && (
              <span className="brush-preview" 
                    style={{ 
                      backgroundColor: color, 
                      width: `${Math.max(4, brushSize / 2)}px`,
                      height: `${Math.max(4, brushSize / 2)}px`
                    }} 
              />
            )}
          </div>
        )}
        
        {isDrawing && (
          <div className="stroke-indicator">
            ✏️ Drawing...
          </div>
        )}
      </div>
    </div>
  );
};

export default Canvas;
