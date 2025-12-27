// 主题切换
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const isDark = localStorage.getItem('theme') === 'dark';
if (isDark) {
  body.classList.remove('light-theme');
  body.classList.add('dark-theme');
  themeToggle.textContent = '☀️';
}

themeToggle.addEventListener('click', () => {
  body.classList.toggle('light-theme');
  body.classList.toggle('dark-theme');
  const isNowDark = body.classList.contains('dark-theme');
  localStorage.setItem('theme', isNowDark ? 'dark' : 'light');
  themeToggle.textContent = isNowDark ? '☀️' : '🌙';
});

// 管理入口
let isAdmin = false;
document.getElementById('loginAdmin').addEventListener('click', async () => {
  const pass = document.getElementById('adminPass').value;
  if (pass) {
    try {
      const res = await fetch('/api/songs', {
        headers: { 'Authorization': pass }
      });
      if (res.ok) {
        isAdmin = true;
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('uploadForm').style.display = 'block';
      } else {
        alert('密码错误');
      }
    } catch (e) {
      alert('连接失败');
    }
  }
});

// 上传歌曲
document.getElementById('uploadBtn').addEventListener('click', async () => {
  const title = document.getElementById('songTitle').value;
  const artist = document.getElementById('songArtist').value;
  const audioFile = document.getElementById('audioFile').files[0];
  const coverFile = document.getElementById('coverFile').files[0];

  if (!title || !artist || !audioFile) {
    alert('请填写完整信息并选择音频文件');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('artist', artist);
  formData.append('audio', audioFile);
  if (coverFile) formData.append('cover', coverFile);

  try {
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Authorization': document.getElementById('adminPass').value },
      body: formData
    });
    if (res.ok) {
      alert('上传成功！');
      loadSongs();
    } else {
      const err = await res.json();
      alert('上传失败：' + err.error);
    }
  } catch (e) {
    alert('网络错误');
  }
});

// 播放器
const audioPlayer = document.getElementById('audioPlayer');
const nowPlaying = document.getElementById('nowPlaying');
const playerDiv = document.getElementById('player');

// 加载歌曲列表
async function loadSongs() {
  try {
    const res = await fetch('/api/songs');
    const songs = await res.json();
    const list = document.getElementById('songList');
    list.innerHTML = songs.map(song => `
      <div class="song-card">
        <img src="${song.coverUrl}" alt="封面" onerror="this.src='/default-cover.png'" />
        <div>
          <h3>${song.title}</h3>
          <p>${song.artist} • 播放 ${song.playCount} 次</p>
          <button onclick="playSong('${song.audioUrl}', '${song.title} - ${song.artist}')">播放</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

window.playSong = async (url, title) => {
  audioPlayer.src = url;
  audioPlayer.play();
  nowPlaying.textContent = `正在播放：${title}`;
  playerDiv.style.display = 'block';

  // 上报播放
  const id = url.split('/').pop().split('-')[0];
  if (!isNaN(id)) {
    await fetch(`/api/songs/${id}/play`, { method: 'POST' });
  }
};

loadSongs();