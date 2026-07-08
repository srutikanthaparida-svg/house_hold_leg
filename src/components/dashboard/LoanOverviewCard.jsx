import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function LoanOverviewCard({ totalOutstanding, totalActualEMI, adjustedOutstanding, aheadBy, trend }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Loan Overview</h3>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-400">Total Outstanding</p>
          <p className="font-bold text-gray-900 text-lg">{formatINR(totalOutstanding)}</p>
        </div>
        <div>
          <p className="text-gray-400">Total EMI (Actual)</p>
          <p className="font-medium text-gray-900">{formatINR(totalActualEMI)}</p>
        </div>
        <div>
          <p className="text-gray-400">Adjusted Outstanding</p>
          <p className="font-medium text-gray-900">{formatINR(adjustedOutstanding)}</p>
        </div>
        <div>
          <p className="text-gray-400">Status</p>
          <p className={`font-medium ${aheadBy >= 0 ? "text-green-600" : "text-red-600"}`}>
            {aheadBy >= 0 ? `You are ahead by ${formatINR(aheadBy)}` : `You are behind by ${formatINR(Math.abs(aheadBy))}`}
          </p>
        </div>
      </div>

      {trend.length > 1 && (
        <div style={{ width: "100%", height: 160 }}>
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Line type="monotone" dataKey="outstanding" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}