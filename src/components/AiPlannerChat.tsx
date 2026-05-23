// components/AiPlannerChat.tsx
'use client';

import { useState } from 'react';
import { Bot, MessageCircle, X } from 'lucide-react';

export function AiPlannerChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);

  async function sendMessage() {
    const goal = input.trim();
    if (!goal) return;

    setMessages((prev) => [...prev, { role: 'user', content: goal }]);
    setInput('');

    const res = await fetch('/api/ai-planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: data.reply },
    ]);
  }

  return (
    <>
      <button
        type='button'
        onClick={() => setIsOpen(true)}
        className='fixed bottom-5 left-5 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-[0_14px_40px_rgba(0,0,0,0.18)] active:scale-95'
        aria-label='Open AI planner'
      >
        <MessageCircle size={24} />
      </button>

      {isOpen && (
        <div className='fixed bottom-24 left-5 z-[9999] flex h-[560px] w-[360px] max-w-[calc(100vw-40px)] flex-col rounded-[24px] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]'>
          <div className='flex items-center justify-between border-b border-gray-100 p-4'>
            <div className='flex items-center gap-2 font-semibold'>
              <Bot size={18} />
              AI Planner
            </div>

            <button onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className='flex-1 space-y-3 overflow-y-auto p-4'>
            {messages.length === 0 && (
              <p className='text-[15px] text-gray-500'>
                막연한 목표를 적어보세요. 실행 가능한 주간/일간 계획으로
                바꿔드릴게요.
              </p>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`rounded-[18px] p-3 text-[15px] ${
                  message.role === 'user'
                    ? 'ml-8 bg-blue-500 text-white'
                    : 'mr-8 bg-[#f2f2f7] text-black'
                }`}
              >
                <p className='whitespace-pre-wrap'>{message.content}</p>
              </div>
            ))}
          </div>

          <div className='flex gap-2 border-t border-gray-100 p-3'>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder='예: 영어 공부를 꾸준히 하고 싶어'
              className='min-w-0 flex-1 rounded-[16px] bg-[#f2f2f7] px-4 py-3 text-[15px] outline-none'
            />

            <button
              onClick={sendMessage}
              className='rounded-[16px] bg-blue-500 px-4 font-semibold text-white'
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
