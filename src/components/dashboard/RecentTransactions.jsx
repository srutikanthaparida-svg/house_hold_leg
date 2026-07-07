export default function RecentTransactions({ transactions = [], loading = false }) {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const recentTransactions = transactions.slice(0, 5)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
        <p className="text-gray-500 text-center py-8">Loading...</p>
      </div>
    )
  }

  if (recentTransactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
        <p className="text-gray-500 text-center py-8">No transactions yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
      <div className="space-y-3">
        {recentTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between py-3 border-b last:border-b-0"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{transaction.category}</p>
              <p className="text-sm text-gray-500">{transaction.account}</p>
              <p className="text-xs text-gray-400">{formatDate(transaction.transaction_date)}</p>
            </div>
            <div className="text-right">
              <p
                className={`font-semibold ${
                  transaction.type === "income" ? "text-green-600" : "text-red-600"
                }`}
              >
                {transaction.type === "income" ? "+" : "-"}${transaction.amount.toFixed(2)}
              </p>
              {transaction.description && (
                <p className="text-xs text-gray-500">{transaction.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
