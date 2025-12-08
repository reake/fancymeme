export interface TextBox {
  id: string;
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  strokeColor: string;
  strokeWidth: number;
  rotation: number; // degrees
  shadowColor: string;
  shadowBlur: number;
}

export interface MemeTemplate {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
  defaultTextBoxes?: Partial<TextBox>[];
}

export interface EditorState {
  template: MemeTemplate | null;
  customImage: string | null;
  textBoxes: TextBox[];
  selectedTextBoxId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  history: TextBox[][];
  historyIndex: number;
}

export const DEFAULT_TEXTBOX: Omit<TextBox, 'id'> = {
  text: 'YOUR TEXT HERE',
  x: 50,
  y: 10,
  width: 80,
  height: 20,
  fontSize: 32,
  fontFamily: 'Impact',
  fontColor: '#FFFFFF',
  fontWeight: 'bold',
  textAlign: 'center',
  strokeColor: '#000000',
  strokeWidth: 2,
  rotation: 0,
  shadowColor: 'transparent',
  shadowBlur: 0,
};

export const FONT_FAMILIES = [
  'Impact',
  'Arial Black',
  'Comic Sans MS',
  'Helvetica',
  'Arial',
  'Times New Roman',
  'Courier New',
];

export const FONT_SIZES = [16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
