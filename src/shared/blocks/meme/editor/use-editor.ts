'use client';

import { useCallback, useReducer } from 'react';
import { nanoid } from 'nanoid';

import {
  DEFAULT_TEXTBOX,
  EditorState,
  MemeTemplate,
  TextBox,
} from './types';

type EditorAction =
  | { type: 'SET_TEMPLATE'; payload: MemeTemplate | null }
  | { type: 'SET_CUSTOM_IMAGE'; payload: string | null }
  | { type: 'ADD_TEXTBOX'; payload?: Partial<TextBox> }
  | { type: 'UPDATE_TEXTBOX'; payload: { id: string; updates: Partial<TextBox> } }
  | { type: 'REMOVE_TEXTBOX'; payload: string }
  | { type: 'DUPLICATE_TEXTBOX'; payload: string }
  | { type: 'SELECT_TEXTBOX'; payload: string | null }
  | { type: 'SET_CANVAS_SIZE'; payload: { width: number; height: number } }
  | { type: 'CLEAR_ALL_TEXT' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

const initialState: EditorState = {
  template: null,
  customImage: null,
  textBoxes: [],
  selectedTextBoxId: null,
  canvasWidth: 500,
  canvasHeight: 500,
  history: [[]],
  historyIndex: 0,
};

function createTextBox(overrides?: Partial<TextBox>): TextBox {
  return {
    id: nanoid(),
    ...DEFAULT_TEXTBOX,
    ...overrides,
  };
}

function pushHistory(state: EditorState, textBoxes: TextBox[]): EditorState {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(textBoxes);
  
  // Limit history to 50 states
  if (newHistory.length > 50) {
    newHistory.shift();
  }
  
  return {
    ...state,
    textBoxes,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_TEMPLATE': {
      const template = action.payload;
      const defaultTextBoxes = template?.defaultTextBoxes?.map((tb, index) =>
        createTextBox({
          ...tb,
          y: tb.y ?? (index === 0 ? 10 : 85),
        })
      ) || [
        createTextBox({ y: 10 }),
        createTextBox({ y: 85 }),
      ];
      
      return {
        ...state,
        template,
        customImage: null,
        textBoxes: defaultTextBoxes,
        selectedTextBoxId: defaultTextBoxes[0]?.id || null,
        history: [defaultTextBoxes],
        historyIndex: 0,
      };
    }

    case 'SET_CUSTOM_IMAGE': {
      const defaultTextBoxes = [
        createTextBox({ y: 10 }),
        createTextBox({ y: 85 }),
      ];
      
      return {
        ...state,
        template: null,
        customImage: action.payload,
        textBoxes: defaultTextBoxes,
        selectedTextBoxId: defaultTextBoxes[0]?.id || null,
        history: [defaultTextBoxes],
        historyIndex: 0,
      };
    }

    case 'ADD_TEXTBOX': {
      const newTextBox = createTextBox({
        y: 50,
        ...action.payload,
      });
      const newTextBoxes = [...state.textBoxes, newTextBox];
      
      return {
        ...pushHistory(state, newTextBoxes),
        selectedTextBoxId: newTextBox.id,
      };
    }

    case 'UPDATE_TEXTBOX': {
      const { id, updates } = action.payload;
      const newTextBoxes = state.textBoxes.map((tb) =>
        tb.id === id ? { ...tb, ...updates } : tb
      );
      
      return pushHistory(state, newTextBoxes);
    }

    case 'REMOVE_TEXTBOX': {
      const newTextBoxes = state.textBoxes.filter((tb) => tb.id !== action.payload);
      const newSelected = state.selectedTextBoxId === action.payload
        ? (newTextBoxes[0]?.id || null)
        : state.selectedTextBoxId;
      
      return {
        ...pushHistory(state, newTextBoxes),
        selectedTextBoxId: newSelected,
      };
    }

    case 'DUPLICATE_TEXTBOX': {
      const original = state.textBoxes.find((tb) => tb.id === action.payload);
      if (!original) return state;
      
      const duplicate = createTextBox({
        ...original,
        x: Math.min(original.x + 5, 90),
        y: Math.min(original.y + 5, 90),
      });
      const newTextBoxes = [...state.textBoxes, duplicate];
      
      return {
        ...pushHistory(state, newTextBoxes),
        selectedTextBoxId: duplicate.id,
      };
    }

    case 'SELECT_TEXTBOX':
      return { ...state, selectedTextBoxId: action.payload };

    case 'SET_CANVAS_SIZE':
      return {
        ...state,
        canvasWidth: action.payload.width,
        canvasHeight: action.payload.height,
      };

    case 'CLEAR_ALL_TEXT': {
      const clearedTextBoxes = state.textBoxes.map((tb) => ({
        ...tb,
        text: '',
      }));
      return pushHistory(state, clearedTextBoxes);
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        textBoxes: state.history[newIndex],
        historyIndex: newIndex,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        textBoxes: state.history[newIndex],
        historyIndex: newIndex,
      };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function useEditor() {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const setTemplate = useCallback((template: MemeTemplate | null) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
  }, []);

  const setCustomImage = useCallback((imageUrl: string | null) => {
    dispatch({ type: 'SET_CUSTOM_IMAGE', payload: imageUrl });
  }, []);

  const addTextBox = useCallback((overrides?: Partial<TextBox>) => {
    dispatch({ type: 'ADD_TEXTBOX', payload: overrides });
  }, []);

  const updateTextBox = useCallback((id: string, updates: Partial<TextBox>) => {
    dispatch({ type: 'UPDATE_TEXTBOX', payload: { id, updates } });
  }, []);

  const removeTextBox = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TEXTBOX', payload: id });
  }, []);

  const duplicateTextBox = useCallback((id: string) => {
    dispatch({ type: 'DUPLICATE_TEXTBOX', payload: id });
  }, []);

  const selectTextBox = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_TEXTBOX', payload: id });
  }, []);

  const setCanvasSize = useCallback((width: number, height: number) => {
    dispatch({ type: 'SET_CANVAS_SIZE', payload: { width, height } });
  }, []);

  const clearAllText = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_TEXT' });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const selectedTextBox = state.textBoxes.find(
    (tb) => tb.id === state.selectedTextBoxId
  );
  const imageUrl = state.template?.imageUrl || state.customImage;

  return {
    state,
    imageUrl,
    selectedTextBox,
    canUndo,
    canRedo,
    setTemplate,
    setCustomImage,
    addTextBox,
    updateTextBox,
    removeTextBox,
    duplicateTextBox,
    selectTextBox,
    setCanvasSize,
    clearAllText,
    undo,
    redo,
    reset,
  };
}
