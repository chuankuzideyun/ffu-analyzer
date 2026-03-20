import React from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  onCiteClick: (lineNum: number) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, onCiteClick }) => {
  const isAssistant = role === 'assistant';

  // Helper to parse citations: [[docId#lineNum]]
  const renderContent = (text: string) => {
    if (!isAssistant) return text;

    const parts = text.split(/(\[\[\d+#\d+\]\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[\[(\d+)#(\d+)\]\]/);
      if (match) {
        const lineNum = parseInt(match[2]);
        return (
          <button
            key={i}
            onClick={() => onCiteClick(lineNum)}
            style={{
              background: '#e7f5ff',
              color: '#1971c2',
              border: '1px solid #a5d8ff',
              borderRadius: '6px',
              padding: '2px 6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 700,
              margin: '0 2px',
            }}
          >
            LINE {lineNum}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <div
      style={{
        alignSelf: isAssistant ? 'flex-start' : 'flex-end',
        maxWidth: '85%',
        padding: '12px 16px',
        borderRadius: '12px',
        fontSize: '14px',
        lineHeight: '1.5',
        background: isAssistant ? '#fff' : '#0d6efd',
        color: isAssistant ? '#212529' : '#fff',
        border: isAssistant ? '1px solid #dee2e6' : 'none',
        boxShadow: isAssistant ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
        whiteSpace: 'pre-wrap',
      }}
    >
      {renderContent(content)}
    </div>
  );
};