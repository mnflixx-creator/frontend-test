import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

// ✅ change this import to your real Navbar path
import { Navigation } from "@/components/layout/Navigation";

// ✅ change this import to your real socket client path (we'll make it if you don't have it)
import StreamSocketClient from "@/setup/StreamSocketClient";

// ✅ If you have a LanguageProvider component, import it.
// If you DON'T have it, remove LanguageProvider and just return children.
// import { LanguageProvider } from "@/context/LanguageContext";

type Props = { children: ReactNode };

export default function ClientLayout({ children }: Props) {
  const { pathname } = useLocation();

  const isAdmin = pathname.startsWith("/admin");

  const hideNavbar =
    pathname.startsWith("/register") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/otp") ||
    pathname.startsWith("/add-profile") ||
    pathname.startsWith("/profiles") ||
    pathname.startsWith("/forgot-password");

  return (
    <>
      {/* ✅ STREAM SOCKET CLIENT — REAL-TIME DEVICE KICK */}
      <StreamSocketClient />

      {/* If you have LanguageProvider, wrap here */}
      {/* <LanguageProvider> */}
      {!isAdmin && !hideNavbar && <Navigation />}

      <div className={hideNavbar ? "pt-0" : "pt-20"}>{children}</div>
      {/* </LanguageProvider> */}
    </>
  );
}
