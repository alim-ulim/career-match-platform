import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { AvatarFallback, BuildingIcon } from '../components/Icons';

const FIELDS = ['전체', 'IT', '제조', '금융', '마케팅', '디자인', '개발', '기획', '영업', '인사'];

export default function UserList() {
  const { pathname } = useLocation();
  const isReferrer = pathname.includes('referrer') || pathname.includes('guide');
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
    setFieldFilter('전체');
    setSearch('');
    Promise.all([
      isReferrer ? api.getExperts() : api.getSeekers(),
      api.getConsultations(),
    ]).then(([data, cons]) => {
      setList(Array.isArray(data) ? data : []);
      setConsultations(Array.isArray(cons) ? cons : []);
    }).finally(() => setLoading(false));
  }, [isReferrer]);

  const filtered = list.filter(item => {
    const matchField = fieldFilter === '전체' || (item.field && item.field.includes(fieldFilter));
    const matchSearch = !search || item.name?.includes(search) || item.field?.includes(search);
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

      <div className="list-hero">
        <div className="hero-overlay" />
        <div className="list-hero-content">
          <p className="list-hero-tag">{isReferrer ? 'REFERRER' : 'SEEKER'}</p>
          <h2>{isReferrer ? '레퍼러 목록' : '시커 목록'}</h2>
          <p>{isReferrer
            ? '엄선된 현직 전문가 레퍼러들을 만나보세요. 아무나 될 수 없습니다.'
            : '커리어 성장을 목표로 하는 시커들을 탐색해 보세요.'
          }</p>
        </div>
      </div>

      <div className="list-container">
        <div className="filter-bar">
          <input
            className="search-input"
            placeholder={isReferrer ? '레퍼러 이름, 분야 검색...' : '시커 이름, 분야 검색...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="filter-tags">
            {FIELDS.map(f => (
              <button
                key={f}
                className={`filter-tag ${fieldFilter === f ? 'active' : ''}`}
                onClick={() => setFieldFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <p className="result-count">총 {filtered.length}명</p>

        {loading ? (
          <div className="loading-wrap">
            <div className="spinner" />
            <p>불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p>조건에 맞는 {isReferrer ? '레퍼러' : '시커'}가 없습니다.</p>
          </div>
        ) : (
          <div className="person-grid">
            {filtered.map(item => (
              <div key={item._id} className="person-card-lg" onClick={() => setSelected(item)}>
                <div className="person-avatar-lg">
                  <AvatarFallback name={item.name} size={88} gender={item.gender} />
                </div>
                <div className="person-info-lg">
                  <div className="person-header">
                    <h4>{item.name}</h4>
                    {isReferrer && reportCount(item._id) > 0 && (
                      <span className="eval-badge">리포트 {reportCount(item._id)}건</span>
                    )}
                  </div>
                  <div className="career-highlight">
                    {item.yearsOfExperience > 0 && (
                      <span className="career-years">경력 {item.yearsOfExperience}년</span>
                    )}
                    {item.currentCompany && (
                      <span className="career-company">
                        <BuildingIcon size={11} color="#555" />&nbsp;{item.currentCompany}
                      </span>
                    )}
                  </div>
                  {item.field && <p className="field-tag" style={{ marginTop: 4 }}>{item.field}</p>}
                  <p className="desc-preview">{item.description || '소개가 없습니다.'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
