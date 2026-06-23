import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────
// Fetch a single metric value for a brand + date range
// from zomato_metrics table
// ─────────────────────────────────────────────────────────
async function fetchMetricSum(brand, metricName, dateFrom, dateTo) {
  const { data, error } = await supabase
    .from('zomato_metrics')
    .select('value')
    .eq('restaurant_name', brand)
    .eq('metric', metricName)
    .gte('date', dateFrom)
    .lte('date', dateTo)

  if (error || !data) return null
  const vals = data.map(r => parseFloat(r.value)).filter(v => !isNaN(v))
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null
}

async function fetchMetricAvg(brand, metricName, dateFrom, dateTo) {
  const { data, error } = await supabase
    .from('zomato_metrics')
    .select('value')
    .eq('restaurant_name', brand)
    .eq('metric', metricName)
    .gte('date', dateFrom)
    .lte('date', dateTo)

  if (error || !data) return null
  const vals = data.map(r => parseFloat(r.value)).filter(v => !isNaN(v))
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

// ─────────────────────────────────────────────────────────
// Fetch order-level metrics from zomato_orders table
// (deduped by order_id first)
// ─────────────────────────────────────────────────────────
async function fetchOrderMetrics(brand, dateFrom, dateTo) {
  const { data, error } = await supabase
    .from('zomato_orders')
    .select(
      'order_id, order_status, bill_subtotal, packaging_charges, ' +
      'restaurant_discount_promo, gold_discount, brand_pack_discount, ' +
      'total, item_count, item_name, kpt_duration_minutes'
    )
    .eq('restaurant_name', brand)
    .gte('order_placed_at', dateFrom)
    .lte('order_placed_at', dateTo + 'T23:59:59')

  if (error || !data) return {}

  // Dedupe orders (multiple rows per order due to item explosion)
  const orderMap = {}
  data.forEach(row => {
    if (!orderMap[row.order_id]) {
      orderMap[row.order_id] = { ...row, items: [] }
    }
    orderMap[row.order_id].items.push({
      name: row.item_name,
      count: row.item_count
    })
  })
  const orders = Object.values(orderMap)

  const delivered  = orders.filter(o => o.order_status === 'Delivered')
  const cancelled  = orders.filter(o => ['Rejected','Returned','Timed out'].includes(o.order_status))
  const totalOrders = orders.length

  // GMV = Bill Subtotal + Packaging (delivered orders only)
  const gmv = delivered.reduce((s, o) => s + (parseFloat(o.bill_subtotal) || 0) + (parseFloat(o.packaging_charges) || 0), 0)

  // Net Payout = Total paid by customer (after all discounts)
  const netPayout = delivered.reduce((s, o) => s + (parseFloat(o.total) || 0), 0)

  // Total items sold (sum of item_count across all order rows)
  const itemsSold = data
    .filter(r => r.order_status === 'Delivered')
    .reduce((s, r) => s + (parseInt(r.item_count) || 0), 0)

  // AOV = GMV / delivered orders
  const aov = delivered.length ? gmv / delivered.length : 0

  // KPT average (delivered)
  const kptVals = delivered.map(o => parseFloat(o.kpt_duration_minutes)).filter(v => !isNaN(v))
  const avgKpt = kptVals.length ? kptVals.reduce((a, b) => a + b, 0) / kptVals.length : null

  // Discount = sum of all discount columns (delivered)
  const totalDiscount = delivered.reduce((s, o) => {
    return s +
      (parseFloat(o.restaurant_discount_promo) || 0) +
      (parseFloat(o.gold_discount) || 0) +
      (parseFloat(o.brand_pack_discount) || 0)
  }, 0)

  return {
    totalOrders,
    deliveredOrders: delivered.length,
    cancelledOrders: cancelled.length,
    gmv:             Math.round(gmv),
    netPayout:       Math.round(netPayout),
    itemsSold,
    aov:             Math.round(aov),
    avgKpt:          avgKpt ? Math.round(avgKpt * 10) / 10 : null,
    totalDiscount:   Math.round(totalDiscount),
  }
}

// ─────────────────────────────────────────────────────────
// Master function — fetches ALL metrics for one period
// ─────────────────────────────────────────────────────────
export async function fetchDashboardData(brand, dateFrom, dateTo) {
  const [orderMetrics, adsSpend, impressions, menuOpens, cartBuilds,
         placedOrders, onlinePct, kptMetric, adsCtr, adsRoi,
         discountGiven, grossSalesOffers] = await Promise.all([
    fetchOrderMetrics(brand, dateFrom, dateTo),
    fetchMetricSum(brand, 'Ads spend (Rs)',    dateFrom, dateTo),
    fetchMetricSum(brand, 'Impressions',       dateFrom, dateTo),
    fetchMetricSum(brand, 'Menu opens',        dateFrom, dateTo),
    fetchMetricSum(brand, 'Cart builds',       dateFrom, dateTo),
    fetchMetricSum(brand, 'Placed Orders',     dateFrom, dateTo),
    fetchMetricAvg(brand, 'Online %',          dateFrom, dateTo),
    fetchMetricAvg(brand, 'KPT (in minutes)',  dateFrom, dateTo),
    fetchMetricAvg(brand, 'Ads CTR (%)',       dateFrom, dateTo),
    fetchMetricAvg(brand, 'Ads ROI',           dateFrom, dateTo),
    fetchMetricSum(brand, 'Discount given (Rs)', dateFrom, dateTo),
    fetchMetricSum(brand, 'Gross sales from offers (Rs)', dateFrom, dateTo),
  ])

  const gmv        = orderMetrics.gmv || 0
  const netPayout  = orderMetrics.netPayout || 0
  const prepCost   = null  // manual entry — not in Zomato data
  const pnlRs      = prepCost !== null ? netPayout - prepCost : null
  const pnlPct     = (pnlRs !== null && gmv > 0) ? (pnlRs / gmv) * 100 : null

  return {
    // Sales
    gmv,
    orders:          orderMetrics.totalOrders,
    cancelled:       orderMetrics.cancelledOrders,
    delivered:       orderMetrics.deliveredOrders,
    aov:             orderMetrics.aov,
    itemsSold:       orderMetrics.itemsSold,

    // Discounts
    discountRs:      discountGiven     ?? orderMetrics.totalDiscount,
    grossSalesOffers,

    // Ads
    adsSpend:        adsSpend    !== null ? Math.round(adsSpend)    : null,
    adsCtr,
    adsRoi,

    // Funnel
    impressions:     impressions  !== null ? Math.round(impressions) : null,
    menuOpens:       menuOpens    !== null ? Math.round(menuOpens)   : null,
    cartBuilds:      cartBuilds   !== null ? Math.round(cartBuilds)  : null,
    placedOrders:    placedOrders !== null ? Math.round(placedOrders): null,

    // Operations
    avgKpt:          kptMetric    !== null ? Math.round(kptMetric * 10) / 10
                                          : orderMetrics.avgKpt,
    onlinePct:       onlinePct   !== null ? Math.round(onlinePct * 10) / 10 : null,

    // P&L
    netPayout,
    prepCost,
    pnlRs,
    pnlPct,
  }
}

// ─────────────────────────────────────────────────────────
// Fetch list of all brands
// ─────────────────────────────────────────────────────────
export async function fetchBrands() {
  const { data } = await supabase
    .from('zomato_metrics')
    .select('restaurant_name')
    .order('restaurant_name')

  if (!data) return []
  return [...new Set(data.map(r => r.restaurant_name))]
}

// ─────────────────────────────────────────────────────────
// Fetch weekly/monthly aggregated data for trend view
// ─────────────────────────────────────────────────────────
export async function fetchTrendData(brand, dateFrom, dateTo, granularity = 'weekly') {
  const { data, error } = await supabase
    .from('zomato_metrics')
    .select('date, metric, value')
    .eq('restaurant_name', brand)
    .in('metric', ['Sales (Rs)', 'Placed Orders', 'Ads spend (Rs)', 'Discount given (Rs)'])
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date')

  if (error || !data) return []

  // Group by week or month
  const grouped = {}
  data.forEach(row => {
    const d = new Date(row.date)
    let key
    if (granularity === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    } else {
      // ISO week
      const day = d.getDay() || 7
      const thursday = new Date(d)
      thursday.setDate(d.getDate() - day + 4)
      const yearStart = new Date(thursday.getFullYear(), 0, 1)
      const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7)
      key = `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`
    }
    if (!grouped[key]) grouped[key] = {}
    if (!grouped[key][row.metric]) grouped[key][row.metric] = 0
    grouped[key][row.metric] += parseFloat(row.value) || 0
  })

  return Object.entries(grouped).map(([period, metrics]) => ({
    period,
    ...metrics
  }))
}
