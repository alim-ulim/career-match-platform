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

const emptyCareer = () => ({
  companyName: '', department: '', position: '',
  startYear: '', startMonth: '', endYear: '', endMonth: '',
  isCurrent: false, responsibilities: '', keyAchievements: '',
});

const YEARS = Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);


export function Register() {
  const [form, setForm] = useState({
    email: '', password: '', passwordConfirm: '',
    name: '', role: 'seeker', field: '', description: '',
    phone: '', companyName: '', yearsOfExperience: '', currentCompany: '',
    currentTitle: '', gender: 'other',
    consultationExpertise: '', consultationStyle: '',
  });
  const [careerItems, setCareerItems] = useState([emptyCareer()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const setCareer = (idx, k, val) =>
    setCareerItems(items => items.map((it, i) => i === idx ? { ...it, [k]: val } : it));
  const addCareer = () => setCareerItems(items => [...items, emptyCareer()]);
  const removeCareer = (idx) => setCareerItems(items => items.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (form.password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    setError('');
    setLoading(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (k !== 'passwordConfirm') fd.append(k, v); });
    fd.append('careerItems', JSON.stringify(careerItems));

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
                      label: '이용자',
                      desc: '울림지기의 컨설팅과 리포트를 받고 싶은 취업·이직·전직 준비자'
                    },
                    {
                      value: 'expert',
                      label: '울림지기',
                      desc: '전현직 각 분야 전문가 — 1:1 컨설팅 및 커리어 리포트 작성'
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
                <strong>📝 울림지기 경력 등록</strong>
                <p>이용자가 상담 신청 전 확인하는 핵심 정보입니다. 회사·직책·담당업무를 구체적으로 입력해 주세요.</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>현재 직책</label>
                  <input className="form-input" placeholder="예: 경영기획팀장" value={form.currentTitle} onChange={set('currentTitle')} />
                </div>
                <div className="form-group">
                  <label>총 경력 연차</label>
                  <input className="form-input" type="number" min="0" placeholder="10" value={form.yearsOfExperience} onChange={set('yearsOfExperience')} />
                </div>
              </div>

              {/* 경력 반복 입력 */}
              <div className="form-group">
                <label>경력 이력 * <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(최소 1건)</span></label>
                {careerItems.map((item, idx) => (
                  <div key={idx} className="career-item-block">
                    <div className="career-item-header">
                      <span className="career-item-num">경력 {idx + 1}</span>
                      {careerItems.length > 1 && (
                        <button type="button" className="career-remove-btn" onClick={() => removeCareer(idx)}>삭제</button>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>회사명 *</label>
                        <input className="form-input" placeholder="(주)회사명" value={item.companyName}
                          onChange={e => setCareer(idx, 'companyName', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>부서</label>
                        <input className="form-input" placeholder="경영기획팀" value={item.department}
                          onChange={e => setCareer(idx, 'department', e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>직책 *</label>
                      <input className="form-input" placeholder="팀장, 본부장, 선임 등" value={item.position}
                        onChange={e => setCareer(idx, 'position', e.target.value)} />
                    </div>
                    <div className="career-date-row">
                      <div className="career-date-group">
                        <label>입사</label>
                        <div style={{display:'flex',gap:6}}>
                          <select className="form-input" value={item.startYear} onChange={e => setCareer(idx, 'startYear', e.target.value)} style={{flex:2}}>
                            <option value="">년도</option>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <select className="form-input" value={item.startMonth} onChange={e => setCareer(idx, 'startMonth', e.target.value)} style={{flex:1}}>
                            <option value="">월</option>
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="career-date-sep">—</div>
                      <div className="career-date-group">
                        <label>퇴사</label>
                        {item.isCurrent ? (
                          <div className="form-input" style={{color:'var(--primary)',fontWeight:700,background:'var(--primary-light)'}}>재직중</div>
                        ) : (
                          <div style={{display:'flex',gap:6}}>
                            <select className="form-input" value={item.endYear} onChange={e => setCareer(idx, 'endYear', e.target.value)} style={{flex:2}}>
                              <option value="">년도</option>
                              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select className="form-input" value={item.endMonth} onChange={e => setCareer(idx, 'endMonth', e.target.value)} style={{flex:1}}>
                              <option value="">월</option>
                              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                    <label className="checkbox-label mt-8">
                      <input type="checkbox" checked={item.isCurrent}
                        onChange={e => setCareer(idx, 'isCurrent', e.target.checked)} />
                      현재 재직중
                    </label>
                    <div className="form-group" style={{marginTop:10}}>
                      <label>주요 담당 업무 *</label>
                      <textarea className="form-input form-textarea"
                        placeholder="예: 연간 예산 편성 및 정부과제 기획/운영 총괄, 팀 리빌딩 주도"
                        value={item.responsibilities}
                        onChange={e => setCareer(idx, 'responsibilities', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>주요 성과 (선택)</label>
                      <textarea className="form-input form-textarea"
                        placeholder="예: 비용 15% 절감, 정부지원사업 3건 선정, MAU 30만 달성"
                        value={item.keyAchievements}
                        onChange={e => setCareer(idx, 'keyAchievements', e.target.value)} />
                    </div>
                  </div>
                ))}
                <button type="button" className="career-add-btn" onClick={addCareer}>
                  + 경력 추가
                </button>
              </div>

              <div className="form-group">
                <label>컨설팅 가능 분야</label>
                <textarea className="form-input form-textarea"
                  placeholder={"- 마케팅/기획 직군 취업·이직 전략\n- 대기업 → 스타트업 커리어 전환 상담\n- 팀장·임원급으로의 승진 로드맵"}
                  value={form.consultationExpertise} onChange={set('consultationExpertise')} />
              </div>
              <div className="form-group">
                <label>컨설팅 스타일</label>
                <textarea className="form-input form-textarea"
                  placeholder="어떤 방식으로 상담하는지 작성해 주세요. 예: 구체적 액션플랜 중심, 심리적 방향성 탐색 중심"
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
