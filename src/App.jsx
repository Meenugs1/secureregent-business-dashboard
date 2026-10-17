import { useEffect, useRef, useState } from 'react'
import { businessDataset, datasetToday, orderBalance, owners, sourceOptions } from './data/businessData'
import { downloadCsv } from './utils/csv'
import './App.css'

const dayMs = 24 * 60 * 60 * 1000
const today = datasetToday

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDateInput(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date, options = { day: '2-digit', month: 'short' }) {
  return new Intl.DateTimeFormat('en-IN', options).format(date)
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatCompactCurrency(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return formatCurrency(amount)
}

function rangeForPreset(preset) {
  const duration = preset === 'today' ? 1 : preset === '30d' ? 30 : 7
  return { start: addDays(today, -(duration - 1)), end: today }
}

function recordsInRange(records, range, dateField = 'date') {
  return records.filter((record) => record[dateField] >= range.start && record[dateField] <= range.end)
}

function precedingRange(range) {
  const duration = Math.round((range.end - range.start) / dayMs) + 1
  return { start: addDays(range.start, -duration), end: addDays(range.start, -1) }
}

function percentageChange(current, previous) {
  if (previous === 0) return current === 0 ? '0.0%' : 'New'
  const change = ((current - previous) / previous) * 100
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
}

function summarizeRange(range) {
  const leads = recordsInRange(businessDataset.leads, range, 'createdAt')
  const quotations = recordsInRange(businessDataset.quotations, range, 'quotationDate')
  const deals = recordsInRange(businessDataset.deals, range, 'dealDate')
  const orders = recordsInRange(businessDataset.orders, range, 'orderDate')
  const payments = recordsInRange(businessDataset.payments, range, 'paymentDate')
  const invoices = recordsInRange(businessDataset.invoices, range, 'invoiceDate')
  const qualifiedLeads = leads.filter((lead) => lead.status === 'Qualified')
  const convertedLeads = leads.filter((lead) => lead.status === 'Converted')
  const unqualifiedLeads = leads.filter((lead) => lead.status === 'Unqualified')
  const quotationValue = quotations.reduce((sum, quotation) => sum + quotation.amount, 0)
  const bookedRevenue = deals.filter((deal) => deal.status === 'Won').reduce((sum, deal) => sum + deal.amount, 0)
  const collectedAmount = payments.filter((payment) => payment.status === 'Successful').reduce((sum, payment) => sum + payment.amount, 0)
  const outstandingAmount = orders.reduce((sum, order) => sum + orderBalance(order), 0)
  const conversionRate = leads.length ? (convertedLeads.length / leads.length) * 100 : 0
  const metrics = [
    { label: 'New Leads', value: leads.length, icon: '↗', color: 'blue', note: 'created in period' },
    { label: 'Qualified Leads', value: qualifiedLeads.length, icon: '◎', color: 'green', note: 'created in period, currently qualified' },
    { label: 'Converted Leads', value: convertedLeads.length, icon: '✓', color: 'purple', note: 'created in period, currently converted' },
    { label: 'Unqualified Leads', value: unqualifiedLeads.length, icon: '×', color: 'orange', note: 'unqualified in period' },
    { label: 'Conversion Rate', value: conversionRate, icon: '%', color: 'blue', note: 'lead to customer', percent: true },
    { label: 'Quotations Created', value: quotations.length, icon: '▤', color: 'green', note: `${formatCompactCurrency(quotationValue)} quoted` },
    { label: 'Deals Created', value: deals.length, icon: '◇', color: 'purple', note: `${formatCompactCurrency(bookedRevenue)} won` },
    { label: 'Invoices Generated', value: invoices.length, icon: '▧', color: 'orange', note: `${formatCompactCurrency(invoices.reduce((sum, invoice) => sum + invoice.amount, 0))} invoiced` },
  ]

  return {
    leads,
    quotations,
    deals,
    orders,
    payments,
    invoices,
    metrics,
    qualifiedLeads,
    qualityQualifiedLeads: leads.filter((lead) => lead.status === 'Qualified' || lead.status === 'Converted'),
    convertedLeads,
    unqualifiedLeads,
    quotationValue,
    bookedRevenue,
    collectedAmount,
    outstandingAmount,
    conversionRate,
  }
}

function buildComparisonMetrics(current, previous) {
  const previousSummary = summarizeRange(previous)
  return current.metrics.map((metric, index) => ({
    ...metric,
    displayValue: metric.percent ? `${metric.value.toFixed(1)}%` : metric.value.toLocaleString('en-IN'),
    change: percentageChange(metric.value, previousSummary.metrics[index].value),
  }))
}

function rangeCaption(range) {
  return `${formatDate(range.start)} – ${formatDate(range.end, { day: '2-digit', month: 'short', year: 'numeric' })}`
}

function rangeFilename(range) {
  return `${dateKey(range.start)}_to_${dateKey(range.end)}`
}

function exportDashboardCsv(current, previous, range) {
  const priorRange = precedingRange(range)
  const rows = [
    ['SecureRegent Business Performance & Revenue Analytics'],
    ['Selected period', rangeCaption(range)],
    ['Comparison period', rangeCaption(priorRange)],
    ['Currency', 'INR'],
    [],
    ['KPI', 'Selected period', 'Previous period', 'Change'],
    ...current.metrics.map((metric, index) => [
      metric.label,
      metric.percent ? `${metric.value.toFixed(1)}%` : metric.value,
      previous.metrics[index].percent ? `${previous.metrics[index].value.toFixed(1)}%` : previous.metrics[index].value,
      percentageChange(metric.value, previous.metrics[index].value),
    ]),
    [],
    ['Quotation metrics', 'Value'],
    ['Quotations created', current.quotations.length],
    ['Quotation value (INR)', current.quotationValue],
    ['Accepted quotations', current.quotations.filter((quotation) => quotation.status === 'Accepted').length],
    ['Deals created', current.deals.length],
    ['Won deals', current.deals.filter((deal) => deal.status === 'Won').length],
    ['Open deals', current.deals.filter((deal) => deal.status === 'Open').length],
    ['Lost deals', current.deals.filter((deal) => deal.status === 'Lost').length],
    ['Won deal revenue (INR)', current.bookedRevenue],
    ['Invoices generated', current.invoices.length],
    ['Orders placed', current.orders.length],
    ['Order value (INR)', current.orders.reduce((sum, order) => sum + order.amount, 0)],
    ['Successful payments collected in period (INR)', current.collectedAmount],
    ['Outstanding on period orders (INR)', current.outstandingAmount],
  ]
  downloadCsv(`secureregent-dashboard-${rangeFilename(range)}.csv`, rows)
}

function exportRecordListCsv(type, records, range, title) {
  const displayType = type === 'teamRecords' ? 'team-records' : type
  const filenameTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || displayType
  const normalizedRecords = records.map((record) => {
    const recordType = type === 'teamRecords' ? record.recordType : type
    const fields = { ...record, entityType: recordType }
    if (recordType === 'orders') {
      fields.collectedAmount = record.amount - orderBalance(record)
      fields.outstandingAmount = orderBalance(record)
    }
    return fields
  })
  const headers = [...new Set(normalizedRecords.flatMap((record) => Object.keys(record)))].filter((key) => key !== 'recordType')
  const rows = [
    [`${title} · ${rangeCaption(range)}`],
    headers,
    ...normalizedRecords.map((record) => headers.map((header) => record[header])),
  ]
  downloadCsv(`secureregent-${filenameTitle}-${rangeFilename(range)}.csv`, rows)
}

function buildBuckets(records, range, valueForRecord = () => 1, dateField = 'date') {
  const days = Math.round((range.end - range.start) / dayMs) + 1
  const bucketCount = Math.min(days, 7)
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = addDays(range.start, Math.floor(index * days / bucketCount))
    const end = index === bucketCount - 1
      ? addDays(range.end, 1)
      : addDays(range.start, Math.floor((index + 1) * days / bucketCount))
    return { start, end, value: 0 }
  })

  records.forEach((record) => {
    if (record[dateField] < range.start || record[dateField] > range.end) return
    const offset = Math.round((record[dateField] - range.start) / dayMs)
    const index = Math.min(bucketCount - 1, Math.floor(offset * bucketCount / days))
    buckets[index].value += valueForRecord(record)
  })

  return buckets.map((bucket) => ({
    ...bucket,
    label: days <= 7 ? formatDate(bucket.start, { weekday: 'short' }) : formatDate(bucket.start),
  }))
}

