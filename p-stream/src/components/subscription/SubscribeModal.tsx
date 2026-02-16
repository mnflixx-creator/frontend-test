import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import { Transition } from "@/components/utils/Transition";
import { useMnflixAuth } from "@/stores/mnflixAuth";
import { conf } from "@/setup/config";
import { useLanguageStore } from "@/stores/language";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SubscribeModal({ open, onClose }: Props) {
  const token = useMnflixAuth((s) => s.token);
  const API_BASE = import.meta.env.VITE_API_URL || conf().BACKEND_URL;
  const lang = (useLanguageStore as any)?.((s: any) => s.language) || "mn";

  const t = useMemo(() => {
    const dict = {
      mn: {
        title: "MNFLIX-ийн эрх сунгах",
        subtitle: "Нэг удаа төлөөд бүх кино, цуврал, аниме, шоу бүгдийг үзээрэй",
        choose: "Хугацаагаа сонго",
        discount: "Хямдрал",
        monthlyLabel: "сард",
        continue: "Үргэлжлүүлэх",
        payTitle: "Гүйлгээ шалгах",
        payDesc:
          "Доорх данс руу сонгосон дүнгээ оруулаад, гүйлгээний утга дээр кодоо бичээд дараа нь “Гүйлгээ шалгах” дээр дарна.",
        account: "Данс",
        amount: "Төлөх дүн",
        code: "Код (тайлбарт бичнэ)",
        copy: "Хуулах",
        copied: "Хуулсан",
        checking: "Шалгаж байна…",
        confirmBtn: "Гүйлгээ шалгах",
        notFound: "Одоохондоо олдсонгүй. 10–60 секунд хүлээгээд дахин оролдоорой.",
        success: "✅ Амжилттай! Эрх идэвхжлээ.",
        back: "Буцах",
        loginRequired: "Нэвтэрсэн байх хэрэгтэй.",
      },
      en: {
        title: "MNFLIX Subscription",
        subtitle: "Pay once — watch everything with full access",
        choose: "Choose duration",
        discount: "Discount",
        monthlyLabel: "/month",
        continue: "Continue",
        payTitle: "Pay by bank transfer",
        payDesc:
          'Transfer the exact amount to the account below, then paste the code into the transfer "description/note".',
        account: "Account",
        amount: "Amount",
        code: "Code (paste into description)",
        copy: "Copy",
        copied: "Copied",
        checking: "Checking…",
        confirmBtn: "Transfer made",
        notFound: "Not found yet. Wait 10–60 seconds and try again.",
        success: "✅ Success! Subscription activated.",
        back: "Back",
        loginRequired: "You must be logged in.",
      },
    };
    return (dict as any)[lang] || dict.mn;
  }, [lang]);

  const plans = useMemo(
    () => [
      { months: 1, discount: 0, finalPrice: 9900, monthly: 9900, tag: null },
      { months: 2, discount: 10, finalPrice: 17800, monthly: 8900, tag: "popular" },
      { months: 3, discount: 20, finalPrice: 23700, monthly: 7900, tag: "smart" },
      { months: 6, discount: 35, finalPrice: 38600, monthly: 6400, tag: "save" },
      { months: 12, discount: 50, finalPrice: 59400, monthly: 4950, tag: "best" },
    ],
    [],
  );

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMonths, setSelectedMonths] = useState<number | null>(null);
  const [intent, setIntent] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [copyState, setCopyState] = useState({ account: false, amount: false, code: false });

  const animClass = (tag: string | null) => {
    if (!tag) return "mnflix-anim-basic";
    if (tag === "popular") return "mnflix-anim-popular";
    if (tag === "smart") return "mnflix-anim-smart";
    if (tag === "save") return "mnflix-anim-save";
    if (tag === "best") return "mnflix-anim-best";
    return "mnflix-anim-basic";
    };

  const selectedPlan = useMemo(
    () => plans.find((p) => p.months === selectedMonths) || null,
    [plans, selectedMonths],
  );

  const formatMNT = (n: number) =>
    new Intl.NumberFormat("mn-MN").format(Number(n || 0)) + "₮";

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedMonths(null);
      setIntent(null);
      setMessage("");
      setChecking(false);
      setCopyState({ account: false, amount: false, code: false });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function copyText(key: "account" | "amount" | "code", value: any) {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopyState((p) => ({ ...p, [key]: true }));
      setTimeout(() => setCopyState((p) => ({ ...p, [key]: false })), 1200);
    } catch {}
  }

  async function goToPayment() {
    if (!token) {
      setMessage(t.loginRequired);
      return;
    }
    if (!selectedPlan) return;

    setMessage("");
    const res = await fetch(`${API_BASE}/api/subscription/bank/intent`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message || "Server error");
      return;
    }
    setIntent(data);
    setStep(2);
  }

  async function confirmPayment() {
    if (!token) {
      setMessage(t.loginRequired);
      return;
    }
    if (!selectedPlan) return;

    setMessage("");
    setChecking(true);

    const res = await fetch(`${API_BASE}/api/subscription/bank/confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ months: selectedPlan.months }),
    });

    const data = await res.json().catch(() => ({}));
    setChecking(false);

    if (res.ok && data?.found && data?.subscribed) {
      setMessage(t.success);
      setTimeout(() => onClose(), 1200);
    } else {
      setMessage(t.notFound);
    }
  }

  const tagText = (tag: string | null) => {
    if (!tag) return null;
    if (lang === "mn") {
      if (tag === "popular") return "ИХ СОНГОДОГ";
      if (tag === "smart") return "УХААЛАГ СОНГОЛТ";
      if (tag === "save") return "ИХ ХЭМНЭЛТ";
      if (tag === "best") return "ХАМГИЙН АШИГТАЙ";
      return null;
    }
    if (tag === "popular") return "POPULAR";
    if (tag === "smart") return "SMART PICK";
    if (tag === "save") return "BIG SAVE";
    if (tag === "best") return "BEST VALUE";
    return null;
  };

  const tagClass = (tag: string | null) => {
    if (!tag) return "";
    if (tag === "best") return "bg-gradient-to-r from-yellow-400 to-orange-500 text-black";
    if (tag === "smart") return "bg-gradient-to-r from-emerald-400 to-teal-500 text-black";
    if (tag === "popular") return "bg-gradient-to-r from-pink-500 to-red-500 text-white";
    if (tag === "save") return "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white";
    return "bg-white/10 text-white";
  };

  return (
    <Transition show={open} animation="fade">
      <div className="fixed inset-0 z-[9999]">
        {/* backdrop */}
        <div className="absolute inset-0 bg-black/70" onMouseDown={onClose} />

        {/* modal wrapper */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {/* stop closing when clicking inside */}
          <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-4xl">
            {/* shell */}
            <div
            className={classNames(
                "relative overflow-hidden rounded-3xl",
                "border border-white/10 bg-black/30 backdrop-blur-xl shadow-2xl",
                "flex flex-col max-h-[calc(100dvh-2rem)]"
            )}
            >
              {/* subtle top glow */}
              <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[520px] -translate-x-1/2 rounded-full bg-[#4f46e5]/20 blur-3xl" />

              {/* header */}
              <div className="relative shrink-0 flex items-start justify-between gap-4 p-5 md:p-6">
                <div>
                  <div className="text-[11px] text-white/50 leading-none">MNFLIX</div>
                  <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-white leading-tight">
                    {t.title}
                  </h1>
                  <p className="mt-2 text-white/70 text-sm md:text-base">{t.subtitle}</p>
                </div>

                <button
                  onClick={onClose}
                  className="h-9 w-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition"
                  type="button"
                  aria-label="Close"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* content */}
              <div
                className={classNames(
                "relative flex-1 px-4 md:px-6",
                "overflow-y-auto overscroll-contain",
                "pb-32 md:pb-6",
                )}
                >
                {/* STEP 1 */}
                {step === 1 && (
                  <>
                    <h2 className="text-base md:text-lg font-semibold text-white">{t.choose}</h2>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {plans.map((p) => {
                        const active = p.months === selectedMonths;
                        const tag = tagText(p.tag);

                        return (
                          <button
                            key={p.months}
                            onClick={() => setSelectedMonths(p.months)}
                            className={classNames(
                            "relative text-left rounded-2xl border transition overflow-hidden",
                            "p-4 md:p-5",
                            "bg-white/5 border-white/10 hover:bg-white/8",
                            active && "border-white/35 bg-white/10",
                            active && animClass(p.tag), // ✅ THIS LINE is the missing part
                            )}
                            type="button"
                          >
                            {active ? <div className="mnflix-selected-ring" /> : null}

                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-base md:text-lg font-bold text-white">
                                  {p.months}{" "}
                                  {lang === "mn"
                                    ? "сараар"
                                    : p.months === 1
                                      ? "month"
                                      : "months"}
                                </div>
                                <div className="text-white/70 mt-1 text-sm">
                                  {t.discount}:{" "}
                                  <span className="text-white font-semibold">{p.discount}%</span>
                                </div>
                              </div>

                              {tag ? (
                                <span
                                  className={classNames(
                                    "text-[11px] md:text-xs font-extrabold px-3 py-1 rounded-full shadow-md",
                                    tagClass(p.tag),
                                  )}
                                >
                                  {tag}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-4 md:mt-5">
                              <div className="text-2xl md:text-3xl font-extrabold text-white">
                                {formatMNT(p.finalPrice)}
                              </div>
                              <div className="text-white/60 text-xs md:text-sm">
                                {formatMNT(p.monthly)} {t.monthlyLabel}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {message ? (
                      <p className="mt-4 text-center text-sm text-red-400">{message}</p>
                    ) : null}
                  </>
                )}

                {/* DESKTOP CONTINUE BUTTON (ONLY STEP 1) */}
                {step === 1 && selectedPlan ? (
                <div className="hidden md:flex justify-end mt-6">
                    <button
                    onClick={goToPayment}
                    className="px-6 py-3 rounded-2xl font-bold text-white bg-violet-600 hover:bg-violet-500 transition shadow-lg"
                    type="button"
                    >
                    {t.continue} • {formatMNT(selectedPlan.finalPrice)}
                    </button>
                </div>
                ) : null}

                {/* STEP 2 */}
                {step === 2 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg md:text-xl font-bold text-white">{t.payTitle}</h2>

                      <button
                        onClick={() => setStep(1)}
                        className="text-sm px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 transition"
                        type="button"
                      >
                        {t.back}
                      </button>
                    </div>

                    <p className="mt-2 text-white/70 text-sm md:text-base">{t.payDesc}</p>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {/* account */}
                      <div className="p-4 md:p-5 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-white/60 text-sm">{t.account}</div>
                        <div className="text-base md:text-lg font-bold mt-1 break-words text-white">
                          {(intent?.bankName || "Golomt Bank")} • {(intent?.accountNumber || "—")}
                        </div>
                        <div className="text-white/60 mt-1 text-sm">{intent?.accountName || ""}</div>

                        <button
                          onClick={() => copyText("account", intent?.accountNumber || "")}
                          className="mt-3 w-full rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 transition"
                          type="button"
                        >
                          {copyState.account ? t.copied : t.copy}
                        </button>
                      </div>

                      {/* amount */}
                      <div className="p-4 md:p-5 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-white/60 text-sm">{t.amount}</div>
                        <div className="text-2xl md:text-3xl font-extrabold mt-1 text-white">
                          {formatMNT(selectedPlan?.finalPrice || 0)}
                        </div>

                        <button
                          onClick={() => copyText("amount", selectedPlan?.finalPrice || 0)}
                          className="mt-3 w-full rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 transition"
                          type="button"
                        >
                          {copyState.amount ? t.copied : t.copy}
                        </button>
                      </div>

                      {/* code */}
                      <div className="md:col-span-2 p-4 md:p-5 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-white/60 text-sm mb-2">{t.code}</div>

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="text-2xl md:text-3xl font-extrabold tracking-wider break-all text-white">
                            {intent?.code || "—"}
                          </div>
                          <button
                            onClick={() => copyText("code", intent?.code || "")}
                            className="w-full md:w-auto rounded-xl px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 font-semibold transition"
                            type="button"
                          >
                            {copyState.code ? t.copied : t.copy}
                          </button>
                        </div>
                      </div>
                      </div>
                    <button
                      onClick={confirmPayment}
                      disabled={checking}
                      className={classNames(
                        "mt-5 w-full rounded-2xl px-4 py-3 font-bold transition",
                        "text-white bg-violet-600 hover:bg-violet-500",
                        "shadow-lg shadow-black/30",
                        checking && "opacity-60 cursor-not-allowed",
                      )}
                      type="button"
                    >
                      {checking ? t.checking : t.confirmBtn}
                      {!checking && selectedPlan ? (
                        <span className="ml-2 opacity-80">• {formatMNT(selectedPlan.finalPrice)}</span>
                      ) : null}
                    </button>

                    {message ? (
                      <p
                        className={classNames(
                          "mt-4 text-center text-sm",
                          message.includes("✅") ? "text-green-400" : "text-red-400",
                        )}
                      >
                        {message}
                      </p>
                    ) : null}
                  </div>
                )}
                {/* ✅ MOBILE BOTTOM BAR (only phones) */}
                {step === 1 && selectedPlan ? (
                <div
                    className={classNames(
                    "md:hidden",
                    "fixed bottom-0 left-0 right-0 z-[60]",
                    "border-t border-white/10",
                    "bg-black/70 backdrop-blur",
                    "px-4 py-3",
                    "pb-[calc(env(safe-area-inset-bottom)+12px)]",
                    )}
                >
                    <button
                    onClick={goToPayment}
                    className={classNames(
                        "w-full rounded-2xl font-bold touch-manipulation",
                        "px-4 py-3 text-base",
                        "text-white bg-violet-600 active:bg-violet-500 transition",
                        "shadow-xl shadow-black/40 ring-1 ring-white/10",
                    )}
                    type="button"
                    >
                    {t.continue} • {formatMNT(selectedPlan.finalPrice)}
                    </button>
                </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  );
}
