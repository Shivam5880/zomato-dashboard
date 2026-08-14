import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────
// Week/period helpers
// ─────────────────────────────────────────────────────────
function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((d - jan1) / 86400000) + 1
  return { week: Math.ceil(dayOfYear / 7), year: d.getFullYear() }
}

function getWeekDateRange(year, week) {
  const jan1 = new Date(year, 0, 1)
  const start = new Date(jan1)
  start.setDate(jan1.getDate() + (week - 1) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] }
}

function formatWeekLabel(year, week) {
  const { from, to } = getWeekDateRange(year, week)
  const d1 = new Date(from + 'T00:00:00')
  const d2 = new Date(to + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const fmt = d => `${String(d.getDate()).padStart(2,'0')} ${M[d.getMonth()]}`
  return `${year} W${week}\n${fmt(d1)} – ${fmt(d2)}`
}

function formatMonthLabel(year, month) {
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${M[month - 1]} ${year}`
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${days[d.getDay()]}\n${String(d.getDate()).padStart(2,'0')} ${M[d.getMonth()]} ${d.getFullYear()}`
}

export function generatePeriods(dateFrom, dateTo, granularity) {
  const periods = []
  const start = new Date(dateFrom + 'T00:00:00')
  const end = new Date(dateTo + 'T00:00:00')

  if (granularity === 'daily') {
    let cur = new Date(start)
    while (cur <= end) {
      const ds = cur.toISOString().split('T')[0]
      periods.push({ key: ds, label: formatDayLabel(ds), from: ds, to: ds })
      cur.setDate(cur.getDate() + 1)
    }
  } else if (granularity === 'weekly') {
    let cur = new Date(start)
    const seen = new Set()
    while (cur <= end) {
      const { week, year } = getWeekNumber(cur)
      const key = `${year}-W${week}`
      if (!seen.has(key)) {
        seen.add(key)
        const range = getWeekDateRange(year, week)
        periods.push({ key, label: formatWeekLabel(year, week), from: range.from, to: range.to })
      }
      cur.setDate(cur.getDate() + 7)
    }
  } else {
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      const y = cur.getFullYear(), m = cur.getMonth() + 1
      const key = `${y}-${String(m).padStart(2,'0')}`
      const lastDay = new Date(y, m, 0).getDate()
      periods.push({
        key, label: formatMonthLabel(y, m),
        from: `${y}-${String(m).padStart(2,'0')}-01`,
        to: `${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
      })
      cur.setMonth(cur.getMonth() + 1)
    }
  }
  return periods.slice(0, 15)
}

// ─────────────────────────────────────────────────────────
// Fetch all raw daily data from both platforms
// ─────────────────────────────────────────────────────────
async function fetchAllDailyData(brand, dateFrom, dateTo) {
  let zQ = supabase.from('zomato_daily_summary').select('*').gte('date', dateFrom).lte('date', dateTo)
  let sQ = supabase.from('swiggy_daily_summary').select('*').gte('date', dateFrom).lte('date', dateTo)
  let zrQ = supabase.from('zomato_report_daily').select('*').gte('date', dateFrom).lte('date', dateTo)
  let srQ = supabase.from('swiggy_report_daily').select('*').gte('date', dateFrom).lte('date', dateTo)

  if (brand && brand !== 'all') {
    zQ = zQ.eq('brand_name', brand)
    sQ = sQ.eq('brand_name', brand)
    zrQ = zrQ.eq('brand_name', brand)
    srQ = srQ.eq('brand_name', brand)
  }

  const [zRes, sRes, zrRes, srRes] = await Promise.all([zQ, sQ, zrQ, srQ])

  return {
    zomatoSummary: zRes.data || [],
    swiggySummary: sRes.data || [],
    zomatoReport:  zrRes.data || [],
    swiggyReport:  srRes.data || [],
  }
}

// ─────────────────────────────────────────────────────────
// Aggregation helpers
// ─────────────────────────────────────────────────────────
function sumField(rows, field) {
  const vals = rows.map(r => parseFloat(r[field])).filter(v => !isNaN(v))
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null
}

function avgField(rows, field) {
  const vals = rows.map(r => parseFloat(r[field])).filter(v => !isNaN(v))
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

function filterByPeriod(rows, from, to) {
  return rows.filter(r => r.date >= from && r.date <= to)
}

function aggregateSummary(rows) {
  if (!rows.length) return null
  return {
    total_orders: sumField(rows, 'total_orders'),
    delivered: sumField(rows, 'delivered'),
    cancelled: sumField(rows, 'cancelled'),
    gmv: sumField(rows, 'gmv'),
    net_payout: sumField(rows, 'net_payout'),
    res_discount: sumField(rows, 'res_discount'),
    customer_discount: sumField(rows, 'customer_discount'),
    gold_discount: sumField(rows, 'gold_discount'),
    brand_pack_discount: sumField(rows, 'brand_pack_discount'),
    total_discount: sumField(rows, 'total_discount'),
    items_sold: sumField(rows, 'items_sold'),
    avg_kpt: avgField(rows, 'avg_kpt'),
    avg_rating: avgField(rows, 'avg_rating'),
    orders_breakfast: sumField(rows, 'orders_breakfast'),
    orders_lunch: sumField(rows, 'orders_lunch'),
    orders_snacks: sumField(rows, 'orders_snacks'),
    orders_dinner: sumField(rows, 'orders_dinner'),
    orders_late_night: sumField(rows, 'orders_late_night'),
    gmv_breakfast: sumField(rows, 'gmv_breakfast'),
    gmv_lunch: sumField(rows, 'gmv_lunch'),
    gmv_snacks: sumField(rows, 'gmv_snacks'),
    gmv_dinner: sumField(rows, 'gmv_dinner'),
    gmv_late_night: sumField(rows, 'gmv_late_night'),
    discount_breakfast: sumField(rows, 'discount_breakfast'),
    discount_lunch: sumField(rows, 'discount_lunch'),
    discount_snacks: sumField(rows, 'discount_snacks'),
    discount_dinner: sumField(rows, 'discount_dinner'),
    discount_late_night: sumField(rows, 'discount_late_night'),
    cancellation_reason: rows.find(r => r.cancellation_reason)?.cancellation_reason || null,
  }
}

function aggregateReport(rows) {
  if (!rows.length) return null
  return {
    impressions: sumField(rows, 'impressions'),
    ads_impressions: sumField(rows, 'ads_impressions'),
    menu_opens: sumField(rows, 'menu_opens'),
    cart_builds: sumField(rows, 'cart_builds'),
    placed_orders: sumField(rows, 'placed_orders'),
    online_pct: avgField(rows, 'online_pct'),
    ads_spend: sumField(rows, 'ads_spend'),
    ads_ctr: avgField(rows, 'ads_ctr'),
    ads_roi: avgField(rows, 'ads_roi'),
    ads_sales: sumField(rows, 'ads_sales'),
    ads_orders: sumField(rows, 'ads_orders'),
    ads_menu_opens: sumField(rows, 'ads_menu_opens'),
    gross_sales_offers: sumField(rows, 'gross_sales_offers'),
    discount_given: sumField(rows, 'discount_given'),
    avg_kpt_report: avgField(rows, 'avg_kpt_report'),
    avg_rating_report: avgField(rows, 'avg_rating_report'),
    delivered_report: sumField(rows, 'delivered_report'),
    rejected_report: sumField(rows, 'rejected_report'),
    sales_rs: sumField(rows, 'sales_rs'),
  }
}

function mergeSummaryAndReport(summary, report) {
  const s = summary || {}
  const r = report || {}
  const gmv = s.gmv || 0
  const delivered = s.delivered || 0
  const netPayout = s.net_payout || 0
  const adsSales = r.ads_sales || 0

  return {
    gmv,
    orders: s.total_orders,
    cancelled: s.cancelled,
    delivered,
    aov: delivered ? Math.round(gmv / delivered) : null,
    itemsSold: s.items_sold,

    discountRs: s.total_discount,
    resDiscount: s.res_discount,
    customerDiscount: s.customer_discount,
    goldDiscount: s.gold_discount,
    brandPackDiscount: s.brand_pack_discount,
    grossSalesOffers: r.gross_sales_offers,

    adsSpend: r.ads_spend,
    adsCtr: r.ads_ctr,
    adsRoi: r.ads_roi,
    adsSales: r.ads_sales,
    adsOrders: r.ads_orders,
    organicSale: netPayout && adsSales ? Math.round(netPayout - adsSales) : null,
    organicPct: netPayout && adsSales ? Math.round(((netPayout - adsSales) / netPayout) * 1000) / 10 : null,
    adsSalePct: netPayout && adsSales ? Math.round((adsSales / netPayout) * 1000) / 10 : null,

    impressions: r.impressions,
    menuOpens: r.menu_opens,
    cartBuilds: r.cart_builds,
    placedOrders: r.placed_orders,

    avgKpt: s.avg_kpt ?? r.avg_kpt_report,
    onlinePct: r.online_pct,
    avgRating: s.avg_rating ?? r.avg_rating_report,
    cancellationReason: s.cancellation_reason,

    orders_breakfast: s.orders_breakfast,
    orders_lunch: s.orders_lunch,
    orders_snacks: s.orders_snacks,
    orders_dinner: s.orders_dinner,
    orders_late_night: s.orders_late_night,
    gmv_breakfast: s.gmv_breakfast,
    gmv_lunch: s.gmv_lunch,
    gmv_snacks: s.gmv_snacks,
    gmv_dinner: s.gmv_dinner,
    gmv_late_night: s.gmv_late_night,
    discount_breakfast: s.discount_breakfast,
    discount_lunch: s.discount_lunch,
    discount_snacks: s.discount_snacks,
    discount_dinner: s.discount_dinner,
    discount_late_night: s.discount_late_night,

    netPayout,
    prepCost: null,
    pnlRs: null,
    pnlPct: null,
  }
}

// ─────────────────────────────────────────────────────────
// Master fetch — returns periods with combined + per-platform data
// ─────────────────────────────────────────────────────────
export async function fetchPeriodData(brand, dateFrom, dateTo, granularity) {
  const periods = generatePeriods(dateFrom, dateTo, granularity)
  if (!periods.length) return []

  const actualFrom = periods[0].from
  const actualTo = periods[periods.length - 1].to

  const { zomatoSummary, swiggySummary, zomatoReport, swiggyReport } =
    await fetchAllDailyData(brand, actualFrom, actualTo)

  return periods.map(p => {
    const zs = filterByPeriod(zomatoSummary, p.from, p.to)
    const ss = filterByPeriod(swiggySummary, p.from, p.to)
    const zr = filterByPeriod(zomatoReport, p.from, p.to)
    const sr = filterByPeriod(swiggyReport, p.from, p.to)

    return {
      key: p.key,
      label: p.label,
      data: mergeSummaryAndReport(aggregateSummary([...zs, ...ss]), aggregateReport([...zr, ...sr])),
      zomato: mergeSummaryAndReport(aggregateSummary(zs), aggregateReport(zr)),
      swiggy: mergeSummaryAndReport(aggregateSummary(ss), aggregateReport(sr)),
      combined: mergeSummaryAndReport(aggregateSummary([...zs, ...ss]), aggregateReport([...zr, ...sr])),
    }
  })
}

// ─────────────────────────────────────────────────────────
// Fetch all brands from both platforms
// ─────────────────────────────────────────────────────────
export async function fetchBrands() {
  const [z, s] = await Promise.all([
    supabase.from('zomato_daily_summary').select('brand_name'),
    supabase.from('swiggy_daily_summary').select('brand_name'),
  ])
  const all = [
    ...(z.data || []).map(r => r.brand_name),
    ...(s.data || []).map(r => r.brand_name),
  ]
  return [...new Set(all)].sort()
}

// ─────────────────────────────────────────────────────────
// Fetch menu items for Menu tab
// ─────────────────────────────────────────────────────────
export async function fetchMenuData(brand, dateFrom, dateTo) {
  let zQ = supabase.from('zomato_menu_items').select('*').gte('date', dateFrom).lte('date', dateTo)
  let sQ = supabase.from('swiggy_menu_items').select('*').gte('date', dateFrom).lte('date', dateTo)

  if (brand && brand !== 'all') {
    zQ = zQ.eq('brand_name', brand)
    sQ = sQ.eq('brand_name', brand)
  }

  const [zRes, sRes] = await Promise.all([zQ, sQ])

  function rollup(items, platform) {
    const map = {}
    items.forEach(r => {
      const key = r.item_name
      if (!map[key]) map[key] = { item_name: key, platform, total_orders: 0, qty_sold: 0, gmv: 0, discount_total: 0, receivable_total: 0, rating_sum: 0, rating_count: 0 }
      map[key].total_orders += r.total_orders || 0
      map[key].qty_sold += r.qty_sold || 0
      map[key].gmv += r.gmv || 0
      map[key].discount_total += (r.avg_discount || 0) * (r.total_orders || 1)
      map[key].receivable_total += (r.avg_receivable || 0) * (r.total_orders || 1)
      if (r.item_ratings) { map[key].rating_sum += r.item_ratings; map[key].rating_count++ }
    })
    return Object.values(map).map(m => ({
      item_name: m.item_name,
      platform: m.platform,
      item_ratings: m.rating_count ? Math.round(m.rating_sum / m.rating_count * 10) / 10 : null,
      total_orders: m.total_orders,
      qty_sold: m.qty_sold,
      gmv: Math.round(m.gmv),
      avg_discount: m.total_orders ? Math.round(m.discount_total / m.total_orders) : null,
      avg_aov: m.total_orders ? Math.round(m.gmv / m.total_orders) : null,
      avg_receivable: m.total_orders ? Math.round(m.receivable_total / m.total_orders) : null,
    })).sort((a, b) => b.qty_sold - a.qty_sold)
  }

  return {
    zomato: rollup(zRes.data || [], 'Zomato'),
    swiggy: rollup(sRes.data || [], 'Swiggy'),
    combined: rollup([...(zRes.data || []), ...(sRes.data || [])], 'Combined'),
  }
}
