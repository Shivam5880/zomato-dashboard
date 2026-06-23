import { useState, useEffect, useCallback } from 'react'
import { fetchDashboardData, fetchBrands } from '../lib/data'
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks } from 'date-fns'

// ── Helpers ───────────────────────────────────────────────
const fmt = (v, type = 'number') => {
  if (v === null || v === undefined) return '—'
  if (type === 'currency') return '₹' + Math.round(v).toLocaleString('en-IN')
  if (type === 'pct')      return Math.round(v * 10) / 10 + '%'
  if (type === 'decimal')  return (Math.round(v * 10) / 10).toString()
  return Math.round(v).toLocaleString('en-IN')
}

// ── Metric rows definition ────────────────────────────────
const SECTIONS = [
  {
    label: 'Sales',
    rows: [
      { key: 'gmv',       label: 'GMV',       type: 'currency', note: 'Bill Subtotal + Packaging (delivered)' },
      { key: 'orders',    label: 'Orders',     type: 'number',   note: 'Total placed orders' },
      { key: 'cancelled', label: 'Cancelled',  type: 'number',   note: 'Rejected + Returned + Timed out' },
      { key: 'delivered', label: 'Delivered',  type: 'number',   note: 'Delivered orders' },
      { key: 'aov',       label: 'AOV',        type: 'currency', note: 'GMV ÷ Delivered orders' },
      { key: 'itemsSold', label: 'Item Sold',  type: 'number',   note: 'Sum of item quantities (delivered)' },
    ]
  },
  {
    label: 'Discounts',
    rows: [
      { key: 'discountRs',      label: 'Discount',       type: 'currency', note: 'Promo + Gold + Brand pack' },
      { key: 'grossSalesOffers',label: 'Gross from Offers', type: 'currency', note: 'Gross sales from offers (Rs)' },
    ]
  },
  {
    label: 'Ads',
    rows: [
      { key: 'adsSpend', label: 'Ads',     type: 'currency', note: 'Ad Spend (Rs)' },
      { key: 'adsCtr',   label: 'Ads CTR', type: 'pct',      note: 'Ads CTR (%)' },
      { key: 'adsRoi',   label: 'Ads ROI', type: 'decimal',  note: 'Ads ROI' },
    ]
  },
  {
    label: 'Funnel',
    rows: [
      { key: 'impressions',  label: 'Impression',    type: 'number', note: 'Total impressions' },
      { key: 'menuOpens',    label: 'Menu Click',    type: 'number', note: 'Menu opens / Zomato detailed report' },
      { key: 'cartBuilds',   label: 'Cart Make',     type: 'number', note: 'Cart builds / Zomato detailed report' },
      { key: 'placedOrders', label: 'Order Places',  type: 'number', note: 'Placed Orders / Zomato detailed report' },
    ]
  },
  {
    label: 'Operations',
    rows: [
      { key: 'avgKpt',    label: 'Average KPT', type: 'decimal', note: 'KPT in minutes (avg)' },
      { key: 'onlinePct', label: 'Online %',    type: 'pct',     note: 'Online % (avg)' },
      { key: 'itemsSold', label: 'Item Sold',   type: 'number',  note: 'Items in order' },
    ]
  },
  {
    label: 'P&L',
    rows: [
      { key: 'netPayout', label: 'Received',  type: 'currency', note: 'Net Payout after all discounts' },
      { key: 'prepCost',  label: 'Prep Cost', type: 'currency', note: 'Manual entry — not in Zomato data' },
      { key: 'pnlRs',    label: 'P&L (₹)',   type: 'currency', note: 'Net payout − Prep cost' },
      { key: 'pnlPct',   label: 'P&L (%)',   type: 'pct',      note: 'P&L ÷ GMV' },
    ]
  }
]

