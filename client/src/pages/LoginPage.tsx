import { useState, type FormEvent } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/auth-context";
import { errorMessage } from "../utils/format";

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@demo.vendor.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-ink px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Operations desk</p>
          <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight">Recommend the right vendor, and show the working.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-stone-300">
            Scores come from category, location, rating, compliance, and status. The ranking stays the same every time the same data is used.
          </p>
        </div>
        <p className="text-sm text-stone-400">Demo account: admin@demo.vendor.local</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-4">
          <div>
            <p className="text-sm font-semibold text-accent">Vendor Recommendation</p>
            <h2 className="mt-2 text-2xl font-semibold">{mode === "login" ? "Sign in" : "Create an operations account"}</h2>
          </div>
          {mode === "register" ? (
            <Input label="Name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
          ) : null}
          <Input label="Email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? <p className="text-sm text-bad">{error}</p> : null}
          <Button type="submit" loading={loading} className="w-full">
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
          <button
            type="button"
            className="text-sm text-accent"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Need an operations account? Register" : "Already registered? Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
