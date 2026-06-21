import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">

        {/* 상단: 브랜드 + 링크 */}
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">ProPath</div>
            <p className="footer-tagline">커리어를 함께 설계하다</p>
            <p className="footer-desc">
              현직 전문가의 진짜 경험으로<br />
              올바른 커리어 경로를 찾아드립니다.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <h4>서비스</h4>
              <Link to="/guides">커리어 가이드 찾기</Link>
              <Link to="/runners">커리어 러너 찾기</Link>
              <Link to="/register">회원가입</Link>
            </div>
            <div className="footer-col">
              <h4>회사</h4>
              <Link to="/privacy">개인정보처리방침</Link>
              <Link to="/terms">이용약관</Link>
              <a href="mailto:faithor@naver.com">문의하기</a>
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="footer-divider" />

        {/* 하단: 사업자 정보 */}
        <div className="footer-bottom">
          <div className="biz-info">
            <span><strong>상호명</strong> 알림앤울림(Alim&amp;Ulim)</span>
            <span className="footer-sep">|</span>
            <span><strong>대표</strong> 김호덕</span>
            <span className="footer-sep">|</span>
            <span><strong>사업자등록번호</strong> 357-06-02380</span>
            <span className="footer-sep">|</span>
            <span><strong>이메일</strong> faithor@naver.com</span>
          </div>
          <div className="biz-info biz-info-sm">
            <span><strong>주소</strong> 서울특별시 관악구 은천로 110 WS타워 806호</span>
          </div>
          <p className="footer-copy">
            © {new Date().getFullYear()} Alim&amp;Ulim. All rights reserved. ProPath는 알림앤울림의 서비스입니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
