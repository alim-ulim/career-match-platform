import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { AvatarFallback, HandshakeIcon, UserBadgeIcon, GrowthIcon } from '../components/Icons';

const HOW_TO_STEPS = [
  { num: '01', title: '울림지기 탐색', desc: '분야·경력별로 등록된 울림지기를 찾아 프로필과 커리어를 확인합니다.' },
  { num: '02', title: '컨설팅 신청', desc: '지금 고민하는 커리어 방향이나 전환 목표를 작성해 컨설팅을 신청합니다.' },
  { num: '03', title: '1:1 미팅 & 리포트', desc: '울림지기와 1:1로 만나 진솔한 대화를 나누고, 맞춤 커리어 리포트를 받습니다.' },
  { num: '04', title: '기업 연결 (선택)', desc: '리포트를 바탕으로 원하는 경우 파트너 기업 추천을 신청할 수 있습니다.' },
];

export default function Home() {
  const { user } = useAuth();
  const { toast, showToast } = useToast();
  const [ulimjigis, setUlimjigis] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [feedIdx, setFeedIdx] = useState(0);

  useEffect(() => {
    api.getExperts().then(d => setUlimjigis(Array.isArray(d) ? d : []));
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
    }).then(() => { showToast('컨설팅 신청이 완료되었습니다!'); setSelectedItem(null); });
  };

  const handleEvaluate = (id, evalData) => {
    api.evaluateConsultation(id, evalData)
      .then(() => { showToast('커리어 리포트가 제출되었습니다.'); setSelectedItem(null); });
  };

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

      {/* ── Hero ── */}
      <section className="hero" style={{ backgroundImage: "url('/hero_bg.png')" }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-brand-badge">울림</div>
          <h1 className="hero-title">진심은,<br />울림이 됩니다</h1>
          <p className="hero-sub">
            10년 이상 현직에서 쌓은 진짜 경험이<br />
            당신의 다음 커리어에 확신을 전합니다.
          </p>

          {feeds.length > 0 && (
            <div className="live-feed">
              <span className="live-dot" />
              <span className="live-text">{feeds[feedIdx]}</span>
            </div>
          )}

          <div className="hero-btns">
            <Link to="/ulimjigi" className="btn-hero-primary">울림지기 찾기</Link>
            <Link to="/register" className="btn-hero-outline">지금 시작하기</Link>
          </div>
        </div>
      </section>

      {/* ── 서비스 소개 ── */}
      <section className="about-section">
        <div className="section-header">
          <h2>울림은 어떤 서비스인가요?</h2>
          <p>조언이 아닌 진심. 울림지기의 검증된 리포트로 커리어의 다음 경로를 설계합니다.</p>
        </div>
        <div className="about-grid">
          <div className="about-card">
            <div className="about-icon-wrap"><HandshakeIcon size={36} color="#00c7ae" /></div>
            <h3>상담이 아닌 결과물</h3>
            <p>세션이 끝나면 사라지는 조언이 아닙니다. 울림지기가 작성한 커리어 리포트가 문서로 남고, 그것이 기업의 채용 제안으로 이어집니다.</p>
          </div>
          <div className="about-card">
            <div className="about-icon-wrap"><UserBadgeIcon size={36} color="#00c7ae" /></div>
            <h3>울림지기</h3>
            <p>10년 이상 현직에서 쌓은 경험을 나누는 사람들. 조언이 아니라 진심을 전합니다. 엄선된 기준으로 선정된 소수 정예 전문가입니다.</p>
          </div>
          <div className="about-card">
            <div className="about-icon-wrap"><GrowthIcon size={36} color="#00c7ae" /></div>
            <h3>전 연령·전 직군</h3>
            <p>취업을 준비하는 이들부터 커리어 전환을 고민하는 시니어까지. 주니어부터 시니어까지, 모든 커리어 고민에 울림이 함께합니다.</p>
          </div>
        </div>
      </section>

      {/* ── 소수 정예 울림지기 ── */}
      <section className="elite-section">
        <div className="elite-inner">
          <div className="elite-badge">울림지기 선정 기준</div>
          <h2 className="elite-title">울림지기는 아무나 될 수 없습니다</h2>
          <p className="elite-desc">
            10년 이상 현직에서 쌓은 경험과 실제 대면 컨설팅 역량을 기준으로 엄선합니다.<br />
            숫자가 적은 이유는 이유가 있습니다 — 그것이 울림의 신뢰입니다.
          </p>
          <div className="elite-criteria">
            <div className="elite-item">
              <span className="elite-icon">✦</span>
              <div>
                <strong>검증된 현직 경력</strong>
                <p>각 분야에서 실제 성과를 낸 전현직 전문가</p>
              </div>
            </div>
            <div className="elite-item">
              <span className="elite-icon">✦</span>
              <div>
                <strong>1:1 대면 컨설팅 역량</strong>
                <p>단순 조언이 아닌 구체적인 커리어 리포트를 작성할 수 있는 역량</p>
              </div>
            </div>
            <div className="elite-item">
              <span className="elite-icon">✦</span>
              <div>
                <strong>추천 책임</strong>
                <p>본인이 서명한 리포트로 파트너 기업에 인재를 직접 추천</p>
              </div>
            </div>
          </div>
          <Link to="/ulimjigi" className="btn-primary elite-cta">울림지기 살펴보기 →</Link>
        </div>
      </section>

      {/* ── 이용 방법 ── */}
      <section className="steps-section">
        <div className="section-header">
          <h2>울림 이용 방법</h2>
          <p>울림지기와 함께하는 4단계 커리어 여정</p>
        </div>
        <div className="role-steps">
          {HOW_TO_STEPS.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="role-step-card">
                <div className="role-step-num" style={{ background: '#00c7ae' }}>{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
              {i < HOW_TO_STEPS.length - 1 && <div className="role-step-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ── 플랫폼 구조 ── */}
      <section className="ecosystem-section">
        <div className="section-header">
          <h2>울림 플랫폼 구조</h2>
          <p>세 참여자가 서로 연결되어 가치를 나누는 신뢰 기반 에코시스템</p>
        </div>
        <div className="ecosystem-flow">
          <div className="eco-node eco-runner">
            <div className="eco-node-icon">🏃</div>
            <div className="eco-node-label">이용자</div>
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
                <span className="eco-arrow-label">커리어 리포트</span>
              </div>
            </div>
          </div>
          <div className="eco-node eco-guide">
            <div className="eco-node-icon">🎯</div>
            <div className="eco-node-label">울림지기</div>
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

        <div className="benefit-grid">
          <div className="benefit-card benefit-runner">
            <div className="benefit-card-header">
              <span className="benefit-badge" style={{ background: '#00c7ae' }}>이용자</span>
              <h3>내 커리어의 방향을 찾다</h3>
            </div>
            <ul className="benefit-list">
              <li><span className="benefit-check">✓</span>울림지기의 맞춤형 1:1 진심 어린 조언</li>
              <li><span className="benefit-check">✓</span>나만의 커리어 리포트로 강점·방향 정립</li>
              <li><span className="benefit-check">✓</span>파트너 기업 채용 시 대상 후보자 등록 가능</li>
              <li><span className="benefit-check">✓</span>채용 공고 지원이 아닌, 기업이 먼저 제안하는 경험</li>
            </ul>
          </div>
          <div className="benefit-card benefit-guide">
            <div className="benefit-card-header">
              <span className="benefit-badge" style={{ background: '#0891b2' }}>울림지기</span>
              <h3>진심을 사회에 전하다</h3>
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
              <li><span className="benefit-check">✓</span>울림지기가 검증·추천한 인재만 열람</li>
              <li><span className="benefit-check">✓</span>전문가가 직접 대면한 인재 추천 가능</li>
              <li><span className="benefit-check">✓</span>합리적인 비용으로 최적의 인재 채용 가능</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 울림지기 미리보기 ── */}
      {ulimjigis.length > 0 && (
        <section className="list-preview-section">
          <div className="section-header">
            <h2>지금 활동 중인 울림지기</h2>
            <Link to="/ulimjigi" className="see-all">전체보기 →</Link>
          </div>
          <div className="card-grid-home">
            {ulimjigis.slice(0, 4).map(item => (
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
