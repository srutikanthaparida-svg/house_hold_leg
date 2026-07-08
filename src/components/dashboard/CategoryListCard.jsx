function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

const TONE_BAR = {
  green: "bg-green-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
}

export function CategoryListCard({ title, icon: Icon, tone = "blue", total, items, onViewDetails }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={16} className="text-gray-500" />}
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-1">Total</p>
      <p className="text-xl font-bold text-gray-900 mb-4">{formatINR(total)}</p>

      <div className="space-y-3 flex-1">
        {items.length === 0 ? (
          <p className="text-gray-400 text-sm">No data yet</p>
        ) : (
          items.slice(0, 4).map((item) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0
            return (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 truncate">{item.name}</span>
                  <span className="text-gray-900 font-medium">{formatINR(item.value)}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${TONE_BAR[tone]}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(1)}%</p>
              </div>
            )
          })
        )}
      </div>

      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="mt-4 text-sm text-center border border-gray-200 rounded-lg py-2 text-gray-600 hover:bg-gray-50 transition"
        >
          View Details
        </button>
      )}
    </div>
  )
}

export function LoanDetailCard({ loans, onViewDetails }) {
  const totalOutstanding = loans.reduce((sum, l) => sum + l.outstanding, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
      <h3 className="font-semibold text-gray-900 mb-1">Loans</h3>
      <p className="text-xs text-gray-400 mb-1">Total Outstanding</p>
      <p className="text-xl font-bold text-gray-900 mb-4">{formatINR(totalOutstanding)}</p>

      <div className="space-y-2 flex-1 text-sm">
        {loans.length === 0 ? (
          <p className="text-gray-400">No loans yet</p>
        ) : (
          loans.slice(0, 1).map((loan) => (
            <div key={loan.id} className="space-y-1">
              <p className="font-medium text-gray-900">{loan.lender}</p>
              <div className="flex justify-between text-gray-500">
                <span>Loan Amount</span>
                <span className="text-gray-900">{formatINR(loan.principal_amount)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Interest Rate (p.a.)</span>
                <span className="text-gray-900">{loan.interest_rate}%</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>EMI (Actual)</span>
                <span className="text-gray-900">{formatINR(loan.actualPayment)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Outstanding</span>
                <span className="text-gray-900">{formatINR(loan.outstanding)}</span>
              </div>
              {loan.hasCustomPayment && (
                <p className={`text-xs font-medium ${loan.balanceImpact >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {loan.balanceImpact >= 0 ? "You are ahead by " : "You are behind by "}
                  {formatINR(Math.abs(loan.balanceImpact))}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="mt-4 text-sm text-center border border-gray-200 rounded-lg py-2 text-gray-600 hover:bg-gray-50 transition"
        >
          View Details
        </button>
      )}
    </div>
  )
}