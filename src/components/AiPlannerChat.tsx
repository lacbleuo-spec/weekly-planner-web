'use client';

import { useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';

type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function AiPlannerChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage() {
    const message = input.trim();

    if (!message || isLoading) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: message,
      },
    ]);

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create AI plan.');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry, I cannot create a plan right now. Please try again later.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type='button'
        onClick={() => setIsOpen(true)}
        className='fixed bottom-5 right-5 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition active:scale-95'
        aria-label='Open AI planner'
      >
        <MessageCircle size={24} />
      </button>

      {isOpen && (
        <div className='fixed bottom-24 right-5 z-[9999] flex h-[560px] w-[360px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]'>
          <div className='flex items-center justify-between border-b border-gray-100 p-4'>
            <div className='flex items-center gap-2'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-500'>
                <Bot size={18} />
              </div>

              <div>
                <h2 className='text-[16px] font-semibold'>AI Planner</h2>

                <p className='text-[12px] text-gray-500'>
                  Turn vague goals into plans
                </p>
              </div>
            </div>

            <button
              type='button'
              onClick={() => setIsOpen(false)}
              className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:bg-gray-100'
              aria-label='Close AI planner'
            >
              <X size={18} />
            </button>
          </div>

          <div className='flex-1 space-y-3 overflow-y-auto p-4'>
            {messages.length === 0 && (
              <div className='rounded-[18px] bg-[#f2f2f7] p-4'>
                <p className='text-[15px] leading-6 text-gray-600'>
                  Write down a vague goal.
                  <br />
                  Example: I want to build an exercise habit
                  <br />
                  Example: I want to study English consistently
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`rounded-[18px] p-3 text-[15px] leading-6 ${
                  message.role === 'user'
                    ? 'ml-8 bg-blue-500 text-white'
                    : 'mr-8 bg-[#f2f2f7] text-black'
                }`}
              >
                <p className='whitespace-pre-wrap'>{message.content}</p>
              </div>
            ))}

            {isLoading && (
              <div className='mr-8 rounded-[18px] bg-[#f2f2f7] p-3 text-[15px] text-gray-500'>
                Creating your plan...
              </div>
            )}
          </div>

          <div className='flex gap-2 border-t border-gray-100 p-3'>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;

                if (event.key === 'Enter') {
                  sendMessage();
                }
              }}
              placeholder='Type your goal'
              className='min-w-0 flex-1 rounded-[16px] bg-[#f2f2f7] px-4 py-3 text-[15px] outline-none placeholder:text-gray-500'
            />

            <button
              type='button'
              onClick={sendMessage}
              disabled={isLoading}
              className='flex h-12 w-12 items-center justify-center rounded-[16px] bg-blue-500 text-white disabled:opacity-50'
              aria-label='Send message'
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
