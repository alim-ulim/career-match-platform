import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { api } from '../api';
import Toast from '../components/Toast';
import { AvatarFallback, BuildingIcon, MailIcon, PhoneIcon, DocumentIcon, CheckCircleIcon, ClockIcon } from '../components/Icons';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');

// ── 메시지 스레드 ──────────────────────────────────────
function MessageThread({ messages, myRole, myName, onSend }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await onSend({ sender: myRole, senderName: myName, text });
    setText('');
  };

  return (
    <div className="msg-thread-wrap">
      <div className="msg-thread-title">💬 메시지</div>
      <div className="msg-thread">
        {(!messages || messages.length === 0) && (
          <div className="msg-empty">아직 메시지가 없습니다.</div>
        )}
        {messages && messages.map((m, i) => (
          <div key={i} className={`msg-bubble ${m.sender === myRole ? 'mine' : 'theirs'}`}>
            <div className="msg-sender">{m.senderName}</div>
            <div className="msg-text">{m.text}</div>
            <div className="msg-time">
              {m.createdAt ? new Date(m.createdAt).toLocaleString('ko', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="msg-compose" onSubmit={handleSend}>
        <textarea
          className="msg-input"
          placeholder="메시지를 입력하세요..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
          rows={2}
        />
        <button type="submit" className="msg-send-btn">전송</button>
      </form>
    </div>
  );
}

// ── 일정 제안 폼 (울림지기 or 시커) ─────────────────────
function ScheduleForm({ consultationId, proposedBy, onSubmit, onCancel, existingNote }) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleNote, setScheduleNote] = useState(existingNote || '');
  const isCounter = !!existingNote;
  const handleSubmit = async e => {
    e.preventDefault();
    await onSubmit(consultationId, { scheduledAt, scheduleNote, proposedBy });
  };
  return (
    <form className="flow-form" onSubmit={handleSubmit}>
      <div className="flow-form-title">{isCounter ? '📅 다른 일정 역제안' : '📅 컨설팅 일정 제안'}</div>
      {isCounter && <p className="flow-form-desc">제안된 일정이 맞지 않으면 다른 날짜/시간을 제안해 주세요.</p>}
      <div className="form-group">
        <label>컨설팅 일시 *</label>
        <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>장소 / 방법</label>
        <input className="form-input" placeholder="예) 화상회의(Zoom) / 강남역 스타벅스 2층" value={scheduleNote} onChange={e => setScheduleNote(e.target.value)} />
      </div>
      <div className="row-gap mt-16">
        <button type="button" className="btn-outline flex-1" onClick={onCancel}>취소</button>
        <button type="submit" className="btn-primary flex-2">일정 제안하기</button>
      </div>
    </form>
  );
}

// ── PDF 리포트 업로드 (울림지기) ────────────────────────
function ReportUpload({ consultationId, onSubmit, onCancel }) {
  const [file, setFile] = useState(null);
  const [isRecommended, setIsRecommended] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('reportFile', file);
    fd.append('isRecommended', isRecommended);
    await onSubmit(consultationId, fd);
  };
  return (
    <form className="flow-form" onSubmit={handleSubmit}>
      <div className="flow-form-title">📎 커리어 리포트 업로드</div>
      <p className="flow-form-desc">컨설팅 후 작성한 커리어 리포트 PDF 파일을 업로드해 주세요.<br />업로드 즉시 시커에게 공개됩니다.</p>
      <div className="form-group">
        <label>리포트 PDF 파일 *</label>
        <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} required />
        {file && <p className="file-selected">선택됨: {file.name}</p>}
      </div>
      <div className="form-group">
        <label className="check-label">
          <input type="checkbox" checked={isRecommended} onChange={e => setIsRecommended(e.target.checked)} />
          이 시커를 파트너 기업 채용 후보자로 추천합니다
        </label>
      </div>
      <div className="row-gap mt-16">
        <button type="button" className="btn-outline flex-1" onClick={onCancel}>취소</button>
        <button type="submit" className="btn-primary flex-2" disabled={!file}>리포트 전달하기</button>
      </div>
    </form>
  );
}

