import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f2f2f7',
        padding: '48px',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 40,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '96px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-3px',
            lineHeight: 1,
          }}
        >
          Weekboard
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 34,
            lineHeight: 1.45,
            color: '#4b5563',
            maxWidth: 860,
          }}
        >
          Weekboard is an AI-powered weekly planner that turns vague goals into
          realistic weekly plans. Organize goals into daily tasks, create
          recurring routines, and stay consistent with reminders, locks, and
          achievement tracking.
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
