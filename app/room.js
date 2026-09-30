"use client";

import { useEffect, useMemo, useState } from "react";

const USERS_KEY = "hourly-room-users";
const SESSION_KEY = "hourly-room-session";
const NOTES_KEY = "hourly-room-notes";

const SEED = [
  {
    id: "seed-1",
    title: "Window left open",
    body: "Whoever was here last night left the sash cracked. The room smells like rain on wool.",
    author: "Mara",
    public: true,
    at: Date.now() - 1000 * 60 * 80,
  },
  {
    id: "seed-2",
    title: "A better kettle",
    body: "Not a request. A fact. The current one sighs too loudly at twenty past.",
    author: "Jon",
    public: true,
    at: Date.now() - 1000 * 60 * 40,
  },
];

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0);
}

export default function Room({ dispatch }) {
  const [now, setNow] = useState(new Date());
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState(SEED);
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState("in");
  const [form, setForm] = useState({ name: "", pass: "" });
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState({ title: "", body: "", public: true });

  useEffect(() => {
    setSession(load(SESSION_KEY, null));
    const stored = load(NOTES_KEY, null);
    if (stored && stored.length) setNotes(stored);
    else save(NOTES_KEY, SEED);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clock = useMemo(() => {
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [now]);

  const publicNotes = notes.filter((n) => n.public).sort((a, b) => b.at - a.at);
  const mine = notes.filter((n) => session && n.author === session.name && !n.public);

  function persist(next) {
    setNotes(next);
    save(NOTES_KEY, next);
  }

  function register() {
    setErr("");
    const users = load(USERS_KEY, []);
    if (!form.name.trim() || form.pass.length < 4) {
      setErr("Name and a password of at least 4 characters.");
      return;
    }
    if (users.some((u) => u.name.toLowerCase() === form.name.toLowerCase())) {
      setErr("That name is already taken on this device.");
      return;
    }
    const user = { name: form.name.trim(), pass: hash(form.pass) };
    save(USERS_KEY, [...users, user]);
    save(SESSION_KEY, { name: user.name });
    setSession({ name: user.name });
    setAuthOpen(false);
  }

  function login() {
    setErr("");
    const users = load(USERS_KEY, []);
    const user = users.find(
      (u) => u.name.toLowerCase() === form.name.toLowerCase() && u.pass === hash(form.pass)
    );
    if (!user) {
      setErr("No match. Register first — accounts live on this browser.");
      return;
    }
    save(SESSION_KEY, { name: user.name });
    setSession({ name: user.name });
    setAuthOpen(false);
  }

  function out() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  function post(e) {
    e.preventDefault();
    if (!session) {
      setAuthOpen(true);
      return;
    }
    if (!draft.title.trim() || !draft.body.trim()) return;
    const note = {
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      body: draft.body.trim(),
      author: session.name,
      public: !!draft.public,
      at: Date.now(),
    };
    persist([note, ...notes]);
    setDraft({ title: "", body: "", public: true });
  }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <p className="mark">The Hourly <span>Room</span></p>
          <p className="meta">Updated on the hour · paper, not chrome</p>
        </div>
        <div className="who">
          <span className="meta">{clock}</span>
          {session ? (
            <>
              <span className="meta">{session.name}</span>
              <button onClick={out}>Leave</button>
            </>
          ) : (
            <button onClick={() => { setMode("in"); setAuthOpen(true); }}>Come in</button>
          )}
        </div>
      </header>
      <section className="hero">
        <div>
          <div className="kicker">This hour · {dispatch.date}</div>
          <h2>{dispatch.title}</h2>
          <p className="lead">{dispatch.body}</p>
        </div>
        <aside className="card">
          <div className="kicker">Until the next change</div>
          <div className="clock">{clock}</div>
          <div className="bar">
            <i style={{ width: `${((now.getMinutes() * 60 + now.getSeconds()) / 3600) * 100}%`, animation: "none" }} />
          </div>
          <p className="meta">Mood: {dispatch.mood}. The room is rewritten every hour by a scheduled hand.</p>
        </aside>
      </section>
      <section className="grid">
        <div>
          <div className="kicker">The wall · public notes</div>
          <div className="wall">
            {publicNotes.map((n) => (
              <article className="note" key={n.id}>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                <footer>{n.author} · {new Date(n.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</footer>
              </article>
            ))}
          </div>
        </div>
        <div>
          <div className="kicker">Leave something</div>
          <form className="compose" onSubmit={post}>
            <input placeholder="A heading, not a slogan" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <textarea placeholder="What belongs on the wall this hour?" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <div className="row">
              <label className="check">
                <input type="checkbox" checked={draft.public} onChange={(e) => setDraft({ ...draft, public: e.target.checked })} />
                Mark public
              </label>
              <button className="send" type="submit">Pin it</button>
            </div>
          </form>
          {mine.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div className="kicker">Kept private</div>
              <div className="wall">
                {mine.map((n) => (
                  <article className="note" key={n.id}>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      {authOpen && (
        <div className="modal" onClick={() => setAuthOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{mode === "in" ? "Come in" : "Take a name"}</h2>
            <p className="meta" style={{ marginBottom: 12 }}>Accounts stay on this browser. Public notes show on the wall here.</p>
            <form className="compose" onSubmit={(e) => { e.preventDefault(); mode === "in" ? login() : register(); }}>
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input type="password" placeholder="Password" value={form.pass} onChange={(e) => setForm({ ...form, pass: e.target.value })} />
              {err && <p className="err">{err}</p>}
              <div className="row">
                <button type="button" onClick={() => { setErr(""); setMode(mode === "in" ? "up" : "in"); }}>
                  {mode === "in" ? "Need a name?" : "Already here?"}
                </button>
                <button className="send" type="submit">{mode === "in" ? "Enter" : "Register"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
