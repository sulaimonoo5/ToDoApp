export function detectDeviceType() {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) {
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return "Tablet";
    return "Mobile";
  }
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
