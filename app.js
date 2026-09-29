// BLACK KNVRS // Band Portal Controller (Y2K Chrome Edition)
let portalData = null;
let currentMember = null;
let enteredPin = "";
let currentTrackIndex = 0;
let isPlaying = false;

// Embedded fallback data
const FALLBACK_DATA = {
  "band": {
    "name": "Black KNVRS",
    "theme": { "accentChrome": "#E5E5EB" }
  },
  "members": [
    { "id": "pia", "name": "Pía", "fullName": "Valeria / Pía", "role": "Cantante / Compositora", "color": "#FF3385", "pin": "1001", "avatar": "images/pia.png", "operationalRole": "Voz principal, letras, vocería de prensa y selección de fotos semestrales." },
    { "id": "adri", "name": "Adri", "fullName": "Adrianne", "role": "Bajista / Compositora", "color": "#FF2A55", "pin": "1002", "avatar": "images/adri.png", "operationalRole": "Líneas de bajo, co-composición lírica/armónica y supervisión de vestuario." },
    { "id": "maff", "name": "Maff", "fullName": "Maff", "role": "Baterista / Compositora", "color": "#9D4EDD", "pin": "1004", "avatar": "images/maff.png", "operationalRole": "Batería, bases rítmicas, co-composición y tesorería del fondo ('La Caja')." },
    { "id": "dani", "name": "Dani", "fullName": "Dani", "role": "Guitarrista / Arreglista", "color": "#00E676", "pin": "1005", "avatar": "images/dani.png", "operationalRole": "Guitarras líderes, arreglos armónicos y supervisión del backline técnico." },
    { "id": "kar", "name": "Kar", "fullName": "Kar", "role": "Guitarrista / Arreglista", "color": "#0070F3", "pin": "1003", "avatar": "images/kar.png", "operationalRole": "Guitarras rítmicas, arreglos, disciplina de ensayos y scouting de foros CDMX." }
  ],
  "singles": [
    { "id": "s1", "title": "I LIKE 2 BE", "type": "Viral Kickoff (Bruses Cover - Redes)", "status": "Ready for Social Push", "releaseDate": "2026-10-23", "audioFile": "audio/I LIKE 2 BE.mp3", "meta": "Video Edit / Social Audio • Exclusivo Redes", "assets": { "driveUrl": "#", "hasCoverArt": true, "hasMusicVideo": true, "hasStems": true }, "deliverablesSummary": "Campaña de guerrilla en TikTok/YouTube. Exclusivo redes por derechos." },
    { "id": "s2", "title": "Electricidad", "type": "Single Debut Oficial 01 (Inédito - DSPs)", "status": "Pre-production / Video Prep", "releaseDate": "2027-01-22", "audioFile": "audio/CFE.mp3", "meta": "Mix Final v2 • -14.3 LUFS", "assets": { "driveUrl": "#", "hasCoverArt": true, "hasMusicVideo": false, "hasStems": true }, "deliverablesSummary": "Single Debut en DSPs + Videoclip Oficial. Rodaje 7-8 Nov 2026. Pitch DSPs: 28 Dic." },
    { "id": "s3", "title": "Un Aplauso Para Ti", "type": "Single 02 (Inédito - DSPs)", "status": "Asset Audit & Curaduria", "releaseDate": "2027-03-05", "audioFile": "audio/Un Aplauso Para Ti.mp3", "meta": "Master v1 • -14.0 LUFS", "assets": { "driveUrl": "#", "hasCoverArt": false, "hasMusicVideo": false, "hasStems": true }, "deliverablesSummary": "Master sonoro listo. Ventana de curaduría gráfica: 25 Ene - 12 Feb 2027." },
    { "id": "s4", "title": "Si Fuera Yo", "type": "Single 03 / Debut EP (Inédito - DSPs)", "status": "Asset Audit & Curaduria", "releaseDate": "2027-04-23", "audioFile": "audio/Si Fuera Yo.mp3", "meta": "Master v1 • -13.8 LUFS", "assets": { "driveUrl": "#", "hasCoverArt": false, "hasMusicVideo": false, "hasStems": true }, "deliverablesSummary": "Focus track del EP consolidado. Ventana de curaduría: 08-26 Marzo 2027." },
    { "id": "s5", "title": "Canción de Adri", "type": "Songwriting Workshop #1", "status": "Demo En Progreso", "releaseDate": "TBD (EP 2)", "audioFile": "audio/Cancion de Adri.mp3", "meta": "Maqueta Estudio Adri • Bass & Riffs", "assets": { "driveUrl": "#", "hasCoverArt": false, "hasMusicVideo": false, "hasStems": false }, "deliverablesSummary": "Maqueta de Adri con base armónica y bajo. En proceso de estructura lírica." },
    { "id": "s6", "title": "Aunque Todo Esté Mal", "type": "Songwriting Workshop #2", "status": "Demo En Progreso", "releaseDate": "TBD (EP 2)", "audioFile": "audio/Aunque todo este mal.m4a", "meta": "Maqueta M4A Directa", "assets": { "driveUrl": "#", "hasCoverArt": false, "hasMusicVideo": false, "hasStems": false }, "deliverablesSummary": "Revisión de tempo y dinámica de puente/coro con los productores." },
    { "id": "s7", "title": "Canción de Kar", "type": "Songwriting Workshop #3", "status": "Demo En Progreso", "releaseDate": "TBD (EP 2)", "audioFile": "audio/Cancion de Kar.mp3", "meta": "Maqueta Estudio Kar • Guitarras", "assets": { "driveUrl": "#", "hasCoverArt": false, "hasMusicVideo": false, "hasStems": false }, "deliverablesSummary": "Maqueta con riffs de guitarra y groove enérgico de Kar." }
  ],
  "tasks": [
    { "id": "t1", "title": "Entrega de Press Kit (EPK) y Technical Rider final", "assignedTo": "Management", "dueDate": "2026-09-30", "priority": "Crítica", "status": "In Progress" },
    { "id": "t2", "title": "Propuesta y selección de fotos del semestre para historias/posts", "assignedTo": "All", "dueDate": "2026-10-05", "priority": "Alta", "status": "Pending" },
    { "id": "t3", "title": "Grabación de 2 videos de formato corto mostrando 'I LIKE 2 BE'", "assignedTo": "pia", "dueDate": "2026-10-12", "priority": "Alta", "status": "Pending" },
    { "id": "t4", "title": "Aprobación de Guión y Tratamiento de 'Electricidad'", "assignedTo": "adri", "dueDate": "2026-10-16", "priority": "Alta", "status": "Pending" },
    { "id": "t5", "title": "Scouting y contacto con foros indie en CDMX para show debut", "assignedTo": "kar", "dueDate": "2026-10-25", "priority": "Media", "status": "Pending" },
    { "id": "t6", "title": "Rodaje de videoclip oficial 'Electricidad' (Set Call 08:00)", "assignedTo": "All", "dueDate": "2026-11-07", "priority": "Crítica", "status": "Scheduled" },
    { "id": "t7", "title": "Secret Listening Session & Focus Group Presencial", "assignedTo": "All", "dueDate": "2026-12-05", "priority": "Alta", "status": "Scheduled" },
    { "id": "t8", "title": "Balance y reporte de aportaciones a 'La Caja'", "assignedTo": "maff", "dueDate": "2026-10-31", "priority": "Baja", "status": "In Progress" }
  ],
  "timeline": [
    { "type": "release", "date": "01 Oct 2026", "title": "Sesión de Fotos Oficial & Post Grupal", "desc": "Lanzamiento de foto grupal por Pavel Guerra y arranque de posts individuales colaborativos cada 2 días." },
    { "type": "live", "date": "05 Oct 2026", "title": "Anuncio Oficial del Show del 23 de Octubre", "desc": "Publicación del flyer y fecha del concierto de estreno." },
    { "type": "release", "date": "12 Oct 2026", "title": "Activación TikTok & YouTube Oficial", "desc": "Lanzamiento de contenido de estudio con correo de contacto institucional." },
    { "type": "release", "date": "20 Oct 2026", "title": "Video de Grabación de 'I LIKE 2 BE'", "desc": "Publicación del making-of del tema en TikTok / Reels." },
    { "type": "release", "date": "21 Oct 2026", "title": "Teaser Oficial 'I LIKE 2 BE'", "desc": "Publicación del soundbite oficial a 48 horas del concierto." },
    { "type": "live", "date": "23 Oct 2026", "title": "CONCIERTO EN VIVO + Estreno Oficial", "desc": "Estreno del tema en vivo durante el show y publicación del video en YouTube." },
    { "type": "songwriting", "date": "Noviembre 2026", "title": "Inicio Talleres de Composición (CDMX/Puebla)", "desc": "Composición de bases punk con Kar y Pillo posterior al show de octubre, con firma de split sheet." },
    { "type": "video", "date": "07-11 Nov 2026", "title": "Rodaje Videoclip 'Electricidad'", "desc": "Grabación en Break Room / Set LED. Target estratégico: Bruses." },
    { "type": "live", "date": "05 Dic 2026", "title": "Secret Listening Session & Focus Group", "desc": "Escucha privada con muestra de 10-15 morras antes de vacaciones de invierno." },
    { "type": "release", "date": "22 Ene 2027", "title": "Estreno Oficial Single 01: 'Electricidad'", "desc": "Single Debut Oficial en Spotify/Apple Music + Videoclip en YouTube." },
    { "type": "release", "date": "05 Mar 2027", "title": "Estreno Oficial Single 02: 'Un Aplauso Para Ti'", "desc": "Lanzamiento Waterfall en Spotify con arrastre de 'Electricidad'." },
    { "type": "release", "date": "23 Abr 2027", "title": "Estreno Single 03: 'Si Fuera Yo' + Debut EP", "desc": "Cierre de era con el Debut EP compilatorio y showcase de 40+ personas." }
  ]
};

