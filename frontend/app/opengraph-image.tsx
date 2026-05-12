import { ImageResponse } from 'next/og';

export const alt = 'XHRIS Host — Hébergement Bot WhatsApp & Serveurs Cloud';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0F',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Purple glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 700,
            height: 400,
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            background: '#7c3aed',
            borderRadius: 18,
            marginBottom: 28,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 64, fontWeight: 800, color: '#ffffff' }}>XHRIS</span>
          <span style={{ fontSize: 64, fontWeight: 800, color: '#a78bfa' }}>HOST</span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 26,
            color: '#9ca3af',
            textAlign: 'center',
            maxWidth: 700,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Hébergement Bot WhatsApp &amp; Serveurs Cloud
        </p>

        {/* Tags */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 36,
          }}
        >
          {['🤖 Bots WhatsApp', '☁️ Cloud Servers', '🪙 10 Coins offerts'].map((tag) => (
            <div
              key={tag}
              style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.35)',
                borderRadius: 40,
                padding: '8px 20px',
                fontSize: 18,
                color: '#c4b5fd',
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* URL */}
        <p style={{ position: 'absolute', bottom: 30, fontSize: 18, color: '#4b5563', margin: 0 }}>
          xhris.host
        </p>
      </div>
    ),
    { ...size },
  );
}
