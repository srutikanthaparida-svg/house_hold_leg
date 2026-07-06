export default function QuickActions() {
  const actions = [
    { label: "Add Income", icon: "➕", color: "green" },
    { label: "Add Expense", icon: "➖", color: "red" },
    { label: "View Reports", icon: "📊", color: "blue" },
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-${action.color}-50 hover:bg-${action.color}-100 text-${action.color}-700 font-medium transition`}
          >
            <span>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
