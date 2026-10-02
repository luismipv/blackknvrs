// BLACK KNVRS // Band Portal Controller (Y2K Chrome Edition v2)
// Full Operations: Auth, Task Management, Song Ideas Hub, Audio Vault & Real-Time Sync

let portalData = null;
let currentMember = null;
let enteredPin = "";
let currentTrackIndex = 0;
let isPlaying = false;
let currentTaskFilter = 'all';

const STORAGE_KEY = 'bk_portal_data_v2';
const ACTIVE_MEMBER_KEY = 'bk_active_member_id';
const FIREBASE_CONFIG_KEY = 'bk_firebase_config';

// -------------------------------------------------------------
// 1. INITIALIZATION & DATA PERSISTENCE
// -------------------------------------------------------------
async function initApp() {
  await loadPortalData();
  setupAuthUI();
  setupNavigation();
  setupTaskManagement();
  setupSongIdeas();
  setupAudioPlayer();
  setupVideoPlayer();
  setupFirebaseSync();
  startCountdown();

  // Auto-login if previously active in this browser session
  const savedMemberId = sessionStorage.getItem(ACTIVE_MEMBER_KEY);
  if (savedMemberId && portalData.members) {
    const found = portalData.members.find(m => m.id === savedMemberId);
    if (found) {
      currentMember = found;
      loginSuccess();
    }
  }
}

async function loadPortalData() {
  try {
    const res = await fetch('data/portal-data.json');
    if (res.ok) {
      const defaultData = await res.json();
      
      // Load saved state from localStorage if available
      const localSaved = localStorage.getItem(STORAGE_KEY);
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          // Merge remote base with user added tasks & ideas
          portalData = {
            ...defaultData,
            tasks: parsed.tasks || defaultData.tasks,
            songIdeas: parsed.songIdeas || defaultData.songIdeas || []
          };
        } catch (err) {
          console.warn("Error parsing local data, using default:", err);
          portalData = defaultData;
        }
      } else {
        portalData = defaultData;
      }
    }
  } catch (e) {
    console.error("Critical: Could not load portal data", e);
  }
}

function saveData() {
  if (!portalData) return;
  const toSave = {
    tasks: portalData.tasks,
    songIdeas: portalData.songIdeas
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));

  // Push to Firebase if configured
  syncToCloud(toSave);
}

// -------------------------------------------------------------
// 2. AUTHENTICATION & PIN SECURITY
// -------------------------------------------------------------
function setupAuthUI() {
  const memberContainer = document.getElementById('memberButtons');
  if (!memberContainer || !portalData.members) return;

  memberContainer.innerHTML = '';

  portalData.members.forEach((m, idx) => {
    const chip = document.createElement('div');
    chip.className = `member-chip ${idx === 0 ? 'selected' : ''}`;
    chip.style.setProperty('--chip-color', m.color || '#fff');
    chip.dataset.memberId = m.id;
    chip.innerHTML = `
      <img src="${m.avatar || 'images/logo.png'}" onerror="this.src='images/logo.png'" class="chip-avatar-img">
      <span class="chip-name">${m.name.split('/')[0].trim()}</span>
    `;
    chip.addEventListener('click', () => selectMember(m.id));
    memberContainer.appendChild(chip);
  });

  // Default to first member
  currentMember = portalData.members[0];
  updateAccentColor(currentMember.color);
  updateSelectedMemberDisplay(currentMember);

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

  // Clear button
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      enteredPin = "";
      updateDots();
      errorEl.textContent = "";
    });
  }

  // Delete button (one digit)
  const delBtn = document.getElementById('delBtn');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      if (enteredPin.length > 0) {
        enteredPin = enteredPin.slice(0, -1);
        updateDots();
        errorEl.textContent = "";
      }
    });
  }

  function updateDots() {
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < enteredPin.length);
    });
  }

  function validatePin() {
    // Valid PIN matches member's PIN or master override
    if (enteredPin === currentMember.pin || enteredPin === "9999" || enteredPin === "1234") {
      sessionStorage.setItem(ACTIVE_MEMBER_KEY, currentMember.id);
      loginSuccess();
    } else {
      errorEl.textContent = "PIN incorrecto. Intenta de nuevo.";
      setTimeout(() => {
        enteredPin = "";
        updateDots();
        errorEl.textContent = "";
      }, 900);
    }
  }

  function selectMember(id) {
    currentMember = portalData.members.find(m => m.id === id);
    document.querySelectorAll('.member-chip').forEach(c => {
      c.classList.toggle('selected', c.dataset.memberId === id);
    });
    updateAccentColor(currentMember.color);
    updateSelectedMemberDisplay(currentMember);
    enteredPin = "";
    updateDots();
    errorEl.textContent = "";
  }

  function updateSelectedMemberDisplay(member) {
    const nameEl = document.getElementById('smdName');
    const roleEl = document.getElementById('smdRole');
    if (nameEl) nameEl.textContent = member.fullName || member.name;
    if (roleEl) roleEl.textContent = member.role;
  }

  // Logout / Switch User
  const switchBtn = document.getElementById('switchUserBtn');
  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      sessionStorage.removeItem(ACTIVE_MEMBER_KEY);
      document.getElementById('authOverlay').classList.remove('hidden');
      document.getElementById('app').classList.add('hidden');
      enteredPin = "";
      updateDots();
    });
  }
}

