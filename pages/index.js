import { useState, useEffect, useRef } from 'react'
import { fetchPeriodData, fetchBrands } from '../lib/data'

const fmt = (v, type = 'number') => {
  if (v === null || v === undefined) return '—'
  if (type === 'currency') return '₹' + Math.round(v).toLocaleString('en-IN')
  if (type === 'pct')      return (Math.round(v * 10) / 10) + '%'
  if (type === 'decimal')  return (Math.round(v * 10) / 10).toLocaleString('en-IN')
  return Math.round(v).toLocaleString('en-IN')
}

// ── Brand Details sections ────────────────────────────────
const BD_SECTIONS = [
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

// ── Sales tab row structure ───────────────────────────────
const SLOTS = [
  { key: 'breakfast',  label: 'Breakfast',  time: '7–11 AM'   },
  { key: 'lunch',      label: 'Lunch',      time: '11 AM–4 PM' },
  { key: 'snacks',     label: 'Snacks',     time: '4–7 PM'    },
  { key: 'dinner',     label: 'Dinner',     time: '7 PM–12 AM' },
  { key: 'late_night', label: 'Late Night', time: '12–7 AM'   },
]

const SALES_SECTIONS = [
  { key: 'orders',    label: 'Orders',    type: 'number'   },
  { key: 'gmv',       label: 'GMV',       type: 'currency' },
  { key: 'discounts', label: 'Discounts', type: 'currency' },
  { key: 'net_sales', label: 'Net Sales', type: 'currency' },
  { key: 'aov',       label: 'AOV',       type: 'currency' },
]

const ADS_ROWS = [
  { key: 'booked',       label: 'Booked',        type: 'currency' },
  { key: 'spend',        label: 'Spend',          type: 'currency' },
  { key: 'roi',          label: 'ROI',            type: 'decimal'  },
  { key: 'organic_sale', label: 'Organic Sale',   type: 'currency' },
  { key: 'organic_pct',  label: 'Organic Sale%',  type: 'pct'      },
  { key: 'ads_sale',     label: 'Ads Sale',       type: 'currency' },
  { key: 'ads_pct',      label: 'Ads Sale%',      type: 'pct'      },
]

const PLATFORMS = ['Swiggy', 'Zomato', 'Combined']

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

// ── Shared table styles ───────────────────────────────────
const METRIC_COL_W = 170
const DATA_COL_W   = 120
const SUB_COL_W    = 110

// ── Main Page ─────────────────────────────────────────────
export default function Home() {
  const [brands, setBrands]         = useState([])
  const [selectedBrand, setBrand]   = useState('all')
  const [granularity, setGranularity] = useState('monthly')
  const [dateFrom, setDateFrom]     = useState('2026-03-01')
  const [dateTo,   setDateTo]       = useState('2026-05-24')
  const [periodData, setPeriodData] = useState([])
  const [loading, setLoading]       = useState(false)
  const [activeTab, setActiveTab]   = useState('brand_details')
  const [searched, setSearched]     = useState(false)

  useEffect(() => { fetchBrands().then(b => setBrands(b)) }, [])

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
                   : granularity === 'weekly' ? 'max 15 weeks' : 'max 15 months'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
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

      {/* Filters */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Brand</label>
            <select value={selectedBrand} onChange={e => { setBrand(e.target.value); setSearched(false) }}
              style={{ fontSize: 13, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#111' }}>
              <option value="all">All Brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>View</label>
            <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
              {['daily','weekly','monthly'].map(g => (
                <button key={g} onClick={() => { setGranularity(g); setSearched(false) }}
                  style={{ padding: '4px 12px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: granularity === g ? '#2563eb' : '#fff',
                    color: granularity === g ? '#fff' : '#374151' }}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
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
          <button onClick={handleSearch} disabled={loading}
            style={{ padding: '6px 18px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#93c5fd' : '#2563eb', color: '#fff' }}>
            {loading ? 'Loading…' : '🔍 Search'}
          </button>
          {searched && !loading && periodData.length > 0 && (
            <span style={{ fontSize: 12, color: '#10b981' }}>
              ✓ {periodData.length} {granularity === 'daily' ? 'days' : granularity === 'weekly' ? 'weeks' : 'months'}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1400, margin: '20px auto', padding: '0 24px' }}>
        {activeTab === 'brand_details' && (
          <BrandDetailsTab periodData={periodData} searched={searched} loading={loading} />
        )}
        {activeTab === 'sales' && (
          <SalesTab periodData={periodData} searched={searched} loading={loading} />
        )}
        {activeTab === 'discounts' && (
          <DiscountsTab searched={searched} loading={loading} />
        )}
        {activeTab === 'ads' && (
          <AdsTab searched={searched} loading={loading} />
        )}
        {activeTab === 'operations' && (
          <OperationsTab periodData={periodData} searched={searched} loading={loading} />
        )}
        {activeTab === 'menu' && (
          <MenuTab searched={searched} loading={loading} />
        )}
        {!['brand_details','sales','discounts','ads','operations','menu'].includes(activeTab) && (
          <ComingSoon label={TABS.find(t => t.id === activeTab)?.label} />
        )}
      </div>
    </div>
  )
}

// ── Coming Soon placeholder ───────────────────────────────
function ComingSoon({ label }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 48, textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>🚧</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{label} tab — coming soon</div>
    </div>
  )
}

// ── Empty / Loading state ─────────────────────────────────
function EmptyState({ searched, loading }) {
  if (!searched) return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
      <div style={{ fontSize: 14, color: '#6b7280' }}>Select your filters and click <strong>Search</strong> to load data</div>
    </div>
  )
  if (loading) return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: '#9ca3af' }}>Loading data…</div>
    </div>
  )
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: '#9ca3af' }}>No data found for selected period</div>
    </div>
  )
}

