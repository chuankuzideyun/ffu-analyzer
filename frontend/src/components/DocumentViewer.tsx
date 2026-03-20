import React, { useEffect, useRef } from 'react';

interface DocumentViewerProps {
  content: string;
  highlightedLine: number | null;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ content, highlightedLine }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedLine) {
      const el = document.getElementById(`line-${highlightedLine}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedLine]);

  if (!content) {
    return (
      <div style={{ color: '#adb5bd', textAlign: 'center', marginTop: '100px' }}>
        Select a document or ask a question to see source text.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ whiteSpace: 'pre-wrap', fontSize: '13px', color: '#495057' }}>
      {content.split('\n').map((line, idx) => {
        const lineNum = idx + 1;
        const isCurrent = highlightedLine === lineNum;
        return (
          <div
            key={idx}
            id={`line-${lineNum}`}
            style={{
              display: 'flex',
              borderBottom: '1px solid #f8f9fa',
              backgroundColor: isCurrent ? '#fff3bf' : 'transparent',
              transition: 'background-color 0.5s ease',
            }}
          >
            <div
              style={{
                width: '45px',
                textAlign: 'right',
                color: '#ced4da',
                paddingRight: '10px',
                fontSize: '11px',
                borderRight: '1px solid #f1f3f5',
                marginRight: '10px',
                userSelect: 'none',
              }}
            >
              {lineNum}
            </div>
            <div style={{ flex: 1, padding: '4px 0' }}>{line}</div>
          </div>
        );
      })}
    </div>
  );
};