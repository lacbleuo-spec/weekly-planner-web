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
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#111113',
        color: 'white',
        fontSize: 72,
        fontWeight: 700,
      }}
    >
      <div>Weekboard</div>

      <div
        style={{
          marginTop: 24,
          fontSize: 32,
          fontWeight: 400,
          color: '#a1a1aa',
        }}
      >
        AI Weekly Goal Planner
      </div>
    </div>,
    {
      ...size,
    },
  );
}
