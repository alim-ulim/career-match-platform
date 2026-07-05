import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { AvatarFallback, BuildingIcon } from '../components/Icons';

const FIELDS = ['전체', 'IT', '제조', '금융', '마케팅', '디자인', '개발', '기획', '영업', '인사'];

export default function UserList() {
  const { user } = useAuth();
  const { toast, showToast } = useToast();

  const [list, setList] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fieldFilter, setFieldFilter] = useState('전체');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getExperts(),
      api.getConsultations(),
    ]).then(([data, cons]) => {
      setList(Array.isArray(data) ? data : []);
      setConsultations(Array.isArray(cons) ? cons : []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = list.filter(item => {
    const matchField = fieldFilter === '전체' || (item.field && item.field.includes(fieldFilter));
    const matchSearch = !search || item.name?.includes(search) || item.field?.includes(search) || item.currentCompany?.includes(search);
    return matchField && matchSearch;
  });

  const handleSend = (senderName, message, target) => {
    api.createConsultation({
      senderName, message,
      expertName: target.name, expertId: target._id,
      senderId: user?._id || 'guest'
    }).then(() => { showToast('컨설팅 신청이 완료되었습니다!'); setSelected(null); });
  };

  const handleEvaluate = (id, evalData) => {
    api.evaluateConsultation(id, evalData)
      .then(() => { showToast('커리어 리포트가 제출되었습니다.'); setSelected(null); });
  };

  const reportCount = (expertId) =>
    consultations.filter(c => c.expertId === expertId && c.status === 'completed' && c.evaluation).length;

  return (
    <div className="page-list">
      <Toast toast={toast} />
      <DetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onSend={handleSend}
        onEvaluate={handleEvaluate}
        consultations={consultations}
      />

      {/* ── 히어로 ── */}
      <div className="ulim-hero">
        <div className="ulim-hero-overlay" />
        <div className="ulim-hero-content">
          <span className="ulim-hero-tag">울림지기</span>
          <h1 className="ulim-hero-title">
            10년 이상 현직에서 쌓은 경험을<br />
            나누는 사람들
          </h1>
          <p className="ulim-hero-sub">조언이 아니라 진심을 전합니다.</p>
          <div className="ulim-hero-stats">
            <div className="ulim-stat">
              <strong>{list.length}</strong>
              <span>명의 울림지기</span>
            </div>
            <div className="ulim-stat-divider" />
            <div className="ulim-stat">
              <strong>{consultations.filter(c => c.status === 'completed').length}</strong>
              <span>건의 완료 컨설팅</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 필터 ── */}
      <div className="ulim-filter-wrap">
        <div className="ulim-filter-inner">
          <div className="ulim-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ulim-search-icon">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="ulim-search-input"
              placeholder="이름, 분야, 회사 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="ulim-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          <div className="ulim-field-tags">
            {FIELDS.map(f => (
              <button
                key={f}
                className={`ulim-field-tag ${fieldFilter === f ? 'active' : ''}`}
                onClick={() => setFieldFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <p className="ulim-result-count">
          {fieldFilter !== '전체' || search
            ? `"${[fieldFilter !== '전체' && fieldFilter, search].filter(Boolean).join(' · ')}" 검색 결과 `
            : '전체 '}
          <strong>{filtered.length}명</strong>
        </p>
      </div>

      {/* ── 목록 ── */}
      <div className="ulim-list-wrap">
        {loading ? (
          <div className="loading-wrap">
            <div className="spinner" />
            <p>울림지기를 불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p>조건에 맞는 울림지기가 없습니다.</p>
            <button className="btn-outline" style={{ marginTop: 12 }} onClick={() => { setSearch(''); setFieldFilter('전체'); }}>
              필터 초기화
            </button>
          </div>
        ) : (
          <div className="ulim-grid">
            {filtered.map(item => (
              <div key={item._id} className="ulim-card" onClick={() => setSelected(item)}>
                {/* 상단: 아바타 + 기본 정보 */}
                <div className="ulim-card-top">
                  <div className="ulim-card-avatar">
                    <AvatarFallback name={item.name} size={72} gender={item.gender} />
                  </div>
                  <div className="ulim-card-meta">
                    <div className="ulim-card-name-row">
                      <h3 className="ulim-card-name">{item.name}</h3>
                      {reportCount(item._id) > 0 && (
                        <span className="ulim-report-badge">리포트 {reportCount(item._id)}건</span>
                      )}
                    </div>
                    <div className="ulim-card-tags">
                      {item.yearsOfExperience > 0 && (
                        <span className="ulim-tag ulim-tag-exp">경력 {item.yearsOfExperience}년</span>
                      )}
                      {item.field && (
                        <span className="ulim-tag ulim-tag-field">{item.field}</span>
                      )}
                    </div>
                    {item.currentCompany && (
                      <p className="ulim-card-company">
                        <BuildingIcon size={11} color="#888" />&nbsp;{item.currentCompany}
                      </p>
                    )}
                  </div>
                </div>

                {/* 소개 */}
                {item.description && (
                  <p className="ulim-card-desc">{item.description}</p>
                )}

                {/* 전문 분야 (careerHistory 일부) */}
                {item.consultationExpertise && (
                  <div className="ulim-card-expertise">
                    <span className="ulim-expertise-label">컨설팅 가능 분야</span>
                    <p className="ulim-expertise-text">
                      {item.consultationExpertise.split('\n')[0]}
                    </p>
                  </div>
                )}

                {/* CTA */}
                <div className="ulim-card-footer">
                  <span className="ulim-card-cta">컨설팅 신청하기 →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
