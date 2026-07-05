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
          <img src="/alim-ulim.jpg" alt="울림 로고" onError={e => e.target.style.display = 'none'} />
          <h1>울림</h1>
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
    gender: 'other',
    careerHistory: '', achievements: '', consultationExpertise: '', consultationStyle: '',
  });
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

  const goStep3 = () => { setError(''); setStep(3); };

  if (done) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo" style={{ justifyContent: 'center' }}>
          <img src="/alim-ulim.jpg" alt="울림 로고" onError={e => e.target.style.display = 'none'} />
          <h1>울림</h1>
        </div>
        <div style={{ margin: '24px 0 16px' }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#00c7ae" strokeWidth="1.8" style={{ display: 'block', margin: '0 auto' }}>
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
          </svg>
        </div>
        <h2 style={{ marginBottom: 8 }}>가입 완료!</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
          <strong>{form.name}</strong>님, 울림에 오신 것을 환영합니다.<br />
          지금 바로 로그인하여 서비스를 이용해 보세요.
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
          <img src="/alim-ulim.jpg" alt="울림 로고" onError={e => e.target.style.display = 'none'} />
          <h1>울림</h1>
        </div>
        <h2 className="auth-title">회원가입</h2>

        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className="step-line" />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
          {form.role === 'expert' && (
            <>
              <div className="step-line" />
              <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
            </>
          )}
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
                <label>성별</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[['male', '남성'], ['female', '여성'], ['other', '선택 안 함']].map(([v, l]) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input type="radio" name="gender" value={v} checked={form.gender === v} onChange={set('gender')} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>회원 유형 *</label>
                <div className="role-selector">
                  {[
                    {
                      value: 'seeker',
                      label: '시커 (Seeker)',
                      desc: '울림지기의 컨설팅과 리포트를 받고 싶은 취업·이직·전직 준비자'
                    },
                    {
                      value: 'expert',
                      label: '울림지기',
                      desc: '전현직 각 분야 전문가 — 시커 1:1 컨설팅 및 커리어 리포트 작성'
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
              {error && <p className="form-error">{error}</p>}
              <div className="row-gap mt-16">
                <button type="button" className="btn-outline flex-1" onClick={() => setStep(1)}>← 이전</button>
                {form.role === 'expert' ? (
                  <button type="button" className="btn-primary flex-2" onClick={goStep3}>다음 →</button>
                ) : (
                  <button type="submit" className="btn-primary flex-2" disabled={loading}>
                    {loading ? '가입 중...' : '가입 완료'}
                  </button>
                )}
              </div>
            </>
          )}

          {step === 3 && form.role === 'expert' && (
            <>
              <div className="guide-profile-notice">
                <strong>📝 울림지기 프로필 작성 안내</strong>
                <p>시커가 울림지기를 선택할 때 가장 중요하게 보는 정보입니다. 구체적이고 솔직하게 작성할수록 신뢰도가 높아집니다.</p>
              </div>

              <div className="form-group">
                <label>경력 이력 *</label>
                <div className="form-hint">
                  재직 기간, 기업명, 직책/역할을 시간 역순으로 작성해 주세요.<br />
                  예) 2018~현재 | (주)카카오 | 서비스기획팀 팀장<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2014~2018 | (주)네이버 | UX기획 선임
                </div>
                <textarea className="form-input form-textarea form-textarea-lg"
                  placeholder={"2020~현재 | (주)OO기업 | 마케팅본부 이사\n2015~2020 | (주)XX회사 | 브랜드마케팅팀 팀장\n2010~2015 | △△에이전시 | 기획팀 대리"}
                  value={form.careerHistory} onChange={set('careerHistory')} />
              </div>

              <div className="form-group">
                <label>주요 성과 / 대표 프로젝트</label>
                <div className="form-hint">
                  숫자·결과 중심으로 작성하면 러너에게 더 큰 신뢰를 줍니다.<br />
                  예) 신규 서비스 출시로 MAU 30만 달성 / 팀 리빌딩 후 이직률 50% 감소
                </div>
                <textarea className="form-input form-textarea"
                  placeholder={"- 브랜드 리뉴얼 프로젝트 총괄, 인지도 40% 향상\n- 신사업 기획 및 투자 유치 20억 달성\n- 조직 문화 개선으로 우수인재 이탈률 감소"}
                  value={form.achievements} onChange={set('achievements')} />
              </div>

              <div className="form-group">
                <label>컨설팅 가능 분야 *</label>
                <div className="form-hint">
                  어떤 커리어 고민을 가진 시커에게 도움을 줄 수 있는지 구체적으로 작성해 주세요.
                </div>
                <textarea className="form-input form-textarea"
                  placeholder={"- 마케팅/기획 직군 취업·이직 전략\n- 대기업 → 스타트업 커리어 전환 상담\n- 팀장·임원급으로의 승진 로드맵\n- 포트폴리오 및 자기소개서 방향성"}
                  value={form.consultationExpertise} onChange={set('consultationExpertise')} />
              </div>

              <div className="form-group">
                <label>컨설팅 스타일</label>
                <div className="form-hint">
                  러너가 어떤 방식으로 컨설팅이 진행될지 미리 알 수 있도록 작성해 주세요.
                </div>
                <textarea className="form-input form-textarea"
                  placeholder={"러너의 이야기를 충분히 듣고 현실적인 대안을 제시합니다. 거창한 이론보다 제가 직접 경험한 사례와 실무 노하우를 중심으로 솔직하게 조언드립니다."}
                  value={form.consultationStyle} onChange={set('consultationStyle')} />
              </div>

              {error && <p className="form-error">{error}</p>}
              <div className="row-gap mt-16">
                <button type="button" className="btn-outline flex-1" onClick={() => setStep(2)}>← 이전</button>
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
