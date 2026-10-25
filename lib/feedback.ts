/** Short vibration + beep so the teacher knows a scan registered. */
export function scanFeedback(): void {
  try {
    navigator.vibrate?.(80);
  } catch {
    /* not supported */
  }
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      void ctx.close();
    }, 90);
  } catch {
    /* audio blocked */
  }
}