// ── Brand Details Tab ─────────────────────────────────────
function BrandDetailsTab({ periodData, searched, loading }) {
  const scrollRef = useRef(null)

  if (!searched || loading || !periodData.length)
    return <EmptyState searched={searched} loading={loading} />

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ display: 'flex', overflow: 'hidden' }}>
        {/* Frozen metric column */}
        <div style={{ minWidth: METRIC_COL_W, maxWidth: METRIC_COL_W, flexShrink: 0, borderRight: '2px solid #e5e7eb', zIndex: 10, background: '#fff' }}>
          <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Metric</span>
          </div>
          {BD_SECTIONS.map((sec, si) => (
            <div key={si}>
              <div style={{ padding: '7px 14px', background: '#eef2ff', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{sec.label}</span>
              </div>
              {sec.rows.map((row, ri) => (
                <div key={ri} style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 14px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{row.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Scrollable data */}
        <div ref={scrollRef} style={{ overflowX: 'auto', flex: 1 }}>
          <div style={{ minWidth: DATA_COL_W * periodData.length }}>
            <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', height: 52 }}>
              {periodData.map((p, i) => (
                <div key={i} style={{ minWidth: DATA_COL_W, width: DATA_COL_W, borderRight: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 8px' }}>
                  {p.label.split('\n').map((line, li) => (
                    <span key={li} style={{ fontSize: li === 0 ? 12 : 10, fontWeight: li === 0 ? 600 : 400, color: li === 0 ? '#111' : '#6b7280', textAlign: 'center', lineHeight: 1.3 }}>{line}</span>
                  ))}
                </div>
              ))}
            </div>
            {BD_SECTIONS.map((sec, si) => (
              <div key={si}>
                <div style={{ display: 'flex', background: '#eef2ff', borderBottom: '1px solid #e5e7eb' }}>
                  {periodData.map((_, i) => <div key={i} style={{ minWidth: DATA_COL_W, width: DATA_COL_W, height: 30, borderRight: '1px solid #e5e7eb' }} />)}
                </div>
                {sec.rows.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
                    {periodData.map((p, i) => (
                      <div key={i} style={{ minWidth: DATA_COL_W, width: DATA_COL_W, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #f3f4f6', fontSize: 13, fontWeight: 600, color: '#111' }}>
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
        * Prep Cost not in Zomato data. Swiggy data will merge here when added.
      </div>
    </div>
  )
}

// ── Sales Tab ─────────────────────────────────────────────
function SalesTab({ periodData, searched, loading }) {
  if (!searched || loading || !periodData.length)
    return <EmptyState searched={searched} loading={loading} />

  // Frozen left column width: category + slot
  const CAT_W  = 100
  const SLOT_W = 120
  // Each period has 3 sub-columns (Swiggy, Zomato, Combined)
  const PERIOD_W = SUB_COL_W * 3

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ display: 'flex', overflow: 'hidden' }}>

        {/* ── Frozen left: Category + Slot ── */}
        <div style={{ minWidth: CAT_W + SLOT_W, maxWidth: CAT_W + SLOT_W, flexShrink: 0, borderRight: '2px solid #e5e7eb', background: '#fff', zIndex: 10 }}>

          {/* Header */}
          <div style={{ display: 'flex', height: 68, background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ width: CAT_W, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Category</span>
            </div>
            <div style={{ width: SLOT_W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Time Slot</span>
            </div>
          </div>

          {/* Sales sections rows */}
          {SALES_SECTIONS.map((sec, si) => (
            <div key={si} style={{ borderTop: '2px solid #d1d5db' }}>
              {/* Category label cell spans all 5 slots using relative positioning */}
              <div style={{ display: 'flex', position: 'relative' }}>
                {/* Category label — vertically centered across all slots */}
                <div style={{
                  width: CAT_W, position: 'absolute', top: 0, left: 0,
                  height: 38 * SLOTS.length,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRight: '1px solid #e5e7eb', background: '#eef2ff',
                  zIndex: 1,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', padding: '0 4px' }}>{sec.label}</span>
                </div>
                {/* Slot rows */}
                <div style={{ marginLeft: CAT_W, flex: 1 }}>
                  {SLOTS.map((slot, sli) => (
                    <div key={sli} style={{ display: 'flex', height: 38, borderBottom: sli < SLOTS.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <div style={{ width: SLOT_W, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 10px' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{slot.label}</span>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>{slot.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Ads section */}
          <div style={{ borderTop: '2px solid #e5e7eb' }}>
            {ADS_ROWS.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', height: 38, borderBottom: '1px solid #f3f4f6' }}>
                {ri === 0 ? (
                  <div style={{ width: CAT_W, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e5e7eb', background: '#fff7ed' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ads</span>
                  </div>
                ) : (
                  <div style={{ width: CAT_W, borderRight: '1px solid #e5e7eb', background: '#fff7ed' }} />
                )}
                <div style={{ width: SLOT_W, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{row.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrollable data columns ── */}
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <div style={{ minWidth: PERIOD_W * periodData.length }}>

            {/* Period headers — 2 levels */}
            <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {periodData.map((p, pi) => (
                <div key={pi} style={{ minWidth: PERIOD_W, width: PERIOD_W, borderRight: '1px solid #d1d5db' }}>
                  {/* Period label */}
                  <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e5e7eb' }}>
                    {p.label.split('\n').map((line, li) => (
                      <span key={li} style={{ fontSize: li === 0 ? 12 : 10, fontWeight: li === 0 ? 600 : 400, color: li === 0 ? '#111' : '#6b7280', marginRight: li === 0 ? 6 : 0 }}>{line}</span>
                    ))}
                  </div>
                  {/* Platform sub-headers */}
                  <div style={{ display: 'flex', height: 34 }}>
                    {PLATFORMS.map((plat, pli) => (
                      <div key={pli} style={{
                        width: SUB_COL_W, minWidth: SUB_COL_W, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRight: pli < PLATFORMS.length - 1 ? '1px solid #e5e7eb' : 'none',
                        fontSize: 11, fontWeight: 600,
                        color: plat === 'Swiggy' ? '#ea580c' : plat === 'Zomato' ? '#dc2626' : '#2563eb',
                        background: plat === 'Combined' ? '#f0f4ff' : '#f9fafb',
                      }}>
                        {plat}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sales section data rows */}
            {SALES_SECTIONS.map((sec, si) => (
              <div key={si} style={{ borderTop: '2px solid #d1d5db' }}>
                {SLOTS.map((slot, sli) => (
                  <div key={sli} style={{ display: 'flex', borderBottom: sli < SLOTS.length - 1 ? '1px solid #f3f4f6' : 'none', height: 38 }}>
                    {periodData.map((p, pi) => (
                      <div key={pi} style={{ minWidth: PERIOD_W, width: PERIOD_W, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                        {PLATFORMS.map((plat, pli) => (
                          <div key={pli} style={{
                            width: SUB_COL_W, minWidth: SUB_COL_W, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRight: pli < PLATFORMS.length - 1 ? '1px solid #f3f4f6' : 'none',
                            fontSize: 12, color: '#374151',
                            background: plat === 'Combined' ? '#f8faff' : '#fff',
                          }}>
                            —
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {/* Ads section data rows */}
            <div style={{ borderTop: '2px solid #e5e7eb' }}>
              {ADS_ROWS.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', height: 38 }}>
                  {periodData.map((p, pi) => (
                    <div key={pi} style={{ minWidth: PERIOD_W, width: PERIOD_W, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      {PLATFORMS.map((plat, pli) => (
                        <div key={pli} style={{
                          width: SUB_COL_W, minWidth: SUB_COL_W, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRight: pli < PLATFORMS.length - 1 ? '1px solid #f3f4f6' : 'none',
                          fontSize: 12, color: '#374151',
                          background: plat === 'Combined' ? '#fff9f5' : '#fff',
                        }}>
                          —
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      <div style={{ padding: '8px 14px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af' }}>
        * Data will populate once Zomato & Swiggy ETL is connected. Swiggy column coming soon.
      </div>
    </div>
  )
}

// ── Discounts Tab ─────────────────────────────────────────
const DISCOUNT_ROWS = ['', '', '', '', ''] // 5 blank rows — names TBD by client

const ZOMATO_DISCOUNT_COLS = [
  { key: 'orders',       label: 'Orders',                    type: 'number'   },
  { key: 'gmv',          label: 'GMV',                       type: 'currency' },
  { key: 'res_disc_rs',  label: 'Res Discount (Rs)',         type: 'currency' },
  { key: 'cust_disc_rs', label: 'Customer Discount (Rs)',    type: 'currency' },
  { key: 'res_disc_pct', label: 'Res Discount %',           type: 'pct'      },
  { key: 'plat_disc_pct',label: 'Zomato Discount %',        type: 'pct'      },
  { key: 'net_aov',      label: 'Net AOV',                   type: 'currency' },
  { key: 'items_sold',   label: 'Item Sold',                 type: 'number'   },
]

const SWIGGY_DISCOUNT_COLS = [
  { key: 'orders',       label: 'Orders',                    type: 'number'   },
  { key: 'gmv',          label: 'GMV',                       type: 'currency' },
  { key: 'res_disc_rs',  label: 'Res Discount (Rs)',         type: 'currency' },
  { key: 'cust_disc_rs', label: 'Customer Discount (Rs)',    type: 'currency' },
  { key: 'res_disc_pct', label: 'Res Discount %',           type: 'pct'      },
  { key: 'plat_disc_pct',label: 'Swiggy Discount %',        type: 'pct'      },
  { key: 'net_aov',      label: 'Net AOV',                   type: 'currency' },
  { key: 'items_sold',   label: 'Item Sold',                 type: 'number'   },
]

function DiscountsTab({ searched, loading }) {
  if (!searched) return <EmptyState searched={searched} loading={loading} />

  const NAME_W    = 160
  const COL_W     = 140
  const ZOM_TOTAL = COL_W * ZOMATO_DISCOUNT_COLS.length
  const SWG_TOTAL = COL_W * SWIGGY_DISCOUNT_COLS.length

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ display: 'flex', overflow: 'hidden' }}>

        {/* ── Frozen: Discount Name ── */}
        <div style={{ minWidth: NAME_W, maxWidth: NAME_W, flexShrink: 0, borderRight: '2px solid #e5e7eb', background: '#fff', zIndex: 10 }}>
          {/* Header */}
          <div style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Discount Name</span>
          </div>
          {/* 5 blank rows */}
          {DISCOUNT_ROWS.map((name, ri) => (
            <div key={ri} style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 14px', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{name || '—'}</span>
            </div>
          ))}
        </div>

        {/* ── Scrollable: Zomato + Swiggy columns ── */}
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <div style={{ minWidth: ZOM_TOTAL + SWG_TOTAL }}>

            {/* ── Platform headers ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
              {/* Zomato header */}
              <div style={{ minWidth: ZOM_TOTAL, width: ZOM_TOTAL, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34, borderRight: '2px solid #d1d5db', background: '#fff1f2' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', letterSpacing: '0.04em' }}>ZOMATO</span>
              </div>
              {/* Swiggy header */}
              <div style={{ minWidth: SWG_TOTAL, width: SWG_TOTAL, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34, background: '#fff7ed' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ea580c', letterSpacing: '0.04em' }}>SWIGGY</span>
              </div>
            </div>

            {/* ── Column sub-headers ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              {/* Zomato cols */}
              {ZOMATO_DISCOUNT_COLS.map((col, ci) => (
                <div key={ci} style={{
                  minWidth: COL_W, width: COL_W, height: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRight: ci === ZOMATO_DISCOUNT_COLS.length - 1 ? '2px solid #d1d5db' : '1px solid #e5e7eb',
                  padding: '0 6px', textAlign: 'center',
                  fontSize: 11, fontWeight: 600, color: '#374151',
                }}>
                  {col.label}
                </div>
              ))}
              {/* Swiggy cols */}
              {SWIGGY_DISCOUNT_COLS.map((col, ci) => (
                <div key={ci} style={{
                  minWidth: COL_W, width: COL_W, height: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRight: ci < SWIGGY_DISCOUNT_COLS.length - 1 ? '1px solid #e5e7eb' : 'none',
                  padding: '0 6px', textAlign: 'center',
                  fontSize: 11, fontWeight: 600, color: '#374151',
                }}>
                  {col.label}
                </div>
              ))}
            </div>

            {/* ── Data rows ── */}
            {DISCOUNT_ROWS.map((_, ri) => (
              <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', height: 44 }}>
                {/* Zomato data */}
                {ZOMATO_DISCOUNT_COLS.map((col, ci) => (
                  <div key={ci} style={{
                    minWidth: COL_W, width: COL_W,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRight: ci === ZOMATO_DISCOUNT_COLS.length - 1 ? '2px solid #d1d5db' : '1px solid #f3f4f6',
                    fontSize: 13, color: '#374151', background: '#fff',
                  }}>
                    —
                  </div>
                ))}
                {/* Swiggy data */}
                {SWIGGY_DISCOUNT_COLS.map((col, ci) => (
                  <div key={ci} style={{
                    minWidth: COL_W, width: COL_W,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRight: ci < SWIGGY_DISCOUNT_COLS.length - 1 ? '1px solid #f3f4f6' : 'none',
                    fontSize: 13, color: '#374151', background: '#fffbf7',
                  }}>
                    —
                  </div>
                ))}
              </div>
            ))}

          </div>
        </div>
      </div>

      <div style={{ padding: '8px 14px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af' }}>
        * Discount names to be confirmed by client. Data will populate once ETL is connected.
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ADS TAB
// ─────────────────────────────────────────────────────────
const ADS_COLS = [
  { key: 'campaign_id',   label: 'Campaign ID',      type: 'text'     },
  { key: 'type_of_ad',    label: 'Type of Ad',       type: 'text'     },
  { key: 'cust_target',   label: 'Customer Target',  type: 'text'     },
  { key: 'segment',       label: 'Segment',          type: 'text'     },
  { key: 'cpc',           label: 'CPC',              type: 'currency' },
  { key: 'ad_impressions',label: 'Ad Impressions',   type: 'number'   },
  { key: 'ad_clicks',     label: 'Ad Clicks',        type: 'number'   },
  { key: 'ad_orders',     label: 'Ad Orders',        type: 'number'   },
  { key: 'ad_carts',      label: 'Ad Carts',         type: 'number'   },
  { key: 'ad_spend',      label: 'Ad Spend (Rs)',    type: 'currency' },
  { key: 'ad_sales',      label: 'Ad Sales (Rs)',    type: 'currency' },
]

const ADS_PLATFORMS = [
  { key: 'swiggy', label: 'SWIGGY', color: '#ea580c', bg: '#fff7ed', rows: 3 },
  { key: 'zomato', label: 'ZOMATO', color: '#dc2626', bg: '#fff1f2', rows: 3 },
]

function AdsTab({ searched, loading }) {
  if (!searched) return <EmptyState searched={searched} loading={loading} />

  const NAME_W = 160
  const COL_W  = 130

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: NAME_W + COL_W * ADS_COLS.length }}>

          {/* Header row */}
          <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ minWidth: NAME_W, width: NAME_W, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '2px solid #e5e7eb' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Company</span>
            </div>
            {ADS_COLS.map((col, ci) => (
              <div key={ci} style={{
                minWidth: COL_W, width: COL_W, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRight: '1px solid #e5e7eb', padding: '0 8px', textAlign: 'center',
                fontSize: 11, fontWeight: 600, color: '#374151', background: '#f9fafb',
              }}>
                {col.label}
              </div>
            ))}
          </div>

          {/* Platform rows */}
          {ADS_PLATFORMS.map((plat, pi) => (
            <div key={pi} style={{ borderTop: pi > 0 ? '2px solid #d1d5db' : 'none' }}>
              {Array.from({ length: plat.rows }).map((_, ri) => (
                <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', height: 44 }}>
                  {/* Company label only on first row */}
                  <div style={{
                    minWidth: NAME_W, width: NAME_W,
                    display: 'flex', alignItems: 'center', justifyContent: ri === 0 ? 'center' : 'flex-start',
                    borderRight: '2px solid #e5e7eb',
                    background: plat.bg, padding: '0 14px',
                  }}>
                    {ri === 0 && <span style={{ fontSize: 12, fontWeight: 700, color: plat.color }}>{plat.label}</span>}
                  </div>
                  {ADS_COLS.map((col, ci) => (
                    <div key={ci} style={{
                      minWidth: COL_W, width: COL_W,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRight: '1px solid #f3f4f6',
                      fontSize: 13, color: '#374151', background: ri % 2 === 0 ? '#fff' : '#fafafa',
                    }}>
                      —
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

        </div>
      </div>
      <div style={{ padding: '8px 14px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af' }}>
        * Ads campaign data will populate once ETL is connected.
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// OPERATIONS TAB
// ─────────────────────────────────────────────────────────
const OPS_METRICS = [
  { key: 'kpt',      label: 'KPT'      },
  { key: 'ratings',  label: 'Ratings'  },
  { key: 'orders',   label: 'Orders'   },
]

const OPS_COLS = [
  { key: 'swiggy',   label: 'Swiggy',   type: 'number' },
  { key: 'zomato',   label: 'Zomato',   type: 'number' },
  { key: 'overall',  label: 'Overall',  type: 'number' },
]

const OPS_DATA_COLS = [
  { key: 'delivered',   label: 'Delivered',              type: 'number'   },
  { key: 'cancelled',   label: 'Cancelled',              type: 'number'   },
  { key: 'gmv',         label: 'GMV',                    type: 'currency' },
  { key: 'discount',    label: 'Discount',               type: 'currency' },
  { key: 'aoc',         label: 'AOC',                    type: 'currency' },
  { key: 'cancel_reason', label: 'Cancellation Reason',  type: 'text'     },
]

function OperationsTab({ periodData, searched, loading }) {
  if (!searched) return <EmptyState searched={searched} loading={loading} />

  const METRIC_W  = 120
  const PERIOD_GRP = OPS_COLS.length * 110
  const SUB_W     = 110
  const DATA_W    = 130

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ display: 'flex', overflow: 'hidden' }}>

        {/* Frozen: Metric name */}
        <div style={{ minWidth: METRIC_W, maxWidth: METRIC_W, flexShrink: 0, borderRight: '2px solid #e5e7eb', background: '#fff', zIndex: 10 }}>
          {/* Header */}
          <div style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Metric</span>
          </div>
          {OPS_METRICS.map((m, mi) => (
            <div key={mi} style={{ borderTop: mi > 0 ? '2px solid #d1d5db' : 'none' }}>
              <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px', background: '#eef2ff', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
              </div>
              {/* Data sub-rows */}
              {OPS_DATA_COLS.map((col, ci) => (
                <div key={ci} style={{ height: 38, display: 'flex', alignItems: 'center', padding: '0 14px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{col.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Scrollable: periods with Swiggy/Zomato/Overall sub-cols */}
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <div style={{ minWidth: PERIOD_GRP * (periodData.length || 1) }}>

            {/* Period headers — single row on top */}
            <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {(periodData.length ? periodData : [{ label: 'Period' }]).map((p, pi) => (
                <div key={pi} style={{ minWidth: PERIOD_GRP, width: PERIOD_GRP, borderRight: '1px solid #d1d5db' }}>
                  {/* Period label */}
                  <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e5e7eb' }}>
                    {(p.label || 'Period').split('\n').map((line, li) => (
                      <span key={li} style={{ fontSize: li === 0 ? 12 : 10, fontWeight: li === 0 ? 600 : 400, color: li === 0 ? '#111' : '#6b7280', marginRight: li === 0 ? 6 : 0 }}>{line}</span>
                    ))}
                  </div>
                  {/* Sub-col headers: Swiggy / Zomato / Overall */}
                  <div style={{ display: 'flex', height: 34 }}>
                    {OPS_COLS.map((col, ci) => (
                      <div key={ci} style={{
                        width: SUB_W, minWidth: SUB_W, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRight: ci < OPS_COLS.length - 1 ? '1px solid #e5e7eb' : 'none',
                        fontSize: 11, fontWeight: 600,
                        color: col.key === 'swiggy' ? '#ea580c' : col.key === 'zomato' ? '#dc2626' : '#2563eb',
                        background: col.key === 'overall' ? '#f0f4ff' : '#f9fafb',
                      }}>
                        {col.label}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Metric rows */}
            {OPS_METRICS.map((m, mi) => (
              <div key={mi} style={{ borderTop: mi > 0 ? '2px solid #d1d5db' : 'none' }}>
                {/* Metric label row */}
                <div style={{ display: 'flex', background: '#eef2ff', borderBottom: '1px solid #e5e7eb', height: 44 }}>
                  {(periodData.length ? periodData : [{}]).map((_, pi) => (
                    <div key={pi} style={{ minWidth: PERIOD_GRP, width: PERIOD_GRP, borderRight: '1px solid #d1d5db' }} />
                  ))}
                </div>
                {/* Data sub-rows */}
                {OPS_DATA_COLS.map((col, ci) => (
                  <div key={ci} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', height: 38 }}>
                    {(periodData.length ? periodData : [{}]).map((p, pi) => (
                      <div key={pi} style={{ minWidth: PERIOD_GRP, width: PERIOD_GRP, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                        {OPS_COLS.map((sub, si) => (
                          <div key={si} style={{
                            width: SUB_W, minWidth: SUB_W, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRight: si < OPS_COLS.length - 1 ? '1px solid #f3f4f6' : 'none',
                            fontSize: 12, color: '#374151',
                            background: sub.key === 'overall' ? '#f8faff' : '#fff',
                          }}>
                            —
                          </div>
                        ))}
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
        * Data will populate once ETL is connected.
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MENU TAB
// ─────────────────────────────────────────────────────────
const MENU_COLS = [
  { key: 'item_ratings',  label: 'Item Ratings',       type: 'decimal'  },
  { key: 'top10_items',   label: 'Top 10 Items',        type: 'text'     },
  { key: 'total_orders',  label: 'Total Orders',        type: 'number'   },
  { key: 'qty_sold',      label: 'Qty Sold',            type: 'number'   },
  { key: 'gmv',           label: 'GMV',                 type: 'currency' },
  { key: 'avg_discount',  label: 'Avg Discount',        type: 'currency' },
  { key: 'avg_aov',       label: 'Average AOV',         type: 'currency' },
  { key: 'avg_receivable',label: 'Avg Receivable',      type: 'currency' },
  { key: 'profit_rs',     label: 'Profit in Rs',        type: 'currency' },
  { key: 'profit_pct',    label: 'Profit in %',         type: 'pct'      },
]

const MENU_ITEM_COLS = [
  { key: 'item_name',     label: 'Item Name',           type: 'text'     },
  { key: 'total_orders',  label: 'Total Orders',        type: 'number'   },
  { key: 'qty_sold',      label: 'Qty Sold',            type: 'number'   },
  { key: 'gmv',           label: 'GMV',                 type: 'currency' },
  { key: 'avg_discount',  label: 'Avg Discount',        type: 'currency' },
  { key: 'avg_aov',       label: 'Average AOV',         type: 'currency' },
  { key: 'avg_receivable',label: 'Avg Receivable',      type: 'currency' },
  { key: 'profit_rs',     label: 'Profit in Rs',        type: 'currency' },
  { key: 'profit_pct',    label: 'Profit in %',         type: 'pct'      },
]

const MENU_PLATFORMS = [
  { key: 'swiggy',   label: 'Swiggy',   color: '#ea580c', bg: '#fff7ed', headerBg: '#ffedd5' },
  { key: 'zomato',   label: 'Zomato',   color: '#dc2626', bg: '#fff1f2', headerBg: '#fee2e2' },
  { key: 'overall',  label: 'Overall',  color: '#2563eb', bg: '#f8faff', headerBg: '#dbeafe' },
]

const TOP10_ROWS = 10
const MENU_ITEM_ROWS = 8

function MenuTab({ searched, loading }) {
  if (!searched) return <EmptyState searched={searched} loading={loading} />

  const PLAT_W  = 140
  const COL_W   = 130
  const ITEM_W  = 160

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Top 10 Items section ── */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Top 10 Items</span>
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>by platform</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: PLAT_W + COL_W * MENU_COLS.length }}>

            {/* Header */}
            <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ minWidth: PLAT_W, width: PLAT_W, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '2px solid #e5e7eb' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Platform</span>
              </div>
              {MENU_COLS.map((col, ci) => (
                <div key={ci} style={{
                  minWidth: COL_W, width: COL_W, height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRight: '1px solid #e5e7eb', padding: '0 8px', textAlign: 'center',
                  fontSize: 11, fontWeight: 600, color: '#374151',
                }}>
                  {col.label}
                </div>
              ))}
            </div>

            {/* Platform groups */}
            {MENU_PLATFORMS.map((plat, pi) => (
              <div key={pi} style={{ borderTop: pi > 0 ? '2px solid #d1d5db' : 'none' }}>
                {Array.from({ length: TOP10_ROWS }).map((_, ri) => (
                  <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', height: 38 }}>
                    <div style={{
                      minWidth: PLAT_W, width: PLAT_W,
                      display: 'flex', alignItems: 'center', justifyContent: ri === 0 ? 'center' : 'flex-start',
                      borderRight: '2px solid #e5e7eb', background: plat.bg, padding: '0 12px',
                    }}>
                      {ri === 0 && <span style={{ fontSize: 12, fontWeight: 700, color: plat.color }}>{plat.label}</span>}
                    </div>
                    {MENU_COLS.map((col, ci) => (
                      <div key={ci} style={{
                        minWidth: COL_W, width: COL_W,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRight: '1px solid #f3f4f6',
                        fontSize: 12, color: '#374151',
                        background: ri % 2 === 0 ? '#fff' : '#fafafa',
                      }}>
                        —
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── All Menu Items section ── */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Menu List</span>
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>all items combined</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: ITEM_W + COL_W * MENU_ITEM_COLS.length }}>

            {/* Header */}
            <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ minWidth: ITEM_W, width: ITEM_W, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '2px solid #e5e7eb' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Item Name</span>
              </div>
              {MENU_ITEM_COLS.filter(c => c.key !== 'item_name').map((col, ci) => (
                <div key={ci} style={{
                  minWidth: COL_W, width: COL_W, height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRight: '1px solid #e5e7eb', padding: '0 8px', textAlign: 'center',
                  fontSize: 11, fontWeight: 600, color: '#374151',
                }}>
                  {col.label}
                </div>
              ))}
            </div>

            {/* Item rows */}
            {Array.from({ length: MENU_ITEM_ROWS }).map((_, ri) => (
              <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', height: 38 }}>
                <div style={{
                  minWidth: ITEM_W, width: ITEM_W,
                  display: 'flex', alignItems: 'center', padding: '0 14px',
                  borderRight: '2px solid #e5e7eb',
                  fontSize: 12, color: '#374151', fontWeight: 500,
                  background: ri % 2 === 0 ? '#fff' : '#fafafa',
                }}>
                  —
                </div>
                {MENU_ITEM_COLS.filter(c => c.key !== 'item_name').map((col, ci) => (
                  <div key={ci} style={{
                    minWidth: COL_W, width: COL_W,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRight: '1px solid #f3f4f6',
                    fontSize: 12, color: '#374151',
                    background: ri % 2 === 0 ? '#fff' : '#fafafa',
                  }}>
                    —
                  </div>
                ))}
              </div>
            ))}

          </div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
        * Menu data will populate once ETL is connected.
      </p>
    </div>
  )
}