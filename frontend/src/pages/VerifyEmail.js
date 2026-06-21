import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { CheckCircleIcon } from '../components/Icons';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const email = params.get('email');

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !email) { setStatus('error'); setMessage('유효하지 않은 인증 링크입니다.'); return; }
    api.verifyEmail(token, email).then(d => {
      if (d.success) { setStatus('success'); setMessage(d.message || '이메일 인증이 완료되었습니다.'); }
      else { setStatus('error'); setMessage(d.error || '인증에 실패했습니다.'); }
    });
  }, [token, email]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-muted)' }}>인증 처리 중...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <CheckCircleIcon size={56} color="#00c7ae" />
            </div>
            <h2 style={{ marginBottom: 8 }}>인증 완료!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>{message}</p>
            <Link to="/login" className="btn-primary w-full">로그인하기</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" style={{ display: 'block', margin: '0 auto' }}>
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h2 style={{ marginBottom: 8, color: '#ef4444' }}>인증 실패</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>{message}</p>
            {email && (
              <ResendButton email={email} />
            )}
            <Link to="/login" className="btn-outline w-full" style={{ marginTop: 12, display: 'block', textAlign: 'center' }}>
              로그인 페이지로
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function ResendButton({ email }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    await api.resendVerify(email);
    setLoading(false);
    setSent(true);
  };

  if (sent) return <p style={{ color: '#00c7ae', marginTop: 12, fontSize: '0.9rem' }}>인증 메일을 재발송했습니다. 받은 편지함을 확인해 주세요.</p>;
  return (
    <button className="btn-primary w-full" onClick={handleResend} disabled={loading} style={{ marginTop: 12 }}>
      {loading ? '발송 중...' : '인증 메일 다시 받기'}
    </button>
  );
}
