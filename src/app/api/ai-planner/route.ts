import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 },
      );
    }

    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: `
You are Weekboard AI, a practical planning coach.

The user may give a vague goal.
Help them turn it into:
- a clear goal
- realistic weekly goals
- concrete daily actions
- a tiny first step

Rules:
- Answer in English.
- Be specific and realistic.
- Do not be too long.
- Make the plan easy for beginners.
- Use Monday to Sunday format.
`,
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
  } catch {
    return NextResponse.json(
      { error: 'Failed to create AI plan.' },
      { status: 500 },
    );
  }
}
