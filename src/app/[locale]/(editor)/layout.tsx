import { ReactNode } from 'react';

export default function EditorLayout({ children }: { children: ReactNode }) {
  return <div id="main-content">{children}</div>;
}
