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
        <h2>울림 관리자</h2>
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="관리자 비밀번호" value={pw} onChange={e => setPw(e.target.value)} className="admin-input" />
          {err && <p className="admin-err">{err}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>로그인</button>
        </form>
      </div>
    </div>
  );
}

const ROLE_LABEL = { expert: '울림지기', seeker: '시커', company: '파트너 기업', admin: '관리자' };

const EMPTY_NEW = { name: '', email: '', password: '', role: 'seeker', field: '', currentCompany: '', yearsOfExperience: '', description: '', gender: 'other' };

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [newData, setNewData] = useState(EMPTY_NEW);
  const [createErr, setCreateErr] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api.adminGetUsers();
    if (d.success) setUsers(d.users);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (user) => {
    setEditId(user._id);
    setEditData({
      name: user.name, email: user.email, role: user.role,
      field: user.field || '', currentCompany: user.currentCompany || '',
      yearsOfExperience: user.yearsOfExperience || '',
      description: user.description || '',
      emailVerified: user.emailVerified
    });
  };
  const saveEdit = async () => {
    await api.adminUpdateUser(editId, editData);
    setEditId(null);
    load();
  };
  const deleteUser = async (id, name) => {
    if (!window.confirm(`"${name}" 회원을 삭제하시겠습니까?`)) return;
    await api.adminDeleteUser(id);
    load();
  };
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateErr('');
    const d = await api.adminCreateUser(newData);
    if (d.success) {
      setShowCreate(false);
      setNewData(EMPTY_NEW);
      load();
    } else {
      setCreateErr(d.error || '등록 실패');
    }
  };

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = !search || u.name?.includes(search) || u.email?.includes(search) || u.field?.includes(search);
    return matchRole && matchSearch;
  });

  if (loading) return <div className="admin-loading">불러오는 중...</div>;

  return (
    <div className="admin-table-wrap">
      <div className="admin-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h3>회원 관리 <span className="admin-count">{users.length}명</span></h3>
        <button className="admin-btn admin-btn-save" onClick={() => { setShowCreate(v => !v); setCreateErr(''); }}>
          {showCreate ? '닫기' : '+ 새 회원 등록'}
        </button>
      </div>

      {/* 검색·필터 */}
      <div className="admin-filter-bar">
        <input
          className="admin-input-sm"
          placeholder="이름·이메일·분야 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 2, minWidth: 160 }}
        />
        <select className="admin-input-sm" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">전체 역할</option>
          <option value="seeker">시커</option>
          <option value="expert">울림지기</option>
          <option value="company">파트너 기업</option>
          <option value="admin">관리자</option>
        </select>
        <span className="admin-filter-count">총 {filtered.length}명</span>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="admin-create-form">
          <div className="admin-create-row">
            <input className="admin-input-sm" placeholder="이름 *" value={newData.name} onChange={e => setNewData(d => ({ ...d, name: e.target.value }))} required />
            <input className="admin-input-sm" placeholder="이메일 *" type="email" value={newData.email} onChange={e => setNewData(d => ({ ...d, email: e.target.value }))} required />
            <input className="admin-input-sm" placeholder="비밀번호 *" type="password" value={newData.password} onChange={e => setNewData(d => ({ ...d, password: e.target.value }))} required />
            <select className="admin-input-sm" value={newData.role} onChange={e => setNewData(d => ({ ...d, role: e.target.value }))}>
              <option value="seeker">시커</option>
              <option value="expert">울림지기</option>
              <option value="company">파트너 기업</option>
            </select>
          </div>
          <div className="admin-create-row">
            <input className="admin-input-sm" placeholder="분야 (예: IT, 마케팅)" value={newData.field} onChange={e => setNewData(d => ({ ...d, field: e.target.value }))} />
            <input className="admin-input-sm" placeholder="소속 회사" value={newData.currentCompany} onChange={e => setNewData(d => ({ ...d, currentCompany: e.target.value }))} />
            <input className="admin-input-sm" placeholder="경력 (년)" type="number" min="0" value={newData.yearsOfExperience} onChange={e => setNewData(d => ({ ...d, yearsOfExperience: e.target.value }))} />
            <select className="admin-input-sm" value={newData.gender} onChange={e => setNewData(d => ({ ...d, gender: e.target.value }))}>
              <option value="other">성별 미지정</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>
          <div className="admin-create-row">
            <input className="admin-input-sm" style={{ flex: 3 }} placeholder="소개 (선택)" value={newData.description} onChange={e => setNewData(d => ({ ...d, description: e.target.value }))} />
            <button type="submit" className="admin-btn admin-btn-save">등록</button>
          </div>
          {createErr && <p className="admin-err">{createErr}</p>}
        </form>
      )}

      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr><th>이름</th><th>이메일</th><th>역할</th><th>분야</th><th>경력</th><th>소속</th><th>이메일 인증</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#aaa', padding: '24px' }}>조건에 맞는 회원이 없습니다.</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u._id}>
                {editId === u._id ? (
                  <>
                    <td><input className="admin-input-sm" value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} /></td>
                    <td><input className="admin-input-sm" value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} /></td>
                    <td>
                      <select className="admin-input-sm" value={editData.role} onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}>
                        <option value="seeker">시커</option>
                        <option value="expert">울림지기</option>
                        <option value="company">파트너 기업</option>
                        <option value="admin">관리자</option>
                      </select>
                    </td>
                    <td><input className="admin-input-sm" value={editData.field} onChange={e => setEditData(d => ({ ...d, field: e.target.value }))} /></td>
                    <td><input className="admin-input-sm" type="number" value={editData.yearsOfExperience} onChange={e => setEditData(d => ({ ...d, yearsOfExperience: e.target.value }))} /></td>
                    <td><input className="admin-input-sm" value={editData.currentCompany} onChange={e => setEditData(d => ({ ...d, currentCompany: e.target.value }))} /></td>
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
                    <td><strong>{u.name}</strong></td>
                    <td className="admin-email">{u.email}</td>
                    <td><span className={`role-badge role-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span></td>
                    <td>{u.field || '-'}</td>
                    <td>{u.yearsOfExperience ? `${u.yearsOfExperience}년` : '-'}</td>
                    <td>{u.currentCompany || '-'}</td>
                    <td><span className={u.emailVerified ? 'verify-ok' : 'verify-no'}>{u.emailVerified ? '✓ 인증' : '✗ 미인증'}</span></td>
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
    </div>
  );
}

function ConsultationsTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api.adminGetConsultations();
    if (d.success) setList(d.consultations);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!window.confirm('이 상담 내역을 삭제하시겠습니까?')) return;
    await api.adminDeleteConsultation(id);
    load();
  };

  const STATUS_MAP = {
    requested: { label: '수락 대기', cls: 'status-requested' },
    accepted:  { label: '진행중',   cls: 'status-accepted' },
    completed: { label: '완료',     cls: 'status-completed' },
    rejected:  { label: '거절',     cls: 'status-rejected' },
  };

  const filtered = statusFilter === 'all' ? list : list.filter(c => c.status === statusFilter);

  if (loading) return <div className="admin-loading">불러오는 중...</div>;

  return (
    <div className="admin-table-wrap">
      <div className="admin-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h3>상담 관리 <span className="admin-count">{list.length}건</span></h3>
      </div>

      <div className="admin-filter-bar">
        <select className="admin-input-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">전체 상태</option>
          <option value="requested">수락 대기</option>
          <option value="accepted">진행중</option>
          <option value="completed">완료</option>
          <option value="rejected">거절</option>
        </select>
        <span className="admin-filter-count">총 {filtered.length}건</span>
      </div>

      {filtered.length === 0 ? (
        <p className="admin-empty">해당 조건의 상담 내역이 없습니다.</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr><th>신청일</th><th>시커</th><th>울림지기</th><th>상태</th><th>일정</th><th>리포트</th><th>관리</th></tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c._id}>
                  <td>{new Date(c.createdAt).toLocaleDateString('ko')}</td>
                  <td>{c.senderName || c.senderId || '-'}</td>
                  <td>{c.expertName || c.expertId || '-'}</td>
                  <td>
                    <span className={`status-badge ${STATUS_MAP[c.status]?.cls || ''}`}>
                      {STATUS_MAP[c.status]?.label || c.status}
                    </span>
                  </td>
                  <td>
                    {c.scheduledAt
                      ? <span style={{ fontSize: '0.78rem', color: c.scheduleStatus === 'confirmed' ? '#059669' : '#d97706' }}>
                          {c.scheduleStatus === 'confirmed' ? '✓ 확정' : '⏳ 제안중'}<br />
                          {new Date(c.scheduledAt).toLocaleDateString('ko')}
                        </span>
                      : '-'}
                  </td>
                  <td>{c.reportFile ? <span style={{ color: '#059669', fontSize: '0.82rem' }}>✓ 업로드됨</span> : '-'}</td>
                  <td><button className="admin-btn admin-btn-del" onClick={() => del(c._id)}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        { label: '울림지기', value: stats.totalExperts },
        { label: '시커', value: stats.totalSeekers },
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
        <h1>울림 관리자</h1>
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
