export function detectDeviceType() {
  const ua = navigator.userAgent;
  const hasTouch = navigator.maxTouchPoints > 0;
  const w = window.screen.width;

  if (/iPhone|iPod/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "Tablet";
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return "Tablet";
  if (/Android.*Mobile/i.test(ua)) return "Android";
  if (/Tablet|Silk/i.test(ua)) return "Tablet";
  if (/Mobile/i.test(ua)) return "Mobile";
  if (hasTouch && w < 576) return "Mobile";
  if (hasTouch && w < 1024) return "Tablet";
  if (w <= 1366) return "Laptop";
  return "Desktop";
}

export function detectBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes("Edg") || ua.includes("Edge")) return "Edge";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  return "Unknown";
}

export function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return "Linux";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  return "Unknown";
}

export function getDeviceInfo() {
  return {
    deviceType: detectDeviceType(),
    browser: detectBrowser(),
    os: detectOS(),
  };
}

export function getDeviceIcon(type) {
  const t = (type || "").toLowerCase();
  if (t === "desktop") return "🖥";
  if (t === "laptop") return "💻";
  if (t === "android") return "📱";
  if (t === "iphone") return "📱";
  if (t === "tablet") return "📟";
  if (t === "mobile") return "📱";
  return "🖥";
}
