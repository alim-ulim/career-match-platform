import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerify(false);
    setLoading(true);
    const data = await login(form.email, form.password);
    setLoading(false);
    if (data.success) navigate('/');
    else if (data.needsVerification) {
      setNeedsVerify(true);
      setError(data.error);
    } else {
      setError(data.error || '로그인에 실패했습니다.');
    }
  };

  const handleResend = async () => {
    const { api: apiInst } = await import('../api');
    await apiInst.resendVerify(form.email);
    setResendSent(true);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/alim-ulim.jpg" alt="ProPath logo" onError={e => e.target.style.display = 'none'} />
          <h1>ProPath</h1>
        </div>
        <h2 className="auth-title">로그인</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이메일</label>
            <input className="form-input" type="email" placeholder="example@email.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label>비밀번호</label>
            <input className="form-input" type="password" placeholder="비밀번호 입력" value={form.password} onChange={set('password')} required />
          </div>
          {error && <p className="form-error">{error}</p>}
          {needsVerify && (
            <div className="verify-notice">
              <p>받은 편지함에서 인증 메일을 확인해 주세요.</p>
              {!resendSent
                ? <button type="button" className="resend-btn" onClick={handleResend}>인증 메일 다시 받기</button>
                : <p className="resend-ok">인증 메일을 재발송했습니다.</p>
              }
            </div>
          )}
          <button className="btn-primary w-full mt-16" type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <p className="auth-switch">
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  );
}

export function Register() {
  const [form, setForm] = useState({
    email: '', password: '', passwordConfirm: '',
    name: '', role: 'seeker', field: '', description: '',
    phone: '', companyName: '', yearsOfExperience: '', currentCompany: '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (form.password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    setError('');
    setLoading(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (k !== 'passwordConfirm') fd.append(k, v); });
    if (file) fd.append('profileImage', file);

    const data = await api.register(fd);
    setLoading(false);
    if (data.success) setDone(true);
    else setError(data.error || '회원가입에 실패했습니다.');
  };

  const goStep2 = () => {
    if (!form.email || !form.name || !form.password || !form.passwordConfirm) {
      setError('필수 항목을 모두 입력해주세요.'); return;
    }
    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.'); return;
    }
    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.'); return;
    }
    setError(''); setStep(2);
  };

  if (done) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo" style={{ justifyContent: 'center' }}>
          <img src="/alim-ulim.jpg" alt="ProPath logo" onError={e => e.target.style.display = 'none'} />
          <h1>ProPath</h1>
        </div>
        <div style={{ margin: '24px 0 16px' }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#00c7ae" strokeWidth="1.8" style={{ display: 'block', margin: '0 auto' }}>
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
          </svg>
        </div>
        <h2 style={{ marginBottom: 8 }}>가입 신청 완료!</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 8 }}>
          <strong>{form.email}</strong>으로<br />
          이메일 인증 링크를 발송했습니다.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
          받은 편지함을 확인하여 인증을 완료하면<br />
          ProPath 서비스를 이용할 수 있습니다.
        </p>
        <p style={{ fontSize: '0.8rem', color: '#bbb', marginBottom: 16 }}>
          메일이 오지 않으면 스팸 폴더를 확인해 주세요.
        </p>
        <Link to="/login" className="btn-outline w-full" style={{ display: 'block', textAlign: 'center' }}>
          로그인 페이지로
        </Link>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <img src="/alim-ulim.jpg" alt="ProPath logo" onError={e => e.target.style.display = 'none'} />
          <h1>ProPath</h1>
        </div>
        <h2 className="auth-title">회원가입</h2>

        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className="step-line" />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>이메일 *</label>
                  <input className="form-input" type="email" placeholder="example@email.com" value={form.email} onChange={set('email')} required />
                </div>
                <div className="form-group">
                  <label>이름 *</label>
                  <input className="form-input" placeholder="홍길동" value={form.name} onChange={set('name')} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>비밀번호 * (6자 이상)</label>
                  <input className="form-input" type="password" value={form.password} onChange={set('password')} required />
                </div>
                <div className="form-group">
                  <label>비밀번호 확인 *</label>
                  <input className="form-input" type="password" value={form.passwordConfirm} onChange={set('passwordConfirm')} required />
                </div>
              </div>
              <div className="form-group">
                <label>회원 유형 *</label>
                <div className="role-selector">
                  {[
                    {
                      value: 'seeker',
                      label: '커리어 러너 (Career Runner)',
                      desc: '커리어 컨설팅과 리포트를 받고 싶은 취업·이직 준비생'
                    },
                    {
                      value: 'expert',
                      label: '커리어 가이드 (Career Guide)',
                      desc: '10년 이상 경력의 현직자 — 커리어 러너 멘토링 및 리포트 작성'
                    },
                    {
                      value: 'company',
                      label: '파트너 기업 (Company)',
                      desc: '커리어 리포트로 검증된 인재를 추천받는 채용 기업'
                    },
                  ].map(r => (
                    <label key={r.value} className={`role-option ${form.role === r.value ? 'selected' : ''}`}>
                      <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={set('role')} />
                      <strong>{r.label}</strong>
                      <span>{r.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="button" className="btn-primary w-full mt-16" onClick={goStep2}>
                다음 →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {form.role === 'company' && (
                <div className="form-group">
                  <label>기업명 *</label>
                  <input className="form-input" placeholder="(주)프로패스" value={form.companyName} onChange={set('companyName')} />
                </div>
              )}
              {form.role === 'expert' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>총 경력 연차</label>
                    <input className="form-input" type="number" min="0" placeholder="10" value={form.yearsOfExperience} onChange={set('yearsOfExperience')} />
                  </div>
                  <div className="form-group">
                    <label>현재 재직 기업</label>
                    <input className="form-input" placeholder="(주)회사명" value={form.currentCompany} onChange={set('currentCompany')} />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>분야 / 직무</label>
                <input className="form-input" placeholder="예: IT 서비스 기획, 반도체 설계, 마케팅..." value={form.field} onChange={set('field')} />
              </div>
              <div className="form-group">
                <label>연락처</label>
                <input className="form-input" placeholder="010-0000-0000" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="form-group">
                <label>한줄 소개</label>
                <textarea className="form-input form-textarea" placeholder="자신의 전문성과 경험을 간략히 소개해 주세요." value={form.description} onChange={set('description')} />
              </div>
              <div className="form-group">
                <label>프로필 사진 (선택)</label>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="row-gap mt-16">
                <button type="button" className="btn-outline flex-1" onClick={() => setStep(1)}>← 이전</button>
                <button type="submit" className="btn-primary flex-2" disabled={loading}>
                  {loading ? '가입 중...' : '가입 완료'}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="auth-switch">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}
