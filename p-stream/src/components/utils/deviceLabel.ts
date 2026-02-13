// utils/deviceLabel.ts
import { UAParser } from "ua-parser-js";

export function getFriendlyDeviceName() {
  const p = new UAParser();
  const os = p.getOS();          // { name, version }
  const browser = p.getBrowser(); // { name, version }
  const device = p.getDevice();   // { vendor, model, type }

  const type = device.type; // "mobile" | "tablet" | undefined(desktop)
  const base =
    type === "mobile" ? "Mobile" :
    type === "tablet" ? "Tablet" :
    "Desktop";

  const osName = os.name || "";
  const browserName = browser.name || "";
  const model = device.model || ""; // often empty on iPhone

  // Examples: "iPhone (iOS, Safari)" / "Desktop (Windows, Chrome)"
  const left = model ? model : base;
  const right = [osName, browserName].filter(Boolean).join(", ");

  return right ? `${left} (${right})` : left;
}
