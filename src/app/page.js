"use client";
import { useEffect, useMemo, useState } from "react";
import dayjs from 'dayjs'
import 'dayjs/locale/fa'
import jalaliday from 'jalaliday'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { toGregorian } from 'jalaali-js'
import Select2Project from './components/Select2Project'
import { msToHours } from '@/lib/utils'

dayjs.extend(jalaliday)
dayjs.locale('fa')

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "" });
  const [setup, setSetup] = useState({ configured: true });
  const [dbForm, setDbForm] = useState({ uri: "", dbName: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", projectId: undefined });
  const [periods, setPeriods] = useState([]);
  const [editing, setEditing] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([])
  const [dailyTotals, setDailyTotals] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [periodsPage, setPeriodsPage] = useState(1);
  const [tasksPage, setTasksPage] = useState(1);
  const pageSize = 10;
  const [chartMode, setChartMode] = useState("daily"); // daily | weekly | monthly
  const [rangeMode, setRangeMode] = useState('weekly');
  const [periodPage, setPeriodPage] = useState(1);
  const PAGE_SIZE = 10;
  const [activeTab, setActiveTab] = useState('dashboard')
  const [theme, setTheme] = useState('light')
  const [periodSearchTerm, setPeriodSearchTerm] = useState('')
  const [taskSearchTerm, setTaskSearchTerm] = useState('')

  useEffect(() => {
    fetch("/api/me").then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        setUser(d.user);
        loadData();
      }
      setLoading(false);
    });
    fetch('/api/setup').then(async r => { if (r.ok) setSetup(await r.json()) })
  }, []);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    try {
      const t = localStorage.getItem('theme')
      if (t === 'dark' || t === 'light') setTheme(t)
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isDark = theme === 'dark'
      document.documentElement.classList[isDark ? 'add' : 'remove']('dark')
      document.body?.classList[isDark ? 'add' : 'remove']('dark')
      try { localStorage.setItem('theme', theme) } catch {}
    }
  }, [theme])

  

  function formatJalali(date) {
    return dayjs(date).calendar('jalali').format('YYYY/MM/DD HH:mm')
  }

  function toJalaliInputValue(date) {
    return dayjs(date).calendar('jalali').format('YYYY/MM/DD HH:mm')
  }

  function fromJalaliInputValue(value) {
    // value format: YYYY/MM/DD HH:mm in Jalali
    try {
      const [datePart, timePart] = String(value).trim().split(' ')
      const [jy, jm, jd] = datePart.split('/').map(Number)
      const [hh, mm] = (timePart || '00:00').split(':').map(Number)
      const g = toGregorian(jy, jm, jd)
      return new Date(g.gy, g.gm - 1, g.gd, hh || 0, mm || 0)
    } catch {
      return null
    }
  }

  function splitJalaliDateTime(d) {
    const dt = dayjs(d)
    return {
      date: dt.calendar('jalali').format('YYYY/MM/DD'),
      time: dt.format('HH:mm')
    }
  }

  function jalaliPartsToDate(datePart, timePart) {
    if (!datePart) return null
    const [jy, jm, jd] = String(datePart).split('/').map(Number)
    const [hh, mm] = String(timePart || '00:00').split(':').map(Number)
    const g = toGregorian(jy, jm, jd)
    return new Date(g.gy, g.gm - 1, g.gd, hh || 0, mm || 0)
  }

  async function loadData() {
    const [wp, ts, pr] = await Promise.all([
      fetch("/api/work").then((r) => (r.ok ? r.json() : { periods: [] })),
      fetch("/api/tasks").then((r) => (r.ok ? r.json() : { tasks: [] })),
      fetch('/api/projects').then(r => (r.ok ? r.json() : { projects: [] })),
    ]);
    const periods = wp.periods || []
    setPeriods(periods);
    setTasks(ts.tasks || []);
    setProjects(pr.projects || [])
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
      setUser(d.user || d);
      await loadData();
    } else {
      try {
        const err = await res.json();
        alert(err?.message || "خطا در احراز هویت");
      } catch {
        alert("خطا در احراز هویت");
      }
    }
  }

  const hasOpen = useMemo(() => periods.some((p) => !p.stoppedAt), [periods]);
  const openPeriod = useMemo(() => periods.find((p) => !p.stoppedAt) || null, [periods]);

  const filteredPeriods = useMemo(() => {
    if (!periodSearchTerm) return periods;
    return periods.filter(p => 
      (p.project?.name || '').toLowerCase().includes(periodSearchTerm.toLowerCase()) ||
      (p.startedAt && formatJalali(p.startedAt).toLowerCase().includes(periodSearchTerm.toLowerCase())) ||
      (p.stoppedAt && formatJalali(p.stoppedAt).toLowerCase().includes(periodSearchTerm.toLowerCase()))
    );
  }, [periods, periodSearchTerm]);

  const filteredTasks = useMemo(() => {
    if (!taskSearchTerm) return tasks;
    return tasks.filter(t => 
      t.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
      (t.project?.name || '').toLowerCase().includes(taskSearchTerm.toLowerCase())
    );
  }, [tasks, taskSearchTerm]);

  async function startWork() {
    const res = await fetch("/api/work", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedProjectId ? { projectId: String(selectedProjectId) } : {}),
    });
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

  async function savePeriodEdit(e) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      id: editing.id,
      startedAt: jalaliPartsToDate(editing.startDate, editing.startTime),
      stoppedAt: editing.endDate ? jalaliPartsToDate(editing.endDate, editing.endTime) : null,
    }
    const res = await fetch('/api/work', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (res.ok) {
      setEditing(null)
      await loadData()
    } else {
      try {
        const err = await res.json()
        alert(err?.message || 'خطا در ذخیره‌سازی')
      } catch {
        alert('خطا در ذخیره‌سازی')
      }
    }
  }

  function formatFaNumber(n) {
    return new Intl.NumberFormat("fa-IR").format(n);
  }

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function formatPersianDate(d) {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "2-digit", month: "2-digit", day: "2-digit" }).format(d);
  }

  function getPersianMonthDaysCount(date) {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
    const month = Number(parts.find(p => p.type === 'month')?.value || '1');
    // Farvardin–Shahrivar (1–6): 31, Mehr–Bahman (7–11): 30, Esfand (12): 29/30 → use 30
    if (month >= 1 && month <= 6) return 31;
    if (month >= 7 && month <= 11) return 30;
    return 30;
  }

  // Chart.js-specific memo removed; ChartSection computes data for ECharts directly

  function isSameLocalDay(a, b) {
    const da = new Date(a), db = new Date(b)
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
  }

  function computeElapsedForProjectToday(nowMs, projectId) {
    const today = new Date(nowMs)
    let sum = 0
    for (const p of periods) {
      if (!isSameLocalDay(p.startedAt, today)) continue
      const pid = p.project?.id ?? null
      if ((projectId ?? null) !== (pid ?? null)) continue
      const start = new Date(p.startedAt).getTime()
      const end = p.stoppedAt ? new Date(p.stoppedAt).getTime() : nowMs
      sum += Math.max(0, end - start)
    }
    return sum
  }

  async function addTask(e) {
    e.preventDefault();
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskForm),
    });
    if (res.ok) {
      setTaskForm({ title: "", description: "", projectId: undefined });
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
        {!setup.configured && (
          <section className="border rounded p-4 mb-4">
            <h3 className="font-bold mb-3">پیکربندی اتصال دیتابیس (MongoDB)</h3>
            <div className="grid gap-2">
              <input className="border p-2 rounded" placeholder="آدرس دیتابیس (host)" value={dbForm.host || ''} onChange={e => setDbForm({ ...dbForm, host: e.target.value })} />
              <input className="border p-2 rounded" placeholder="پورت" value={dbForm.port || ''} onChange={e => setDbForm({ ...dbForm, port: e.target.value })} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!dbForm.useAuth} onChange={e => setDbForm({ ...dbForm, useAuth: e.target.checked })} /> احراز هویت</label>
              {!!dbForm.useAuth && (
                <>
                  <input className="border p-2 rounded" placeholder="نام کاربری دیتابیس" value={dbForm.username || ''} onChange={e => setDbForm({ ...dbForm, username: e.target.value })} />
                  <input className="border p-2 rounded" type="password" placeholder="رمز عبور دیتابیس" value={dbForm.password || ''} onChange={e => setDbForm({ ...dbForm, password: e.target.value })} />
                </>
              )}
              <input className="border p-2 rounded" placeholder="نام دیتابیس (dbName)" value={dbForm.dbName || ''} onChange={e => setDbForm({ ...dbForm, dbName: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-3">
              <button className="bg-gray-200 rounded px-3 py-2" onClick={async () => {
                const r = await fetch('/api/setup', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dbForm) })
                const ok = r.ok && (await r.json()).ok
                alert(ok ? 'اتصال موفق بود' : 'اتصال ناموفق بود')
                setDbForm({ ...dbForm, _testOk: !!ok })
              }}>تست اتصال</button>
              <button disabled={!dbForm._testOk} className={`rounded px-3 py-2 ${dbForm._testOk?'bg-black text-white':'bg-gray-300 text-gray-600 cursor-not-allowed'}`} onClick={async () => {
                const r = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dbForm) })
                if (r.ok) { setSetup({ configured: true }); alert('تنظیمات ذخیره شد') } else alert('ذخیره تنظیمات ناموفق بود')
              }}>ذخیره تنظیمات</button>
            </div>
          </section>
        )}
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
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span>کاربر: {user.email}</span>
          {user?.isAdmin && (
            <a className="btn btn-primary" href="/admin">ادمین</a>
          )}
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-sm btn-muted">سپری‌شده امروز: {formatDuration(computeElapsedForProjectToday(now, selectedProjectId ? String(selectedProjectId) : null))}</span>
          {!hasOpen && (
            <>
              <Select2Project
                className="w-56"
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                options={projects.map(p => ({ id: p.id, text: p.name }))}
                placeholder="پروژه (اختیاری)"
              />
              <button className="btn btn-primary" onClick={startWork}>استارت</button>
            </>
          )}
          {hasOpen && <button className="btn btn-muted" onClick={stopWork}>استاپ</button>}
          <button className="btn btn-muted" onClick={() => setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'لایت':'دارک'}</button>
          <button className="btn btn-muted" onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); location.reload(); }}>خروج</button>
        </div>
      </div>
      <div className="md:flex md:flex-row gap-6">
        <aside className="order-2 md:order-none w-full md:w-64 md:shrink-0 border rounded p-4 h-fit">
          <nav className="flex md:flex-col gap-2">
            <button className={`px-3 py-2 rounded text-right ${activeTab==='dashboard'?'bg-black text-white':'bg-gray-100'}`} onClick={() => setActiveTab('dashboard')}>پیشخوان</button>
            <button className={`px-3 py-2 rounded text-right ${activeTab==='settings'?'bg-black text-white':'bg-gray-100'}`} onClick={() => setActiveTab('settings')}>تنظیمات کاربری</button>
            <button className={`px-3 py-2 rounded text-right ${activeTab==='messages'?'bg-black text-white':'bg-gray-100'}`} onClick={() => setActiveTab('messages')}>پیام‌ها</button>
          </nav>
        </aside>

        <main className="order-1 md:order-none flex-1 flex flex-col gap-6">

          {activeTab === 'dashboard' && (
            <>
            <div className="md:flex md:flex-row gap-6 mb-6">
              <section className="card w-1/2">
                <h3 className="font-bold mb-3">ثبت تسک امروز</h3>
                <form onSubmit={addTask} className="flex flex-col gap-3">
                  <input className="input" placeholder="عنوان تسک" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                  <textarea className="input" placeholder="توضیحات (اختیاری)" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                  <Select2Project
                    className="w-full"
                    value={taskForm.projectId ?? ''}
                    onChange={(v) => setTaskForm({ ...taskForm, projectId: v || undefined })}
                    options={projects.map(p => ({ id: p.id, text: p.name }))}
                    placeholder="انتخاب پروژه (اختیاری)"
                  />
                  <button className="btn btn-primary" type="submit">افزودن</button>
                </form>
              </section>

              <ProjectDonutChart periods={periods} projects={projects} className="card w-1/2" />
            </div>

            <section className="card">
              <h3 className="font-bold mb-3">سوابق استارت/استاپ</h3>
              {!!editing && (
                <form onSubmit={savePeriodEdit} className="mb-4 grid md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs mb-2">تاریخ شروع</label>
                    <div className="flex gap-2">
                      <input className="input w-36" type="text" placeholder="YYYY/MM/DD" value={editing.startDate} onChange={e => setEditing({ ...editing, startDate: e.target.value })} />
                      <input className="input w-24" type="text" placeholder="HH:mm" value={editing.startTime} onChange={e => setEditing({ ...editing, startTime: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-2">برای باز نگه‌داشتن، فیلدهای پایان را خالی بگذارید</div>
                    <label className="block text-xs mb-2">تاریخ پایان</label>
                    <div className="flex gap-2">
                      <input className="input w-36" type="text" placeholder="YYYY/MM/DD" value={editing.endDate} onChange={e => setEditing({ ...editing, endDate: e.target.value })} />
                      <input className="input w-24" type="text" placeholder="HH:mm" value={editing.endTime} onChange={e => setEditing({ ...editing, endTime: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-primary" type="submit">ذخیره</button>
                    <button type="button" className="btn btn-muted" onClick={() => setEditing(null)}>انصراف</button>
                  </div>
                </form>
              )}
              <div className="mb-4">
                <input 
                  type="text" 
                  placeholder="جستجو در سوابق (نام پروژه، تاریخ شروع/پایان)" 
                  className="input w-full" 
                  value={periodSearchTerm} 
                  onChange={e => setPeriodSearchTerm(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-right">شروع</th><th className="p-2 text-right">پایان</th><th className="p-2 text-right">مدت</th><th className="p-2 text-right">پروژه</th><th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeriods.slice((periodPage-1)*PAGE_SIZE, periodPage*PAGE_SIZE).map(p => {
                      const start = new Date(p.startedAt)
                      const end = p.stoppedAt ? new Date(p.stoppedAt) : null
                      const durationMs = (end ? end : new Date()) - start
                      return (
                        <tr key={p.id} className="border-t">
                          <td className="p-2 whitespace-nowrap">{formatJalali(start)}</td><td className="p-2 whitespace-nowrap">{end ? formatJalali(end) : 'در حال کار'}</td><td className="p-2">{formatDuration(durationMs)}</td><td className="p-2">{p.project?.name || 'بدون پروژه'}</td><td className="p-2 text-left">
                            {(user?.isAdmin || user?.mayEditTimes) && (
                              <button className="text-blue-600" onClick={() => {
                                const s = splitJalaliDateTime(start)
                                const e = end ? splitJalaliDateTime(end) : { date: '', time: '' }
                                setEditing({ id: p.id, startDate: s.date, startTime: s.time, endDate: e.date, endTime: e.time })
                              }}>ویرایش</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-3 text-sm">
                <div>صفحه {periodPage} از {Math.max(1, Math.ceil(filteredPeriods.length / PAGE_SIZE))}</div>
                <div className="flex gap-2">
                  <button className="bg-gray-200 rounded px-3 py-1 disabled:opacity-50" disabled={periodPage === 1} onClick={() => setPeriodPage(p => Math.max(1, p-1))}>قبلی</button>
                  <button className="bg-gray-200 rounded px-3 py-1 disabled:opacity-50" disabled={periodPage >= Math.ceil(filteredPeriods.length / PAGE_SIZE)} onClick={() => setPeriodPage(p => Math.min(Math.ceil(filteredPeriods.length / PAGE_SIZE)||1, p+1))}>بعدی</button>
                </div>
              </div>
            </section>

            {/* نمودار کارکرد شمسی */}
            <ChartSection periods={periods} projects={projects} rangeMode={rangeMode} onChangeRange={setRangeMode} />

            <TasksTable tasks={filteredTasks} taskSearchTerm={taskSearchTerm} setTaskSearchTerm={setTaskSearchTerm} />
            </>
          )}

          {activeTab === 'settings' && (
            <section className="border rounded p-6">
              <h3 className="font-bold mb-4">تنظیمات کاربری</h3>
              <div className="text-sm text-gray-500">تنظیمات در نسخه بعدی اضافه می‌شود.</div>
            </section>
          )}

          {activeTab === 'messages' && (
            <section className="border rounded p-6">
              <h3 className="font-bold mb-3">پیام‌ها</h3>
              <div className="text-sm text-gray-500">هنوز پیامی وجود ندارد.</div>
            </section>
          )}

        </main>
      </div>
    </div>
  );
}

function ChartSection({ periods, projects, rangeMode, onChangeRange }) {
  // Build buckets based on selected range (daily/weekly/monthly)
  const now = dayjs()
  let start
  if (rangeMode === 'daily') start = now.startOf('day')
  else if (rangeMode === 'weekly') start = now.subtract(6, 'day').startOf('day')
  else start = now.subtract(29, 'day').startOf('day') // monthly ~ 30 days

  const buckets = new Map()
  if (rangeMode === 'daily') {
    // 24 ساعت امروز به‌صورت HH (00..23)
    const dayStart = now.startOf('day')
    for (let h = 0; h < 24; h++) {
      const key = dayStart.add(h, 'hour').format('HH')
      buckets.set(key, {})
    }
  } else {
    for (let d = start; d.isBefore(now.endOf('day')) || d.isSame(now, 'day'); d = d.add(1, 'day')) {
      const key = d.calendar('jalali').format('YYYY/MM/DD')
      buckets.set(key, {}) // per project map
    }
  }

  for (const p of periods) {
    const startAt = dayjs(p.startedAt)
    const endAt = p.stoppedAt ? dayjs(p.stoppedAt) : dayjs()
    if (endAt.isBefore(start) || startAt.isAfter(now)) continue
    const proj = p.project?.name || 'بدون پروژه'
    // Split duration per day
    let cursor = startAt.isBefore(start) ? start : startAt
    while (cursor.isBefore(endAt)) {
      const sliceEnd = rangeMode === 'daily' ? cursor.add(1, 'hour').startOf('hour') : cursor.endOf('day')
      const actualEnd = endAt.isBefore(sliceEnd) ? endAt : sliceEnd
      const diff = sliceEnd.diff(cursor, 'millisecond')
      const key = rangeMode === 'daily' ? cursor.format('HH') : cursor.calendar('jalali').format('YYYY/MM/DD')
      if (buckets.has(key)) {
        const row = buckets.get(key)
        row[proj] = (row[proj] || 0) + diff
        buckets.set(key, row)
      }
      cursor = actualEnd.add(1, 'millisecond')
    }
  }

  const labels = Array.from(buckets.keys())
  const projectNames = Array.from(new Set(labels.flatMap(k => Object.keys(buckets.get(k)))))
  if (projectNames.length === 0) projectNames.push('بدون پروژه')
  // ساخت پالت پویا از رنگ پروژه‌ها با fallback
  const projectColorMap = new Map()
  for (const p of (projects || [])) projectColorMap.set(p.name, p.color || '')
  const fallback = ['#80FFA5', '#00DDFF', '#37A2FF', '#FF0087', '#FFBF00', '#3BA272', '#9A60B4', '#EA7CCC']
  const palette = projectNames.map((name, idx) => projectColorMap.get(name) || fallback[idx % fallback.length])
  // سری‌های لاین استک‌شده با گرادیان ناحیه‌ای
  const series = projectNames.map((name, idx) => ({
    name,
    type: 'line',
    stack: 'total',
    smooth: true,
    showSymbol: false,
    lineStyle: { width: 0 },
    emphasis: { focus: 'series' },
    areaStyle: {
      opacity: 0.8,
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: palette[idx % palette.length] },
        { offset: 1, color: 'rgba(0,0,0,0)' },
      ])
    },
    data: labels.map(k => {
      const ms = buckets.get(k)[name] || 0
      return Math.round(ms / 3600000 * 100) / 100
    })
  }))

  const option = {
    color: palette,
    grid: { left: '3%', right: '3%', bottom: '3%', containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
      formatter: (params) => {
        const lines = [params[0]?.axisValueLabel || '']
        for (const p of params) {
          if (!p.value) continue
          lines.push(`${p.marker} ${p.seriesName}: ${p.value} ساعت`)
        }
        return lines.join('<br/>')
      }
    },
    legend: { data: projectNames },
    xAxis: { type: 'category', boundaryGap: false, data: labels },
    yAxis: { type: 'value', min: 0 },
    series,
    animationDurationUpdate: 300
  }

  return (
    <section className="border rounded p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">نمودار کارکرد</h3>
        <div className="flex gap-2 text-sm">
          <button className={`px-3 py-1 rounded ${rangeMode==='daily'?'bg-black text-white':'bg-gray-200'}`} onClick={() => onChangeRange('daily')}>روزانه</button>
          <button className={`px-3 py-1 rounded ${rangeMode==='weekly'?'bg-black text-white':'bg-gray-200'}`} onClick={() => onChangeRange('weekly')}>هفتگی</button>
          <button className={`px-3 py-1 rounded ${rangeMode==='monthly'?'bg-black text-white':'bg-gray-200'}`} onClick={() => onChangeRange('monthly')}>ماهانه</button>
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 320 }} opts={{ renderer: 'canvas' }} />
      <div className="text-xs text-gray-500 mt-2">تاریخ‌ها بر اساس تقویم شمسی</div>
    </section>
  )
}

// ClockChart حذف شد طبق درخواست؛ نمایش زمان به هدر منتقل شد

function TasksTable({ tasks, taskSearchTerm, setTaskSearchTerm }) {
  const [page, setPage] = useState(1)
  const PAGE = 10
  const slice = tasks.slice((page-1)*PAGE, page*PAGE)
  return (
    <section className="border rounded p-6">
      <h3 className="font-bold mb-3">تسک‌ها</h3>
      <div className="mb-4">
        <input 
          type="text" 
          placeholder="جستجو در تسک‌ها (عنوان، توضیحات، نام پروژه)" 
          className="input w-full" 
          value={taskSearchTerm}
          onChange={e => setTaskSearchTerm(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-right">عنوان</th><th className="p-2 text-right">توضیحات</th><th className="p-2 text-right">پروژه</th><th className="p-2 text-right">تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {slice.map(t => (
              <tr key={t.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{t.title}</td><td className="p-2">{t.description || ''}</td><td className="p-2">{t.project?.name || 'بدون پروژه'}</td><td className="p-2 whitespace-nowrap">{new Date(t.occurredAt).toLocaleString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3 text-sm">
        <div>صفحه {page} از {Math.max(1, Math.ceil(tasks.length / PAGE))}</div>
        <div className="flex gap-2">
          <button className="bg-gray-200 rounded px-3 py-1 disabled:opacity-50" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))}>قبلی</button>
          <button className="bg-gray-200 rounded px-3 py-1 disabled:opacity-50" disabled={page >= Math.ceil(tasks.length / PAGE)} onClick={() => setPage(p => Math.min(Math.ceil(tasks.length / PAGE)||1, p+1))}>بعدی</button>
        </div>
      </div>
    </section>
  )
}

function ProjectDonutChart({ periods, projects }) {
  const data = useMemo(() => {
    const totals = new Map();
    for (const p of periods) {
      const start = new Date(p.startedAt).getTime();
      const stop = p.stoppedAt ? new Date(p.stoppedAt).getTime() : Date.now();
      const duration = Math.max(0, stop - start);
      const projectName = p.project?.name || 'بدون پروژه';
      totals.set(projectName, (totals.get(projectName) || 0) + duration);
    }

    return Array.from(totals.entries()).map(([name, ms]) => ({
      name,
      value: msToHours(ms),
    }));
  }, [periods]);

  const projectColorMap = new Map();
  for (const p of (projects || [])) projectColorMap.set(p.name, p.color || '');
  const fallbackColors = ['#80FFA5', '#00DDFF', '#37A2FF', '#FF0087', '#FFBF00', '#3BA272', '#9A60B4', '#EA7CCC'];

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ساعت ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: data.map(item => item.name)
    },
    series: [
      {
        name: 'زمان پروژه‌ها',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
            fontWeight: 'bold'
          }
        },
        labelLine: { show: false },
        data: data,
        color: data.map((item, idx) => projectColorMap.get(item.name) || fallbackColors[idx % fallbackColors.length]),
      }
    ]
  };

  return (
    <section className="border rounded p-5 card w-1/2">
      <h3 className="font-bold mb-3">توزیع زمان پروژه‌ها</h3>
      <ReactECharts option={option} style={{ height: 320 }} opts={{ renderer: 'canvas' }} />
    </section>
  )
}
