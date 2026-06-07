import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Phone, KeyRound, AlertTriangle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

export const Login: React.FC = () => {
  const { sendOtp, verifyOtp } = useAuth();
  const { showToast } = useToast();

  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otp = otpDigits.join('');
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const isPhoneValid = phone.trim().length === 10;
  const isStep1Disabled = loading || !isPhoneValid;
  const isOtpValid = otp.trim().length === 6;
  const isStep2Disabled = loading || !isOtpValid;

  const handleOtpDigitChange = (val: string, index: number) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto-focus next input if a digit was entered
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpDigitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else if (otpDigits[index]) {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
        e.preventDefault();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedData[i] || '';
      }
      setOtpDigits(newDigits);
      const focusIndex = Math.min(pastedData.length, 5);
      otpRefs.current[focusIndex]?.focus();
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Proactively fetch position on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {},
        { timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  const handleSendOtp = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const trimmedPhone = phone.trim();
    if (!trimmedPhone || trimmedPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      showToast('Phone number must be exactly 10 digits.', 'error');
      return;
    }
    setLoading(true); setError(null); setSuccessMsg(null);
    try {
      const res = await sendOtp(trimmedPhone);
      setSuccessMsg(res.message);
      showToast(res.message, 'success');
      setStep(2);
      setTimer(60);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to send verification code.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      showToast('Please enter a valid 6-digit code.', 'error');
      return;
    }
    setLoading(true); setError(null);
    
    const getPosition = (): Promise<GeolocationPosition | null> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
        } else {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { timeout: 2000, maximumAge: 60000 }
          );
        }
      });
    };

    try {
      let lat = coords?.latitude;
      let lng = coords?.longitude;

      if (!lat || !lng) {
        const position = await getPosition();
        if (position) {
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        }
      }

      await verifyOtp(phone, otp, lat, lng);
      showToast('Logged in successfully!', 'success');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Invalid or expired code.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    setLoading(true); setError(null); setSuccessMsg(null);
    try {
      const res = await sendOtp(phone);
      const sMsg = `Code resent! ${res.message}`;
      setSuccessMsg(sMsg);
      showToast(sMsg, 'success');
      setTimer(60);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to resend code.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setStep(1); setOtpDigits(['', '', '', '', '', '']); setError(null); setSuccessMsg(null);
  };

  return (
    <>
      {/* ── Full-screen fixed backdrop — can never cause document scroll ── */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: "url('/background-banner.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0,
      }} />

      {/* Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg,rgba(12,10,9,0.96) 0%,rgba(28,22,16,0.90) 50%,rgba(60,38,12,0.55) 100%)',
        zIndex: 1,
      }} />

      {/* ── Centered column, absolutely positioned to avoid any layout influence ── */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        fontFamily: "'Inter','Segoe UI',sans-serif",
        color: '#fff',
        gap: '18px',
      }}>

        {/* Taglines */}
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{
            color: 'rgba(255,255,255,0.88)',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            fontSize: '12.5px',
            fontStyle: 'italic',
            lineHeight: 1.5,
            margin: 0,
          }}>
            "Designing spaces that inspire and elevate the human experience."
          </p>
          <p style={{
            color: '#f59e0b',
            textShadow: '0 2px 6px rgba(0,0,0,0.5)',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            margin: '5px 0 0',
            textTransform: 'uppercase',
          }}>
            "Proudly Crafting India's Skyline."
          </p>
        </div>

        {/* ── LOGIN CARD ── */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(255,252,245,0.97)',
          borderRadius: '20px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5),0 4px 16px rgba(180,130,40,0.2)',
          border: '1px solid rgba(210,175,90,0.35)',
          overflow: 'hidden',
        }}>
          {/* Gold accent bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg,#b45309 0%,#f59e0b 50%,#d97706 100%)',
          }} />

          <div className="lc-inner">

            {/* Logo + Title */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
              <img
                src="/logo.jpeg"
                alt="Grihscape Logo"
                fetchPriority="high"
                decoding="async"
                style={{
                  width: '60px', height: '60px',
                  borderRadius: '12px', objectFit: 'cover',
                  boxShadow: '0 8px 24px rgba(180,130,40,0.28)',
                  border: '2px solid rgba(210,175,90,0.4)',
                }}
              />
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1c1009', margin: '0 0 4px', lineHeight: 1.1 }}>
                  Grihscape
                </h1>
                <p style={{ fontSize: '12.5px', color: '#78716c', margin: 0, lineHeight: 1.4 }}>
                  {step === 1 ? 'Verify your identity to log in' : 'Enter the verification code sent to your email'}
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fff1f2', border: '1px solid #fecaca',
                borderRadius: '10px', padding: '10px 13px',
                display: 'flex', alignItems: 'flex-start', gap: '9px',
                color: '#b91c1c', fontSize: '12px', lineHeight: 1.5,
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: '10px', padding: '10px 13px',
                display: 'flex', alignItems: 'flex-start', gap: '9px',
                color: '#15803d', fontSize: '12px', lineHeight: 1.5,
              }}>
                <CheckCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ── STEP 1 ── */}
            {step === 1 ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: '#a8956b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Phone Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={14} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#a8956b', pointerEvents: 'none' }} />
                    <input
                      type="text" maxLength={10}
                      placeholder="Enter your 10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      disabled={loading}
                      className="lc-input"
                      style={{ paddingLeft: '38px' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.15)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#e5dece'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: '#a8a09a' }}>Enter your 10-digit registered phone number</span>
                </div>

                <button type="submit" disabled={isStep1Disabled} className={`lc-btn${isStep1Disabled ? ' lc-btn-off' : ' lc-btn-on'}`}
                  onMouseEnter={(e) => { if (!isStep1Disabled) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(217,119,6,0.48)'; } }}
                  onMouseLeave={(e) => { if (!isStep1Disabled) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(217,119,6,0.38)'; } }}
                >
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : 'Request Verification Code'}
                </button>
              </form>
            ) : (
              /* ── STEP 2 ── */
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#a8956b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    <KeyRound size={12} /> One-Time Password (OTP)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '4px' }}>
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(e.target.value, i)}
                        onKeyDown={(e) => handleOtpDigitKeyDown(e, i)}
                        onPaste={handleOtpPaste}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        disabled={loading}
                        className="lc-otp-box"
                        style={{
                          width: '46px',
                          height: '46px',
                          textAlign: 'center',
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#1c1009',
                          background: '#faf8f5',
                          border: '1.5px solid #e5dece',
                          borderRadius: '10px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          fontFamily: 'inherit',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#d97706';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,119,6,0.18)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5dece';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a8a09a' }}>
                    <span>Expires in 5 mins</span>
                    {timer > 0 ? (
                      <span>Resend in {timer}s</span>
                    ) : (
                      <button type="button" onClick={handleResendOtp} disabled={loading}
                        style={{ color: '#d97706', fontWeight: 700, fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#b45309')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#d97706')}
                      >Resend Code</button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={handleGoBack} disabled={loading} title="Go back"
                    className="lc-back"
                    onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.color = '#d97706'; e.currentTarget.style.background = '#fffbf0'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5dece'; e.currentTarget.style.color = '#78716c'; e.currentTarget.style.background = '#faf8f5'; }}
                  >
                    <ArrowLeft size={17} />
                  </button>
                  <button type="submit" disabled={isStep2Disabled}
                    className={`lc-btn lc-btn-flex${isStep2Disabled ? ' lc-btn-off' : ' lc-btn-on'}`}
                    onMouseEnter={(e) => { if (!isStep2Disabled) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(217,119,6,0.48)'; } }}
                    onMouseLeave={(e) => { if (!isStep2Disabled) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(217,119,6,0.38)'; } }}
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Verify & Log In'}
                  </button>
                </div>
              </form>
            )}
          </div>{/* /lc-inner */}
        </div>{/* /card */}

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.18em', textTransform: 'uppercase', textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
            Grihscape
          </span>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: '3px 0 0', lineHeight: 1.5 }}>
            Annapurna Market, Palam Vihar Main Road, Gurgaon
          </p>
        </div>
      </div>

      <style>{`
        /* Card inner spacing */
        .lc-inner {
          padding: 26px 30px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* Text input */
        .lc-input {
          width: 100%;
          padding: 11px 14px;
          background: #faf8f5;
          border: 1.5px solid #e5dece;
          border-radius: 10px;
          font-size: 14px;
          color: #1c1009;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
          letter-spacing: 0.5px;
          font-family: inherit;
        }

        /* OTP Box style */
        .lc-otp-box {
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        /* Primary action button */
        .lc-btn {
          width: 100%;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.25s ease;
          font-family: inherit;
        }
        .lc-btn-flex {
          flex: 1;
          width: auto;
        }
        .lc-btn-on {
          background: linear-gradient(135deg,#d97706 0%,#f59e0b 55%,#b45309 100%);
          color: #fff;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(217,119,6,0.38);
        }
        .lc-btn-off {
          background: #e7e2d9;
          color: #b0a898;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Back icon button */
        .lc-back {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1.5px solid #e5dece;
          background: #faf8f5;
          color: #78716c;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
          font-family: inherit;
        }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .lc-inner {
            padding: 20px 18px 18px;
            gap: 14px;
          }
        }

        @media (max-height: 640px) {
          .lc-inner {
            padding: 16px 22px 14px;
            gap: 12px;
          }
        }
      `}</style>
    </>
  );
};
