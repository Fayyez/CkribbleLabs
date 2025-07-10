import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  paths: [],
  currentPath: null,
  isDrawing: false,
  brushSize: 5,
  color: '#000000',
  tool: 'brush', // brush, eraser
  history: [],
  historyIndex: -1,
  canDraw: false,
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    startPath: (state, action) => {
      const { x, y } = action.payload;
      state.currentPath = {
        id: Date.now(),
        points: [{ x, y }],
        color: state.color,
        size: state.brushSize,
        tool: state.tool,
      };
      state.isDrawing = true;
    },
    addPoint: (state, action) => {
      const { x, y } = action.payload;
      if (state.currentPath) {
        state.currentPath.points.push({ x, y });
      }
    },
    endPath: (state) => {
      if (state.currentPath) {
        state.paths.push(state.currentPath);
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push([...state.paths]);
        state.historyIndex = state.history.length - 1;
        state.currentPath = null;
      }
      state.isDrawing = false;
    },
    addRemotePath: (state, action) => {
      const path = action.payload;
      
      // Validate path structure
      if (!path || !path.id || !Array.isArray(path.points) || path.points.length === 0) {
        console.warn('🚫 Invalid remote path received:', path);
        return;
      }
      
      // Validate all points in the path
      const validPoints = path.points.filter(point => 
        point && 
        typeof point.x === 'number' && 
        typeof point.y === 'number' &&
        !isNaN(point.x) && 
        !isNaN(point.y)
      );
      
      if (validPoints.length === 0) {
        console.warn('🚫 Remote path has no valid points:', path);
        return;
      }
      
      // Create a clean path object
      const cleanPath = {
        id: path.id,
        points: validPoints,
        color: path.color || '#000000',
        size: Math.max(1, Math.min(50, path.size || 5)), // Clamp size
        tool: path.tool || 'brush',
        timestamp: path.timestamp || Date.now()
      };
      
      console.log('🎨 Adding remote path with', validPoints.length, 'valid points');
      
      const existingIndex = state.paths.findIndex(p => p.id === cleanPath.id);
      if (existingIndex !== -1) {
        state.paths[existingIndex] = cleanPath;
      } else {
        state.paths.push(cleanPath);
      }
    },
    setBrushSize: (state, action) => {
      state.brushSize = action.payload;
    },
    setColor: (state, action) => {
      state.color = action.payload;
    },
    setTool: (state, action) => {
      state.tool = action.payload;
    },
    undo: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        state.paths = [...state.history[state.historyIndex]];
      }
    },
    redo: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        state.paths = [...state.history[state.historyIndex]];
      }
    },
    clearCanvas: (state) => {
      state.paths = [];
      state.currentPath = null;
      state.isDrawing = false;
      state.history = [[]];
      state.historyIndex = 0;
    },
    setCanDraw: (state, action) => {
      console.log('🎨 Redux setCanDraw called with:', action.payload);
      console.log('🎨 Previous canDraw state:', state.canDraw);
      state.canDraw = action.payload;
      console.log('🎨 New canDraw state:', state.canDraw);
    },
  },
});

export const {
  startPath,
  addPoint,
  endPath,
  addRemotePath,
  setBrushSize,
  setColor,
  setTool,
  undo,
  redo,
  clearCanvas,
  setCanDraw,
} = canvasSlice.actions;

export default canvasSlice.reducer;