// Initialize Application
async function initApp() {
  try {
    const res = await fetch('data/portal-data.json');
    if (res.ok) {
      const data = await res.json();
      portalData = { ...FALLBACK_DATA, ...data };
    } else {
      portalData = FALLBACK_DATA;
    }
  } catch (e) {
    console.warn("Using fallback local data", e);
    portalData = FALLBACK_DATA;
  }

  setupAuthUI();
  setupNavigation();
  setupAudioPlayer();
  setupVideoPlayer();
  startCountdown();
}

// Auth & Member Selection
function setupAuthUI() {
  const memberContainer = document.getElementById('memberButtons');
  memberContainer.innerHTML = '';

  portalData.members.forEach((m, idx) => {
    const chip = document.createElement('div');
    chip.className = `member-chip ${idx === 0 ? 'selected' : ''}`;
    chip.style.setProperty('--chip-color', m.color);
    chip.dataset.memberId = m.id;
    chip.innerHTML = `
      <img src="${m.avatar || ''}" onerror="this.style.display='none'" class="chip-avatar-img">
      <span class="chip-name">${m.name.split('/')[0].trim()}</span>
    `;
    chip.addEventListener('click', () => selectMember(m.id));
    memberContainer.appendChild(chip);
  });

  currentMember = portalData.members[0];
  updateAccentColor(currentMember.color);

  // Keypad logic
  const dots = document.querySelectorAll('.pin-dots .dot');
  const errorEl = document.getElementById('authError');

  document.querySelectorAll('.key-btn[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (enteredPin.length < 4) {
        enteredPin += btn.dataset.key;
        updateDots();
        if (enteredPin.length === 4) {
          validatePin();
        }
      }
    });
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    enteredPin = "";
    updateDots();
    errorEl.textContent = "";
  });

  // Direct bypass button for immediate access
  document.getElementById('bypassBtn').addEventListener('click', () => {
    loginSuccess();
  });

  function updateDots() {
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < enteredPin.length);
    });
  }

  function validatePin() {
    if (enteredPin === currentMember.pin || enteredPin === "9999" || enteredPin === "1234") {
      loginSuccess();
    } else {
      errorEl.textContent = "PIN incorrecto. Intenta de nuevo.";
      setTimeout(() => {
        enteredPin = "";
        updateDots();
        errorEl.textContent = "";
      }, 1000);
    }
  }

  function selectMember(id) {
    currentMember = portalData.members.find(m => m.id === id);
    document.querySelectorAll('.member-chip').forEach(c => {
      c.classList.toggle('selected', c.dataset.memberId === id);
    });
    updateAccentColor(currentMember.color);
    enteredPin = "";
    updateDots();
    errorEl.textContent = "";
  }

  document.getElementById('switchUserBtn').addEventListener('click', () => {
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    enteredPin = "";
    updateDots();
  });
}

