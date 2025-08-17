"use client";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(0);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/api/admin').then(async r => {
      setLoading(false);
      if (r.ok) setData(await r.json());
    })
  }, []);

  if (loading) return <div className="p-6">در حال بارگذاری...</div>;
  if (!data) return <div className="p-6">عدم دسترسی</div>;

  async function toggleEditPermission(userId, value) {
    setBusy(true)
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, mayEditTimes: value }) })
    const r = await fetch('/api/admin')
    if (r.ok) setData(await r.json())
    setBusy(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">پنل مدیریت</h1>
      <div className="flex gap-2 items-center mb-6">
        <select className="border rounded p-2" value={selectedUserId} onChange={e => setSelectedUserId(Number(e.target.value))}>
          <option value={0}>انتخاب کاربر...</option>
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


