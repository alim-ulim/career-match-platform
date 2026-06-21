import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const close = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" onClick={close}>
        <img src="/alim-ulim.jpg" alt="ProPath Logo" onError={e => e.target.style.display = 'none'} />
        <span>ProPath</span>
      </Link>

      <div className="navbar-menu">
        <Link to="/guides" className="nav-link">커리어 가이드 찾기</Link>
        <Link to="/runners" className="nav-link">커리어 러너 찾기</Link>
        <Link to="/matching" className="nav-link">매칭 현황</Link>
        {user ? (
          <>
            <Link to="/mypage" className="nav-link">마이페이지</Link>
            <button className="btn-outline" onClick={handleLogout}>로그아웃</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">로그인</Link>
            <Link to="/register" className="btn-primary">회원가입</Link>
          </>
        )}
      </div>

      <button
        className={`hamburger ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(o => !o)}
        aria-label="메뉴"
      >
        <span /><span /><span />
      </button>

      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/guides" className="mobile-link" onClick={close}>커리어 가이드 찾기</Link>
          <Link to="/runners" className="mobile-link" onClick={close}>커리어 러너 찾기</Link>
          <Link to="/matching" className="mobile-link" onClick={close}>매칭 현황</Link>
          {user ? (
            <>
              <Link to="/mypage" className="mobile-link" onClick={close}>마이페이지</Link>
              <button className="mobile-link mobile-logout" onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-link" onClick={close}>로그인</Link>
              <Link to="/register" className="mobile-link mobile-register" onClick={close}>회원가입</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