function buildSalesSummary(summary) {
  return owners.map((owner) => {
    const leadCount = summary.leads.filter((lead) => lead.owner === owner.name).length
    const ownedDeals = summary.deals.filter((deal) => deal.owner === owner.name)
    const wonRevenue = ownedDeals.filter((deal) => deal.status === 'Won').reduce((sum, deal) => sum + deal.amount, 0)
    return {
      ...owner,
      leads: leadCount,
      deals: ownedDeals.length,
      revenue: formatCompactCurrency(wonRevenue),
      wonRevenue,
    }
  }).filter((owner) => owner.leads || owner.deals)
}

function buildRecentActivity(summary) {
  const leadsById = new Map(businessDataset.leads.map((lead) => [lead.id, lead]))
  const dealsById = new Map(businessDataset.deals.map((deal) => [deal.id, deal]))
  const ordersById = new Map(businessDataset.orders.map((order) => [order.id, order]))
  const activities = [
    ...summary.leads.map((lead) => ({ owner: lead.owner, date: lead.createdAt, tag: 'Lead', entityType: 'leads', entityId: lead.id, action: `created a lead for ${lead.company}` })),
    ...summary.quotations.map((quotation) => ({ owner: leadsById.get(quotation.leadId)?.owner, date: quotation.quotationDate, tag: 'Quotation', entityType: 'quotations', entityId: quotation.id, action: `created quotation ${quotation.id}` })),
    ...summary.deals.map((deal) => ({ owner: deal.owner, date: deal.dealDate, tag: 'Deal', entityType: 'deals', entityId: deal.id, action: `${deal.status.toLowerCase()} deal ${deal.id}` })),
    ...summary.orders.map((order) => ({ owner: leadsById.get(dealsById.get(order.dealId)?.leadId)?.owner, date: order.orderDate, tag: 'Order', entityType: 'orders', entityId: order.id, action: `created order ${order.id}` })),
    ...summary.payments.map((payment) => ({ owner: leadsById.get(dealsById.get(ordersById.get(payment.orderId)?.dealId)?.leadId)?.owner, date: payment.paymentDate, tag: 'Payment', entityType: 'payments', entityId: payment.id, action: `${payment.status.toLowerCase()} payment ${payment.id}` })),
  ]

  return activities
    .filter((activity) => activity.owner)
    .sort((first, second) => second.date - first.date)
    .slice(0, 4)
    .map((activity) => {
      const owner = owners.find((candidate) => candidate.name === activity.owner)
      return {
        initials: owner.initials,
        name: owner.name,
        action: activity.action,
        time: formatDate(activity.date, { day: '2-digit', month: 'short' }),
        color: owner.color,
        tag: activity.tag,
        entityType: activity.entityType,
        entityId: activity.entityId,
      }
    })
}

const entityLabels = {
  teamRecords: 'Team records',
  leads: 'Leads',
  quotations: 'Quotations',
  deals: 'Deals',
  orders: 'Orders',
  payments: 'Payments',
  invoices: 'Invoices',
}

const entityDateFields = {
  leads: 'createdAt',
  quotations: 'quotationDate',
  deals: 'dealDate',
  orders: 'orderDate',
  payments: 'paymentDate',
  invoices: 'invoiceDate',
}

function getEntityDate(type, record) {
  return record[entityDateFields[type]]
}

function getEntityName(type, record) {
  if (type === 'leads') return `${record.name} · ${record.company}`
  if (type === 'quotations') return `${record.id} · ${record.service}`
  if (type === 'deals') return `${record.id} · ${record.service}`
  if (type === 'orders') return record.id
  if (type === 'payments') return record.id
  return record.id
}

function getEntityStatus(type, record) {
  if (type === 'orders') return record.fulfilmentStage
  return record.status
}