function updateAccentColor(color) {
  document.documentElement.style.setProperty('--active-accent', color || '#ff3385');
}

function loginSuccess() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateAccentColor(currentMember.color);

  // Render all active views
  renderTopNav();
  renderDashboard();
  renderTasksManagement();
  renderSongIdeas();
  renderTimeline('all');
  renderSingles();
  renderTrackList();
}

function renderTopNav() {
  const nameEl = document.getElementById('memberActiveName');
  const tagEl = document.getElementById('memberActiveTag');
  const dotEl = document.getElementById('memberDot');

  if (nameEl) nameEl.textContent = currentMember.name.split('/')[0].trim();
  if (tagEl) tagEl.textContent = currentMember.isAdmin ? "Manager" : "Banda";
  if (dotEl) dotEl.style.background = currentMember.color || '#fff';
}

// -------------------------------------------------------------
// 3. TAB 1: DASHBOARD (HOY & MIS RESPONSABILIDADES)
// -------------------------------------------------------------
function renderDashboard() {
  const greetingEl = document.getElementById('dashGreeting');
  const subtitleEl = document.getElementById('dashSubtitle');
  const roleBadge = document.getElementById('roleBadge');
  const roleDesc = document.getElementById('roleDescription');

  if (greetingEl) {
    greetingEl.textContent = `HOLA, ${currentMember.name.split('/')[0].toUpperCase().trim()}`;
  }
  if (subtitleEl) {
    subtitleEl.textContent = currentMember.isAdmin 
      ? "Centro de Mando: Asignación de tareas y supervisión general" 
      : "Tus responsabilidades asignadas y próximas fechas de entrega";
  }
  if (roleBadge) roleBadge.textContent = currentMember.role;
  if (roleDesc) roleDesc.textContent = currentMember.operationalRole;

  // Filter tasks for this user:
  // If Manager: show all pending tasks across the band
  // If Member: show tasks assigned to this member or to 'all'
  const taskListEl = document.getElementById('myTaskList');
  const countBadge = document.getElementById('myTaskCount');
  const completedListEl = document.getElementById('completedTaskList');
  const completedCountEl = document.getElementById('completedCount');

  if (!taskListEl) return;
  taskListEl.innerHTML = '';
  if (completedListEl) completedListEl.innerHTML = '';

  const relevantTasks = portalData.tasks.filter(t => {
    if (currentMember.isAdmin) return true;
    return t.assignedTo.toLowerCase() === currentMember.id.toLowerCase() || 
           t.assignedTo.toLowerCase() === 'all';
  });

  const pendingTasks = relevantTasks.filter(t => t.status !== 'Completada');
  const completedTasks = relevantTasks.filter(t => t.status === 'Completada');

  if (countBadge) countBadge.textContent = `${pendingTasks.length} pendientes`;
  if (completedCountEl) completedCountEl.textContent = completedTasks.length;

  if (pendingTasks.length === 0) {
    taskListEl.innerHTML = `
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:1rem; text-align:center;">
        <span style="font-size:1.5rem;">✨</span>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.3rem;">¡Todo al día! No tienes responsabilidades pendientes.</p>
      </div>
    `;
  } else {
    pendingTasks.forEach(task => {
      taskListEl.appendChild(createTaskElement(task, false));
    });
  }

  if (completedTasks.length > 0 && completedListEl) {
    completedTasks.forEach(task => {
      completedListEl.appendChild(createTaskElement(task, true));
    });
  }

  // Toggle completed drawer
  const toggleBtn = document.getElementById('toggleCompletedBtn');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      if (completedListEl) {
        completedListEl.classList.toggle('hidden');
        const icon = toggleBtn.querySelector('.caret-icon');
        if (icon) icon.textContent = completedListEl.classList.contains('hidden') ? '▼' : '▲';
      }
    };
  }

  // Milestones
  const milestonesEl = document.getElementById('quickMilestones');
  if (milestonesEl) {
    milestonesEl.innerHTML = '';
    const timeline = portalData.timeline || [];
    timeline.slice(0, 3).forEach(m => {
      const row = document.createElement('div');
      row.className = 'milestone-item';
      row.innerHTML = `
        <span>${m.title}</span>
        <span class="m-date">${m.date}</span>
      `;
      milestonesEl.appendChild(row);
    });
  }
}

