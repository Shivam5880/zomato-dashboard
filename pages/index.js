import { useState, useEffect, useRef } from 'react'
import { fetchPeriodData, fetchBrands, fetchMenuData } from '../lib/data'

const fmt = (v, type = 'number') => {
  if (v === null || v === undefined) return '—'
  if (type === 'currency') return '₹' + Math.round(v).toLocaleString('en-IN')
  if (type === 'pct')      return (Math.round(v * 10) / 10) + '%'
  if (type === 'decimal')  return (Math.round(v * 10) / 10).toLocaleString('en-IN')
  return Math.round(v).toLocaleString('en-IN')
}

// ── Brand Details metric rows ─────────────────────────────
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
    { key: 'avgRating', label: 'Avg Rating', type: 'decimal' },
  ]},
  { label: 'P&L', rows: [
    { key: 'netPayout', label: 'Received',  type: 'currency' },
    { key: 'prepCost',  label: 'Prep Cost', type: 'currency' },
    { key: 'pnlRs',    label: 'P&L (₹)',   type: 'currency' },
    { key: 'pnlPct',   label: 'P&L (%)',   type: 'pct'      },
  ]},
]

// ── Sales tab config ──────────────────────────────────────
const SLOTS = [
  { key: 'breakfast',  label: 'Breakfast',  time: '7–11 AM' },
  { key: 'lunch',      label: 'Lunch',      time: '11 AM–4 PM' },
  { key: 'snacks',     label: 'Snacks',     time: '4–7 PM' },
  { key: 'dinner',     label: 'Dinner',     time: '7 PM–12 AM' },
  { key: 'late_night', label: 'Late Night', time: '12–7 AM' },
]
const SALES_SECTIONS = [
  { key: 'orders',    label: 'Orders',    type: 'number',   field: 'orders_' },
  { key: 'gmv',       label: 'GMV',       type: 'currency', field: 'gmv_' },
  { key: 'discounts', label: 'Discounts', type: 'currency', field: 'discount_' },
  { key: 'net_sales', label: 'Net Sales', type: 'currency', field: null },
  { key: 'aov',       label: 'AOV',       type: 'currency', field: null },
]
const ADS_ROWS = [
  { key: 'adsSpend',    label: 'Spend',          type: 'currency' },
  { key: 'adsRoi',      label: 'ROI',            type: 'decimal'  },
  { key: 'organicSale', label: 'Organic Sale',   type: 'currency' },
  { key: 'organicPct',  label: 'Organic Sale%',  type: 'pct'      },
  { key: 'adsSales',    label: 'Ads Sale',       type: 'currency' },
  { key: 'adsSalePct',  label: 'Ads Sale%',      type: 'pct'      },
]
const PLATFORMS = ['swiggy', 'zomato', 'combined']
const PLAT_LABELS = { swiggy: 'Swiggy', zomato: 'Zomato', combined: 'Combined' }
const PLAT_COLORS = { swiggy: '#ea580c', zomato: '#dc2626', combined: '#2563eb' }

// ── Discounts tab config ──────────────────────────────────
const DISCOUNT_ROWS_COUNT = 5
const ZOMATO_DISCOUNT_COLS = [
  { key: 'orders',       label: 'Orders',               type: 'number' },
  { key: 'gmv',          label: 'GMV',                  type: 'currency' },
  { key: 'resDiscount',  label: 'Res Discount (Rs)',    type: 'currency' },
  { key: 'customerDiscount', label: 'Customer Disc (Rs)', type: 'currency' },
  { key: 'res_disc_pct', label: 'Res Discount %',      type: 'pct' },
  { key: 'plat_disc_pct',label: 'Zomato Discount %',   type: 'pct' },
  { key: 'aov',          label: 'Net AOV',              type: 'currency' },
  { key: 'itemsSold',    label: 'Item Sold',            type: 'number' },
]
const SWIGGY_DISCOUNT_COLS = [
  { key: 'orders',       label: 'Orders',               type: 'number' },
  { key: 'gmv',          label: 'GMV',                  type: 'currency' },
  { key: 'resDiscount',  label: 'Res Discount (Rs)',    type: 'currency' },
  { key: 'customerDiscount', label: 'Customer Disc (Rs)', type: 'currency' },
  { key: 'res_disc_pct', label: 'Res Discount %',      type: 'pct' },
  { key: 'plat_disc_pct',label: 'Swiggy Discount %',   type: 'pct' },
  { key: 'aov',          label: 'Net AOV',              type: 'currency' },
  { key: 'itemsSold',    label: 'Item Sold',            type: 'number' },
]

