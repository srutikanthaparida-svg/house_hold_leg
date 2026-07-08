// Standard reducing-balance EMI formula
export function calculateEMI(principal, annualRatePct, tenureMonths) {
  const r = annualRatePct / 12 / 100
  if (r === 0) return principal / tenureMonths
  const factor = Math.pow(1 + r, tenureMonths)
  return (principal * r * factor) / (factor - 1)
}

// How many full EMI months have elapsed since the loan started (capped at tenure)
export function monthsElapsed(startDate, tenureMonths) {
  const start = new Date(startDate)
  const now = new Date()
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  return Math.min(Math.max(months, 0), tenureMonths)
}

// Outstanding principal remaining after `monthsPaid` EMIs
export function calculateOutstanding(principal, annualRatePct, tenureMonths, monthsPaid) {
  const r = annualRatePct / 12 / 100
  if (monthsPaid >= tenureMonths) return 0
  if (r === 0) return Math.max(principal - (principal / tenureMonths) * monthsPaid, 0)
  const emi = calculateEMI(principal, annualRatePct, tenureMonths)
  const factor = Math.pow(1 + r, monthsPaid)
  const outstanding = principal * factor - emi * ((factor - 1) / r)
  return Math.max(outstanding, 0)
}

// Simulates month-by-month balance using the ACTUAL payment amount (which may
// differ from the scheduled EMI). Handles both overpayment (faster payoff)
// and underpayment (balance may not fully amortize).
export function simulateActualOutstanding(principal, annualRatePct, actualPayment, monthsPaid) {
  const r = annualRatePct / 12 / 100
  let balance = principal
  for (let i = 0; i < monthsPaid; i++) {
    if (balance <= 0) return 0
    const interest = balance * r
    const principalPaid = actualPayment - interest
    balance = balance - principalPaid
  }
  return Math.max(balance, 0)
}

// Given a current balance and a fixed actual payment, how many more months
// until it's paid off? Returns null if the payment doesn't even cover
// monthly interest (balance would never shrink).
export function remainingMonthsAtPayment(balance, annualRatePct, actualPayment) {
  const r = annualRatePct / 12 / 100
  if (balance <= 0) return 0
  if (r === 0) return Math.ceil(balance / actualPayment)
  const monthlyInterest = balance * r
  if (actualPayment <= monthlyInterest) return null
  const n = -Math.log(1 - (r * balance) / actualPayment) / Math.log(1 + r)
  return Math.ceil(n)
}