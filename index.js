// 把原来的 server/index.js 内容复制进来，并做两处修改：
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');

// ✅ 关键修改 1：路由从本地引入（我们把它放在 api_routes.js）
const apiRoutes = require('./api_routes');

const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(__dirname, 'public_uploads'); // 注意：public/ 也要扁平化

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

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