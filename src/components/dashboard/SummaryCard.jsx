export default function SummaryCard({ label, value, color = "blue" }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 text-${color}-600`}>{value}</p>
    </div>
  )
}
