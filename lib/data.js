import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────
// PERIOD HELPERS
// ─────────────────────────────────────────────────────────
function getWeekNumber(date) {
  const d = new Date(date); d.setHours(0,0,0,0)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return { week: Math.ceil(((d - jan1) / 86400000 + 1) / 7), year: d.getFullYear() }
}

function getWeekDateRange(year, week) {
  const jan1 = new Date(year, 0, 1)
  const start = new Date(jan1); start.setDate(jan1.getDate() + (week-1)*7)
  const end = new Date(start); end.setDate(start.getDate() + 6)
  return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] }
}

function formatWeekLabel(year, week) {
  const { from, to } = getWeekDateRange(year, week)
  const d1 = new Date(from+'T00:00:00'), d2 = new Date(to+'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const f = d => `${String(d.getDate()).padStart(2,'0')} ${M[d.getMonth()]}`
  return `${year} W${week}\n${f(d1)} – ${f(d2)}`
}

function formatMonthLabel(y, m) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1] + ' ' + y
}

function formatDayLabel(ds) {
  const d = new Date(ds+'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${D[d.getDay()]}\n${String(d.getDate()).padStart(2,'0')} ${M[d.getMonth()]} ${d.getFullYear()}`
}

export function generatePeriods(dateFrom, dateTo, granularity) {
  const periods = [], start = new Date(dateFrom+'T00:00:00'), end = new Date(dateTo+'T00:00:00')

  if (granularity === 'daywise') {
    const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    const dayDates = {1:[],2:[],3:[],4:[],5:[],6:[],0:[]}
    let cur = new Date(start)
    while (cur <= end) { dayDates[cur.getDay()].push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate()+1) }
    ;[1,2,3,4,5,6,0].forEach(dow => {
      const dates = dayDates[dow]
      if (dates.length) periods.push({ key: dayNames[dow===0?6:dow-1], label: `${dayNames[dow===0?6:dow-1]}\n(${dates.length} days)`, dates })
    })
    return periods
  }

  if (granularity === 'daily') {
    let cur = new Date(start)
    while (cur <= end) { const ds=cur.toISOString().split('T')[0]; periods.push({key:ds,label:formatDayLabel(ds),from:ds,to:ds}); cur.setDate(cur.getDate()+1) }
  } else if (granularity === 'weekly') {
    let cur = new Date(start); const seen = new Set()
    while (cur <= end) {
      const {week,year} = getWeekNumber(cur), key = `${year}-W${week}`
      if (!seen.has(key)) { seen.add(key); const r=getWeekDateRange(year,week); periods.push({key,label:formatWeekLabel(year,week),from:r.from,to:r.to}) }
      cur.setDate(cur.getDate()+7)
    }
  } else {
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      const y=cur.getFullYear(), m=cur.getMonth()+1, ld=new Date(y,m,0).getDate()
      periods.push({key:`${y}-${String(m).padStart(2,'0')}`, label:formatMonthLabel(y,m),
        from:`${y}-${String(m).padStart(2,'0')}-01`, to:`${y}-${String(m).padStart(2,'0')}-${String(ld).padStart(2,'0')}`})
      cur.setMonth(cur.getMonth()+1)
    }
  }
  return periods.slice(0, 15)
}


