import { FormEvent, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChatMessage } from './components/ChatMessage'
import { DocumentViewer } from './components/DocumentViewer'

const ui = {
  page: { margin: 0, height: '100vh', background: '#f8f9fa', display: 'flex', fontFamily: 'system-ui, sans-serif' },
  viewerPane: { flex: 1, borderRight: '1px solid #dee2e6', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const },
  chatPane: { width: '400px', display: 'flex', flexDirection: 'column' as const, background: '#f1f3f5' },
  header: { padding: '12px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' },
  chatList: { flex: 1, padding: '16px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  actionTray: { display: 'flex', gap: '8px', padding: '10px 16px', background: '#fff', borderTop: '1px solid #eee', flexWrap: 'wrap' as const },
  actionBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #0d6efd', color: '#0d6efd', borderRadius: '16px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, transition: '0.2s' },
  legend: { padding: '8px 16px', display: 'flex', gap: '12px', background: '#fff', fontSize: '10px', color: '#868e96', borderTop: '1px solid #eee' },
  dot: (color: string) => ({ width: '8px', height: '8px', background: color, borderRadius: '50%', display: 'inline-block', marginRight: '4px' }),
  form: { padding: '16px', background: '#fff', borderTop: '1px solid #dee2e6', display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' },
  input: { padding: '10px', border: '1px solid #ced4da', borderRadius: '4px', font: 'inherit' },
  btn: { padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  status: { fontSize: '12px', color: '#6c757d', padding: '0 16px 8px' }
}

function App() {
  const [status, setStatus] = useState('')
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [activeDocContent, setActiveDocContent] = useState<string>('')
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null)
  const [highlightType, setHighlightType] = useState<string | null>(null);

  const processFfu = async () => {
    setStatus('Processing PDF documents...')
    const data = await fetch('/api/process', { method: 'POST' }).then((r) => r.json())
    setStatus(`Done: ${data.count} files indexed.`)
  }

  const handleCiteClick = (lineNum: number, type: string) => {
    setHighlightedLine(lineNum);
    setHighlightType(type);
    setTimeout(() => {
      setHighlightedLine(null);
      setHighlightType(null);
    }, 3000);
  };

  // Modified send function to accept an optional pre-defined message string
  const send = async (e: FormEvent | null, promptOverride?: string) => {
    if (e) e.preventDefault()
    
    const targetMsg = promptOverride || input;
    if (!targetMsg.trim() || thinking) return

    const history = [...messages]
    if (!promptOverride) setInput('') // Clear input only if it was a manual type
    
    setThinking(true)
    setMessages([...history, { role: 'user', content: targetMsg }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: targetMsg, history }),
      })
      
      const data = await response.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.response }])
      
      if (data.doc_content) {
        setActiveDocContent(data.doc_content)
      }
    } catch (err) {
      setStatus('Error: Failed to connect to assistant.')
    } finally {
      setThinking(false)
    }
  }

  return (
    <div style={ui.page}>
      {/* Left: Document Viewer */}
      <div style={ui.viewerPane}>
        <div style={ui.header}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Source Document</h3>
          <button onClick={processFfu} style={{ ...ui.btn, background: '#6c757d', fontSize: '12px' }}>
            Re-index FFU
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <DocumentViewer content={activeDocContent} highlightedLine={highlightedLine} />
        </div>
      </div>

      {/* Right: Chat Panel */}
      <div style={ui.chatPane}>
        <div style={ui.header}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Assistant</h3>
        </div>
        
        <div style={ui.chatList}>
          {messages.map((msg, i) => (
            <ChatMessage 
              key={i} 
              role={msg.role} 
              content={msg.content} 
              onCiteClick={handleCiteClick} 
            />
          ))}
          {thinking && <div style={{ fontSize: '14px', color: '#6c757d', padding: '10px' }}>Assistant is reading...</div>}
        </div>

        {/* Quick Actions Panel - Visible after the first message */}
        {messages.length > 0 && !thinking && (
          <div style={ui.actionTray}>
            <button style={ui.actionBtn} onClick={() => send(null, "Extract all RISKS from the current document.")}>⚠️ Extract Risks</button>
            <button style={ui.actionBtn} onClick={() => send(null, "List all DEADLINES and dates.")}>📅 Key Deadlines</button>
            <button style={ui.actionBtn} onClick={() => send(null, "Summarize technical REQUIREMENTS.")}>📌 Requirements</button>
          </div>
        )}

        {/* Legend Panel */}
        <div style={ui.legend}>
          <span><span style={ui.dot('#e03131')}></span>Risk</span>
          <span><span style={ui.dot('#5c940d')}></span>Deadline</span>
          <span><span style={ui.dot('#1971c2')}></span>Requirement</span>
        </div>

        <div style={ui.status}>{status}</div>

        <form onSubmit={(e) => send(e)} style={ui.form}>
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Search requirements..." 
            style={ui.input} 
          />
          <button style={ui.btn}>Send</button>
        </form>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)