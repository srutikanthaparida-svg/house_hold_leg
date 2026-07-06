function Header() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-500">Manage your household finances</p>
      </div>

      <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
        User Profile
      </div>
    </header>
  )
}

export default Header
