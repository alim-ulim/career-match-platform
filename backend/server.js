const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'alimulim_secret_key';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || '울림 <noreply@ulim.kr>';

// 이메일 발송 (Resend)
async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.log(`[DEV] 이메일 발송 생략 (RESEND_API_KEY 없음): ${to} / ${subject}`);
    return true;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
  });
  if (!res.ok) { console.error('Resend 오류:', await res.text()); return false; }
  return true;
}
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- 데이터 모델 ---
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  phone: String,
  role: { type: String, enum: ['expert', 'seeker', 'company', 'admin'], default: 'seeker' },
  field: String,
  description: String,
  profileImage: String,
  resume: String,
  date: { type: Date, default: Date.now },
  yearsOfExperience: { type: Number, default: 0 },
  currentCompany: { type: String, default: '' },
  languages: { type: [String], default: ['ko'] },
  nationality: { type: String, default: 'KR' },
  companyName: { type: String, default: '' },
  companySize: { type: Number, default: 1 },
  planType: { type: String, enum: ['micro', 'scaleup', 'enterprise', 'none'], default: 'none' },
  paymentMethod: { type: String, enum: ['lump-sum', 'subscription', 'none'], default: 'none' },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: { type: String, default: '' },
  emailVerifyExpires: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  // 레거시 자유텍스트 경력 (하위 호환)
  careerHistory: { type: String, default: '' },
  achievements: { type: String, default: '' },
  consultationExpertise: { type: String, default: '' },
  consultationStyle: { type: String, default: '' },
  // 구조화된 경력 (울림지기)
  currentTitle: { type: String, default: '' },
  careerItems: { type: [{
    companyName: String,
    department: String,
    position: String,
    startYear: Number,
    startMonth: Number,
    endYear: Number,
    endMonth: Number,
    isCurrent: { type: Boolean, default: false },
    responsibilities: String,
    keyAchievements: String,
  }], default: [] },
  // 전문성 증빙
  certifications: { type: [String], default: [] },
  education: { type: [{
    school: String,
    major: String,
    degree: { type: String, enum: ['학사', '석사', '박사', '기타'], default: '학사' },
    graduationYear: Number,
  }], default: [] },
  linkedinUrl: { type: String, default: '' },
  careerProofDocument: { type: String, default: '' },
  portfolioUrl: { type: String, default: '' },
  // 컨설팅 정보
  consultingTopics: { type: [String], default: [] },
  availableMethod: { type: [String], default: [] },
  selfIntroVideoUrl: { type: String, default: '' },
  // 울림지기 승인 상태
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvalNote: { type: String, default: '' },
});

