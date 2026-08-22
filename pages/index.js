import { useState, useEffect, useRef } from 'react'
import { fetchPeriodData, fetchBrands, fetchMenuData } from '../lib/data'

const fmt = (v, type = 'number') => {
  if (v === null || v === undefined) return '—'
  if (type === 'currency') return '₹' + Math.round(v).toLocaleString('en-IN')
  if (type === 'pct')      return (Math.round(v * 10) / 10) + '%'
  if (type === 'decimal')  return (Math.round(v * 10) / 10).toLocaleString('en-IN')
  return Math.round(v).toLocaleString('en-IN')
}

const fmtRaw = (v) => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Math.round(v * 100) / 100
  return v
}

// ── Brand Details rows ────────────────────────────────────
const BD_SECTIONS = [
  { label: 'Sales', rows: [
    { key: 'gmv', label: 'GMV', type: 'currency' },
    { key: 'orders', label: 'Orders', type: 'number' },
    { key: 'cancelled', label: 'Cancelled', type: 'number' },
    { key: 'delivered', label: 'Delivered', type: 'number' },
    { key: 'aov', label: 'AOV', type: 'currency' },
    { key: 'itemsSold', label: 'Item Sold', type: 'number' },
  ]},
  { label: 'Discounts', rows: [
    { key: 'discountRs', label: 'Discount', type: 'currency' },
    { key: 'grossSalesOffers', label: 'Gross from Offers', type: 'currency' },
  ]},
  { label: 'Ads', rows: [
    { key: 'adsSpend', label: 'Ads Spend', type: 'currency' },
    { key: 'adsCtr', label: 'Ads CTR', type: 'pct' },
    { key: 'adsRoi', label: 'Ads ROI', type: 'decimal' },
  ]},
  { label: 'Funnel', rows: [
    { key: 'impressions', label: 'Impression', type: 'number' },
    { key: 'menuOpens', label: 'Menu Click', type: 'number' },
    { key: 'cartBuilds', label: 'Cart Make', type: 'number' },
    { key: 'placedOrders', label: 'Order Places', type: 'number' },
  ]},
  { label: 'Operations', rows: [
    { key: 'avgKpt', label: 'Avg KPT', type: 'decimal' },
    { key: 'onlinePct', label: 'Online %', type: 'pct' },
    { key: 'avgRating', label: 'Avg Rating', type: 'decimal' },
  ]},
  { label: 'P&L', rows: [
    { key: 'netPayout', label: 'Received', type: 'currency' },
    { key: 'prepCost', label: 'Prep Cost', type: 'currency' },
    { key: 'pnlRs', label: 'P&L (₹)', type: 'currency' },
    { key: 'pnlPct', label: 'P&L (%)', type: 'pct' },
  ]},
]

// ── Sales tab config ──────────────────────────────────────
const SLOTS = [
  { key: 'breakfast', label: 'Breakfast', time: '7–11 AM' },
  { key: 'lunch', label: 'Lunch', time: '11 AM–4 PM' },
  { key: 'snacks', label: 'Snacks', time: '4–7 PM' },
  { key: 'dinner', label: 'Dinner', time: '7 PM–12 AM' },
  { key: 'late_night', label: 'Late Night', time: '12–7 AM' },
]
const SALES_SECTIONS = [
  { key: 'orders', label: 'Orders', type: 'number', field: 'orders_' },
  { key: 'gmv', label: 'GMV', type: 'currency', field: 'gmv_' },
  { key: 'discounts', label: 'Discounts', type: 'currency', field: 'discount_' },
  { key: 'net_sales', label: 'Net Sales', type: 'currency', field: null },
  { key: 'aov', label: 'AOV', type: 'currency', field: null },
]
const SALES_ADS_ROWS = [
  { key: 'adsSpend', label: 'Spend', type: 'currency' },
  { key: 'adsRoi', label: 'ROI', type: 'decimal' },
  { key: 'organicSale', label: 'Organic Sale', type: 'currency' },
  { key: 'organicPct', label: 'Organic Sale%', type: 'pct' },
  { key: 'adsSales', label: 'Ads Sale', type: 'currency' },
  { key: 'adsSalePct', label: 'Ads Sale%', type: 'pct' },
]

const ALL_PLATFORMS = ['swiggy', 'zomato', 'combined']
const PLAT_LABELS = { swiggy: 'Swiggy', zomato: 'Zomato', combined: 'Combined' }
const PLAT_COLORS = { swiggy: '#ea580c', zomato: '#dc2626', combined: '#2563eb' }

// ── Discounts tab config ──────────────────────────────────
const ZOMATO_DISC_COLS = [
  { key: 'orders', label: 'Orders', type: 'number' },
  { key: 'gmv', label: 'GMV', type: 'currency' },
  { key: 'resDiscount', label: 'Res Discount (Rs)', type: 'currency' },
  { key: 'customerDiscount', label: 'Customer Disc (Rs)', type: 'currency' },
  { key: 'res_disc_pct', label: 'Res Discount %', type: 'pct' },
  { key: 'plat_disc_pct', label: 'Zomato Discount %', type: 'pct' },
  { key: 'aov', label: 'Net AOV', type: 'currency' },
  { key: 'itemsSold', label: 'Item Sold', type: 'number' },
]
const SWIGGY_DISC_COLS = [
  { key: 'orders', label: 'Orders', type: 'number' },
  { key: 'gmv', label: 'GMV', type: 'currency' },
  { key: 'resDiscount', label: 'Res Discount (Rs)', type: 'currency' },
  { key: 'customerDiscount', label: 'Customer Disc (Rs)', type: 'currency' },
  { key: 'res_disc_pct', label: 'Res Discount %', type: 'pct' },
  { key: 'plat_disc_pct', label: 'Swiggy Discount %', type: 'pct' },
  { key: 'aov', label: 'Net AOV', type: 'currency' },
  { key: 'itemsSold', label: 'Item Sold', type: 'number' },
]

