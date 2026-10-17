const dayMs = 24 * 60 * 60 * 1000
const today = startOfDay(new Date())

export const sourceOptions = [
  { name: 'Website', color: '#4f7ff0' },
  { name: 'Referral', color: '#28aa83' },
  { name: 'LinkedIn', color: '#f2a54a' },
  { name: 'Other', color: '#9a78db' },
]

export const owners = [
  { name: 'Aarav Shah', initials: 'AS', role: 'Enterprise', color: 'blue' },
  { name: 'Priya Mehta', initials: 'PM', role: 'Mid-market', color: 'purple' },
  { name: 'Rohan Kapoor', initials: 'RK', role: 'SMB', color: 'green' },
  { name: 'Neha Kulkarni', initials: 'NK', role: 'Strategic accounts', color: 'orange' },
  { name: 'Vikram Patel', initials: 'VP', role: 'Enterprise', color: 'blue' },
]

const names = ['Ananya Rao', 'Kabir Malhotra', 'Ishita Nair', 'Dev Menon', 'Meera Iyer', 'Arjun Desai', 'Sana Khan', 'Rahul Joshi', 'Nisha Reddy', 'Karan Bhatia', 'Tara Kapoor', 'Ayaan Shah']
const companies = ['Meridian Labs', 'Northstar Logistics', 'BluePeak Retail', 'Cedar Finance', 'Aster Health', 'Orbit Systems', 'Summit Foods', 'Verve Technologies', 'Indigo Estates', 'Pioneer Manufacturing', 'Crestline Media', 'Evergreen Energy']
const categories = ['Cloud Security', 'Managed IT', 'Risk Advisory', 'Data Protection', 'Compliance Suite']
const priorities = ['High', 'Medium', 'Low']
const quotationStatuses = ['Draft', 'Sent', 'Viewed', 'Accepted']
const paymentMethods = ['Bank transfer', 'UPI', 'Credit card', 'NEFT']
const orderStages = ['Processing', 'In production', 'Ready to ship', 'Delivered']

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function cappedDate(date) {
  return date > today ? today : date
}

function createBusinessDataset() {
  const leads = []
  const quotations = []
  const deals = []
  const orders = []
  const payments = []
  const invoices = []
  let leadSequence = 1
  let quotationSequence = 1
  let dealSequence = 1
  let orderSequence = 1
  let paymentSequence = 1
  let invoiceSequence = 1

  for (let dayOffset = -119; dayOffset <= 0; dayOffset += 1) {
    const dayIndex = Math.abs(dayOffset)
    const createdAt = addDays(today, dayOffset)
    const leadCount = 3 + ((dayIndex * 7 + 2) % 5)

    for (let leadIndex = 0; leadIndex < leadCount; leadIndex += 1) {
      const seed = dayIndex * 11 + leadIndex * 7
      const lead = {
        id: `LD-${String(leadSequence).padStart(5, '0')}`,
        name: names[seed % names.length],
        company: companies[(seed + leadIndex) % companies.length],
        source: sourceOptions[(seed + dayIndex) % sourceOptions.length].name,
        createdAt,
        status: seed % 13 < 2 ? 'Converted' : seed % 13 < 4 ? 'Unqualified' : seed % 13 < 9 ? 'Qualified' : 'In progress',
        owner: owners[(seed + leadIndex * 2) % owners.length].name,
        category: categories[(seed + 2) % categories.length],
        priority: priorities[(seed + dayIndex) % priorities.length],
      }
      leads.push(lead)
      leadSequence += 1

      const quotationCount = (seed + 1) % 4 === 0 ? 0 : 1 + (seed % 3 === 0 ? 1 : 0)
      const leadQuotations = []
      for (let quoteIndex = 0; quoteIndex < quotationCount; quoteIndex += 1) {
        const quotationDate = cappedDate(addDays(createdAt, (seed + quoteIndex * 3) % 9))
        const quotation = {
          id: `QT-${String(quotationSequence).padStart(5, '0')}`,
          leadId: lead.id,
          quotationDate,
          service: categories[(seed + quoteIndex) % categories.length],
          amount: 35000 + ((seed * 7919 + quoteIndex * 17431) % 265000),
          status: quotationStatuses[(seed + quoteIndex * 2) % quotationStatuses.length],
        }
        quotations.push(quotation)
        leadQuotations.push(quotation)
        quotationSequence += 1
      }

      if (lead.status !== 'Converted' && lead.status !== 'Qualified') continue
      const dealCount = lead.status === 'Converted' && seed % 5 === 0 ? 2 : 1
      for (let dealIndex = 0; dealIndex < dealCount; dealIndex += 1) {
        const dealDate = cappedDate(addDays(createdAt, 2 + ((seed + dealIndex * 5) % 18)))
        const eligibleQuotation = leadQuotations.find((quotation) => quotation.status === 'Accepted' && quotation.quotationDate <= dealDate)
          ?? leadQuotations.find((quotation) => quotation.quotationDate <= dealDate)
        const status = lead.status === 'Converted' ? 'Won' : ['Open', 'Lost', 'Won'][(seed + dealIndex) % 3]
        const deal = {
          id: `DL-${String(dealSequence).padStart(5, '0')}`,
          leadId: lead.id,
          quotationId: eligibleQuotation?.id ?? null,
          dealDate,
          service: lead.category,
          amount: eligibleQuotation
            ? Math.max(30000, Math.round(eligibleQuotation.amount * (0.88 + (seed % 21) / 100)))
            : 48000 + ((seed * 12113 + dealIndex * 29831) % 385000),
          priority: lead.priority,
          owner: lead.owner,
          status,
        }
        deals.push(deal)
        dealSequence += 1

        if (deal.status !== 'Won') continue
        const orderCount = seed % 4 === 0 ? 2 : 1
        let remainingDealValue = deal.amount
        for (let orderIndex = 0; orderIndex < orderCount; orderIndex += 1) {
          const remainingOrders = orderCount - orderIndex
          const amount = orderIndex === orderCount - 1
            ? remainingDealValue
            : Math.floor(remainingDealValue / remainingOrders / 1000) * 1000
          remainingDealValue -= amount
          const orderDate = cappedDate(addDays(dealDate, (seed + orderIndex * 4) % 9))
          const age = Math.round((today - orderDate) / dayMs)
          const order = {
            id: `OR-${String(orderSequence).padStart(5, '0')}`,
            dealId: deal.id,
            orderDate,
            amount,
            fulfilmentStage: age > 24 ? 'Delivered' : age > 14 ? 'Ready to ship' : age > 6 ? 'In production' : orderStages[seed % orderStages.length],
          }
          orders.push(order)
          orderSequence += 1

          let remainingBalance = order.amount
          let successfulAmount = 0
          const installmentCount = seed % 3 === 0 ? 3 : 2
          for (let installmentIndex = 0; installmentIndex < installmentCount; installmentIndex += 1) {
            const installmentAmount = installmentIndex === installmentCount - 1
              ? remainingBalance
              : Math.min(remainingBalance, Math.floor(order.amount * (installmentIndex === 0 ? 0.45 : 0.3)))
            remainingBalance -= installmentAmount
            const paymentDate = cappedDate(addDays(orderDate, installmentIndex * (7 + (seed % 9))))
            const paymentStatus = installmentIndex === 0 || seed % 4 === 0 ? 'Successful' : 'Pending'
            if (paymentStatus === 'Successful') successfulAmount += installmentAmount
            payments.push({
              id: `PY-${String(paymentSequence).padStart(5, '0')}`,
              orderId: order.id,
              paymentDate,
              amount: installmentAmount,
              paymentMethod: paymentMethods[(seed + installmentIndex) % paymentMethods.length],
              status: paymentStatus,
            })
            paymentSequence += 1
          }

          invoices.push({
            id: `IN-${String(invoiceSequence).padStart(5, '0')}`,
            orderId: order.id,
            invoiceDate: orderDate,
            amount: order.amount,
            status: successfulAmount >= order.amount ? 'Paid' : successfulAmount > 0 ? 'Partially paid' : 'Issued',
          })
          invoiceSequence += 1
        }
      }
    }
  }

  return { leads, quotations, deals, orders, payments, invoices }
}

