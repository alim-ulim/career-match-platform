const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes'); // 추가됨

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// 라우트 연결
app.use('/api/auth', authRoutes); // 추가됨

app.get('/', (req, res) => {
  res.send('서버 작동 중!');
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB 연결 성공');
    app.listen(PORT, () => console.log(`서버 실행 중: ${PORT}`));
  })
  .catch(err => console.log(err));