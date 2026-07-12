import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts"

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function TrendCard({ title, stats, chartData, color = "#16a34a" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-2 mb-4 text-sm">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-gray-500">{s.label}</span>
            <span className="font-medium text-gray-900 flex items-center gap-1.5">
              {formatINR(s.value)}
              {s.trendPct !== undefined && s.trendPct !== null && (
                <span className={`text-xs font-medium ${s.trendPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {s.trendPct >= 0 ? "+" : ""}
                  {s.trendPct.toFixed(1)}%
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      {chartData.length > 1 && (
        <div style={{ width: "100%", height: 140 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}