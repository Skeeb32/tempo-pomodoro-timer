(() => {
  const STORAGE_KEY = 'tempo-pomodoro-v1';
  const defaults = { durations: { focus: 25, short: 5, long: 15 }, sound: true, notifications: false, tasks: [], completedToday: 0, countDate: new Date().toLocaleDateString(), cycle: 0 };
  const readState = () => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return { ...defaults }; }
  };
  let state = readState();
  if (state.countDate !== new Date().toLocaleDateString()) { state.countDate = new Date().toLocaleDateString(); state.completedToday = 0; }
  let mode = 'focus';
  let remainingMs = state.durations[mode] * 60_000;
  let deadline = null;
  let interval = null;
  let toastTimeout = null;

  const $ = (selector) => document.querySelector(selector);
  const timeNode = $('#timer-time');
  const startButton = $('#start-button');
  const ring = $('#ring-progress');
  const circumference = 2 * Math.PI * 128;
  ring.style.strokeDasharray = String(circumference);

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function format(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function currentDuration() { return state.durations[mode] * 60_000; }
  function renderTimer() {
    const duration = currentDuration();
    const progress = Math.min(1, Math.max(0, remainingMs / duration));
    timeNode.textContent = format(remainingMs);
    ring.style.strokeDashoffset = String(circumference * (1 - progress));
    $('#timer-ring').dataset.mode = mode;
    $('#timer-label').textContent = mode === 'focus' ? 'TIME TO FOCUS' : mode === 'short' ? 'TAKE A BREATHER' : 'REST A LITTLE LONGER';
    $('#timer-caption').textContent = mode === 'focus' ? 'A clear mind starts here.' : mode === 'short' ? 'Step away. Stretch. Breathe.' : 'You have earned a slower pause.';
    $('#start-label').textContent = interval ? 'Pause timer' : mode === 'focus' ? 'Start focus' : 'Start break';
    startButton.classList.toggle('is-running', Boolean(interval));
    startButton.classList.toggle('is-active', Boolean(interval));
    startButton.querySelector('.button-icon').innerHTML = interval ? '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM15 5h4v14h-4z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7V5Z"/></svg>';
    document.title = `${format(remainingMs)} · ${mode === 'focus' ? 'Focus' : 'Break'} — Tempo`;
    const completed = state.cycle % 4;
    $('#session-count').textContent = `${completed} / 4`;
    $('#session-dots').innerHTML = Array.from({ length: 4 }, (_, index) => `<span class="session-dot ${index < completed ? 'is-complete' : ''}"></span>`).join('');
    $('#session-dots').setAttribute('aria-label', `${completed} of 4 focus sessions complete`);
    document.querySelectorAll('.mode-tab').forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
  }
  function renderToday() {
    $('#today-count').textContent = state.completedToday;
    const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
    $('#today-date').textContent = date.toUpperCase();
  }
  function renderTasks() {
    const list = $('#task-list');
    list.replaceChildren();
    state.tasks.forEach((task) => {
      const item = document.createElement('li');
      item.className = `task-item${task.done ? ' is-done' : ''}`;
      const toggle = document.createElement('button');
      toggle.className = 'task-check';
      toggle.type = 'button';
      toggle.setAttribute('aria-label', `${task.done ? 'Mark incomplete' : 'Complete'}: ${task.text}`);
      toggle.innerHTML = task.done ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>' : '';
      toggle.addEventListener('click', () => { task.done = !task.done; save(); renderTasks(); });
      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = task.text;
      const remove = document.createElement('button');
      remove.className = 'delete-task';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${task.text}`);
      remove.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2m-6 0 1 10h6l1-10"/></svg>';
      remove.addEventListener('click', () => { state.tasks = state.tasks.filter((entry) => entry.id !== task.id); save(); renderTasks(); });
      item.append(toggle, text, remove);
      list.append(item);
    });
    const done = state.tasks.filter((task) => task.done).length;
    $('#task-total').textContent = `${done}/${state.tasks.length}`;
    $('#empty-tasks').hidden = state.tasks.length > 0;
  }
  function setMode(nextMode, reset = true) {
    if (!['focus', 'short', 'long'].includes(nextMode)) return;
    stopClock();
    mode = nextMode;
    if (reset) remainingMs = currentDuration();
    renderTimer();
  }
  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => element.classList.remove('is-visible'), 2600);
  }
  function chime() {
    if (!state.sound) return;
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, context.currentTime + index * .2);
        gain.gain.linearRampToValueAtTime(.12, context.currentTime + index * .2 + .04);
        gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + index * .2 + .55);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + index * .2);
        oscillator.stop(context.currentTime + index * .2 + .6);
      });
      setTimeout(() => context.close(), 1100);
    } catch { /* Audio may be unavailable; the timer remains usable. */ }
  }
  function finishSession() {
    stopClock();
    remainingMs = 0;
    if (mode === 'focus') {
      state.completedToday += 1;
      state.cycle = (state.cycle + 1) % 4;
      save();
      renderToday();
      const next = state.cycle === 0 ? 'long' : 'short';
      toast(next === 'long' ? 'Four sessions complete. Take a longer break.' : 'Focus session complete. Take a short break.');
      mode = next;
    } else {
      toast('Break finished. Ready for another focus?');
      mode = 'focus';
    }
    remainingMs = currentDuration();
    chime();
    if (state.notifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Tempo', { body: mode === 'focus' ? 'Your break is over. Ready to focus?' : 'Your focus session is complete. Take a breath.' });
    }
    renderTimer();
  }
  function tick() {
    remainingMs = Math.max(0, deadline - Date.now());
    if (remainingMs <= 0) finishSession();
    else renderTimer();
  }
  function stopClock() {
    if (interval) clearInterval(interval);
    interval = null;
    deadline = null;
  }
  function toggleTimer() {
    if (interval) {
      remainingMs = Math.max(0, deadline - Date.now());
      stopClock();
      renderTimer();
      return;
    }
    if (remainingMs <= 0) remainingMs = currentDuration();
    deadline = Date.now() + remainingMs;
    interval = setInterval(tick, 200);
    renderTimer();
  }
  function resetTimer() {
    stopClock();
    remainingMs = currentDuration();
    renderTimer();
    toast('Timer reset. Take your time.');
  }

  document.querySelectorAll('.mode-tab').forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
  startButton.addEventListener('click', toggleTimer);
  $('#reset-button').addEventListener('click', resetTimer);
  $('#skip-button').addEventListener('click', () => {
    setMode(mode === 'focus' ? 'short' : 'focus');
    toast(mode === 'focus' ? 'Back to focus.' : 'A little pause, coming up.');
  });
  $('#task-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('#task-input');
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    state.tasks.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, done: false });
    input.value = '';
    save();
    renderTasks();
    input.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.repeat || /INPUT|TEXTAREA|BUTTON/.test(document.activeElement?.tagName) || $('#settings-dialog').open) return;
    event.preventDefault();
    toggleTimer();
  });

  const dialog = $('#settings-dialog');
  const settingsOpen = $('#settings-open');
  function populateSettings() {
    $('#focus-setting').value = state.durations.focus;
    $('#short-setting').value = state.durations.short;
    $('#long-setting').value = state.durations.long;
    $('#sound-setting').checked = state.sound;
    $('#notification-setting').checked = state.notifications;
  }
  settingsOpen.addEventListener('click', () => { populateSettings(); dialog.showModal(); });
  $('#settings-cancel').addEventListener('click', () => dialog.close());
  $('#settings-save').addEventListener('click', async () => {
    const readMinutes = (id, min, max) => Math.min(max, Math.max(min, Number.parseInt($(id).value, 10) || min));
    state.durations = { focus: readMinutes('#focus-setting', 1, 90), short: readMinutes('#short-setting', 1, 30), long: readMinutes('#long-setting', 1, 60) };
    state.sound = $('#sound-setting').checked;
    state.notifications = $('#notification-setting').checked;
    if (state.notifications && 'Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      state.notifications = permission === 'granted';
      if (!state.notifications) toast('Notifications are blocked in your browser settings.');
    }
    save();
    stopClock();
    remainingMs = currentDuration();
    renderTimer();
    dialog.close();
    toast('Your timer settings are saved.');
  });

  window.addEventListener('visibilitychange', () => { if (!document.hidden && interval) tick(); });
  renderToday();
  renderTasks();
  renderTimer();
})();
