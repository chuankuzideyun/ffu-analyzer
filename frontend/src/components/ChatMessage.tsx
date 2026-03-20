import React from 'react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  onCiteClick: (lineNum: number, type: string) => void;
}

const typeStyles: Record<string, any> = {
  RISK: { bg: '#fff5f5', border: '#ffc9c9', color: '#e03131', label: 'RISK', icon: '⚠️' },
  DEADLINE: { bg: '#f4fce3', border: '#d8f5a2', color: '#5c940d', label: 'DATE', icon: '📅' },
  REQ: { bg: '#e7f5ff', border: '#a5d8ff', color: '#1971c2', label: 'REQ', icon: '📌' },
  DEFAULT: { bg: '#f8f9fa', border: '#dee2e6', color: '#495057', label: 'SRC', icon: '🔗' }
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, onCiteClick }) => {
  const isAssistant = role === 'assistant';

  const renderContent = (text: string) => {
    if (!isAssistant) return text;

    // Regex to match [[id#line#type#quote]]
    const parts = text.split(/(\[\[\d+#\d+#\w+#.*?\]\])/g);

    return parts.map((part, i) => {
      const match = part.match(/\[\[(\d+)#(\d+)#(\w+)#(.*?)\]\]/);
      if (match) {
        const [_, docId, lineNum, type, quote] = match;
        const style = typeStyles[type] || typeStyles.DEFAULT;

        return (
          <div 
            key={i}
            onClick={() => onCiteClick(parseInt(lineNum), type)}
            style={{
              background: style.bg,
              borderLeft: `4px solid ${style.border}`,
              padding: '8px 12px',
              margin: '12px 0',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s',
              color: '#212529' // Keep citation text dark even in blue user bubbles
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
          >
            <div style={{ fontWeight: 'bold', color: style.color, fontSize: '11px', marginBottom: '4px' }}>
              {style.icon} {style.label} | Line {lineNum}
            </div>
            <div style={{ fontStyle: 'italic', color: '#444', fontSize: '13px' }}>
              "{quote}"
            </div>
          </div>
        );
      }

      // Render standard Markdown for non-citation parts
      return (
        <ReactMarkdown 
          key={i}
          components={{
            // Remove extra margins from paragraphs to keep bubble compact
            p: ({node, ...props}) => <p style={{ margin: '4px 0' }} {...props} />,
            ul: ({node, ...props}) => <ul style={{ margin: '8px 0', paddingLeft: '20px' }} {...props} />,
            ol: ({node, ...props}) => <ol style={{ margin: '8px 0', paddingLeft: '20px' }} {...props} />,
            li: ({node, ...props}) => <li style={{ marginBottom: '4px' }} {...props} />,
            strong: ({node, ...props}) => <strong style={{ fontWeight: 600 }} {...props} />,
          }}
        >
          {part}
        </ReactMarkdown>
      );
    });
  };

  return (
    <div style={{
      alignSelf: isAssistant ? 'flex-start' : 'flex-end',
      maxWidth: '90%',
      padding: '12px 16px',
      borderRadius: '12px',
      background: isAssistant ? '#fff' : '#0d6efd',
      color: isAssistant ? '#212529' : '#fff',
      border: isAssistant ? '1px solid #dee2e6' : 'none',
      marginBottom: '8px',
      whiteSpace: 'normal',
      boxShadow: isAssistant ? '0 2px 5px rgba(0,0,0,0.05)' : 'none'
    }}>
      {renderContent(content)}
    </div>
  );
};