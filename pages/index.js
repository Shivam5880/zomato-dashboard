import { useState, useEffect, useRef } from 'react'
import { fetchPeriodData, fetchBrands, generatePeriods } from '../lib/data'

// ── Format values ─────────────────────────────────────────
const fmt = (v, type = 'number') => {
  if (v === null || v === undefined) return '—'
  if (type === 'currency') return '₹' + Math.round(v).toLocaleString('en-IN')
  if (type === 'pct')      return (Math.round(v * 10) / 10) + '%'
  if (type === 'decimal')  return (Math.round(v * 10) / 10).toLocaleString('en-IN')
  return Math.round(v).toLocaleString('en-IN')
}

// ── Metric sections ───────────────────────────────────────
const SECTIONS = [
  { label: 'Sales', rows: [
    { key: 'gmv',       label: 'GMV',         type: 'currency' },
    { key: 'orders',    label: 'Orders',       type: 'number'   },
    { key: 'cancelled', label: 'Cancelled',    type: 'number'   },
    { key: 'delivered', label: 'Delivered',    type: 'number'   },
    { key: 'aov',       label: 'AOV',          type: 'currency' },
    { key: 'itemsSold', label: 'Item Sold',    type: 'number'   },
  ]},
  { label: 'Discounts', rows: [
    { key: 'discountRs',       label: 'Discount',          type: 'currency' },
    { key: 'grossSalesOffers', label: 'Gross from Offers', type: 'currency' },
  ]},
  { label: 'Ads', rows: [
    { key: 'adsSpend', label: 'Ads Spend', type: 'currency' },
    { key: 'adsCtr',   label: 'Ads CTR',   type: 'pct'      },
    { key: 'adsRoi',   label: 'Ads ROI',   type: 'decimal'  },
  ]},
  { label: 'Funnel', rows: [
    { key: 'impressions',  label: 'Impression',   type: 'number' },
    { key: 'menuOpens',    label: 'Menu Click',   type: 'number' },
    { key: 'cartBuilds',   label: 'Cart Make',    type: 'number' },
    { key: 'placedOrders', label: 'Order Places', type: 'number' },
  ]},
  { label: 'Operations', rows: [
    { key: 'avgKpt',    label: 'Avg KPT',  type: 'decimal' },
    { key: 'onlinePct', label: 'Online %', type: 'pct'     },
  ]},
  { label: 'P&L', rows: [
    { key: 'netPayout', label: 'Received',  type: 'currency' },
    { key: 'prepCost',  label: 'Prep Cost', type: 'currency' },
    { key: 'pnlRs',    label: 'P&L (₹)',   type: 'currency' },
    { key: 'pnlPct',   label: 'P&L (%)',   type: 'pct'      },
  ]},
]

// ── Date helpers ──────────────────────────────────────────
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function addWeeks(dateStr, n) { return addDays(dateStr, n * 7) }
function addMonths(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + n)
  return d.toISOString().split('T')[0]
}
function today() { return new Date().toISOString().split('T')[0] }

function getMaxTo(from, granularity) {
  if (!from) return ''
  if (granularity === 'daily')   return addDays(from, 14)
  if (granularity === 'weekly')  return addWeeks(from, 14)
  if (granularity === 'monthly') return addMonths(from, 14)
  return from
}

const TABS = [
  { id: 'brand_details', label: 'Brand details' },
  { id: 'sales',         label: 'Sales' },
  { id: 'discounts',     label: 'Discounts' },
  { id: 'ads',           label: 'Ads' },
  { id: 'operations',    label: 'Operations' },
  { id: 'menu',          label: 'Menu' },
]

