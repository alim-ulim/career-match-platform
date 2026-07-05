import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">울림</div>
            <p className="footer-tagline">진심은, 울림이 됩니다</p>
            <p className="footer-desc">
              10년 이상 현직에서 쌓은 진짜 경험이<br />
              당신의 다음 커리어에 확신을 전합니다.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <h4>서비스</h4>
              <Link to="/ulimjigi">울림지기 찾기</Link>
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

        <div className="footer-divider" />

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
            © {new Date().getFullYear()} Alim&amp;Ulim. All rights reserved. 울림은 알림앤울림의 서비스입니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
