import React, { useState, useEffect } from 'react';
import { api } from '../api';

const STATUS_MAP = {
  accepted: { label: '매칭 진행중', color: '#0891b2', bg: '#e0f2fe' },
  completed: { label: '컨설팅 완료', color: '#16a34a', bg: '#dcfce7' },
};

export default function MatchingStatus() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublicMatches().then(d => {
      if (d.success) setList(d.list);
      setLoading(false);
    });
  }, []);

  return (
    <div className="policy-page">
      <div className="policy-container" style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: 8 }}>매칭 현황</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
          ProPath에서 진행 중인 커리어 컨설팅 매칭 현황입니다.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 32 }}>
          개인정보 보호를 위해 이름 일부는 마스킹 처리됩니다.
        </p>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 0' }}>불러오는 중...</p>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
            <p style={{ fontSize: '1.1rem' }}>아직 진행 중인 매칭이 없습니다.</p>
            <p style={{ fontSize: '0.9rem', marginTop: 8 }}>첫 번째 매칭의 주인공이 되어보세요!</p>
          </div>
        ) : (
          <div className="matching-list">
            {list.map((item, i) => {
              const st = STATUS_MAP[item.status] || STATUS_MAP.accepted;
              return (
                <div key={item._id || i} className="matching-card">
                  <div className="matching-card-left">
                    <span className="matching-num">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="matching-card-body">
                    <div className="matching-names">
                      <span className="matching-role runner">시커</span>
                      <strong>{item.senderName}</strong>
                      <span className="matching-arrow">→</span>
                      <span className="matching-role guide">울림지기</span>
                      <strong>{item.expertName}</strong>
                    </div>
                    <div className="matching-meta">
                      <span className="matching-date">
                        {new Date(item.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="matching-card-right">
                    <span className="matching-status" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
