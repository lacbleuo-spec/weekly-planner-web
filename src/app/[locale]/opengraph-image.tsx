import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#ffffff',
        color: '#111111',
        padding: '90px',
        flexDirection: 'column',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: '-3px',
          marginBottom: 40,
        }}
      >
        Weekboard
      </div>

      <div
        style={{
          fontSize: 36,
          lineHeight: 1.45,
          maxWidth: 920,
        }}
      >
        Weekboard is an AI-powered weekly planner that turns vague goals into
        realistic weekly plans. Organize goals into daily tasks, create
        recurring routines, and stay consistent with reminders, locks, and
        achievement tracking.
      </div>
    </div>,
    {
      ...size,
    },
  );
}
