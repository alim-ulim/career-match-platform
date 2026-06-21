import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

function useAdminAuth() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('admin_token'));
  const login = async (pw) => {
    const d = await api.adminLogin(pw);
    if (d.success) { localStorage.setItem('admin_token', d.token); setAuthed(true); return true; }
    return false;
  };
  const logout = () => { localStorage.removeItem('admin_token'); setAuthed(false); };
  return { authed, login, logout };
}

function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await onLogin(pw);
    if (!ok) setErr('비밀번호가 틀렸습니다.');
  };
  return (
    <div className="admin-login-wrap">
      <div className="admin-login-box">
        <h2>ProPath 관리자</h2>
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="관리자 비밀번호" value={pw} onChange={e => setPw(e.target.value)} className="admin-input" />
          {err && <p className="admin-err">{err}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>로그인</button>
        </form>
      </div>
    </div>
  );
}

const ROLE_LABEL = { expert: '커리어 가이드', seeker: '커리어 러너', company: '파트너 기업', admin: '관리자' };

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api.adminGetUsers();
    if (d.success) setUsers(d.users);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (user) => {
    setEditId(user._id);
    setEditData({ name: user.name, email: user.email, role: user.role, field: user.field || '', currentCompany: user.currentCompany || '', yearsOfExperience: user.yearsOfExperience || '', bio: user.bio || '', emailVerified: user.emailVerified });
  };
  const saveEdit = async () => {
    await api.adminUpdateUser(editId, editData);
    setEditId(null);
    load();
  };
  const deleteUser = async (id, name) => {
    if (!window.confirm(`"${name}" 유저를 삭제하시겠습니까?`)) return;
    await api.adminDeleteUser(id);
    load();
  };

  if (loading) return <div className="admin-loading">불러오는 중...</div>;

  return (
    <div className="admin-table-wrap">
      <div className="admin-section-header">
        <h3>회원 관리 <span className="admin-count">{users.length}명</span></h3>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th>이름</th><th>이메일</th><th>역할</th><th>분야</th><th>경력</th><th>인증</th><th>관리</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              {editId === u._id ? (
                <>
                  <td><input className="admin-input-sm" value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} /></td>
                  <td><input className="admin-input-sm" value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} /></td>
                  <td>
                    <select className="admin-input-sm" value={editData.role} onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}>
                      <option value="seeker">커리어 러너</option>
                      <option value="expert">커리어 가이드</option>
                      <option value="company">파트너 기업</option>
                    </select>
                  </td>
                  <td><input className="admin-input-sm" value={editData.field} onChange={e => setEditData(d => ({ ...d, field: e.target.value }))} /></td>
                  <td><input className="admin-input-sm" type="number" value={editData.yearsOfExperience} onChange={e => setEditData(d => ({ ...d, yearsOfExperience: e.target.value }))} /></td>
                  <td>
                    <select className="admin-input-sm" value={editData.emailVerified ? 'true' : 'false'} onChange={e => setEditData(d => ({ ...d, emailVerified: e.target.value === 'true' }))}>
                      <option value="true">인증됨</option>
                      <option value="false">미인증</option>
                    </select>
                  </td>
                  <td className="admin-actions">
                    <button className="admin-btn admin-btn-save" onClick={saveEdit}>저장</button>
                    <button className="admin-btn admin-btn-cancel" onClick={() => setEditId(null)}>취소</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{u.name}</td>
                  <td className="admin-email">{u.email}</td>
                  <td><span className={`role-badge role-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span></td>
                  <td>{u.field || '-'}</td>
                  <td>{u.yearsOfExperience ? `${u.yearsOfExperience}년` : '-'}</td>
                  <td><span className={u.emailVerified ? 'verify-ok' : 'verify-no'}>{u.emailVerified ? '✓' : '✗'}</span></td>
                  <td className="admin-actions">
                    <button className="admin-btn admin-btn-edit" onClick={() => startEdit(u)}>수정</button>
                    <button className="admin-btn admin-btn-del" onClick={() => deleteUser(u._id, u.name)}>삭제</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsultationsTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api.adminGetConsultations();
    if (d.success) setList(d.consultations);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!window.confirm('이 상담을 삭제하시겠습니까?')) return;
    await api.adminDeleteConsultation(id);
    load();
  };

  const STATUS_MAP = { pending: '대기', accepted: '진행중', completed: '완료', rejected: '거절' };

  if (loading) return <div className="admin-loading">불러오는 중...</div>;

  return (
    <div className="admin-table-wrap">
      <div className="admin-section-header">
        <h3>상담 관리 <span className="admin-count">{list.length}건</span></h3>
      </div>
      {list.length === 0 ? (
        <p className="admin-empty">등록된 상담이 없습니다.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>신청일</th><th>커리어 러너</th><th>커리어 가이드</th><th>상태</th><th>관리</th></tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c._id}>
                <td>{new Date(c.createdAt).toLocaleDateString('ko')}</td>
                <td>{c.seekerId}</td>
                <td>{c.expertId}</td>
                <td><span className={`status-badge status-${c.status}`}>{STATUS_MAP[c.status] || c.status}</span></td>
                <td><button className="admin-btn admin-btn-del" onClick={() => del(c._id)}>삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.adminStats().then(d => { if (d.success) setStats(d.stats); });
  }, []);
  if (!stats) return <div className="admin-loading">불러오는 중...</div>;
  return (
    <div className="admin-stats-grid">
      {[
        { label: '전체 회원', value: stats.totalUsers },
        { label: '커리어 가이드', value: stats.totalExperts },
        { label: '커리어 러너', value: stats.totalSeekers },
        { label: '파트너 기업', value: stats.totalCompanies },
        { label: '전체 상담', value: stats.totalConsultations },
        { label: '완료 상담', value: stats.completedConsultations },
      ].map(s => (
        <div key={s.label} className="admin-stat-card">
          <div className="admin-stat-val">{s.value}</div>
          <div className="admin-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const { authed, login, logout } = useAdminAuth();
  const [tab, setTab] = useState('stats');

  if (!authed) return <AdminLogin onLogin={login} />;

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h1>ProPath 관리자</h1>
        <button className="admin-logout" onClick={logout}>로그아웃</button>
      </div>
      <div className="admin-tabs">
        {[['stats', '대시보드'], ['users', '회원 관리'], ['consultations', '상담 관리']].map(([key, label]) => (
          <button key={key} className={`admin-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <div className="admin-content">
        {tab === 'stats' && <StatsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'consultations' && <ConsultationsTab />}
      </div>
    </div>
  );
}
