import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

const COLORS = [
  "#22c55e",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#06b6d4",
  "#ef4444",
]

// Expects `transactions` to already be filtered to the relevant type.
// `valueKey` lets Investments use current_value instead of amount.
export default function CategoryBreakdownChart({ transactions = [], title = "Breakdown", valueKey = "amount" }) {
  const byCategory = transactions.reduce((acc, t) => {
    const value = Number(t[valueKey] ?? t.amount) || 0
    const existing = acc.find((item) => item.name === t.category)
    if (existing) {
      existing.value += value
    } else {
      acc.push({ name: t.category, value })
    }
    return acc
  }, [])

  if (byCategory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <p className="text-gray-500 text-center py-8">No data yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={byCategory}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {byCategory.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}