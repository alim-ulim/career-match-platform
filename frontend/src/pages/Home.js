import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { AvatarFallback, HandshakeIcon, UserBadgeIcon, GrowthIcon } from '../components/Icons';

const HOW_TO = {
  runner: {
    label: '커리어 러너',
    color: '#00c7ae',
    steps: [
      { num: '01', title: '커리어 가이드 탐색', desc: '분야·경력별로 등록된 커리어 가이드를 찾아 프로필과 커리어를 확인합니다.' },
      { num: '02', title: '컨설팅 신청', desc: '현재 고민하는 커리어 방향이나 전환 목표를 작성해 컨설팅을 신청합니다.' },
      { num: '03', title: '커리어 리포트 수령', desc: '가이드가 커리어 방향에 대한 맞춤 조언과 로드맵을 담은 리포트를 작성합니다.' },
      { num: '04', title: '기업 추천 신청 (선택)', desc: '리포트를 받은 후, 원하는 경우 파트너 기업 추천을 직접 신청할 수 있습니다.' },
    ]
  },
  guide: {
    label: '커리어 가이드',
    color: '#0891b2',
    steps: [
      { num: '01', title: '프로필 등록', desc: '현직 경력, 분야, 전문성을 담은 프로필을 등록하고 커리어 러너의 요청을 받습니다.' },
      { num: '02', title: '컨설팅 요청 수락', desc: '러너의 고민과 목표를 확인하고 컨설팅 진행 여부를 결정합니다.' },
      { num: '03', title: '커리어 리포트 작성', desc: '러너의 커리어 방향에 대한 조언, 전략, 로드맵을 담은 커리어 리포트를 작성합니다.' },
      { num: '04', title: '파트너 기업 추천', desc: '리포트 작성 후, 적합하다고 판단되면 파트너 기업 추천 대상으로 등록합니다.' },
    ]
  },
  company: {
    label: '파트너 기업',
    color: '#7c3aed',
    steps: [
      { num: '01', title: '파트너십 가입', desc: '채용 니즈와 선호 직무를 등록하고 파트너 기업으로 가입합니다.' },
      { num: '02', title: '커리어 러너 탐색', desc: '커리어 가이드가 추천한 러너 목록과 커리어 리포트를 확인합니다.' },
      { num: '03', title: '리포트 기반 면접 제안', desc: '커리어 리포트로 검증된 인재에게 면접 또는 채용 제안을 직접 보낼 수 있습니다.' },
    ]
  }
};

