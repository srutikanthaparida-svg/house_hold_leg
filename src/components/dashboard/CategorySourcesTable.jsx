function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function CategorySourcesTable({ title, rows, totalThisMonth, totalLastMonth, onAddClick, addLabel }) {
  const totalChangePct = totalLastMonth > 0 ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="text-sm font-medium text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition"
          >
            + {addLabel || "Add"}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-400 text-center py-8 text-sm">No entries yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b">
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium text-right">This Month</th>
                <th className="pb-2 font-medium text-right">Last Month</th>
                <th className="pb-2 font-medium text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b last:border-0">
                  <td className="py-3 font-medium text-gray-900">{row.name}</td>
                  <td className="py-3 text-right text-gray-900">{formatINR(row.thisMonth)}</td>
                  <td className="py-3 text-right text-gray-500">{formatINR(row.lastMonth)}</td>
                  <td
                    className={`py-3 text-right font-medium ${
                      row.changePct > 0 ? "text-green-600" : row.changePct < 0 ? "text-red-600" : "text-gray-400"
                    }`}
                  >
                    {row.lastMonth > 0 ? `${row.changePct >= 0 ? "+" : ""}${row.changePct.toFixed(1)}%` : "-"}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="py-3 text-gray-900">Total</td>
                <td className="py-3 text-right text-gray-900">{formatINR(totalThisMonth)}</td>
                <td className="py-3 text-right text-gray-500">{formatINR(totalLastMonth)}</td>
                <td className={`py-3 text-right ${totalChangePct >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {totalLastMonth > 0 ? `${totalChangePct >= 0 ? "+" : ""}${totalChangePct.toFixed(1)}%` : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}