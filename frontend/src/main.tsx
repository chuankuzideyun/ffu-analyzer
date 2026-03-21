import React, { FormEvent, useState, useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ChatMessage } from './components/ChatMessage'
import { DocumentViewer } from './components/DocumentViewer'

const ui = {
  page: { margin: 0, height: '100vh', background: '#f8f9fa', display: 'flex', flexDirection: 'row' as const, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' },
  // 拖拽条样式
  resizer: {
    width: '8px',
    cursor: 'col-resize',
    background: '#dee2e6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    zIndex: 10,
  },
  resizerHandle: {
    width: '4px',
    height: '40px',
    background: '#adb5bd',
    borderRadius: '2px'
  },
  viewerPane: (width: number) => ({ 
    width: `${width}px`, 
    minWidth: '200px',
    borderRight: '1px solid #dee2e6', 
    background: '#fff', 
    overflow: 'hidden', 
    display: 'flex', 
    flexDirection: 'column' as const 
  }),
  chatPane: { flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column' as const, background: '#f1f3f5', overflow: 'hidden' },
  header: { padding: '12px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' },
  chatList: { flex: 1, padding: '16px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  actionTray: { display: 'flex', gap: '8px', padding: '10px 16px', background: '#fff', borderTop: '1px solid #eee', flexWrap: 'wrap' as const },
  actionBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #0d6efd', color: '#0d6efd', borderRadius: '16px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 },
  legend: { padding: '8px 16px', display: 'flex', gap: '12px', background: '#fff', fontSize: '10px', color: '#868e96', borderTop: '1px solid #eee' },
  dot: (color: string) => ({ width: '8px', height: '8px', background: color, borderRadius: '50%', display: 'inline-block', marginRight: '4px' }),
  footer: { background: '#fff', borderTop: '1px solid #dee2e6' },
  previewBar: { padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8f9fa', borderBottom: '1px solid #eee' },
  fileBadge: { padding: '4px 8px', background: '#e7f5ff', color: '#1971c2', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
  form: { padding: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  input: { flex: 1, padding: '10px', border: '1px solid #ced4da', borderRadius: '4px', font: 'inherit' },
  btn: { padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', minWidth: '80px', fontWeight: 600 },
  status: { fontSize: '12px', color: '#6c757d', padding: '0 16px 8px', fontStyle: 'italic' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' },
}

const waitingSentences = [
  "Analyzing construction documents... (They are longer than my life)",
  "Consulting the construction gods...",
  "Reading between the lines (literally)...",
  "Trying to understand Swedish technical terms... help.",
  "Looking for risks so you don't have to...",
  "Coffee break for the AI? No, still working...",
  "Checking if the budget actually makes sense...",
  "Counting requirements... 102, 103, 104...",
  "Summarizing wisdom, please hold on..."
];

function App() {
  const [status, setStatus] = useState('')
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [activeDocContent, setActiveDocContent] = useState<string>('')
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [waitingIndex, setWaitingIndex] = useState(0);
  
  // 拖拽状态
  const [leftWidth, setLeftWidth] = useState(window.innerWidth * 0.4);
  const isResizing = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. 拖拽逻辑实现
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      // 限制最小宽度 200px，最大宽度为屏幕宽度减去右侧最小宽度 300px
      const newWidth = Math.max(200, Math.min(e.clientX, window.innerWidth - 300));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  };

  // 2. 自动滚动
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  // 3. 循环等待语
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (thinking && !typingIntervalRef.current) {
      interval = setInterval(() => {
        setWaitingIndex((prev) => (prev + 1) % waitingSentences.length);
      }, 3500); // 调整了频率，让句子切换更自然
    }
    return () => clearInterval(interval);
  }, [thinking]);

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setThinking(false);
    setStatus('Stopped.');
  };

  const send = async (e: FormEvent | null, promptOverride?: string) => {
    if (e) e.preventDefault();
    const targetMsg = promptOverride || input;
    if (!targetMsg.trim() || thinking || typingIntervalRef.current) return;

    setStatus('');
    setThinking(true);
    setWaitingIndex(0);
    
    const history = [...messages]; 
    setMessages((m) => [...m, { role: 'user', content: targetMsg }]);
    if (!promptOverride) setInput('');
    setSelectedFile(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: targetMsg, history }),
        signal: controller.signal
      });
      
      const data = await response.json();
      if (data.doc_content) setActiveDocContent(data.doc_content);

      setMessages((m) => [...m, { role: 'assistant', content: '' }]);

      const fullText = data.response;
      let currentText = "";
      let index = 0;

      typingIntervalRef.current = setInterval(() => {
        if (index < fullText.length) {
          currentText += fullText[index];
          setMessages((prevMessages) => {
            const updated = [...prevMessages];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = { ...updated[lastIdx], content: currentText };
            }
            return updated;
          });
          index++;
        } else {
          clearInterval(typingIntervalRef.current!);
          typingIntervalRef.current = null;
          setThinking(false);
        }
      }, 15);

    } catch (err: any) {
      if (err.name !== 'AbortError') setStatus('Error connecting to backend.');
      setThinking(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setStatus(`Ready: ${file.name}`); }
  };

  const handleCiteClick = (lineNum: number) => {
    setHighlightedLine(lineNum);
    setTimeout(() => setHighlightedLine(null), 5000);
  };

  return (
    <div style={ui.page}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .resizer-hover:hover { background: #0d6efd !important; }
      `}</style>
      
      {/* 左侧面板 */}
      <div style={ui.viewerPane(leftWidth)}>
        <div style={ui.header}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Source Document</h3>
          <button onClick={() => setStatus('Indexing...')} style={{ ...ui.btn, background: '#6c757d', fontSize: '11px', minWidth: 'auto' }}>Re-index FFU</button>
        </div>
        <div style={{ flex: 1, overflowY: 'hidden' }}>
          <DocumentViewer content={activeDocContent} highlightedLine={highlightedLine} />
        </div>
      </div>

      {/* 拖拽把手 Resizer */}
      <div 
        style={ui.resizer} 
        onMouseDown={handleMouseDown}
        className="resizer-hover"
      >
        <div style={ui.resizerHandle} />
      </div>

      {/* 右侧面板 */}
      <div style={ui.chatPane}>
        <div style={ui.header}><h3 style={{ margin: 0, fontSize: '16px' }}>Assistant</h3></div>
        
        <div ref={chatListRef} style={ui.chatList}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} onCiteClick={handleCiteClick} />
          ))}
          {thinking && !typingIntervalRef.current && (
            <div style={{ fontSize: '13px', color: '#6c757d', padding: '10px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ animation: 'spin 2s linear infinite' }}>🌀</span>
              {waitingSentences[waitingIndex]}
            </div>
          )}
        </div>

        {!thinking && !typingIntervalRef.current && messages.length > 0 && (
          <div style={ui.actionTray}>
            <button style={ui.actionBtn} onClick={() => send(null, "List all RISKS.")}>⚠️ Risks</button>
            <button style={ui.actionBtn} onClick={() => send(null, "List all DEADLINES.")}>📅 Dates</button>
            <button style={ui.actionBtn} onClick={() => send(null, "Summarize REQUIREMENTS.")}>📌 Reqs</button>
          </div>
        )}

        <div style={ui.legend}>
          <span><span style={ui.dot('#e03131')}></span>Risk</span>
          <span><span style={ui.dot('#5c940d')}></span>Deadline</span>
          <span><span style={ui.dot('#1971c2')}></span>Requirement</span>
        </div>

        <div style={ui.footer}>
          {selectedFile && (
            <div style={ui.previewBar}>
              <div style={ui.fileBadge}>
                {selectedFile.type.includes('image') ? '🖼️' : '📄'} {selectedFile.name}
                <span style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={() => setSelectedFile(null)}>×</span>
              </div>
            </div>
          )}
          <div style={ui.status}>{status}</div>

          <form onSubmit={(e) => send(e)} style={ui.form}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/*" style={{ display: 'none' }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} style={ui.iconBtn}>📎</button>
            <button type="button" onClick={() => alert('Camera feature integrated in main logic')} style={ui.iconBtn}>📷</button>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search or ask about plans..." style={ui.input} />
            
            {(thinking || typingIntervalRef.current) ? (
              <button type="button" onClick={stopGenerating} style={{ ...ui.btn, background: '#ff6b6b' }}>Stop</button>
            ) : (
              <button type="submit" style={ui.btn}>Send</button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)