export const businessDataset = createBusinessDataset()
export const datasetToday = today

export function successfulPaymentsForOrder(orderId) {
  return businessDataset.payments
    .filter((payment) => payment.orderId === orderId && payment.status === 'Successful')
    .reduce((total, payment) => total + payment.amount, 0)
}

export function orderBalance(order) {
  return Math.max(0, order.amount - successfulPaymentsForOrder(order.id))
}

export function validateBusinessDataset(dataset = businessDataset) {
  const allRecords = [dataset.leads, dataset.quotations, dataset.deals, dataset.orders, dataset.payments, dataset.invoices].flat()
  const idsUnique = new Set(allRecords.map((record) => record.id)).size === allRecords.length
  const leadIds = new Set(dataset.leads.map((lead) => lead.id))
  const quotationsById = new Map(dataset.quotations.map((quotation) => [quotation.id, quotation]))
  const dealIds = new Set(dataset.deals.map((deal) => deal.id))
  const orderIds = new Set(dataset.orders.map((order) => order.id))

  return {
    uniqueIds: idsUnique,
    validQuotationLeads: dataset.quotations.every((quotation) => leadIds.has(quotation.leadId)),
    validDealLinks: dataset.deals.every((deal) => leadIds.has(deal.leadId) && (!deal.quotationId || quotationsById.get(deal.quotationId)?.leadId === deal.leadId)),
    validOrderDeals: dataset.orders.every((order) => dealIds.has(order.dealId)),
    validPaymentOrders: dataset.payments.every((payment) => orderIds.has(payment.orderId)),
    validInvoiceOrders: dataset.invoices.every((invoice) => orderIds.has(invoice.orderId)),
    successfulPaymentsWithinOrder: dataset.orders.every((order) => {
      const collected = dataset.payments
        .filter((payment) => payment.orderId === order.id && payment.status === 'Successful')
        .reduce((total, payment) => total + payment.amount, 0)
      return collected <= order.amount
    }),
    nonNegativeBalances: dataset.orders.every((order) => orderBalance(order) >= 0),
    orderValuesMatchDeals: dataset.deals.filter((deal) => deal.status === 'Won').every((deal) => {
      const linkedOrders = dataset.orders.filter((order) => order.dealId === deal.id)
      return linkedOrders.length > 0 && linkedOrders.reduce((total, order) => total + order.amount, 0) === deal.amount
    }),
  }
}
