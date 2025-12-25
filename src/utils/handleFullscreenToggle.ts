export async function handleFullscreenToggle(target?: HTMLElement) {
  if (typeof document === "undefined") return;

  const element = target ?? document.documentElement;

  try {
    if (!document.fullscreenElement) {
      await element.requestFullscreen();

      if (
        typeof window !== "undefined" &&
        typeof screen !== "undefined" &&
        "orientation" in screen &&
        screen.orientation &&
        typeof (screen.orientation as any).lock === "function"
      ) {
        try {
          await (screen.orientation as any).lock("landscape");
        } catch {
          // Ignore: not supported on this device
        }
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }

      if (
        typeof screen !== "undefined" &&
        screen.orientation &&
        typeof (screen.orientation as any).unlock === "function"
      ) {
        (screen.orientation as any).unlock();
      }
    }
  } catch {
    // Ignore fullscreen errors
  }
}