// ── 상태 뱃지 ─────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'completed') return <span className="status-done"><CheckCircleIcon size={13} color="#059669" /> 리포트 전달완료</span>;
  if (status === 'accepted')  return <span className="status-accepted"><CheckCircleIcon size={13} color="#0891b2" /> 컨설팅 진행중</span>;
  if (status === 'rejected')  return <span className="status-rejected">거절됨</span>;
  return <span className="status-pending"><ClockIcon size={13} color="#d97706" /> 수락 대기중</span>;
}

// ── 컨설팅 카드 ───────────────────────────────────────
function ConsultationCard({ m, user, onAccept, onReject, onMessage, onSchedule, onConfirmSchedule, onReportUpload, reload }) {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  const isGuide  = user.role === 'expert';
  const isRunner = user.role === 'seeker';
  const hasMessages  = m.messages && m.messages.length > 0;
  const hasSchedule  = !!m.scheduledAt;
  const scheduleConfirmed = m.scheduleStatus === 'confirmed';
  const scheduleProposed  = m.scheduleStatus === 'proposed';
  const myProposal = scheduleProposed && m.scheduledBy === (isGuide ? 'guide' : 'runner');
  const theirProposal = scheduleProposed && !myProposal;
  const hasReport    = !!m.reportFile;

  return (
    <div className={`consultation-item ${m.status === 'completed' ? 'done' : ''}`}>
      {/* 헤더 */}
      <div className="consult-main">
        <div className="consult-meta">
          {isGuide
            ? <><strong>{m.senderName}</strong>님의 컨설팅 요청</>
            : <>울림지기 <strong>{m.expertName}</strong>에게 컨설팅 신청</>
          }
          <StatusBadge status={m.status} />
        </div>
        <p className="consult-msg">{m.message}</p>
      </div>

      {/* ── 울림지기 뷰 ── */}
      {isGuide && m.status === 'requested' && (
        <div className="consult-actions">
          <button className="btn-accept" onClick={() => onAccept(m._id)}>수락하기</button>
          <button className="btn-reject" onClick={() => onReject(m._id)}>거절하기</button>
        </div>
      )}

      {isGuide && m.status === 'accepted' && (
        <div className="consult-flow">
          {/* Step 1: 메시지 */}
          <div className="flow-step-label">
            <span className={`flow-dot ${hasMessages ? 'done' : 'active'}`} />
            <strong>1단계</strong> — 시커에게 메시지 보내기
            {!hasMessages && <span className="flow-hint">커리어 고민, 이력 등을 요청하는 메시지를 보내세요.</span>}
          </div>
          <MessageThread
            messages={m.messages}
            myRole="guide"
            myName={user.name}
            onSend={(data) => onMessage(m._id, data)}
          />

          {/* Step 2: 일정 */}
          <div className={`flow-step-label ${!hasMessages ? 'disabled' : ''}`}>
            <span className={`flow-dot ${scheduleConfirmed ? 'done' : hasSchedule ? 'active' : hasMessages ? 'active' : ''}`} />
            <strong>2단계</strong> — 컨설팅 일정 협의
          </div>
          {hasMessages && !hasSchedule && !showScheduleForm && (
            <button className="flow-toggle-btn" onClick={() => setShowScheduleForm(true)}>일정 제안하기</button>
          )}
          {/* 러너가 역제안한 경우: 가이드가 수락 or 재제안 */}
          {hasSchedule && theirProposal && !showScheduleForm && (
            <div className="schedule-proposal">
              <div className="schedule-proposal-label">🔔 시커가 일정을 역제안했습니다</div>
              <div className="schedule-proposal-time">
                📅 {new Date(m.scheduledAt).toLocaleString('ko', { dateStyle: 'long', timeStyle: 'short' })}
                {m.scheduleNote && <span> — {m.scheduleNote}</span>}
              </div>
              <div className="row-gap mt-12">
                <button className="btn-accept" onClick={() => onConfirmSchedule(m._id)}>이 일정 수락하기</button>
                <button className="btn-outline" onClick={() => setShowScheduleForm(true)}>다른 일정 제안하기</button>
              </div>
            </div>
          )}
          {/* 가이드가 제안 후 러너 수락 대기 중 */}
          {hasSchedule && myProposal && !showScheduleForm && (
            <div className="schedule-pending">
              <div className="schedule-pending-label">⏳ 시커의 수락을 기다리고 있습니다</div>
              <div className="schedule-proposal-time">
                📅 {new Date(m.scheduledAt).toLocaleString('ko', { dateStyle: 'long', timeStyle: 'short' })}
                {m.scheduleNote && <span> — {m.scheduleNote}</span>}
              </div>
              <button className="btn-outline mt-8" onClick={() => setShowScheduleForm(true)}>일정 변경 제안</button>
            </div>
          )}
          {/* 일정 확정 */}
          {scheduleConfirmed && (
            <div className="schedule-confirmed">
              ✅ 일정 확정됨 — {new Date(m.scheduledAt).toLocaleString('ko', { dateStyle: 'long', timeStyle: 'short' })}
              {m.scheduleNote && <span> — {m.scheduleNote}</span>}
            </div>
          )}
          {showScheduleForm && (
            <ScheduleForm
              consultationId={m._id}
              proposedBy="guide"
              existingNote={m.scheduleNote}
              onSubmit={async (id, d) => { await onSchedule(id, d); setShowScheduleForm(false); }}
              onCancel={() => setShowScheduleForm(false)}
            />
          )}

          {/* Step 3: 리포트 업로드 */}
          <div className={`flow-step-label ${!scheduleConfirmed ? 'disabled' : ''}`}>
            <span className={`flow-dot ${hasReport ? 'done' : scheduleConfirmed ? 'active' : ''}`} />
            <strong>3단계</strong> — 커리어 리포트 PDF 전달
          </div>
          {scheduleConfirmed && !hasReport && !showReportForm && (
            <button className="flow-toggle-btn primary" onClick={() => setShowReportForm(true)}>리포트 업로드하기</button>
          )}
          {hasReport && (
            <div className="report-uploaded">
              ✅ 리포트 전달 완료 ({m.reportUploadedAt ? new Date(m.reportUploadedAt).toLocaleDateString('ko') : ''})
            </div>
          )}
          {showReportForm && (
            <ReportUpload
              consultationId={m._id}
              onSubmit={async (id, fd) => { await onReportUpload(id, fd); setShowReportForm(false); }}
              onCancel={() => setShowReportForm(false)}
            />
          )}
        </div>
      )}

      {isGuide && m.status === 'completed' && (
        <div className="consult-done-guide">
          <span className="status-done"><CheckCircleIcon size={13} color="#059669" /> 커리어 리포트 전달 완료</span>
        </div>
      )}

      {/* ── 시커 뷰 ── */}
      {isRunner && m.status === 'accepted' && (
        <div className="consult-flow">
          {/* 메시지 */}
          <div className="flow-step-label">
            <span className={`flow-dot ${hasMessages ? 'active' : ''}`} />
            <strong>울림지기와 메시지</strong>
            {!hasMessages && <span className="flow-hint">울림지기가 메시지를 보내면 여기에 표시됩니다.</span>}
          </div>
          {hasMessages && (
            <MessageThread
              messages={m.messages}
              myRole="runner"
              myName={user.name}
              onSend={(data) => onMessage(m._id, data)}
            />
          )}

          {/* 일정 */}
          {hasSchedule && theirProposal && !showScheduleForm && (
            <div className="schedule-proposal">
              <div className="schedule-proposal-label">📅 울림지기가 컨설팅 일정을 제안했습니다</div>
              <div className="schedule-proposal-time">
                <strong>{new Date(m.scheduledAt).toLocaleString('ko', { dateStyle: 'long', timeStyle: 'short' })}</strong>
                {m.scheduleNote && <><br />{m.scheduleNote}</>}
              </div>
              <div className="row-gap mt-12">
                <button className="btn-accept" onClick={() => onConfirmSchedule(m._id)}>이 일정 수락하기</button>
                <button className="btn-outline" onClick={() => setShowScheduleForm(true)}>다른 일정 역제안하기</button>
              </div>
            </div>
          )}
          {hasSchedule && myProposal && !showScheduleForm && (
            <div className="schedule-pending">
              <div className="schedule-pending-label">⏳ 울림지기의 수락을 기다리고 있습니다</div>
              <div className="schedule-proposal-time">
                📅 {new Date(m.scheduledAt).toLocaleString('ko', { dateStyle: 'long', timeStyle: 'short' })}
                {m.scheduleNote && <span> — {m.scheduleNote}</span>}
              </div>
            </div>
          )}
          {scheduleConfirmed && (
            <div className="schedule-confirmed runner">
              ✅ 컨설팅 일정이 확정되었습니다<br />
              <strong>{new Date(m.scheduledAt).toLocaleString('ko', { dateStyle: 'long', timeStyle: 'short' })}</strong>
              {m.scheduleNote && <><br />{m.scheduleNote}</>}
            </div>
          )}
          {showScheduleForm && (
            <ScheduleForm
              consultationId={m._id}
              proposedBy="runner"
              existingNote={m.scheduleNote}
              onSubmit={async (id, d) => { await onSchedule(id, d); setShowScheduleForm(false); }}
              onCancel={() => setShowScheduleForm(false)}
            />
          )}

          {/* 리포트 대기 */}
          {!hasReport && (
            <div className="report-waiting">
              {scheduleConfirmed
                ? '컨설팅 미팅 후 울림지기가 커리어 리포트 PDF를 업로드하면 여기서 다운로드할 수 있습니다.'
                : '울림지기가 일정을 제안하면 안내됩니다.'}
            </div>
          )}
        </div>
      )}

      {isRunner && m.status === 'completed' && m.reportFile && (
        <div className="report-download-box">
          <div className="report-download-title">📄 커리어 리포트가 도착했습니다</div>
          <p className="report-download-sub">
            울림지기 <strong>{m.expertName}</strong>님이 작성한 커리어 리포트입니다.
            {m.reportUploadedAt && ` (${new Date(m.reportUploadedAt).toLocaleDateString('ko')} 전달)`}
          </p>
          <a
            className="btn-primary report-dl-btn"
            href={`${API_BASE}${m.reportFile}`}
            target="_blank"
            rel="noreferrer"
            download
          >
            커리어 리포트 다운로드 (PDF)
          </a>
          {/* 메시지 스레드도 유지 */}
          {hasMessages && (
            <MessageThread
              messages={m.messages}
              myRole="runner"
              myName={user.name}
              onSend={(data) => onMessage(m._id, data)}
            />
          )}
        </div>
      )}

      {isRunner && m.status === 'rejected' && (
        <div className="consult-rejected">이번 컨설팅 요청을 울림지기가 거절했습니다.</div>
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
    if (user.role === 'expert') return `울림지기${user.yearsOfExperience ? ` · 경력 ${user.yearsOfExperience}년` : ''}`;
    if (user.role === 'company') return `파트너 기업 담당자 · ${user.companyName || ''}`;
    return '시커 (Seeker)';
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
  const handleMessage = async (id, data) => {
    await api.sendConsultationMessage(id, data);
    reload();
  };
  const handleSchedule = async (id, data) => {
    await api.scheduleConsultation(id, data);
    showToast('일정을 제안했습니다. 상대방의 수락을 기다려 주세요.');
    reload();
  };
  const handleConfirmSchedule = async (id) => {
    await api.confirmSchedule(id);
    showToast('일정이 확정되었습니다!');
    reload();
  };
  const handleReportUpload = async (id, fd) => {
    const res = await api.uploadReportFile(id, fd);
    if (res.success) { showToast('커리어 리포트가 전달되었습니다.'); reload(); }
    else showToast(res.error || '업로드 실패', 'error');
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

        {/* 울림지기 상세 경력 */}
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

        {user.resume && (
          <a href={`${API_BASE}${user.resume}`} target="_blank" rel="noreferrer" className="resume-link">
            <DocumentIcon size={14} color="#00c7ae" />&nbsp;이력서 다운로드
          </a>
        )}

        {/* 컨설팅 내역 */}
        <div className="consultation-section">
          <h3>
            {user.role === 'expert' ? '받은 컨설팅 요청' : user.role === 'company' ? '추천받은 시커' : '내 컨설팅 내역'}
            <span className="count-badge">{myConsultations.length}</span>
          </h3>
          {myConsultations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.2">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <p>{user.role === 'expert' ? '아직 받은 컨설팅 요청이 없습니다.' : '아직 컨설팅 내역이 없습니다.'}</p>
            </div>
          ) : (
            <div className="consultation-list">
              {myConsultations.map(m => (
                <ConsultationCard
                  key={m._id} m={m} user={user}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onMessage={handleMessage}
                  onSchedule={handleSchedule}
                  onConfirmSchedule={handleConfirmSchedule}
                  onReportUpload={handleReportUpload}
                  reload={reload}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
