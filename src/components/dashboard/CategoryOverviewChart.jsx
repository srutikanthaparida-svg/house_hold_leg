import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function CategoryOverviewChart({ monthlyData, yearlyData, color = "#16a34a", label = "Income" }) {
  const [view, setView] = useState("monthly")
  const data = view === "monthly" ? monthlyData : yearlyData

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{label} Overview</h3>
        <div className="flex bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setView("monthly")}
            className={`px-3 py-1 text-xs font-medium rounded-full transition ${
              view === "monthly" ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setView("yearly")}
            className={`px-3 py-1 text-xs font-medium rounded-full transition ${
              view === "yearly" ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-gray-400 text-center py-10 text-sm">No data yet</p>
      ) : (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Bar dataKey="value" name={label} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}