// ─────────────────────────────────────────────────────────
// FETCH RAW DATA FROM SUPABASE
// ─────────────────────────────────────────────────────────
async function fetchAllDailyData(brand, dateFrom, dateTo) {
  let zQ  = supabase.from('zomato_daily_summary').select('*').gte('date', dateFrom).lte('date', dateTo)
  let sQ  = supabase.from('swiggy_daily_summary').select('*').gte('date', dateFrom).lte('date', dateTo)
  let zrQ = supabase.from('zomato_report_daily').select('*').gte('date', dateFrom).lte('date', dateTo)
  let srQ = supabase.from('swiggy_report_daily').select('*').gte('date', dateFrom).lte('date', dateTo)

  if (brand && brand !== 'all') {
    zQ  = zQ.eq('brand_name', brand)
    sQ  = sQ.eq('brand_name', brand)
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
// AGGREGATION HELPERS
// ─────────────────────────────────────────────────────────
function sumF(rows, field) {
  const v = rows.map(r => parseFloat(r[field])).filter(v => !isNaN(v))
  return v.length ? v.reduce((a,b) => a+b, 0) : null
}
function avgF(rows, field) {
  const v = rows.map(r => parseFloat(r[field])).filter(v => !isNaN(v))
  return v.length ? v.reduce((a,b) => a+b, 0) / v.length : null
}
function filterByPeriod(rows, from, to) {
  return rows.filter(r => {
    const d = String(r.date).substring(0, 10)
    return d >= from && d <= to
  })
}
function filterByDates(rows, dates) {
  return rows.filter(r => dates.includes(String(r.date).substring(0, 10)))
}


// ─────────────────────────────────────────────────────────
// AGGREGATE SUMMARY TABLE (zomato_daily_summary / swiggy_daily_summary)
// Columns: total_orders, delivered, cancelled, gmv, total_discount,
//   promo_discount, gold_discount, pack_discount, items_sold,
//   aov (pre-calc), avg_kpt, avg_rating, prep_cost, net_payout, pnl_rs,
//   orders/gmv/discount × 5 time slots
// ─────────────────────────────────────────────────────────
function aggregateSummary(rows) {
  if (!rows.length) return null
  return {
    total_orders:      sumF(rows, 'total_orders'),
    delivered:         sumF(rows, 'delivered'),
    cancelled:         sumF(rows, 'cancelled'),
    gmv:               sumF(rows, 'gmv'),
    total_discount:    sumF(rows, 'total_discount'),
    promo_discount:    sumF(rows, 'promo_discount'),
    gold_discount:     sumF(rows, 'gold_discount'),
    pack_discount:     sumF(rows, 'pack_discount'),
    items_sold:        sumF(rows, 'items_sold'),
    avg_kpt:           avgF(rows, 'avg_kpt'),
    avg_rating:        avgF(rows, 'avg_rating'),
    prep_cost:         sumF(rows, 'prep_cost'),
    net_payout:        sumF(rows, 'net_payout'),
    pnl_rs:            sumF(rows, 'pnl_rs'),
    // Time slots
    orders_breakfast:  sumF(rows, 'orders_breakfast'),
    orders_lunch:      sumF(rows, 'orders_lunch'),
    orders_snacks:     sumF(rows, 'orders_snacks'),
    orders_dinner:     sumF(rows, 'orders_dinner'),
    orders_late_night: sumF(rows, 'orders_late_night'),
    gmv_breakfast:     sumF(rows, 'gmv_breakfast'),
    gmv_lunch:         sumF(rows, 'gmv_lunch'),
    gmv_snacks:        sumF(rows, 'gmv_snacks'),
    gmv_dinner:        sumF(rows, 'gmv_dinner'),
    gmv_late_night:    sumF(rows, 'gmv_late_night'),
    discount_breakfast:  sumF(rows, 'discount_breakfast'),
    discount_lunch:      sumF(rows, 'discount_lunch'),
    discount_snacks:     sumF(rows, 'discount_snacks'),
    discount_dinner:     sumF(rows, 'discount_dinner'),
    discount_late_night: sumF(rows, 'discount_late_night'),
  }
}


// ─────────────────────────────────────────────────────────
// AGGREGATE REPORT TABLE (zomato_report_daily / swiggy_report_daily)
// Columns: impressions, menu_opens, cart_builds, placed_orders,
//   online_pct, ads_spend_with_gst, ads_spend_without_gst,
//   ads_ctr, ads_roi, ads_sales, ads_orders,
//   avg_kpt_report, avg_rating_report, delivered_report,
//   sales_rs, gross_sales_offers, discount_given
// ─────────────────────────────────────────────────────────
function aggregateReport(rows) {
  if (!rows.length) return null
  return {
    impressions:           sumF(rows, 'impressions'),
    menu_opens:            sumF(rows, 'menu_opens'),
    cart_builds:           sumF(rows, 'cart_builds'),
    placed_orders:         sumF(rows, 'placed_orders'),
    online_pct:            avgF(rows, 'online_pct'),
    ads_spend_with_gst:    sumF(rows, 'ads_spend_with_gst'),
    ads_spend_without_gst: sumF(rows, 'ads_spend_without_gst'),
    ads_ctr:               avgF(rows, 'ads_ctr'),
    ads_roi:               avgF(rows, 'ads_roi'),
    ads_sales:             sumF(rows, 'ads_sales'),
    ads_orders:            sumF(rows, 'ads_orders'),
    avg_kpt_report:        avgF(rows, 'avg_kpt_report'),
    avg_rating_report:     avgF(rows, 'avg_rating_report'),
    delivered_report:      sumF(rows, 'delivered_report'),
    sales_rs:              sumF(rows, 'sales_rs'),
    gross_sales_offers:    sumF(rows, 'gross_sales_offers'),
    discount_given:        sumF(rows, 'discount_given'),
  }
}


// ─────────────────────────────────────────────────────────
// MERGE SUMMARY + REPORT → single object for one period
// This is what index.js reads for each period
// ─────────────────────────────────────────────────────────
function mergeSummaryAndReport(summary, report) {
  const s = summary || {}
  const r = report || {}

  const gmv           = s.gmv || 0
  const totalDiscount = s.total_discount || 0
  const delivered     = s.delivered || 0
  const totalOrders   = s.total_orders || 0
  const netPayoutRaw  = s.net_payout || 0          // Total from orders (customer paid)
  const adsSpendGst   = r.ads_spend_with_gst || 0  // Ads + 18% GST
  const adsSales      = r.ads_sales || 0
  const prepCost      = s.prep_cost || 0

  // Received = Net Payout from orders - Ads Spend (with GST)
  const received = netPayoutRaw - adsSpendGst

  // P&L = Received - Prep Cost
  const pnlRs = received - prepCost
  const pnlPct = gmv > 0 ? (pnlRs / gmv) * 100 : null

  // AOV = (GMV - Discount) / Total Orders
  const aov = totalOrders > 0 ? (gmv - totalDiscount) / totalOrders : null

  return {
    // ─── Brand Details: Sales section ────────────
    gmv:               Math.round(gmv),
    orders:            totalOrders,
    cancelled:         s.cancelled,
    delivered:         delivered,
    aov:               aov ? Math.round(aov) : null,
    itemsSold:         s.items_sold,

    // ─── Brand Details: Discounts section ────────
    discountRs:        Math.round(totalDiscount),
    resDiscount:       s.promo_discount ? Math.round(s.promo_discount) : null,
    goldDiscount:      s.gold_discount ? Math.round(s.gold_discount) : null,
    brandPackDiscount: s.pack_discount ? Math.round(s.pack_discount) : null,
    grossSalesOffers:  r.gross_sales_offers ? Math.round(r.gross_sales_offers) : null,

    // ─── Brand Details: Ads section ──────────────
    // Ads = Ads Spend + 18% GST
    adsSpend:          adsSpendGst ? Math.round(adsSpendGst) : null,
    adsSpendNoGst:     r.ads_spend_without_gst ? Math.round(r.ads_spend_without_gst) : null,
    adsCtr:            r.ads_ctr != null ? Math.round(r.ads_ctr * 10) / 10 : null,
    adsRoi:            r.ads_roi != null ? Math.round(r.ads_roi * 10) / 10 : null,
    adsSales:          adsSales ? Math.round(adsSales) : null,
    adsOrders:         r.ads_orders,

    // Organic Sale = Net Sales - Ad Sales
    // Net Sales for organic calc = GMV - Discount
    organicSale:       (gmv - totalDiscount) > 0 && adsSales
                         ? Math.round((gmv - totalDiscount) - adsSales) : null,
    organicPct:        (gmv - totalDiscount) > 0 && adsSales
                         ? Math.round((((gmv - totalDiscount) - adsSales) / (gmv - totalDiscount)) * 1000) / 10 : null,
    adsSalePct:        (gmv - totalDiscount) > 0 && adsSales
                         ? Math.round((adsSales / (gmv - totalDiscount)) * 1000) / 10 : null,

    // ─── Brand Details: Funnel section ───────────
    impressions:       r.impressions ? Math.round(r.impressions) : null,
    menuOpens:         r.menu_opens ? Math.round(r.menu_opens) : null,
    cartBuilds:        r.cart_builds ? Math.round(r.cart_builds) : null,
    placedOrders:      r.placed_orders ? Math.round(r.placed_orders) : null,

    // ─── Brand Details: Operations section ───────
    // KPT: prefer order data, fallback to report
    avgKpt:            s.avg_kpt != null ? Math.round(s.avg_kpt * 10) / 10
                         : r.avg_kpt_report != null ? Math.round(r.avg_kpt_report * 10) / 10 : null,
    onlinePct:         r.online_pct != null ? Math.round(r.online_pct * 10) / 10 : null,
    avgRating:         s.avg_rating != null ? Math.round(s.avg_rating * 10) / 10
                         : r.avg_rating_report != null ? Math.round(r.avg_rating_report * 10) / 10 : null,

    // ─── Brand Details: P&L section ──────────────
    // Received = Order Total - Ads (with GST)
    netPayout:         Math.round(received),
    // Prep Cost = 27% of bill (temporary)
    prepCost:          Math.round(prepCost),
    // P&L = Received - Prep Cost
    pnlRs:             Math.round(pnlRs),
    // P&L % = P&L / GMV * 100
    pnlPct:            pnlPct != null ? Math.round(pnlPct * 10) / 10 : null,

    // ─── Sales tab: Time slots ───────────────────
    orders_breakfast:    s.orders_breakfast,
    orders_lunch:        s.orders_lunch,
    orders_snacks:       s.orders_snacks,
    orders_dinner:       s.orders_dinner,
    orders_late_night:   s.orders_late_night,
    gmv_breakfast:       s.gmv_breakfast,
    gmv_lunch:           s.gmv_lunch,
    gmv_snacks:          s.gmv_snacks,
    gmv_dinner:          s.gmv_dinner,
    gmv_late_night:      s.gmv_late_night,
    discount_breakfast:  s.discount_breakfast,
    discount_lunch:      s.discount_lunch,
    discount_snacks:     s.discount_snacks,
    discount_dinner:     s.discount_dinner,
    discount_late_night: s.discount_late_night,

    // ─── Operations tab extras ───────────────────
    cancellationReason:  null, // not aggregated in new SQL
  }
}


// ─────────────────────────────────────────────────────────
// MASTER FETCH — returns periods with Zomato + Swiggy + Combined
// ─────────────────────────────────────────────────────────
export async function fetchPeriodData(brand, dateFrom, dateTo, granularity) {
  const periods = generatePeriods(dateFrom, dateTo, granularity)
  if (!periods.length) return []

  const { zomatoSummary, swiggySummary, zomatoReport, swiggyReport } =
    await fetchAllDailyData(brand, dateFrom, dateTo)

  return periods.map(p => {
    let zs, ss, zr, sr

    if (p.dates) {
      // Day-wise view: filter by specific dates (all Mondays, all Tuesdays etc.)
      zs = filterByDates(zomatoSummary, p.dates)
      ss = filterByDates(swiggySummary, p.dates)
      zr = filterByDates(zomatoReport,  p.dates)
      sr = filterByDates(swiggyReport,  p.dates)
    } else {
      // Normal: filter by date range
      zs = filterByPeriod(zomatoSummary, p.from, p.to)
      ss = filterByPeriod(swiggySummary, p.from, p.to)
      zr = filterByPeriod(zomatoReport,  p.from, p.to)
      sr = filterByPeriod(swiggyReport,  p.from, p.to)
    }

    const zSummary = aggregateSummary(zs)
    const sSummary = aggregateSummary(ss)
    const zReport  = aggregateReport(zr)
    const sReport  = aggregateReport(sr)
    const allSummary = aggregateSummary([...zs, ...ss])
    const allReport  = aggregateReport([...zr, ...sr])

    return {
      key:      p.key,
      label:    p.label,
      data:     mergeSummaryAndReport(allSummary, allReport),    // Brand Details uses this
      zomato:   mergeSummaryAndReport(zSummary, zReport),        // Zomato column
      swiggy:   mergeSummaryAndReport(sSummary, sReport),        // Swiggy column
      combined: mergeSummaryAndReport(allSummary, allReport),    // Combined column
    }
  })
}


// ─────────────────────────────────────────────────────────
// FETCH BRANDS (from both platforms)
// ─────────────────────────────────────────────────────────
export async function fetchBrands() {
  const [z, s] = await Promise.all([
    supabase.from('zomato_daily_summary').select('brand_name'),
    supabase.from('swiggy_daily_summary').select('brand_name'),
  ])
  const all = [...(z.data||[]).map(r=>r.brand_name), ...(s.data||[]).map(r=>r.brand_name)]
  return [...new Set(all)].sort()
}


// ─────────────────────────────────────────────────────────
// FETCH MENU DATA (for Menu tab)
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
      const k = r.item_name
      if (!map[k]) map[k] = { item_name:k, platform, total_orders:0, qty_sold:0, gmv:0, disc_total:0, recv_total:0, rate_sum:0, rate_n:0 }
      map[k].total_orders += r.total_orders || 0
      map[k].qty_sold     += r.qty_sold || 0
      map[k].gmv          += r.gmv || 0
      map[k].disc_total   += (r.avg_discount || 0) * (r.total_orders || 1)
      map[k].recv_total   += (r.avg_receivable || 0) * (r.total_orders || 1)
      if (r.item_ratings) { map[k].rate_sum += r.item_ratings; map[k].rate_n++ }
    })
    return Object.values(map).map(m => ({
      item_name:      m.item_name,
      platform:       m.platform,
      item_ratings:   m.rate_n ? Math.round(m.rate_sum / m.rate_n * 10) / 10 : null,
      total_orders:   m.total_orders,
      qty_sold:       m.qty_sold,
      gmv:            Math.round(m.gmv),
      avg_discount:   m.total_orders ? Math.round(m.disc_total / m.total_orders) : null,
      avg_aov:        m.total_orders ? Math.round(m.gmv / m.total_orders) : null,
      avg_receivable: m.total_orders ? Math.round(m.recv_total / m.total_orders) : null,
    })).sort((a,b) => b.qty_sold - a.qty_sold)
  }

  return {
    zomato:   rollup(zRes.data || [], 'Zomato'),
    swiggy:   rollup(sRes.data || [], 'Swiggy'),
    combined: rollup([...(zRes.data||[]), ...(sRes.data||[])], 'Combined'),
  }
}
