import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import { Transition } from "@/components/utils/Transition";
import { useMnflixAuth } from "@/stores/mnflixAuth";
import { conf } from "@/setup/config"; // if you want links etc
import { useLanguageStore } from "@/stores/language"; // if you have it (otherwise remove and hardcode mn)

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SubscribeModal({ open, onClose }: Props) {
  const token = useMnflixAuth((s) => s.token);
  const API_BASE = import.meta.env.VITE_API_URL || conf().BACKEND_URL; // adjust to your env
  const lang = (useLanguageStore as any)?.((s: any) => s.language) || "mn"; // safe fallback

  const t = useMemo(() => {
    const dict = {
      mn: {
        title: "MNFLIX-ийн эрх сунгах",
        subtitle:
          "Нэг удаа төлөөд бүх кино, цуврал, аниме, шоу бүгдийг үзээрэй",
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
    }
    if (tag === "popular") return "POPULAR";
    if (tag === "smart") return "SMART PICK";
    if (tag === "save") return "BIG SAVE";
    if (tag === "best") return "BEST VALUE";
    return null;
  };

  return (
    <Transition show={open} animation="fade">
      <div className="fixed inset-0 z-[9999]">
        {/* backdrop */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />

        {/* modal */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-background-main p-4 md:p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1 text-sm"
            >
              ✕
            </button>

            <h1 className="text-2xl md:text-3xl font-extrabold">{t.title}</h1>
            <p className="mt-2 text-white/70 text-sm md:text-base">{t.subtitle}</p>

            {step === 1 && (
              <>
                <h2 className="mt-5 text-base md:text-lg font-semibold">{t.choose}</h2>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plans.map((p) => {
                    const active = p.months === selectedMonths;
                    const tag = tagText(p.tag);
                    return (
                      <button
                        key={p.months}
                        onClick={() => setSelectedMonths(p.months)}
                        className={classNames(
                          "text-left rounded-2xl border p-4 transition",
                          "bg-black/30 border-white/10 hover:bg-white/5",
                          active && "border-white/40 bg-white/10",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-bold">
                              {p.months} {lang === "mn" ? "сараар" : p.months === 1 ? "month" : "months"}
                            </div>
                            <div className="text-white/70 mt-1 text-sm">
                              {t.discount}: <span className="text-white font-semibold">{p.discount}%</span>
                            </div>
                          </div>

                          {tag ? (
                            <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-white/10 border border-white/10">
                              {tag}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4">
                          <div className="text-2xl font-extrabold">{formatMNT(p.finalPrice)}</div>
                          <div className="text-white/60 text-sm">
                            {formatMNT(p.monthly)} {t.monthlyLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedPlan ? (
                  <div className="mt-4">
                    <button
                      onClick={goToPayment}
                      className="w-full rounded-xl bg-button-purple hover:bg-button-purpleHover transition px-4 py-3 font-bold"
                    >
                      {t.continue} • {formatMNT(selectedPlan.finalPrice)}
                    </button>
                  </div>
                ) : null}

                {message ? <p className="mt-3 text-center text-red-400 text-sm">{message}</p> : null}
              </>
            )}

            {step === 2 && (
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">{t.payTitle}</h2>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10"
                  >
                    {t.back}
                  </button>
                </div>

                <p className="mt-2 text-white/70 text-sm">{t.payDesc}</p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-white/60 text-sm">{t.account}</div>
                    <div className="text-base font-bold mt-1 break-words">
                      {(intent?.bankName || "Golomt Bank")} • {(intent?.accountNumber || "—")}
                    </div>
                    <div className="text-white/60 mt-1 text-sm">{intent?.accountName || ""}</div>

                    <button
                      onClick={() => copyText("account", intent?.accountNumber || "")}
                      className="mt-3 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10"
                    >
                      {copyState.account ? t.copied : t.copy}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-white/60 text-sm">{t.amount}</div>
                    <div className="text-2xl font-extrabold mt-1">
                      {formatMNT(selectedPlan?.finalPrice || 0)}
                    </div>

                    <button
                      onClick={() => copyText("amount", selectedPlan?.finalPrice || 0)}
                      className="mt-3 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10"
                    >
                      {copyState.amount ? t.copied : t.copy}
                    </button>
                  </div>

                  <div className="md:col-span-2 p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-white/60 text-sm mb-2">{t.code}</div>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="text-2xl md:text-3xl font-extrabold tracking-wider break-all">
                        {intent?.code || "—"}
                      </div>
                      <button
                        onClick={() => copyText("code", intent?.code || "")}
                        className="w-full md:w-auto px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 font-semibold"
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
                    "mt-4 w-full rounded-xl px-4 py-3 font-bold transition",
                    "bg-button-purple hover:bg-button-purpleHover",
                    checking && "opacity-60 cursor-not-allowed",
                  )}
                >
                  {checking ? t.checking : t.confirmBtn}
                  {!checking && selectedPlan ? (
                    <span className="ml-2 opacity-80">• {formatMNT(selectedPlan.finalPrice)}</span>
                  ) : null}
                </button>

                {message ? (
                  <p className={classNames("mt-3 text-center text-sm", message.includes("✅") ? "text-green-400" : "text-red-400")}>
                    {message}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </Transition>
  );
}