function calculateDueStatus(dueDateStr) {
  if (!dueDateStr) return { text: "Sin fecha", className: "due-normal" };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = dueDateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `Atrasada (${Math.abs(diffDays)}d)`, className: "due-overdue" };
  } else if (diffDays === 0) {
    return { text: "¡Vence Hoy!", className: "due-today" };
  } else if (diffDays === 1) {
    return { text: "Vence Mañana", className: "due-soon" };
  } else if (diffDays <= 3) {
    return { text: `Vence en ${diffDays} días`, className: "due-soon" };
  } else {
    return { text: `Entrega: ${dueDateStr}`, className: "due-normal" };
  }
}

function createTaskElement(task, isCompleted) {
  const card = document.createElement('div');
  card.className = `task-card ${isCompleted ? 'is-completed' : ''}`;
  card.dataset.taskId = task.id;

  const dueInfo = calculateDueStatus(task.dueDate);
  const assigneeName = getAssigneeName(task.assignedTo);
  const priorityClass = `p-${(task.priority || 'media').toLowerCase()}`;

  card.innerHTML = `
    <div class="task-header-row">
      <button class="task-check-btn ${isCompleted ? 'checked' : ''}" title="${isCompleted ? 'Reabrir tarea' : 'Marcar como completada'}">
        ${isCompleted ? '✓' : ''}
      </button>
      <div class="task-main-info">
        <div class="task-title">${escapeHTML(task.title)}</div>
        ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
        <div class="task-meta-bar">
          <span class="due-badge ${dueInfo.className}">📅 ${dueInfo.text}</span>
          <span class="task-badge ${priorityClass}">Prioridad: ${task.priority || 'Normal'}</span>
          <span class="assignee-chip" style="color:var(--chrome-highlight);">Para: ${assigneeName}</span>
          ${task.category ? `<span class="task-badge">${task.category}</span>` : ''}
        </div>
      </div>
    </div>
    ${currentMember.isAdmin ? `
      <div class="task-actions">
        <button class="btn-task-action delete" data-delete-id="${task.id}">🗑 Eliminar</button>
      </div>
    ` : ''}
  `;

  // Checkbox toggle status
  const checkBtn = card.querySelector('.task-check-btn');
  checkBtn.addEventListener('click', () => {
    toggleTaskStatus(task.id);
  });

  // Delete button (Admin)
  const delBtn = card.querySelector('.btn-task-action.delete');
  if (delBtn) {
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`¿Eliminar la tarea "${task.title}"?`)) {
        deleteTask(task.id);
      }
    });
  }

  return card;
}

function getAssigneeName(assigneeId) {
  if (!assigneeId || assigneeId.toLowerCase() === 'all') return "Todas (Banda)";
  const member = portalData.members.find(m => m.id.toLowerCase() === assigneeId.toLowerCase());
  return member ? member.name.split('/')[0].trim() : assigneeId;
}

function toggleTaskStatus(taskId) {
  const task = portalData.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.status === 'Completada') {
    task.status = 'Pendiente';
    task.completedAt = null;
  } else {
    task.status = 'Completada';
    task.completedAt = new Date().toISOString();
  }

  saveData();
  renderDashboard();
  renderTasksManagement();
}

function deleteTask(taskId) {
  portalData.tasks = portalData.tasks.filter(t => t.id !== taskId);
  saveData();
  renderDashboard();
  renderTasksManagement();
}

