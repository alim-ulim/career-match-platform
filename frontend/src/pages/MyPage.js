import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { api, IMG_BASE } from '../api';
import Toast from '../components/Toast';
import DetailModal from '../components/DetailModal';
import { AvatarFallback, BuildingIcon, MailIcon, PhoneIcon, DocumentIcon, CheckCircleIcon, ClockIcon } from '../components/Icons';

export default function MyPage() {
  const { user, setUser, logout } = useAuth();
  const { toast, showToast } = useToast();
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [profileFile, setProfileFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.getConsultations().then(d => setConsultations(Array.isArray(d) ? d : []));
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      field: user.field || '',
      description: user.description || '',
      password: '',
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

  const handleAccept = async (id) => {
    setAcceptingId(id);
    await api.acceptConsultation(id);
    showToast('커리어 컨설팅 요청을 수락했습니다.');
    const updated = await api.getConsultations();
    setConsultations(Array.isArray(updated) ? updated : []);
    setAcceptingId(null);
  };

  const handleEvaluate = async (id, evalData) => {
    await api.evaluateConsultation(id, evalData);
    showToast('커리어 리포트가 제출되었습니다.');
    setSelected(null);
    const updated = await api.getConsultations();
    setConsultations(Array.isArray(updated) ? updated : []);
  };

  const handleSave = async () => {
    const fd = new FormData();
    Object.entries(editForm).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (profileFile) fd.append('profileImage', profileFile);
    if (resumeFile) fd.append('resume', resumeFile);
    const data = await api.updateUser(user._id, fd);
    if (data.success) {
      setUser(data.user);
      setIsEditing(false);
      showToast('프로필이 수정되었습니다.');
    } else {
      showToast(data.error || '수정 실패', 'error');
    }
  };

  const StatusBadge = ({ status }) => {
    if (status === 'completed') return (
      <span className="status-done">
        <CheckCircleIcon size={13} color="#059669" /> 리포트 발행완료
      </span>
    );
    if (status === 'accepted') return (
      <span className="status-accepted">
        <CheckCircleIcon size={13} color="#0891b2" /> 컨설팅 진행중
      </span>
    );
    return (
      <span className="status-pending">
        <ClockIcon size={13} color="#d97706" /> 수락 대기중
      </span>
    );
  };

  const sectionTitle = () => {
    if (user.role === 'expert') return '받은 커리어 컨설팅 요청';
    if (user.role === 'company') return '추천받은 커리어 러너';
    return '내 커리어 컨설팅 내역';
  };

  return (
    <div className="page-mypage">
      <Toast toast={toast} />
      <DetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onSend={() => {}}
        onEvaluate={handleEvaluate}
        consultations={consultations}
      />

      <div className="mypage-container">
        {/* 프로필 카드 */}
        <div className="profile-card">
          <div className="profile-avatar">
            <AvatarFallback name={user.name} size={80} />
          </div>
          <div className="profile-info">
            <h2>{user.name}</h2>
            <p className="profile-role">{roleLabel()}</p>
            <p className="profile-field">{user.field || '분야 미설정'}</p>
            {user.currentCompany && (
              <p className="exp-tag">
                <BuildingIcon size={12} color="#555" />&nbsp;{user.currentCompany}
              </p>
            )}
            <p className="profile-email">
              <MailIcon size={12} color="#888" />&nbsp;{user.email}
            </p>
            {user.phone && (
              <p className="profile-email">
                <PhoneIcon size={12} color="#888" />&nbsp;{user.phone}
              </p>
            )}
            {user.description && (
              <p style={{ marginTop: 8, fontSize: '0.9rem', color: '#444', lineHeight: 1.5 }}>
                {user.description}
              </p>
            )}
          </div>
          <div className="profile-actions">
            <button className="btn-primary" onClick={() => setIsEditing(true)}>프로필 수정</button>
            <button className="btn-outline" onClick={() => { logout(); navigate('/'); }}>로그아웃</button>
          </div>
        </div>

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
          <a href={`${IMG_BASE}${user.resume}`} target="_blank" rel="noreferrer" className="resume-link">
            <DocumentIcon size={14} color="#00c7ae" />&nbsp;이력서 다운로드
          </a>
        )}

        {/* 컨설팅 내역 */}
        <div className="consultation-section">
          <h3>
            {sectionTitle()}
            <span className="count-badge">{myConsultations.length}</span>
          </h3>

          {myConsultations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.2">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <p>
                {user.role === 'expert'
                  ? '아직 받은 컨설팅 요청이 없습니다.'
                  : '아직 커리어 컨설팅 내역이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="consultation-list">
              {myConsultations.map(m => (
                <div key={m._id} className={`consultation-item ${m.status === 'completed' ? 'done' : ''}`}>
                  <div
                    className="consult-main"
                    onClick={() => user.role === 'expert' ? setSelected(m) : null}
                    style={user.role === 'expert' ? { cursor: 'pointer' } : {}}
                  >
                    <div className="consult-meta">
                      {user.role === 'expert' ? (
                        <><strong>{m.senderName}</strong>님의 컨설팅 요청</>
                      ) : (
                        <>커리어 가이드 <strong>{m.expertName}</strong>에게 컨설팅 신청</>
                      )}
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="consult-msg">{m.message}</p>
                  </div>

                  {user.role === 'expert' && m.status === 'requested' && (
                    <button
                      className="btn-accept"
                      disabled={acceptingId === m._id}
                      onClick={() => handleAccept(m._id)}
                    >
                      {acceptingId === m._id ? '처리 중...' : '컨설팅 수락하기'}
                    </button>
                  )}

                  {user.role === 'expert' && m.status === 'accepted' && !m.evaluation && (
                    <button className="btn-accept" onClick={() => setSelected(m)}>
                      커리어 리포트 작성하기
                    </button>
                  )}

                  {user.role === 'seeker' && m.status === 'accepted' && (
                    <div className="consult-accepted">
                      커리어 가이드가 컨설팅을 수락했습니다. 커리어 리포트를 기다려 주세요.
                    </div>
                  )}

                  {user.role === 'seeker' && m.status === 'completed' && m.evaluation && (
                    <div className="consult-eval-result">
                      <strong>★{m.evaluation.rating} 커리어 리포트</strong>
                      <p style={{ marginTop: 4 }}>{m.evaluation.recommendation}</p>
                      {m.evaluation.isHighlyRecommended && (
                        <span className="badge-recommend">파트너 기업 추천 대상 등록됨</span>
                      )}
                      {m.evaluation.recommendedRoles?.length > 0 && (
                        <p style={{ marginTop: 6, fontSize: '0.8rem', color: '#555' }}>
                          추천 직무: {m.evaluation.recommendedRoles.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
