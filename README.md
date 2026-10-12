<div align="center">

# tempo.

### A little more room to focus.

An inviting, browser-based Pomodoro timer for focused work, restorative breaks, and a shorter daily task list.

<br />

**Focus · Short break · Long break · Today's tasks · Adjustable sessions**

</div>

---

## Meet Tempo

Tempo gives a focused work session a calm place to begin. The main view keeps the countdown, session rhythm, and today's tasks together, with a soft chime and optional desktop notification when time is up.

Built as a lightweight static web app: no account, server, build step, package installation, or external service is required. Timer settings, task list, and daily focus count stay in the browser's local storage.

## What you can do

- Switch between focus, short break, and long break sessions.
- Start, pause, reset, or skip a session; press **Space** to start or pause.
- Adjust the focus and break lengths in settings.
- Add, complete, and remove tasks for the day.
- Track completed focus sessions in the current four-session rhythm and today's total.
- Choose a soft completion chime and request desktop notifications.
- Use the responsive layout on desktop, tablet, or phone.

## Run it locally

No install is needed. Download or clone this folder, then open `index.html` in a modern browser.

For a local web server, run:

```sh
python3 -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000) from this folder.

## How it works

The app is built with semantic HTML, CSS, and plain JavaScript. A deadline-based countdown keeps elapsed time accurate when a browser tab is temporarily inactive. `localStorage` stores preferences and the task list on the current device; no data is sent to a server.

```text
index.html ── interface
styles.css  ── responsive visual system
app.js      ── timer, settings, tasks, and browser storage
```

## Project layout

```text
pomodoro-timer/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Contributing

Small, focused improvements are welcome. Open an issue to describe a bug or proposed change, then submit a pull request with a clear summary and steps to reproduce or review it. Because this project has no build pipeline, keep it dependency-free unless a change has a clear reason to add one.

## Ideas for later

- Optional daily focus goal
- Export and import of tasks and timer preferences
- Additional quiet color themes

## For engineers

Tempo is a compact example of accessible, responsive interface work with browser-native features. It uses a deadline-based timer instead of relying on interval tick counts, handles local persistence and notification permission, and keeps the interaction model small enough to work well on mobile and desktop.

---

If Tempo helps you make a little room for focused work, try it, share it, or contribute an idea.
