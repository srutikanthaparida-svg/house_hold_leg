import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts"
import { Award, AlertTriangle } from "lucide-react"

export default function MonthComparisonCard({ monthlyTrend }) {
  const withRate = monthlyTrend.map((m) => ({
    ...m,
    savingsRate: m.income > 0 ? ((m.income - m.expenses) / m.income) * 100 : null,
  }))

  const withData = withRate.filter((m) => m.savingsRate !== null)
  const best = withData.reduce((b, m) => (m.savingsRate > (b?.savingsRate ?? -Infinity) ? m : b), null)
  const worst = withData.reduce((w, m) => (m.savingsRate < (w?.savingsRate ?? Infinity) ? m : w), null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-1">Monthly Comparison</h3>
      <p className="text-xs text-gray-400 mb-4">Savings rate by month - which months were well spent?</p>

      {withData.length === 0 ? (
        <p className="text-gray-400 text-center py-10 text-sm">No data yet</p>
      ) : (
        <>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={withRate}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={(v) => (v !== null ? `${v.toFixed(1)}%` : "No data")} />
                <Bar dataKey="savingsRate" radius={[4, 4, 0, 0]}>
                  {withRate.map((m, i) => (
                    <Cell
                      key={i}
                      fill={
                        best && m.month === best.month
                          ? "#16a34a"
                          : worst && best && m.month === worst.month && worst.month !== best.month
                          ? "#dc2626"
                          : "#94a3b8"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {best && (
              <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
                <Award size={16} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-xs text-green-700">Best month</p>
                  <p className="text-sm font-semibold text-green-800">
                    {best.month} - {best.savingsRate.toFixed(1)}% saved
                  </p>
                </div>
              </div>
            )}
            {worst && best && worst.month !== best.month && (
              <div className="bg-red-50 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
                <div>
                  <p className="text-xs text-red-700">Needs improvement</p>
                  <p className="text-sm font-semibold text-red-800">
                    {worst.month} - {worst.savingsRate.toFixed(1)}% saved
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}