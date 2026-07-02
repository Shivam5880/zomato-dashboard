import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────
// Get week number (Week 1 = first week of the year, Mon start)
// ─────────────────────────────────────────────────────────
function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((d - jan1) / 86400000) + 1
  const weekNum = Math.ceil(dayOfYear / 7)
  return { week: weekNum, year: d.getFullYear() }
}

// Get start and end date of a given week number in a year
function getWeekDateRange(year, week) {
  const jan1 = new Date(year, 0, 1)
  const startDay = (week - 1) * 7
  const start = new Date(jan1)
  start.setDate(jan1.getDate() + startDay)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    from: start.toISOString().split('T')[0],
    to:   end.toISOString().split('T')[0]
  }
}

// Format week label: "2026 W1 - 01-07 Jan"
function formatWeekLabel(year, week) {
  const { from, to } = getWeekDateRange(year, week)
  const d1 = new Date(from + 'T00:00:00')
  const d2 = new Date(to   + 'T00:00:00')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const fmt = d => `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]}`
  return `${year} W${week}\n${fmt(d1)} – ${fmt(d2)}`
}

// Format month label: "Jan 2026"
function formatMonthLabel(year, month) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[month - 1]} ${year}`
}

// Format day label: "01 Jan 2026"
function formatDayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

// ─────────────────────────────────────────────────────────
// Generate period buckets from dateFrom → dateTo
// ─────────────────────────────────────────────────────────
export function generatePeriods(dateFrom, dateTo, granularity) {
  const periods = []
  const start = new Date(dateFrom + 'T00:00:00')
  const end   = new Date(dateTo   + 'T00:00:00')

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
    // monthly
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      const y = cur.getFullYear()
      const m = cur.getMonth() + 1
      const key = `${y}-${String(m).padStart(2,'0')}`
      const lastDay = new Date(y, m, 0).getDate()
      periods.push({
        key,
        label: formatMonthLabel(y, m),
        from: `${y}-${String(m).padStart(2,'0')}-01`,
        to:   `${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
      })
      cur.setMonth(cur.getMonth() + 1)
    }
  }
  return periods.slice(0, 15)
}

// ─────────────────────────────────────────────────────────
// Fetch metrics data for a brand + date range (bulk)
// Returns { metricName: { date: value } }
// ─────────────────────────────────────────────────────────
async function fetchMetricsBulk(brands, dateFrom, dateTo) {
  let query = supabase
    .from('zomato_metrics')
    .select('restaurant_name, metric, date, value')
    .gte('date', dateFrom)
    .lte('date', dateTo)

  if (brands === 'all') {
    // fetch all
  } else if (Array.isArray(brands)) {
    query = query.in('restaurant_name', brands)
  } else {
    query = query.eq('restaurant_name', brands)
  }

  const { data, error } = await query
  if (error || !data) return {}

  // Index: metric → date → [values]
  const index = {}
  data.forEach(row => {
    if (!index[row.metric]) index[row.metric] = {}
    if (!index[row.metric][row.date]) index[row.metric][row.date] = []
    index[row.metric][row.date].push(parseFloat(row.value) || 0)
  })
  return index
}

// ─────────────────────────────────────────────────────────
// Fetch orders data for a brand + date range (bulk)
// ─────────────────────────────────────────────────────────
async function fetchOrdersBulk(brands, dateFrom, dateTo) {
  let query = supabase
    .from('zomato_orders')
    .select(
      'restaurant_name, order_id, order_status, bill_subtotal, packaging_charges, ' +
      'restaurant_discount_promo, gold_discount, brand_pack_discount, ' +
      'total, item_count, kpt_duration_minutes, order_placed_at'
    )
    .gte('order_placed_at', dateFrom + 'T00:00:00')
    .lte('order_placed_at', dateTo   + 'T23:59:59')

  if (brands === 'all') {
    // fetch all
  } else if (Array.isArray(brands)) {
    query = query.in('restaurant_name', brands)
  } else {
    query = query.eq('restaurant_name', brands)
  }

  const { data, error } = await query
  if (error || !data) return {}

  // Dedupe by order_id, keep the date
  const orderMap = {}
  data.forEach(row => {
    if (!orderMap[row.order_id]) {
      orderMap[row.order_id] = {
        ...row,
        date: row.order_placed_at.split('T')[0].substring(0, 10)
      }
    }
    // accumulate item count
    orderMap[row.order_id]._items = (orderMap[row.order_id]._items || 0) + (parseInt(row.item_count) || 0)
  })
  return Object.values(orderMap)
}

