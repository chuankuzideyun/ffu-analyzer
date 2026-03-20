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
  
  // New States for the "Clear Links" feature
  const [activeDocContent, setActiveDocContent] = useState<string>('')
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null)

  const processFfu = async () => {
    setStatus('Processing PDF documents...')
    const data = await fetch('/api/process', { method: 'POST' }).then((r) => r.json())
    setStatus(`Done: ${data.count} files indexed.`)
  }

  const handleCiteClick = (lineNum: number) => {
    setHighlightedLine(lineNum)
    // Clear highlight after 3 seconds so user can trigger it again
    setTimeout(() => setHighlightedLine(null), 3000)
  }

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || thinking) return

    const userMsg = input.trim()
    const history = [...messages]
    
    setInput('')
    setThinking(true)
    setMessages([...history, { role: 'user', content: userMsg }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history }),
      })
      
      const data = await response.json()
      console.log("DEBUG DATA:", data);
      setMessages((m) => [...m, { role: 'assistant', content: data.response }])
      
      // If the backend returned document content (update your backend to include this!)
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

        <div style={ui.status}>{status}</div>

        <form onSubmit={send} style={ui.form}>
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