// -------------------------------------------------------------
// 4. TAB 2: GESTIÓN DE TAREAS (PANEL ADMIN & ASIGNACIÓN)
// -------------------------------------------------------------
function setupTaskManagement() {
  const openBtn = document.getElementById('openNewTaskBtn');
  const closeBtn = document.getElementById('closeTaskFormBtn');
  const formCard = document.getElementById('adminTaskFormCard');
  const form = document.getElementById('createTaskForm');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      formCard.classList.remove('hidden');
      formCard.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      formCard.classList.add('hidden');
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const newTask = {
        id: `t_${Date.now()}`,
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDesc').value.trim(),
        assignedTo: document.getElementById('taskAssignee').value,
        dueDate: document.getElementById('taskDueDate').value,
        priority: document.getElementById('taskPriority').value,
        category: document.getElementById('taskCategory').value,
        status: 'Pendiente',
        assignedBy: currentMember.name,
        createdAt: new Date().toISOString()
      };

      portalData.tasks.unshift(newTask);
      saveData();

      form.reset();
      formCard.classList.add('hidden');
      renderDashboard();
      renderTasksManagement();
    });
  }

  // Filter Buttons
  document.querySelectorAll('#tasksMemberFilters .t-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tasksMemberFilters .t-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTaskFilter = btn.dataset.member;
      renderTasksManagement();
    });
  });
}

function renderTasksManagement() {
  const openBtn = document.getElementById('openNewTaskBtn');
  if (openBtn) {
    // Only Luis Miguel can create & assign tasks
    if (currentMember.isAdmin) {
      openBtn.classList.remove('hidden');
    } else {
      openBtn.classList.add('hidden');
    }
  }

  const listEl = document.getElementById('tasksGlobalList');
  if (!listEl) return;
  listEl.innerHTML = '';

  let filtered = portalData.tasks;
  if (currentTaskFilter !== 'all') {
    filtered = portalData.tasks.filter(t => t.assignedTo.toLowerCase() === currentTaskFilter.toLowerCase());
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:1.2rem; text-align:center;">
        <p style="font-size:0.8rem; color:var(--text-muted);">No hay tareas asignadas con este filtro.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(task => {
    listEl.appendChild(createTaskElement(task, task.status === 'Completada'));
  });
}

// -------------------------------------------------------------
// 5. TAB 3: SONG IDEAS HUB (LABORATORIO DE CANCIONES)
// -------------------------------------------------------------
function setupSongIdeas() {
  const openBtn = document.getElementById('openNewIdeaBtn');
  const closeBtn = document.getElementById('closeIdeaFormBtn');
  const formCard = document.getElementById('newIdeaFormCard');
  const form = document.getElementById('createIdeaForm');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      formCard.classList.remove('hidden');
      formCard.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      formCard.classList.add('hidden');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('ideaTitle').value.trim();
      const key = document.getElementById('ideaKey').value.trim();
      const bpm = document.getElementById('ideaBpm').value.trim();
      const driveUrl = document.getElementById('ideaDriveUrl').value.trim();
      const lyrics = document.getElementById('ideaLyrics').value.trim();
      const notes = document.getElementById('ideaNotes').value.trim();
      const fileInput = document.getElementById('ideaAudioFile');

      let audioUrl = "";
      if (fileInput && fileInput.files && fileInput.files[0]) {
        // Create local object URL for preview
        const file = fileInput.files[0];
        audioUrl = URL.createObjectURL(file);
      }

      const newIdea = {
        id: `idea_${Date.now()}`,
        title: title,
        authorId: currentMember.id,
        authorName: currentMember.name.split('/')[0].trim(),
        date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
        audioUrl: audioUrl,
        driveUrl: driveUrl,
        status: "Boceto",
        key: key,
        bpm: bpm,
        lyrics: lyrics,
        notes: notes,
        comments: []
      };

      if (!portalData.songIdeas) portalData.songIdeas = [];
      portalData.songIdeas.unshift(newIdea);
      saveData();

      form.reset();
      formCard.classList.add('hidden');
      renderSongIdeas();
    });
  }
}

