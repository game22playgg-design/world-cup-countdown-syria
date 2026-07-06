import { useState } from "react";
import {
  BRACKET_ROUNDS,
  slotId,
  useBracket,
  saveBracketSlot,
  clearBracketSlot,
  type BracketSlot,
} from "@/lib/bracket";

export default function BracketView({ isAdmin }: { isAdmin: boolean }) {
  const slots = useBracket();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="px-2 py-3 flex flex-col gap-5">
      <div className="text-center">
        <div className="font-[var(--font-display)] text-2xl text-[var(--gold)] tracking-wider">
          مخطط كأس العالم
        </div>
        <div className="text-[10px] font-mono text-[var(--muted-foreground)] tracking-widest mt-1">
          FROM ROUND OF 16 TO THE CHAMPION
        </div>
      </div>

      {BRACKET_ROUNDS.map((round) => (
        <div key={round.key} className="relative">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--gold)]/40" />
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--gold)] px-2">
              {round.label}
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--gold)]/40" />
          </div>

          <div
            className={`grid gap-2 ${
              round.slots >= 16 ? "grid-cols-4" :
              round.slots >= 8  ? "grid-cols-4" :
              round.slots >= 4  ? "grid-cols-2" :
              round.slots >= 2  ? "grid-cols-2" :
                                  "grid-cols-1"
            }`}
          >
            {Array.from({ length: round.slots }).map((_, i) => {
              const id = slotId(round.key, i);
              const s = slots[id];
              const winner = round.key === "w";
              return (
                <SlotCell
                  key={id}
                  slot={s}
                  winner={winner}
                  onClick={isAdmin ? () => setEditing(id) : undefined}
                />
              );
            })}
          </div>
        </div>
      ))}

      {isAdmin && (
        <div className="text-center text-[10px] font-mono text-[var(--muted-foreground)]">
          اضغط على أي خانة لتعبئتها
        </div>
      )}

      {editing && (
        <SlotEditor
          slotId={editing}
          existing={slots[editing]}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SlotCell({
  slot, winner, onClick,
}: { slot: BracketSlot | undefined; winner: boolean; onClick?: () => void }) {
  const hasTeam = slot?.flag || slot?.name_ar;
  const base = winner
    ? "bg-gradient-to-br from-[var(--gold)]/25 to-[var(--gold)]/5 border-[var(--gold)]"
    : hasTeam
      ? "bg-[var(--card)] border-[var(--gold)]/40"
      : "bg-[var(--card)]/50 border-dashed border-[var(--border)]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`min-h-[62px] rounded-lg border ${base} px-1.5 py-2 flex flex-col items-center justify-center gap-1 transition-colors ${
        onClick ? "hover:border-[var(--gold)] cursor-pointer" : "cursor-default"
      }`}
    >
      {winner && !hasTeam && <span className="text-lg">🏆</span>}
      {hasTeam ? (
        <>
          <span className={winner ? "text-3xl" : "text-2xl"}>{slot?.flag ?? "🏳️"}</span>
          <span className={`font-bold leading-tight text-center truncate w-full ${winner ? "text-sm text-[var(--gold)]" : "text-[10px]"}`}>
            {slot?.name_ar ?? ""}
          </span>
        </>
      ) : (
        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
          {winner ? "البطل" : "—"}
        </span>
      )}
    </button>
  );
}

function SlotEditor({
  slotId, existing, onClose,
}: { slotId: string; existing: BracketSlot | undefined; onClose: () => void }) {
  const [flag, setFlag] = useState(existing?.flag ?? "");
  const [name, setName] = useState(existing?.name_ar ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await saveBracketSlot(slotId, flag, name);
    setBusy(false);
    onClose();
  };
  const remove = async () => {
    setBusy(true);
    await clearBracketSlot(slotId);
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 bg-[var(--background)]/80 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--gold)]/40 rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-3">
          <div className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-widest">تعديل الخانة</div>
          <div className="font-[var(--font-display)] text-[var(--gold)] text-lg">{slotId}</div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono text-[var(--muted-foreground)] block mb-1">علم / رمز</label>
            <input
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              placeholder="🇦🇷"
              className="w-full text-center text-2xl h-12 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:border-[var(--gold)] outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-[var(--muted-foreground)] block mb-1">اسم المنتخب</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الأرجنتين"
              className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:border-[var(--gold)] outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={remove} disabled={busy} className="text-[var(--stadium-red)] text-xs px-3 py-2">
            حذف
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-[var(--muted-foreground)] text-xs px-3 py-2">إلغاء</button>
            <button onClick={save} disabled={busy}
              className="bg-[var(--gold)] text-[var(--primary-foreground)] px-4 py-2 rounded-lg text-xs font-bold">
              {busy ? "..." : "حفظ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