function getEntityOwner(type, record) {
  if (type === 'leads' || type === 'deals') return record.owner
  if (type === 'quotations') return businessDataset.leads.find((lead) => lead.id === record.leadId)?.owner
  if (type === 'orders') {
    const deal = businessDataset.deals.find((item) => item.id === record.dealId)
    return deal?.owner
  }
  if (type === 'payments' || type === 'invoices') {
    const order = businessDataset.orders.find((item) => item.id === record.orderId)
    const deal = businessDataset.deals.find((item) => item.id === order?.dealId)
    return deal?.owner
  }
  return undefined
}

function getEntityAmount(type, record) {
  if (['quotations', 'deals', 'orders', 'payments', 'invoices'].includes(type)) return record.amount
  return undefined
}

function getRelatedGroups(type, record) {
  const dataset = businessDataset
  if (type === 'leads') {
    return [
      { type: 'quotations', label: 'Quotations for this lead', records: dataset.quotations.filter((item) => item.leadId === record.id) },
      { type: 'deals', label: 'Deals for this lead', records: dataset.deals.filter((item) => item.leadId === record.id) },
    ]
  }
  if (type === 'quotations') {
    return [
      { type: 'leads', label: 'Related lead', records: dataset.leads.filter((item) => item.id === record.leadId) },
      { type: 'deals', label: 'Related deals', records: dataset.deals.filter((item) => item.quotationId === record.id) },
    ]
  }
  if (type === 'deals') {
    return [
      { type: 'leads', label: 'Related lead', records: dataset.leads.filter((item) => item.id === record.leadId) },
      { type: 'quotations', label: 'Related quotation', records: dataset.quotations.filter((item) => item.id === record.quotationId) },
      { type: 'orders', label: 'Orders for this deal', records: dataset.orders.filter((item) => item.dealId === record.id) },
    ]
  }
  if (type === 'orders') {
    return [
      { type: 'deals', label: 'Related deal', records: dataset.deals.filter((item) => item.id === record.dealId) },
      { type: 'payments', label: 'Payments for this order', records: dataset.payments.filter((item) => item.orderId === record.id) },
      { type: 'invoices', label: 'Invoice for this order', records: dataset.invoices.filter((item) => item.orderId === record.id) },
    ]
  }
  if (type === 'payments' || type === 'invoices') {
    return [{ type: 'orders', label: 'Related order', records: dataset.orders.filter((item) => item.id === record.orderId) }]
  }
  return []
}

function recordSearchText(type, record) {
  const fields = [record.id, record.name, record.company, record.owner, record.source, record.category, record.service, record.status, record.fulfilmentStage, record.paymentMethod]
  return fields.filter(Boolean).join(' ').toLowerCase()
}