// ── Operations tab config ─────────────────────────────────
const OPS_METRICS = [
  { key: 'kpt',     label: 'KPT',     field: 'avgKpt',    type: 'decimal' },
  { key: 'ratings', label: 'Ratings', field: 'avgRating', type: 'decimal' },
]
const OPS_DATA_ROWS = [
  { key: 'delivered',       label: 'Delivered',           field: 'delivered',           type: 'number' },
  { key: 'cancelled',       label: 'Cancelled',           field: 'cancelled',           type: 'number' },
  { key: 'gmv',             label: 'GMV',                 field: 'gmv',                 type: 'currency' },
  { key: 'discount',        label: 'Discount',            field: 'discountRs',          type: 'currency' },
  { key: 'aov',             label: 'AOC',                 field: 'aov',                 type: 'currency' },
  { key: 'cancel_reason',   label: 'Cancel Reason',       field: 'cancellationReason',  type: 'text' },
]

// ── Ads tab config ────────────────────────────────────────
const ADS_TAB_COLS = [
  { key: 'adsSpend',     label: 'Ad Spend (Rs)',    type: 'currency' },
  { key: 'adsSales',     label: 'Ad Sales (Rs)',    type: 'currency' },
  { key: 'adsOrders',    label: 'Ad Orders',        type: 'number' },
  { key: 'adsRoi',       label: 'ROI',              type: 'decimal' },
  { key: 'impressions',  label: 'Ad Impressions',   type: 'number' },
]

// ── Menu tab config ───────────────────────────────────────
const MENU_COLS = [
  { key: 'item_ratings',   label: 'Rating',          type: 'decimal' },
  { key: 'total_orders',   label: 'Total Orders',    type: 'number' },
  { key: 'qty_sold',       label: 'Qty Sold',        type: 'number' },
  { key: 'gmv',            label: 'GMV',             type: 'currency' },
  { key: 'avg_discount',   label: 'Avg Discount',    type: 'currency' },
  { key: 'avg_aov',        label: 'Avg AOV',         type: 'currency' },
  { key: 'avg_receivable', label: 'Avg Receivable',  type: 'currency' },
]

// ── Date helpers ──────────────────────────────────────────
function addDays(d, n)   { const x = new Date(d+'T00:00:00'); x.setDate(x.getDate()+n); return x.toISOString().split('T')[0] }
function addWeeks(d, n)  { return addDays(d, n*7) }
function addMonths(d, n) { const x = new Date(d+'T00:00:00'); x.setMonth(x.getMonth()+n); return x.toISOString().split('T')[0] }
function today()         { return new Date().toISOString().split('T')[0] }
function getMaxTo(f, g)  { if (!f) return ''; return g==='daily'?addDays(f,14):g==='weekly'?addWeeks(f,14):addMonths(f,14) }

const TABS = [
  { id: 'brand_details', label: 'Brand details' },
  { id: 'sales',         label: 'Sales' },
  { id: 'discounts',     label: 'Discounts' },
  { id: 'ads',           label: 'Ads' },
  { id: 'operations',    label: 'Operations' },
  { id: 'menu',          label: 'Menu' },
]

