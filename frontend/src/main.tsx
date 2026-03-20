import React, { FormEvent, useState, useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ChatMessage } from './components/ChatMessage'
import { DocumentViewer } from './components/DocumentViewer'

const ui = {
  page: { margin: 0, height: '100vh', background: '#f8f9fa', display: 'flex', flexDirection: 'row' as const, fontFamily: 'system-ui, sans-serif' },
  viewerPane: { flex: 1, borderRight: '1px solid #dee2e6', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const },
  chatPane: { width: '400px', display: 'flex', flexDirection: 'column' as const, background: '#f1f3f5' },
  header: { padding: '12px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' },
  chatList: { flex: 1, padding: '16px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  actionTray: { display: 'flex', gap: '8px', padding: '10px 16px', background: '#fff', borderTop: '1px solid #eee', flexWrap: 'wrap' as const },
  actionBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #0d6efd', color: '#0d6efd', borderRadius: '16px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 },
  legend: { padding: '8px 16px', display: 'flex', gap: '12px', background: '#fff', fontSize: '10px', color: '#868e96', borderTop: '1px solid #eee' },
  dot: (color: string) => ({ width: '8px', height: '8px', background: color, borderRadius: '50%', display: 'inline-block', marginRight: '4px' }),
  
  // Multi-modal Footer Area
  footer: { background: '#fff', borderTop: '1px solid #dee2e6' },
  previewBar: { padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8f9fa', borderBottom: '1px solid #eee' },
  fileBadge: { padding: '4px 8px', background: '#e7f5ff', color: '#1971c2', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
  
  form: { padding: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  input: { flex: 1, padding: '10px', border: '1px solid #ced4da', borderRadius: '4px', font: 'inherit' },
  btn: { padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  status: { fontSize: '12px', color: '#6c757d', padding: '0 16px 8px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', transition: 'all 0.2s ease' },
  
  // Camera Overlay
  cameraOverlay: { position: 'fixed' as const, top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '20px' }
}

function App() {
  const [status, setStatus] = useState('')
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [activeDocContent, setActiveDocContent] = useState<string>('')
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Camera & Upload Refs
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Multi-modal: File Upload Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus(`File selected: ${file.name}. Ready for Multi-modal analysis.`);
    }
  };

  // --- Multi-modal: Desktop Camera Logic ---
  const startCamera = async () => {
    const consent = window.confirm("The assistant requests camera access for visual analysis. Allow?");
    if (!consent) return;

    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setStatus("Error: Camera access denied or not found.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture_${Date.now()}.png`, { type: 'image/png' });
          setSelectedFile(file);
          setStatus("Camera photo captured!");
        }
      }, 'image/png');

      stopCamera();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsCameraActive(false);
  };

  // --- Core Application Logic ---
  const processFfu = async () => {
    setStatus('Processing PDF documents...')
    try {
      const data = await fetch('/api/process', { method: 'POST' }).then((r) => r.json())
      setStatus(`Done: ${data.count} files indexed.`)
    } catch (e) { setStatus('Error during processing.') }
  }

  const handleCiteClick = (lineNum: number) => {
    setHighlightedLine(lineNum);
    setTimeout(() => setHighlightedLine(null), 5000);
  };

  const send = async (e: FormEvent | null, promptOverride?: string) => {
    if (e) e.preventDefault()
    const targetMsg = promptOverride || input;
    if (!targetMsg.trim() || thinking) return

    setThinking(true)
    setMessages((m) => [...m, { role: 'user', content: targetMsg }])
    if (!promptOverride) setInput('')
    
    // Reset file preview after "sending"
    setSelectedFile(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: targetMsg, history: messages }),
      })
      const data = await response.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.response }])
      if (data.doc_content) setActiveDocContent(data.doc_content)
    } catch (err) {
      setStatus('Error: Failed to connect to backend.')
    } finally {
      setThinking(false)
    }
  }

  return (
    <div style={ui.page}>
      {/* 1. Camera Modal Overlay */}
      {isCameraActive && (
        <div style={ui.cameraOverlay}>
          <video ref={videoRef} autoPlay style={{ width: '80%', maxWidth: '640px', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={capturePhoto} style={{ ...ui.btn, background: '#40c057' }}>📸 Take Photo</button>
            <button onClick={stopCamera} style={{ ...ui.btn, background: '#fa5252' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* 2. Left Pane: Source Document */}
      <div style={ui.viewerPane}>
        <div style={ui.header}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Source Document</h3>
          <button onClick={processFfu} style={{ ...ui.btn, background: '#6c757d', fontSize: '11px' }}>Re-index FFU</button>
        </div>
        <div style={{ flex: 1, overflowY: 'hidden' }}>
          <DocumentViewer content={activeDocContent} highlightedLine={highlightedLine} />
        </div>
      </div>

      {/* 3. Right Pane: AI Assistant */}
      <div style={ui.chatPane}>
        <div style={ui.header}><h3 style={{ margin: 0, fontSize: '16px' }}>Assistant</h3></div>
        
        <div style={ui.chatList}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} onCiteClick={handleCiteClick} />
          ))}
          {thinking && <div style={{ fontSize: '13px', color: '#6c757d', padding: '10px' }}>Analyzing construction documents...</div>}
        </div>

        {/* Dynamic Action Tray */}
        {messages.length > 0 && !thinking && (
          <div style={ui.actionTray}>
            <button style={ui.actionBtn} onClick={() => send(null, "List all RISKS found.")}>⚠️ Risks</button>
            <button style={ui.actionBtn} onClick={() => send(null, "List all DEADLINES.")}>📅 Dates</button>
            <button style={ui.actionBtn} onClick={() => send(null, "Summarize REQUIREMENTS.")}>📌 Reqs</button>
          </div>
        )}

        {/* Map Legend */}
        <div style={ui.legend}>
          <span><span style={ui.dot('#e03131')}></span>Risk</span>
          <span><span style={ui.dot('#5c940d')}></span>Deadline</span>
          <span><span style={ui.dot('#1971c2')}></span>Requirement</span>
        </div>

        {/* Footer: Multi-modal Input Area */}
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
            
            <button type="button" onClick={() => fileInputRef.current?.click()} style={ui.iconBtn} title="Upload PDF/Image">📎</button>
            <button type="button" onClick={startCamera} style={ui.iconBtn} title="Capture from Camera">📷</button>

            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Ask a question or upload a photo..." 
              style={ui.input} 
            />
            <button style={ui.btn}>Send</button>
          </form>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)