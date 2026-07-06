import { useState } from "react";
import { useScorers, upsertScorer, deleteScorer, type Scorer } from "@/lib/scorers";

export default function ScorersView({ isAdmin }: { isAdmin: boolean }) {
  const { scorers, loading } = useScorers();
  const [editing, setEditing] = useState<Scorer | "new" | null>(null);

  return (
    <div className="px-3 py-3 flex flex-col gap-3">
      <div className="text-center mb-1">
        <div className="font-[var(--font-display)] text-2xl text-[var(--gold)] tracking-wider">
          هدافو كأس العالم
        </div>
        <div className="text-[10px] font-mono text-[var(--muted-foreground)] tracking-widest mt-1">
          TOP SCORERS · WORLD CUP 2026
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={() => setEditing("new")}
          className="bg-[var(--gold)] text-[var(--primary-foreground)] py-2 rounded-lg text-xs font-bold"
        >
          + إضافة هدّاف
        </button>
      )}

      {loading ? (
        <div className="text-center text-[var(--muted-foreground)] text-sm py-8">…</div>
      ) : scorers.length === 0 ? (
        <div className="text-center text-[var(--muted-foreground)] text-sm py-8">لا يوجد هدافون بعد</div>
      ) : (
        <div className="flex flex-col gap-2">
          {scorers.map((s, i) => (
            <ScorerRow key={s.id} rank={i + 1} scorer={s} isAdmin={isAdmin} onEdit={() => setEditing(s)} />
          ))}
        </div>
      )}

      {editing && (
        <ScorerEditor
          scorer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ScorerRow({
  rank, scorer, isAdmin, onEdit,
}: { rank: number; scorer: Scorer; isAdmin: boolean; onEdit: () => void }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <div
      className={`flex items-center gap-3 bg-[var(--card)] border ${
        rank <= 3 ? "border-[var(--gold)]/50" : "border-[var(--border)]"
      } rounded-xl p-3`}
    >
      <div className="w-8 text-center font-mono font-bold text-[var(--muted-foreground)]">
        {medal ?? `#${rank}`}
      </div>

      <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--background)] border border-[var(--border)] shrink-0 grid place-items-center">
        {scorer.photo_url ? (
          <img
            src={scorer.photo_url}
            alt={scorer.name_ar}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <span className="text-xl">⚽</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{scorer.name_ar}</div>
        <div className="text-[11px] text-[var(--muted-foreground)] font-mono flex items-center gap-1 truncate">
          {scorer.country_flag && <span>{scorer.country_flag}</span>}
          {scorer.country_ar && <span className="truncate">{scorer.country_ar}</span>}
        </div>
      </div>

      <div className="text-center">
        <div className="font-mono font-bold text-2xl text-[var(--gold)] leading-none">{scorer.goals}</div>
        <div className="text-[9px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider mt-0.5">
          {scorer.goals === 1 ? "هدف" : "أهداف"}
        </div>
      </div>

      {isAdmin && (
        <button onClick={onEdit} className="text-[var(--muted-foreground)] text-xs px-2 py-1 border border-[var(--border)] rounded">
          تعديل
        </button>
      )}
    </div>
  );
}

function ScorerEditor({ scorer, onClose }: { scorer: Scorer | null; onClose: () => void }) {
  const [name, setName] = useState(scorer?.name_ar ?? "");
  const [flag, setFlag] = useState(scorer?.country_flag ?? "");
  const [country, setCountry] = useState(scorer?.country_ar ?? "");
  const [goals, setGoals] = useState<string>(scorer ? String(scorer.goals) : "1");
  const [photo, setPhoto] = useState(scorer?.photo_url ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const g = parseInt(goals, 10);
    if (!name.trim() || isNaN(g)) return;
    setBusy(true);
    await upsertScorer({
      id: scorer?.id,
      name_ar: name.trim(),
      country_flag: flag,
      country_ar: country,
      goals: g,
      photo_url: photo,
    });
    setBusy(false);
    onClose();
  };

  const remove = async () => {
    if (!scorer) return;
    setBusy(true);
    await deleteScorer(scorer.id);
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 bg-[var(--background)]/80 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--gold)]/40 rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="font-[var(--font-display)] text-[var(--gold)] text-lg">
            {scorer ? "تعديل هدّاف" : "إضافة هدّاف"}
          </div>
        </div>

        <div className="space-y-3">
          <Field label="اسم اللاعب">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ليونيل ميسي"
              className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:border-[var(--gold)] outline-none" />
          </Field>

          <div className="grid grid-cols-[80px_1fr] gap-2">
            <Field label="علم">
              <input value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="🇦🇷"
                className="w-full h-10 text-center text-xl bg-[var(--background)] border border-[var(--border)] rounded-lg focus:border-[var(--gold)] outline-none" />
            </Field>
            <Field label="المنتخب">
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="الأرجنتين"
                className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:border-[var(--gold)] outline-none" />
            </Field>
          </div>

          <Field label="عدد الأهداف">
            <input type="number" min="0" value={goals} onChange={(e) => setGoals(e.target.value)}
              className="w-full h-10 px-3 text-center font-mono bg-[var(--background)] border border-[var(--border)] rounded-lg focus:border-[var(--gold)] outline-none" />
          </Field>

          <Field label="رابط الصورة (اختياري)">
            <input dir="ltr" value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…"
              className="w-full h-10 px-3 text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded-lg focus:border-[var(--gold)] outline-none" />
          </Field>

          {photo && (
            <div className="flex justify-center">
              <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover border border-[var(--border)]"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }} />
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {scorer ? (
            <button onClick={remove} disabled={busy} className="text-[var(--stadium-red)] text-xs px-3 py-2">حذف</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-[var(--muted-foreground)] text-xs px-3 py-2">إلغاء</button>
            <button onClick={save} disabled={busy || !name.trim()}
              className="bg-[var(--gold)] text-[var(--primary-foreground)] px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50">
              {busy ? "..." : "حفظ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-mono text-[var(--muted-foreground)] block mb-1">{label}</label>
      {children}
    </div>
  );
}