function renderSongIdeas() {
  const container = document.getElementById('ideasStream');
  if (!container) return;
  container.innerHTML = '';

  const ideas = portalData.songIdeas || [];

  if (ideas.length === 0) {
    container.innerHTML = `
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:1.5rem; text-align:center;">
        <span style="font-size:1.8rem;">💡</span>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem;">Aún no hay ideas registradas. ¡Sé la primera en subir un boceto o demo!</p>
      </div>
    `;
    return;
  }

  ideas.forEach(idea => {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.dataset.ideaId = idea.id;

    card.innerHTML = `
      <div class="idea-header">
        <div>
          <div class="idea-title">${escapeHTML(idea.title)}</div>
          <div class="idea-author-row">
            <span>Por: <strong>${escapeHTML(idea.authorName)}</strong></span>
            <span>•</span>
            <span>${idea.date}</span>
          </div>
        </div>
        <span class="idea-tag-status">${idea.status || 'Boceto'}</span>
      </div>

      <div class="idea-pills-row">
        ${idea.key ? `<span class="idea-pill">🎼 ${escapeHTML(idea.key)}</span>` : ''}
        ${idea.bpm ? `<span class="idea-pill">⏱ ${escapeHTML(idea.bpm)}</span>` : ''}
        ${idea.driveUrl ? `<a href="${idea.driveUrl}" target="_blank" class="idea-pill" style="text-decoration:none;">📁 Drive</a>` : ''}
      </div>

      ${idea.audioUrl ? `
        <div class="idea-audio-player">
          <audio controls preload="metadata" src="${idea.audioUrl}"></audio>
        </div>
      ` : ''}

      ${idea.notes ? `
        <div class="idea-notes-box">
          <strong>Notas:</strong> ${escapeHTML(idea.notes)}
        </div>
      ` : ''}

      ${idea.lyrics ? `
        <div class="idea-lyrics-collapsible">
          <button class="lyrics-toggle-btn">Ver Letra / Acordes ▾</button>
          <div class="lyrics-content hidden">${escapeHTML(idea.lyrics)}</div>
        </div>
      ` : ''}

      <div class="idea-comments-box">
        <div class="comments-title">Comentarios & Feedback (${(idea.comments || []).length})</div>
        <div class="comments-list">
          ${(idea.comments || []).map(c => `
            <div class="comment-item">
              <span class="comment-author">${escapeHTML(c.authorName || 'Banda')}:</span>
              <span class="comment-text">${escapeHTML(c.text)}</span>
            </div>
          `).join('')}
        </div>
        <form class="add-comment-form">
          <input type="text" class="input-comment" placeholder="Escribe un feedback o idea..." required>
          <button type="submit" class="btn-comment">Enviar</button>
        </form>
      </div>
    `;

    // Lyrics toggle
    const lyricsBtn = card.querySelector('.lyrics-toggle-btn');
    const lyricsContent = card.querySelector('.lyrics-content');
    if (lyricsBtn && lyricsContent) {
      lyricsBtn.addEventListener('click', () => {
        lyricsContent.classList.toggle('hidden');
        lyricsBtn.textContent = lyricsContent.classList.contains('hidden') 
          ? 'Ver Letra / Acordes ▾' 
          : 'Ocultar Letra ▴';
      });
    }

    // Add comment listener
    const commentForm = card.querySelector('.add-comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = commentForm.querySelector('.input-comment');
        const text = input.value.trim();
        if (!text) return;

        if (!idea.comments) idea.comments = [];
        idea.comments.push({
          authorName: currentMember.name.split('/')[0].trim(),
          text: text,
          date: new Date().toLocaleDateString('es-MX')
        });

        saveData();
        renderSongIdeas();
      });
    }

    container.appendChild(card);
  });
}

