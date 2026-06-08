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
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
        pointerEvents: visible ? 'all' : 'none',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        transform: visible ? 'scale(1)' : 'scale(0.92)',
        transition: 'transform 0.25s ease',
      }}>
        {/* Spinner ring */}
        <div style={{ position: 'relative', width: 48, height: 48 }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid rgba(197,168,128,0.18)',
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#c5a880',
            borderRightColor: '#b89047',
            animation: 'gs-spin 0.75s linear infinite',
          }} />
          <img
            src="/logo.jpeg"
            alt=""
            style={{
              position: 'absolute',
              inset: 8,
              width: 32,
              height: 32,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1.5px solid rgba(197,168,128,0.4)',
            }}
          />
        </div>

        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.75)',
          fontFamily: "'Inter','Segoe UI',sans-serif",
        }}>
          Loading…
        </span>
      </div>

      <style>{`
        @keyframes gs-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
