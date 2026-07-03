import { useState } from "react";
import { loginOrRegister } from "@/lib/auth-user";

export default function UsernameGate({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const res = await loginOrRegister(name, pw);
    setBusy(false);
    if (res.error) setErr(res.error);
    else onDone();
  };

  return (
    <div className="fixed inset-0 z-40 bg-[var(--background)]/95 backdrop-blur-sm grid place-items-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-xl"
      >
        <h2 className="font-[var(--font-display)] text-2xl text-[var(--gold)] tracking-wider text-center">
          دخول / تسجيل
        </h2>
        <p className="text-xs text-[var(--muted-foreground)] text-center mt-2 mb-5">
          اسم مستخدم وكلمة سر — إن كان الاسم موجوداً سيتم تسجيل الدخول
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="اسم المستخدم"
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-center text-lg focus:outline-none focus:border-[var(--gold)]"
          autoFocus
        />
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          type="password"
          placeholder="كلمة السر"
          className="w-full mt-3 bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-center text-lg focus:outline-none focus:border-[var(--gold)]"
        />
        {err && <div className="text-[var(--stadium-red)] text-xs mt-3 text-center">{err}</div>}
        <button
          type="submit"
          disabled={busy || name.trim().length < 2 || pw.length < 1}
          className="w-full mt-4 bg-[var(--gold)] text-[var(--primary-foreground)] font-bold py-3 rounded-lg disabled:opacity-40"
        >
          {busy ? "..." : "دخول"}
        </button>

      </form>
    </div>
  );
}