// ── Main Page ─────────────────────────────────────────────
export default function Home() {
  const [brands, setBrands]           = useState([])
  const [selectedBrand, setBrand]     = useState('all')
  const [granularity, setGranularity] = useState('monthly')
  const [dateFrom, setDateFrom]       = useState('2026-03-01')
  const [dateTo,   setDateTo]         = useState('2026-05-24')
  const [periodData, setPeriodData]   = useState([])
  const [loading, setLoading]         = useState(false)
  const [activeTab, setActiveTab]     = useState('brand_details')
  const [searched, setSearched]       = useState(false)

  useEffect(() => {
    fetchBrands().then(b => setBrands(b))
  }, [])

  // When granularity changes, auto-fix dateTo to max allowed
  useEffect(() => {
    const maxTo = getMaxTo(dateFrom, granularity)
    if (dateTo > maxTo) setDateTo(maxTo)
  }, [granularity])

  const handleFromChange = (val) => {
    setDateFrom(val)
    const maxTo = getMaxTo(val, granularity)
    if (dateTo > maxTo || dateTo < val) setDateTo(maxTo)
    setSearched(false)
  }

  const handleToChange = (val) => {
    const maxTo = getMaxTo(dateFrom, granularity)
    if (val > maxTo) { setDateTo(maxTo); return }
    if (val < dateFrom) { setDateTo(dateFrom); return }
    setDateTo(val)
    setSearched(false)
  }

  const handleSearch = async () => {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    setSearched(true)
    try {
      const data = await fetchPeriodData(selectedBrand, dateFrom, dateTo, granularity)
      setPeriodData(data)
    } finally {
      setLoading(false)
    }
  }

  const limitLabel = granularity === 'daily' ? 'max 15 days'
                   : granularity === 'weekly' ? 'max 15 weeks'
                   : 'max 15 months'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ padding: '14px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Zomato Dashboard</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Delivery Analytics</span>
          </div>
          <div style={{ display: 'flex', gap: 0, marginTop: 12 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '9px 18px', fontSize: 13, fontWeight: 500, border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Brand</label>
            <select value={selectedBrand} onChange={e => { setBrand(e.target.value); setSearched(false) }}
              style={{ fontSize: 13, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#111' }}>
              <option value="all">All Brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />

          {/* Granularity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>View</label>
            <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
              {['daily','weekly','monthly'].map(g => (
                <button key={g} onClick={() => { setGranularity(g); setSearched(false) }}
                  style={{
                    padding: '4px 12px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: granularity === g ? '#2563eb' : '#fff',
                    color: granularity === g ? '#fff' : '#374151',
                  }}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>From</label>
            <input type="date" value={dateFrom} max={today()} onChange={e => handleFromChange(e.target.value)}
              style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} />
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>To</label>
            <input type="date" value={dateTo} min={dateFrom} max={getMaxTo(dateFrom, granularity)} onChange={e => handleToChange(e.target.value)}
              style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>({limitLabel})</span>
          </div>

          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />

          {/* Search button */}
          <button onClick={handleSearch} disabled={loading}
            style={{
              padding: '6px 18px', fontSize: 13, fontWeight: 500, border: 'none',
              borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#93c5fd' : '#2563eb', color: '#fff',
            }}>
            {loading ? 'Loading…' : '🔍 Search'}
          </button>

          {searched && !loading && periodData.length > 0 && (
            <span style={{ fontSize: 12, color: '#10b981' }}>
              ✓ Showing {periodData.length} {granularity === 'daily' ? 'days' : granularity === 'weekly' ? 'weeks' : 'months'}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1400, margin: '20px auto', padding: '0 24px' }}>
        {activeTab === 'brand_details' && (
          <BrandDetailsTab
            periodData={periodData}
            granularity={granularity}
            brand={selectedBrand}
            searched={searched}
            loading={loading}
          />
        )}
        {activeTab !== 'brand_details' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 48, textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🚧</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{TABS.find(t => t.id === activeTab)?.label} tab — coming soon</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Brand Details Tab ─────────────────────────────────────
function BrandDetailsTab({ periodData, granularity, brand, searched, loading }) {
  const scrollRef = useRef(null)
  const METRIC_COL_W = 160
  const DATA_COL_W   = 130

  if (!searched) {
    return (
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 48, textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>Select your filters and click <strong>Search</strong> to load data</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 48, textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: 14 }}>Loading data…</div>
      </div>
    )
  }

  if (!periodData.length) {
    return (
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 48, textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: 14 }}>No data found for selected period</div>
      </div>
    )
  }

  const totalW = METRIC_COL_W + DATA_COL_W * periodData.length

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ display: 'flex', overflow: 'hidden' }}>

        {/* ── Frozen metric column ── */}
        <div style={{ minWidth: METRIC_COL_W, maxWidth: METRIC_COL_W, flexShrink: 0, borderRight: '2px solid #e5e7eb', zIndex: 10, background: '#fff' }}>
          {/* Header cell */}
          <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 14px',
            background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Metric</span>
          </div>
          {/* Rows */}
          {SECTIONS.map((sec, si) => (
            <div key={si}>
              <div style={{ padding: '7px 14px', background: '#eef2ff', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{sec.label}</span>
              </div>
              {sec.rows.map((row, ri) => (
                <div key={ri} style={{
                  height: 40, display: 'flex', alignItems: 'center', padding: '0 14px',
                  borderBottom: '1px solid #f3f4f6', background: '#fff',
                }}>
                  <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{row.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Scrollable data columns ── */}
        <div ref={scrollRef} style={{ overflowX: 'auto', flex: 1 }}>
          <div style={{ minWidth: DATA_COL_W * periodData.length }}>
            {/* Header row */}
            <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', height: 52 }}>
              {periodData.map((p, i) => (
                <div key={i} style={{
                  minWidth: DATA_COL_W, width: DATA_COL_W, borderRight: '1px solid #f3f4f6',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '4px 8px',
                }}>
                  {p.label.split('\n').map((line, li) => (
                    <span key={li} style={{ fontSize: li === 0 ? 12 : 10, fontWeight: li === 0 ? 600 : 400, color: li === 0 ? '#111' : '#6b7280', textAlign: 'center', lineHeight: 1.3 }}>
                      {line}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {SECTIONS.map((sec, si) => (
              <div key={si}>
                {/* Section header */}
                <div style={{ display: 'flex', background: '#eef2ff', borderBottom: '1px solid #e5e7eb' }}>
                  {periodData.map((_, i) => (
                    <div key={i} style={{ minWidth: DATA_COL_W, width: DATA_COL_W, height: 30, borderRight: '1px solid #e5e7eb' }} />
                  ))}
                </div>
                {/* Metric rows */}
                {sec.rows.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
                    {periodData.map((p, i) => (
                      <div key={i} style={{
                        minWidth: DATA_COL_W, width: DATA_COL_W, height: 40,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRight: '1px solid #f3f4f6',
                        fontSize: 13, fontWeight: 600, color: '#111',
                      }}>
                        {fmt(p.data?.[row.key], row.type)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 14px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af' }}>
        * Prep Cost not in Zomato data — P&L rows will show once added. Swiggy data will merge here when added.
      </div>
    </div>
  )
}