const ConsultationSchema = new mongoose.Schema({
  senderName: String,
  senderId: String,
  expertName: String,
  expertId: String,
  expertCompany: String,
  expertExp: Number,
  message: String,
  consultationType: { type: String, default: '취업준비' },
  status: { type: String, enum: ['requested', 'accepted', 'rejected', 'completed'], default: 'requested' },
  createdAt: { type: Date, default: Date.now },
  // 메시지 스레드 (가이드 ↔ 러너)
  messages: [{
    sender: { type: String, enum: ['guide', 'runner'] },
    senderName: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  // 컨설팅 일정 (제안 → 수락 흐름)
  scheduledAt: Date,
  scheduleNote: String,
  scheduleStatus: { type: String, enum: ['proposed', 'confirmed'], default: null },
  scheduledBy: { type: String, enum: ['guide', 'runner'], default: null },
  // 커리어 리포트 PDF (가이드 업로드)
  reportFile: String,
  reportUploadedAt: Date,
  // legacy 평가 필드 (하위호환)
  evaluation: {
    rating: Number,
    pros: String,
    cons: String,
    recommendation: String,
    isHighlyRecommended: { type: Boolean, default: false },
    recommendedRoles: { type: [String], default: [] },
    createdAt: Date
  }
});

let User;
let Consultation;

// --- Fallback JSON DB ---
let isFallbackMode = false;
let fallbackUsers = [];
let fallbackConsultations = [];

const usersFilePath = path.join(__dirname, '..', 'users.json');
const expertsFilePath = path.join(__dirname, '..', 'experts.json');
const consultationsFilePath = path.join(__dirname, '..', 'consultations.json');

function loadFallbackData() {
  try {
    const users = fs.existsSync(usersFilePath) ? JSON.parse(fs.readFileSync(usersFilePath, 'utf8')) : [];
    const experts = fs.existsSync(expertsFilePath) ? JSON.parse(fs.readFileSync(expertsFilePath, 'utf8')) : [];
    const seen = new Set();
    fallbackUsers = [...users, ...experts].filter(u => {
      const key = u._id || u.email;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    fallbackConsultations = fs.existsSync(consultationsFilePath)
      ? JSON.parse(fs.readFileSync(consultationsFilePath, 'utf8'))
      : [];
    console.log(`[Fallback DB] Loaded ${fallbackUsers.length} users, ${fallbackConsultations.length} consultations.`);
  } catch (err) {
    console.error("Fallback 데이터 로드 실패:", err);
  }
}

function saveFallbackData() {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(fallbackUsers.filter(u => u.role !== 'expert'), null, 2));
    fs.writeFileSync(expertsFilePath, JSON.stringify(fallbackUsers.filter(u => u.role === 'expert'), null, 2));
    fs.writeFileSync(consultationsFilePath, JSON.stringify(fallbackConsultations, null, 2));
  } catch (err) {
    console.error("Fallback 데이터 저장 실패:", err);
  }
}

// --- MockUser ---
class MockUser {
  constructor(data) {
    Object.assign(this, data);
    if (!this._id) this._id = new mongoose.Types.ObjectId().toString();
  }

  toObject() {
    // 메서드를 제외한 순수 데이터 객체 반환
    const { toObject: _, save: __, ...data } = this;
    return data;
  }

  async save() {
    const plain = this.toObject();
    const idx = fallbackUsers.findIndex(u => u.email === this.email);
    if (idx !== -1) { fallbackUsers[idx] = { ...fallbackUsers[idx], ...plain }; }
    else { fallbackUsers.push(plain); }
    saveFallbackData();
    return this;
  }
}

MockUser.findOne = async (query) => {
  let found = null;
  if (query.email && query.emailVerifyToken) {
    found = fallbackUsers.find(u =>
      u.email === query.email &&
      u.emailVerifyToken === query.emailVerifyToken &&
      (!query.emailVerifyExpires || !u.emailVerifyExpires || new Date(u.emailVerifyExpires) > new Date())
    );
  } else if (query.email) {
    found = fallbackUsers.find(u => u.email === query.email);
  } else if (query._id) {
    found = fallbackUsers.find(u => String(u._id) === String(query._id));
  }
  return found ? new MockUser(found) : null;
};

MockUser.find = async (query) => {
  let list = fallbackUsers;
  if (query && query.role) list = list.filter(u => u.role === query.role);
  return list.map(u => new MockUser(u));
};

MockUser.countDocuments = async (query) => {
  let list = fallbackUsers;
  if (query && query.role) list = list.filter(u => u.role === query.role);
  return list.length;
};

MockUser.findOneAndUpdate = async (query, update, opts) => {
  const idx = fallbackUsers.findIndex(u => String(u._id) === String(query._id));
  if (idx === -1) return null;
  fallbackUsers[idx] = { ...fallbackUsers[idx], ...update };
  saveFallbackData();
  return new MockUser(fallbackUsers[idx]);
};

MockUser.findByIdAndDelete = async (id) => {
  const idx = fallbackUsers.findIndex(u => String(u._id) === String(id));
  if (idx !== -1) { fallbackUsers.splice(idx, 1); saveFallbackData(); }
};

MockUser.findByIdAndUpdate = async (id, update, options) => {
  const index = fallbackUsers.findIndex(u => String(u._id) === String(id));
  if (index === -1) return null;
  const updated = { ...fallbackUsers[index], ...update };
  fallbackUsers[index] = updated;
  saveFallbackData();
  return new MockUser(updated);
};

// --- MockConsultation ---
// find()는 sort().limit() 체이닝을 모두 지원하는 빌더 패턴으로 구현
class MockConsultation {
  constructor(data) {
    Object.assign(this, data);
    if (!this._id) this._id = new mongoose.Types.ObjectId().toString();
    if (!this.createdAt) this.createdAt = new Date();
  }

  toObject() {
    const { toObject: _, save: __, ...data } = this;
    return data;
  }

  async save() {
    fallbackConsultations.push(this.toObject());
    saveFallbackData();
    return this;
  }
}

MockConsultation.find = (query) => {
  let list = [...fallbackConsultations];
  if (query) {
    if (query.expertId) list = list.filter(c => String(c.expertId) === String(query.expertId));
    if (query.senderId) list = list.filter(c => String(c.senderId) === String(query.senderId));
    if (query.status) list = list.filter(c => c.status === query.status);
  }

  const builder = {
    _list: list,
    sort(sortQuery) {
      if (sortQuery && sortQuery.createdAt === -1) {
        this._list = [...this._list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      return this;
    },
    limit(num) {
      // limit() 호출 시 최종 배열 반환
      return this._list.slice(0, num).map(c => new MockConsultation(c));
    },
    // await 시 최종 배열 반환 (Promise처럼 동작)
    then(resolve, reject) {
      try {
        resolve(this._list.map(c => new MockConsultation(c)));
      } catch (e) {
        reject(e);
      }
    }
  };
  return builder;
};

MockConsultation.countDocuments = async (query) => {
  let list = fallbackConsultations;
  if (!query) return list.length;
  if (query.status) list = list.filter(c => c.status === query.status);
  // mongoose dot-notation 'evaluation.isHighlyRecommended' 처리
  if (query['evaluation.isHighlyRecommended'] !== undefined) {
    const val = query['evaluation.isHighlyRecommended'];
    list = list.filter(c => c.evaluation && c.evaluation.isHighlyRecommended === val);
  }
  return list.length;
};

MockConsultation.findById = async (id) => {
  const found = fallbackConsultations.find(c => String(c._id) === String(id));
  return found ? new MockConsultation(found) : null;
};

MockConsultation.findByIdAndUpdate = async (id, update, options) => {
  const index = fallbackConsultations.findIndex(c => String(c._id) === String(id));
  if (index === -1) return null;
  const updated = { ...fallbackConsultations[index], ...update };
  fallbackConsultations[index] = updated;
  saveFallbackData();
  return new MockConsultation(updated);
};

// --- API 엔드포인트 ---

// 1. 회원가입
app.post('/api/auth/register', upload.single('profileImage'), async (req, res) => {
  try {
    const {
      email, password, name, role, field, description, phone,
      yearsOfExperience, currentCompany, currentTitle, languages, nationality,
      companyName, companySize, planType, paymentMethod,
      careerHistory, achievements, consultationExpertise, consultationStyle,
      careerItems: careerItemsRaw,
      certifications: certificationsRaw,
      education: educationRaw,
      linkedinUrl, portfolioUrl, selfIntroVideoUrl,
      consultingTopics: consultingTopicsRaw,
      availableMethod: availableMethodRaw,
    } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: "필수 항목이 누락되었습니다." });
    }

    let parsedLanguages = ['ko'];
    if (languages) {
      parsedLanguages = Array.isArray(languages) ? languages : JSON.parse(languages);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email, password: hashedPassword, name, role, field, description, phone,
      yearsOfExperience: Number(yearsOfExperience) || 0,
      currentCompany: currentCompany || '',
      languages: parsedLanguages,
      nationality: nationality || 'KR',
      companyName: companyName || '',
      companySize: Number(companySize) || 1,
      planType: planType || 'none',
      paymentMethod: paymentMethod || 'none',
      profileImage: req.file ? `/uploads/${req.file.filename}` : '',
      careerHistory: careerHistory || '',
      achievements: achievements || '',
      consultationExpertise: consultationExpertise || '',
      consultationStyle: consultationStyle || '',
      currentTitle: currentTitle || '',
      careerItems: careerItemsRaw ? JSON.parse(careerItemsRaw) : [],
      certifications: certificationsRaw ? JSON.parse(certificationsRaw) : [],
      education: educationRaw ? JSON.parse(educationRaw) : [],
      linkedinUrl: linkedinUrl || '',
      portfolioUrl: portfolioUrl || '',
      selfIntroVideoUrl: selfIntroVideoUrl || '',
      consultingTopics: consultingTopicsRaw ? JSON.parse(consultingTopicsRaw) : [],
      availableMethod: availableMethodRaw ? JSON.parse(availableMethodRaw) : [],
      approvalStatus: role === 'expert' ? 'pending' : 'approved',
    });

    // 이메일 인증 토큰 생성 (24시간 유효)
    const verifyToken = crypto.randomBytes(32).toString('hex');
    // 이메일 인증 건너뛰기 (SKIP_EMAIL_VERIFY=true 또는 RESEND_API_KEY 없을 때 자동 인증)
    const skipVerify = process.env.SKIP_EMAIL_VERIFY === 'true' || !RESEND_API_KEY;
    if (skipVerify) {
      newUser.emailVerified = true;
    } else {
      newUser.emailVerifyToken = verifyToken;
      newUser.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await newUser.save();

    if (skipVerify) {
      return res.status(201).json({ success: true, verified: true, message: '가입이 완료되었습니다. 로그인해 주세요.' });
    }

    // 인증 메일 발송
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;
    await sendEmail(email, '[울림] 이메일 인증을 완료해 주세요', `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
        <h2 style="color:#00c7ae;margin-bottom:8px;">울림에 오신 걸 환영합니다!</h2>
        <p style="color:#333;line-height:1.6;margin-bottom:24px;">
          안녕하세요, <strong>${name}</strong>님.<br/>
          아래 버튼을 클릭하면 이메일 인증이 완료되고 울림 서비스를 이용하실 수 있습니다.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#00c7ae;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">이메일 인증하기</a>
        <p style="margin-top:24px;color:#888;font-size:13px;">
          이 링크는 <strong>24시간</strong> 동안 유효합니다.<br/>
          본인이 가입하지 않았다면 이 이메일을 무시하세요.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#bbb;font-size:12px;">울림 — 진심은, 울림이 됩니다</p>
      </div>
    `);

    res.status(201).json({ success: true, message: '가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해 주세요.' });
  } catch (err) {
    const msg = err.code === 11000 ? "이미 사용 중인 이메일입니다." : err.message;
    res.status(400).json({ success: false, error: msg });
  }
});

// 이메일 인증 완료
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ success: false, error: '유효하지 않은 요청입니다.' });

    const user = await User.findOne({
      email,
      emailVerifyToken: token,
      emailVerifyExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: '인증 링크가 만료되었거나 유효하지 않습니다.' });
    }

    user.emailVerified = true;
    user.emailVerifyToken = '';
    user.emailVerifyExpires = undefined;
    await user.save();

    res.json({ success: true, message: '이메일 인증이 완료되었습니다. 로그인해 주세요.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 인증 메일 재발송
app.post('/api/auth/resend-verify', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, error: '이메일을 찾을 수 없습니다.' });
    if (user.emailVerified) return res.json({ success: false, error: '이미 인증된 이메일입니다.' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    user.emailVerifyToken = verifyToken;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;
    await sendEmail(email, '[울림] 이메일 인증을 완료해 주세요', `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <h2 style="color:#00c7ae;">이메일 인증 재발송</h2>
        <a href="${verifyUrl}" style="display:inline-block;background:#00c7ae;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;">이메일 인증하기</a>
        <p style="margin-top:16px;color:#888;font-size:13px;">이 링크는 24시간 동안 유효합니다.</p>
      </div>
    `);

    res.json({ success: true, message: '인증 메일을 재발송했습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. 로그인
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "이메일과 비밀번호를 입력해주세요." });
    }
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: "이메일 또는 비밀번호가 일치하지 않습니다." });
    }
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: "이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해 주세요.",
        needsVerification: true,
        email: user.email
      });
    }
    const uObj = user.toObject ? user.toObject() : { ...user };
    delete uObj.password;
    const token = jwt.sign({ id: uObj._id, role: uObj.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, user: uObj, token });
  } catch (err) {
    res.status(500).json({ success: false, error: "로그인 처리 중 오류가 발생했습니다." });
  }
});

