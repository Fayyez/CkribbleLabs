
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
      const existingIndex = state.paths.findIndex(p => p.id === path.id);
      if (existingIndex !== -1) {
        state.paths[existingIndex] = path;
      } else {
        state.paths.push(path);
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
      state.canDraw = action.payload;
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
