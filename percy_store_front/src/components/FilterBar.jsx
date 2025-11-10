import React from 'react'

const CATEGORIES = ['Todas','Televisores','Audio','Consolas','Electrodomésticos','Refrigeración','Climatización','Lavado & Secado']
const BRANDS = ['LG','Samsung','Sony','Mabe','Whirlpool','Philips','Xiaomi']

export default function FilterBar({ value, onChange }){
  const v = value || {}
  const set = (patch) => onChange?.({ ...v, ...patch })

  return (
    <div className="card p-3 mb-4">
      <div className="flex flex-col md:flex-row gap-3">
        <select value={v.category || 'Todas'} onChange={(e)=> set({ category: e.target.value })} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={v.q || ''} onChange={(e)=> set({ q: e.target.value })} placeholder="Busca como en Amazon…" className="flex-1 rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
        <div className="flex items-center gap-2">
          <input type="number" min="0" value={v.min || ''} onChange={(e)=>set({ min: e.target.value })} placeholder="Min" className="w-24 rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
          <span>a</span>
          <input type="number" min="0" value={v.max || ''} onChange={(e)=>set({ max: e.target.value })} placeholder="Max" className="w-24 rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {BRANDS.map(b => (
          <button key={b} onClick={()=> set({ brand: v.brand === b ? '' : b })} className={`badge ${v.brand === b ? 'bg-green-700 text-white border-transparent' : 'border-neutral-300 dark:border-neutral-700'}`}>
            {b}
          </button>
        ))}
      </div>
    </div>
  )
}

