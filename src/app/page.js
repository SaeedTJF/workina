"use client";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "" });
  const [periods, setPeriods] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [tasks, setTasks] = useState([]);
  const [dailyTotals, setDailyTotals] = useState([]);

  useEffect(() => {
    fetch("/api/me").then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        setUser(d.user);
        loadData();
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  function toLocalInputValue(date) {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function loadData() {
    const [wp, ts] = await Promise.all([
      fetch("/api/work").then((r) => (r.ok ? r.json() : { periods: [] })),
      fetch("/api/tasks").then((r) => (r.ok ? r.json() : { tasks: [] })),
    ]);
    const periods = wp.periods || []
    setPeriods(periods);
    setTasks(ts.tasks || []);
    // compute daily totals in ms
    const totals = {};
    for (const p of periods) {
      const start = new Date(p.startedAt)
      const stop = p.stoppedAt ? new Date(p.stoppedAt) : new Date()
      const key = start.toLocaleDateString('fa-IR')
      totals[key] = (totals[key] || 0) + (stop - start)
    }
    setDailyTotals(Object.entries(totals).map(([date, ms]) => ({ date, ms })))
  }

  async function submitAuth(e) {
    e.preventDefault();
    setLoading(true);
    const url = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authForm),
    });
    setLoading(false);
    if (res.ok) {
      const d = await res.json();
      setUser(d);
      await loadData();
    } else {
      alert("خطا در احراز هویت");
    }
  }

  const hasOpen = useMemo(() => periods.some((p) => !p.stoppedAt), [periods]);
  const openPeriod = useMemo(() => periods.find((p) => !p.stoppedAt) || null, [periods]);

  async function startWork() {
    const res = await fetch("/api/work", { method: "POST" });
    if (res.ok) {
      await loadData();
    }
  }
  async function stopWork() {
    const res = await fetch("/api/work", { method: "PATCH" });
    if (res.ok) {
      await loadData();
    }
  }

  async function addTask(e) {
    e.preventDefault();
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskForm),
    });
    if (res.ok) {
      setTaskForm({ title: "", description: "" });
      await loadData();
    }
  }

  function formatDuration(ms) {
    const s = Math.floor(ms / 1000)
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  if (loading) return <div className="p-6">در حال بارگذاری...</div>;

  if (!user) {
    return (
      <div className="max-w-md w-full mx-auto p-6">
        <div className="flex mb-4 gap-2">
          <button className={`${authMode === "login" ? "font-bold" : ""}`} onClick={() => setAuthMode("login")}>ورود</button>
          <button className={`${authMode === "register" ? "font-bold" : ""}`} onClick={() => setAuthMode("register")}>ثبت‌نام</button>
        </div>
        <form onSubmit={submitAuth} className="flex flex-col gap-3">
          {authMode === "register" && (
            <input className="border p-2 rounded" placeholder="نام" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
          )}
          <input className="border p-2 rounded" type="text" placeholder="ایمیل یا نام‌کاربری" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
          <input className="border p-2 rounded" type="password" placeholder="رمز عبور" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
          <button className="bg-black text-white rounded p-2" type="submit">{authMode === "login" ? "ورود" : "ثبت‌نام"}</button>
        </form>
        <div className="text-xs text-gray-500 mt-3">ادمین: نام‌کاربری <b>admin</b>، رمز <b>6006296</b></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>کاربر: {user.email}</div>
        <div className="flex gap-2">
          {!hasOpen && <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={startWork}>استارت</button>}
          {hasOpen && <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={stopWork}>استاپ</button>}
          <button className="bg-gray-200 px-3 py-1 rounded" onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); location.reload(); }}>خروج</button>
        </div>
      </div>

      {openPeriod && (
        <div className="text-sm">مدت زمان سپری‌شده: {formatDuration(now - new Date(openPeriod.startedAt).getTime())}</div>
      )}

      <section className="border rounded p-4">
        <h3 className="font-bold mb-3">ثبت تسک امروز</h3>
        <form onSubmit={addTask} className="flex flex-col gap-3">
          <input className="border p-2 rounded" placeholder="عنوان تسک" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
          <textarea className="border p-2 rounded" placeholder="توضیحات (اختیاری)" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
          <button className="bg-black text-white rounded p-2" type="submit">افزودن</button>
        </form>
      </section>

      <section className="border rounded p-4">
        <h3 className="font-bold mb-3">سوابق استارت/استاپ</h3>
        <ul className="space-y-2">
          {periods.map((p) => (
            <li key={p.id} className="text-sm">
              شروع: {new Date(p.startedAt).toLocaleString("fa-IR")} — پایان: {p.stoppedAt ? new Date(p.stoppedAt).toLocaleString("fa-IR") : "در حال کار"}
            </li>
          ))}
        </ul>
      </section>

      <section className="border rounded p-4">
        <h3 className="font-bold mb-3">مجموع کارکرد روزانه</h3>
        <ul className="space-y-2">
          {dailyTotals.map((d) => (
            <li key={d.date} className="text-sm">{d.date}: {formatDuration(d.ms)}</li>
          ))}
        </ul>
      </section>

      <section className="border rounded p-4">
        <h3 className="font-bold mb-3">تسک‌های امروز</h3>
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="text-sm">
              {t.title} — {t.description || ""} — {new Date(t.occurredAt).toLocaleString("fa-IR")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
