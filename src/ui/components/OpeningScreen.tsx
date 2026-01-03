import { useState, useRef, useEffect } from "react";

interface OpeningScreenProps {
  setUserName: (data: string, fileId?: string) => void;
  setPasswordCorrect: (data: boolean) => void;
  // Optional: if you want to verify against backend, pass a function in from App
  // verifyPassword?: (password: string) => Promise<boolean>;
}

export default function OpeningScreen({
  setUserName,
  setPasswordCorrect,
  // verifyPassword,
}: OpeningScreenProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {

      // ---- Option B: backend check (recommended)
      const res = await fetch("/api/auth/check", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                entered_password: password,
                entered_name: name,
            }),
});
        const { ok } = await res.json();

      if (!ok) {
        setError("Incorrect password. Try again.");
        return;
      }

      if (name.trim()) {
        setUserName(name.trim());
      }
      setPasswordCorrect(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Welcome</h1>
      <p className="text-sm text-gray-600 mb-6">
        Enter your details to continue.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            Name (optional)
          </label>
          <input
            id="name"
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="Your name"
            autoComplete="name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded px-4 py-2 border font-medium disabled:opacity-60"
        >
          {isSubmitting ? "Checking…" : "Continue"}
        </button>
      </form>
    </div>
  );
}