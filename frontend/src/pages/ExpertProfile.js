import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, IMG_BASE } from '../api';
import { AvatarFallback } from '../components/Icons';

const METHOD_LABEL = { '대면': '대면', '화상': '화상', '서면': '서면' };

function CareerTimeline({ items }) {
  if (!items || items.length === 0) return null;
  const sorted = [...items].sort((a, b) => {
    const aY = a.isCurrent ? 9999 : (Number(a.endYear) || 0);
    const bY = b.isCurrent ? 9999 : (Number(b.endYear) || 0);
    return bY - aY;
  });
  return (
    <div className="ep-timeline">
      {sorted.map((item, i) => (
        <div key={i} className="ep-timeline-item">
          <div className="ep-timeline-dot" />
          <div className="ep-timeline-body">
            <div className="ep-timeline-period">
              {item.startYear && `${item.startYear}.${String(item.startMonth||1).padStart(2,'0')}`}
              {' — '}
              {item.isCurrent ? <span style={{color:'var(--primary)',fontWeight:700}}>현재</span>
                : item.endYear ? `${item.endYear}.${String(item.endMonth||1).padStart(2,'0')}` : ''}
            </div>
            <div className="ep-timeline-company">{item.companyName}{item.department ? ` · ${item.department}` : ''}</div>
            <div className="ep-timeline-position">{item.position}</div>
            {item.responsibilities && <p className="ep-timeline-resp">{item.responsibilities}</p>}
            {item.keyAchievements && (
              <div className="ep-timeline-achieve">
                <span className="ep-achieve-icon">✦</span> {item.keyAchievements}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExpertProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getExpert(id).then(data => {
      if (data.success) setExpert(data.expert);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="ep-loading">프로필을 불러오는 중...</div>;
  if (!expert) return <div className="ep-loading">프로필을 찾을 수 없습니다.</div>;

  const hasImg = expert.profileImage;

  return (
    <div className="ep-page">
      {/* 헤더 */}
      <div className="ep-hero">
        <div className="ep-hero-inner">
          <button className="ep-back" onClick={() => navigate(-1)}>← 목록으로</button>
          <div className="ep-hero-card">
            <div className="ep-avatar">
              {hasImg
                ? <img src={`${IMG_BASE}${expert.profileImage}`} alt={expert.name} />
                : <AvatarFallback name={expert.name} size={96} gender={expert.gender} />}
            </div>
            <div className="ep-hero-info">
              <div className="ep-hero-name">{expert.name}</div>
              {(expert.currentTitle || expert.currentCompany) && (
                <div className="ep-hero-title">
                  {expert.currentTitle}{expert.currentTitle && expert.currentCompany ? ' · ' : ''}{expert.currentCompany}
                </div>
              )}
              {expert.field && <div className="ep-hero-field">{expert.field}</div>}
              {expert.description && <p className="ep-hero-desc">{expert.description}</p>}
              <div className="ep-hero-badges">
                {expert.yearsOfExperience > 0 && <span className="ep-badge ep-badge-exp">경력 {expert.yearsOfExperience}년</span>}
                {(expert.availableMethod || []).map(m => (
                  <span key={m} className="ep-badge ep-badge-method">{METHOD_LABEL[m] || m}</span>
                ))}
              </div>
              {expert.linkedinUrl && (
                <a href={expert.linkedinUrl} target="_blank" rel="noopener noreferrer" className="ep-linkedin">
                  LinkedIn 프로필 →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ep-body">
        {/* 상담 가능 주제 */}
        {(expert.consultingTopics || []).length > 0 && (
          <section className="ep-section">
            <h2 className="ep-section-title">상담 가능 주제</h2>
            <div className="ep-topics">
              {expert.consultingTopics.map(t => <span key={t} className="ep-topic-tag">{t}</span>)}
            </div>
          </section>
        )}

        {/* 경력 이력 */}
        {(expert.careerItems || []).length > 0 && (
          <section className="ep-section">
            <h2 className="ep-section-title">경력 이력</h2>
            <CareerTimeline items={expert.careerItems} />
          </section>
        )}

        {/* 컨설팅 가능 분야 & 스타일 */}
        {(expert.consultationExpertise || expert.consultationStyle) && (
          <section className="ep-section">
            <h2 className="ep-section-title">컨설팅 안내</h2>
            {expert.consultationExpertise && (
              <div className="ep-consult-block">
                <div className="ep-consult-label">도움 드릴 수 있는 고민</div>
                <p className="ep-consult-text">{expert.consultationExpertise}</p>
              </div>
            )}
            {expert.consultationStyle && (
              <div className="ep-consult-block" style={{marginTop:16}}>
                <div className="ep-consult-label">상담 방식</div>
                <p className="ep-consult-text">{expert.consultationStyle}</p>
              </div>
            )}
          </section>
        )}

        {/* 자격증 & 학력 */}
        {((expert.certifications||[]).length > 0 || (expert.education||[]).length > 0) && (
          <section className="ep-section">
            <h2 className="ep-section-title">자격증 · 학력</h2>
            {(expert.certifications||[]).length > 0 && (
              <div className="ep-cert-list">
                {expert.certifications.map((c, i) => (
                  <span key={i} className="ep-cert-badge">{c}</span>
                ))}
              </div>
            )}
            {(expert.education||[]).map((ed, i) => (
              <div key={i} className="ep-edu-row">
                <strong>{ed.school}</strong>
                {ed.major && ` · ${ed.major}`}
                {ed.degree && ` (${ed.degree})`}
                {ed.graduationYear && ` · ${ed.graduationYear}년 졸업`}
              </div>
            ))}
          </section>
        )}

        {/* 포트폴리오 */}
        {expert.portfolioUrl && (
          <section className="ep-section">
            <h2 className="ep-section-title">포트폴리오</h2>
            <a href={expert.portfolioUrl} target="_blank" rel="noopener noreferrer" className="ep-portfolio-link">
              {expert.portfolioUrl} →
            </a>
          </section>
        )}

        {/* CTA */}
        <div className="ep-cta-wrap">
          <button className="btn-primary ep-cta" onClick={() => navigate('/ulimjigi')}>
            컨설팅 신청하기
          </button>
        </div>
      </div>
    </div>
  );
}