// ─────────────────────────────────────────────────────────
// Aggregate metrics for a single period bucket
// ─────────────────────────────────────────────────────────
function aggregateForPeriod(metricsIndex, orders, periodFrom, periodTo) {
  const inRange = (d) => d >= periodFrom && d <= periodTo

  // Sum a metric
  const sum = (metricName) => {
    const byDate = metricsIndex[metricName]
    if (!byDate) return null
    let total = 0, found = false
    Object.entries(byDate).forEach(([d, vals]) => {
      if (inRange(d)) { vals.forEach(v => { total += v; found = true }) }
    })
    return found ? total : null
  }

  // Average a metric
  const avg = (metricName) => {
    const byDate = metricsIndex[metricName]
    if (!byDate) return null
    let total = 0, count = 0
    Object.entries(byDate).forEach(([d, vals]) => {
      if (inRange(d)) { vals.forEach(v => { total += v; count++ }) }
    })
    return count ? total / count : null
  }

  // Order-level metrics
  const periodOrders = orders.filter(o => inRange(o.date))
  const delivered = periodOrders.filter(o => o.order_status === 'Delivered')
  const cancelled = periodOrders.filter(o => ['Rejected','Returned','Timed out'].includes(o.order_status))

  const gmv = delivered.reduce((s,o) => s + (parseFloat(o.bill_subtotal)||0) + (parseFloat(o.packaging_charges)||0), 0)
  const netPayout = delivered.reduce((s,o) => s + (parseFloat(o.total)||0), 0)
  const itemsSold = delivered.reduce((s,o) => s + (o._items || parseInt(o.item_count) || 0), 0)
  const aov = delivered.length ? gmv / delivered.length : 0
  const kptVals = delivered.map(o => parseFloat(o.kpt_duration_minutes)).filter(v => !isNaN(v))
  const avgKpt = kptVals.length ? kptVals.reduce((a,b) => a+b,0) / kptVals.length : null
  const totalDiscount = delivered.reduce((s,o) =>
    s + (parseFloat(o.restaurant_discount_promo)||0) +
        (parseFloat(o.gold_discount)||0) +
        (parseFloat(o.brand_pack_discount)||0), 0)

  const discountGiven = sum('Discount given (Rs)')
  const adsSpend    = sum('Ads spend (Rs)')
  const impressions = sum('Impressions')
  const menuOpens   = sum('Menu opens')
  const cartBuilds  = sum('Cart builds')
  const placedOrders = sum('Placed Orders')
  const onlinePct   = avg('Online %')
  const kptMetric   = avg('KPT (in minutes)')
  const adsCtr      = avg('Ads CTR (%)')
  const adsRoi      = avg('Ads ROI')
  const grossSalesOffers = sum('Gross sales from offers (Rs)')

  return {
    gmv:             Math.round(gmv),
    orders:          periodOrders.length,
    cancelled:       cancelled.length,
    delivered:       delivered.length,
    aov:             Math.round(aov),
    itemsSold,
    discountRs:      discountGiven ?? Math.round(totalDiscount),
    grossSalesOffers: grossSalesOffers !== null ? Math.round(grossSalesOffers) : null,
    adsSpend:        adsSpend !== null ? Math.round(adsSpend) : null,
    adsCtr,
    adsRoi,
    impressions:     impressions !== null ? Math.round(impressions) : null,
    menuOpens:       menuOpens   !== null ? Math.round(menuOpens)   : null,
    cartBuilds:      cartBuilds  !== null ? Math.round(cartBuilds)  : null,
    placedOrders:    placedOrders !== null ? Math.round(placedOrders) : null,
    avgKpt:          kptMetric !== null ? Math.round(kptMetric * 10) / 10 : avgKpt ? Math.round(avgKpt * 10) / 10 : null,
    onlinePct:       onlinePct !== null ? Math.round(onlinePct * 10) / 10 : null,
    netPayout:       Math.round(netPayout),
    prepCost:        null,
    pnlRs:           null,
    pnlPct:          null,
  }
}

// ─────────────────────────────────────────────────────────
// Master fetch: returns array of { period, label, data }
// ─────────────────────────────────────────────────────────
export async function fetchPeriodData(brand, dateFrom, dateTo, granularity) {
  const periods = generatePeriods(dateFrom, dateTo, granularity)
  if (!periods.length) return []

  const actualFrom = periods[0].from
  const actualTo   = periods[periods.length - 1].to
  const brands     = brand === 'all' ? 'all' : brand

  const [metricsIndex, orders] = await Promise.all([
    fetchMetricsBulk(brands, actualFrom, actualTo),
    fetchOrdersBulk(brands, actualFrom, actualTo)
  ])

  return periods.map(p => ({
    key:   p.key,
    label: p.label,
    data:  aggregateForPeriod(metricsIndex, orders, p.from, p.to)
  }))
}

// ─────────────────────────────────────────────────────────
// Fetch list of all brands
// ─────────────────────────────────────────────────────────
export async function fetchBrands() {
  const { data } = await supabase
    .from('zomato_metrics')
    .select('restaurant_name')

  if (!data) return []
  return [...new Set(data.map(r => r.restaurant_name))].sort()
}
