import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MnflixAccountRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Go to Settings and jump to the Account section
    navigate("/settings#settings-account", { replace: true });
  }, [navigate]);

  return null;
}