// ── Period presets ────────────────────────────────────────
function getPreset(preset) {
  const today = new Date()
  switch (preset) {
    case 'this_month':
      return { from: format(startOfMonth(today), 'yyyy-MM-dd'), to: format(endOfMonth(today), 'yyyy-MM-dd') }
    case 'last_month': {
      const lm = subMonths(today, 1)
      return { from: format(startOfMonth(lm), 'yyyy-MM-dd'), to: format(endOfMonth(lm), 'yyyy-MM-dd') }
    }
    case 'this_week':
      return { from: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd') }
    case 'last_week': {
      const lw = subWeeks(today, 1)
      return { from: format(startOfWeek(lw, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(lw, { weekStartsOn: 1 }), 'yyyy-MM-dd') }
    }
    default: return null
  }
}

// ── Main Page ─────────────────────────────────────────────
export default function Home() {
  const [brands, setBrands]           = useState([])
  const [selectedBrand, setBrand]     = useState('')
  const [granularity, setGranularity] = useState('monthly')

  // Current period
  const [dateFrom, setDateFrom] = useState('2026-03-01')
  const [dateTo,   setDateTo]   = useState('2026-03-31')

  // Compare period
  const [compareFrom, setCompareFrom] = useState('2026-02-01')
  const [compareTo,   setCompareTo]   = useState('2026-02-28')
  const [showCompare, setShowCompare] = useState(true)

  const [currentData, setCurrentData]   = useState(null)
  const [compareData, setCompareData]   = useState(null)
  const [loading, setLoading]           = useState(false)
  const [activeTab, setActiveTab]       = useState('brand_details')

  // Load brands on mount
  useEffect(() => {
    fetchBrands().then(b => {
      setBrands(b)
      if (b.length) setBrand(b[0])
    })
  }, [])

  // Fetch data whenever filters change
  const loadData = useCallback(async () => {
    if (!selectedBrand || !dateFrom || !dateTo) return
    setLoading(true)
    try {
      const [curr, comp] = await Promise.all([
        fetchDashboardData(selectedBrand, dateFrom, dateTo),
        showCompare && compareFrom && compareTo
          ? fetchDashboardData(selectedBrand, compareFrom, compareTo)
          : Promise.resolve(null)
      ])
      setCurrentData(curr)
      setCompareData(comp)
    } finally {
      setLoading(false)
    }
  }, [selectedBrand, dateFrom, dateTo, compareFrom, compareTo, showCompare])

  useEffect(() => { loadData() }, [loadData])

  // Apply preset
  const applyPreset = (preset) => {
    const p = getPreset(preset)
    if (p) { setDateFrom(p.from); setDateTo(p.to) }
  }

  const TABS = [
    { id: 'brand_details', label: 'Brand details' },
    { id: 'sales',         label: 'Sales' },
    { id: 'discounts',     label: 'Discounts' },
    { id: 'ads',           label: 'Ads' },
    { id: 'operations',    label: 'Operations' },
    { id: 'menu',          label: 'Menu' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ padding: '16px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>📊</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Zomato Dashboard</span>
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>Delivery Analytics</span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px', fontSize: 13, fontWeight: 500, border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                  borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                  transition: 'all 0.15s'
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

          {/* Brand selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Brand</label>
            <select value={selectedBrand} onChange={e => setBrand(e.target.value)}
              style={{ fontSize: 13, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#111' }}>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ width: 1, height: 28, background: '#e5e7eb' }} />

          {/* Granularity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>View</label>
            <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
              {['weekly', 'monthly'].map(g => (
                <button key={g} onClick={() => setGranularity(g)}
                  style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: granularity === g ? '#2563eb' : '#fff',
                    color: granularity === g ? '#fff' : '#374151'
                  }}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: '#e5e7eb' }} />

          {/* Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Quick</label>
            {[
              { id: 'this_month', label: 'This month' },
              { id: 'last_month', label: 'Last month' },
              { id: 'this_week',  label: 'This week' },
              { id: 'last_week',  label: 'Last week' },
            ].map(p => (
              <button key={p.id} onClick={() => applyPreset(p.id)}
                style={{ padding: '4px 10px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#374151' }}>
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 28, background: '#e5e7eb' }} />

          {/* Current period */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Period</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ fontSize: 12, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} />
            <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ fontSize: 12, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} />
          </div>

          {/* Compare toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
              <input type="checkbox" checked={showCompare} onChange={e => setShowCompare(e.target.checked)}
                style={{ accentColor: '#2563eb' }} />
              Compare with
            </label>
            {showCompare && <>
              <input type="date" value={compareFrom} onChange={e => setCompareFrom(e.target.value)}
                style={{ fontSize: 12, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
              <input type="date" value={compareTo} onChange={e => setCompareTo(e.target.value)}
                style={{ fontSize: 12, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} />
            </>}
          </div>

          {loading && <span style={{ fontSize: 12, color: '#6b7280' }}>Loading…</span>}
        </div>
      </div>

      {/* ── Dashboard body ── */}
      <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 24px' }}>

        {activeTab === 'brand_details' && (
          <BrandDetailsTab
            currentData={currentData}
            compareData={compareData}
            dateFrom={dateFrom} dateTo={dateTo}
            compareFrom={compareFrom} compareTo={compareTo}
            showCompare={showCompare}
            brand={selectedBrand}
          />
        )}

        {activeTab !== 'brand_details' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 40, textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#374151' }}>{TABS.find(t => t.id === activeTab)?.label} tab</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Coming soon — add your queries here</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Brand Details Tab ─────────────────────────────────────
function BrandDetailsTab({ currentData, compareData, dateFrom, dateTo, compareFrom, compareTo, showCompare, brand }) {
  const periodLabel  = dateFrom && dateTo   ? `${format(new Date(dateFrom), 'd MMM')} – ${format(new Date(dateTo), 'd MMM yyyy')}` : 'Current'
  const compareLabel = compareFrom && compareTo ? `${format(new Date(compareFrom), 'd MMM')} – ${format(new Date(compareTo), 'd MMM yyyy')}` : 'Compare'

  return (
    <div>
      {/* Period header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{brand}</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Brand Details</span>
      </div>

      {/* Metrics table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ ...TH, width: '22%', textAlign: 'left' }}>Metric</th>
              <th style={{ ...TH, width: showCompare ? '20%' : '35%' }}>{periodLabel}</th>
              {showCompare && <th style={{ ...TH, width: '20%' }}>{compareLabel}</th>}
              <th style={{ ...TH, flex: 1, textAlign: 'left', color: '#9ca3af' }}>Source / Logic</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((section, si) => (
              <>
                {/* Section header row */}
                <tr key={`section-${si}`} style={{ background: '#f0f4ff' }}>
                  <td colSpan={showCompare ? 4 : 3}
                    style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {section.label}
                  </td>
                </tr>
                {section.rows.map((row, ri) => (
                  <MetricRow
                    key={`${si}-${ri}`}
                    row={row}
                    current={currentData?.[row.key]}
                    compare={compareData?.[row.key]}
                    showCompare={showCompare}
                    isLast={ri === section.rows.length - 1}
                  />
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
        * Prep Cost is not available in Zomato data — enter it manually in the code (lib/data.js) to enable P&amp;L calculation.
        Swiggy data will be merged here once added.
      </p>
    </div>
  )
}

// ── Metric Row ────────────────────────────────────────────
function MetricRow({ row, current, compare, showCompare, isLast }) {
  const [hover, setHover] = useState(false)
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#f9fafb' : '#fff', borderBottom: isLast ? '1px solid #e5e7eb' : '1px solid #f3f4f6', transition: 'background 0.1s' }}>
      <td style={{ padding: '10px 16px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{row.label}</td>
      <td style={{ padding: '10px 16px', fontSize: 13, color: '#111', textAlign: 'center', fontWeight: 600 }}>
        {fmt(current, row.type)}
      </td>
      {showCompare && (
        <td style={{ padding: '10px 16px', fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
          {fmt(compare, row.type)}
        </td>
      )}
      <td style={{ padding: '10px 16px', fontSize: 11, color: '#9ca3af' }}>{row.note}</td>
    </tr>
  )
}

const TH = {
  padding: '10px 16px', fontSize: 12, fontWeight: 600,
  color: '#374151', textAlign: 'center',
  borderBottom: '1px solid #e5e7eb'
}
