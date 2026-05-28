// route.ts

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { Locale } from '@/i18n/types';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AiLocaleConfig = {
  language: string;
  sections: {
    thisWeek: string;
    closing: string;
  };
};

const AI_LOCALE: Record<Locale, AiLocaleConfig> = {
  en: {
    language: 'English',
    sections: {
      thisWeek: 'Recommended weekly goals you can start right away.',
      closing: 'Adjust these goals slowly as you try them.',
    },
  },
  ko: {
    language: 'Korean',
    sections: {
      thisWeek: '당장 실행 가능한 이번 주 목표를 추천해드립니다.',
      closing: '실행하면서 나에게 맞는 목표로 천천히 조정해보세요.',
    },
  },
  ja: {
    language: 'Japanese',
    sections: {
      thisWeek: 'すぐに実行できる今週の目標をおすすめします。',
      closing: '実行しながら、自分に合う目標へ少しずつ調整してみてください。',
    },
  },
  zh: {
    language: 'Chinese',
    sections: {
      thisWeek: '为你推荐本周可以立即开始的目标。',
      closing: '在执行过程中，慢慢调整成适合自己的目标。',
    },
  },
  es: {
    language: 'Spanish',
    sections: {
      thisWeek:
        'Te recomiendo objetivos para esta semana que puedes empezar de inmediato.',
      closing:
        'Ajusta estos objetivos poco a poco mientras los pones en práctica.',
    },
  },
  fr: {
    language: 'French',
    sections: {
      thisWeek:
        'Voici des objectifs pour cette semaine que vous pouvez commencer tout de suite.',
      closing:
        'Ajustez progressivement ces objectifs selon ce qui vous convient.',
    },
  },
  de: {
    language: 'German',
    sections: {
      thisWeek: 'Hier sind Wochenziele, mit denen du sofort beginnen kannst.',
      closing: 'Passe diese Ziele beim Ausprobieren langsam an dich an.',
    },
  },
};

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in AI_LOCALE;
}

function getAiPrompt(locale: Locale) {
  const t = AI_LOCALE[locale];

  return `
You are Weekboard AI.

Your job is to turn a vague goal into practical weekly goal candidates.

The user will write vague goals like:
"I want to get better at English."
"I want to become healthier."
"I want to be more productive."
"I want to clean my room."
"I want to study consistently."

Your job is NOT to explain the goal.
Your job is NOT to explain why the goal matters.
Your job is NOT to make a full schedule.
Your job is NOT to decide frequency, quantity, time, or days.

Instead, recommend concrete actions the user can add directly as weekly goals.

Example:

User:
I want to get better at English.

Good response:
${t.sections.thisWeek}

- English vocabulary practice
- English grammar study
- Reading English articles or texts
- English listening practice
- Writing an English diary
- Repeating English sentences out loud
- Practicing English conversation patterns

${t.sections.closing}

Bad recommendations:
- Study English 3 times a week
- Memorize 300 English words
- Study English every morning
- Become fluent in English
- Improve English
- Get better at English

Always answer in ${t.language}.

Response format:
${t.sections.thisWeek}

- Recommend 5 to 8 concrete weekly goal candidates.
- Each item must be a practical action the user can add directly to weekly goals.
- Do NOT include frequency.
- Do NOT include quantity.
- Do NOT include weekdays.
- Do NOT include schedules.
- Do NOT include time duration.
- Do NOT make daily plans.
- Do NOT use abstract outcome goals.
- Each item should be short and actionable.

${t.sections.closing}

Rules:
- Do not include "Goal" section.
- Do not include "Why this matters" section.
- Do not include "Tiny First Step" section.
- Keep the answer concise.
- Use simple language.
- Recommend actions, not outcomes.
- The recommended list should work well with an "Add to weekly goals" button.
- Do not mention the button in your answer.
- Prefer short bullet points.
`;
}

export async function POST(request: Request) {
  try {
    const { message, locale = 'en' } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 },
      );
    }

    const safeLocale: Locale = isLocale(locale) ? locale : 'en';

    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: getAiPrompt(safeLocale),
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    return NextResponse.json({
      reply: response.output_text,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Failed to create AI plan.' },
      { status: 500 },
    );
  }
}
