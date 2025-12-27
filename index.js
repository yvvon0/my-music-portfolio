const express = require('express');
2const path = require('path');
3const fs = require('fs').promises;
4const cors = require('cors');
5const helmet = require('helmet');
6
7const apiRoutes = require('./api_routes');
8
9// ✅ Fly.io 适配：使用环境变量 PORT，并将数据存到 /data（Volume 挂载点）
10const PORT = process.env.PORT || 8080;
11const DATA_DIR = '/data/songs';        // JSON 数据
12const UPLOADS_DIR = '/data/uploads';   // 上传的音频/图片
13
14async function ensureDirs() {
15  await fs.mkdir(DATA_DIR, { recursive: true });
16  await fs.mkdir(UPLOADS_DIR, { recursive: true });
17}

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', (req, res, next) => {
  req.ADMIN_PASSWORD = ADMIN_PASSWORD;
  req.DATA_DIR = DATA_DIR;
  req.UPLOADS_DIR = UPLOADS_DIR;
  next();
}, apiRoutes);

// ✅ 关键修改 2：静态文件指向“扁平化”的 public 文件
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public_index.html'));
});

ensureDirs().then(() => {
  app.listen(PORT, () => {
    console.log(`🎧 音乐站已启动！`);
    console.log(`- 访问地址: http://localhost:${PORT}`);
    console.log(`- 管理员密码: ${ADMIN_PASSWORD}`);
  });
}).catch(err => {
  console.error('初始化失败:', err);
  process.exit(1);
});
