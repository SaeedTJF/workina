"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selected, setSelected] = useState(null);
  const [projects, setProjects] = useState([])
  const [newProject, setNewProject] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('#5470C6')
  const [colorDrafts, setColorDrafts] = useState({})
  const [setup, setSetup] = useState({ configured: true })
  const [dbForm, setDbForm] = useState({ uri: '', dbName: '' })

  useEffect(() => {
    fetch('/api/admin').then(async r => {
      setLoading(false);
      if (r.ok) setData(await r.json());
    })
    fetch('/api/admin/projects').then(async r => {
      if (r.ok) setProjects((await r.json()).projects)
    })
    fetch('/api/setup').then(async r => { if (r.ok) setSetup(await r.json()) })
  }, []);

  if (loading) return <div className="p-6">در حال بارگذاری...</div>;
  if (!data) return (
    <div className="p-6">
      <div className="mb-4">عدم دسترسی</div>
      <Link className="text-blue-600 underline" href={"/"}>بازگشت</Link>
    </div>
  );

  async function toggleEditPermission(userId, value) {
    setBusy(true)
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, mayEditTimes: value }) })
    const r = await fetch('/api/admin')
    if (r.ok) setData(await r.json())
    setBusy(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">مدیریت پروژه‌ها</h2>
        <div className="flex gap-2 mb-3 items-center">
          <input className="border rounded p-2" placeholder="نام پروژه جدید" value={newProject} onChange={e => setNewProject(e.target.value)} />
          <input className="w-10 h-10 p-0 border rounded" type="color" value={newProjectColor} onChange={e => setNewProjectColor(e.target.value)} />
          <button className="bg-black text-white rounded px-3 py-2" onClick={async () => {
            if (!newProject.trim()) return
            const r = await fetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newProject.trim(), color: newProjectColor }) })
            if (r.ok) {
              const pr = await fetch('/api/admin/projects')
              if (pr.ok) setProjects((await pr.json()).projects)
              setNewProject('')
              setNewProjectColor('#5470C6')
            }
          }}>ایجاد</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-right">نام</th>
                <th className="p-2 text-right">رنگ</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-10 h-10 p-0 border rounded" value={colorDrafts[p.id] ?? p.color ?? '#5470C6'} onChange={e => setColorDrafts({ ...colorDrafts, [p.id]: e.target.value })} />
                      <button className="bg-gray-200 rounded px-2 py-1" onClick={async () => {
                        const chosen = (colorDrafts[p.id] ?? p.color ?? '#5470C6')
                        const r = await fetch('/api/admin/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: String(p.id), color: chosen }) })
                        if (r.ok) {
                          const pr = await fetch('/api/admin/projects')
                          if (pr.ok) setProjects((await pr.json()).projects)
                        } else {
                          console.error('Failed to save color', await r.text())
                        }
                      }}>ذخیره</button>
                    </div>
                  </td>
                  <td className="p-2 text-left">
                    <button className="text-red-600" onClick={async () => {
                      if (!confirm('حذف این پروژه؟')) return
                      await fetch('/api/admin/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) })
                      const pr = await fetch('/api/admin/projects')
                      if (pr.ok) setProjects((await pr.json()).projects)
                    }}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">پنل مدیریت</h1>
        <div className="flex items-center gap-2">
          <Link className="bg-gray-200 rounded px-3 py-2" href={"/"}>خانه</Link>
          <button className="bg-gray-200 rounded px-3 py-2" onClick={async () => {
            const r = await fetch('/api/admin/db', { method: 'POST' })
            if (r.ok) alert('ساختار دیتابیس ایجاد شد')
            else alert('خطا در ایجاد ساختار دیتابیس')
          }}>پیکربندی دیتابیس</button>
          <button className="bg-black text-white rounded px-3 py-2" onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); location.href = '/'; }}>خروج</button>
        </div>
      </div>
      {!setup.configured && (
        <section className="border rounded p-4 mb-6">
          <h2 className="font-semibold mb-3">تنظیمات اتصال دیتابیس (MongoDB)</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="border rounded p-2" placeholder="آدرس دیتابیس (host)" value={dbForm.host || ''} onChange={e => setDbForm({ ...dbForm, host: e.target.value })} />
            <input className="border rounded p-2" placeholder="پورت" value={dbForm.port || ''} onChange={e => setDbForm({ ...dbForm, port: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!dbForm.useAuth} onChange={e => setDbForm({ ...dbForm, useAuth: e.target.checked })} /> احراز هویت</label>
            <span></span>
            {!!dbForm.useAuth && (
              <>
                <input className="border rounded p-2" placeholder="نام کاربری دیتابیس" value={dbForm.username || ''} onChange={e => setDbForm({ ...dbForm, username: e.target.value })} />
                <input className="border rounded p-2" type="password" placeholder="رمز عبور دیتابیس" value={dbForm.password || ''} onChange={e => setDbForm({ ...dbForm, password: e.target.value })} />
              </>
            )}
            <input className="border rounded p-2" placeholder="نام دیتابیس (dbName)" value={dbForm.dbName || ''} onChange={e => setDbForm({ ...dbForm, dbName: e.target.value })} />
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
      <div className="flex gap-2 items-center mb-6">
        <select className="border rounded p-2" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
          <option value="">انتخاب کاربر...</option>
          {data.users.map(u => (
            <option key={u.id} value={u.id}>{u.name || u.username || u.email}</option>
          ))}
        </select>
        <button className="bg-black text-white rounded px-3 py-2" onClick={async () => {
          if (!selectedUserId) return;
          const r = await fetch(`/api/admin/user?id=${selectedUserId}`)
          if (r.ok) setSelected((await r.json()).user)
        }}>مشاهده</button>
      </div>

      {selected && (
        <div className="border rounded p-4 mb-8">
          <div className="font-bold mb-2">{selected.name || selected.username || selected.email}</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">ساعت‌های کارکرد</h3>
              <ul className="text-sm space-y-1">
                {selected.workPeriods.map(w => (
                  <li key={w.id}>شروع: {new Date(w.startedAt).toLocaleString('fa-IR')} — پایان: {w.stoppedAt ? new Date(w.stoppedAt).toLocaleString('fa-IR') : 'باز'}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">تسک‌ها</h3>
              <ul className="text-sm space-y-1">
                {selected.tasks.map(t => (
                  <li key={t.id}>{t.title} — {t.description || ''} — {new Date(t.occurredAt).toLocaleString('fa-IR')}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6">
        {data.users.map(u => (
          <div key={u.id} className="border rounded p-4">
            <div className="font-bold mb-2">{u.name || u.username || u.email}</div>
            <div className="mb-3 flex items-center gap-2">
              <label className="text-sm">اجازه ویرایش تاریخ/ساعت:</label>
              <input type="checkbox" disabled={busy} checked={u.mayEditTimes} onChange={e => toggleEditPermission(u.id, e.target.checked)} />
              {u.isAdmin && <span className="text-xs bg-black text-white rounded px-2 py-0.5">ادمین</span>}
            </div>
            <div className="mb-3">
              <div className="text-sm mb-1">پروژه‌های اختصاص‌داده‌شده:</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {projects.map(p => {
                  const assigned = (u.userProjects || []).some(up => up.projectId === p.id || up.project?.id === p.id)
                  return (
                    <label key={p.id} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
                      <input type="checkbox" checked={assigned} onChange={async e => {
                        await fetch('/api/admin/projects/assign', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, projectId: p.id, assigned: e.target.checked }) })
                        const r = await fetch('/api/admin')
                        if (r.ok) setData(await r.json())
                      }} />
                      <span>{p.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">ساعت‌های کارکرد</h3>
                <ul className="text-sm space-y-1">
                  {u.workPeriods.map(w => (
                    <li key={w.id}>شروع: {new Date(w.startedAt).toLocaleString('fa-IR')} — پایان: {w.stoppedAt ? new Date(w.stoppedAt).toLocaleString('fa-IR') : 'باز'}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">تسک‌ها</h3>
                <ul className="text-sm space-y-1">
                  {u.tasks.map(t => (
                    <li key={t.id}>{t.title} — {t.description || ''} — {new Date(t.occurredAt).toLocaleString('fa-IR')}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


