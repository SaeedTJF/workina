"use client";
import { useMemo, useRef, useEffect, useState } from 'react'

export default function Select2Project({ value, onChange, options, placeholder = 'انتخاب پروژه (اختیاری)', className = '' }) {
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const items = useMemo(() => {
    const q = (query || '').toLowerCase()
    const list = (options || []).map(o => ({ id: String(o.id), text: String(o.text) }))
    if (!q) return list
    return list.filter(o => o.text.toLowerCase().includes(q))
  }, [options, query])

  const selectedText = useMemo(() => {
    const found = (options || []).find(o => String(o.id) === String(value))
    return found?.text || ''
  }, [options, value])

  useEffect(() => {
    function onDocClick(e) {
      if (!inputRef.current) return
      if (!inputRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div ref={inputRef} className={`relative ${className}`}>
      <button type="button" className="input w-full text-right flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        <span className={`truncate ${!value ? 'text-gray-500' : ''}`}>{value ? selectedText : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 20 20"><path fill="currentColor" d="M5.5 7.5L10 12l4.5-4.5z"/></svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-[#0f172a] border rounded shadow-lg">
          <div className="p-2">
            <input autoFocus className="input w-full" placeholder="جستجو..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <ul className="max-h-56 overflow-auto text-sm">
            <li className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#1f2937] cursor-pointer" onClick={() => { onChange?.(''); setOpen(false) }}>{placeholder}</li>
            {items.map(o => (
              <li key={o.id} className={`px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#1f2937] cursor-pointer ${String(value)===String(o.id)?'bg-gray-50 dark:bg-[#111827]':''}`} onClick={() => { onChange?.(o.id); setOpen(false) }}>{o.text}</li>
            ))}
            {items.length === 0 && <li className="px-3 py-2 text-gray-500">موردی یافت نشد</li>}
          </ul>
        </div>
      )}
    </div>
  )
}


