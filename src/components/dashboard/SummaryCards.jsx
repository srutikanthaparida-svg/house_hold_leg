export default function SummaryCards() {
  const cards = [
    { label: "Total Income", value: "$0.00", color: "green" },
    { label: "Total Expenses", value: "$0.00", color: "red" },
    { label: "Net Balance", value: "$0.00", color: "blue" },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm font-medium">{card.label}</p>
          <p className={`text-3xl font-bold mt-2 text-${card.color}-600`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