// ── Ops tab config ────────────────────────────────────────
const OPS_METRICS = [
  { key: 'kpt', label: 'KPT', field: 'avgKpt', type: 'decimal' },
  { key: 'ratings', label: 'Ratings', field: 'avgRating', type: 'decimal' },
]
const OPS_DATA_ROWS = [
  { key: 'delivered', label: 'Delivered', field: 'delivered', type: 'number' },
  { key: 'cancelled', label: 'Cancelled', field: 'cancelled', type: 'number' },
  { key: 'gmv', label: 'GMV', field: 'gmv', type: 'currency' },
  { key: 'discount', label: 'Discount', field: 'discountRs', type: 'currency' },
  { key: 'aov', label: 'AOC', field: 'aov', type: 'currency' },
]

// ── Ads tab config ────────────────────────────────────────
const ADS_TAB_COLS = [
  { key: 'adsSpend', label: 'Ad Spend (Rs)', type: 'currency' },
  { key: 'adsSales', label: 'Ad Sales (Rs)', type: 'currency' },
  { key: 'adsOrders', label: 'Ad Orders', type: 'number' },
  { key: 'adsRoi', label: 'ROI', type: 'decimal' },
  { key: 'impressions', label: 'Ad Impressions', type: 'number' },
]

// ── Menu tab config ───────────────────────────────────────
const MENU_COLS = [
  { key: 'item_ratings', label: 'Rating', type: 'decimal' },
  { key: 'total_orders', label: 'Total Orders', type: 'number' },
  { key: 'qty_sold', label: 'Qty Sold', type: 'number' },
  { key: 'gmv', label: 'GMV', type: 'currency' },
  { key: 'avg_discount', label: 'Avg Discount', type: 'currency' },
  { key: 'avg_aov', label: 'Avg AOV', type: 'currency' },
  { key: 'avg_receivable', label: 'Avg Receivable', type: 'currency' },
]

// ── Helpers ───────────────────────────────────────────────
function addDays(d,n)  { const x=new Date(d+'T00:00:00'); x.setDate(x.getDate()+n); return x.toISOString().split('T')[0] }
function addWeeks(d,n) { return addDays(d,n*7) }
function addMonths(d,n){ const x=new Date(d+'T00:00:00'); x.setMonth(x.getMonth()+n); return x.toISOString().split('T')[0] }
function today()       { return new Date().toISOString().split('T')[0] }
function getMaxTo(f,g) { if(!f)return''; if(g==='daywise')return addMonths(f,12); return g==='daily'?addDays(f,14):g==='weekly'?addWeeks(f,14):addMonths(f,14) }

const TABS = [
  { id:'brand_details', label:'Brand details' },
  { id:'sales', label:'Sales' },
  { id:'discounts', label:'Discounts' },
  { id:'ads', label:'Ads' },
  { id:'operations', label:'Operations' },
  { id:'menu', label:'Menu' },
]
const SUB_COL_W = 110
const METRIC_COL_W = 170

