(function () {
  if (typeof window.S === 'undefined') return;

  const DEFAULT_WEEK_RENDER_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00'];
  const MOBILE_VIEWS = [
    { key: 'today', label: 'Jour' },
    { key: 'calendar', label: 'Calendrier' },
    { key: 'goals', label: 'Objectifs' },
    { key: 'ideas', label: 'Idees' },
    { key: 'settings', label: 'Reglages' },
  ];

  const legacyRenderView = window.renderView;
  const legacyRenderMonthView = window.renderMonthView;
  const legacyRenderDayView = window.renderDayView;
  const legacyOpenNewEvent = window.openNewEvent;
  const legacyEditEvent = window.editEvent;
  const legacySaveEvent = window.saveEvent;
  const legacyViewTitleMap = window.viewTitleMap;
  const legacyTaskHTML = window.taskHTML;
  const legacyToggleDone = window.toggleDone;

  function ensureSettingsDefaults() {
    S.settings = S.settings || {};
    if (!S.settings.themeMode) S.settings.themeMode = 'system';
    if (!S.settings.accent) S.settings.accent = '#007AFF';
    if (typeof S.settings.notifications !== 'boolean') S.settings.notifications = true;
    if (!Array.isArray(S.settings.subjectColors)) {
      S.settings.subjectColors = window.SUBJECT_COLORS ? Object.keys(window.SUBJECT_COLORS).map(function (k) {
        return { name: k, color: window.SUBJECT_COLORS[k] };
      }) : [
        { name: 'WAF', color: 'ev-blue' },
        { name: 'Securite', color: 'ev-purple' },
        { name: 'Francais', color: 'ev-green' },
        { name: 'Anglais', color: 'ev-amber' },
        { name: 'Management', color: 'ev-red' },
      ];
    }
    if (typeof S.sidebarCollapsed !== 'boolean') S.sidebarCollapsed = false;
  }

  function eventColorToHex(v) {
    const map = {
      'ev-blue': '#3b82f6',
      'ev-green': '#10b981',
      'ev-purple': '#8b5cf6',
      'ev-amber': '#f59e0b',
      'ev-red': '#ef4444',
      'ev-pink': '#ec4899',
    };
    const raw = String(v || '').trim();
    if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
      return ('#' + raw[1] + raw[1] + raw[2] + raw[2] + raw[3] + raw[3]).toLowerCase();
    }
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
    return map[v] || '#3b82f6';
  }

  function hexToEventColor(hex) {
    return eventColorToHex(hex);
  }

  function colorText(hex) {
    const c = eventColorToHex(hex);
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.63 ? '#111827' : '#ffffff';
  }

  function colorStyleInline(v, fallback) {
    const hex = eventColorToHex(v || fallback || '#3b82f6');
    return 'background:' + hex + ';color:' + colorText(hex) + ';';
  }

  function typeDefaultColor(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'course') return '#3b82f6';
    if (t === 'sport') return '#10b981';
    if (t === 'personal') return '#ffffff';
    if (t === 'project') return '#ef4444';
    if (t === 'reminder') return '#f59e0b';
    return '#3b82f6';
  }

  function inferSubjectColor(title) {
    const txt = String(title || '').toLowerCase();
    const rows = S.settings && Array.isArray(S.settings.subjectColors) ? S.settings.subjectColors : [];
    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      if (s && s.name && txt.includes(String(s.name).toLowerCase())) {
        return s.color || 'ev-blue';
      }
    }
    return '';
  }

  function minutes(v) {
    if (!v || !String(v).includes(':')) return 0;
    const parts = String(v).split(':').map(Number);
    return ((parts[0] || 0) * 60) + (parts[1] || 0);
  }

  function getWeekRenderSlots() {
    const globalHours = (typeof HOURS !== 'undefined' && Array.isArray(HOURS)) ? HOURS : window.HOURS;
    if (Array.isArray(globalHours) && globalHours.length) {
      return globalHours.filter(function (slot) {
        return /^\d{2}:\d{2}$/.test(String(slot || ''));
      });
    }
    if (Array.isArray(window.ENSAM_SLOTS) && window.ENSAM_SLOTS.length) {
      return window.ENSAM_SLOTS.map(function (slot) { return slot.start; });
    }
    return DEFAULT_WEEK_RENDER_SLOTS;
  }

  function slotLabel(v) {
    return v === '00:00' ? '00:00+' : v;
  }

  function getWeekSlotMinutes() {
    return getWeekRenderSlots().map(function (t) { return minutes(t); });
  }

  function getSlotIndexFromTime(timeValue) {
    const slots = getWeekSlotMinutes();
    if (!slots.length) return 0;
    const t = minutes(timeValue || getWeekRenderSlots()[0]);
    for (let i = 0; i < slots.length; i++) {
      if (t === slots[i]) return i;
    }
    for (let i = 0; i < slots.length - 1; i++) {
      const mid = (slots[i] + slots[i + 1]) / 2;
      if (t < mid) return i;
    }
    return slots.length - 1;
  }

  function pad2(v) {
    return String(v).padStart(2, '0');
  }

  function toTimeString(totalMin) {
    const m = Math.max(0, Math.min(23 * 60 + 59, totalMin));
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return pad2(hh) + ':' + pad2(mm);
  }

  function addMinutes(time, delta) {
    return toTimeString(minutes(time) + delta);
  }

  function parseQuickIntent(rawText, baseDate) {
    const src = String(rawText || '').trim();
    const parsed = {
      title: src,
      date: baseDate || todayStr(),
      hasTime: false,
      start: '',
      end: '',
    };
    if (!src) return parsed;

    const low = src.toLowerCase();
    const now = new Date((baseDate || todayStr()) + 'T00:00:00');

    if (/\bdemain\b/.test(low)) {
      now.setDate(now.getDate() + 1);
      parsed.date = dateStr(now);
    }

    const dayMap = {
      lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0,
      monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
    };
    Object.keys(dayMap).forEach(function (k) {
      if (!new RegExp('\\b' + k + '\\b', 'i').test(src)) return;
      const cur = new Date((baseDate || todayStr()) + 'T00:00:00');
      const wanted = dayMap[k];
      let diff = (wanted - cur.getDay() + 7) % 7;
      if (diff === 0 && !/\baujourd/.test(low)) diff = 7;
      cur.setDate(cur.getDate() + diff);
      parsed.date = dateStr(cur);
    });

    const range = src.match(/(\d{1,2})\s*[h:]\s*(\d{0,2})\s*(?:-|a|à|->|→)\s*(\d{1,2})\s*[h:]\s*(\d{0,2})/i);
    if (range) {
      const sh = Math.min(23, Number(range[1]) || 0);
      const sm = Math.min(59, Number(range[2] || '0') || 0);
      const eh = Math.min(23, Number(range[3]) || sh + 2);
      const em = Math.min(59, Number(range[4] || '0') || 0);
      parsed.start = pad2(sh) + ':' + pad2(sm);
      parsed.end = pad2(eh) + ':' + pad2(em);
      parsed.hasTime = true;
    } else {
      const solo = src.match(/\b(\d{1,2})\s*[h:]\s*(\d{0,2})\b/i);
      if (solo) {
        const sh = Math.min(23, Number(solo[1]) || 0);
        const sm = Math.min(59, Number(solo[2] || '0') || 0);
        parsed.start = pad2(sh) + ':' + pad2(sm);
        parsed.end = addMinutes(parsed.start, 120);
        parsed.hasTime = true;
      }
    }

    // Remove date/time hints from the final title to keep entries clean.
    parsed.title = src
      .replace(/\b(demain|aujourd\s*hui|today|tomorrow)\b/gi, ' ')
      .replace(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, ' ')
      .replace(/\d{1,2}\s*[h:]\s*\d{0,2}\s*(?:-|a|à|->|→)?\s*\d{0,2}\s*[h:]?\s*\d{0,2}/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!parsed.title) parsed.title = src;
    return parsed;
  }

  function mergeConsecutiveEvents(events) {
    const list = [...(events || [])].sort(function (a, b) {
      return String(a.start || '').localeCompare(String(b.start || ''));
    });
    const merged = [];
    list.forEach(function (ev) {
      if (!merged.length) {
        merged.push(Object.assign({}, ev));
        return;
      }
      const prev = merged[merged.length - 1];
      const sameMeta = String(prev.title || '') === String(ev.title || '')
        && String(prev.color || '') === String(ev.color || '')
        && String(prev.location || '') === String(ev.location || '')
        && String(prev.prof || '') === String(ev.prof || '')
        && String(prev.type || '') === String(ev.type || '');
      const contiguous = String(prev.end || '') && String(ev.start || '') && minutes(prev.end) === minutes(ev.start);
      if (sameMeta && contiguous) {
        prev.end = ev.end || prev.end;
        return;
      }
      merged.push(Object.assign({}, ev));
    });
    return merged;
  }

  function applyTheme() {
    ensureSettingsDefaults();
    const pref = S.settings.themeMode;
    const isDark = pref === 'dark' || (pref === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.style.setProperty('--accent', S.settings.accent || '#007AFF');
  }

  function toast(msg) {
    let wrap = document.getElementById('toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toast-wrap';
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 3600);
  }

  function canUseSystemNotifications() {
    return typeof window.Notification !== 'undefined';
  }

  async function requestSystemNotificationPermission() {
    if (!canUseSystemNotifications()) {
      toast('Notifications systeme non supportees sur ce navigateur.');
      return 'unsupported';
    }
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  }

  function notifySystem(title, body) {
    if (!canUseSystemNotifications() || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, { body: body });
      setTimeout(function () { n.close(); }, 5000);
    } catch (e) {
      // ignore notification runtime errors
    }
  }

  function navigateTo(viewKey) {
    S.view = viewKey;
    save();
    renderView();
  }

  function labelizeNavItems() {
    document.querySelectorAll('.nav-item').forEach((item) => {
      if (item.querySelector('.nav-txt')) return;
      const node = item.childNodes[item.childNodes.length - 2];
      const text = (node && node.textContent ? node.textContent : '').trim();
      if (!text) return;
      const span = document.createElement('span');
      span.className = 'nav-txt';
      span.textContent = text;
      node.textContent = '';
      item.insertBefore(span, item.querySelector('.cnt') || null);
    });
  }

  function addSidebarToggle() {
    const title = document.querySelector('.app-title');
    if (!title || document.getElementById('sidebar-toggle')) return;
    const icon = title.querySelector('svg');
    const lbl = document.createElement('span');
    lbl.textContent = title.textContent.trim();
    title.textContent = '';
    if (icon) title.appendChild(icon);
    title.appendChild(lbl);
    const btn = document.createElement('button');
    btn.id = 'sidebar-toggle';
    btn.className = 'sidebar-toggle';
    btn.title = 'Reduire la barre';
    btn.textContent = S.sidebarCollapsed ? '»' : '«';
    btn.onclick = function () {
      S.sidebarCollapsed = !S.sidebarCollapsed;
      document.body.classList.toggle('sidebar-collapsed', S.sidebarCollapsed);
      btn.textContent = S.sidebarCollapsed ? '»' : '«';
      save();
    };
    title.appendChild(btn);
    document.body.classList.toggle('sidebar-collapsed', S.sidebarCollapsed);
  }

  function addNavIfMissing(id, view, label, svgPath) {
    if (document.getElementById(id)) return;
    const section = document.querySelector('.sidebar-nav .nav-section:last-child');
    if (!section) return;
    const node = document.createElement('div');
    node.className = 'nav-item';
    node.id = id;
    node.onclick = function () { gotoView(view, this); };
    node.innerHTML = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">' + svgPath + '</svg><span class="nav-txt">' + label + '</span>';
    section.appendChild(node);
  }

  function ensureTopbarTools() {
    const topbar = document.querySelector('.topbar');
    const right = document.getElementById('topbar-right');
    if (!topbar || !right || document.getElementById('topbar-global')) return;
    const wrap = document.createElement('div');
    wrap.id = 'topbar-global';
    wrap.className = 'topbar-global';
    wrap.innerHTML = '' +
      '<button class="btn" id="btn-theme" title="Theme">🌓</button>' +
      '<button class="btn" id="btn-quick" title="Ajout rapide">+ Rapide</button>';
    topbar.insertBefore(wrap, right);


    document.getElementById('btn-theme').onclick = function () {
      const curr = S.settings.themeMode;
      S.settings.themeMode = curr === 'system' ? 'light' : (curr === 'light' ? 'dark' : 'system');
      save();
      applyTheme();
      toast('Theme: ' + S.settings.themeMode);
    };

    document.getElementById('btn-quick').onclick = function () {
      openQuickAdd();
    };
  }

  function ensureMobileNav() {
    if (document.getElementById('mobile-nav')) return;
    const nav = document.createElement('div');
    nav.id = 'mobile-nav';
    nav.className = 'mobile-nav';
    nav.innerHTML = MOBILE_VIEWS.map(function (v) {
      return '<button data-view="' + v.key + '">' + v.label + '</button>';
    }).join('');
    document.body.appendChild(nav);
    nav.addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-view]');
      if (!btn) return;
      navigateTo(btn.getAttribute('data-view'));
    });
  }

  function updateMobileNavState() {
    const nav = document.getElementById('mobile-nav');
    if (!nav) return;
    nav.querySelectorAll('button').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === S.view);
    });
  }

  function ensureFabQuickAdd() {
    if (document.getElementById('fab-quick-add')) return;
    const b = document.createElement('button');
    b.id = 'fab-quick-add';
    b.className = 'fab-quick-add';
    b.title = 'Ajout rapide';
    b.textContent = '+';
    b.onclick = openQuickAdd;
    document.body.appendChild(b);
  }

  function openQuickAdd() {
    const id = 'quick-add-modal';
    const old = document.getElementById(id);
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = id;
    overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '' +
      '<div class="modal">' +
      '<div class="modal-title">Ajout rapide<button class="btn" onclick="document.getElementById(\'' + id + '\').remove()">✕</button></div>' +
      '<div class="modal-row"><select class="modal-field" id="qa-kind"><option value="task">Tache</option><option value="event">Evenement</option></select><input class="modal-field" id="qa-date" type="date" value="' + todayStr() + '"/></div>' +
      '<input class="modal-field" id="qa-title" placeholder="Titre... (ex: JEE jeudi 14h)" />' +
      '<div class="modal-row"><input class="modal-field" id="qa-start" type="time" value="08:30" /><input class="modal-field" id="qa-end" type="time" value="10:30" /></div>' +
      '<div class="detail-label" style="margin-bottom:6px">Couleur</div>' +
      '<div class="modal-row"><input class="modal-field" id="qa-color" type="color" value="#3b82f6" /></div>' +
      '<div class="modal-actions"><button class="btn" onclick="document.getElementById(\'' + id + '\').remove()">Annuler</button><button class="btn btn-primary" onclick="quickAddSubmit()">Ajouter</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  window.openQuickAdd = openQuickAdd;

  window.quickAddSubmit = function () {
    const kind = (document.getElementById('qa-kind') || {}).value || 'task';
    const rawTitle = ((document.getElementById('qa-title') || {}).value || '').trim();
    const date = (document.getElementById('qa-date') || {}).value || todayStr();
    if (!rawTitle) return;
    const intent = parseQuickIntent(rawTitle, date);
    const title = intent.title;

    if (kind === 'task') {
      const rawStart = (document.getElementById('qa-start') || {}).value || '08:00';
      const rawEnd = (document.getElementById('qa-end') || {}).value || '10:00';
      const pick = (document.getElementById('qa-color') || {}).value || '#3b82f6';
      const start = intent.hasTime ? intent.start : rawStart;
      const end = intent.hasTime ? intent.end : rawEnd;
      const task = {
        id: 't' + Date.now(),
        name: title,
        matiere: '',
        priority: 'Moyenne',
        status: 'À faire',
        due: intent.date,
        starred: S.view === 'important',
        myDay: intent.date === todayStr(),
        done: false,
        color: eventColorToHex(pick),
        plannedStart: start,
        plannedEnd: end,
        subtasks: [],
        notes: '',
      };
      S.tasks.unshift(task);
      if (typeof window.syncTaskIntoCalendar === 'function') {
        window.syncTaskIntoCalendar(task);
      }
      toast('Tache ajoutee');
    } else {
      const rawStart = (document.getElementById('qa-start') || {}).value || '08:00';
      const rawEnd = (document.getElementById('qa-end') || {}).value || '10:00';
      const pick = (document.getElementById('qa-color') || {}).value || '#3b82f6';
      const start = intent.hasTime ? intent.start : rawStart;
      const end = intent.hasTime ? intent.end : rawEnd;
      S.calEvents.push({
        id: 'ev' + Date.now(),
        title: title,
        date: intent.date,
        start: start,
        end: end,
        location: '',
        prof: '',
        color: eventColorToHex(pick),
        important: false,
        notes: '',
        type: 'course',
      });
      toast('Evenement ajoute');
    }
    const modal = document.getElementById('quick-add-modal');
    if (modal) modal.remove();
    save();
    renderView();
  };

  function weekKey(offset) {
    const base = getMondayOf(offset || 0);
    return dateStr(base);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureWeekAccomplishmentsStore() {
    S.weekAccomplishments = S.weekAccomplishments || {};
    const key = weekKey(0);
    if (!Array.isArray(S.weekAccomplishments[key])) {
      S.weekAccomplishments[key] = [];
    }
    return { key: key, list: S.weekAccomplishments[key] };
  }

  function getWeekAccomplishmentsForToday() {
    return ensureWeekAccomplishmentsStore().list;
  }

  function isCurrentWeekKey(key) {
    return String(key || '') === weekKey(0);
  }

  function pruneOldCompletedGoals() {
    ensureGoalsStore._guard = true;
    const now = new Date(todayStr() + 'T00:00:00');
    const keys = Object.keys(S.goalWeeks || {});
    keys.forEach(function (k) {
      const list = S.goalWeeks[k] || [];
      const wk = new Date(String(k) + 'T00:00:00');
      const ageDays = Math.floor((now - wk) / 86400000);
      if (ageDays > 90) {
        S.goalWeeks[k] = list.filter(function (g) { return !g.done; });
      }
      if (!S.goalWeeks[k].length && !isCurrentWeekKey(k)) {
        delete S.goalWeeks[k];
      }
    });
    delete ensureGoalsStore._guard;
  }

  function weekLabel(key) {
    const d = new Date(String(key) + 'T00:00:00');
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' - ' + end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  function ensureGoalsStore() {
    if (ensureGoalsStore._guard) return;
    S.goalWeeks = S.goalWeeks || {};
    const currKey = weekKey(0);
    const nextKey = weekKey(1);
    if (!S.goalWeeks[currKey] && Array.isArray(S.weekGoals) && S.weekGoals.length) {
      S.goalWeeks[currKey] = S.weekGoals.map(function (g) { return { text: g.text, done: !!g.done, weekKey: currKey, createdAt: Date.now() }; });
    }
    if (!S.goalWeeks[nextKey] && Array.isArray(S.weekGoalsNext) && S.weekGoalsNext.length) {
      S.goalWeeks[nextKey] = S.weekGoalsNext.map(function (g) { return { text: g.text, done: !!g.done, weekKey: nextKey, createdAt: Date.now() }; });
    }
    S.goalSelectedWeek = S.goalSelectedWeek || currKey;
    pruneOldCompletedGoals();
  }

  function renderGoalsHub() {
    ensureGoalsStore();
    const key = S.goalSelectedWeek;
    const goals = S.goalWeeks[key] || (S.goalWeeks[key] = []);
    const canEdit = isCurrentWeekKey(key);
    const historyKeys = Object.keys(S.goalWeeks).sort().reverse();

    const html = '' +
      '<div class="import-card">' +
      '<div class="goal-week-title">' +
      '<span>Objectifs de la semaine ' + weekLabel(key) + '</span>' +
      '<div class="goal-week-actions">' +
      '<button class="btn" onclick="shiftGoalWeek(-1)">Semaine -</button> ' +
      '<button class="btn" onclick="shiftGoalWeek(1)">Semaine +</button>' +
      '</div></div>' +
      (canEdit ? '' : '<div class="score-pill" style="margin:8px 0 12px 0">Lecture seule (historique)</div>') +
      '<div>' +
      (goals.length ? goals.map(function (g, i) {
        return '<div class="wg-item ' + (g.done ? 'wg-done' : '') + '">' +
          '<div class="check-btn ' + (g.done ? 'checked' : '') + '" ' + (canEdit ? ('onclick="toggleGoalForWeek(' + i + ')"') : '') + '></div>' +
          '<span>' + g.text + '</span>' +
          (canEdit ? ('<button class="wg-del" onclick="delGoalForWeek(' + i + ')">✕</button>') : '') +
          '</div>';
      }).join('') : '<div class="empty-state" style="padding:18px">Aucun objectif pour cette semaine</div>') +
      '</div>' +
      (canEdit ? '<div class="week-add-row"><input id="goal-hub-inp" placeholder="Nouvel objectif..." onkeydown="if(event.key===\'Enter\')addGoalForWeek()"/><button class="btn btn-primary" onclick="addGoalForWeek()">+</button></div>' : '') +
      '</div>' +
      '<div class="import-card"><div class="goal-week-title"><span>Historique</span><span class="score-pill">' + historyKeys.length + ' semaines</span></div>' +
      historyKeys.map(function (k) {
        const list = S.goalWeeks[k] || [];
        const pending = list.filter(function (x) { return !x.done; });
        return '<details class="goals-history-item"><summary>' + weekLabel(k) + ' - ' + list.length + ' objectifs' + (pending.length ? (' • ' + pending.length + ' en attente') : '') + '</summary>' +
          '<div style="margin-top:10px">' + list.map(function (g) {
            return '<div style="font-size:13px;color:#6E6E73;margin-bottom:4px">' + (g.done ? '✅ ' : '🟡 ') + g.text + '</div>';
          }).join('') +
          (pending.length ? '<button class="btn" style="margin-top:8px" onclick="copyPendingGoals(\'' + k + '\')">Copier les non termines</button>' : '') +
          '</div></details>';
      }).join('') +
      '</div>';

    document.getElementById('view-title').textContent = 'Objectifs hebdo';
    document.getElementById('topbar-right').innerHTML = '';
    document.getElementById('content').innerHTML = html;
  }

  window.shiftGoalWeek = function (dir) {
    const d = new Date(S.goalSelectedWeek + 'T00:00:00');
    d.setDate(d.getDate() + (dir * 7));
    S.goalSelectedWeek = dateStr(d);
    save();
    renderView();
  };

  window.addGoalForWeek = function () {
    ensureGoalsStore();
    if (!isCurrentWeekKey(S.goalSelectedWeek)) {
      toast('Semaine passee en lecture seule.');
      return;
    }
    const inp = document.getElementById('goal-hub-inp');
    const txt = ((inp || {}).value || '').trim();
    if (!txt) return;
    S.goalWeeks[S.goalSelectedWeek] = S.goalWeeks[S.goalSelectedWeek] || [];
    S.goalWeeks[S.goalSelectedWeek].push({ text: txt, done: false, weekKey: S.goalSelectedWeek, createdAt: Date.now() });
    if (inp) inp.value = '';
    save();
    renderView();
  };

  window.toggleGoalForWeek = function (i) {
    ensureGoalsStore();
    if (!isCurrentWeekKey(S.goalSelectedWeek)) {
      toast('Semaine passee en lecture seule.');
      return;
    }
    const arr = S.goalWeeks[S.goalSelectedWeek] || [];
    if (!arr[i]) return;
    arr[i].done = !arr[i].done;
    save();
    renderView();
  };

  window.delGoalForWeek = function (i) {
    ensureGoalsStore();
    if (!isCurrentWeekKey(S.goalSelectedWeek)) {
      toast('Semaine passee en lecture seule.');
      return;
    }
    const arr = S.goalWeeks[S.goalSelectedWeek] || [];
    arr.splice(i, 1);
    save();
    renderView();
  };

  window.copyPendingGoals = function (sourceKey) {
    ensureGoalsStore();
    const target = S.goalWeeks[S.goalSelectedWeek] || (S.goalWeeks[S.goalSelectedWeek] = []);
    const existing = new Set(target.map(function (g) { return String(g.text || '').trim().toLowerCase(); }));
    (S.goalWeeks[sourceKey] || []).filter(function (g) { return !g.done; }).forEach(function (g) {
      const key = String(g.text || '').trim().toLowerCase();
      if (!key || existing.has(key)) return;
      target.push({ text: g.text, done: false, weekKey: S.goalSelectedWeek, createdAt: Date.now() });
      existing.add(key);
    });
    save();
    renderView();
  };

  window.addWeekAccomplishment = function () {
    const input = document.getElementById('accomp-inp');
    const txt = String((input && input.value) || '').trim();
    if (!txt) return;
    const store = ensureWeekAccomplishmentsStore();
    store.list.unshift({
      id: 'ac' + Date.now() + Math.floor(Math.random() * 1000),
      text: txt,
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      weekKey: store.key,
    });
    if (input) input.value = '';
    save();
    renderView();
  };

  window.toggleWeekAccomplishment = function (id) {
    const list = getWeekAccomplishmentsForToday();
    const item = list.find(function (x) { return x.id === id; });
    if (!item) return;
    item.done = !item.done;
    item.updatedAt = Date.now();
    save();
    renderView();
  };

  window.deleteWeekAccomplishment = function (id) {
    const list = getWeekAccomplishmentsForToday();
    const idx = list.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    list.splice(idx, 1);
    save();
    renderView();
  };

  window.clearDoneWeekAccomplishments = function () {
    const store = ensureWeekAccomplishmentsStore();
    S.weekAccomplishments[store.key] = store.list.filter(function (x) { return !x.done; });
    save();
    renderView();
  };

  // ── RÉALISATIONS — calendar navigation ────────────────────────────────
  // S.accompNav = { level: 'month'|'week'|'day', monthKey: 'YYYY-MM', weekKey: 'YYYY-MM-DD'(monday), dayKey: 'YYYY-MM-DD' }

  function accompNavState() {
    if (!S.accompNav) {
      const now = new Date();
      S.accompNav = {
        level: 'month',
        monthKey: now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'),
        weekKey: weekKey(0),
        dayKey: todayStr(),
      };
    }
    return S.accompNav;
  }

  function accompDayItems(ds) {
    S.dayNotes = S.dayNotes || {};
    return Array.isArray(S.dayNotes[ds]) ? S.dayNotes[ds] : [];
  }

  function accompDayCard(ds, showAdd) {
    const items = accompDayItems(ds);
    if (!items.length && !showAdd) return '';
    const d = new Date(ds + 'T00:00:00');
    const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const isToday = ds === todayStr();
    const inputId = 'accomp-inp-' + ds;
    let h = '<div class="import-card" style="margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
      '<div style="font-size:13px;font-weight:600;text-transform:capitalize">' + label +
      (isToday ? ' <span style="font-size:11px;background:var(--blue);color:#fff;padding:1px 7px;border-radius:10px;font-weight:500;vertical-align:middle">Aujourd\'hui</span>' : '') +
      '</div>' +
      '<span class="score-pill">' + items.length + '</span>' +
      '</div>';
    if (items.length) {
      items.forEach(function (item, i) {
        h += '<div class="task-item" style="margin-bottom:6px;cursor:default">' +
          '<div style="width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0;margin-top:6px"></div>' +
          '<div class="task-body"><div class="task-name">' + escapeHtml(item.text) + '</div></div>' +
          '<div class="task-actions"><button class="icon-btn" onclick="deleteDayNote(\'' + ds + '\',' + i + ')" title="Supprimer">' +
          '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
          '</button></div></div>';
      });
    } else {
      h += '<div style="font-size:13px;color:var(--text3);padding:4px 0 8px">Aucune réalisation.</div>';
    }
    if (showAdd) {
      h += '<div class="add-task-bar" style="margin-top:8px;margin-bottom:0">' +
        '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--text3)" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>' +
        '<input id="' + inputId + '" placeholder="Ajouter une réalisation..." style="flex:1;border:none;outline:none;font-size:13px;background:transparent;color:var(--text)" onkeydown="if(event.key===\'Enter\')addDayNote(\'' + ds + '\',\'' + inputId + '\')" />' +
        '<button class="btn btn-primary" onclick="addDayNote(\'' + ds + '\',\'' + inputId + '\')" style="padding:4px 12px;font-size:12px">Ajouter</button>' +
        '</div>';
    }
    h += '</div>';
    return h;
  }

  function renderAccomplishmentsView() {
    S.dayNotes = S.dayNotes || {};
    const nav = accompNavState();
    const today = todayStr();
    const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

    let html = '';

    // ── MONTH LEVEL ────────────────────────────────────────────────────────
    if (nav.level === 'month') {
      const [year, month] = nav.monthKey.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      // Monday-based start
      let startOffset = (firstDay.getDay() + 6) % 7;
      const totalCells = startOffset + lastDay.getDate();
      const rows = Math.ceil(totalCells / 7);

      html += '<div class="cal-topbar" style="margin-bottom:14px">' +
        '<button class="btn" onclick="accompShiftMonth(-1)">‹</button>' +
        '<div class="cal-title" style="text-align:center">' + MONTHS[month - 1] + ' ' + year + '</div>' +
        '<button class="btn" onclick="accompShiftMonth(1)" ' + (nav.monthKey >= (today.slice(0,7)) ? 'disabled style="opacity:.4"' : '') + '>›</button>' +
        '</div>' +
        '<div class="month-grid">';

      DAYS.forEach(function (d) { html += '<div class="month-day-label">' + d + '</div>'; });

      for (var ci = 0; ci < rows * 7; ci++) {
        const dayNum = ci - startOffset + 1;
        if (dayNum < 1 || dayNum > lastDay.getDate()) {
          html += '<div class="month-cell other-month" style="min-height:70px"></div>';
          continue;
        }
        const ds = year + '-' + String(month).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0');
        const items = accompDayItems(ds);
        const isT = ds === today;
        const isFuture = ds > today;
        html += '<div class="month-cell' + (isT ? ' today-cell' : '') + '" style="min-height:70px;' + (isFuture ? 'opacity:.4;pointer-events:none' : 'cursor:pointer') + '" onclick="accompDrillDay(\'' + ds + '\')">' +
          '<div class="month-num">' + dayNum + '</div>';
        if (items.length) {
          html += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px">';
          items.slice(0, 3).forEach(function () { html += '<div style="width:7px;height:7px;border-radius:50%;background:var(--green)"></div>'; });
          if (items.length > 3) html += '<div style="font-size:9px;color:var(--text3)">+' + (items.length - 3) + '</div>';
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div>';

    // ── WEEK LEVEL ─────────────────────────────────────────────────────────
    } else if (nav.level === 'week') {
      const monday = new Date(nav.weekKey + 'T00:00:00');
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7);
      const nextMonday = new Date(monday); nextMonday.setDate(monday.getDate() + 7);

      html += '<div class="cal-topbar" style="margin-bottom:14px">' +
        '<button class="btn" onclick="accompBack()">‹ Mois</button>' +
        '<button class="btn" onclick="accompShiftWeek(-1)">‹</button>' +
        '<div class="cal-title" style="text-align:center;flex:1">' + weekLabel(nav.weekKey) + '</div>' +
        '<button class="btn" onclick="accompShiftWeek(1)" ' + (dateStr(nextMonday) > today ? 'disabled style="opacity:.4"' : '') + '>›</button>' +
        '</div>';

      var hasAny = false;
      for (var wi = 0; wi < 7; wi++) {
        const wd = new Date(monday); wd.setDate(monday.getDate() + wi);
        const ds = dateStr(wd);
        if (ds > today) continue;
        const items = accompDayItems(ds);
        if (items.length) hasAny = true;
        html += accompDayCard(ds, ds === today);
      }
      if (!hasAny) {
        html += '<div class="import-card" style="text-align:center;padding:30px;color:var(--text3)">Aucune réalisation cette semaine.</div>';
      }

    // ── DAY LEVEL ──────────────────────────────────────────────────────────
    } else {
      const ds = nav.dayKey;
      const d = new Date(ds + 'T00:00:00');
      const prevD = new Date(d); prevD.setDate(d.getDate() - 1);
      const nextD = new Date(d); nextD.setDate(d.getDate() + 1);

      html += '<div class="cal-topbar" style="margin-bottom:14px">' +
        '<button class="btn" onclick="accompBack()">‹ Semaine</button>' +
        '<button class="btn" onclick="accompShiftDay(-1)">‹</button>' +
        '<div class="cal-title" style="text-align:center;flex:1;text-transform:capitalize">' +
        d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' +
        '<button class="btn" onclick="accompShiftDay(1)" ' + (dateStr(nextD) > today ? 'disabled style="opacity:.4"' : '') + '>›</button>' +
        '</div>';
      html += accompDayCard(ds, ds === today);
    }

    document.getElementById('view-title').textContent = 'Réalisations';
    document.getElementById('topbar-right').innerHTML = '';
    document.getElementById('content').innerHTML = html;
  }

  window.accompDrillDay = function (ds) {
    const monday = getMondayForDate(new Date(ds + 'T00:00:00'));
    S.accompNav = accompNavState();
    S.accompNav.weekKey = dateStr(monday);
    S.accompNav.dayKey = ds;
    S.accompNav.level = 'day';
    save(); renderView();
  };

  window.accompBack = function () {
    const nav = accompNavState();
    if (nav.level === 'day') {
      nav.level = 'week';
    } else if (nav.level === 'week') {
      nav.level = 'month';
    }
    save(); renderView();
  };

  window.accompShiftMonth = function (dir) {
    const nav = accompNavState();
    const [y, m] = nav.monthKey.split('-').map(Number);
    const nd = new Date(y, m - 1 + dir, 1);
    nav.monthKey = nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0');
    save(); renderView();
  };

  window.accompShiftWeek = function (dir) {
    const nav = accompNavState();
    const d = new Date(nav.weekKey + 'T00:00:00');
    d.setDate(d.getDate() + dir * 7);
    nav.weekKey = dateStr(d);
    save(); renderView();
  };

  window.accompShiftDay = function (dir) {
    const nav = accompNavState();
    const d = new Date(nav.dayKey + 'T00:00:00');
    d.setDate(d.getDate() + dir);
    nav.dayKey = dateStr(d);
    const monday = getMondayForDate(d);
    nav.weekKey = dateStr(monday);
    save(); renderView();
  };

  // ── JOURNAL ────────────────────────────────────────────────────────────

  function journalNavState() {
    if (!S.journalNav) {
      const now = new Date();
      S.journalNav = {
        level: 'month',
        monthKey: now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'),
        dayKey: todayStr(),
      };
    }
    return S.journalNav;
  }

  function journalEntry(ds) {
    S.journal = S.journal || {};
    return S.journal[ds] || null;
  }

  function journalWordCount(text) {
    return String(text || '').trim().split(/\s+/).filter(function (w) { return w.length > 0; }).length;
  }

  function renderJournalView() {
    S.journal = S.journal || {};
    const nav = journalNavState();
    const today = todayStr();
    const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

    document.getElementById('view-title').textContent = 'Journal';

    // ── MONTH CALENDAR ───────────────────────────────────────────────────
    if (nav.level === 'month') {
      const [year, month] = nav.monthKey.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      const startOffset = (firstDay.getDay() + 6) % 7;
      const rows = Math.ceil((startOffset + lastDay.getDate()) / 7);
      const totalEntries = Object.values(S.journal).filter(function (e) { return e && String(e.text || '').trim(); }).length;

      document.getElementById('topbar-right').innerHTML =
        '<button class="btn btn-primary" onclick="journalOpenDay(\'' + today + '\')">Écrire aujourd\'hui</button>';

      let html = '<div class="cal-topbar" style="margin-bottom:14px">' +
        '<button class="btn" onclick="journalShiftMonth(-1)">‹</button>' +
        '<div class="cal-title" style="text-align:center">' + MONTHS[month - 1] + ' ' + year + '</div>' +
        '<button class="btn" onclick="journalShiftMonth(1)" ' + (nav.monthKey >= today.slice(0, 7) ? 'disabled style="opacity:.4"' : '') + '>›</button>' +
        '<span class="score-pill" style="margin-left:8px">' + totalEntries + ' entrée' + (totalEntries !== 1 ? 's' : '') + '</span>' +
        '</div>' +
        '<div class="journal-cal-grid">';

      DAYS.forEach(function (d) { html += '<div class="month-day-label">' + d + '</div>'; });

      for (var ci = 0; ci < rows * 7; ci++) {
        const dayNum = ci - startOffset + 1;
        if (dayNum < 1 || dayNum > lastDay.getDate()) {
          html += '<div class="journal-cell jc-other"></div>';
          continue;
        }
        const ds = year + '-' + String(month).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0');
        const entry = journalEntry(ds);
        const hasEntry = entry && String(entry.text || '').trim().length > 0;
        const isToday = ds === today;
        const isFuture = ds > today;
        const preview = hasEntry ? String(entry.text).trim().replace(/\n/g, ' ').slice(0, 60) : '';

        html += '<div class="journal-cell' +
          (isToday ? ' jc-today' : '') +
          (hasEntry ? ' jc-has-entry' : '') +
          (isFuture ? ' jc-future' : '') +
          '" onclick="journalOpenDay(\'' + ds + '\')">' +
          '<div class="jc-num">' + dayNum + '</div>' +
          (preview ? '<div class="jc-preview">' + escapeHtml(preview) + '</div>' : '') +
          '</div>';
      }
      html += '</div>';
      document.getElementById('content').innerHTML = html;

    // ── DAY EDITOR ──────────────────────────────────────────────────────
    } else {
      const ds = nav.dayKey;
      const d = new Date(ds + 'T00:00:00');
      const prevD = new Date(d); prevD.setDate(d.getDate() - 1);
      const nextD = new Date(d); nextD.setDate(d.getDate() + 1);
      const entry = journalEntry(ds) || { text: '', updatedAt: null };
      const words = journalWordCount(entry.text);
      const isToday = ds === today;
      const dateLabel = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      document.getElementById('topbar-right').innerHTML =
        '<button class="btn" onclick="journalBack()">‹ Calendrier</button>' +
        '<button class="btn" onclick="journalShiftDay(-1)">‹</button>' +
        '<button class="btn" onclick="journalShiftDay(1)" ' + (dateStr(nextD) > today ? 'disabled style="opacity:.4"' : '') + '>›</button>';

      const savedLabel = entry.updatedAt
        ? 'Sauvegardé à ' + new Date(entry.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : 'Non sauvegardé';

      const html = '<div class="journal-editor-wrap">' +
        '<div class="journal-editor-header">' +
        '<div class="journal-editor-date">' + dateLabel + (isToday ? ' <span style="font-size:13px;background:var(--blue);color:#fff;padding:2px 9px;border-radius:10px;font-weight:500;vertical-align:middle">Aujourd\'hui</span>' : '') + '</div>' +
        '<div class="journal-editor-meta">' +
        '<span id="journal-wordcount">' + words + ' mot' + (words !== 1 ? 's' : '') + '</span>' +
        '<span id="journal-saved">' + savedLabel + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="journal-paper">' +
        '<textarea class="journal-textarea" id="journal-textarea" placeholder="Écris ici ta journée, tes pensées, tes notes..." oninput="journalAutoSave(\'' + ds + '\',this.value)">' + escapeHtml(entry.text || '') + '</textarea>' +
        '</div>' +
        '</div>';

      document.getElementById('content').innerHTML = html;
      const ta = document.getElementById('journal-textarea');
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    }
  }

  var _journalSaveTimer = null;
  window.journalAutoSave = function (ds, val) {
    const wc = document.getElementById('journal-wordcount');
    const words = journalWordCount(val);
    if (wc) wc.textContent = words + ' mot' + (words !== 1 ? 's' : '');
    const saved = document.getElementById('journal-saved');
    if (saved) saved.textContent = 'En cours...';
    clearTimeout(_journalSaveTimer);
    _journalSaveTimer = setTimeout(function () {
      S.journal = S.journal || {};
      S.journal[ds] = { text: val, updatedAt: Date.now() };
      save();
      if (saved) saved.textContent = 'Sauvegardé à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }, 600);
  };

  window.journalOpenDay = function (ds) {
    const nav = journalNavState();
    nav.dayKey = ds;
    nav.level = 'day';
    const [y, m] = ds.split('-');
    nav.monthKey = y + '-' + m;
    save(); renderView();
  };

  window.journalBack = function () {
    journalNavState().level = 'month';
    save(); renderView();
  };

  window.journalShiftMonth = function (dir) {
    const nav = journalNavState();
    const [y, m] = nav.monthKey.split('-').map(Number);
    const nd = new Date(y, m - 1 + dir, 1);
    nav.monthKey = nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0');
    save(); renderView();
  };

  window.journalShiftDay = function (dir) {
    const nav = journalNavState();
    const d = new Date(nav.dayKey + 'T00:00:00');
    d.setDate(d.getDate() + dir);
    nav.dayKey = dateStr(d);
    save(); renderView();
  };

  function renderImportHub() {
    document.getElementById('view-title').textContent = 'Import ENSAM';
    document.getElementById('topbar-right').innerHTML = '<button class="btn btn-primary" onclick="openEnsamImport()">Importer un emploi du temps</button>';
    document.getElementById('content').innerHTML = '' +
      '<div class="import-card">' +
      '<h3 style="margin-bottom:8px">Importer via PDF, image ou texte</h3>' +
      '<p style="font-size:14px;color:#6E6E73;margin-bottom:12px">Utilisez le module ENSAM pour extraire automatiquement les cours et les convertir en evenements calendrier.</p>' +
      '<button class="btn btn-primary" onclick="openEnsamImport()">Ouvrir le module d\'import</button>' +
      '</div>' +
      '<div class="import-card">' +
      '<h3 style="margin-bottom:8px">Conseils qualite</h3>' +
      '<ul style="padding-left:18px;color:#6E6E73">' +
      '<li>Preferer un PDF texte non scanne.</li>' +
      '<li>Verifier le lundi de debut avant import.</li>' +
      '<li>Toutes les seances importees sont harmonisees en bleu ENSAM.</li>' +
      '</ul>' +
      '</div>';
  }

  function renderAnalytics() {
    const tasks = S.tasks || [];
    const events = S.calEvents || [];
    const done = tasks.filter(function (t) { return !!t.done; }).length;
    const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    const byMatter = {};
    const minutesByMatter = {};
    tasks.forEach(function (t) {
      const k = t.matiere || 'General';
      byMatter[k] = (byMatter[k] || 0) + 1;
    });
    events.forEach(function (e) {
      const k = e.title || 'General';
      const start = minutes(e.start || '08:00');
      const end = Math.max(start, minutes(e.end || e.start || '08:00'));
      const dur = Math.max(30, end - start);
      minutesByMatter[k] = (minutesByMatter[k] || 0) + dur;
    });

    const trendDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = dateStr(d);
      const lbl = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
      const doneCount = tasks.filter(function (t) {
        return t.done && t.updatedAt && String(t.updatedAt).slice(0, 10) === ds;
      }).length;
      trendDays.push({ label: lbl, value: doneCount });
    }
    if (!trendDays.some(function (x) { return x.value > 0; })) {
      // Fallback simple when historical completion dates are absent.
      trendDays[6].value = tasks.filter(function (t) { return t.done; }).length;
    }
    const maxTrend = Math.max(1, Math.max.apply(null, trendDays.map(function (x) { return x.value; })));
    const topMinutes = Object.keys(minutesByMatter).sort(function (a, b) { return minutesByMatter[b] - minutesByMatter[a]; }).slice(0, 5);
    const productivity = Math.min(100, Math.round((completion * 0.6) + (Math.min(events.length, 20) * 2)));

    document.getElementById('view-title').textContent = 'Analytics';
    document.getElementById('topbar-right').innerHTML = '<span class="score-pill">Score ' + productivity + '/100</span>';
    document.getElementById('content').innerHTML = '' +
      '<div class="analytics-grid">' +
      '<div class="analytics-card"><div style="font-size:12px;color:#8E8E93">Taux de completion</div><div style="font-size:30px;font-weight:700">' + completion + '%</div></div>' +
      '<div class="analytics-card"><div style="font-size:12px;color:#8E8E93">Taches terminees</div><div style="font-size:30px;font-weight:700">' + done + '</div></div>' +
      '<div class="analytics-card"><div style="font-size:12px;color:#8E8E93">Evenements planifies</div><div style="font-size:30px;font-weight:700">' + events.length + '</div></div>' +
      '<div class="analytics-card"><div style="font-size:12px;color:#8E8E93">Taches en retard</div><div style="font-size:30px;font-weight:700">' + tasks.filter(function (t) { return !t.done && t.due && t.due < todayStr(); }).length + '</div></div>' +
      '</div>' +
      '<div class="analytics-card"><h3 style="margin-bottom:8px">Charge par matiere</h3>' +
      Object.keys(byMatter).sort(function (a, b) { return byMatter[b] - byMatter[a]; }).map(function (k) {
        return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>' + k + '</span><strong>' + byMatter[k] + '</strong></div>';
      }).join('') +
      '</div>' +
      '<div class="analytics-card"><h3 style="margin-bottom:8px">Tendance 7 jours</h3>' +
      trendDays.map(function (d) {
        const pct = Math.round((d.value / maxTrend) * 100);
        return '<div class="chart-row"><span style="font-size:12px;color:#6E6E73">' + d.label + '</span><div class="chart-track"><div class="chart-fill" style="width:' + pct + '%"></div></div><strong style="font-size:12px">' + d.value + '</strong></div>';
      }).join('') +
      '</div>' +
      '<div class="analytics-card"><h3 style="margin-bottom:8px">Temps par matiere (estime)</h3>' +
      (topMinutes.length ? topMinutes.map(function (k) {
        const h = (minutesByMatter[k] / 60).toFixed(1);
        return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>' + k + '</span><strong>' + h + 'h</strong></div>';
      }).join('') : '<div style="font-size:13px;color:#6E6E73">Ajoutez des evenements avec horaire pour calculer le temps.</div>') +
      '</div>' +
      '<div class="analytics-card"><h3 style="margin-bottom:8px">Badges</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<span class="score-pill">' + (completion >= 70 ? '🏆 Focus Master' : '🎯 Keep Going') + '</span>' +
      '<span class="score-pill">' + (events.length >= 8 ? '📅 Planner Pro' : '🗓️ Calendar Starter') + '</span>' +
      '<span class="score-pill">' + (tasks.length >= 10 ? '📚 Heavy Learner' : '📝 Building Habits') + '</span>' +
      '</div></div>';
  }

  function renderSettings() {
    ensureSettingsDefaults();
    document.getElementById('view-title').textContent = 'Reglages';
    document.getElementById('topbar-right').innerHTML = '';
    document.getElementById('content').innerHTML = '' +
      '<div class="settings-grid">' +
      '<div class="settings-card">' +
      '<h3 style="margin-bottom:10px">Apparence</h3>' +
      '<label style="display:block;font-size:13px;margin-bottom:6px">Theme</label>' +
      '<select class="detail-field" id="set-theme" onchange="updateSettingTheme(this.value)">' +
      '<option value="system" ' + (S.settings.themeMode === 'system' ? 'selected' : '') + '>Systeme</option>' +
      '<option value="light" ' + (S.settings.themeMode === 'light' ? 'selected' : '') + '>Clair</option>' +
      '<option value="dark" ' + (S.settings.themeMode === 'dark' ? 'selected' : '') + '>Sombre</option>' +
      '</select>' +
      '<label style="display:block;font-size:13px;margin-bottom:6px">Couleur accent</label>' +
      '<input class="detail-field" type="color" id="set-accent" value="' + (S.settings.accent || '#007AFF') + '" onchange="updateSettingAccent(this.value)" />' +
      '</div>' +
      '<div class="settings-card">' +
      '<h3 style="margin-bottom:10px">Productivite</h3>' +
      '<label style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="checkbox" ' + (S.settings.notifications ? 'checked' : '') + ' onchange="toggleSettingNotifications(this.checked)"/> Activer les rappels</label>' +
      '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" ' + (S.sidebarCollapsed ? 'checked' : '') + ' onchange="toggleSettingSidebar(this.checked)"/> Sidebar compacte</label>' +
      '<div style="margin-top:10px"><button class="btn" onclick="enableSystemNotifications()">Autoriser notifications systeme</button></div>' +
      '<div style="margin-top:10px"><button class="btn" onclick="sendTestNotification()">Envoyer un rappel test</button></div>' +
      '</div>' +
      '</div>';

    const list = (S.settings.subjectColors || []).map(function (s, i) {
      return '<div class="subject-row">' +
        '<input type="color" value="' + eventColorToHex(s.color || 'ev-blue') + '" onchange="updateSubjectColor(' + i + ', this.value)" />' +
        '<input type="text" value="' + String(s.name || '').replace(/"/g, '&quot;') + '" placeholder="Matiere" onchange="updateSubjectName(' + i + ', this.value)" />' +
        '<button class="btn" onclick="removeSubjectColor(' + i + ')">Suppr.</button>' +
        '</div>';
    }).join('');

    document.getElementById('content').innerHTML += '' +
      '<div class="settings-card" style="margin-top:12px">' +
      '<h3 style="margin-bottom:10px">Matieres & codes couleur</h3>' +
      '<p style="font-size:13px;color:#6E6E73;margin-bottom:10px">Les evenements prennent automatiquement la couleur de leur matiere si le titre correspond.</p>' +
      '<div>' + list + '</div>' +
      '<div class="subject-add-row">' +
      '<input id="subject-name" type="text" placeholder="Nouvelle matiere..." />' +
      '<input id="subject-color" type="color" value="#3b82f6" />' +
      '<button class="btn btn-primary" onclick="addSubjectColor()">Ajouter</button>' +
      '</div>' +
      '<div style="margin-top:10px"><button class="btn" onclick="applySubjectColorsToExistingEvents()">Appliquer aux evenements existants</button></div>' +
      '</div>';
  }

  window.addSubjectColor = function () {
    const n = (document.getElementById('subject-name') || {}).value || '';
    const c = (document.getElementById('subject-color') || {}).value || '#3b82f6';
    const name = n.trim();
    if (!name) return;
    S.settings.subjectColors = S.settings.subjectColors || [];
    S.settings.subjectColors.push({ name: name, color: hexToEventColor(c) });
    save();
    renderView();
  };

  window.updateSubjectColor = function (idx, hex) {
    if (!S.settings.subjectColors || !S.settings.subjectColors[idx]) return;
    S.settings.subjectColors[idx].color = hexToEventColor(hex);
    save();
  };

  window.updateSubjectName = function (idx, name) {
    if (!S.settings.subjectColors || !S.settings.subjectColors[idx]) return;
    S.settings.subjectColors[idx].name = String(name || '').trim();
    save();
  };

  window.removeSubjectColor = function (idx) {
    if (!S.settings.subjectColors) return;
    S.settings.subjectColors.splice(idx, 1);
    save();
    renderView();
  };

  window.applySubjectColorsToExistingEvents = function () {
    let updated = 0;
    (S.calEvents || []).forEach(function (ev) {
      const inferred = inferSubjectColor(ev.title);
      if (inferred && ev.color !== inferred) {
        ev.color = inferred;
        updated++;
      }
    });
    save();
    toast(updated ? (updated + ' evenement(s) recolores.') : 'Aucune modification.');
    renderView();
  };

  window.enableSystemNotifications = async function () {
    const perm = await requestSystemNotificationPermission();
    if (perm === 'granted') toast('Notifications systeme activees.');
    else if (perm !== 'unsupported') toast('Permission notifications: ' + perm);
  };

  window.sendTestNotification = function () {
    if (!S.settings.notifications) {
      toast('Activez d abord les rappels dans les reglages.');
      return;
    }
    notifySystem('Academic Hub Pro', 'Rappel test: votre planification est active.');
    toast('Rappel test envoye (si autorise).');
  };

  window.updateSettingTheme = function (v) {
    S.settings.themeMode = v;
    save();
    applyTheme();
    toast('Theme mis a jour');
  };

  window.updateSettingAccent = function (v) {
    S.settings.accent = v;
    save();
    applyTheme();
    toast('Accent mis a jour');
  };

  window.toggleSettingNotifications = function (checked) {
    S.settings.notifications = !!checked;
    if (S.settings.notifications) {
      requestSystemNotificationPermission().then(function () {});
    }
    save();
  };

  window.toggleSettingSidebar = function (checked) {
    S.sidebarCollapsed = !!checked;
    document.body.classList.toggle('sidebar-collapsed', S.sidebarCollapsed);
    const btn = document.getElementById('sidebar-toggle');
    if (btn) btn.textContent = S.sidebarCollapsed ? '»' : '«';
    save();
  };

  function renderSearchView() {
    const q = (S.searchQ || '').trim().toLowerCase();
    document.getElementById('view-title').textContent = 'Recherche';
    document.getElementById('topbar-right').innerHTML = '<span class="score-pill">' + (q ? ('"' + S.searchQ + '"') : 'Aucun filtre') + '</span>';
    if (!q) {
      document.getElementById('content').innerHTML = '<div class="empty-state">Tapez une recherche globale puis validez avec Entree.</div>';
      return;
    }

    ensureGoalsStore();

    const tasks = S.tasks.filter(function (t) {
      const txt = [t.name, t.matiere, t.notes].join(' ').toLowerCase();
      return txt.includes(q);
    }).map(function (t) { return { kind: 'Tache', title: t.name, sub: (t.due || 'Sans date') + (t.matiere ? (' • ' + t.matiere) : '') }; });

    const events = S.calEvents.filter(function (e) {
      return [e.title, e.location, e.prof, e.notes].join(' ').toLowerCase().includes(q);
    }).map(function (e) { return { kind: 'Evenement', title: e.title, sub: (e.date || '') + ' ' + (e.start || '') + (e.location ? (' • ' + e.location) : '') }; });

    const ideas = S.ideas.filter(function (i) {
      return String(i.text || '').toLowerCase().includes(q);
    }).map(function (i) { return { kind: 'Idee', title: i.text.slice(0, 70), sub: new Date(i.ts).toLocaleDateString('fr-FR') }; });

    const goals = [];
    Object.keys(S.goalWeeks).forEach(function (wk) {
      (S.goalWeeks[wk] || []).forEach(function (g) {
        if (String(g.text || '').toLowerCase().includes(q)) {
          goals.push({ kind: 'Objectif', title: g.text, sub: weekLabel(wk) + (g.done ? ' • termine' : ' • en cours') });
        }
      });
    });

    const all = tasks.concat(events, ideas, goals);
    document.getElementById('content').innerHTML = all.length ?
      '<div class="search-grid">' + all.map(function (r) {
        return '<div class="search-result-card"><div style="font-size:12px;color:#8E8E93">' + r.kind + '</div><div style="font-weight:600;margin:4px 0">' + r.title + '</div><div style="font-size:12px;color:#6E6E73">' + r.sub + '</div></div>';
      }).join('') + '</div>' :
      '<div class="empty-state">Aucun resultat pour "' + S.searchQ + '".</div>';
  }

  function getMyDayTasks(today) {
    const map = {};
    (S.tasks || []).forEach(function (t) {
      if (t.done) return;
      if (t.due === today || t.myDay) {
        map[t.id] = t;
      }
    });
    return Object.keys(map).map(function (id) { return map[id]; });
  }

  function getWeekGoalsForToday() {
    ensureGoalsStore();
    const monday = getMondayForDate(new Date());
    const key = dateStr(monday);
    return S.goalWeeks[key] || [];
  }

  function renderMyDayHub() {
    const today = todayStr();
    const dayEvents = (S.calEvents || []).filter(function (e) { return e.date === today; }).sort(function (a, b) {
      return String(a.start || '').localeCompare(String(b.start || ''));
    });
    const dayTasks = getMyDayTasks(today);
    const weekGoals = getWeekGoalsForToday();
    const doneGoals = weekGoals.filter(function (g) { return g.done; }).length;
    const overdue = (S.tasks || []).filter(function (t) { return !t.done && t.due && t.due < today; }).length;
    const focusScore = Math.max(10, Math.min(100, 100 - overdue * 10));
    const goalsPct = weekGoals.length ? Math.round((doneGoals / weekGoals.length) * 100) : 0;

    document.getElementById('view-title').textContent = 'Ma journée';
    document.getElementById('topbar-right').innerHTML =
      '<button class="btn btn-primary" onclick="openQuickAddTodayTask()">+ Tâche</button>' +
      '<button class="btn" onclick="openNewEvent(\'' + today + '\',\'08:30\')">+ Événement</button>';

    // Labels
    const rawLabel = new Date(today + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const todayLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Focus ring SVG (r=34, cx=cy=40, circumference≈213.6)
    var R = 34, CX = 40, CY = 40;
    var circ = +(2 * Math.PI * R).toFixed(1);
    var offset = +((1 - focusScore / 100) * circ).toFixed(1);
    var ringColor = focusScore >= 70 ? 'var(--ds-green)' : focusScore >= 40 ? 'var(--ds-orange)' : 'var(--ds-red)';

    // ── Timeline event helper ────────────────────────────────────────
    function tlEvent(e) {
      var hex = eventColorToHex(e.color || 'ev-blue');
      var bgHex = hex + '14';
      return '<div class="myday-tl-item" onclick="editEvent(\'' + e.id + '\')" style="border-left-color:' + hex + ';background:' + bgHex + '">' +
        '<div class="myday-tl-time">' +
          '<span class="myday-tl-pill" style="background:' + hex + '22;color:' + hex + '">' + (e.start || '--:--') + '</span>' +
          (e.end ? '<span class="myday-tl-end">→ ' + e.end + '</span>' : '') +
        '</div>' +
        '<div class="myday-tl-title">' + e.title + '</div>' +
        (e.location ? '<div class="myday-tl-loc">📍 ' + e.location + '</div>' : '') +
        '</div>';
    }

    // ── Task row helper ──────────────────────────────────────────────
    function taskRow(t) {
      var st = t.plannedStart || '08:00';
      var en = t.plannedEnd || '10:00';
      return '<div class="myday-task-row' + (t.done ? ' myday-task-done' : '') + '">' +
        '<div class="check-btn ' + (t.done ? 'checked' : '') + '" onclick="toggleDone(\'' + t.id + '\')"></div>' +
        '<div class="myday-task-body">' +
          '<div class="myday-task-name">' + t.name + '</div>' +
          '<span class="myday-task-time">' + st + ' – ' + en + '</span>' +
        '</div>' +
        '<button class="myday-task-expand" onclick="openMyDayTaskPanel(\'' + t.id + '\')" title="Détails">' +
          '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
        '</button>' +
        '</div>';
    }

    // ── Goal row helper ──────────────────────────────────────────────
    function goalRow(g, i) {
      return '<div class="myday-goal-row' + (g.done ? ' myday-goal-done' : '') + '">' +
        '<div class="check-btn ' + (g.done ? 'checked' : '') + '" onclick="toggleTodayGoal(' + i + ')"></div>' +
        '<span class="myday-goal-text">' + g.text + '</span>' +
        '</div>';
    }

    // ── Empty state helper ───────────────────────────────────────────
    function emptyBlock(icon, text, btnLabel, btnAction) {
      return '<div class="myday-empty">' + icon +
        '<div>' + text + '</div>' +
        (btnLabel ? '<button class="btn btn-primary" style="margin-top:10px;height:32px;font-size:12px" onclick="' + btnAction + '">' + btnLabel + '</button>' : '') +
        '</div>';
    }

    // ── Stat card color ──────────────────────────────────────────────
    var overdueClass = overdue > 0 ? 'myday-stat-red' : 'myday-stat-green';
    var overdueIcon  = overdue > 0 ? '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>' : '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    var html =

      // ════════════════ HERO ════════════════
      '<div class="myday-hero">' +
        '<div class="myday-hero-info">' +
          '<div class="myday-greeting">Bonjour, ' + ((window.S && window.S.userName) || 'Étudiant') + '</div>' +
          '<div class="myday-date">' + todayLabel + '</div>' +
          '<div class="myday-clock" id="myday-clock">' + nowTime + '</div>' +
        '</div>' +
        '<div class="myday-ring-wrap">' +
          '<svg width="80" height="80" viewBox="0 0 80 80" style="display:block">' +
            '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="none" stroke="var(--ds-bg-tertiary)" stroke-width="6"/>' +
            '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="none" stroke="' + ringColor + '" stroke-width="6"' +
              ' stroke-linecap="round"' +
              ' stroke-dasharray="' + circ + '"' +
              ' stroke-dashoffset="' + offset + '"' +
              ' transform="rotate(-90 ' + CX + ' ' + CY + ')"' +
              ' style="transition:stroke-dashoffset .7s cubic-bezier(0.4,0,0.2,1)"/>' +
          '</svg>' +
          '<div class="myday-ring-center">' +
            '<div class="myday-ring-score">' + focusScore + '</div>' +
            '<div class="myday-ring-lbl">focus</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // ════════════════ STATS ════════════════
      '<div class="myday-stats">' +
        '<div class="myday-stat myday-stat-blue">' +
          '<div class="myday-stat-icon">' +
            '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>' +
          '</div>' +
          '<div><div class="myday-stat-val">' + dayEvents.length + '</div><div class="myday-stat-lbl">Événements</div></div>' +
        '</div>' +
        '<div class="myday-stat myday-stat-amber">' +
          '<div class="myday-stat-icon">' +
            '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>' +
          '</div>' +
          '<div><div class="myday-stat-val">' + doneGoals + '<span class="myday-stat-sub">/' + weekGoals.length + '</span></div><div class="myday-stat-lbl">Objectifs</div></div>' +
        '</div>' +
        '<div class="myday-stat ' + overdueClass + '">' +
          '<div class="myday-stat-icon">' + overdueIcon + '</div>' +
          '<div><div class="myday-stat-val">' + overdue + '</div><div class="myday-stat-lbl">' + (overdue > 0 ? 'En retard' : 'À jour') + '</div></div>' +
        '</div>' +
      '</div>' +

      // ════════════════ MAIN GRID ════════════════
      '<div class="myday-grid">' +

        // ── Timeline ──
        '<div class="myday-panel">' +
          '<div class="myday-panel-hdr">' +
            '<span class="myday-panel-title">' +
              '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>' +
              ' Timeline du jour' +
            '</span>' +
            '<button class="btn" style="height:28px;font-size:12px;padding:0 10px" onclick="openNewEvent(\'' + today + '\',\'08:30\')">+ Événement</button>' +
          '</div>' +
          '<div class="myday-timeline">' +
            (dayEvents.length ? dayEvents.map(tlEvent).join('') :
              emptyBlock(
                '<svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2" style="opacity:.25;margin-bottom:6px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>',
                'Aucun événement aujourd\'hui',
                'Planifier',
                'openNewEvent(\'' + today + '\',\'08:30\')'
              )
            ) +
          '</div>' +
        '</div>' +

        // ── Tâches ──
        '<div class="myday-panel">' +
          '<div class="myday-panel-hdr">' +
            '<span class="myday-panel-title">' +
              '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7l-3 3-1.5-1.5"/></svg>' +
              ' Tâches du jour' +
            '</span>' +
            (dayTasks.length ? '<span class="score-pill" style="font-size:11px">' + dayTasks.filter(function(t){return t.done;}).length + '/' + dayTasks.length + '</span>' : '') +
          '</div>' +
          '<div class="myday-tasks-list">' +
            (dayTasks.length ? dayTasks.map(taskRow).join('') :
              emptyBlock(
                '<svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2" style="opacity:.25;margin-bottom:6px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>',
                'Aucune tâche planifiée',
                'Ajouter une tâche',
                'openQuickAddTodayTask()'
              )
            ) +
          '</div>' +
        '</div>' +

      '</div>' + // /myday-grid

      // ════════════════ OBJECTIFS ════════════════
      '<div class="myday-goals-panel">' +
        '<div class="myday-goals-hdr">' +
          '<span class="myday-panel-title">' +
            '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>' +
            ' Objectifs de la semaine' +
          '</span>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            (weekGoals.length ? '<span style="font-size:12px;color:var(--ds-text-tertiary);font-weight:500">' + goalsPct + '%</span>' : '') +
            '<button class="btn" style="height:28px;font-size:12px;padding:0 10px" onclick="gotoView(\'goals\',document.getElementById(\'nav-goals\'))">Gérer</button>' +
          '</div>' +
        '</div>' +
        (weekGoals.length ?
          '<div class="myday-goals-track"><div class="myday-goals-fill" style="width:' + goalsPct + '%"></div></div>' : '') +
        '<div class="myday-goals-list">' +
          (weekGoals.length ? weekGoals.map(goalRow).join('') :
            '<div style="font-size:13px;color:var(--ds-text-tertiary);padding:6px 0">Aucun objectif — <button class="btn" style="height:26px;font-size:12px;padding:0 10px;display:inline-flex" onclick="gotoView(\'goals\',document.getElementById(\'nav-goals\'))">En créer un</button></div>'
          ) +
        '</div>' +
      '</div>';

    document.getElementById('content').innerHTML = html;

    // Live clock (refreshes every 30 s)
    clearInterval(window._mydayClock);
    window._mydayClock = setInterval(function () {
      var el = document.getElementById('myday-clock');
      if (!el) { clearInterval(window._mydayClock); return; }
      el.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }, 30000);

    if (S.myDayExpandedTaskId) {
      renderMyDayTaskPanel(S.myDayExpandedTaskId);
    } else {
      closeMyDayTaskPanel();
    }
  }

  function closeMyDayTaskPanel() {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    panel.classList.add('hidden');
    S.myDayExpandedTaskId = null;
  }

  window.addDayNote = function (dateKey, inputId) {
    const inp = document.getElementById(inputId || 'day-note-inp');
    const txt = String((inp && inp.value) || '').trim();
    if (!txt) return;
    S.dayNotes = S.dayNotes || {};
    if (!Array.isArray(S.dayNotes[dateKey])) S.dayNotes[dateKey] = [];
    S.dayNotes[dateKey].push({ text: txt, createdAt: Date.now() });
    if (inp) inp.value = '';
    save();
    renderView();
  };

  window.deleteDayNote = function (dateKey, idx) {
    S.dayNotes = S.dayNotes || {};
    const list = S.dayNotes[dateKey];
    if (!list) return;
    list.splice(idx, 1);
    save();
    renderView();
  };

  function renderMyDayTaskPanel(taskId) {
    const panel = document.getElementById('detail-panel');
    const inner = document.getElementById('detail-inner');
    if (!panel || !inner) return;
    const t = (S.tasks || []).find(function (x) { return x.id === taskId; });
    if (!t) {
      closeMyDayTaskPanel();
      return;
    }
    S.myDayExpandedTaskId = taskId;
    panel.classList.remove('hidden');
    const st = t.plannedStart || '08:00';
    const en = t.plannedEnd || '10:00';
    const syncLabel = t.calendarTaskEventId ? 'Mettre a jour' : 'Planifier';
    const doneLabel = t.done ? 'Remettre active' : 'Terminer';
    const starLabel = t.starred ? 'Retirer important' : 'Important';
    inner.innerHTML = '' +
      '<div style="display:flex;align-items:center;margin-bottom:14px">' +
      '<span style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">Planification</span>' +
      '<button class="btn" style="margin-left:auto;padding:3px 8px" onclick="closeMyDayTaskPanel()">✕</button>' +
      '</div>' +
      '<div style="font-size:16px;font-weight:600;margin-bottom:10px">' + t.name + '</div>' +
      '<div class="detail-label">Horaire</div>' +
      '<div class="detail-label">Debut</div>' +
      '<input class="detail-field" type="time" value="' + st + '" onchange="setTaskScheduleFromMyDay(\'' + t.id + '\',this.value,null)" />' +
      '<div class="detail-label">Fin</div>' +
      '<input class="detail-field" type="time" value="' + en + '" onchange="setTaskScheduleFromMyDay(\'' + t.id + '\',null,this.value)" />' +
      '<div class="detail-label">Couleur</div>' +
      '<input class="detail-field" type="color" value="' + eventColorToHex(t.color || 'ev-green') + '" onchange="setPlannedTaskColor(\'' + t.id + '\',this.value)" />' +
      '<div class="modal-actions" style="display:grid;grid-template-columns:1fr;gap:8px;justify-content:stretch">' +
      '<button class="btn btn-primary" onclick="scheduleTaskFromMyDay(\'' + t.id + '\')">' + syncLabel + '</button>' +
      '<button class="btn" onclick="toggleDone(\'' + t.id + '\')">' + doneLabel + '</button>' +
      '<button class="btn" onclick="toggleStar(\'' + t.id + '\')">' + starLabel + '</button>' +
      '<button class="btn" onclick="openTaskDetailsFromMyDay(\'' + t.id + '\')">Suivi</button>' +
      '<button class="btn btn-red" onclick="deleteTaskFromMyDay(\'' + t.id + '\')">Supprimer</button>' +
      '</div>';
  }

  window.closeMyDayTaskPanel = closeMyDayTaskPanel;
  window.openMyDayTaskPanel = function (taskId) {
    renderMyDayTaskPanel(taskId);
  };

  window.toggleTodayGoal = function (i) {
    const goals = getWeekGoalsForToday();
    if (!goals[i]) return;
    goals[i].done = !goals[i].done;
    save();
    renderView();
  };

  window.scheduleTaskFromMyDay = function (taskId) {
    const t = (S.tasks || []).find(function (x) { return x.id === taskId; });
    if (!t) return;
    const today = todayStr();
    t.plannedStart = t.plannedStart || '14:00';
    t.plannedEnd = t.plannedEnd || '16:00';
    t.color = t.color || 'ev-green';
    t.due = today;
    t.myDay = true;
    if (typeof window.syncTaskIntoCalendar === 'function') {
      window.syncTaskIntoCalendar(t);
    }
    save();
    toast('Tache planifiee dans le calendrier.');
    renderView();
  };

  window.openQuickAddTodayTask = function () {
    openQuickAdd();
    setTimeout(function () {
      const kind = document.getElementById('qa-kind');
      const date = document.getElementById('qa-date');
      const start = document.getElementById('qa-start');
      const end = document.getElementById('qa-end');
      if (kind) kind.value = 'task';
      if (date) date.value = todayStr();
      if (start) start.value = '08:00';
      if (end) end.value = '10:00';
    }, 20);
  };

  window.setTaskScheduleFromMyDay = function (taskId, start, end) {
    const t = (S.tasks || []).find(function (x) { return x.id === taskId; });
    if (!t) return;
    if (start) t.plannedStart = start;
    if (end) t.plannedEnd = end;
    t.due = todayStr();
    t.myDay = true;
    if (!t.plannedStart) t.plannedStart = '08:00';
    if (!t.plannedEnd) t.plannedEnd = '10:00';
    if (typeof window.syncTaskIntoCalendar === 'function') {
      window.syncTaskIntoCalendar(t);
    }
    save();
    renderView();
  };

  window.deleteTaskFromMyDay = function (taskId) {
    if (typeof window.delTask === 'function') {
      if (S.myDayExpandedTaskId === taskId) S.myDayExpandedTaskId = null;
      window.delTask(taskId);
      toast('Tache supprimee.');
      return;
    }
    S.tasks = (S.tasks || []).filter(function (t) { return t.id !== taskId; });
    S.calEvents = (S.calEvents || []).filter(function (e) { return e.taskId !== taskId; });
    save();
    renderView();
  };

  window.setPlannedTaskColor = function (taskId, hex) {
    const t = (S.tasks || []).find(function (x) { return x.id === taskId; });
    if (!t) return;
    t.color = hexToEventColor(hex);
    if (typeof window.syncTaskIntoCalendar === 'function') {
      window.syncTaskIntoCalendar(t);
    }
    save();
    renderView();
  };

  window.removePlannedTaskFromMyDay = function (taskId) {
    const t = (S.tasks || []).find(function (x) { return x.id === taskId; });
    if (!t) return;
    if (t.calendarTaskEventId) {
      S.calEvents = (S.calEvents || []).filter(function (e) { return e.id !== t.calendarTaskEventId; });
    }
    S.calEvents = (S.calEvents || []).filter(function (e) { return e.taskId !== taskId; });
    t.calendarTaskEventId = '';
    t.plannedStart = '';
    t.plannedEnd = '';
    save();
    toast('Planification supprimee (tache conservee).');
    renderView();
  };

  window.openTaskDetailsFromMyDay = function (taskId) {
    S.myDayExpandedTaskId = null;
    S.selectedTask = taskId;
    S.view = 'all';
    renderView();
  };

  function ensureEventTypeField() {
    const colorRow = document.getElementById('ev-color') ? document.getElementById('ev-color').closest('.modal-row') : null;
    if (!colorRow || document.getElementById('ev-type')) return;
    const row = document.createElement('div');
    row.className = 'modal-row';
    row.innerHTML = '<select class="modal-field" id="ev-type" onchange="updateEventTypeFields(true)">' +
      '<option value="course">Cours</option>' +
      '<option value="sport">Sport</option>' +
      '<option value="personal">Personnel</option>' +
      '<option value="project">Projet</option>' +
      '<option value="reminder">Rappel</option>' +
      '</select>';
    colorRow.parentNode.insertBefore(row, colorRow);
  }

  window.updateEventTypeFields = function (forceColorDefault) {
    const type = (document.getElementById('ev-type') || {}).value || 'course';
    const locRow = document.getElementById('ev-location-row');
    const profRow = document.getElementById('ev-prof-row');
    if (!locRow || !profRow) return;

    const showLocation = type === 'course' || type === 'sport' || type === 'project';
    const showProf = type === 'course';

    locRow.style.display = showLocation ? 'block' : 'none';
    profRow.style.display = showProf ? 'block' : 'none';

    const locInput = document.getElementById('ev-location');
    const profInput = document.getElementById('ev-prof');
    if (locInput) {
      locInput.placeholder = type === 'sport' ? 'Lieu / Club' : (type === 'project' ? 'Equipe / Salle' : 'Lieu (ex: Amphi 2)');
    }
    if (profInput) {
      profInput.placeholder = 'Professeur';
    }

    const colorInput = document.getElementById('ev-color');
    if (colorInput && forceColorDefault) {
      colorInput.value = eventColorToHex(typeDefaultColor(type));
    }
  };

  window.openNewEvent = function (date, time) {
    window.__appleEditingEventId = null;
    legacyOpenNewEvent(date, time);
    ensureEventTypeField();
    const typeSel = document.getElementById('ev-type');
    if (typeSel) typeSel.value = 'course';
    updateEventTypeFields(true);
  };

  window.editEvent = function (id) {
    window.__appleEditingEventId = id;
    legacyEditEvent(id);
    ensureEventTypeField();
    const ev = (S.calEvents || []).find(function (e) { return e.id === id; });
    const typeSel = document.getElementById('ev-type');
    if (typeSel) typeSel.value = (ev && ev.type) || 'course';
    updateEventTypeFields(false);
  };

  window.saveEvent = function () {
    const typeSel = document.getElementById('ev-type');
    const type = typeSel ? typeSel.value : 'course';
    const editedId = window.__appleEditingEventId;
    legacySaveEvent();
    if (!S.calEvents.length) return;
    let ev = null;
    if (editedId) {
      ev = S.calEvents.find(function (x) { return x.id === editedId; });
    }
    if (!ev) {
      ev = S.calEvents[S.calEvents.length - 1];
    }
    if (ev) {
      ev.type = type;
      ev.color = eventColorToHex(ev.color || typeDefaultColor(type));
    }
    window.__appleEditingEventId = null;
    save();
  };

  window.toggleDone = function (id) {
    const nodes = document.querySelectorAll('.task-item[onclick*="' + id + '"] .check-btn, .check-btn[onclick*="' + id + '"]');
    nodes.forEach(function (el) {
      el.classList.remove('ahp-bounce');
      void el.offsetWidth;
      el.classList.add('ahp-bounce');
    });
    const t = (S.tasks || []).find(function (x) { return x.id === id; });
    var willDone = false;
    if (t) {
      willDone = !t.done;
      if (willDone) t.updatedAt = todayStr();
      else t.updatedAt = '';
    }
    legacyToggleDone(id);

    // Auto-sync : tâche terminée → Réalisations du jour (et retrait si décochée)
    if (t) {
      const today = todayStr();
      S.dayNotes = S.dayNotes || {};
      if (!Array.isArray(S.dayNotes[today])) S.dayNotes[today] = [];
      if (willDone) {
        const already = S.dayNotes[today].some(function (n) { return n.taskId === id; });
        if (!already) {
          S.dayNotes[today].push({ text: t.name, createdAt: Date.now(), taskId: id, autoFromTask: true });
        }
      } else {
        S.dayNotes[today] = S.dayNotes[today].filter(function (n) { return n.taskId !== id; });
      }
      save();
    }
  };

  function startIndexForEvent(ev) {
    return getSlotIndexFromTime(ev.start || getWeekRenderSlots()[0]);
  }

  function spanForEvent(ev) {
    const slots = getWeekSlotMinutes();
    if (!slots.length) return 1;
    const startIdx = startIndexForEvent(ev);
    const start = minutes(ev.start || getWeekRenderSlots()[0]);
    const end = Math.max(start + 30, minutes(ev.end || ev.start || getWeekRenderSlots()[0]));
    let endIdxExclusive = slots.length;
    for (let i = startIdx + 1; i < slots.length; i++) {
      if (end <= slots[i]) {
        endIdxExclusive = i;
        break;
      }
    }
    return Math.max(1, endIdxExclusive - startIdx);
  }

  window.dragTaskStart = function (event, taskId) {
    window.__dragTaskId = taskId;
    event.dataTransfer.setData('text/task-id', taskId);
    event.dataTransfer.effectAllowed = 'copy';
  };

  window.allowDrop = function (event) {
    event.preventDefault();
    if (event.currentTarget) event.currentTarget.classList.add('drop-hover');
  };

  window.clearDropHover = function (event) {
    if (event.currentTarget) event.currentTarget.classList.remove('drop-hover');
  };

  window.dropTaskOnTask = function (event, targetTaskId) {
    event.preventDefault();
    if (event.currentTarget) event.currentTarget.classList.remove('drop-hover');
    const draggedId = event.dataTransfer.getData('text/task-id') || window.__dragTaskId;
    if (!draggedId || draggedId === targetTaskId) return;
    const from = (S.tasks || []).findIndex(function (x) { return x.id === draggedId; });
    const to = (S.tasks || []).findIndex(function (x) { return x.id === targetTaskId; });
    if (from < 0 || to < 0) return;
    const moved = S.tasks.splice(from, 1)[0];
    const targetIndex = from < to ? to - 1 : to;
    S.tasks.splice(targetIndex, 0, moved);
    save();
    toast('Ordre des taches mis a jour.');
    renderView();
  };

  window.dropTaskOnDate = function (event, date) {
    event.preventDefault();
    if (event.currentTarget) event.currentTarget.classList.remove('drop-hover');
    const id = event.dataTransfer.getData('text/task-id') || window.__dragTaskId;
    if (!id) return;
    const t = (S.tasks || []).find(function (x) { return x.id === id; });
    if (!t) return;
    t.due = date;
    t.myDay = date === todayStr();
    save();
    toast('Date de tache mise a jour.');
    renderView();
  };

  window.dropTaskOnSlot = function (event, date, time) {
    event.preventDefault();
    clearDropHover(event);
    const id = event.dataTransfer.getData('text/task-id');
    if (!id) return;
    const t = S.tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    t.due = date;
    t.myDay = date === todayStr();
    S.calEvents.push({
      id: 'ev' + Date.now() + Math.random(),
      title: t.name,
      date: date,
      start: time,
      end: '',
      location: '',
      prof: '',
      color: t.color || 'ev-green',
      important: t.starred,
      notes: t.notes || '',
      type: 'project',
      source: 'task-dnd',
    });
    save();
    toast('Tache placee dans le calendrier');
    renderView();
  };

  window.taskHTML = function (t) {
    const html = legacyTaskHTML(t);
    const prefix = '<div class="task-item';
    const insert = '<div draggable="true" ondragstart="dragTaskStart(event,\'' + t.id + '\')" ondragover="allowDrop(event)" ondragleave="clearDropHover(event)" ondrop="dropTaskOnTask(event,\'' + t.id + '\')" class="task-item';
    return html.replace(prefix, insert);
  };

  window.renderWeekGrid = function () {
    const weekSlots = getWeekRenderSlots();
    const days = weekDaysFrom(getCursorDate());
    const today = todayStr();
    const cols = 'grid-template-columns:120px repeat(' + weekSlots.length + ', minmax(88px,1fr));';
    let html = '<div class="smart-week">';
    html += '<div class="smart-head" style="' + cols + '"><div></div>' + weekSlots.map(function (s) { return '<div>' + slotLabel(s) + '</div>'; }).join('') + '</div>';

    days.forEach(function (day) {
      const ds = dateStr(day);
      const events = mergeConsecutiveEvents((S.calEvents || []).filter(function (e) { return e.date === ds; }));
      const map = {};
      events.forEach(function (ev) {
        const start = startIndexForEvent(ev);
        map[start] = map[start] || [];
        map[start].push(ev);
      });

      html += '<div class="smart-row" style="' + cols + '">';
      html += '<div class="smart-day" onclick="S.calView=\'day\';S.calDay=\'' + ds + '\';S.calCursor=\'' + ds + '\';save();renderView()" ondrop="dropTaskOnDate(event,\'' + ds + '\')" ondragover="allowDrop(event)" ondragleave="clearDropHover(event)">' +
        DAYS_FR[day.getDay()] + ' ' + String(day.getDate()).padStart(2, '0') + (ds === today ? ' • Aujourd\'hui' : '') + '</div>';

      for (let i = 0; i < weekSlots.length; i++) {
        const slotTime = weekSlots[i];
        const list = map[i] || [];
        if (list.length) {
          const lead = list[0];
          const span = Math.min(weekSlots.length - i, spanForEvent(lead));
          html += '<div class="smart-cell" style="grid-column: span ' + span + ';" onclick="openNewEvent(\'' + ds + '\',\'' + slotTime + '\')" ondrop="dropTaskOnSlot(event,\'' + ds + '\',\'' + slotTime + '\')" ondragover="allowDrop(event)" ondragleave="clearDropHover(event)">' +
            '<div class="smart-events-stack">' +
            list.map(function (ev) {
              return '<div class="smart-event" style="' + colorStyleInline(ev.color, 'ev-blue') + '" onclick="event.stopPropagation();editEvent(\'' + ev.id + '\')">' +
                ev.title + '<small>' + (ev.start || '') + (ev.end ? (' - ' + ev.end) : '') + '</small></div>';
            }).join('') +
            '</div>' +
            '</div>';
          i += (span - 1);
        } else {
          html += '<div class="smart-cell" onclick="openNewEvent(\'' + ds + '\',\'' + slotTime + '\')" ondrop="dropTaskOnSlot(event,\'' + ds + '\',\'' + slotTime + '\')" ondragover="allowDrop(event)" ondragleave="clearDropHover(event)"></div>';
        }
      }

      html += '</div>';
    });

    html += '</div>';
    document.getElementById('content').innerHTML = html;
  };

  window.renderDayView = function () {
    legacyRenderDayView();
    const weekSlots = getWeekRenderSlots();
    const daySlots = document.querySelectorAll('.day-slot');
    daySlots.forEach(function (slot, idx) {
      const targetDate = S.calDay || S.calCursor || todayStr();
      const slotTime = weekSlots[idx] || ((window.HOURS && window.HOURS[idx]) ? window.HOURS[idx] : weekSlots[0] || '08:30');
      slot.setAttribute('ondrop', 'dropTaskOnSlot(event,\'' + targetDate + '\',\'' + slotTime + '\')');
      slot.setAttribute('ondragover', 'allowDrop(event)');
      slot.setAttribute('ondragleave', 'clearDropHover(event)');
    });
  };

  function openDayDetails(ds) {
    const old = document.getElementById('day-detail-modal');
    if (old) old.remove();
    const evs = (S.calEvents || []).filter(function (e) { return e.date === ds; });
    const tasks = (S.tasks || []).filter(function (t) { return t.due === ds && !t.done; });

    const overlay = document.createElement('div');
    overlay.id = 'day-detail-modal';
    overlay.className = 'modal-overlay';
    overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '' +
      '<div class="modal">' +
      '<div class="modal-title">Details du ' + ds + '<button class="btn" onclick="document.getElementById(\'day-detail-modal\').remove()">✕</button></div>' +
      '<div style="margin-bottom:10px">' +
      (evs.length ? evs.map(function (e) {
        return '<div class="agenda-item badge" style="display:block;margin-bottom:6px;' + colorStyleInline(e.color, 'ev-blue') + '">🗓 ' + (e.start || '') + ' ' + e.title + '</div>';
      }).join('') : '<div class="agenda-empty">Aucun evenement</div>') +
      '</div>' +
      '<div style="margin-bottom:12px">' +
      (tasks.length ? tasks.map(function (t) {
        return '<div class="agenda-item task" style="display:block;margin-bottom:6px">📌 ' + t.name + '</div>';
      }).join('') : '<div class="agenda-empty">Aucune tache due</div>') +
      '</div>' +
      '<div class="modal-actions" style="justify-content:space-between">' +
      '<button class="btn" onclick="document.getElementById(\'day-detail-modal\').remove();openNewEvent(\'' + ds + '\',\'08:30\')">+ Evenement</button>' +
      '<button class="btn btn-primary" onclick="document.getElementById(\'day-detail-modal\').remove();openQuickAdd();setTimeout(function(){var d=document.getElementById(\'qa-date\');if(d)d.value=\'' + ds + '\';},40)">+ Tache</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  window.renderMonthView = function () {
    legacyRenderMonthView();
    document.querySelectorAll('.month-cell').forEach(function (cell) {
      const m = cell.getAttribute('onclick') || '';
      const hit = m.match(/openNewEvent\('([^']+)'/);
      if (!hit) return;
      const ds = hit[1];
      cell.setAttribute('onclick', 'openDayDetails(\'' + ds + '\')');
      cell.setAttribute('ondrop', 'dropTaskOnDate(event,\'' + ds + '\')');
      cell.setAttribute('ondragover', 'allowDrop(event)');
      cell.setAttribute('ondragleave', 'clearDropHover(event)');
    });
  };

  window.openDayDetails = openDayDetails;

  window.viewTitleMap = function () {
    const map = legacyViewTitleMap();
    map.goals = 'Objectifs hebdo';
    map.accomplishments = 'Réalisations';
    map.journal = 'Journal';
    map.import = 'Import ENSAM';
    map.analytics = 'Analytics';
    map.settings = 'Reglages';
    map.search = 'Recherche';
    return map;
  };

  window.renderView = function () {
    applyTheme();
    syncNavActive();
    updateCounts();
    const d = new Date();
    const vd = document.getElementById('view-date');
    if (vd) vd.textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    if (S.view === 'today') {
      updateMobileNavState();
      return renderMyDayHub();
    }
    closeMyDayTaskPanel();
    if (S.view === 'goals') {
      updateMobileNavState();
      return renderGoalsHub();
    }
    if (S.view === 'accomplishments') {
      updateMobileNavState();
      return renderAccomplishmentsView();
    }
    if (S.view === 'journal') {
      updateMobileNavState();
      return renderJournalView();
    }
    if (S.view === 'import') {
      updateMobileNavState();
      return renderImportHub();
    }
    if (S.view === 'analytics') {
      updateMobileNavState();
      return renderAnalytics();
    }
    if (S.view === 'settings') {
      updateMobileNavState();
      return renderSettings();
    }
    if (S.view === 'search') {
      updateMobileNavState();
      return renderSearchView();
    }

    legacyRenderView();
    updateMobileNavState();
  };

  function registerShortcuts() {
    document.addEventListener('keydown', function (e) {
      const tag = String((e.target && e.target.tagName) || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        openQuickAdd();
        return;
      }

      if (!typing && String(e.key).toLowerCase() === 'n') {
        e.preventDefault();
        openQuickAdd();
        return;
      }

      if (!typing && String(e.key) === '/') {
        e.preventDefault();
        openQuickAdd();
      }
    });
  }

  function addNotificationsHint() {
    if (!S.settings.notifications || sessionStorage.getItem('ahp-notified')) return;
    const overdue = (S.tasks || []).filter(function (t) { return !t.done && t.due && t.due < todayStr(); }).length;
    const todayDue = (S.tasks || []).filter(function (t) { return !t.done && t.due === todayStr(); }).length;
    if (overdue > 0) {
      toast('Vous avez ' + overdue + ' tache(s) en retard.');
      notifySystem('Academic Hub Pro', 'Vous avez ' + overdue + ' tache(s) en retard.');
    }
    if (todayDue > 0) {
      notifySystem('Academic Hub Pro', todayDue + ' tache(s) prevues aujourd hui.');
    }
    sessionStorage.setItem('ahp-notified', '1');
  }

  function ensureAdvancedNavAndShell() {
    addSidebarToggle();
    labelizeNavItems();
    addNavIfMissing('nav-goals', 'goals', 'Weekly Goals', '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/><path stroke-linecap="round" d="M5 5h14M5 19h10"/>');
    addNavIfMissing('nav-import', 'import', 'ENSAM Import', '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path stroke-linecap="round" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>');
    addNavIfMissing('nav-analytics', 'analytics', 'Analytics', '<path stroke-linecap="round" stroke-linejoin="round" d="M4 19h16M7 16V8m5 8V5m5 11v-6"/>');
    addNavIfMissing('nav-settings', 'settings', 'Settings', '<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.36 2.36 1.724 1.724 0 001.066 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.36 2.36 1.724 1.724 0 00-2.573 1.066 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.36-2.36 1.724 1.724 0 00-1.066-2.573 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.36-2.36 1.724 1.724 0 002.573-1.066z"/><circle cx="12" cy="12" r="3"/>');

    if (window.VIEW_NAV_ID) {
      window.VIEW_NAV_ID.goals = 'nav-goals';
      window.VIEW_NAV_ID.accomplishments = 'nav-accomplishments';
      window.VIEW_NAV_ID.journal = 'nav-journal';
      window.VIEW_NAV_ID.import = 'nav-import';
      window.VIEW_NAV_ID.analytics = 'nav-analytics';
      window.VIEW_NAV_ID.settings = 'nav-settings';
      window.VIEW_NAV_ID.search = 'nav-all';
    }

    ensureTopbarTools();
    ensureMobileNav();
    ensureFabQuickAdd();
  }

  ensureSettingsDefaults();
  ensureGoalsStore();
  ensureAdvancedNavAndShell();
  ensureEventTypeField();
  registerShortcuts();
  applyTheme();
  addNotificationsHint();
  renderView();
})();

