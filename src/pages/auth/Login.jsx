import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white shadow-xl rounded-xl p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center">
          🏠 Household Ledger
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Manage your household finances
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="font-medium">Email</label>

            <input
              type="email"
              placeholder="Enter Email"
              className="w-full mt-2 p-3 border rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="font-medium">Password</label>

            <input
              type="password"
              placeholder="Enter Password"
              className="w-full mt-2 p-3 border rounded-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
