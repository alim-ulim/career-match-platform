import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { api } from '../api';
import Toast from '../components/Toast';
import { AvatarFallback, BuildingIcon, MailIcon, PhoneIcon, DocumentIcon, CheckCircleIcon, ClockIcon } from '../components/Icons';

// ── 사전 인터뷰 폼 (러너) ─────────────────────────────
function PreInterviewForm({ consultationId, onSubmit }) {
  const [form, setForm] = useState({ currentSituation: '', concerns: '', goals: '', specificQuestions: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSubmit = async e => {
    e.preventDefault();
    await onSubmit(consultationId, form);
  };
  return (
    <form className="flow-form" onSubmit={handleSubmit}>
      <div className="flow-form-title">📋 사전 인터뷰 작성</div>
      <p className="flow-form-desc">가이드가 컨설팅을 준비할 수 있도록 아래 내용을 작성해 주세요.</p>
      <div className="form-group">
        <label>현재 커리어 상황 *</label>
        <div className="form-hint">현재 재직 중인지, 이직 준비 중인지, 학생인지 등 현황을 알려주세요.</div>
        <textarea className="form-input form-textarea" placeholder="예) 현재 3년차 마케터로 재직 중이며, 보다 전략적인 역할로 이직을 준비하고 있습니다." value={form.currentSituation} onChange={set('currentSituation')} required />
      </div>
      <div className="form-group">
        <label>커리어 고민 *</label>
        <div className="form-hint">지금 가장 힘들거나 막막한 부분이 무엇인지 솔직하게 작성해 주세요.</div>
        <textarea className="form-input form-textarea" placeholder="예) 이직을 원하지만 어떤 방향으로 가야 할지 모르겠고, 포트폴리오를 어떻게 구성해야 할지 막막합니다." value={form.concerns} onChange={set('concerns')} required />
      </div>
      <div className="form-group">
        <label>희망 커리어 목표 *</label>
        <div className="form-hint">3~5년 후 어떤 모습이 되고 싶은지, 단기 목표와 장기 목표를 함께 작성해 주세요.</div>
        <textarea className="form-input form-textarea" placeholder="예) 단기: 1년 내 대기업 마케팅 전략팀으로 이직 / 장기: 5년 후 CMO 또는 마케팅 컨설턴트로 성장" value={form.goals} onChange={set('goals')} required />
      </div>
      <div className="form-group">
        <label>가이드에게 구체적으로 묻고 싶은 것</label>
        <div className="form-hint">컨설팅에서 꼭 다뤄주었으면 하는 질문이나 주제를 자유롭게 적어주세요.</div>
        <textarea className="form-input form-textarea" placeholder="예) 저의 현재 이력서에서 가장 보완이 필요한 부분은 무엇인가요? 대기업과 스타트업 중 어디가 제 성향에 더 맞을까요?" value={form.specificQuestions} onChange={set('specificQuestions')} />
      </div>
      <button type="submit" className="btn-primary w-full mt-16">사전 인터뷰 제출하기</button>
    </form>
  );
}

// ── 일정 설정 폼 (가이드) ─────────────────────────────
function ScheduleForm({ consultationId, onSubmit }) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const handleSubmit = async e => {
    e.preventDefault();
    await onSubmit(consultationId, { scheduledAt, scheduleNote });
  };
  return (
    <form className="flow-form" onSubmit={handleSubmit}>
      <div className="flow-form-title">📅 컨설팅 일정 설정</div>
      <p className="flow-form-desc">러너에게 컨설팅 일정을 안내해 주세요.</p>
      <div className="form-group">
        <label>컨설팅 일시 *</label>
        <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>장소 / 방법 안내</label>
        <input className="form-input" placeholder="예) 화상회의 (Zoom 링크 추후 공유) 또는 강남역 스타벅스 2층" value={scheduleNote} onChange={e => setScheduleNote(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full mt-16">일정 확정하기</button>
    </form>
  );
}

// ── 커리어 리포트 작성 폼 (가이드) ──────────────────────
function ReportForm({ consultationId, onSubmit }) {
  const [form, setForm] = useState({
    direction: '', strengths: '', developments: '', actionPlan: '',
    isRecommended: false, recommendedRoles: ''
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSubmit = async e => {
    e.preventDefault();
    await onSubmit(consultationId, {
      ...form,
      recommendedRoles: form.recommendedRoles ? form.recommendedRoles.split(',').map(r => r.trim()) : []
    });
  };
  return (
    <form className="flow-form" onSubmit={handleSubmit}>
      <div className="flow-form-title">📝 커리어 리포트 작성</div>
      <p className="flow-form-desc">컨설팅 후 러너에게 공개되는 리포트입니다. 구체적이고 실질적인 내용을 작성해 주세요.</p>
      <div className="form-group">
        <label>커리어 방향 제안 *</label>
        <div className="form-hint">러너에게 가장 적합하다고 판단되는 커리어 방향과 그 이유를 작성해 주세요.</div>
        <textarea className="form-input form-textarea form-textarea-lg" placeholder="예) OO님은 기획력과 데이터 분석 역량이 뛰어나므로, 마케팅 전략 분야보다 Product Manager 경로가 더 적합합니다. 현재 보유한 역량을 살리면서..." value={form.direction} onChange={set('direction')} required />
      </div>
      <div className="form-group">
        <label>핵심 강점 *</label>
        <div className="form-hint">컨설팅을 통해 파악한 러너의 강점을 구체적으로 작성해 주세요.</div>
        <textarea className="form-input form-textarea" placeholder="예) - 논리적 사고와 문서화 역량이 탁월함&#10;- 새로운 도메인에 대한 빠른 학습 능력&#10;- 협업 커뮤니케이션 스타일이 조직 적응에 유리" value={form.strengths} onChange={set('strengths')} required />
      </div>
      <div className="form-group">
        <label>보완이 필요한 부분</label>
        <div className="form-hint">성장을 위해 개발이 필요한 영역을 솔직하게 작성해 주세요.</div>
        <textarea className="form-input form-textarea" placeholder="예) - 기술적 역량(SQL, 데이터 분석 툴) 보완 필요&#10;- 리더십 경험 축적을 위한 의도적 기회 만들기" value={form.developments} onChange={set('developments')} />
      </div>
      <div className="form-group">
        <label>실행 로드맵 *</label>
        <div className="form-hint">러너가 바로 실행할 수 있는 구체적인 행동 계획을 단계별로 작성해 주세요.</div>
        <textarea className="form-input form-textarea form-textarea-lg" placeholder="예) [1개월] 이력서 전면 수정 — 성과 중심으로 재작성&#10;[3개월] PM 관련 자격증 취득 및 사이드 프로젝트 시작&#10;[6개월] 목표 기업 10곳 리스트업 후 네트워킹 시작&#10;[1년] 최종 이직 지원 및 인터뷰 준비" value={form.actionPlan} onChange={set('actionPlan')} required />
      </div>
      <div className="form-group">
        <label>파트너 기업 추천 여부</label>
        <label className="check-label">
          <input type="checkbox" checked={form.isRecommended} onChange={e => setForm(f => ({ ...f, isRecommended: e.target.checked }))} />
          이 러너를 파트너 기업 채용 후보자로 추천합니다
        </label>
        {form.isRecommended && (
          <input className="form-input mt-8" placeholder="추천 직무 (쉼표로 구분, 예: PM, 마케터, 기획자)" value={form.recommendedRoles} onChange={set('recommendedRoles')} />
        )}
      </div>
      <button type="submit" className="btn-primary w-full mt-16">커리어 리포트 제출하기</button>
    </form>
  );
}

// ── 커리어 리포트 뷰 (러너) ───────────────────────────
function ReportView({ report }) {
  return (
    <div className="report-view">
      <div className="report-view-header">
        <span className="report-badge">커리어 리포트</span>
        <span className="report-date">{report.createdAt ? new Date(report.createdAt).toLocaleDateString('ko') : ''}</span>
      </div>
      <div className="report-section">
        <div className="report-section-title">🧭 커리어 방향 제안</div>
        <p>{report.direction}</p>
      </div>
      <div className="report-section">
        <div className="report-section-title">💪 핵심 강점</div>
        <p style={{ whiteSpace: 'pre-line' }}>{report.strengths}</p>
      </div>
      {report.developments && (
        <div className="report-section">
          <div className="report-section-title">🌱 보완이 필요한 부분</div>
          <p style={{ whiteSpace: 'pre-line' }}>{report.developments}</p>
        </div>
      )}
      <div className="report-section">
        <div className="report-section-title">🗺️ 실행 로드맵</div>
        <p style={{ whiteSpace: 'pre-line' }}>{report.actionPlan}</p>
      </div>
      {report.isRecommended && (
        <div className="report-recommend-banner">
          ✅ 파트너 기업 채용 후보자로 추천되었습니다
          {report.recommendedRoles?.length > 0 && (
            <div className="report-roles">추천 직무: {report.recommendedRoles.join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 사전 인터뷰 내용 뷰 (가이드가 확인) ─────────────────
function PreInterviewView({ pi }) {
  return (
    <div className="pre-interview-view">
      <div className="flow-form-title">📋 러너 사전 인터뷰 내용</div>
      <div className="pi-item"><strong>현재 상황</strong><p>{pi.currentSituation}</p></div>
      <div className="pi-item"><strong>커리어 고민</strong><p>{pi.concerns}</p></div>
      <div className="pi-item"><strong>희망 목표</strong><p>{pi.goals}</p></div>
      {pi.specificQuestions && <div className="pi-item"><strong>구체적 질문</strong><p>{pi.specificQuestions}</p></div>}
    </div>
  );
}

// ── 컨설팅 카드 ───────────────────────────────────────
function ConsultationCard({ m, user, onPreInterview, onSchedule, onReport, onAccept, onReject }) {
  const [showPreForm, setShowPreForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  const isGuide = user.role === 'expert';
  const isRunner = user.role === 'seeker';

  const hasPre = m.preInterview && m.preInterview.submittedAt;
  const hasSchedule = !!m.scheduledAt;
  const hasReport = m.report && m.report.createdAt;

  const StatusBadge = () => {
    if (m.status === 'completed') return <span className="status-done"><CheckCircleIcon size={13} color="#059669" /> 리포트 발행완료</span>;
    if (m.status === 'accepted') return <span className="status-accepted"><CheckCircleIcon size={13} color="#0891b2" /> 컨설팅 진행중</span>;
    if (m.status === 'rejected') return <span className="status-rejected">거절됨</span>;
    return <span className="status-pending"><ClockIcon size={13} color="#d97706" /> 수락 대기중</span>;
  };

  return (
    <div className={`consultation-item ${m.status === 'completed' ? 'done' : ''}`}>
      <div className="consult-main">
        <div className="consult-meta">
          {isGuide
            ? <><strong>{m.senderName}</strong>님의 컨설팅 요청</>
            : <>커리어 가이드 <strong>{m.expertName}</strong>에게 컨설팅 신청</>
          }
          <StatusBadge />
        </div>
        <p className="consult-msg">{m.message}</p>
      </div>

      {/* ── 가이드 뷰 ── */}
      {isGuide && m.status === 'requested' && (
        <div className="consult-actions">
          <button className="btn-accept" onClick={() => onAccept(m._id)}>수락하기</button>
          <button className="btn-reject" onClick={() => onReject(m._id)}>거절하기</button>
        </div>
      )}

      {isGuide && m.status === 'accepted' && (
        <div className="flow-steps">
          {/* 1단계: 사전 인터뷰 확인 */}
          <div className={`flow-step ${hasPre ? 'done' : 'waiting'}`}>
            <span className="flow-step-num">1</span>
            <div className="flow-step-body">
              <strong>사전 인터뷰 자료</strong>
              {hasPre ? (
                <><p className="flow-step-sub">제출 완료 — {new Date(m.preInterview.submittedAt).toLocaleDateString('ko')}</p>
                  <button className="flow-toggle-btn" onClick={() => setShowPreForm(v => !v)}>
                    {showPreForm ? '닫기' : '내용 확인하기'}
                  </button>
                  {showPreForm && <PreInterviewView pi={m.preInterview} />}
                </>
              ) : <p className="flow-step-sub">러너의 제출을 기다리는 중...</p>}
            </div>
          </div>

          {/* 2단계: 일정 설정 */}
          <div className={`flow-step ${hasSchedule ? 'done' : hasPre ? 'active' : 'waiting'}`}>
            <span className="flow-step-num">2</span>
            <div className="flow-step-body">
              <strong>컨설팅 일정</strong>
              {hasSchedule ? (
                <p className="flow-step-sub">
                  {new Date(m.scheduledAt).toLocaleString('ko', { dateStyle: 'long', timeStyle: 'short' })}
                  {m.scheduleNote && ` — ${m.scheduleNote}`}
                </p>
              ) : hasPre ? (
                <>
                  <button className="flow-toggle-btn" onClick={() => setShowScheduleForm(v => !v)}>
                    {showScheduleForm ? '닫기' : '일정 잡기'}
                  </button>
                  {showScheduleForm && <ScheduleForm consultationId={m._id} onSubmit={async (id, d) => { await onSchedule(id, d); setShowScheduleForm(false); }} />}
                </>
              ) : <p className="flow-step-sub">사전 인터뷰 제출 후 일정을 설정할 수 있습니다.</p>}
            </div>
          </div>

          {/* 3단계: 리포트 작성 */}
          <div className={`flow-step ${hasReport ? 'done' : hasSchedule ? 'active' : 'waiting'}`}>
            <span className="flow-step-num">3</span>
            <div className="flow-step-body">
              <strong>커리어 리포트 작성</strong>
              {hasReport
                ? <p className="flow-step-sub">리포트 제출 완료</p>
                : hasSchedule ? (
                  <>
                    <button className="flow-toggle-btn primary" onClick={() => setShowReportForm(v => !v)}>
                      {showReportForm ? '닫기' : '리포트 작성하기'}
                    </button>
                    {showReportForm && <ReportForm consultationId={m._id} onSubmit={async (id, d) => { await onReport(id, d); setShowReportForm(false); }} />}
                  </>
                ) : <p className="flow-step-sub">일정 확정 후 리포트를 작성할 수 있습니다.</p>
              }
            </div>
          </div>
        </div>
      )}

      {isGuide && m.status === 'completed' && m.report && (
        <div className="consult-done-guide">
          <span className="status-done"><CheckCircleIcon size={13} color="#059669" /> 리포트 제출 완료</span>
          {m.report.isRecommended && <span className="badge-recommend">파트너 기업 추천 등록</span>}
        </div>
      )}

      {/* ── 러너 뷰 ── */}
      {isRunner && m.status === 'accepted' && (
        <div className="flow-steps">
          {/* 1단계: 사전 인터뷰 */}
          <div className={`flow-step ${hasPre ? 'done' : 'active'}`}>
            <span className="flow-step-num">1</span>
            <div className="flow-step-body">
              <strong>사전 인터뷰 작성</strong>
              {hasPre ? (
                <p className="flow-step-sub">제출 완료 — 가이드가 확인 중입니다.</p>
              ) : (
                <>
                  <p className="flow-step-sub">컨설팅 준비를 위해 아래 양식을 작성해 주세요.</p>
                  <button className="flow-toggle-btn primary" onClick={() => setShowPreForm(v => !v)}>
                    {showPreForm ? '닫기' : '사전 인터뷰 작성하기'}
                  </button>
                  {showPreForm && <PreInterviewForm consultationId={m._id} onSubmit={async (id, d) => { await onPreInterview(id, d); setShowPreForm(false); }} />}
                </>
              )}
            </div>
          </div>

          {/* 2단계: 일정 확인 */}
          <div className={`flow-step ${hasSchedule ? 'done' : 'waiting'}`}>
            <span className="flow-step-num">2</span>
            <div className="flow-step-body">
              <strong>컨설팅 일정</strong>
              {hasSchedule ? (
                <p className="flow-step-sub">
                  📅 {new Date(m.scheduledAt).toLocaleString('ko', { dateStyle: 'long', timeStyle: 'short' })}
                  {m.scheduleNote && <><br />{m.scheduleNote}</>}
                </p>
              ) : <p className="flow-step-sub">사전 인터뷰 제출 후 가이드가 일정을 안내합니다.</p>}
            </div>
          </div>

          {/* 3단계: 리포트 대기 */}
          <div className="flow-step waiting">
            <span className="flow-step-num">3</span>
            <div className="flow-step-body">
              <strong>커리어 리포트</strong>
              <p className="flow-step-sub">컨설팅 후 가이드가 리포트를 작성해 공개합니다.</p>
            </div>
          </div>
        </div>
      )}

      {isRunner && m.status === 'completed' && m.report && (
        <ReportView report={m.report} />
      )}

      {isRunner && m.status === 'rejected' && (
        <div className="consult-rejected">가이드가 이번 컨설팅 요청을 거절했습니다.</div>
      )}
    </div>
  );
}

// ── 메인 MyPage ───────────────────────────────────────
export default function MyPage() {
  const { user, setUser, logout } = useAuth();
  const { toast, showToast } = useToast();
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [resumeFile, setResumeFile] = useState(null);

  const reload = async () => {
    const d = await api.getConsultations();
    setConsultations(Array.isArray(d) ? d : []);
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    reload();
    setEditForm({
      name: user.name || '', phone: user.phone || '',
      field: user.field || '', description: user.description || '', password: '',
    });
  }, [user, navigate]);

  if (!user) return null;

  const myConsultations = consultations.filter(c =>
    user.role === 'expert' ? c.expertId === user._id : c.senderId === user._id
  );

  const roleLabel = () => {
    if (user.role === 'expert') return `커리어 가이드 (Career Guide)${user.yearsOfExperience ? ` · 경력 ${user.yearsOfExperience}년` : ''}`;
    if (user.role === 'company') return `파트너 기업 담당자 · ${user.companyName || ''}`;
    return '커리어 러너 (Career Runner)';
  };

  const handleAccept = async id => {
    await api.acceptConsultation(id);
    showToast('컨설팅 요청을 수락했습니다.');
    reload();
  };

  const handleReject = async id => {
    await api.rejectConsultation(id);
    showToast('컨설팅 요청을 거절했습니다.');
    reload();
  };

  const handlePreInterview = async (id, data) => {
    await api.submitPreInterview(id, data);
    showToast('사전 인터뷰를 제출했습니다.');
    reload();
  };

  const handleSchedule = async (id, data) => {
    await api.scheduleConsultation(id, data);
    showToast('컨설팅 일정이 확정되었습니다.');
    reload();
  };

  const handleReport = async (id, data) => {
    await api.submitReport(id, data);
    showToast('커리어 리포트가 제출되었습니다.');
    reload();
  };

  const handleSave = async () => {
    const fd = new FormData();
    Object.entries(editForm).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (resumeFile) fd.append('resume', resumeFile);
    const data = await api.updateUser(user._id, fd);
    if (data.success) { setUser(data.user); setIsEditing(false); showToast('프로필이 수정되었습니다.'); }
    else showToast(data.error || '수정 실패', 'error');
  };

  return (
    <div className="page-mypage">
      <Toast toast={toast} />
      <div className="mypage-container">
        {/* 프로필 카드 */}
        <div className="profile-card">
          <div className="profile-avatar"><AvatarFallback name={user.name} size={80} /></div>
          <div className="profile-info">
            <h2>{user.name}</h2>
            <p className="profile-role">{roleLabel()}</p>
            <p className="profile-field">{user.field || '분야 미설정'}</p>
            {user.currentCompany && <p className="exp-tag"><BuildingIcon size={12} color="#555" />&nbsp;{user.currentCompany}</p>}
            <p className="profile-email"><MailIcon size={12} color="#888" />&nbsp;{user.email}</p>
            {user.phone && <p className="profile-email"><PhoneIcon size={12} color="#888" />&nbsp;{user.phone}</p>}
            {user.description && <p style={{ marginTop: 8, fontSize: '0.9rem', color: '#444', lineHeight: 1.5 }}>{user.description}</p>}
          </div>
          <div className="profile-actions">
            <button className="btn-primary" onClick={() => setIsEditing(true)}>프로필 수정</button>
            <button className="btn-outline" onClick={() => { logout(); navigate('/'); }}>로그아웃</button>
          </div>
        </div>

        {/* 가이드 상세 경력 */}
        {user.role === 'expert' && (user.careerHistory || user.consultationExpertise) && (
          <div className="guide-detail-card">
            {user.careerHistory && (
              <div className="guide-detail-section">
                <div className="guide-detail-label">경력 이력</div>
                <p style={{ whiteSpace: 'pre-line' }}>{user.careerHistory}</p>
              </div>
            )}
            {user.achievements && (
              <div className="guide-detail-section">
                <div className="guide-detail-label">주요 성과</div>
                <p style={{ whiteSpace: 'pre-line' }}>{user.achievements}</p>
              </div>
            )}
            {user.consultationExpertise && (
              <div className="guide-detail-section">
                <div className="guide-detail-label">컨설팅 가능 분야</div>
                <p style={{ whiteSpace: 'pre-line' }}>{user.consultationExpertise}</p>
              </div>
            )}
            {user.consultationStyle && (
              <div className="guide-detail-section">
                <div className="guide-detail-label">컨설팅 스타일</div>
                <p style={{ whiteSpace: 'pre-line' }}>{user.consultationStyle}</p>
              </div>
            )}
          </div>
        )}

        {/* 프로필 수정 폼 */}
        {isEditing && (
          <div className="edit-card">
            <h3>프로필 수정</h3>
            <div className="form-row">
              <div className="form-group">
                <label>이름</label>
                <input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>연락처</label>
                <input className="form-input" placeholder="010-0000-0000" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>분야 / 직무</label>
              <input className="form-input" value={editForm.field} onChange={e => setEditForm(f => ({ ...f, field: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>한줄 소개</label>
              <textarea className="form-input form-textarea" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>새 비밀번호 (변경 시만 입력)</label>
              <input className="form-input" type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            {user.role === 'seeker' && (
              <div className="form-group">
                <label>이력서 업로드 (PDF/Word)</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => setResumeFile(e.target.files[0])} />
              </div>
            )}
            <div className="row-gap mt-16">
              <button className="btn-outline flex-1" onClick={() => setIsEditing(false)}>취소</button>
              <button className="btn-primary flex-2" onClick={handleSave}>저장하기</button>
            </div>
          </div>
        )}

        {/* 이력서 다운로드 */}
        {user.resume && (
          <a href={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${user.resume}`} target="_blank" rel="noreferrer" className="resume-link">
            <DocumentIcon size={14} color="#00c7ae" />&nbsp;이력서 다운로드
          </a>
        )}

        {/* 컨설팅 내역 */}
        <div className="consultation-section">
          <h3>
            {user.role === 'expert' ? '받은 커리어 컨설팅 요청' : user.role === 'company' ? '추천받은 커리어 러너' : '내 커리어 컨설팅 내역'}
            <span className="count-badge">{myConsultations.length}</span>
          </h3>
          {myConsultations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.2">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <p>{user.role === 'expert' ? '아직 받은 컨설팅 요청이 없습니다.' : '아직 커리어 컨설팅 내역이 없습니다.'}</p>
            </div>
          ) : (
            <div className="consultation-list">
              {myConsultations.map(m => (
                <ConsultationCard
                  key={m._id} m={m} user={user}
                  onPreInterview={handlePreInterview}
                  onSchedule={handleSchedule}
                  onReport={handleReport}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