export default function Home() {
  const { user } = useAuth();
  const { toast, showToast } = useToast();
  const [guides, setGuides] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [feedIdx, setFeedIdx] = useState(0);
  const [activeRole, setActiveRole] = useState('runner');

  useEffect(() => {
    api.getExperts().then(d => setGuides(Array.isArray(d) ? d : []));
    api.getConsultations().then(d => setConsultations(Array.isArray(d) ? d : []));
    api.getLiveFeeds().then(d => { if (d.success) setFeeds(d.feeds); });
  }, []);

  useEffect(() => {
    if (!feeds.length) return;
    const t = setInterval(() => setFeedIdx(i => (i + 1) % feeds.length), 3500);
    return () => clearInterval(t);
  }, [feeds]);

  const handleSend = (senderName, message, target) => {
    api.createConsultation({
      senderName, message,
      expertName: target.name, expertId: target._id,
      senderId: user?._id || 'guest'
    }).then(() => { showToast('커리어 컨설팅 신청이 완료되었습니다!'); setSelectedItem(null); });
  };

  const handleEvaluate = (id, evalData) => {
    api.evaluateConsultation(id, evalData)
      .then(() => { showToast('커리어 리포트가 제출되었습니다.'); setSelectedItem(null); });
  };

  const current = HOW_TO[activeRole];

  return (
    <div className="page-home">
      <Toast toast={toast} />
      <DetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSend={handleSend}
        onEvaluate={handleEvaluate}
        consultations={consultations}
      />

      {/* Hero */}
      <section className="hero" style={{ backgroundImage: "url('/hero_bg.png')" }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-title">커리어를 함께 설계하다</h1>
          <p className="hero-sub">
            10년차 현직 커리어 가이드의 조언으로<br />
            올바른 커리어 방향을 찾고, 파트너 기업과 연결됩니다.
          </p>

          {feeds.length > 0 && (
            <div className="live-feed">
              <span className="live-dot" />
              <span className="live-text">{feeds[feedIdx]}</span>
            </div>
          )}

          <div className="hero-btns">
            <Link to="/guides" className="btn-hero-primary">커리어 가이드 찾기</Link>
            <Link to="/runners" className="btn-hero-outline">커리어 러너 찾기</Link>
          </div>
        </div>
      </section>

      {/* ProPath 의미 */}
      <section className="propath-meaning">
        <div className="meaning-inner">
          <div className="meaning-logo">ProPath</div>
          <div className="meaning-divider" />
          <div className="meaning-text">
            <div className="meaning-item">
              <span className="meaning-word">Pro</span>
              <span className="meaning-desc">Professional — 10년 이상의 현직 경험을 가진 진짜 전문가</span>
            </div>
            <div className="meaning-item">
              <span className="meaning-word">Path</span>
              <span className="meaning-desc">Pathway — 커리어의 올바른 방향과 성장 경로</span>
            </div>
          </div>
          <div className="meaning-divider" />
          <p className="meaning-tagline">ProPath는 현직 전문가의 진짜 경험으로 당신의 커리어 경로를 설계합니다.</p>
        </div>
      </section>

      {/* 서비스 소개 */}
      <section className="about-section">
        <div className="section-header">
          <h2>ProPath는 어떤 서비스인가요?</h2>
          <p>현직 커리어 가이드의 조언으로 검증된 커리어 러너를 파트너 기업에 연결하는 신뢰 기반 플랫폼</p>
        </div>
        <div className="about-grid">
          <div className="about-card">
            <div className="about-icon-wrap">
              <HandshakeIcon size={36} color="#00c7ae" />
            </div>
            <h3>신뢰 기반 매칭 모델</h3>
            <p>단순 채용 공고가 아닙니다. 커리어 가이드가 작성한 커리어 리포트로 검증된 인재만을 파트너 기업과 연결하는 프리미엄 서비스입니다.</p>
          </div>
          <div className="about-card">
            <div className="about-icon-wrap">
              <UserBadgeIcon size={36} color="#00c7ae" />
            </div>
            <h3>커리어 가이드 (Career Guide)</h3>
            <p>10년 이상 현직 경험을 보유한 멘토입니다. 커리어 러너의 고민을 듣고 방향을 조언하며, 맞춤형 커리어 리포트를 통해 파트너 기업에 인재를 추천합니다.</p>
          </div>
          <div className="about-card">
            <div className="about-icon-wrap">
              <GrowthIcon size={36} color="#00c7ae" />
            </div>
            <h3>커리어 러너 (Career Runner)</h3>
            <p>더 나은 커리어 방향을 찾는 인재입니다. 커리어 가이드에게 컨설팅을 받고 리포트를 바탕으로, 원하는 경우 파트너 기업의 제안을 받을 수 있습니다.</p>
          </div>
        </div>
      </section>

      {/* 플랫폼 구조 */}
      <section className="ecosystem-section">
        <div className="section-header">
          <h2>ProPath 플랫폼 구조</h2>
          <p>세 참여자가 서로 연결되어 가치를 나누는 신뢰 기반 에코시스템</p>
        </div>

        {/* 관계 흐름도 */}
        <div className="ecosystem-flow">
          <div className="eco-node eco-runner">
            <div className="eco-node-icon">🏃</div>
            <div className="eco-node-label">커리어 러너</div>
            <div className="eco-node-sub">커리어 방향을 찾는 인재</div>
          </div>
          <div className="eco-arrow-block">
            <div className="eco-arrow-row">
              <div className="eco-arrow-shaft forward">
                <span className="eco-arrow-label">컨설팅 신청</span>
                <svg className="eco-svg-arrow" viewBox="0 0 60 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 8 H52" stroke="#00c7ae" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M48 3 L58 8 L48 13" stroke="#00c7ae" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
            </div>
            <div className="eco-arrow-row">
              <div className="eco-arrow-shaft backward">
                <svg className="eco-svg-arrow" viewBox="0 0 60 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M60 8 H8" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 3 L2 8 L12 13" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span className="eco-arrow-label">커리어 방향 수립</span>
              </div>
            </div>
          </div>
          <div className="eco-node eco-guide">
            <div className="eco-node-icon">🎯</div>
            <div className="eco-node-label">커리어 가이드</div>
            <div className="eco-node-sub">전현직 각 분야 전문가</div>
          </div>
          <div className="eco-arrow-block">
            <div className="eco-arrow-row">
              <div className="eco-arrow-shaft forward">
                <span className="eco-arrow-label">인재 추천</span>
                <svg className="eco-svg-arrow" viewBox="0 0 60 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 8 H52" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M48 3 L58 8 L48 13" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
            </div>
            <div className="eco-arrow-row">
              <div className="eco-arrow-shaft backward">
                <svg className="eco-svg-arrow" viewBox="0 0 60 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M60 8 H8" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 3 L2 8 L12 13" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span className="eco-arrow-label">파트너십</span>
              </div>
            </div>
          </div>
          <div className="eco-node eco-company">
            <div className="eco-node-icon">🏢</div>
            <div className="eco-node-label">파트너 기업</div>
            <div className="eco-node-sub">검증된 인재를 채용</div>
          </div>
        </div>

        {/* 역할별 장점 카드 */}
        <div className="benefit-grid">
          <div className="benefit-card benefit-runner">
            <div className="benefit-card-header">
              <span className="benefit-badge" style={{ background: '#00c7ae' }}>커리어 러너</span>
              <h3>내 커리어의 방향을 찾다</h3>
            </div>
            <ul className="benefit-list">
              <li><span className="benefit-check">✓</span>10년+ 현직 가이드의 맞춤형 1:1 조언</li>
              <li><span className="benefit-check">✓</span>나만의 커리어 리포트로 강점·방향 정립</li>
              <li><span className="benefit-check">✓</span>파트너 기업 채용 시 대상 후보자 등록 가능</li>
              <li><span className="benefit-check">✓</span>채용 공고 지원이 아닌, 기업이 먼저 제안하는 경험</li>
            </ul>
          </div>
          <div className="benefit-card benefit-guide">
            <div className="benefit-card-header">
              <span className="benefit-badge" style={{ background: '#0891b2' }}>커리어 가이드</span>
              <h3>전문성을 사회에 환원하다</h3>
            </div>
            <ul className="benefit-list">
              <li><span className="benefit-check">✓</span>현직 경험을 활용해 후배를 실질적으로 돕는 기회</li>
              <li><span className="benefit-check">✓</span>커리어 리포트 작성으로 전문가 브랜드 강화</li>
              <li><span className="benefit-check">✓</span>파트너 기업과의 네트워크 자연스럽게 확장</li>
            </ul>
          </div>
          <div className="benefit-card benefit-company">
            <div className="benefit-card-header">
              <span className="benefit-badge" style={{ background: '#7c3aed' }}>파트너 기업</span>
              <h3>검증된 인재와 연결되다</h3>
            </div>
            <ul className="benefit-list">
              <li><span className="benefit-check">✓</span>커리어 가이드가 검증·추천한 인재만 열람</li>
              <li><span className="benefit-check">✓</span>전문가가 직접 대면한 인재 추천 가능</li>
              <li><span className="benefit-check">✓</span>채용 공고 없이도 적합 인재에게 직접 제안</li>
              <li><span className="benefit-check">✓</span>이직 의사가 있는 인재 위주 — 채용 효율 극대화</li>
            </ul>
          </div>
        </div>

        {/* 핵심 차별점 */}
        <div className="diff-strip">
          <div className="diff-item">
            <span className="diff-num">01</span>
            <div>
              <strong>가이드 검증 필터</strong>
              <p>현직 전문가가 직접 평가·추천한 인재만 기업과 연결됩니다.</p>
            </div>
          </div>
          <div className="diff-divider" />
          <div className="diff-item">
            <span className="diff-num">02</span>
            <div>
              <strong>리포트 기반 신뢰</strong>
              <p>자기소개서 대신 커리어 리포트로 인재를 입체적으로 파악합니다.</p>
            </div>
          </div>
          <div className="diff-divider" />
          <div className="diff-item">
            <span className="diff-num">03</span>
            <div>
              <strong>러너 주도권 보장</strong>
              <p>기업 추천 신청은 러너가 직접 결정 — 원치 않으면 리포트만 받아도 됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 이용 방법 — 역할별 탭 */}
      <section className="steps-section">
        <div className="section-header">
          <h2>ProPath 이용 방법</h2>
          <p>역할에 따라 ProPath를 이용하는 방법이 다릅니다</p>
        </div>

        <div className="role-tabs">
          {Object.entries(HOW_TO).map(([key, val]) => (
            <button
              key={key}
              className={`role-tab ${activeRole === key ? 'active' : ''}`}
              style={activeRole === key ? { borderColor: val.color, color: val.color } : {}}
              onClick={() => setActiveRole(key)}
            >
              {val.label}
            </button>
          ))}
        </div>

        <div className="role-steps">
          {current.steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="role-step-card">
                <div className="role-step-num" style={{ background: current.color }}>{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
              {i < current.steps.length - 1 && <div className="role-step-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 커리어 가이드 미리보기 */}
      {guides.length > 0 && (
        <section className="list-preview-section">
          <div className="section-header">
            <h2>검증된 커리어 가이드를 만나보세요</h2>
            <Link to="/guides" className="see-all">전체보기 →</Link>
          </div>
          <div className="card-grid-home">
            {guides.slice(0, 4).map(item => (
              <div key={item._id} className="guide-card" onClick={() => setSelectedItem(item)}>
                <div className="guide-card-avatar">
                  <AvatarFallback name={item.name} size={80} gender={item.gender} />
                </div>
                <div className="guide-card-info">
                  <h4>{item.name}</h4>
                  {item.yearsOfExperience > 0 && (
                    <p className="guide-career">경력 {item.yearsOfExperience}년차</p>
                  )}
                  {item.currentCompany && (
                    <p className="guide-company">{item.currentCompany}</p>
                  )}
                  {item.field && <p className="guide-field">{item.field}</p>}
                  {item.description && (
                    <p className="guide-desc">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
