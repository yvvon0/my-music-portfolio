const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

function getSongsFilePath(DATA_DIR) {
  return path.join(DATA_DIR, 'songs.json');
}

async function readSongs(DATA_DIR) {
  const filePath = getSongsFilePath(DATA_DIR);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(filePath, '[]', 'utf8');
      return [];
    }
    throw err;
  }
}

async function writeSongs(DATA_DIR, songs) {
  const filePath = getSongsFilePath(DATA_DIR);
  await fs.writeFile(filePath, JSON.stringify(songs, null, 2), 'utf8');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, req.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传音频或图片文件'), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.get('/songs', async (req, res) => {
  try {
    const songs = await readSongs(req.DATA_DIR);
    const publicSongs = songs.map(({ id, title, artist, coverUrl, audioUrl, playCount }) => ({
      id, title, artist, coverUrl, audioUrl, playCount: playCount || 0
    }));
    res.json(publicSongs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '加载歌曲失败' });
  }
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== req.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }
  next();
}

router.post('/songs', authMiddleware, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ error: '标题和艺术家不能为空' });
    }

    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.cover?.[0];

    if (!audioFile) {
      return res.status(400).json({ error: '必须上传音频文件' });
    }

    const songs = await readSongs(req.DATA_DIR);
    const newSong = {
      id: Date.now(),
      title,
      artist,
      audioUrl: `/uploads/${audioFile.filename}`,
      coverUrl: coverFile ? `/uploads/${coverFile.filename}` : '/default-cover.png',
      playCount: 0
    };

    songs.push(newSong);
    await writeSongs(req.DATA_DIR, songs);
    res.status(201).json(newSong);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '上传失败' });
  }
});

router.put('/songs/:id', authMiddleware, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const { title, artist } = req.body;
    const songs = await readSongs(req.DATA_DIR);
    const index = songs.findIndex(s => s.id === songId);

    if (index === -1) {
      return res.status(404).json({ error: '歌曲未找到' });
    }

    if (title) songs[index].title = title;
    if (artist) songs[index].artist = artist;

    if (req.files?.audio?.[0]) {
      songs[index].audioUrl = `/uploads/${req.files.audio[0].filename}`;
    }
    if (req.files?.cover?.[0]) {
      songs[index].coverUrl = `/uploads/${req.files.cover[0].filename}`;
    }

    await writeSongs(req.DATA_DIR, songs);
    res.json(songs[index]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '编辑失败' });
  }
});

router.delete('/songs/:id', authMiddleware, async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const songs = await readSongs(req.DATA_DIR);
    const filtered = songs.filter(s => s.id !== songId);
    if (songs.length === filtered.length) {
      return res.status(404).json({ error: '歌曲未找到' });
    }
    await writeSongs(req.DATA_DIR, filtered);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除失败' });
  }
});

router.post('/songs/:id/play', async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const songs = await readSongs(req.DATA_DIR);
    const song = songs.find(s => s.id === songId);
    if (!song) {
      return res.status(404).json({ error: '歌曲未找到' });
    }
    song.playCount = (song.playCount || 0) + 1;
    await writeSongs(req.DATA_DIR, songs);
    res.json({ playCount: song.playCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '统计失败' });
  }
});

module.exports = router;