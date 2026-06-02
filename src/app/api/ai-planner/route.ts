import { adminAuth } from '@/lib/firebaseAdmin';
import type { Locale } from '@/i18n/types';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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

const SAFE_BLOCK_MESSAGE: Record<Locale, string> = {
  en: 'Sorry, I can only suggest weekly goals suitable for all ages.',
  ko: '죄송하지만 전 연령에 적합한 주간 목표만 추천할 수 있어요.',
  ja: '申し訳ありませんが、全年齢向けの週間目標のみ提案できます。',
  zh: '抱歉，我只能建议适合全年龄段的每周目标。',
  es: 'Lo siento, solo puedo sugerir objetivos semanales adecuados para todas las edades.',
  fr: 'Désolé, je ne peux proposer que des objectifs hebdomadaires adaptés à tous les âges.',
  de: 'Entschuldigung, ich kann nur Wochenziele vorschlagen, die für alle Altersgruppen geeignet sind.',
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

async function isUnsafeText(text: string) {
  const moderation = await openai.moderations.create({
    model: 'omni-moderation-latest',
    input: text,
  });

  return moderation.results.some((result) => result.flagged);
}

function getAiPrompt(locale: Locale) {
  const t = AI_LOCALE[locale];
  const safeMessage = SAFE_BLOCK_MESSAGE[locale];

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

Safety rules:
- This app must be safe for students and appropriate for a 4+ age rating.
- Never generate adult, sexual, erotic, dating, romantic intimacy-related, violent, hateful, harassing, illegal, dangerous, gambling, drug, alcohol, smoking, weapon, self-harm, suicide, or eating disorder-related goals.
- Never provide medical, legal, financial, or psychological advice.
- If the user's request is unsafe or inappropriate for minors, do not provide goal candidates.
- If the user's request is unsafe or inappropriate for minors, respond exactly with:
"${safeMessage}"
- Do not mention policy, guidelines, age rating, App Review, or safety rules.

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
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '').trim();

    try {
      await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { message, locale = 'en' } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 },
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message is too long.' },
        { status: 400 },
      );
    }

    const safeLocale: Locale = isLocale(locale) ? locale : 'en';
    const safeMessage = SAFE_BLOCK_MESSAGE[safeLocale];

    const isInputUnsafe = await isUnsafeText(message);

    if (isInputUnsafe) {
      return NextResponse.json({
        reply: safeMessage,
      });
    }

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

    const reply = response.output_text || safeMessage;

    const isOutputUnsafe = await isUnsafeText(reply);

    if (isOutputUnsafe) {
      return NextResponse.json({
        reply: safeMessage,
      });
    }

    return NextResponse.json({
      reply,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Failed to create AI plan.' },
      { status: 500 },
    );
  }
}
