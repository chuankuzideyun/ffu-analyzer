import React, { useEffect, useRef, useState } from 'react';

interface DocumentViewerProps {
    content: string;
    highlightedLine: number | null;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ content, highlightedLine }) => {
    const [currentChapter, setCurrentChapter] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [readProgress, setReadProgress] = useState(0);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Extract table of contents based on Markdown headers
    const chapters = content.split('\n').map((line, idx) => {
        const match = line.match(/(?:\[\d+\]\s*)?(\#{1,4})\s+(.*)/);
        return match ? { title: match[2].trim(), lineId: `line-${idx + 1}` } : null;
    }).filter(Boolean) as { title: string; lineId: string }[];

    // Handle scroll events for progress, chapter detection, and UI visibility
    const handleScroll = () => {
        if (!containerRef.current || !content) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        
        // 1. Calculate reading progress percentage
        const totalScrollable = scrollHeight - clientHeight;
        if (totalScrollable > 0) {
            setReadProgress((scrollTop / totalScrollable) * 100);
        }

        // 2. Toggle "Back to Top" button visibility
        setShowScrollTop(scrollTop > 300);

        // 3. Detect the current active chapter in view
        let found = false;
        for (let i = chapters.length - 1; i >= 0; i--) {
            const el = document.getElementById(chapters[i].lineId);
            if (el && el.offsetTop <= scrollTop + 100) {
                setCurrentChapter(chapters[i].title);
                found = true;
                break;
            }
        }

        // Reset to first chapter or default if near top
        if (!found && scrollTop < 100) {
            setCurrentChapter(chapters.length > 0 ? chapters[0].title : (content ? "Document Content" : null));
        }
    };

    // Smooth scroll to the top of the container
    const scrollToTop = () => {
        containerRef.current?.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Reset UI state when content changes
    useEffect(() => {
        if (!content) {
            setCurrentChapter(null);
            setReadProgress(0);
        } else if (chapters.length > 0) {
            setCurrentChapter(chapters[0].title);
        } else {
            setCurrentChapter("Document Content");
        }
    }, [content]);

    // Handle external jump requests (e.g., clicking a citation in chat)
    useEffect(() => {
        if (highlightedLine) {
            const el = document.getElementById(`line-${highlightedLine}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightedLine]);

    // Render placeholder if no content is loaded
    if (!content) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#adb5bd' }}>
                Select a document or ask a question to see source text.
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {/* Sticky Header showing the current chapter */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(4px)',
                padding: '8px 16px',
                borderBottom: '1px solid #eee',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0d6efd',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span style={{ color: '#adb5bd' }}>CURRENT SECTION:</span> 
                {currentChapter || "Loading..."}
            </div>

            {/* Main scrollable text area */}
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                style={{ flex: 1, overflowY: 'auto', padding: '20px' }}
            >
                {content.split('\n').map((line, i) => (
                    <div key={i} id={`line-${i + 1}`} style={{
                        backgroundColor: (i + 1) === highlightedLine ? '#fff3bf' : 'transparent',
                        padding: '2px 0',
                        transition: 'background-color 0.3s'
                    }}>
                        {line}
                    </div>
                ))}
            </div>

            {/* Floating "Back to Top" Action Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    style={{
                        position: 'absolute',
                        right: '20px',
                        bottom: '30px',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#0d6efd',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        fontSize: '20px',
                        zIndex: 30,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'opacity 0.3s'
                    }}
                    title="Back to Top"
                >
                    ↑
                </button>
            )}

            {/* Visual reading progress bar at the bottom */}
            <div style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                height: '3px', 
                background: '#0d6efd', 
                width: `${readProgress}%`, 
                transition: 'width 0.1s ease-out',
                zIndex: 20
            }} />
        </div>
    );
};