function DrilldownDialog({ stack, setStack, range, onClose }) {
  const [searchState, setSearchState] = useState({ key: '', value: '' })
  const closeButtonRef = useRef(null)
  const current = stack[stack.length - 1]
  const viewKey = `${stack.length}:${current.view}:${current.type}:${current.title}`
  const query = searchState.key === viewKey ? searchState.value : ''

  useEffect(() => {
    const previouslyFocused = document.activeElement
    return () => previouslyFocused?.focus?.()
  }, [])

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [viewKey])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(document.querySelectorAll('.drilldown-dialog button:not(:disabled), .drilldown-dialog input'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function pushList(type, records, title, related = false) {
    setStack((previous) => [...previous, { view: 'list', type, records, title, related }])
  }

  function pushRecord(type, record, related = false) {
    setStack((previous) => [...previous, { view: 'record', type, record, title: getEntityName(type, record), related }])
  }

  const matchingRecords = current.view === 'list'
    ? current.records.filter((record) => recordSearchText(current.type, record).includes(query.trim().toLowerCase()))
    : []

  return (
    <div className="drilldown-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="drilldown-dialog" role="dialog" aria-modal="true" aria-labelledby="drilldown-title">
        <header className="drilldown-header">
          <div className="drilldown-heading">
            {stack.length > 1 && <button className="drilldown-back" type="button" onClick={() => setStack((previous) => previous.slice(0, -1))} aria-label="Back to previous details">←</button>}
            <div><span className="drilldown-eyebrow">{current.view === 'record' ? `${entityLabels[current.type]} · RECORD DETAILS` : `${entityLabels[current.type]} · ${current.related ? 'RELATED RECORDS' : 'SELECTED PERIOD'}`}</span><h2 id="drilldown-title">{current.title}</h2></div>
          </div>
          <div className="drilldown-header-actions">{current.view === 'list' && <button className="drilldown-export" type="button" onClick={() => exportRecordListCsv(current.type, matchingRecords, range, current.title)} disabled={!matchingRecords.length}><span aria-hidden="true">⇩</span> CSV</button>}<button ref={closeButtonRef} className="drilldown-close" type="button" onClick={onClose} aria-label="Close details">×</button></div>
        </header>

        {current.view === 'list' ? (
          <>
            <div className="drilldown-list-meta"><span>{matchingRecords.length} {matchingRecords.length === 1 ? 'record' : 'records'}</span>{!current.related && <span>Period: {rangeCaption(range)}</span>}</div>
            <label className="drilldown-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setSearchState({ key: viewKey, value: event.target.value })} placeholder={`Search ${entityLabels[current.type].toLowerCase()}...`} aria-label={`Search ${entityLabels[current.type].toLowerCase()}`} /></label>
            <div className="drilldown-record-list" aria-live="polite">
              {matchingRecords.map((record) => {
                const type = current.type === 'teamRecords' ? record.recordType : current.type
                const historical = getEntityDate(type, record) < range.start || getEntityDate(type, record) > range.end
                const owner = getEntityOwner(type, record)
                const amount = getEntityAmount(type, record)
                return <button className="drilldown-record-row" type="button" key={`${type}-${record.id}`} onClick={() => pushRecord(type, record, current.related)}><span className="record-row-main"><strong>{getEntityName(type, record)}</strong><span>{record.id} · {formatDate(getEntityDate(type, record), { day: '2-digit', month: 'short', year: 'numeric' })}</span></span><span className="record-row-meta"><span className={`record-status status-${String(getEntityStatus(type, record)).toLowerCase().replaceAll(' ', '-')}`}>{getEntityStatus(type, record)}</span>{owner && <span>{owner}</span>}{amount !== undefined && <strong>{formatCurrency(amount)}</strong>}{historical && <span className="historical-tag">Related historical</span>}</span><span className="record-row-arrow" aria-hidden="true">›</span></button>
              })}
              {!matchingRecords.length && <div className="drilldown-empty"><span aria-hidden="true">⌕</span><strong>{query ? 'No matching records' : 'No records in this view'}</strong><p>{query ? 'Try a different search term.' : 'There are no records for this selection.'}</p></div>}
            </div>
          </>
        ) : (
          <RecordDetails type={current.type} record={current.record} range={range} pushList={pushList} />
        )}
      </section>
    </div>
  )
}

function RecordDetails({ type, record, range, pushList }) {
  const owner = getEntityOwner(type, record)
  const amount = getEntityAmount(type, record)
  const date = getEntityDate(type, record)
  const relatedGroups = getRelatedGroups(type, record)

  return (
    <div className="drilldown-detail-content">
      <div className="record-detail-summary">
        <div><span className="detail-label">RECORD ID</span><strong>{record.id}</strong></div>
        <div><span className="detail-label">DATE</span><strong>{formatDate(date, { day: '2-digit', month: 'long', year: 'numeric' })}</strong></div>
        <div><span className="detail-label">STATUS</span><strong><span className={`record-status status-${String(getEntityStatus(type, record)).toLowerCase().replaceAll(' ', '-')}`}>{getEntityStatus(type, record)}</span></strong></div>
        {owner && <div><span className="detail-label">OWNER</span><strong>{owner}</strong></div>}
        {amount !== undefined && <div><span className="detail-label">AMOUNT</span><strong>{formatCurrency(amount)}</strong></div>}
        {type === 'leads' && <><div><span className="detail-label">CONTACT</span><strong>{record.name}</strong></div><div><span className="detail-label">COMPANY</span><strong>{record.company}</strong></div><div><span className="detail-label">SOURCE</span><strong>{record.source}</strong></div><div><span className="detail-label">CATEGORY / PRIORITY</span><strong>{record.category} · {record.priority}</strong></div></>}
        {type === 'quotations' && <><div><span className="detail-label">SERVICE</span><strong>{record.service}</strong></div><div><span className="detail-label">LEAD ID</span><strong>{record.leadId}</strong></div></>}
        {type === 'deals' && <><div><span className="detail-label">SERVICE / PRIORITY</span><strong>{record.service} · {record.priority}</strong></div>{record.quotationId && <div><span className="detail-label">QUOTATION ID</span><strong>{record.quotationId}</strong></div>}<div><span className="detail-label">LEAD ID</span><strong>{record.leadId}</strong></div></>}
        {type === 'orders' && <><div><span className="detail-label">DEAL ID</span><strong>{record.dealId}</strong></div><div><span className="detail-label">COLLECTED</span><strong>{formatCurrency(record.amount - orderBalance(record))}</strong></div><div><span className="detail-label">OUTSTANDING</span><strong>{formatCurrency(orderBalance(record))}</strong></div></>}
        {type === 'payments' && <><div><span className="detail-label">ORDER ID</span><strong>{record.orderId}</strong></div><div><span className="detail-label">METHOD</span><strong>{record.paymentMethod}</strong></div></>}
        {type === 'invoices' && <><div><span className="detail-label">ORDER ID</span><strong>{record.orderId}</strong></div></>}
      </div>
      <div className="related-records">
        <div className="related-heading"><h3>Related records</h3><span>Outside-range records are marked</span></div>
        {relatedGroups.map((group) => <div className="related-group" key={`${group.type}-${group.label}`}><div className="related-group-heading"><strong>{group.label}</strong><span>{group.records.length}</span></div>{group.records.length ? <div className="related-record-buttons">{group.records.map((relatedRecord) => {
          const historical = getEntityDate(group.type, relatedRecord) < range.start || getEntityDate(group.type, relatedRecord) > range.end
          return <button className="related-record-button" type="button" key={relatedRecord.id} onClick={() => pushList(group.type, [relatedRecord], getEntityName(group.type, relatedRecord), true)}><span><strong>{getEntityName(group.type, relatedRecord)}</strong><small>{relatedRecord.id} · {formatDate(getEntityDate(group.type, relatedRecord), { day: '2-digit', month: 'short', year: 'numeric' })}{historical ? ' · Related historical' : ''}</small></span><span className="record-status">{getEntityStatus(group.type, relatedRecord)}</span><span aria-hidden="true">›</span></button>
        })}</div> : <p className="related-empty">No related {entityLabels[group.type].toLowerCase()}.</p>}</div>)}
      </div>
    </div>
  )
}

function Card({ children, className = '' }) {
  return <section className={`panel ${className}`}>{children}</section>
}

function PanelHeading({ title, subtitle, action, onAction }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <button className="text-action" type="button" onClick={onAction}>{action}<span aria-hidden="true"> ↗</span></button>}
    </div>
  )
}

function MetricCard({ metric, onClick }) {
  return (
    <button className="panel metric-card metric-card-button" type="button" onClick={onClick} aria-label={`View ${metric.label} records`}>
      <div className="metric-top">
        <span className={`metric-icon ${metric.color}`} aria-hidden="true">{metric.icon}</span>
        <span className="metric-label">{metric.label}</span>
        <span className="metric-menu" aria-hidden="true">···</span>
      </div>
      <div className="metric-value">{metric.displayValue}</div>
      <div className="metric-foot"><span className="change-pill">{metric.change}</span><span>{metric.note}</span></div>
      <div className={`metric-accent ${metric.color}`} />
    </button>
  )
}

