import { useEffect, useMemo, useState, type FormEvent } from "react";
import classNames from "classnames";

import { useMnflixAuth } from "@/stores/mnflixAuth";
import { OverlayPortal } from "@/components/overlays/OverlayDisplay";
import { Flare } from "@/components/utils/Flare";
import { Button } from "@/components/buttons/Button";

type Props = { open: boolean; onClose: () => void };

const API_BASE = import.meta.env.VITE_API_URL;
const AUTH_PATH = "/api/auth";

// localStorage keys
const LS_EMAIL = "mnflix:remember_email";
const LS_REMEMBER = "mnflix:remember_me";

export function LoginModal({ open, onClose }: Props) {
  const setAuth = useMnflixAuth((s) => s.setAuth);

  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsLang, setTermsLang] = useState<"mn" | "en">("mn");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"send" | "verify">("send");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotErr, setForgotErr] = useState<string | null>(null);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load remembered email
  useEffect(() => {
    if (!open) return;
    try {
      const rem = localStorage.getItem(LS_REMEMBER) === "1";
      const savedEmail = localStorage.getItem(LS_EMAIL) || "";
      setRememberMe(rem);
      if (rem && savedEmail) setEmail(savedEmail);
    } catch {
      // ignore
    }
  }, [open]);

  // Save/clear remembered email
  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(LS_REMEMBER, rememberMe ? "1" : "0");
      if (rememberMe) localStorage.setItem(LS_EMAIL, email);
      else localStorage.removeItem(LS_EMAIL);
    } catch {
      // ignore
    }
  }, [rememberMe, email, open]);

  // Reset register-only states when switching
  useEffect(() => {
    setErr(null);
    setPassword2("");
    setAcceptTerms(false);
  }, [mode]);

  const termsTextEn = useMemo(
    () => `MNFLIX — Terms & Conditions

Last updated: 2026-02-14

1. General
MNFLIX is a platform that organizes and displays publicly available third-party links and embedded players in a convenient way.

2. Content ownership
MNFLIX does NOT own the movies/series or related media (videos, images, posters, banners). MNFLIX only provides access to third-party links/embeds.

3. Third-party services
Players/links shown on MNFLIX may be provided by third parties. MNFLIX is not responsible for availability, quality, interruptions, errors, or the legality of third-party content.

4. User responsibility
You are responsible for complying with the laws of your country. MNFLIX is not liable for misuse by users.

5. Subscription & payments
- Paying unlocks certain features for the paid period.
- Payments are non-refundable. Completed payments will not be refunded.
- MNFLIX is not directly responsible for delays/errors caused by third-party payment providers (banks, card gateways, etc.).

6. Service changes
MNFLIX may change features, pricing, rules, or availability at any time, including suspending or discontinuing parts of the service.

7. Account & security
You are responsible for protecting your account credentials. MNFLIX may restrict or terminate accounts in case of violations or suspicious activity.

8. Disclaimer
MNFLIX does not guarantee uninterrupted or error-free operation. MNFLIX provides no guarantee that a link/player will work, that content will play, or that a device will be compatible.

9. Contact
For issues or requests, contact MNFLIX through official channels.`,
    [],
  );

  const termsTextMn = useMemo(
    () => `MNFLIX — Үйлчилгээний Нөхцөл

Сүүлд шинэчилсэн: 2026.02.14

1. Ерөнхий
MNFLIX нь хэрэглэгчдэд гуравдагч этгээдийн нийтэд байршуулсан контентын холбоос, тоглуулагч (embed) мэдээллийг нэг дор цэгцтэй байдлаар үзүүлэх платформ юм.

2. Агуулгын өмчлөл
MNFLIX нь кино, цуврал, зураг, постер, баннер, видео бичлэгүүдийн зохиогчийн эрхийг эзэмшдэггүй. MNFLIX нь хэрэглэгчдэд гуравдагч этгээдийн эх сурвалж дахь холбоосыг харуулах боломж олгодог.

3. Гуравдагч этгээдийн үйлчилгээ
MNFLIX дээрх тоглуулагч/холбоосууд нь гуравдагч этгээдийн үйлчилгээ байж болно. Тэдний хүртээмж, чанар, тасалдал, алдаа, контентын хууль ёсны байдалд MNFLIX хариуцлага хүлээхгүй.

4. Хэрэглэгчийн хариуцлага
Хэрэглэгч нь MNFLIX-ийг ашиглахдаа өөрийн орны хууль тогтоомжийг дагаж мөрдөх үүрэгтэй. MNFLIX нь хэрэглэгчийн буруутай ашиглалтаас үүсэх аливаа эрсдэлийг хариуцахгүй.

5. Захиалга ба төлбөр
- Төлбөр төлсөнөөр тухайн хугацаанд платформын зарим боломжийг ашиглах эрх нээгдэнэ.
- Төлбөр буцаан олголтгүй (refundable биш) бөгөөд гүйцэтгэсэн төлбөрийг буцаахгүй.
- Гуравдагч этгээдийн төлбөрийн үйлчилгээ (банк, карт, төлбөрийн шлюз) дээрх алдаа/сааталд MNFLIX шууд хариуцлага хүлээхгүй.

6. Үйлчилгээний өөрчлөлт
MNFLIX нь функц, үнэ, дүрэм, боломжуудыг хүссэн үедээ өөрчлөх, түр зогсоох, сайжруулах эрхтэй.

7. Бүртгэл ба аюулгүй байдал
Та өөрийн нууц үг, бүртгэлийн мэдээллээ хамгаалах үүрэгтэй. MNFLIX эрхийг тань түр/бүр мөсөн хязгаарлаж болно.

8. Хариуцлагаас татгалзах
MNFLIX нь тасалдалгүй, алдаагүй ажиллана гэж батлахгүй. Контент тоглохгүй байх, холбоос ажиллахгүй байх, төхөөрөмжийн нийцтэй байдлын асуудалд MNFLIX баталгаа өгөхгүй.

9. Холбоо барих
Асуудал, хүсэлт байвал MNFLIX-ийн албан ёсны сувгаар холбогдоно уу.`,
    [],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    // Register validations
    if (mode === "register") {
      if (!password || password.length < 6) {
        setErr("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.");
        return;
      }
      if (password !== password2) {
        setErr("Нууц үг таарахгүй байна.");
        return;
      }
      if (!acceptTerms) {
        setErr("Үйлчилгээний нөхцөлийг зөвшөөрөх шаардлагатай.");
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/login" : "/register";

      const res = await fetch(`${API_BASE}${AUTH_PATH}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Auth failed");
      if (!data?.token || !data?.user) throw new Error("Missing token/user");

      setAuth(data.token, data.user);
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function sendResetOtp() {
  setForgotErr(null);
  setForgotMsg(null);
  setForgotLoading(true);
  try {
    const res = await fetch(`${API_BASE}${AUTH_PATH}/password/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "OTP send failed");

    setForgotMsg(data?.message || "Код амжилттай илгээгдлээ");
    setForgotStep("verify");
  } catch (e: any) {
    setForgotErr(e?.message || "Алдаа гарлаа");
  } finally {
    setForgotLoading(false);
  }
}

    async function verifyResetOtp() {
    setForgotErr(null);
    setForgotMsg(null);

    if (!otp.trim()) {
        setForgotErr("Код оруулна уу");
        return;
    }
    if (!newPassword || newPassword.length < 6) {
        setForgotErr("Шинэ нууц үг хамгийн багадаа 6 тэмдэгт байна");
        return;
    }

    setForgotLoading(true);
    try {
        const res = await fetch(`${API_BASE}${AUTH_PATH}/password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            email: email.trim().toLowerCase(),
            otp: otp.trim(),
            newPassword,
        }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Reset failed");

        setForgotMsg(data?.message || "Нууц үг амжилттай шинэчлэгдлээ");

        // after success: close forgot modal, go back to login mode
        setTimeout(() => {
        setForgotOpen(false);
        setForgotStep("send");
        setOtp("");
        setNewPassword("");
        setMode("login");
        }, 700);
    } catch (e: any) {
        setForgotErr(e?.message || "Алдаа гарлаа");
    } finally {
        setForgotLoading(false);
    }
    }

  return (
    <>{/* Forgot password popup */}
        <OverlayPortal
        darken
        show={forgotOpen}
        close={() => setForgotOpen(false)}
        durationClass="duration-500"
        zIndex={10001}
        >
        <div className="flex absolute inset-0 items-center justify-center pt-safe pointer-events-auto">
            <Flare.Base
            className={classNames(
                "group -m-[0.705em] rounded-3xl bg-background-main",
                "max-w-md w-[95%]",
                "bg-mediaCard-hoverBackground/60 backdrop-filter backdrop-blur-lg shadow-lg overflow-hidden",
                "relative",
            )}
            >
            <Flare.Light
                flareSize={240}
                cssColorVar="--colors-mediaCard-hoverAccent"
                backgroundClass="bg-modal-background duration-100"
                className="rounded-3xl bg-background-main group-hover:opacity-100 transition-opacity duration-300"
            />

            <Flare.Child className="pointer-events-auto relative p-5">
                <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Нууц үг сэргээх</h3>
                <button
                    className="text-sm text-type-secondary hover:text-white transition-transform hover:scale-95"
                    onClick={() => setForgotOpen(false)}
                    type="button"
                >
                    Close
                </button>
                </div>

                <div className="mt-4 space-y-3">
                <input
                    className="w-full rounded-xl bg-dropdown-background p-3 outline-none text-white placeholder:text-white/40 focus:bg-dropdown-hoverBackground transition-colors"
                    placeholder="Имэйл хаяг"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                />

                {forgotStep === "verify" && (
                    <>
                    <input
                        className="w-full rounded-xl bg-dropdown-background p-3 outline-none text-white placeholder:text-white/40 focus:bg-dropdown-hoverBackground transition-colors"
                        placeholder="Код (4 оронтой)"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        inputMode="numeric"
                    />
                    <input
                        className="w-full rounded-xl bg-dropdown-background p-3 outline-none text-white placeholder:text-white/40 focus:bg-dropdown-hoverBackground transition-colors"
                        placeholder="Шинэ нууц үг"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                    </>
                )}

                {forgotErr && <div className="text-sm text-red-400">{forgotErr}</div>}
                {forgotMsg && <div className="text-sm text-green-400">{forgotMsg}</div>}

                {forgotStep === "send" ? (
                    <Button
                    theme="purple"
                    onClick={sendResetOtp}
                    disabled={forgotLoading}
                    className={classNames(
                        "w-full gap-2 h-12 rounded-lg px-4 py-2",
                        "transition-transform hover:scale-105 duration-100",
                        forgotLoading ? "opacity-60 pointer-events-none" : "",
                    )}
                    >
                    {forgotLoading ? "Илгээж байна..." : "Код илгээх"}
                    </Button>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        className="rounded-xl py-3 bg-dropdown-background hover:bg-dropdown-hoverBackground text-white transition"
                        onClick={() => {
                        setForgotStep("send");
                        setOtp("");
                        setNewPassword("");
                        setForgotErr(null);
                        setForgotMsg(null);
                        }}
                    >
                        Буцах
                    </button>

                    <Button
                        theme="purple"
                        onClick={verifyResetOtp}
                        disabled={forgotLoading}
                        className={classNames(
                        "w-full gap-2 h-12 rounded-lg px-4 py-2",
                        "transition-transform hover:scale-105 duration-100",
                        )}
                    >
                        {forgotLoading ? "Шалгаж байна..." : "Шинэчлэх"}
                    </Button>
                    </div>
                )}
                </div>
            </Flare.Child>
            </Flare.Base>
        </div>
        </OverlayPortal>
      {/* Main Login/Register modal */}
      <OverlayPortal darken show={open} close={onClose} durationClass="duration-500" zIndex={9999}>
        <div className="flex absolute inset-0 items-center justify-center pt-safe pointer-events-auto">
          <Flare.Base
            className={classNames(
              "group -m-[0.705em] rounded-3xl bg-background-main",
              "max-w-md w-[95%]",
              "bg-mediaCard-hoverBackground/60 backdrop-filter backdrop-blur-lg shadow-lg overflow-hidden",
              "relative",
            )}
          >
            <Flare.Light
              flareSize={240}
              cssColorVar="--colors-mediaCard-hoverAccent"
              backgroundClass="bg-modal-background duration-100"
              className="rounded-3xl bg-background-main group-hover:opacity-100 transition-opacity duration-300"
            />

            <Flare.Child className="pointer-events-auto relative p-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
                </h2>
                <button
                  className="text-sm text-type-secondary hover:text-white transition-transform hover:scale-95"
                  onClick={onClose}
                  type="button"
                >
                  Close
                </button>
              </div>

              {/* Tabs */}
              <div className="mt-3 flex gap-2">
                <button
                  className={classNames(
                    "flex-1 rounded-xl py-2 text-sm transition-colors",
                    mode === "login"
                        ? "bg-button-purple text-white"
                        : "bg-dropdown-background hover:bg-dropdown-hoverBackground text-white/80"
                  )}
                  onClick={() => setMode("login")}
                  type="button"
                >
                  Нэвтрэх
                </button>

                <button
                  className={classNames(
                    "flex-1 rounded-xl py-2 text-sm transition-colors",
                    mode === "register"
                      ? "bg-dropdown-hoverBackground text-white"
                      : "bg-dropdown-background hover:bg-dropdown-hoverBackground text-white/80",
                  )}
                  onClick={() => setMode("register")}
                  type="button"
                >
                  Бүртгүүлэх
                </button>
              </div>

              {/* Form */}
              <form className="mt-4 space-y-3" onSubmit={submit}>
                <input
                  className="w-full rounded-xl bg-dropdown-background p-3 outline-none text-white placeholder:text-white/40 focus:bg-dropdown-hoverBackground transition-colors"
                  placeholder="Имэйл хаяг"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />

                {/* Password row with show/hide */}
                <div className="relative">
                  <input
                    className="w-full rounded-xl bg-dropdown-background p-3 pr-20 outline-none text-white placeholder:text-white/40 focus:bg-dropdown-hoverBackground transition-colors"
                    placeholder="Нууц үг"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-type-secondary hover:text-white"
                  >
                    {showPass ? "Нуух" : "Харах"}
                  </button>
                </div>

                {/* Register: confirm password */}
                {mode === "register" && (
                  <input
                    className="w-full rounded-xl bg-dropdown-background p-3 outline-none text-white placeholder:text-white/40 focus:bg-dropdown-hoverBackground transition-colors"
                    placeholder="Нууц үг баталгаажуулах"
                    type={showPass ? "text" : "password"}
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    autoComplete="new-password"
                  />
                )}

                {/* Remember / Forgot */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm text-white/80 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded bg-dropdown-background"
                    />
                    Намайг сана
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                        setForgotOpen(true);
                        setForgotStep("send");
                        setForgotErr(null);
                        setForgotMsg(null);
                    }}
                    className="text-sm text-type-secondary hover:text-white"
                    >
                    Нууц үг сэргээх
                    </button>
                </div>

                {/* Register: Terms checkbox */}
                {mode === "register" && (
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded bg-dropdown-background"
                    />
                    <div className="text-sm text-white/80">
                      Би{" "}
                      <button
                        type="button"
                        onClick={() => setTermsOpen(true)}
                        className="text-white underline hover:opacity-90"
                      >
                        Үйлчилгээний нөхцөл
                      </button>{" "}
                      зөвшөөрч байна
                    </div>
                  </div>
                )}

                {err && <div className="text-sm text-red-400">{err}</div>}

                {/* Submit button styled like Play (theme="purple") */}
                <Button
                  theme="purple"
                  className={classNames(
                    "w-full gap-2 h-12 rounded-lg px-4 py-2 my-1",
                    "transition-transform hover:scale-105 duration-100",
                    "text-md text-white flex items-center justify-center",
                    loading ? "opacity-60 pointer-events-none" : "",
                  )}
                >
                  <button type="submit" className="w-full h-full flex items-center justify-center gap-2">
                    {loading ? "Түр хүлээнэ үү..." : mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
                  </button>
                </Button>

                {/* Helper text */}
                <div className="pt-2 text-sm text-white/70">
                  {mode === "login" ? (
                    <>
                      Шинэ хэрэглэгч үү?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("register")}
                        className="text-white underline hover:opacity-90"
                      >
                        Бүртгүүлэх
                      </button>
                    </>
                  ) : (
                    <>
                      Аль хэдийн бүртгэлтэй юу?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="text-white underline hover:opacity-90"
                      >
                        Нэвтрэх
                      </button>
                    </>
                  )}
                </div>
              </form>
            </Flare.Child>
          </Flare.Base>
        </div>
      </OverlayPortal>

      {/* Terms popup (same animation system) */}
      <OverlayPortal darken show={termsOpen} close={() => setTermsOpen(false)} durationClass="duration-500" zIndex={10000}>
        <div className="flex absolute inset-0 items-center justify-center pt-safe pointer-events-auto">
          <Flare.Base
            className={classNames(
              "group -m-[0.705em] rounded-3xl bg-background-main",
              "max-w-2xl w-[95%]",
              "bg-mediaCard-hoverBackground/60 backdrop-filter backdrop-blur-lg shadow-lg overflow-hidden",
              "relative",
            )}
          >
            <Flare.Light
              flareSize={260}
              cssColorVar="--colors-mediaCard-hoverAccent"
              backgroundClass="bg-modal-background duration-100"
              className="rounded-3xl bg-background-main group-hover:opacity-100 transition-opacity duration-300"
            />

            <Flare.Child className="pointer-events-auto relative p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">MNFLIX — Terms & Conditions</h3>
                <button
                  className="text-sm text-type-secondary hover:text-white transition-transform hover:scale-95"
                  onClick={() => setTermsOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTermsLang("mn")}
                  className={classNames(
                    "rounded-xl px-3 py-1 text-sm transition-colors",
                    termsLang === "mn"
                      ? "bg-dropdown-hoverBackground text-white"
                      : "bg-dropdown-background hover:bg-dropdown-hoverBackground text-white/80",
                  )}
                >
                  MN
                </button>
                <button
                  type="button"
                  onClick={() => setTermsLang("en")}
                  className={classNames(
                    "rounded-xl px-3 py-1 text-sm transition-colors",
                    termsLang === "en"
                      ? "bg-dropdown-hoverBackground text-white"
                      : "bg-dropdown-background hover:bg-dropdown-hoverBackground text-white/80",
                  )}
                >
                  EN
                </button>
              </div>

              <div className="mt-4 max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-dropdown-background p-4 text-sm text-white/85 scrollbar-none">
                {termsLang === "mn" ? termsTextMn : termsTextEn}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setTermsOpen(false)}
                  className={classNames(
                    "rounded-xl px-6 py-2 text-sm",
                    "bg-dropdown-hoverBackground text-white hover:opacity-90 transition",
                  )}
                >
                  OK
                </button>
              </div>
            </Flare.Child>
          </Flare.Base>
        </div>
      </OverlayPortal>
    </>
  );
}