// ── Download CSV ──────────────────────────────────────────
function downloadCSV(periodData, menuData, activeTab, platforms) {
  let rows = []
  const plats = platforms

  if (activeTab === 'brand_details') {
    // Header
    let header = ['Metric']
    periodData.forEach(p => plats.forEach(pl => header.push(`${p.key} ${PLAT_LABELS[pl]}`)))
    rows.push(header)
    BD_SECTIONS.forEach(sec => {
      rows.push([`--- ${sec.label} ---`])
      sec.rows.forEach(r => {
        let row = [r.label]
        periodData.forEach(p => plats.forEach(pl => row.push(fmtRaw(p[pl]?.[r.key]))))
        rows.push(row)
      })
    })
  } else if (activeTab === 'sales') {
    let header = ['Category', 'Time Slot']
    periodData.forEach(p => plats.forEach(pl => header.push(`${p.key} ${PLAT_LABELS[pl]}`)))
    rows.push(header)
    SALES_SECTIONS.forEach(sec => {
      SLOTS.forEach(slot => {
        let row = [sec.label, slot.label]
        periodData.forEach(p => plats.forEach(pl => row.push(fmtRaw(getSalesValue(p[pl], sec, slot)))))
        rows.push(row)
      })
    })
    rows.push(['--- Ads ---'])
    SALES_ADS_ROWS.forEach(r => {
      let row = ['Ads', r.label]
      periodData.forEach(p => plats.forEach(pl => row.push(fmtRaw(p[pl]?.[r.key]))))
      rows.push(row)
    })
  } else if (activeTab === 'discounts') {
    let header = ['Discount Name']
    ZOMATO_DISC_COLS.forEach(c => header.push(`Zomato ${c.label}`))
    SWIGGY_DISC_COLS.forEach(c => header.push(`Swiggy ${c.label}`))
    rows.push(header)
    rows.push(['Total (all periods)', '...data in dashboard...'])
  } else if (activeTab === 'ads') {
    let header = ['Platform']
    ADS_TAB_COLS.forEach(c => header.push(c.label))
    rows.push(header)
    ;['zomato','swiggy'].forEach(pl => {
      let row = [PLAT_LABELS[pl]]
      let totals = {}
      ADS_TAB_COLS.forEach(c => totals[c.key] = 0)
      periodData.forEach(p => { const d=p[pl]; if(d) ADS_TAB_COLS.forEach(c => { if(d[c.key]!=null) totals[c.key]+=d[c.key] }) })
      ADS_TAB_COLS.forEach(c => row.push(fmtRaw(totals[c.key])))
      rows.push(row)
    })
  } else if (activeTab === 'operations') {
    let header = ['Metric', 'Sub-metric']
    periodData.forEach(p => plats.forEach(pl => header.push(`${p.key} ${PLAT_LABELS[pl]}`)))
    rows.push(header)
    OPS_METRICS.forEach(m => {
      rows.push([m.label, m.label, ...periodData.flatMap(p => plats.map(pl => fmtRaw(p[pl]?.[m.field])))])
      OPS_DATA_ROWS.forEach(r => {
        rows.push([m.label, r.label, ...periodData.flatMap(p => plats.map(pl => fmtRaw(p[pl]?.[r.field])))])
      })
    })
  } else if (activeTab === 'menu' && menuData) {
    let header = ['Platform', 'Item Name']
    MENU_COLS.forEach(c => header.push(c.label))
    rows.push(header)
    ;['zomato','swiggy','combined'].forEach(pl => {
      (menuData[pl]||[]).forEach(item => {
        let row = [PLAT_LABELS[pl], item.item_name]
        MENU_COLS.forEach(c => row.push(fmtRaw(item[c.key])))
        rows.push(row)
      })
    })
  }

  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dashboard_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Sales value getter ────────────────────────────────────
function getSalesValue(d, sec, slot) {
  if (!d) return null
  if (sec.key === 'orders') return d['orders_' + slot.key]
  if (sec.key === 'gmv') return d['gmv_' + slot.key]
  if (sec.key === 'discounts') return d['discount_' + slot.key]
  if (sec.key === 'net_sales') {
    const g = d['gmv_' + slot.key], disc = d['discount_' + slot.key]
    return (g != null && disc != null) ? g - disc : null
  }
  if (sec.key === 'aov') {
    const g = d['gmv_' + slot.key], disc = d['discount_' + slot.key], o = d['orders_' + slot.key]
    const net = (g != null && disc != null) ? g - disc : null
    return (net != null && o) ? net / o : null
  }
  return null
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function Home() {
  const [brands, setBrands] = useState([])
  const [selectedBrand, setBrand] = useState('all')
  const [granularity, setGranularity] = useState('monthly')
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo, setDateTo] = useState('2026-06-30')
  const [periodData, setPeriodData] = useState([])
  const [menuData, setMenuData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('brand_details')
  const [searched, setSearched] = useState(false)
  const [combinedOnly, setCombinedOnly] = useState(false)

  const platforms = combinedOnly ? ['combined'] : ALL_PLATFORMS

  useEffect(() => { fetchBrands().then(b => setBrands(b)) }, [])
  useEffect(() => { const m = getMaxTo(dateFrom, granularity); if (dateTo > m) setDateTo(m) }, [granularity])

  const handleFromChange = (v) => { setDateFrom(v); const m=getMaxTo(v,granularity); if(dateTo>m||dateTo<v)setDateTo(m); setSearched(false) }
  const handleToChange = (v) => { const m=getMaxTo(dateFrom,granularity); setDateTo(v>m?m:v<dateFrom?dateFrom:v); setSearched(false) }
  const handleSearch = async () => {
    if(!dateFrom||!dateTo) return; setLoading(true); setSearched(true)
    try { const [pd,md] = await Promise.all([fetchPeriodData(selectedBrand,dateFrom,dateTo,granularity), fetchMenuData(selectedBrand,dateFrom,dateTo)]); setPeriodData(pd); setMenuData(md) }
    finally { setLoading(false) }
  }

  const limitLabel = granularity==='daily'?'max 15 days':granularity==='weekly'?'max 15 weeks':granularity==='daywise'?'groups by weekday':'max 15 months'

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'0 24px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1400, margin:'0 auto' }}>
          <div style={{ padding:'14px 0 0', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>📊</span>
            <span style={{ fontSize:15, fontWeight:600 }}>Zomato Dashboard</span>
            <span style={{ fontSize:12, color:'#9ca3af' }}>Delivery Analytics</span>
          </div>
          <div style={{ display:'flex', gap:0, marginTop:12 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
                padding:'9px 18px', fontSize:13, fontWeight:500, border:'none', background:'transparent', cursor:'pointer',
                color:activeTab===t.id?'#2563eb':'#6b7280', borderBottom:activeTab===t.id?'2px solid #2563eb':'2px solid transparent'
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'10px 24px' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <Lbl>Brand</Lbl>
          <select value={selectedBrand} onChange={e=>{setBrand(e.target.value);setSearched(false)}} style={selS}>
            <option value="all">All Brands</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <Sep/>
          <Lbl>View</Lbl>
          <div style={{ display:'flex', border:'1px solid #d1d5db', borderRadius:6, overflow:'hidden' }}>
            {['daily','weekly','monthly','daywise'].map(g => (
              <button key={g} onClick={()=>{setGranularity(g);setSearched(false)}} style={{
                padding:'4px 12px', fontSize:12, fontWeight:500, border:'none', cursor:'pointer',
                background:granularity===g?'#2563eb':'#fff', color:granularity===g?'#fff':'#374151'
              }}>{g==='daywise'?'Day-wise':g.charAt(0).toUpperCase()+g.slice(1)}</button>
            ))}
          </div>
          <Sep/>
          <Lbl>From</Lbl>
          <input type="date" value={dateFrom} max={today()} onChange={e=>handleFromChange(e.target.value)} style={inpS}/>
          <Lbl>To</Lbl>
          <input type="date" value={dateTo} min={dateFrom} max={getMaxTo(dateFrom,granularity)} onChange={e=>handleToChange(e.target.value)} style={inpS}/>
          <span style={{ fontSize:11, color:'#9ca3af' }}>({limitLabel})</span>
          <Sep/>

          {/* Combined Only Toggle */}
          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, fontWeight:500, color:'#6b7280' }}>
            <input type="checkbox" checked={combinedOnly} onChange={e=>setCombinedOnly(e.target.checked)} style={{ accentColor:'#2563eb' }}/>
            Combined only
          </label>
          <Sep/>

          {/* Search */}
          <button onClick={handleSearch} disabled={loading} style={{
            padding:'6px 18px', fontSize:13, fontWeight:500, border:'none', borderRadius:6,
            cursor:loading?'not-allowed':'pointer', background:loading?'#93c5fd':'#2563eb', color:'#fff'
          }}>{loading?'Loading…':'🔍 Search'}</button>

          {/* Download */}
          {searched && !loading && periodData.length > 0 && (
            <button onClick={()=>downloadCSV(periodData, menuData, activeTab, platforms)} style={{
              padding:'6px 14px', fontSize:12, fontWeight:500, border:'1px solid #d1d5db', borderRadius:6,
              cursor:'pointer', background:'#fff', color:'#374151'
            }}>📥 Download CSV</button>
          )}

          {searched && !loading && periodData.length > 0 && (
            <span style={{ fontSize:12, color:'#10b981' }}>✓ {periodData.length} {granularity==='daily'?'days':granularity==='weekly'?'weeks':granularity==='daywise'?'days':  'months'}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth:1400, margin:'20px auto', padding:'0 24px' }}>
        {activeTab==='brand_details' && <BrandDetailsTab periodData={periodData} searched={searched} loading={loading} platforms={platforms} />}
        {activeTab==='sales' && <SalesTab periodData={periodData} searched={searched} loading={loading} platforms={platforms} />}
        {activeTab==='discounts' && <DiscountsTab periodData={periodData} searched={searched} loading={loading} />}
        {activeTab==='ads' && <AdsTab periodData={periodData} searched={searched} loading={loading} />}
        {activeTab==='operations' && <OperationsTab periodData={periodData} searched={searched} loading={loading} platforms={platforms} />}
        {activeTab==='menu' && <MenuTab menuData={menuData} searched={searched} loading={loading} />}
      </div>
    </div>
  )
}

const Lbl = ({children}) => <label style={{ fontSize:12, color:'#6b7280', fontWeight:500 }}>{children}</label>
const Sep = () => <div style={{ width:1, height:24, background:'#e5e7eb' }}/>
const selS = { fontSize:13, padding:'5px 8px', border:'1px solid #d1d5db', borderRadius:6, background:'#fff', color:'#111' }
const inpS = { fontSize:12, padding:'4px 8px', border:'1px solid #d1d5db', borderRadius:6 }

function EmptyState({ searched, loading }) {
  if (!searched) return <Box>🔍 Select filters and click <strong>Search</strong></Box>
  if (loading) return <Box>Loading…</Box>
  return <Box>No data for selected period</Box>
}
const Box = ({children}) => <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:48, textAlign:'center', color:'#6b7280', fontSize:14 }}>{children}</div>

// ═══════════════════════════════════════════════════════════
// BRAND DETAILS TAB
// ═══════════════════════════════════════════════════════════
function BrandDetailsTab({ periodData, searched, loading, platforms }) {
  if (!searched || loading || !periodData.length) return <EmptyState searched={searched} loading={loading} />
  const PERIOD_W = SUB_COL_W * platforms.length
  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
      <div style={{ display:'flex', overflow:'hidden' }}>
        <div style={{ minWidth:METRIC_COL_W, maxWidth:METRIC_COL_W, flexShrink:0, borderRight:'2px solid #e5e7eb', zIndex:10, background:'#fff' }}>
          <div style={{ height:68, display:'flex', alignItems:'center', padding:'0 14px', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
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
          <div style={{ minWidth:PERIOD_W*periodData.length }}>
            <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
              {periodData.map((p,pi) => (
                <div key={pi} style={{ minWidth:PERIOD_W, width:PERIOD_W, borderRight:'1px solid #d1d5db' }}>
                  <div style={{ height:34, display:'flex', alignItems:'center', justifyContent:'center', borderBottom:'1px solid #e5e7eb' }}>
                    {p.label.split('\n').map((l,li) => <span key={li} style={{ fontSize:li===0?12:10, fontWeight:li===0?600:400, color:li===0?'#111':'#6b7280', marginRight:li===0?6:0 }}>{l}</span>)}
                  </div>
                  <div style={{ display:'flex', height:34 }}>
                    {platforms.map((pl,pli) => (
                      <div key={pli} style={{ width:SUB_COL_W, minWidth:SUB_COL_W, display:'flex', alignItems:'center', justifyContent:'center',
                        borderRight:pli<platforms.length-1?'1px solid #e5e7eb':'none', fontSize:11, fontWeight:600, color:PLAT_COLORS[pl],
                        background:pl==='combined'?'#f0f4ff':'#f9fafb' }}>{PLAT_LABELS[pl]}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {BD_SECTIONS.map((sec,si) => (
              <div key={si}>
                <div style={{ display:'flex', background:'#eef2ff', borderBottom:'1px solid #e5e7eb' }}>
                  {periodData.map((_,i) => <div key={i} style={{ minWidth:PERIOD_W, width:PERIOD_W, height:30, borderRight:'1px solid #e5e7eb' }}/>)}
                </div>
                {sec.rows.map((r,ri) => (
                  <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6' }}>
                    {periodData.map((p,pi) => (
                      <div key={pi} style={{ minWidth:PERIOD_W, width:PERIOD_W, display:'flex', borderRight:'1px solid #d1d5db' }}>
                        {platforms.map((pl,pli) => (
                          <div key={pli} style={{ width:SUB_COL_W, minWidth:SUB_COL_W, height:40, display:'flex', alignItems:'center', justifyContent:'center',
                            borderRight:pli<platforms.length-1?'1px solid #f3f4f6':'none', fontSize:13, fontWeight:600, color:'#111',
                            background:pl==='combined'?'#f8faff':'#fff' }}>{fmt(p[pl]?.[r.key], r.type)}</div>
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
// SALES TAB
// ═══════════════════════════════════════════════════════════
function SalesTab({ periodData, searched, loading, platforms }) {
  if (!searched || loading || !periodData.length) return <EmptyState searched={searched} loading={loading} />
  const CAT_W=100, SLOT_W=120, PERIOD_W = SUB_COL_W * platforms.length

  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
      <div style={{ display:'flex', overflow:'hidden' }}>
        <div style={{ minWidth:CAT_W+SLOT_W, maxWidth:CAT_W+SLOT_W, flexShrink:0, borderRight:'2px solid #e5e7eb', background:'#fff', zIndex:10 }}>
          <div style={{ display:'flex', height:68, background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
            <div style={{ width:CAT_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb' }}><span style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Category</span></div>
            <div style={{ width:SLOT_W, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Time Slot</span></div>
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
          <div style={{ borderTop:'2px solid #e5e7eb' }}>
            {SALES_ADS_ROWS.map((r,ri) => (
              <div key={ri} style={{ display:'flex', height:38, borderBottom:'1px solid #f3f4f6' }}>
                {ri===0 ? <div style={{ width:CAT_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb', background:'#fff7ed' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#ea580c', textTransform:'uppercase' }}>Ads</span></div>
                : <div style={{ width:CAT_W, borderRight:'1px solid #e5e7eb', background:'#fff7ed' }}/>}
                <div style={{ width:SLOT_W, display:'flex', alignItems:'center', padding:'0 10px' }}>
                  <span style={{ fontSize:12, fontWeight:500, color:'#374151' }}>{r.label}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ overflowX:'auto', flex:1 }}>
          <div style={{ minWidth:PERIOD_W*periodData.length }}>
            <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
              {periodData.map((p,pi) => (
                <div key={pi} style={{ minWidth:PERIOD_W, width:PERIOD_W, borderRight:'1px solid #d1d5db' }}>
                  <div style={{ height:34, display:'flex', alignItems:'center', justifyContent:'center', borderBottom:'1px solid #e5e7eb' }}>
                    {p.label.split('\n').map((l,li) => <span key={li} style={{ fontSize:li===0?12:10, fontWeight:li===0?600:400, color:li===0?'#111':'#6b7280', marginRight:li===0?6:0 }}>{l}</span>)}
                  </div>
                  <div style={{ display:'flex', height:34 }}>
                    {platforms.map((pl,pli) => (
                      <div key={pli} style={{ width:SUB_COL_W, minWidth:SUB_COL_W, display:'flex', alignItems:'center', justifyContent:'center',
                        borderRight:pli<platforms.length-1?'1px solid #e5e7eb':'none', fontSize:11, fontWeight:600, color:PLAT_COLORS[pl],
                        background:pl==='combined'?'#f0f4ff':'#f9fafb' }}>{PLAT_LABELS[pl]}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {SALES_SECTIONS.map((sec,si) => (
              <div key={si} style={{ borderTop:'2px solid #d1d5db' }}>
                {SLOTS.map((slot,sli) => (
                  <div key={sli} style={{ display:'flex', borderBottom:sli<SLOTS.length-1?'1px solid #f3f4f6':'none', height:38 }}>
                    {periodData.map((p,pi) => (
                      <div key={pi} style={{ minWidth:PERIOD_W, width:PERIOD_W, display:'flex', borderRight:'1px solid #d1d5db' }}>
                        {platforms.map((pl,pli) => (
                          <div key={pli} style={{ width:SUB_COL_W, minWidth:SUB_COL_W, display:'flex', alignItems:'center', justifyContent:'center',
                            borderRight:pli<platforms.length-1?'1px solid #f3f4f6':'none', fontSize:12, color:'#374151',
                            background:pl==='combined'?'#f8faff':'#fff' }}>{fmt(getSalesValue(p[pl], sec, slot), sec.type)}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
            <div style={{ borderTop:'2px solid #e5e7eb' }}>
              {SALES_ADS_ROWS.map((r,ri) => (
                <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:38 }}>
                  {periodData.map((p,pi) => (
                    <div key={pi} style={{ minWidth:PERIOD_W, width:PERIOD_W, display:'flex', borderRight:'1px solid #d1d5db' }}>
                      {platforms.map((pl,pli) => (
                        <div key={pli} style={{ width:SUB_COL_W, minWidth:SUB_COL_W, display:'flex', alignItems:'center', justifyContent:'center',
                          borderRight:pli<platforms.length-1?'1px solid #f3f4f6':'none', fontSize:12, color:'#374151',
                          background:pl==='combined'?'#fff9f5':'#fff' }}>{fmt(p[pl]?.[r.key], r.type)}</div>
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
// DISCOUNTS TAB
// ═══════════════════════════════════════════════════════════
function DiscountsTab({ periodData, searched, loading }) {
  if (!searched || loading || !periodData.length) return <EmptyState searched={searched} loading={loading} />
  const agg = (pl) => {
    let t = { orders:0, gmv:0, resDiscount:0, customerDiscount:0, itemsSold:0, goldDiscount:0, brandPackDiscount:0 }
    periodData.forEach(p => { const d=p[pl]; if(!d)return; t.orders+=d.orders||0; t.gmv+=d.gmv||0; t.resDiscount+=d.resDiscount||0; t.customerDiscount+=d.customerDiscount||0; t.goldDiscount+=d.goldDiscount||0; t.brandPackDiscount+=d.brandPackDiscount||0; t.itemsSold+=d.itemsSold||0 })
    t.res_disc_pct = t.gmv ? (t.resDiscount/t.gmv)*100 : null
    t.plat_disc_pct = t.gmv ? ((t.goldDiscount+t.brandPackDiscount+t.customerDiscount)/t.gmv)*100 : null
    t.aov = t.orders ? Math.round((t.gmv-t.resDiscount-t.customerDiscount-t.goldDiscount-t.brandPackDiscount)/t.orders) : null
    return t
  }
  const zD=agg('zomato'), sD=agg('swiggy')
  const COL_W=130, NAME_W=160
  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <div style={{ minWidth:NAME_W+COL_W*16 }}>
          <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb' }}>
            <div style={{ minWidth:NAME_W, width:NAME_W, height:34, borderRight:'2px solid #e5e7eb' }}/>
            <div style={{ minWidth:COL_W*8, width:COL_W*8, display:'flex', alignItems:'center', justifyContent:'center', height:34, borderRight:'2px solid #d1d5db', background:'#fff1f2' }}><span style={{ fontSize:12, fontWeight:700, color:'#dc2626' }}>ZOMATO</span></div>
            <div style={{ minWidth:COL_W*8, width:COL_W*8, display:'flex', alignItems:'center', justifyContent:'center', height:34, background:'#fff7ed' }}><span style={{ fontSize:12, fontWeight:700, color:'#ea580c' }}>SWIGGY</span></div>
          </div>
          <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' }}>
            <div style={{ minWidth:NAME_W, width:NAME_W, height:34, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'2px solid #e5e7eb' }}><span style={{ fontSize:12, fontWeight:600 }}>Discount Name</span></div>
            {ZOMATO_DISC_COLS.map((c,i) => <div key={i} style={{ minWidth:COL_W, width:COL_W, height:34, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i===7?'2px solid #d1d5db':'1px solid #e5e7eb', fontSize:11, fontWeight:600, padding:'0 4px', textAlign:'center' }}>{c.label}</div>)}
            {SWIGGY_DISC_COLS.map((c,i) => <div key={i} style={{ minWidth:COL_W, width:COL_W, height:34, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i<7?'1px solid #e5e7eb':'none', fontSize:11, fontWeight:600, padding:'0 4px', textAlign:'center' }}>{c.label}</div>)}
          </div>
          <div style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:44 }}>
            <div style={{ minWidth:NAME_W, width:NAME_W, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb', fontWeight:500, fontSize:13 }}>Total</div>
            {ZOMATO_DISC_COLS.map((c,i) => <div key={i} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i===7?'2px solid #d1d5db':'1px solid #f3f4f6', fontSize:13, fontWeight:600 }}>{fmt(zD[c.key], c.type)}</div>)}
            {SWIGGY_DISC_COLS.map((c,i) => <div key={i} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i<7?'1px solid #f3f4f6':'none', fontSize:13, fontWeight:600, background:'#fffbf7' }}>{fmt(sD[c.key], c.type)}</div>)}
          </div>
          {[1,2,3,4].map(ri => (
            <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:44 }}>
              <div style={{ minWidth:NAME_W, width:NAME_W, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb', color:'#9ca3af', fontSize:13 }}>—</div>
              {ZOMATO_DISC_COLS.map((c,i) => <div key={i} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i===7?'2px solid #d1d5db':'1px solid #f3f4f6', color:'#9ca3af', fontSize:13 }}>—</div>)}
              {SWIGGY_DISC_COLS.map((c,i) => <div key={i} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:i<7?'1px solid #f3f4f6':'none', color:'#9ca3af', fontSize:13, background:'#fffbf7' }}>—</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// ADS TAB
// ═══════════════════════════════════════════════════════════
function AdsTab({ periodData, searched, loading }) {
  if (!searched || loading || !periodData.length) return <EmptyState searched={searched} loading={loading} />
  const agg = (pl) => {
    let t = {}; ADS_TAB_COLS.forEach(c => t[c.key]=0)
    periodData.forEach(p => { const d=p[pl]; if(!d)return; ADS_TAB_COLS.forEach(c => { if(d[c.key]!=null) t[c.key]+=d[c.key] }) })
    if (t.adsSpend && t.adsSales) t.adsRoi = Math.round((t.adsSales/t.adsSpend)*10)/10
    return t
  }
  const pls = [{ key:'zomato', label:'ZOMATO', color:'#dc2626', bg:'#fff1f2', data:agg('zomato') }, { key:'swiggy', label:'SWIGGY', color:'#ea580c', bg:'#fff7ed', data:agg('swiggy') }]
  const COL_W=140, NAME_W=160
  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <div style={{ minWidth:NAME_W+COL_W*ADS_TAB_COLS.length }}>
          <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
            <div style={{ minWidth:NAME_W, width:NAME_W, height:44, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'2px solid #e5e7eb' }}><span style={{ fontSize:12, fontWeight:600 }}>Platform</span></div>
            {ADS_TAB_COLS.map((c,i) => <div key={i} style={{ minWidth:COL_W, width:COL_W, height:44, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb', fontSize:11, fontWeight:600, padding:'0 8px', textAlign:'center' }}>{c.label}</div>)}
          </div>
          {pls.map((pl,pi) => (
            <div key={pi} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:48, borderTop:pi>0?'2px solid #d1d5db':'none' }}>
              <div style={{ minWidth:NAME_W, width:NAME_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'2px solid #e5e7eb', background:pl.bg }}><span style={{ fontSize:12, fontWeight:700, color:pl.color }}>{pl.label}</span></div>
              {ADS_TAB_COLS.map((c,i) => <div key={i} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #f3f4f6', fontSize:13, fontWeight:600 }}>{fmt(pl.data[c.key], c.type)}</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// OPERATIONS TAB
// ═══════════════════════════════════════════════════════════
function OperationsTab({ periodData, searched, loading, platforms }) {
  if (!searched || loading || !periodData.length) return <EmptyState searched={searched} loading={loading} />
  const METRIC_W=120, SUB_W=110, PERIOD_GRP=platforms.length*SUB_W
  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
      <div style={{ display:'flex', overflow:'hidden' }}>
        <div style={{ minWidth:METRIC_W, maxWidth:METRIC_W, flexShrink:0, borderRight:'2px solid #e5e7eb', background:'#fff', zIndex:10 }}>
          <div style={{ height:68, display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}><span style={{ fontSize:12, fontWeight:600 }}>Metric</span></div>
          {OPS_METRICS.map((m,mi) => (
            <div key={mi} style={{ borderTop:mi>0?'2px solid #d1d5db':'none' }}>
              <div style={{ height:44, display:'flex', alignItems:'center', justifyContent:'center', background:'#eef2ff', borderBottom:'1px solid #e5e7eb' }}><span style={{ fontSize:11, fontWeight:700, color:'#2563eb', textTransform:'uppercase' }}>{m.label}</span></div>
              {OPS_DATA_ROWS.map((r,ri) => <div key={ri} style={{ height:38, display:'flex', alignItems:'center', padding:'0 14px', borderBottom:'1px solid #f3f4f6' }}><span style={{ fontSize:12, fontWeight:500 }}>{r.label}</span></div>)}
            </div>
          ))}
        </div>
        <div style={{ overflowX:'auto', flex:1 }}>
          <div style={{ minWidth:PERIOD_GRP*periodData.length }}>
            <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
              {periodData.map((p,pi) => (
                <div key={pi} style={{ minWidth:PERIOD_GRP, width:PERIOD_GRP, borderRight:'1px solid #d1d5db' }}>
                  <div style={{ height:34, display:'flex', alignItems:'center', justifyContent:'center', borderBottom:'1px solid #e5e7eb' }}>
                    {p.label.split('\n').map((l,li) => <span key={li} style={{ fontSize:li===0?12:10, fontWeight:li===0?600:400, color:li===0?'#111':'#6b7280', marginRight:li===0?6:0 }}>{l}</span>)}
                  </div>
                  <div style={{ display:'flex', height:34 }}>
                    {platforms.map((pl,pli) => <div key={pli} style={{ width:SUB_W, minWidth:SUB_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:pli<platforms.length-1?'1px solid #e5e7eb':'none', fontSize:11, fontWeight:600, color:PLAT_COLORS[pl], background:pl==='combined'?'#f0f4ff':'#f9fafb' }}>{PLAT_LABELS[pl]}</div>)}
                  </div>
                </div>
              ))}
            </div>
            {OPS_METRICS.map((m,mi) => (
              <div key={mi} style={{ borderTop:mi>0?'2px solid #d1d5db':'none' }}>
                <div style={{ display:'flex', background:'#eef2ff', borderBottom:'1px solid #e5e7eb', height:44 }}>
                  {periodData.map((p,pi) => (
                    <div key={pi} style={{ minWidth:PERIOD_GRP, width:PERIOD_GRP, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #d1d5db' }}>
                      {platforms.map((pl,pli) => <div key={pli} style={{ width:SUB_W, minWidth:SUB_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:pli<platforms.length-1?'1px solid #e5e7eb':'none', fontSize:13, fontWeight:600, color:'#2563eb' }}>{fmt(p[pl]?.[m.field], m.type)}</div>)}
                    </div>
                  ))}
                </div>
                {OPS_DATA_ROWS.map((r,ri) => (
                  <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:38 }}>
                    {periodData.map((p,pi) => (
                      <div key={pi} style={{ minWidth:PERIOD_GRP, width:PERIOD_GRP, display:'flex', borderRight:'1px solid #d1d5db' }}>
                        {platforms.map((pl,pli) => <div key={pli} style={{ width:SUB_W, minWidth:SUB_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:pli<platforms.length-1?'1px solid #f3f4f6':'none', fontSize:12, background:pl==='combined'?'#f8faff':'#fff' }}>{fmt(p[pl]?.[r.field], r.type)}</div>)}
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
// MENU TAB
// ═══════════════════════════════════════════════════════════
function MenuTab({ menuData, searched, loading }) {
  if (!searched || loading || !menuData) return <EmptyState searched={searched} loading={loading} />
  const COL_W=120, ITEM_W=200
  const menuPlatforms = [
    { key:'zomato', label:'Zomato', color:'#dc2626', bg:'#fff1f2' },
    { key:'swiggy', label:'Swiggy', color:'#ea580c', bg:'#fff7ed' },
    { key:'combined', label:'Overall', color:'#2563eb', bg:'#f8faff' },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' }}>
          <span style={{ fontSize:13, fontWeight:600 }}>Top 10 Items</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <div style={{ minWidth:ITEM_W+COL_W*MENU_COLS.length }}>
            <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
              <div style={{ minWidth:ITEM_W, width:ITEM_W, height:44, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb' }}><span style={{ fontSize:12, fontWeight:600 }}>Item Name</span></div>
              {MENU_COLS.map((c,i) => <div key={i} style={{ minWidth:COL_W, width:COL_W, height:44, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb', fontSize:11, fontWeight:600, textAlign:'center', padding:'0 6px' }}>{c.label}</div>)}
            </div>
            {menuPlatforms.map((pl,pi) => (
              <div key={pi} style={{ borderTop:pi>0?'2px solid #d1d5db':'none' }}>
                <div style={{ padding:'6px 14px', background:pl.bg, borderBottom:'1px solid #e5e7eb' }}><span style={{ fontSize:11, fontWeight:700, color:pl.color, textTransform:'uppercase' }}>{pl.label}</span></div>
                {(menuData[pl.key]||[]).slice(0,10).map((item,ri) => (
                  <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:36 }}>
                    <div style={{ minWidth:ITEM_W, width:ITEM_W, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb', fontSize:12, fontWeight:500, background:ri%2===0?'#fff':'#fafafa' }}>{item.item_name||'—'}</div>
                    {MENU_COLS.map((c,ci) => <div key={ci} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #f3f4f6', fontSize:12, background:ri%2===0?'#fff':'#fafafa' }}>{fmt(item[c.key], c.type)}</div>)}
                  </div>
                ))}
                {(menuData[pl.key]||[]).length===0 && <div style={{ padding:'12px 14px', fontSize:12, color:'#9ca3af', textAlign:'center' }}>No items found</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' }}><span style={{ fontSize:13, fontWeight:600 }}>All Menu Items (Combined)</span></div>
        <div style={{ overflowX:'auto' }}>
          <div style={{ minWidth:ITEM_W+COL_W*MENU_COLS.length }}>
            <div style={{ display:'flex', background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
              <div style={{ minWidth:ITEM_W, width:ITEM_W, height:44, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb' }}><span style={{ fontSize:12, fontWeight:600 }}>Item Name</span></div>
              {MENU_COLS.map((c,i) => <div key={i} style={{ minWidth:COL_W, width:COL_W, height:44, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #e5e7eb', fontSize:11, fontWeight:600, textAlign:'center', padding:'0 6px' }}>{c.label}</div>)}
            </div>
            {(menuData.combined||[]).map((item,ri) => (
              <div key={ri} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', height:36 }}>
                <div style={{ minWidth:ITEM_W, width:ITEM_W, display:'flex', alignItems:'center', padding:'0 14px', borderRight:'2px solid #e5e7eb', fontSize:12, fontWeight:500, background:ri%2===0?'#fff':'#fafafa' }}>{item.item_name||'—'}</div>
                {MENU_COLS.map((c,ci) => <div key={ci} style={{ minWidth:COL_W, width:COL_W, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #f3f4f6', fontSize:12, background:ri%2===0?'#fff':'#fafafa' }}>{fmt(item[c.key], c.type)}</div>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