function LeadTrendChart({ leads, range, onSelectBucket }) {
  const newLeads = buildBuckets(leads, range, () => 1, 'createdAt')
  const qualifiedLeads = buildBuckets(leads.filter((lead) => lead.status === 'Qualified'), range, () => 1, 'createdAt')
  const maximum = Math.max(1, ...newLeads.map((bucket) => bucket.value))
  const pointsFor = (buckets) => buckets.map((bucket, index) => {
    const x = buckets.length === 1 ? 189 : (index / (buckets.length - 1)) * 378
    const y = 98 - (bucket.value / maximum) * 82
    return `${x},${y}`
  }).join(' ')
  const series = [
    { name: 'New leads', color: '#4f7ff0', points: pointsFor(newLeads) },
    { name: 'Qualified', color: '#28aa83', points: pointsFor(qualifiedLeads) },
  ]
  return (
    <div className="trend-chart">
      <div className="chart-y-labels"><span>{maximum}</span><span>{Math.round(maximum * .75)}</span><span>{Math.round(maximum * .5)}</span><span>{Math.round(maximum * .25)}</span><span>0</span></div>
      <svg viewBox="0 0 378 112" role="img" aria-label="New and qualified leads trending upward through the week">
        {[10, 32, 54, 76, 98].map((y) => <line key={y} x1="0" y1={y} x2="378" y2={y} className="grid-line" />)}
        {series.map((line) => <polyline key={line.name} points={line.points} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
        {newLeads.map((bucket, index) => <circle key={bucket.label} cx={newLeads.length === 1 ? 189 : (index / (newLeads.length - 1)) * 378} cy={98 - (bucket.value / maximum) * 82} r="5" fill="#fff" stroke="#4f7ff0" strokeWidth="2" role="button" tabIndex="0" aria-label={`${bucket.label}: ${bucket.value} new leads`} onClick={() => onSelectBucket(bucket)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelectBucket(bucket) }} />)}
      </svg>
      <div className="chart-x-labels">{newLeads.map((bucket) => <span key={bucket.label}>{bucket.label}</span>)}</div>
    </div>
  )
}

function DonutChart({ segments, center, caption, onSelectSegment }) {
  const circumference = 2 * Math.PI * 37
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const slices = total ? segments.reduce((result, segment) => {
    const length = (segment.value / total) * circumference
    return {
      offset: result.offset + length,
      items: [...result.items, { ...segment, dasharray: `${length} ${circumference - length}`, dashoffset: -result.offset }],
    }
  }, { offset: 0, items: [] }).items : []
  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 100 100" role="img" aria-label={caption}>
        <circle cx="50" cy="50" r="37" fill="none" stroke="#edf1f6" strokeWidth="11" />
        {slices.map((slice) => <circle key={slice.label} cx="50" cy="50" r="37" fill="none" stroke={slice.color} strokeWidth="11" strokeDasharray={slice.dasharray} strokeDashoffset={slice.dashoffset} transform="rotate(-90 50 50)" role={onSelectSegment ? 'button' : undefined} tabIndex={onSelectSegment ? 0 : undefined} aria-label={onSelectSegment ? `View ${slice.label} records` : undefined} onClick={onSelectSegment ? () => onSelectSegment(slice.label) : undefined} onKeyDown={onSelectSegment ? (event) => { if (event.key === 'Enter' || event.key === ' ') onSelectSegment(slice.label) } : undefined} />)}
        <text x="50" y="47" textAnchor="middle" className="donut-center">{center}</text>
        <text x="50" y="60" textAnchor="middle" className="donut-caption">{caption}</text>
      </svg>
    </div>
  )
}

function LeadSourceLegend({ sources, total, onSelect }) {
  return (
    <div className="source-layout">
      <DonutChart segments={sources.map(({ name, count, color }) => ({ label: name, value: count, color }))} center={String(total)} caption="leads" />
      <div className="source-legend">
        {sources.map((source) => <button className="legend-row source-row-button" type="button" key={source.name} onClick={() => onSelect(source.name)}><span className="legend-name"><i style={{ background: source.color }} />{source.name}</span><strong>{source.count}</strong><span>{total ? Math.round(source.count / total * 100) : 0}%</span></button>)}
      </div>
    </div>
  )
}

function QuotationFunnel({ quotations, onSelect }) {
  const stageDefinitions = [
    { label: 'Created', stages: ['Draft', 'Created', 'Sent', 'Viewed', 'Accepted'], color: 'funnel-blue' },
    { label: 'Sent', stages: ['Sent', 'Viewed', 'Accepted'], color: 'funnel-green' },
    { label: 'Viewed', stages: ['Viewed', 'Accepted'], color: 'funnel-orange' },
    { label: 'Accepted', stages: ['Accepted'], color: 'funnel-purple' },
  ]
  const total = quotations.length
  const stages = stageDefinitions.map((definition) => {
    const records = quotations.filter((quotation) => definition.stages.includes(quotation.status))
    return {
      ...definition,
      count: records.length,
      amount: formatCompactCurrency(records.reduce((sum, quotation) => sum + quotation.amount, 0)),
      width: `${total ? (records.length / total) * 100 : 0}%`,
    }
  })
  return <div className="funnel-list">{stages.map((stage) => <button className="funnel-row funnel-row-button" type="button" key={stage.label} onClick={() => onSelect(stage)}><span className="funnel-label">{stage.label}</span><div className="funnel-track"><div className={stage.color} style={{ width: stage.width }} /></div><strong>{stage.count}</strong><span>{stage.amount}</span></button>)}</div>
}

function MiniBars({ values, color = 'blue' }) {
  return <div className={`mini-bars ${color}`} aria-hidden="true">{values.map((value, index) => <span key={index} style={{ height: `${value}%` }} />)}</div>
}

function OperationsSummary({ stats }) {
  return <div className="ops-stats">{stats.map((stat) => <button type="button" key={stat.label} onClick={stat.onClick}><span className={`ops-icon ${stat.color}`}>{stat.icon}</span><strong>{stat.value}</strong><small>{stat.label}</small></button>)}</div>
}

