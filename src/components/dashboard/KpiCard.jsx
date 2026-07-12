import { LineChart, Line, ResponsiveContainer } from "recharts"
import { ArrowUp, ArrowDown } from "lucide-react"

const TONE_STYLES = {
  green: { bg: "bg-green-50", text: "text-green-600", line: "#16a34a" },
  red: { bg: "bg-red-50", text: "text-red-600", line: "#dc2626" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", line: "#2563eb" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", line: "#7c3aed" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", line: "#d97706" },
}

export default function KpiCard({ label, value, icon: Icon, tone = "blue", trendPct, trendLabel, sparkline = [] }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.blue
  const isUp = trendPct >= 0
  const chartData = sparkline.map((v, i) => ({ i, v }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full ${styles.bg} flex items-center justify-center`}>
            <Icon size={16} className={styles.text} />
          </div>
          <span className="text-sm text-gray-500">{label}</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      {trendPct !== undefined && trendPct !== null && (
        <div className="flex items-center gap-1 text-xs mb-2">
          <span className={`flex items-center gap-0.5 font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
            {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(trendPct).toFixed(1)}%
          </span>
          <span className="text-gray-400">{trendLabel || "vs last month"}</span>
        </div>
      )}
      {chartData.length > 1 && (
        <div style={{ width: "100%", height: 32 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="v" stroke={styles.line} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}