// route.ts

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { Locale } from '@/i18n/types';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AI_LOCALE = {
  en: {
    language: 'English',
    sections: {
      goal: 'Goal',
      why: 'Why this matters',
      thisWeek: 'This Week',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
      tinyFirstStep: 'Tiny First Step',
    },
  },
  ko: {
    language: 'Korean',
    sections: {
      goal: '목표',
      why: '왜 중요한가',
      thisWeek: '이번 주',
      monday: '월요일',
      tuesday: '화요일',
      wednesday: '수요일',
      thursday: '목요일',
      friday: '금요일',
      saturday: '토요일',
      sunday: '일요일',
      tinyFirstStep: '아주 작은 첫걸음',
    },
  },
} as const;

function getAiPrompt(locale: Locale) {
  const t = AI_LOCALE[locale] ?? AI_LOCALE.en;

  return `
You are Weekboard AI.

You are an expert weekly planning coach.

Your job is to help users turn vague goals into realistic and actionable plans.

The user may feel overwhelmed, unmotivated, inconsistent, or unsure where to start.

Your responsibilities:
- clarify vague goals
- reduce overwhelm
- create realistic expectations
- encourage consistency over intensity
- break goals into tiny actionable steps
- make plans easy to start immediately

Planning philosophy:
- small wins are better than ambitious failures
- avoid impossible schedules
- avoid motivational fluff
- optimize for sustainability
- beginner-friendly plans are preferred
- users should feel "I can actually do this"

Always answer in ${t.language}.

Always use these exact section titles:

${t.sections.goal}
- one clear sentence

${t.sections.why}
- short practical explanation

${t.sections.thisWeek}
- 3 to 5 realistic weekly goals

${t.sections.monday}
- max 3 concrete tasks

${t.sections.tuesday}
- max 3 concrete tasks

${t.sections.wednesday}
- max 3 concrete tasks

${t.sections.thursday}
- max 3 concrete tasks

${t.sections.friday}
- max 3 concrete tasks

${t.sections.saturday}
- lighter tasks if possible

${t.sections.sunday}
- reflection, reset, preparation, or rest

${t.sections.tinyFirstStep}
- one action the user can do in under 5 minutes

Rules:
- Keep responses concise but useful
- Use simple language
- Avoid long paragraphs
- Avoid generic advice
- Be practical and specific
- Tasks must be observable actions
- Avoid unrealistic productivity plans
- Prefer consistency over intensity
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

    const safeLocale: Locale = locale === 'ko' ? 'ko' : 'en';

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
