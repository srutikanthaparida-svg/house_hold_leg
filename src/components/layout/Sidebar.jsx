import { NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, TrendingUp, TrendingDown, PiggyBank, Landmark, LogOut } from "lucide-react"
import { supabase } from "../../services/supabase"
import { useAuth } from "../../context/AuthContext"

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/income", label: "Income", icon: TrendingUp },
  { to: "/expenses", label: "Expenses", icon: TrendingDown },
  { to: "/investments", label: "Investments", icon: PiggyBank },
  { to: "/loans", label: "Loans", icon: Landmark },
]

export default function Sidebar() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const email = session?.user?.email || ""
  const initials = email ? email.slice(0, 2).toUpperCase() : "HL"

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white min-h-screen flex flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-9 h-9 rounded-lg bg-[#0B2545] text-white flex items-center justify-center font-bold text-sm">
          HL
        </div>
        <div className="font-bold text-gray-900 leading-tight">Household<br />Ledger</div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 px-3 py-4">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{email}</p>
            <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}