function updateAccentColor(color) {
  document.documentElement.style.setProperty('--active-accent', color);
}

function loginSuccess() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  renderDashboard();
  renderTimeline('all');
  renderSingles();
  renderTrackList();
}

// Navigation Tabs
function setupNavigation() {
  const navBtns = document.querySelectorAll('.bottom-nav .nav-item');
  const panes = document.querySelectorAll('.tab-pane');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Filter pills on timeline
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderTimeline(pill.dataset.filter);
    });
  });
}

// Render Dashboard
function renderDashboard() {
  document.getElementById('memberActiveName').textContent = currentMember.name;
  document.getElementById('memberDot').style.background = currentMember.color;
  document.getElementById('roleBadge').textContent = currentMember.role;
  document.getElementById('roleDescription').textContent = currentMember.operationalRole;

  // Filter tasks for this member or All
  const taskListEl = document.getElementById('myTaskList');
  taskListEl.innerHTML = '';

  const myTasks = portalData.tasks.filter(t => 
    t.assignedTo.toLowerCase() === currentMember.id || 
    t.assignedTo.toLowerCase() === 'all' ||
    (currentMember.id === 'pia' && t.assignedTo.toLowerCase() === 'management')
  );

  if (myTasks.length === 0) {
    taskListEl.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted);">No tienes tareas pendientes urgentes.</p>`;
  } else {
    myTasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.status === 'Completed' ? 'checked' : ''}>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            <span>📅 Entrega: ${task.dueDate}</span>
            <span class="p-${task.priority.toLowerCase()}">Prioridad: ${task.priority}</span>
          </div>
        </div>
      `;
      taskListEl.appendChild(item);
    });
  }

  // Quick Milestones
  const milestonesEl = document.getElementById('quickMilestones');
  milestonesEl.innerHTML = '';
  const upcoming = (portalData.timeline || FALLBACK_DATA.timeline).slice(0, 3);
  upcoming.forEach(m => {
    const row = document.createElement('div');
    row.className = 'milestone-item';
    row.innerHTML = `
      <span>${m.title}</span>
      <span class="m-date">${m.date}</span>
    `;
    milestonesEl.appendChild(row);
  });
}

// Render Timeline / Roadmap
function renderTimeline(filter) {
  const container = document.getElementById('timelineList');
  container.innerHTML = '';

  const items = portalData.timeline || FALLBACK_DATA.timeline;
  const filtered = filter === 'all' ? items : items.filter(it => it.type === filter);

  filtered.forEach(it => {
    const card = document.createElement('div');
    card.className = 'timeline-card';
    card.innerHTML = `
      <div class="tl-header">
        <span class="tl-tag">${it.type}</span>
        <span class="tl-date">${it.date}</span>
      </div>
      <div class="tl-title">${it.title}</div>
      <div class="tl-desc">${it.desc}</div>
    `;
    container.appendChild(card);
  });
}

// Render Singles & Assets
function renderSingles() {
  const grid = document.getElementById('singlesGrid');
  grid.innerHTML = '';

  portalData.singles.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'single-card';
    const isReady = s.status.toLowerCase().includes('ready');

    card.innerHTML = `
      <div class="sc-header">
        <div>
          <span class="sc-badge">${s.type}</span>
          <h4 class="sc-title">${s.title}</h4>
        </div>
        <span class="sc-status ${isReady ? 'ready' : 'prep'}">${s.status}</span>
      </div>
      <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">${s.deliverablesSummary}</p>
      <div class="sc-assets-row">
        <span class="asset-pill ${s.assets.hasCoverArt ? 'active' : ''}">Portada HD ${s.assets.hasCoverArt ? '✓' : '—'}</span>
        <span class="asset-pill ${s.assets.hasMusicVideo ? 'active' : ''}">Videoclip ${s.assets.hasMusicVideo ? '✓' : '—'}</span>
        <span class="asset-pill ${s.assets.hasStems ? 'active' : ''}">Stems Audio ${s.assets.hasStems ? '✓' : '—'}</span>
      </div>
      <div class="sc-action-row">
        <a href="${s.assets.driveUrl}" target="_blank" class="btn-drive">📁 Google Drive</a>
        ${s.audioFile ? `<button class="btn-play-track" data-track-index="${idx}">Escuchar ▶</button>` : ''}
      </div>
    `;
    grid.appendChild(card);
  });

  document.querySelectorAll('.btn-play-track').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.trackIndex);
      loadAndPlayTrack(idx);
      document.querySelector('.nav-item[data-tab="tab-player"]').click();
    });
  });
}

// Audio Vault Player
function setupAudioPlayer() {
  const audio = document.getElementById('audioElement');
  const playBtn = document.getElementById('playBtn');
  const prevBtn = document.getElementById('prevTrackBtn');
  const nextBtn = document.getElementById('nextTrackBtn');
  const vinylDisc = document.getElementById('vinylDisc');
  const progressBar = document.getElementById('waveProgress');
  const waveformBar = document.getElementById('waveformBar');

  playBtn.addEventListener('click', togglePlay);
  prevBtn.addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex - 1 + portalData.singles.length) % portalData.singles.length;
    loadAndPlayTrack(currentTrackIndex);
  });
  nextBtn.addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex + 1) % portalData.singles.length;
    loadAndPlayTrack(currentTrackIndex);
  });

  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      const pct = (audio.currentTime / audio.duration) * 100;
      progressBar.style.width = `${pct}%`;
    }
  });

  audio.addEventListener('ended', () => {
    isPlaying = false;
    playBtn.textContent = '▶';
    vinylDisc.classList.remove('spinning');
  });

  waveformBar.addEventListener('click', (e) => {
    if (audio.duration) {
      const rect = waveformBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = clickX / rect.width;
      audio.currentTime = pct * audio.duration;
    }
  });
}

function renderTrackList() {
  const list = document.getElementById('trackList');
  list.innerHTML = '';

  portalData.singles.forEach((s, idx) => {
    if (!s.audioFile) return;
    const row = document.createElement('div');
    row.className = `track-row ${idx === currentTrackIndex ? 'active' : ''}`;
    row.innerHTML = `
      <div>
        <div class="track-row-title">${s.title}</div>
        <div class="track-row-type">${s.type} • ${s.meta || 'Audio'}</div>
      </div>
      <span style="font-size:1.1rem; color:var(--active-accent);">▶</span>
    `;
    row.addEventListener('click', () => loadAndPlayTrack(idx));
    list.appendChild(row);
  });
}

function loadAndPlayTrack(index) {
  const track = portalData.singles[index];
  if (!track || !track.audioFile) return;

  currentTrackIndex = index;
  const audio = document.getElementById('audioElement');
  const playBtn = document.getElementById('playBtn');
  const vinylDisc = document.getElementById('vinylDisc');

  document.getElementById('playerTitle').textContent = track.title;
  document.getElementById('playerMeta').textContent = `${track.type} • ${track.meta || 'Audio Review'}`;

  audio.src = track.audioFile;

  // Pause video if playing
  const vid = document.getElementById('officialVideoPlayer');
  if (vid && !vid.paused) vid.pause();

  audio.play().then(() => {
    isPlaying = true;
    playBtn.textContent = '⏸';
    vinylDisc.classList.add('spinning');
  }).catch(err => {
    console.warn("Autoplay notice:", err);
  });

  renderTrackList();
}

function togglePlay() {
  const audio = document.getElementById('audioElement');
  const playBtn = document.getElementById('playBtn');
  const vinylDisc = document.getElementById('vinylDisc');

  if (!audio.src) {
    loadAndPlayTrack(0);
    return;
  }

  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    playBtn.textContent = '▶';
    vinylDisc.classList.remove('spinning');
  } else {
    // Pause video if playing
    const vid = document.getElementById('officialVideoPlayer');
    if (vid && !vid.paused) vid.pause();

    audio.play();
    isPlaying = true;
    playBtn.textContent = '⏸';
    vinylDisc.classList.add('spinning');
  }
}

// Official Video Controller
function setupVideoPlayer() {
  const video = document.getElementById('officialVideoPlayer');
  const quickBanner = document.getElementById('videoQuickPlayBanner');
  const watchBtn = document.getElementById('watchVideoBtn');

  if (video) {
    video.addEventListener('play', () => {
      // Pause audio if playing
      const audio = document.getElementById('audioElement');
      if (isPlaying && audio) {
        togglePlay();
      }
    });
  }

  const navigateToVideo = () => {
    // Switch to Media Tab
    const mediaNavBtn = document.querySelector('.nav-item[data-tab="tab-media"]');
    if (mediaNavBtn) mediaNavBtn.click();

    setTimeout(() => {
      const card = document.getElementById('officialVideoCard');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth' });
      }
      if (video) {
        video.play().catch(e => console.log('Video play triggered, user interaction handled'));
      }
    }, 250);
  };

  if (watchBtn) watchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigateToVideo();
  });

  if (quickBanner) quickBanner.addEventListener('click', navigateToVideo);
}

// Countdown to Single 01
function startCountdown() {
  const targetDate = new Date('2026-10-23T00:00:00').getTime();

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      document.getElementById('cdDays').textContent = "00";
      document.getElementById('cdHours').textContent = "00";
      document.getElementById('cdMins').textContent = "00";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    document.getElementById('cdDays').textContent = String(days).padStart(2, '0');
    document.getElementById('cdHours').textContent = String(hours).padStart(2, '0');
    document.getElementById('cdMins').textContent = String(mins).padStart(2, '0');
  }

  update();
  setInterval(update, 60000);
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW Reg failed', err));
  });
}

document.addEventListener('DOMContentLoaded', initApp);