const METRIC_COL_W = 170
const DATA_COL_W   = 120
const SUB_COL_W    = 110

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function Home() {
  const [brands, setBrands]         = useState([])
  const [selectedBrand, setBrand]   = useState('all')
  const [granularity, setGranularity] = useState('monthly')
  const [dateFrom, setDateFrom]     = useState('2026-01-01')
  const [dateTo,   setDateTo]       = useState('2026-06-30')
  const [periodData, setPeriodData] = useState([])
  const [menuData, setMenuData]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [activeTab, setActiveTab]   = useState('brand_details')
  const [searched, setSearched]     = useState(false)

  useEffect(() => { fetchBrands().then(b => setBrands(b)) }, [])

  useEffect(() => {
    const maxTo = getMaxTo(dateFrom, granularity)
    if (dateTo > maxTo) setDateTo(maxTo)
  }, [granularity])

  const handleFromChange = (val) => { setDateFrom(val); const m=getMaxTo(val,granularity); if(dateTo>m||dateTo<val) setDateTo(m); setSearched(false) }
  const handleToChange   = (val) => { const m=getMaxTo(dateFrom,granularity); setDateTo(val>m?m:val<dateFrom?dateFrom:val); setSearched(false) }

  const handleSearch = async () => {
    if (!dateFrom || !dateTo) return
    setLoading(true); setSearched(true)
    try {
      const [pd, md] = await Promise.all([
        fetchPeriodData(selectedBrand, dateFrom, dateTo, granularity),
        fetchMenuData(selectedBrand, dateFrom, dateTo),
      ])
      setPeriodData(pd)
      setMenuData(md)
    } finally { setLoading(false) }
  }

  const limitLabel = granularity==='daily'?'max 15 days':granularity==='weekly'?'max 15 weeks':'max 15 months'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'0 24px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1400, margin:'0 auto' }}>
          <div style={{ padding:'14px 0 0', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>📊</span>
            <span style={{ fontSize:15, fontWeight:600, color:'#111' }}>Zomato Dashboard</span>
            <span style={{ fontSize:12, color:'#9ca3af' }}>Delivery Analytics</span>
          </div>
          <div style={{ display:'flex', gap:0, marginTop:12 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding:'9px 18px', fontSize:13, fontWeight:500, border:'none', background:'transparent', cursor:'pointer',
                color: activeTab===t.id ? '#2563eb' : '#6b7280',
                borderBottom: activeTab===t.id ? '2px solid #2563eb' : '2px solid transparent',
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'10px 24px' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <Lbl>Brand</Lbl>
          <select value={selectedBrand} onChange={e=>{setBrand(e.target.value);setSearched(false)}} style={sel}>
            <option value="all">All Brands</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <Sep/>
          <Lbl>View</Lbl>
          <div style={{ display:'flex', border:'1px solid #d1d5db', borderRadius:6, overflow:'hidden' }}>
            {['daily','weekly','monthly'].map(g => (
              <button key={g} onClick={()=>{setGranularity(g);setSearched(false)}} style={{
                padding:'4px 12px', fontSize:12, fontWeight:500, border:'none', cursor:'pointer',
                background: granularity===g?'#2563eb':'#fff', color: granularity===g?'#fff':'#374151'
              }}>{g.charAt(0).toUpperCase()+g.slice(1)}</button>
            ))}
          </div>
          <Sep/>
          <Lbl>From</Lbl>
          <input type="date" value={dateFrom} max={today()} onChange={e=>handleFromChange(e.target.value)} style={inp}/>
          <Lbl>To</Lbl>
          <input type="date" value={dateTo} min={dateFrom} max={getMaxTo(dateFrom,granularity)} onChange={e=>handleToChange(e.target.value)} style={inp}/>
          <span style={{ fontSize:11, color:'#9ca3af' }}>({limitLabel})</span>
          <Sep/>
          <button onClick={handleSearch} disabled={loading} style={{
            padding:'6px 18px', fontSize:13, fontWeight:500, border:'none', borderRadius:6,
            cursor: loading?'not-allowed':'pointer', background: loading?'#93c5fd':'#2563eb', color:'#fff'
          }}>{loading?'Loading…':'🔍 Search'}</button>
          {searched && !loading && periodData.length>0 && (
            <span style={{ fontSize:12, color:'#10b981' }}>✓ {periodData.length} {granularity==='daily'?'days':granularity==='weekly'?'weeks':'months'}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth:1400, margin:'20px auto', padding:'0 24px' }}>
        {activeTab==='brand_details' && <BrandDetailsTab periodData={periodData} searched={searched} loading={loading} />}
        {activeTab==='sales'         && <SalesTab periodData={periodData} searched={searched} loading={loading} />}
        {activeTab==='discounts'     && <DiscountsTab periodData={periodData} searched={searched} loading={loading} />}
        {activeTab==='ads'           && <AdsTab periodData={periodData} searched={searched} loading={loading} />}
        {activeTab==='operations'    && <OperationsTab periodData={periodData} searched={searched} loading={loading} />}
        {activeTab==='menu'          && <MenuTab menuData={menuData} searched={searched} loading={loading} />}
      </div>
    </div>
  )
}

// Small reusable bits
const Lbl = ({children}) => <label style={{ fontSize:12, color:'#6b7280', fontWeight:500 }}>{children}</label>
const Sep = () => <div style={{ width:1, height:24, background:'#e5e7eb' }}/>
const sel = { fontSize:13, padding:'5px 8px', border:'1px solid #d1d5db', borderRadius:6, background:'#fff', color:'#111' }
const inp = { fontSize:12, padding:'4px 8px', border:'1px solid #d1d5db', borderRadius:6 }

function EmptyState({ searched, loading }) {
  if (!searched) return <Box>🔍<br/>Select filters and click <strong>Search</strong></Box>
  if (loading)   return <Box>Loading…</Box>
  return <Box>No data for selected period</Box>
}
const Box = ({children}) => <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:48, textAlign:'center', color:'#6b7280', fontSize:14 }} >{children}</div>

// ═══════════════════════════════════════════════════════════
// BRAND DETAILS TAB
// ═══════════════════════════════════════════════════════════
function BrandDetailsTab({ periodData, searched, loading }) {
  if (!searched || loading || !periodData.length) return <EmptyState searched={searched} loading={loading} />
  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
      <div style={{ display:'flex', overflow:'hidden' }}>
        <div style={{ minWidth:METRIC_COL_W, maxWidth:METRIC_COL_W, flexShrink:0, borderRight:'2px solid #e5e7eb', zIndex:10, background:'#fff' }}>
          <div style={{ height:52, display:'flex', alignItems:'center', padding:'0 14px', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Metric</span>
          </div>
          {BD_SECTIONS.map((sec,si) => (
            <div key={si}>
              <div style={{ padding:'7px 14px', background:'#eef2ff', borderBottom:'1px solid #e5e7eb' }}>
                <span style={{ fontSize:10, fontWeight:700, color:'#2563eb', textTransform:'uppercase', letterSpacing:'0.07em' }}>{sec.label}</span>
              </div>
              {sec.rows.map((r,ri) => (
                <div key={ri} style={{ height:40, display:'flex', alignItems:'center', padding:'0 14px', borderBottom:'1px solid #f3f4f6' }}>
                  <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>{r.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ overflowX:'auto', flex:1 }}>
          <div style={{ minWidth:DATA_COL_W*periodData.length }}>
            <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb', height:52 }}>
              {periodData.map((p,i) => (
                <div key={i} style={{ minWidth:DATA_COL_W, width:DATA_COL_W, borderRight:'1px solid #f3f4f6', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4px 8px' }}>
                  {p.label.split('\n').map((l,li) => (
                    <span key={li} style={{ fontSize:li===0?12:10, fontWeight:li===0?600:400, color:li===0?'#111':'#6b7280', textAlign:'center', lineHeight:1.3 }}>{l}</span>
                  ))}
                </div>
              ))}
            </div>
            {BD_SECTIONS.map((sec,si) => (
              <div key={si}>
                <div style={{ display:'flex', background:'#eef2ff', borderBottom:'1px solid #e5e7eb' }}>
                  {periodData.map((_,i) => <div key={i} style={{ minWidth:DATA_COL_W, width:DATA_COL_W, height:30, borderRight:'1px solid #e5e7eb' }}/>)}
                </div>
                {sec.rows.map((r,ri) => (
                  <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6' }}>
                    {periodData.map((p,i) => (
                      <div key={i} style={{ minWidth:DATA_COL_W, width:DATA_COL_W, height:40, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #f3f4f6', fontSize:13, fontWeight:600, color:'#111' }}>
                        {fmt(p.data?.[r.key], r.type)}
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
  )
}

// ═══════════════════════════════════════════════════════════
// SALES TAB — with real data
// ═══════════════════════════════════════════════════════════
function getSalesValue(platformData, section, slot) {
  if (!platformData) return null
  const slotKey = slot.key
  if (section.key === 'orders')    return platformData['orders_' + slotKey]
  if (section.key === 'gmv')       return platformData['gmv_' + slotKey]
  if (section.key === 'discounts') return platformData['discount_' + slotKey]
  if (section.key === 'net_sales') {
    const g = platformData['gmv_' + slotKey]
    const d = platformData['discount_' + slotKey]
    return (g != null && d != null) ? g - d : null
  }
  if (section.key === 'aov') {
    const g = platformData['gmv_' + slotKey]
    const d = platformData['discount_' + slotKey]
    const o = platformData['orders_' + slotKey]
    const net = (g != null && d != null) ? g - d : null
    return (net != null && o) ? net / o : null
  }
  return null
}

function SalesTab({ periodData, searched, loading }) {
  if (!searched || loading || !periodData.length) return <EmptyState searched={searched} loading={loading} />

  const CAT_W = 100, SLOT_W = 120
  const PERIOD_W = SUB_COL_W * 3

  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
      <div style={{ display:'flex', overflow:'hidden' }}>
        {/* Frozen left */}
        <div style={{ minWidth:CAT_W+SLOT_W, maxWidth:CAT_W+SLOT_W, flexShrink:0, borderRight:'2px solid #e5e7eb', background:'#fff', zIndex:10 }}>
          <div style={{ display:'flex', height:68, background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
            <div style={{ width:CAT_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb' }}>
              <span style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Category</span>
            </div>
            <div style={{ width:SLOT_W, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Time Slot</span>
            </div>
          </div>
          {SALES_SECTIONS.map((sec,si) => (
            <div key={si} style={{ borderTop:'2px solid #d1d5db' }}>
              <div style={{ display:'flex', position:'relative' }}>
                <div style={{ width:CAT_W, position:'absolute', top:0, left:0, height:38*SLOTS.length, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb', background:'#eef2ff', zIndex:1 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#2563eb', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'center', padding:'0 4px' }}>{sec.label}</span>
                </div>
                <div style={{ marginLeft:CAT_W, flex:1 }}>
                  {SLOTS.map((slot,sli) => (
                    <div key={sli} style={{ display:'flex', height:38, borderBottom:sli<SLOTS.length-1?'1px solid #f3f4f6':'none' }}>
                      <div style={{ width:SLOT_W, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 10px' }}>
                        <span style={{ fontSize:12, fontWeight:500, color:'#374151' }}>{slot.label}</span>
                        <span style={{ fontSize:10, color:'#9ca3af' }}>{slot.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {/* Ads section */}
          <div style={{ borderTop:'2px solid #e5e7eb' }}>
            {ADS_ROWS.map((r,ri) => (
              <div key={ri} style={{ display:'flex', height:38, borderBottom:'1px solid #f3f4f6' }}>
                {ri===0 ? (
                  <div style={{ width:CAT_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb', background:'#fff7ed' }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#ea580c', textTransform:'uppercase', letterSpacing:'0.06em' }}>Ads</span>
                  </div>
                ) : <div style={{ width:CAT_W, borderRight:'1px solid #e5e7eb', background:'#fff7ed' }}/>}
                <div style={{ width:SLOT_W, display:'flex', alignItems:'center', padding:'0 10px' }}>
                  <span style={{ fontSize:12, fontWeight:500, color:'#374151' }}>{r.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable data */}
        <div style={{ overflowX:'auto', flex:1 }}>
          <div style={{ minWidth:PERIOD_W*periodData.length }}>
            {/* Period + platform headers */}
            <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
              {periodData.map((p,pi) => (
                <div key={pi} style={{ minWidth:PERIOD_W, width:PERIOD_W, borderRight:'1px solid #d1d5db' }}>
                  <div style={{ height:34, display:'flex', alignItems:'center', justifyContent:'center', borderBottom:'1px solid #e5e7eb' }}>
                    {p.label.split('\n').map((l,li) => (
                      <span key={li} style={{ fontSize:li===0?12:10, fontWeight:li===0?600:400, color:li===0?'#111':'#6b7280', marginRight:li===0?6:0 }}>{l}</span>
                    ))}
                  </div>
                  <div style={{ display:'flex', height:34 }}>
                    {PLATFORMS.map((pl,pli) => (
                      <div key={pli} style={{ width:SUB_COL_W, minWidth:SUB_COL_W, display:'flex', alignItems:'center', justifyContent:'center',
                        borderRight:pli<2?'1px solid #e5e7eb':'none', fontSize:11, fontWeight:600, color:PLAT_COLORS[pl],
                        background:pl==='combined'?'#f0f4ff':'#f9fafb' }}>{PLAT_LABELS[pl]}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sales data rows */}
            {SALES_SECTIONS.map((sec,si) => (
              <div key={si} style={{ borderTop:'2px solid #d1d5db' }}>
                {SLOTS.map((slot,sli) => (
                  <div key={sli} style={{ display:'flex', borderBottom:sli<SLOTS.length-1?'1px solid #f3f4f6':'none', height:38 }}>
                    {periodData.map((p,pi) => (
                      <div key={pi} style={{ minWidth:PERIOD_W, width:PERIOD_W, display:'flex', borderRight:'1px solid #d1d5db' }}>
                        {PLATFORMS.map((pl,pli) => (
                          <div key={pli} style={{ width:SUB_COL_W, minWidth:SUB_COL_W, display:'flex', alignItems:'center', justifyContent:'center',
                            borderRight:pli<2?'1px solid #f3f4f6':'none', fontSize:12, color:'#374151',
                            background:pl==='combined'?'#f8faff':'#fff' }}>
                            {fmt(getSalesValue(p[pl], sec, slot), sec.type)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {/* Ads data rows */}
            <div style={{ borderTop:'2px solid #e5e7eb' }}>
              {ADS_ROWS.map((r,ri) => (
                <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:38 }}>
                  {periodData.map((p,pi) => (
                    <div key={pi} style={{ minWidth:PERIOD_W, width:PERIOD_W, display:'flex', borderRight:'1px solid #d1d5db' }}>
                      {PLATFORMS.map((pl,pli) => (
                        <div key={pli} style={{ width:SUB_COL_W, minWidth:SUB_COL_W, display:'flex', alignItems:'center', justifyContent:'center',
                          borderRight:pli<2?'1px solid #f3f4f6':'none', fontSize:12, color:'#374151',
                          background:pl==='combined'?'#fff9f5':'#fff' }}>
                          {fmt(p[pl]?.[r.key], r.type)}
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
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// DISCOUNTS TAB — with real aggregated data
// ═══════════════════════════════════════════════════════════
function DiscountsTab({ periodData, searched, loading }) {
  if (!searched || loading || !periodData.length) return <EmptyState searched={searched} loading={loading} />

  // Aggregate all periods for discounts overview
  const agg = (platform) => {
    let totals = { orders: 0, gmv: 0, resDiscount: 0, customerDiscount: 0, itemsSold: 0 }
    periodData.forEach(p => {
      const d = p[platform]
      if (!d) return
      totals.orders += d.orders || 0
      totals.gmv += d.gmv || 0
      totals.resDiscount += d.resDiscount || 0
      totals.customerDiscount += d.customerDiscount || 0
      totals.itemsSold += d.itemsSold || 0
    })
    totals.res_disc_pct = totals.gmv ? (totals.resDiscount / totals.gmv) * 100 : null
    totals.plat_disc_pct = totals.gmv ? (totals.customerDiscount / totals.gmv) * 100 : null
    totals.aov = totals.orders ? Math.round((totals.gmv - totals.resDiscount - totals.customerDiscount) / totals.orders) : null
    return totals
  }

  const zData = agg('zomato')
  const sData = agg('swiggy')
  const NAME_W = 160, COL_W = 130

  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <div style={{ minWidth: NAME_W + COL_W * 16 }}>
          {/* Platform headers */}
          <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb' }}>
            <div style={{ minWidth:NAME_W, width:NAME_W, height:34, borderRight:'2px solid #e5e7eb' }}/>
            <div style={{ minWidth:COL_W*8, width:COL_W*8, display:'flex', alignItems:'center', justifyContent:'center', height:34, borderRight:'2px solid #d1d5db', background:'#fff1f2' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#dc2626' }}>ZOMATO</span>
            </div>
            <div style={{ minWidth:COL_W*8, width:COL_W*8, display:'flex', alignItems:'center', justifyContent:'center', height:34, background:'#fff7ed' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#ea580c' }}>SWIGGY</span>
            </div>
          </div>
          {/* Column headers */}
          <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' }}>
            <div style={{ minWidth:NAME_W, width:NAME_W, height:34, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'2px solid #e5e7eb' }}>
              <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Discount Name</span>
            </div>
            {ZOMATO_DISCOUNT_COLS.map((c,i) => (
              <div key={i} style={{ minWidth:COL_W, width:COL_W, height:34, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i===7?'2px solid #d1d5db':'1px solid #e5e7eb', padding:'0 6px', textAlign:'center', fontSize:11, fontWeight:600, color:'#374151' }}>{c.label}</div>
            ))}
            {SWIGGY_DISCOUNT_COLS.map((c,i) => (
              <div key={i} style={{ minWidth:COL_W, width:COL_W, height:34, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i<7?'1px solid #e5e7eb':'none', padding:'0 6px', textAlign:'center', fontSize:11, fontWeight:600, color:'#374151' }}>{c.label}</div>
            ))}
          </div>
          {/* Summary row */}
          <div style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:44 }}>
            <div style={{ minWidth:NAME_W, width:NAME_W, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb', fontWeight:500, fontSize:13 }}>Total (all periods)</div>
            {ZOMATO_DISCOUNT_COLS.map((c,i) => (
              <div key={i} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i===7?'2px solid #d1d5db':'1px solid #f3f4f6', fontSize:13, fontWeight:600, color:'#111' }}>{fmt(zData[c.key], c.type)}</div>
            ))}
            {SWIGGY_DISCOUNT_COLS.map((c,i) => (
              <div key={i} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i<7?'1px solid #f3f4f6':'none', fontSize:13, fontWeight:600, color:'#111', background:'#fffbf7' }}>{fmt(sData[c.key], c.type)}</div>
            ))}
          </div>
          {/* Placeholder rows */}
          {Array.from({length:4}).map((_,ri) => (
            <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:44 }}>
              <div style={{ minWidth:NAME_W, width:NAME_W, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb', fontSize:13, color:'#9ca3af' }}>—</div>
              {ZOMATO_DISCOUNT_COLS.map((c,i) => (
                <div key={i} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i===7?'2px solid #d1d5db':'1px solid #f3f4f6', fontSize:13, color:'#9ca3af' }}>—</div>
              ))}
              {SWIGGY_DISCOUNT_COLS.map((c,i) => (
                <div key={i} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i<7?'1px solid #f3f4f6':'none', fontSize:13, color:'#9ca3af', background:'#fffbf7' }}>—</div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'8px 14px', borderTop:'1px solid #f3f4f6', fontSize:11, color:'#9ca3af' }}>
        * Discount names TBD by client. First row shows totals across selected date range.
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// ADS TAB — aggregated per platform
// ═══════════════════════════════════════════════════════════
function AdsTab({ periodData, searched, loading }) {
  if (!searched || loading || !periodData.length) return <EmptyState searched={searched} loading={loading} />

  const agg = (platform) => {
    let t = {}
    ADS_TAB_COLS.forEach(c => t[c.key] = 0)
    let count = 0
    periodData.forEach(p => {
      const d = p[platform]; if (!d) return; count++
      ADS_TAB_COLS.forEach(c => { if (d[c.key] != null) t[c.key] += d[c.key] })
    })
    if (t.adsSpend && t.adsSales) t.adsRoi = Math.round((t.adsSales / t.adsSpend) * 10) / 10
    return t
  }

  const platforms = [
    { key: 'zomato', label: 'ZOMATO', color: '#dc2626', bg: '#fff1f2', data: agg('zomato') },
    { key: 'swiggy', label: 'SWIGGY', color: '#ea580c', bg: '#fff7ed', data: agg('swiggy') },
  ]
  const COL_W = 140, NAME_W = 160

  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <div style={{ minWidth:NAME_W + COL_W*ADS_TAB_COLS.length }}>
          <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
            <div style={{ minWidth:NAME_W, width:NAME_W, height:44, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'2px solid #e5e7eb' }}>
              <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Platform</span>
            </div>
            {ADS_TAB_COLS.map((c,i) => (
              <div key={i} style={{ minWidth:COL_W, width:COL_W, height:44, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb', fontSize:11, fontWeight:600, color:'#374151', padding:'0 8px', textAlign:'center' }}>{c.label}</div>
            ))}
          </div>
          {platforms.map((pl,pi) => (
            <div key={pi} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:48, borderTop:pi>0?'2px solid #d1d5db':'none' }}>
              <div style={{ minWidth:NAME_W, width:NAME_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'2px solid #e5e7eb', background:pl.bg }}>
                <span style={{ fontSize:12, fontWeight:700, color:pl.color }}>{pl.label}</span>
              </div>
              {ADS_TAB_COLS.map((c,i) => (
                <div key={i} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #f3f4f6', fontSize:13, fontWeight:600, color:'#111' }}>{fmt(pl.data[c.key], c.type)}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'8px 14px', borderTop:'1px solid #f3f4f6', fontSize:11, color:'#9ca3af' }}>
        * Campaign-level data (Campaign ID, Type, CPC, Clicks) needs separate campaign CSV.
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// OPERATIONS TAB — with real data
// ═══════════════════════════════════════════════════════════
function OperationsTab({ periodData, searched, loading }) {
  if (!searched || loading || !periodData.length) return <EmptyState searched={searched} loading={loading} />

  const METRIC_W = 120, SUB_W = 110
  const PERIOD_GRP = 3 * SUB_W

  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
      <div style={{ display:'flex', overflow:'hidden' }}>
        <div style={{ minWidth:METRIC_W, maxWidth:METRIC_W, flexShrink:0, borderRight:'2px solid #e5e7eb', background:'#fff', zIndex:10 }}>
          <div style={{ height:68, display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Metric</span>
          </div>
          {OPS_METRICS.map((m,mi) => (
            <div key={mi} style={{ borderTop:mi>0?'2px solid #d1d5db':'none' }}>
              <div style={{ height:44, display:'flex', alignItems:'center', justifyContent:'center', background:'#eef2ff', borderBottom:'1px solid #e5e7eb' }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#2563eb', textTransform:'uppercase' }}>{m.label}</span>
              </div>
              {OPS_DATA_ROWS.map((r,ri) => (
                <div key={ri} style={{ height:38, display:'flex', alignItems:'center', padding:'0 14px', borderBottom:'1px solid #f3f4f6' }}>
                  <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>{r.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ overflowX:'auto', flex:1 }}>
          <div style={{ minWidth:PERIOD_GRP*periodData.length }}>
            <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
              {periodData.map((p,pi) => (
                <div key={pi} style={{ minWidth:PERIOD_GRP, width:PERIOD_GRP, borderRight:'1px solid #d1d5db' }}>
                  <div style={{ height:34, display:'flex', alignItems:'center', justifyContent:'center', borderBottom:'1px solid #e5e7eb' }}>
                    {p.label.split('\n').map((l,li) => (
                      <span key={li} style={{ fontSize:li===0?12:10, fontWeight:li===0?600:400, color:li===0?'#111':'#6b7280', marginRight:li===0?6:0 }}>{l}</span>
                    ))}
                  </div>
                  <div style={{ display:'flex', height:34 }}>
                    {PLATFORMS.map((pl,pli) => (
                      <div key={pli} style={{ width:SUB_W, minWidth:SUB_W, display:'flex', alignItems:'center', justifyContent:'center',
                        borderRight:pli<2?'1px solid #e5e7eb':'none', fontSize:11, fontWeight:600,
                        color:PLAT_COLORS[pl], background:pl==='combined'?'#f0f4ff':'#f9fafb' }}>{PLAT_LABELS[pl]}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {OPS_METRICS.map((m,mi) => (
              <div key={mi} style={{ borderTop:mi>0?'2px solid #d1d5db':'none' }}>
                <div style={{ display:'flex', background:'#eef2ff', borderBottom:'1px solid #e5e7eb', height:44 }}>
                  {periodData.map((_,pi) => (
                    <div key={pi} style={{ minWidth:PERIOD_GRP, width:PERIOD_GRP, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #d1d5db' }}>
                      {PLATFORMS.map((pl,pli) => (
                        <div key={pli} style={{ width:SUB_W, minWidth:SUB_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:pli<2?'1px solid #e5e7eb':'none', fontSize:13, fontWeight:600, color:'#2563eb' }}>
                          {fmt(periodData[pi]?.[pl]?.[m.field], m.type)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {OPS_DATA_ROWS.map((r,ri) => (
                  <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:38 }}>
                    {periodData.map((p,pi) => (
                      <div key={pi} style={{ minWidth:PERIOD_GRP, width:PERIOD_GRP, display:'flex', borderRight:'1px solid #d1d5db' }}>
                        {PLATFORMS.map((pl,pli) => (
                          <div key={pli} style={{ width:SUB_W, minWidth:SUB_W, display:'flex', alignItems:'center', justifyContent:'center',
                            borderRight:pli<2?'1px solid #f3f4f6':'none', fontSize:12, color:'#374151',
                            background:pl==='combined'?'#f8faff':'#fff' }}>
                            {r.type === 'text' ? (p[pl]?.[r.field] || '—') : fmt(p[pl]?.[r.field], r.type)}
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
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MENU TAB — with real data
// ═══════════════════════════════════════════════════════════
function MenuTab({ menuData, searched, loading }) {
  if (!searched || loading || !menuData) return <EmptyState searched={searched} loading={loading} />

  const PLAT_W = 140, COL_W = 120, ITEM_W = 200
  const menuPlatforms = [
    { key: 'zomato',   label: 'Zomato',   color: '#dc2626', bg: '#fff1f2' },
    { key: 'swiggy',   label: 'Swiggy',   color: '#ea580c', bg: '#fff7ed' },
    { key: 'combined', label: 'Overall',  color: '#2563eb', bg: '#f8faff' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Top 10 Items */}
      <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#111' }}>Top 10 Items</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <div style={{ minWidth:ITEM_W + COL_W*MENU_COLS.length }}>
            <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
              <div style={{ minWidth:ITEM_W, width:ITEM_W, height:44, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb' }}>
                <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Item Name</span>
              </div>
              {MENU_COLS.map((c,i) => (
                <div key={i} style={{ minWidth:COL_W, width:COL_W, height:44, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb', fontSize:11, fontWeight:600, color:'#374151', textAlign:'center', padding:'0 6px' }}>{c.label}</div>
              ))}
            </div>
            {menuPlatforms.map((pl,pi) => (
              <div key={pi} style={{ borderTop:pi>0?'2px solid #d1d5db':'none' }}>
                <div style={{ padding:'6px 14px', background:pl.bg, borderBottom:'1px solid #e5e7eb' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:pl.color, textTransform:'uppercase' }}>{pl.label}</span>
                </div>
                {(menuData[pl.key] || []).slice(0, 10).map((item, ri) => (
                  <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:36 }}>
                    <div style={{ minWidth:ITEM_W, width:ITEM_W, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb', fontSize:12, fontWeight:500, color:'#374151', background:ri%2===0?'#fff':'#fafafa' }}>
                      {item.item_name || '—'}
                    </div>
                    {MENU_COLS.map((c,ci) => (
                      <div key={ci} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #f3f4f6', fontSize:12, color:'#374151', background:ri%2===0?'#fff':'#fafafa' }}>
                        {fmt(item[c.key], c.type)}
                      </div>
                    ))}
                  </div>
                ))}
                {(menuData[pl.key] || []).length === 0 && (
                  <div style={{ padding:'12px 14px', fontSize:12, color:'#9ca3af', textAlign:'center' }}>No items found</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full menu list */}
      <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#111' }}>All Menu Items (Combined)</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <div style={{ minWidth:ITEM_W + COL_W*MENU_COLS.length }}>
            <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
              <div style={{ minWidth:ITEM_W, width:ITEM_W, height:44, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb' }}>
                <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Item Name</span>
              </div>
              {MENU_COLS.map((c,i) => (
                <div key={i} style={{ minWidth:COL_W, width:COL_W, height:44, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb', fontSize:11, fontWeight:600, color:'#374151', textAlign:'center', padding:'0 6px' }}>{c.label}</div>
              ))}
            </div>
            {(menuData.combined || []).map((item, ri) => (
              <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:36 }}>
                <div style={{ minWidth:ITEM_W, width:ITEM_W, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb', fontSize:12, fontWeight:500, color:'#374151', background:ri%2===0?'#fff':'#fafafa' }}>
                  {item.item_name || '—'}
                </div>
                {MENU_COLS.map((c,ci) => (
                  <div key={ci} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #f3f4f6', fontSize:12, color:'#374151', background:ri%2===0?'#fff':'#fafafa' }}>
                    {fmt(item[c.key], c.type)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