function App() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d')
  const [activeRange, setActiveRange] = useState(() => rangeForPreset('7d'))
  const [drilldownStack, setDrilldownStack] = useState([])
  const [customStart, setCustomStart] = useState(() => dateKey(addDays(today, -6)))
  const [customEnd, setCustomEnd] = useState(() => dateKey(today))
  const current = summarizeRange(activeRange)
  const previous = summarizeRange(precedingRange(activeRange))
  const metrics = buildComparisonMetrics(current, precedingRange(activeRange))
  const salesPeople = buildSalesSummary(current)
  const recentActivity = buildRecentActivity(current)
  const periodDays = Math.round((activeRange.end - activeRange.start) / dayMs) + 1
  const sourceStats = sourceOptions.map((source) => ({
    ...source,
    count: current.leads.filter((lead) => lead.source === source.name).length,
  }))
  const referralCount = sourceStats.find((source) => source.name === 'Referral')?.count ?? 0
  const previousReferralCount = previous.leads.filter((lead) => lead.source === 'Referral').length
  const leadTrendChange = percentageChange(current.leads.length, previous.leads.length)
  const quotationChange = percentageChange(current.quotationValue, previous.quotationValue)
  const revenueChange = percentageChange(current.bookedRevenue, previous.bookedRevenue)
  const quotationBuckets = buildBuckets(current.quotations, activeRange, (quotation) => quotation.amount, 'quotationDate')
  const maxQuotationBucket = Math.max(0, ...quotationBuckets.map((bucket) => bucket.value))
  const quotationBars = quotationBuckets.map((bucket) => maxQuotationBucket ? Math.max(8, (bucket.value / maxQuotationBucket) * 100) : 0)
  const acceptedQuotations = current.quotations.filter((quotation) => quotation.status === 'Accepted')
  const acceptanceRate = current.quotations.length ? Math.round((acceptedQuotations.length / current.quotations.length) * 100) : 0
  const targetAmount = periodDays * 62500
  const targetProgress = targetAmount ? Math.min(100, (current.bookedRevenue / targetAmount) * 100) : 0
  const orderStageStats = ['Processing', 'In production', 'Ready to ship', 'Delivered'].map((stage) => ({
    stage,
    count: current.orders.filter((order) => order.fulfilmentStage === stage).length,
  }))
  const maxOrderStageCount = Math.max(1, ...orderStageStats.map((stage) => stage.count))
  const orderCountChange = percentageChange(current.orders.length, previous.orders.length)
  const deliveredOrders = current.orders.filter((order) => order.fulfilmentStage === 'Delivered')
  const inProgressOrders = current.orders.filter((order) => order.fulfilmentStage !== 'Delivered')
  const paidOrders = current.orders.filter((order) => orderBalance(order) === 0)
  const fulfilmentRate = current.orders.length ? Math.round((deliveredOrders.length / current.orders.length) * 100) : 0
  const customRangeValid = Boolean(customStart && customEnd && parseDateInput(customStart) <= parseDateInput(customEnd))

  function openRecords(type, records, title, related = false) {
    setDrilldownStack([{ view: 'list', type, records, title, related }])
  }

  function openMetricRecords(metric) {
    const recordSelections = {
      'New Leads': ['leads', current.leads],
      'Qualified Leads': ['leads', current.leads.filter((lead) => lead.status === 'Qualified')],
      'Converted Leads': ['leads', current.leads.filter((lead) => lead.status === 'Converted')],
      'Unqualified Leads': ['leads', current.leads.filter((lead) => lead.status === 'Unqualified')],
      'Conversion Rate': ['leads', current.leads.filter((lead) => lead.status === 'Converted')],
      'Quotations Created': ['quotations', current.quotations],
      'Deals Created': ['deals', current.deals],
      'Invoices Generated': ['invoices', current.invoices],
    }
    const [type, records] = recordSelections[metric.label]
    openRecords(type, records, metric.label)
  }

  function closeDrilldown() {
    setDrilldownStack([])
  }

  function openTeamRecords(person) {
    const records = [
      ...current.leads.filter((lead) => lead.owner === person.name).map((record) => ({ ...record, recordType: 'leads' })),
      ...current.deals.filter((deal) => deal.owner === person.name).map((record) => ({ ...record, recordType: 'deals' })),
    ]
    openRecords('teamRecords', records, `${person.name} · team records`)
  }

  function openQuotationStage(stage) {
    openRecords('quotations', current.quotations.filter((quotation) => stage.stages.includes(quotation.status)), `${stage.label} quotations`)
  }

  function choosePreset(preset) {
    setSelectedPeriod(preset)
    setActiveRange(rangeForPreset(preset))
  }

  function applyCustomRange() {
    if (!customRangeValid) return
    setSelectedPeriod('custom')
    setActiveRange({ start: parseDateInput(customStart), end: parseDateInput(customEnd) })
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand" href="#overview" aria-label="SecureRegent dashboard home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-name">secure<span>regent</span></span>
        </a>
        <div className="topbar-divider" />
        <div className="workspace-name">Business overview <span className="chevron">⌄</span></div>
        <div className="topbar-spacer" />
        <button type="button" className="icon-button notification-button" aria-label="Notifications"><span className="bell-icon">♧</span><i /></button>
        <div className="user-profile"><div className="user-avatar">AM</div><div className="user-details"><strong>Aditya Mehra</strong><span>Administrator</span></div><span className="chevron">⌄</span></div>
      </header>

      <div className="page-content" id="overview">
        <div className="page-heading">
          <div><div className="eyebrow">{formatDate(today, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()} <span>•</span> MUMBAI, INDIA</div><h1>Business Performance <span>&amp; Revenue Analytics</span></h1><p className="page-subtitle">A clear view of your business, from first touch to final payment.</p></div>
          <button className="export-button" type="button" onClick={() => exportDashboardCsv(current, previous, activeRange)}><span aria-hidden="true">⇩</span> Export report</button>
        </div>

        <div className="toolbar">
          <div className="period-tabs" role="group" aria-label="Date range">
            <button type="button" className={selectedPeriod === 'today' ? 'selected' : ''} aria-pressed={selectedPeriod === 'today'} onClick={() => choosePreset('today')}>Today</button><button type="button" className={selectedPeriod === '7d' ? 'selected' : ''} aria-pressed={selectedPeriod === '7d'} onClick={() => choosePreset('7d')}>Last 7 Days</button><button type="button" className={selectedPeriod === '30d' ? 'selected' : ''} aria-pressed={selectedPeriod === '30d'} onClick={() => choosePreset('30d')}>Last 30 Days</button><button type="button" className={selectedPeriod === 'custom' ? 'selected' : ''} aria-pressed={selectedPeriod === 'custom'} onClick={() => setSelectedPeriod('custom')}>Custom range <span aria-hidden="true">▦</span></button>
          </div>
          <div className="toolbar-meta"><span className="live-dot" /> Comparing with {rangeCaption(precedingRange(activeRange))} <span className="toolbar-divider" /><span>{periodDays} {periodDays === 1 ? 'day' : 'days'}</span></div>
        </div>

        {selectedPeriod === 'custom' && <div className="custom-range-controls"><label>Start date<input type="date" value={customStart} max={customEnd || undefined} onChange={(event) => setCustomStart(event.target.value)} /></label><label>End date<input type="date" value={customEnd} min={customStart || undefined} max={dateKey(today)} onChange={(event) => setCustomEnd(event.target.value)} /></label><button type="button" className="apply-range-button" onClick={applyCustomRange} disabled={!customRangeValid}>Apply range</button></div>}

        <div className="section-label"><span>AT A GLANCE</span><span className="section-rule" /><span className="period-caption">{rangeCaption(activeRange).toUpperCase()}</span></div>
        <div className="metrics-grid">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} onClick={() => openMetricRecords(metric)} />)}</div>

        <div className="section-label section-label-spaced"><span>LEAD ANALYTICS</span><span className="section-rule" /><span className="period-caption">01</span></div>
        <div className="dashboard-grid lead-grid">
          <Card className="trend-panel"><PanelHeading title="Lead generation" subtitle={`${rangeCaption(activeRange)} · ${leadTrendChange} vs previous period`} action="View leads" onAction={() => openRecords('leads', current.leads, 'New leads')} /><div className="chart-legend"><button type="button" onClick={() => openRecords('leads', current.leads, 'New leads')}><i className="legend-blue" />New leads <strong>{current.leads.length}</strong></button><button type="button" onClick={() => openRecords('leads', current.qualifiedLeads, 'Qualified leads')}><i className="legend-green" />Qualified <strong>{current.qualifiedLeads.length}</strong></button></div><LeadTrendChart leads={current.leads} range={activeRange} onSelectBucket={(bucket) => openRecords('leads', current.leads.filter((lead) => lead.createdAt >= bucket.start && lead.createdAt < bucket.end), `${bucket.label} leads`)} /></Card>
          <Card className="source-panel"><PanelHeading title="Lead sources" subtitle="Sources for leads created in this period" action="Details" onAction={() => openRecords('leads', current.leads, 'Lead sources')} /><LeadSourceLegend sources={sourceStats} total={current.leads.length} onSelect={(source) => openRecords('leads', current.leads.filter((lead) => lead.source === source), `${source} leads`)} /><div className="source-insight"><span className="insight-icon">↗</span><span>Referral leads <strong>{percentageChange(referralCount, previousReferralCount)}</strong> vs previous period</span></div></Card>
          <Card className="quality-panel"><PanelHeading title="Lead quality" subtitle="Qualification breakdown for this period" action="All leads" onAction={() => openRecords('leads', current.leads, 'Lead quality')} /><div className="quality-score"><DonutChart segments={[{ label: 'Qualified', value: current.qualityQualifiedLeads.length, color: '#28aa83' }, { label: 'In progress', value: current.leads.filter((lead) => lead.status === 'In progress').length, color: '#4f7ff0' }, { label: 'Unqualified', value: current.unqualifiedLeads.length, color: '#f2a54a' }]} center={`${current.leads.length ? Math.round((current.qualityQualifiedLeads.length / current.leads.length) * 100) : 0}%`} caption="qualified" onSelectSegment={(segment) => openRecords('leads', segment === 'Qualified' ? current.qualityQualifiedLeads : current.leads.filter((lead) => lead.status === segment), `${segment} leads`)} /><div className="quality-list"><button type="button" onClick={() => openRecords('leads', current.qualityQualifiedLeads, 'Qualified leads')}><i className="legend-green" />Qualified <strong>{current.qualityQualifiedLeads.length}</strong></button><button type="button" onClick={() => openRecords('leads', current.leads.filter((lead) => lead.status === 'In progress'), 'Leads in progress')}><i className="legend-blue" />In progress <strong>{current.leads.filter((lead) => lead.status === 'In progress').length}</strong></button><button type="button" onClick={() => openRecords('leads', current.unqualifiedLeads, 'Unqualified leads')}><i className="legend-orange" />Unqualified <strong>{current.unqualifiedLeads.length}</strong></button></div></div></Card>
        </div>

        <div className="section-label section-label-spaced"><span>QUOTATION ANALYTICS &amp; REVENUE</span><span className="section-rule" /><span className="period-caption">02</span></div>
        <div className="dashboard-grid revenue-grid">
          <Card className="funnel-panel"><PanelHeading title="Quotation pipeline" subtitle={`${current.quotations.length} quotations · ${formatCompactCurrency(current.quotationValue)} total value`} action="All quotations" onAction={() => openRecords('quotations', current.quotations, 'Quotations')} /><QuotationFunnel quotations={current.quotations} onSelect={openQuotationStage} /><div className="panel-footnote"><span>Acceptance rate</span><strong>{acceptanceRate}% <span className="positive-text">{percentageChange(acceptanceRate, previous.quotations.length ? Math.round((previous.quotations.filter((quotation) => quotation.status === 'Accepted').length / previous.quotations.length) * 100) : 0)} vs prior</span></strong></div></Card>
          <Card className="revenue-panel"><PanelHeading title="Deals &amp; revenue" subtitle={`Booked revenue · ${rangeCaption(activeRange)}`} action="Deal report" onAction={() => openRecords('deals', current.deals, 'Deals')} /><div className="revenue-summary"><div><span className="summary-label">Revenue booked</span><strong>{formatCompactCurrency(current.bookedRevenue)}</strong><span className="positive-text">{revenueChange} <span className="muted-text">vs previous period</span></span></div><div className="target-ring"><DonutChart segments={[{ label: 'Achieved', value: targetProgress, color: '#4f7ff0' }, { label: 'Remaining', value: 100 - targetProgress, color: '#eaf0fa' }]} center={`${Math.round(targetProgress)}%`} caption="of target" /></div></div><div className="target-progress"><div><span>Period target</span><strong>{formatCompactCurrency(targetAmount)}</strong></div><div className="progress-track"><span style={{ width: `${targetProgress}%` }} /></div><div className="progress-ticks"><span>₹0</span><span>{formatCompactCurrency(targetAmount / 2)}</span><span>{formatCompactCurrency(targetAmount)}</span></div></div><div className="revenue-bottom"><button type="button" onClick={() => openRecords('payments', current.payments.filter((payment) => payment.status === 'Successful'), 'Successful payments')}><i className="legend-green" />Collected <strong>{formatCompactCurrency(current.collectedAmount)}</strong></button><button type="button" onClick={() => openRecords('orders', current.orders.filter((order) => orderBalance(order) > 0), 'Orders with outstanding balances')}><i className="legend-orange" />Outstanding <strong>{formatCompactCurrency(current.outstandingAmount)}</strong></button></div></Card>
          <Card className="quotation-value-panel"><PanelHeading title="Quotation value" subtitle={`${rangeCaption(activeRange)} · ${quotationChange} vs previous period`} action="View quotations" onAction={() => openRecords('quotations', current.quotations, 'Quotation value')} /><strong className="big-amount">{formatCompactCurrency(current.quotationValue)}</strong><span className="positive-text">{current.quotations.length} quotations <span className="muted-text">in selected period</span></span><MiniBars values={quotationBars} color="green" /><div className="mini-chart-labels">{quotationBuckets.map((bucket) => <span key={bucket.label}>{bucket.label}</span>)}</div></Card>
        </div>

        <div className="section-label section-label-spaced"><span>TEAM &amp; OPERATIONS</span><span className="section-rule" /><span className="period-caption">03</span></div>
        <div className="dashboard-grid team-grid">
          <Card className="sales-team-panel"><PanelHeading title="Sales team activity" subtitle={`Owner performance · ${rangeCaption(activeRange)}`} action="Team report" onAction={() => openRecords('teamRecords', salesPeople.flatMap((person) => [...current.leads.filter((lead) => lead.owner === person.name).map((record) => ({ ...record, recordType: 'leads' })), ...current.deals.filter((deal) => deal.owner === person.name).map((record) => ({ ...record, recordType: 'deals' }))]), 'Sales team records')} /><div className="table-wrap"><table><thead><tr><th>TEAM MEMBER</th><th>LEADS</th><th>DEALS</th><th>REVENUE</th></tr></thead><tbody>{salesPeople.map((person) => <tr key={person.name}><td><button type="button" className="team-person-button" onClick={() => openTeamRecords(person)}><span className={`person-avatar ${person.color}`}>{person.initials}</span><span><strong>{person.name}</strong><small>{person.role}</small></span></button></td><td>{person.leads}</td><td><span className="deal-count">{person.deals}</span></td><td className="table-amount">{person.revenue}</td></tr>)}</tbody></table></div><div className="team-total"><span>Team total <strong>{salesPeople.reduce((sum, person) => sum + person.leads, 0)} leads</strong></span><strong>{formatCompactCurrency(salesPeople.reduce((sum, person) => sum + person.wonRevenue, 0))}</strong></div></Card>
          <Card className="operations-panel"><PanelHeading title="Operations team" subtitle={`Order operations · ${rangeCaption(activeRange)}`} action="All orders" onAction={() => openRecords('orders', current.orders, 'Orders')} /><OperationsSummary stats={[{ icon: '✓', color: 'blue', value: deliveredOrders.length, label: 'Delivered', onClick: () => openRecords('orders', deliveredOrders, 'Delivered orders') }, { icon: '◷', color: 'orange', value: inProgressOrders.length, label: 'In progress', onClick: () => openRecords('orders', inProgressOrders, 'Orders in progress') }, { icon: '↗', color: 'green', value: paidOrders.length, label: 'Fully paid', onClick: () => openRecords('orders', paidOrders, 'Fully paid orders') }]} /><div className="ops-progress"><div><span>Fulfilment completion</span><strong>{deliveredOrders.length} / {current.orders.length} orders</strong></div><div className="progress-track"><span style={{ width: `${fulfilmentRate}%`, background: '#28aa83' }} /></div></div><div className="task-avatars"><span className="person-avatar blue">NK</span><span className="person-avatar purple">VP</span><span className="person-avatar green">DS</span><span className="more-people">+4</span><span className="task-assignees">Operations team</span></div></Card>
          <Card className="orders-panel"><PanelHeading title="Orders &amp; stage progress" subtitle={`Orders placed · ${rangeCaption(activeRange)}`} action="All orders" onAction={() => openRecords('orders', current.orders, 'Orders')} /><div className="order-summary"><strong>{current.orders.length}</strong><span>orders placed</span><span className="order-change">{orderCountChange} vs prior</span></div><div className="stage-list">{orderStageStats.map((stage, index) => <button type="button" className="stage-row stage-row-button" key={stage.stage} onClick={() => openRecords('orders', current.orders.filter((order) => order.fulfilmentStage === stage.stage), `${stage.stage} orders`)}><span>{stage.stage}</span><div className="stage-track"><span className={['stage-processing', 'stage-production', 'stage-ready', 'stage-delivered'][index]} style={{ width: `${(stage.count / maxOrderStageCount) * 100}%` }} /></div><strong>{stage.count}</strong></button>)}</div></Card>
          <Card className="activity-panel"><PanelHeading title="Recent CRM activity" subtitle="Latest updates across your workspace" action="Activity log" onAction={() => openRecords('teamRecords', recentActivity.map((activity) => ({ ...businessDataset[activity.entityType].find((record) => record.id === activity.entityId), recordType: activity.entityType })), 'Recent CRM activity')} /><div className="activity-list">{recentActivity.map((activity) => <button type="button" className="activity-row activity-row-button" key={`${activity.name}-${activity.action}`} onClick={() => openRecords(activity.entityType, businessDataset[activity.entityType].filter((record) => record.id === activity.entityId), activity.action)}><span className={`person-avatar ${activity.color}`}>{activity.initials}</span><span className="activity-copy"><span className="activity-copy-text"><strong>{activity.name}</strong> {activity.action}</span><span className={`activity-tag ${activity.color}`}>{activity.tag}</span></span><time>{activity.time}</time></button>)}</div></Card>
        </div>
        <footer className="page-footer"><span>© 2026 SecureRegent Private Limited</span><span>All figures in Indian Rupees <i /> Last synced at 10:42 AM IST</span></footer>
      </div>
      {drilldownStack.length > 0 && <DrilldownDialog stack={drilldownStack} setStack={setDrilldownStack} range={activeRange} onClose={closeDrilldown} />}
    </main>
  )
}

export default App
