import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { aiApi } from '../../services/ai.api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  project: any;
  tasks: any[];
  onClose: () => void;
}

const SUGGESTED = [
  'Why is this project delayed?',
  'Which tasks should I prioritize?',
  'Which engineer needs attention?',
  'What is the critical path risk?',
  'Summarize overall project health',
];

export function AIAssistModal({ project, tasks, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const next: Message[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.analyzeProject({
        projectData: project,
        tasks,
        messages: next.slice(0, -1),
        question,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: err?.response?.data?.message ?? 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col w-full max-w-xl bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          height: 'min(600px, 85vh)',
          animation: 'modalShow 0.18s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0 bg-gradient-to-r from-[rgba(184,144,71,0.06)] to-transparent">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#b89047] to-[#9e7735] flex items-center justify-center shrink-0">
            <Sparkles size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[var(--text-primary)] leading-none">AI Assistant</p>
            <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 truncate">{project.clientName} · {project.serviceType?.replace(/_/g, ' ')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#b89047]/20 to-[#9e7735]/10 border border-[#b89047]/20 flex items-center justify-center">
                <Bot size={26} className="text-[#b89047]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">Ask anything about this project</p>
                <p className="text-[11.5px] text-[var(--text-muted)] mt-1">I have full access to task data, delays, engineers, and timelines.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#b89047] hover:text-[#b89047] hover:bg-[rgba(184,144,71,0.05)] transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5
                ${m.role === 'user'
                  ? 'bg-[#b89047] text-white'
                  : 'bg-[var(--border)] text-[var(--text-secondary)]'}`}>
                {m.role === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap
                ${m.role === 'user'
                  ? 'bg-[#b89047] text-white rounded-tr-sm'
                  : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-sm'}`}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center mt-0.5">
                <Bot size={13} />
              </div>
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin text-[#b89047]" />
                <span className="text-[11.5px] text-[var(--text-muted)]">Analysing project data…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[var(--border)] shrink-0 bg-[var(--card-bg)]">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this project… (Enter to send)"
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3.5 py-2.5 focus:outline-none focus:border-[#b89047] transition-colors disabled:opacity-50"
              style={{ maxHeight: 100 }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#b89047] to-[#9e7735] text-white flex items-center justify-center disabled:opacity-40 hover:shadow-md hover:-translate-y-px transition-all cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center">Shift+Enter for new line · Esc to close</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