// -------------------------------------------------------------
// 6. TAB 4: MÚSICA & AUDIO VAULT PLAYER
// -------------------------------------------------------------
function setupAudioPlayer() {
  const audio = document.getElementById('audioElement');
  const playBtn = document.getElementById('playBtn');
  const prevBtn = document.getElementById('prevTrackBtn');
  const nextBtn = document.getElementById('nextTrackBtn');
  const vinylDisc = document.getElementById('vinylDisc');
  const progressBar = document.getElementById('waveProgress');
  const waveformBar = document.getElementById('waveformBar');

  if (!audio || !playBtn) return;

  playBtn.addEventListener('click', togglePlay);
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const tracks = portalData.singles || [];
      currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
      loadAndPlayTrack(currentTrackIndex);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const tracks = portalData.singles || [];
      currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
      loadAndPlayTrack(currentTrackIndex);
    });
  }

  audio.addEventListener('timeupdate', () => {
    if (audio.duration && progressBar) {
      const pct = (audio.currentTime / audio.duration) * 100;
      progressBar.style.width = `${pct}%`;
    }
  });

  audio.addEventListener('ended', () => {
    isPlaying = false;
    playBtn.textContent = '▶';
    if (vinylDisc) vinylDisc.classList.remove('spinning');
  });

  if (waveformBar) {
    waveformBar.addEventListener('click', (e) => {
      if (audio.duration) {
        const rect = waveformBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = clickX / rect.width;
        audio.currentTime = pct * audio.duration;
      }
    });
  }
}

function renderTrackList() {
  const list = document.getElementById('trackList');
  if (!list || !portalData.singles) return;
  list.innerHTML = '';

  portalData.singles.forEach((s, idx) => {
    if (!s.audioFile) return;
    const row = document.createElement('div');
    row.className = `track-row ${idx === currentTrackIndex ? 'active' : ''}`;
    row.innerHTML = `
      <div>
        <div class="track-row-title">${s.title}</div>
        <div class="track-row-type">${s.type}</div>
      </div>
      <span style="font-size:1.1rem; color:var(--active-accent);">▶</span>
    `;
    row.addEventListener('click', () => loadAndPlayTrack(idx));
    list.appendChild(row);
  });
}

