import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const DEFAULT_COLORS = ["#7c3aed", "#2563eb", "#0ea5e9", "#22c55e", "#f97316", "#ec4899", "#eab308", "#64748b"]

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function DonutChart({ title, data, colors = DEFAULT_COLORS, centerLabel = "Total" }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-400 text-center py-10 text-sm">No data yet</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-400">{centerLabel}</span>
              <span className="text-sm font-bold text-gray-900">{formatINR(total)}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2 text-sm">
            {data.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
                  <span className="text-gray-600 truncate">{entry.name}</span>
                </div>
                <span className="text-gray-900 font-medium shrink-0 ml-2">
                  {total > 0 ? `${((entry.value / total) * 100).toFixed(1)}%` : "0%"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}