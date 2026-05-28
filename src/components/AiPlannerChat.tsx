// AiPlannerChat.tsx // 7:12

'use client';

import { useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';

import { dictionaries } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/types';

type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AiPlannerChatProps = {
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  locale: Locale;
  onAddWeeklyGoal: (title: string) => void;
};

function extractWeeklyGoals(content: string, locale: Locale) {
  const sectionTitles: Record<Locale, string> = {
    en: 'This Week',
    ko: '이번 주',
    ja: '今週',
    zh: '本周',
    es: 'Esta semana',
    fr: 'Cette semaine',
    de: 'Diese Woche',
  };

  const nextSectionTitles = [
    'Tiny First Step',
    '아주 작은 첫걸음',
    '小さな第一歩',
    '第一小步',
    'Primer paso pequeño',
    'Premier petit pas',
    'Kleiner erster Schritt',
  ];

  const sectionTitle = sectionTitles[locale];
  const lines = content.split('\n');

  const startIndex = lines.findIndex((line) =>
    line.trim().includes(sectionTitle),
  );

  if (startIndex === -1) return [];

  const goals: string[] = [];

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (nextSectionTitles.some((title) => line.includes(title))) {
      break;
    }

    const cleaned = line
      .replace(/^[-•]\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .trim();

    if (!cleaned) continue;
    if (cleaned.length > 50) continue;
    if (cleaned.includes(':')) continue;

    goals.push(cleaned);
  }

  return [...new Set(goals)];
}

export function AiPlannerChat({
  isLoggedIn,
  onRequireLogin,
  locale,
  onAddWeeklyGoal,
}: AiPlannerChatProps) {
  const dict = dictionaries[locale];

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [addedGoals, setAddedGoals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage() {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

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
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? dict.ai.error);
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
          content: dict.ai.error,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAddWeeklyGoal(goal: string) {
    onAddWeeklyGoal(goal);

    setAddedGoals((prev) => {
      if (prev.includes(goal)) return prev;
      return [...prev, goal];
    });
  }

  return (
    <>
      <button
        type='button'
        onClick={() => {
          if (!isLoggedIn) {
            onRequireLogin();
            return;
          }

          setIsOpen(true);
        }}
        className='fixed bottom-5 right-5 z-[9998] flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 px-4 text-white shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition active:scale-95'
        aria-label={dict.accessibility.openAIPlanner}
      >
        <span className='text-[15px]' aria-hidden='true'>
          ✨
        </span>

        <span className='text-[15px] font-semibold tracking-[-0.02em]'>
          {dict.ai.title}
        </span>
      </button>

      {isOpen && (
        <div className='fixed bottom-24 right-5 z-[9999] flex h-[560px] w-[360px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]'>
          <div className='flex items-center justify-between border-b border-gray-100 p-4'>
            <div className='flex items-center gap-2'>
              ✨
              <div>
                <h2 className='text-[16px] font-semibold'>{dict.ai.title}</h2>
                <p className='text-[12px] text-gray-500'>{dict.ai.subtitle}</p>
              </div>
            </div>

            <button
              type='button'
              onClick={() => setIsOpen(false)}
              className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:bg-gray-100'
              aria-label={dict.accessibility.closeAIPlanner}
            >
              <X size={18} />
            </button>
          </div>

          <div className='flex-1 space-y-3 overflow-y-auto p-4'>
            {messages.length === 0 && (
              <div className='rounded-[18px] bg-[#f2f2f7] p-4'>
                <p className='text-[15px] leading-6 text-gray-600'>
                  {dict.ai.emptyMessage}
                  <br />
                  {dict.ai.studyExample}
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              const weeklyGoals =
                message.role === 'assistant'
                  ? extractWeeklyGoals(message.content, locale)
                  : [];

              return (
                <div
                  key={index}
                  className={`rounded-[18px] p-3 text-[15px] leading-6 ${
                    message.role === 'user'
                      ? 'ml-8 bg-blue-500 text-white'
                      : 'mr-8 bg-[#f2f2f7] text-black'
                  }`}
                >
                  <p className='whitespace-pre-wrap'>{message.content}</p>

                  {weeklyGoals.length > 0 && (
                    <div className='mt-3 space-y-2'>
                      {weeklyGoals.map((goal) => {
                        const isAdded = addedGoals.includes(goal);

                        return (
                          <button
                            key={goal}
                            type='button'
                            onClick={() => handleAddWeeklyGoal(goal)}
                            disabled={isAdded}
                            className='w-full rounded-[14px] bg-white px-3 py-2 text-left text-[13px] font-medium text-blue-600 shadow-sm disabled:text-gray-400 disabled:opacity-70 active:scale-[0.98]'
                          >
                            {isAdded
                              ? `✓ 추가됨 · ${goal}`
                              : `+ 주간 목표에 추가 · ${goal}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className='mr-8 rounded-[18px] bg-[#f2f2f7] p-3 text-[15px] text-gray-500'>
                {dict.ai.loading}
              </div>
            )}
          </div>

          <div className='flex gap-2 border-t border-gray-100 p-3'>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={() => {
                if (!isLoggedIn) {
                  onRequireLogin();
                }
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;

                if (event.key === 'Enter') {
                  sendMessage();
                }
              }}
              placeholder={dict.ai.placeholder}
              className='min-w-0 flex-1 rounded-[16px] bg-[#f2f2f7] px-4 py-3 text-[15px] outline-none placeholder:text-gray-500'
            />

            <button
              type='button'
              onClick={sendMessage}
              disabled={isLoading}
              className='flex h-12 w-12 items-center justify-center rounded-[16px] bg-blue-500 text-white disabled:opacity-50'
              aria-label={dict.accessibility.sendMessage}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