// JWT 인증 미들웨어
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
  }
};

// 토큰으로 현재 유저 조회
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id });
    if (!user) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    const uObj = user.toObject ? user.toObject() : { ...user };
    delete uObj.password;
    res.json({ success: true, user: uObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. 회원 정보 수정
app.put('/api/users/:id', upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'resume', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, phone, field, description, password } = req.body;
    const updateData = { name, phone, field, description };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (req.files && req.files['profileImage']) {
      updateData.profileImage = `/uploads/${req.files['profileImage'][0].filename}`;
    }
    if (req.files && req.files['resume']) {
      updateData.resume = `/uploads/${req.files['resume'][0].filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ success: false, error: "사용자를 찾을 수 없습니다." });

    const userRes = updatedUser.toObject ? updatedUser.toObject() : { ...updatedUser };
    delete userRes.password;
    res.json({ success: true, user: userRes });
  } catch (err) {
    res.status(500).json({ success: false, error: "정보 수정에 실패했습니다." });
  }
});

// 4. 사용자 목록 조회 (비밀번호 필드 제외)
const sanitizeUsers = (list) =>
  list.map(u => {
    const o = u.toObject ? u.toObject() : { ...u };
    delete o.password;
    return o;
  });

app.get('/api/experts', async (req, res) => {
  try { res.json(sanitizeUsers(await User.find({ role: 'expert', approvalStatus: 'approved' }))); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/experts/:id', async (req, res) => {
  try {
    const expert = await User.findOne({ _id: req.params.id, role: 'expert', approvalStatus: 'approved' });
    if (!expert) return res.status(404).json({ success: false, error: '존재하지 않는 프로필입니다.' });
    const o = expert.toObject();
    delete o.password;
    delete o.careerProofDocument;
    res.json({ success: true, expert: o });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 울림지기 프로필 완성 (2단계)
app.patch('/api/users/:id/expert-profile', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'careerProofDocument', maxCount: 1 },
]), async (req, res) => {
  try {
    const {
      currentTitle, certifications: cRaw, education: eRaw,
      linkedinUrl, portfolioUrl, selfIntroVideoUrl,
      consultingTopics: tRaw, availableMethod: mRaw,
      consultationExpertise, consultationStyle,
    } = req.body;
    const updateData = {
      currentTitle: currentTitle || '',
      certifications: cRaw ? JSON.parse(cRaw) : [],
      education: eRaw ? JSON.parse(eRaw) : [],
      linkedinUrl: linkedinUrl || '',
      portfolioUrl: portfolioUrl || '',
      selfIntroVideoUrl: selfIntroVideoUrl || '',
      consultingTopics: tRaw ? JSON.parse(tRaw) : [],
      availableMethod: mRaw ? JSON.parse(mRaw) : [],
      consultationExpertise: consultationExpertise || '',
      consultationStyle: consultationStyle || '',
    };
    if (req.files && req.files['profileImage'])
      updateData.profileImage = `/uploads/${req.files['profileImage'][0].filename}`;
    if (req.files && req.files['careerProofDocument'])
      updateData.careerProofDocument = `/uploads/${req.files['careerProofDocument'][0].filename}`;

    const updated = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    const o = updated.toObject(); delete o.password;
    res.json({ success: true, user: o });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 관리자: 울림지기 전체 목록 (승인 여부 무관)
app.get('/api/admin/experts', async (req, res) => {
  try { res.json(sanitizeUsers(await User.find({ role: 'expert' }))); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 관리자: 울림지기 승인/반려
app.patch('/api/admin/experts/:id/status', async (req, res) => {
  try {
    const { approvalStatus, approvalNote } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { approvalStatus, approvalNote: approvalNote || '' },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    const o = updated.toObject(); delete o.password;
    res.json({ success: true, user: o });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/users', async (req, res) => {
  try { res.json(sanitizeUsers(await User.find({ role: 'seeker' }))); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/companies', async (req, res) => {
  try { res.json(sanitizeUsers(await User.find({ role: 'company' }))); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 5. 메인 통계 (Social Proof)
app.get('/api/main/stats', async (req, res) => {
  try {
    const totalExperts = await User.countDocuments({ role: 'expert' });
    const completedConsultations = await Consultation.countDocuments({ status: 'completed' });
    const totalHiredMatches = await Consultation.countDocuments({ 'evaluation.isHighlyRecommended': true });
    res.json({
      success: true,
      stats: {
        totalExperts,
        completedConsultations,
        totalHiredMatches
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. 메인 실시간 피드
app.get('/api/main/live-feeds', async (req, res) => {
  try {
    const recent = await Consultation.find().sort({ createdAt: -1 }).limit(5);
    const feeds = recent.map(c => {
      const mRunner = c.senderName ? c.senderName[0] + '*' + (c.senderName[2] || '') : '커리어러너';
      const mGuide = c.expertName ? c.expertName[0] + '*' + (c.expertName[2] || '') : '커리어가이드';
      if (c.status === 'completed' && c.evaluation && c.evaluation.isHighlyRecommended) {
        return `[파트너 추천] ${mGuide} 커리어가이드가 ${mRunner}님을 파트너 기업 추천 대상으로 등록했습니다.`;
      } else if (c.status === 'completed') {
        return `[리포트 발행] ${mGuide} 커리어가이드가 ${mRunner}님의 커리어 리포트를 발행했습니다.`;
      } else {
        return `[컨설팅 신청] ${mRunner}님이 ${mGuide} 커리어가이드에게 커리어 컨설팅을 신청했습니다.`;
      }
    });
    res.json({ success: true, feeds });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. 컨설팅 목록 및 신청
app.get('/api/consultations', async (req, res) => {
  try {
    const list = await Consultation.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/consultations', async (req, res) => {
  try {
    const newC = new Consultation(req.body);
    await newC.save();
    res.status(201).json({ success: true, consultation: newC });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 8. 컨설팅 수락
app.patch('/api/consultations/:id/accept', async (req, res) => {
  try {
    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id, { status: 'accepted' }, { new: true }
    );
    if (!consultation) return res.status(404).json({ success: false, error: "상담을 찾을 수 없습니다." });
    res.json({ success: true, consultation });
  } catch (err) {
    res.status(500).json({ success: false, error: "승인 처리 실패" });
  }
});

// 컨설팅 거절
app.patch('/api/consultations/:id/reject', async (req, res) => {
  try {
    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id, { status: 'rejected' }, { new: true }
    );
    if (!consultation) return res.status(404).json({ success: false, error: "상담을 찾을 수 없습니다." });
    res.json({ success: true, consultation });
  } catch (err) {
    res.status(500).json({ success: false, error: "거절 처리 실패" });
  }
});

// 공개 매칭 현황 (개인정보 제외)
app.get('/api/consultations/public', async (req, res) => {
  try {
    const list = await Consultation.find({ status: { $in: ['accepted', 'completed'] } })
      .sort({ createdAt: -1 }).limit(20);
    const masked = list.map(c => ({
      _id: c._id,
      senderName: maskName(c.senderName),
      expertName: maskName(c.expertName),
      expertField: c.expertCompany ? c.expertCompany.slice(0, 2) + '***' : '',
      status: c.status,
      createdAt: c.createdAt,
    }));
    res.json({ success: true, list: masked });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

function maskName(name) {
  if (!name) return '***';
  return name[0] + '*'.repeat(Math.max(name.length - 1, 1));
}

// 메시지 전송 (가이드 또는 러너)
app.post('/api/consultations/:id/messages', async (req, res) => {
  try {
    const { sender, senderName, text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, error: '메시지 내용을 입력해 주세요.' });

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, error: '상담을 찾을 수 없습니다.' });

    const messages = [...(consultation.messages || []), { sender, senderName, text: text.trim(), createdAt: new Date() }];
    const updated = await Consultation.findByIdAndUpdate(req.params.id, { messages }, { new: true });
    res.json({ success: true, consultation: updated });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 컨설팅 일정 제안 (가이드 또는 러너가 날짜 제안)
app.patch('/api/consultations/:id/schedule', async (req, res) => {
  try {
    const { scheduledAt, scheduleNote, proposedBy } = req.body;
    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      {
        scheduledAt: new Date(scheduledAt),
        scheduleNote: scheduleNote || '',
        scheduleStatus: 'proposed',
        scheduledBy: proposedBy || 'guide',
      },
      { new: true }
    );
    if (!consultation) return res.status(404).json({ success: false, error: '상담을 찾을 수 없습니다.' });
    res.json({ success: true, consultation });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 컨설팅 일정 수락 확정 (상대방이 제안된 일정 수락)
app.patch('/api/consultations/:id/schedule/confirm', async (req, res) => {
  try {
    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      { scheduleStatus: 'confirmed' },
      { new: true }
    );
    if (!consultation) return res.status(404).json({ success: false, error: '상담을 찾을 수 없습니다.' });
    res.json({ success: true, consultation });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 커리어 리포트 PDF 업로드 (가이드 → 러너 공개, 상태 completed)
app.post('/api/consultations/:id/report-file', upload.single('reportFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'PDF 파일을 선택해 주세요.' });
    const filePath = `/uploads/${req.file.filename}`;
    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', reportFile: filePath, reportUploadedAt: new Date() },
      { new: true }
    );
    if (!consultation) return res.status(404).json({ success: false, error: '상담을 찾을 수 없습니다.' });
    res.json({ success: true, consultation });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 9. 평가 및 추천서 등록
app.patch('/api/consultations/:id/evaluate', async (req, res) => {
  try {
    const { rating, pros, cons, recommendation, isHighlyRecommended, recommendedRoles } = req.body;
    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        evaluation: {
          rating,
          pros,
          cons,
          recommendation,
          isHighlyRecommended: isHighlyRecommended === true || isHighlyRecommended === 'true',
          recommendedRoles: recommendedRoles || [],
          createdAt: new Date()
        }
      },
      { new: true }
    );
    if (!consultation) return res.status(404).json({ success: false, error: "상담을 찾을 수 없습니다." });
    res.json({ success: true, consultation });
  } catch (err) {
    res.status(500).json({ success: false, error: "리포트 및 추천서 저장 실패" });
  }
});

// ─── 관리자 미들웨어 ───────────────────────────────────────────────────────────
const adminMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ success: false, error: '인증 필요' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ success: false, error: '관리자 권한 필요' });
    req.user = decoded;
    next();
  } catch { res.status(401).json({ success: false, error: '유효하지 않은 토큰' }); }
};

// 관리자 로그인 (별도 시크릿 사용)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const ADMIN_PW = process.env.ADMIN_PASSWORD || 'propath_admin_2024';
  if (password !== ADMIN_PW) return res.status(401).json({ success: false, error: '비밀번호가 틀렸습니다.' });
  const token = jwt.sign({ id: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ success: true, token });
});

// 관리자: 전체 유저 목록
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({});
    res.json({ success: true, users: sanitizeUsers(users) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 관리자: 유저 등록
app.post('/api/admin/users', adminMiddleware, async (req, res) => {
  try {
    const { email, password, name, role, field, description, yearsOfExperience, currentCompany, gender } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: '이메일, 비밀번호, 이름은 필수입니다.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email, password: hashedPassword, name,
      role: role || 'seeker',
      field: field || '',
      description: description || '',
      yearsOfExperience: Number(yearsOfExperience) || 0,
      currentCompany: currentCompany || '',
      gender: gender || 'other',
      emailVerified: true,
    });
    await newUser.save();
    const uObj = newUser.toObject ? newUser.toObject() : { ...newUser };
    delete uObj.password;
    res.status(201).json({ success: true, user: uObj });
  } catch (err) {
    const msg = err.code === 11000 ? '이미 사용 중인 이메일입니다.' : err.message;
    res.status(400).json({ success: false, error: msg });
  }
});

// 관리자: 유저 수정
app.put('/api/admin/users/:id', adminMiddleware, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate({ _id: req.params.id }, updateData, { new: true });
    if (!user) return res.status(404).json({ success: false, error: '유저를 찾을 수 없습니다.' });
    const uObj = user.toObject ? user.toObject() : { ...user };
    delete uObj.password;
    res.json({ success: true, user: uObj });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 관리자: 유저 삭제
app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
  try {
    if (isFallbackMode) {
      const idx = fallbackUsers.findIndex(u => String(u._id) === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, error: '유저를 찾을 수 없습니다.' });
      fallbackUsers.splice(idx, 1);
      saveFallbackData();
      return res.json({ success: true });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 관리자: 전체 상담 목록
app.get('/api/admin/consultations', adminMiddleware, async (req, res) => {
  try {
    const list = await Consultation.find({}).sort({ createdAt: -1 });
    res.json({ success: true, consultations: list });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 관리자: 상담 삭제
app.delete('/api/admin/consultations/:id', adminMiddleware, async (req, res) => {
  try {
    if (isFallbackMode) {
      const idx = fallbackConsultations.findIndex(c => String(c._id) === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, error: '상담을 찾을 수 없습니다.' });
      fallbackConsultations.splice(idx, 1);
      saveFallbackData();
      return res.json({ success: true });
    }
    await Consultation.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 관리자: 통계 대시보드
app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
  try {
    const [totalUsers, totalExperts, totalSeekers, totalCompanies, totalConsultations, completedConsultations] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'expert' }),
      User.countDocuments({ role: 'seeker' }),
      User.countDocuments({ role: 'company' }),
      Consultation.countDocuments({}),
      Consultation.countDocuments({ status: 'completed' }),
    ]);
    res.json({ success: true, stats: { totalUsers, totalExperts, totalSeekers, totalCompanies, totalConsultations, completedConsultations } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- DB 연결 및 서버 시작 ---
function initDatabaseAndStart() {
  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alimulim')
    .then(() => {
      console.log('✅ MongoDB 연결 성공');
      User = mongoose.model('User', UserSchema);
      Consultation = mongoose.model('Consultation', ConsultationSchema);
      app.listen(PORT, '0.0.0.0', () => console.log(`🚀 서버 실행 중: http://localhost:${PORT}`));
    })
    .catch(() => {
      console.warn('⚠️ MongoDB 연결 실패 → JSON Fallback 모드로 전환');
      isFallbackMode = true;
      User = MockUser;
      Consultation = MockConsultation;
      loadFallbackData();
      app.listen(PORT, '0.0.0.0', () => console.log(`🚀 서버 실행 중 (JSON Fallback): http://localhost:${PORT}`));
    });
}

initDatabaseAndStart();
