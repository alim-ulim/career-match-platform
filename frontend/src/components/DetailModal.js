import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AvatarFallback, BuildingIcon, CheckCircleIcon } from './Icons';

export default function DetailModal({ item, onClose, onSend, onEvaluate, consultations }) {
  const { user } = useAuth();
  const [step, setStep] = useState('profile');
  const [sender, setSender] = useState('');
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [evalData, setEvalData] = useState({
    rating: 5, pros: '', cons: '', recommendation: '',
    isHighlyRecommended: false, recommendedRoles: []
  });

  if (!item) return null;

  const isConsultation = item.senderId !== undefined && item.expertId !== undefined;

  const roleLabel = () => {
    if (isConsultation) return '커리어 컨설팅 요청';
    if (item.role === 'expert') return '커리어 가이드 (Career Guide)';
    if (item.role === 'company') return '파트너 기업 담당자';
    return '커리어 러너 (Career Runner)';
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setIsSending(true);
    await new Promise(r => setTimeout(r, 800));
    onSend(sender || (user?.name || '익명'), text, item);
    setStep('success');
    setIsSending(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        {step === 'profile' && (
          <>
            <div className="modal-header">
              <div className="modal-avatar">
                <AvatarFallback name={item.name || item.senderName} size={72} />
              </div>
              <h2 className="modal-name">{item.name || item.senderName}</h2>
              <p className="modal-role">{roleLabel()}</p>
              {item.field && <span className="tag">{item.field}</span>}
              {item.yearsOfExperience > 0 && (
                <span className="tag tag-accent">경력 {item.yearsOfExperience}년</span>
              )}
              {item.currentCompany && (
                <span className="tag tag-company">
                  <BuildingIcon size={12} color="#555" />
                  &nbsp;{item.currentCompany}
                </span>
              )}
            </div>

            <div className="modal-body">
              <h4 className="section-label">소개</h4>
              <p className="modal-desc">
                {item.description || item.message || '아직 소개가 작성되지 않았습니다.'}
              </p>

              {/* 파트너 기업: 커리어 리포트 열람 */}
              {user?.role === 'company' && consultations && (
                <div className="eval-list">
                  <h4 className="section-label" style={{ marginTop: 16 }}>
                    커리어 리포트 ({consultations.filter(c => c.senderId === item._id && c.status === 'completed' && c.evaluation).length}건)
                  </h4>
                  {consultations
                    .filter(c => c.senderId === item._id && c.status === 'completed' && c.evaluation)
                    .map(ev => (
                      <div key={ev._id} className="eval-item">
                        <strong>커리어 가이드: {ev.expertName} (★{ev.evaluation.rating})</strong>
                        <p>강점: {ev.evaluation.pros}</p>
                        <p className="eval-rec">종합 의견: "{ev.evaluation.recommendation}"</p>
                        {ev.evaluation.isHighlyRecommended && (
                          <span className="badge-recommend">파트너 기업 추천 대상</span>
                        )}
                        {ev.evaluation.recommendedRoles?.length > 0 && (
                          <p style={{ marginTop: 6, fontSize: '0.8rem' }}>
                            추천 직무: {ev.evaluation.recommendedRoles.join(', ')}
                          </p>
                        )}
                      </div>
                    ))
                  }
                  {consultations.filter(c => c.senderId === item._id && c.status === 'completed' && c.evaluation).length === 0 && (
                    <p className="hint">아직 등록된 커리어 리포트가 없습니다.</p>
                  )}
                </div>
              )}

              {/* 커리어 가이드: 리포트 작성 폼 */}
              {isConsultation && user?.role === 'expert' && !item.evaluation && (
                <div className="eval-form">
                  <h4 className="section-label">커리어 리포트 작성</h4>
                  <select
                    className="form-input"
                    value={evalData.rating}
                    onChange={e => setEvalData({ ...evalData, rating: Number(e.target.value) })}
                  >
                    <option value={5}>★★★★★ 매우 우수 — 강력 추천</option>
                    <option value={4}>★★★★ 우수 — 추천</option>
                    <option value={3}>★★★ 양호 — 보통</option>
                    <option value={2}>★★ 미흡 — 보완 필요</option>
                    <option value={1}>★ 부적합 — 비추천</option>
                  </select>
                  <input className="form-input mt-8" placeholder="강점 (Strengths)" onChange={e => setEvalData({ ...evalData, pros: e.target.value })} />
                  <input className="form-input mt-8" placeholder="보완점 (Areas for Improvement)" onChange={e => setEvalData({ ...evalData, cons: e.target.value })} />
                  <textarea className="form-input form-textarea mt-8" placeholder="종합 커리어 조언 및 로드맵 (커리어 러너에게 전달됩니다)" onChange={e => setEvalData({ ...evalData, recommendation: e.target.value })} />
                  <input className="form-input mt-8" placeholder="추천 직무 (예: PM, 마케터, 개발자 — 쉼표로 구분)" onChange={e => setEvalData({ ...evalData, recommendedRoles: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                  <label className="checkbox-label mt-8">
                    <input
                      type="checkbox"
                      checked={evalData.isHighlyRecommended}
                      onChange={e => setEvalData({ ...evalData, isHighlyRecommended: e.target.checked })}
                    />
                    이 커리어 러너를 파트너 기업 추천 대상으로 등록합니다
                  </label>
                  <button className="btn-primary w-full mt-8" onClick={() => onEvaluate(item._id, evalData)}>
                    커리어 리포트 제출 및 컨설팅 완료
                  </button>
                </div>
              )}

              {isConsultation && item.evaluation && (
                <div className="consult-eval-result" style={{ marginTop: 16 }}>
                  <strong>커리어 리포트가 이미 제출되었습니다.</strong>
                  <p style={{ marginTop: 4 }}>{item.evaluation.recommendation}</p>
                </div>
              )}
            </div>

            {!isConsultation && user?.role === 'seeker' && item.role === 'expert' && (
              <div className="modal-footer">
                <button className="btn-primary w-full" onClick={() => setStep('form')}>
                  커리어 컨설팅 신청하기
                </button>
              </div>
            )}
          </>
        )}

        {step === 'form' && (
          <div className="modal-body text-center">
            <h3>커리어 가이드에게 컨설팅 신청</h3>
            <p className="hint" style={{ marginTop: 8 }}>
              현재 겪고 있는 커리어 고민이나 목표를 구체적으로 작성해 주세요.<br />
              커리어 가이드가 맞춤형 커리어 리포트를 작성해 드립니다.
            </p>
            <input
              className="form-input mt-8"
              placeholder="신청자 성함"
              value={sender}
              onChange={e => setSender(e.target.value)}
            />
            <textarea
              className="form-input form-textarea mt-8"
              placeholder="커리어 고민 또는 목표를 구체적으로 적어주세요."
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div className="row-gap mt-16">
              <button className="btn-outline flex-1" onClick={() => setStep('profile')}>취소</button>
              <button className="btn-primary flex-2" onClick={handleSend} disabled={isSending}>
                {isSending ? '신청 중...' : '컨설팅 신청 보내기'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="modal-body text-center">
            <div className="success-icon-wrap">
              <CheckCircleIcon size={56} color="#00c7ae" />
            </div>
            <h2 style={{ marginTop: 12 }}>신청 완료</h2>
            <p className="hint" style={{ marginTop: 8 }}>
              커리어 가이드에게 컨설팅 신청이 전달되었습니다.<br />
              마이페이지에서 진행 상황을 확인하세요.
            </p>
            <button className="btn-primary w-full mt-16" onClick={onClose}>확인</button>
          </div>
        )}
      </div>
    </div>
  );
}