function loadAndPlayTrack(index) {
  const tracks = portalData.singles || [];
  const track = tracks[index];
  if (!track || !track.audioFile) return;

  currentTrackIndex = index;
  const audio = document.getElementById('audioElement');
  const playBtn = document.getElementById('playBtn');
  const vinylDisc = document.getElementById('vinylDisc');

  const titleEl = document.getElementById('playerTitle');
  const metaEl = document.getElementById('playerMeta');
  if (titleEl) titleEl.textContent = track.title;
  if (metaEl) metaEl.textContent = track.type;

  audio.src = track.audioFile;

  // Pause video if playing
  const vid = document.getElementById('officialVideoPlayer');
  if (vid && !vid.paused) vid.pause();

  audio.play().then(() => {
    isPlaying = true;
    if (playBtn) playBtn.textContent = '⏸';
    if (vinylDisc) vinylDisc.classList.add('spinning');
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
    if (playBtn) playBtn.textContent = '▶';
    if (vinylDisc) vinylDisc.classList.remove('spinning');
  } else {
    const vid = document.getElementById('officialVideoPlayer');
    if (vid && !vid.paused) vid.pause();

    audio.play();
    isPlaying = true;
    if (playBtn) playBtn.textContent = '⏸';
    if (vinylDisc) vinylDisc.classList.add('spinning');
  }
}

function renderSingles() {
  const grid = document.getElementById('singlesGrid');
  if (!grid || !portalData.singles) return;
  grid.innerHTML = '';

  portalData.singles.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'single-card';
    const isReady = s.status && s.status.toLowerCase().includes('ready');

    card.innerHTML = `
      <div class="sc-header">
        <div>
          <span class="sc-badge">${s.type}</span>
          <h4 class="sc-title">${s.title}</h4>
        </div>
        <span class="sc-status ${isReady ? 'ready' : 'prep'}">${s.status}</span>
      </div>
      <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">${s.deliverablesSummary || ''}</p>
      <div class="sc-assets-row">
        <span class="asset-pill ${s.assets && s.assets.hasCoverArt ? 'active' : ''}">Portada HD ${s.assets && s.assets.hasCoverArt ? '✓' : '—'}</span>
        <span class="asset-pill ${s.assets && s.assets.hasMusicVideo ? 'active' : ''}">Videoclip ${s.assets && s.assets.hasMusicVideo ? '✓' : '—'}</span>
        <span class="asset-pill ${s.assets && s.assets.hasStems ? 'active' : ''}">Stems Audio ${s.assets && s.assets.hasStems ? '✓' : '—'}</span>
      </div>
      <div class="sc-action-row">
        <a href="${s.assets && s.assets.driveUrl ? s.assets.driveUrl : '#'}" target="_blank" class="btn-drive">📁 Google Drive</a>
        ${s.audioFile ? `<button class="btn-play-track" data-track-index="${idx}">Escuchar ▶</button>` : ''}
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.btn-play-track').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.trackIndex);
      loadAndPlayTrack(idx);
    });
  });
}

function setupVideoPlayer() {
  const video = document.getElementById('officialVideoPlayer');
  if (video) {
    video.addEventListener('play', () => {
      const audio = document.getElementById('audioElement');
      if (isPlaying && audio) {
        togglePlay();
      }
    });
  }
}

// -------------------------------------------------------------
// 7. TAB 5: AGENDA & LEGAL TIMELINE
// -------------------------------------------------------------
function renderTimeline(filter) {
  const container = document.getElementById('timelineList');
  if (!container) return;
  container.innerHTML = '';

  const items = portalData.timeline || [];
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

// -------------------------------------------------------------
// 8. NAVIGATION TABS CONTROLLER
// -------------------------------------------------------------
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

  // Timeline Filter Pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderTimeline(pill.dataset.filter);
    });
  });
}

// -------------------------------------------------------------
// 9. FIREBASE CLOUD SYNC ADAPTER
// -------------------------------------------------------------
function setupFirebaseSync() {
  const saveFbBtn = document.getElementById('saveFirebaseBtn');
  const apiKeyInput = document.getElementById('fbApiKey');
  const projectIdInput = document.getElementById('fbProjectId');
  const statusDot = document.getElementById('syncStatusDot');
  const syncBadge = document.getElementById('syncBadge');

  const savedConfig = localStorage.getItem(FIREBASE_CONFIG_KEY);
  if (savedConfig) {
    try {
      const cfg = JSON.parse(savedConfig);
      if (apiKeyInput) apiKeyInput.value = cfg.apiKey || '';
      if (projectIdInput) projectIdInput.value = cfg.projectId || '';
      if (statusDot) {
        statusDot.textContent = "Conectado";
        statusDot.style.background = "rgba(0, 230, 118, 0.2)";
        statusDot.style.color = "#00e676";
      }
      if (syncBadge) syncBadge.textContent = "● Nube Activa";
    } catch (e) {}
  }

  if (saveFbBtn) {
    saveFbBtn.addEventListener('click', () => {
      const apiKey = apiKeyInput.value.trim();
      const projectId = projectIdInput.value.trim();

      if (!projectId) {
        alert("Por favor ingresa al menos tu Project ID de Firebase.");
        return;
      }

      const config = { apiKey, projectId };
      localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
      if (statusDot) {
        statusDot.textContent = "Conectado";
        statusDot.style.background = "rgba(0, 230, 118, 0.2)";
        statusDot.style.color = "#00e676";
      }
      if (syncBadge) syncBadge.textContent = "● Nube Activa";
      alert("¡Configuración guardada! Se sincronizarán las tareas e ideas en Firestore.");
      syncToCloud({ tasks: portalData.tasks, songIdeas: portalData.songIdeas });
    });
  }
}

async function syncToCloud(payload) {
  const savedConfig = localStorage.getItem(FIREBASE_CONFIG_KEY);
  if (!savedConfig) return;

  try {
    const cfg = JSON.parse(savedConfig);
    if (!cfg.projectId) return;

    // Use Firestore REST API endpoint
    const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/bandPortal/sharedData`;
    
    // Save as JSON string in document field
    const firestoreBody = {
      fields: {
        payloadJson: { stringValue: JSON.stringify(payload) },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (res.ok) {
      const syncBadge = document.getElementById('syncBadge');
      if (syncBadge) syncBadge.textContent = "● Sincronizado";
    }
  } catch (err) {
    console.log("Cloud sync notice:", err);
  }
}

// -------------------------------------------------------------
// 10. COUNTDOWN TIMER
// -------------------------------------------------------------
function startCountdown() {
  const targetDate = new Date('2026-10-23T00:00:00').getTime();

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    const daysEl = document.getElementById('cdDays');
    const hoursEl = document.getElementById('cdHours');
    const minsEl = document.getElementById('cdMins');

    if (!daysEl || !hoursEl || !minsEl) return;

    if (diff <= 0) {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minsEl.textContent = "00";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minsEl.textContent = String(mins).padStart(2, '0');
  }

  update();
  setInterval(update, 60000);
}

// Helper: Escape HTML
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW notice:', err));
  });
}

document.addEventListener('DOMContentLoaded', initApp);
