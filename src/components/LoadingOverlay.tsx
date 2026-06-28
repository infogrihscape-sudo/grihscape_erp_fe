import React, { useEffect, useState } from 'react';

export const LoadingOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const onStart = () => {
      clearTimeout(hideTimer);
      // Small delay so instant responses don't flash the overlay
      showTimer = setTimeout(() => {
        setRendered(true);
        requestAnimationFrame(() => setVisible(true));
      }, 120);
    };

    const onStop = () => {
      clearTimeout(showTimer);
      setVisible(false);
      // Keep rendered long enough for the fade-out to finish
      hideTimer = setTimeout(() => setRendered(false), 350);
    };

    const handler = (e: Event) => {
      const active = (e as CustomEvent<{ active: boolean }>).detail.active;
      if (active) onStart(); else onStop();
    };

    window.addEventListener('api-loading', handler);
    return () => {
      window.removeEventListener('api-loading', handler);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!rendered) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(12, 10, 9, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
        pointerEvents: visible ? 'all' : 'none',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: visible ? 'scale(1)' : 'scale(0.92)',
        transition: 'transform 0.25s ease',
      }}>
        {/* Pulsing logo with gold border */}
        <div style={{ animation: 'logo-pulse 1.4s ease-in-out infinite' }}>
          <img
            src="/logo.jpeg"
            alt="Loading..."
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              objectFit: 'cover',
              border: '2px solid #c5a880',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              display: 'block',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes logo-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
};
