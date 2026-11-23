// Entry point (a classic script, so the page also works when opened from disk).
// Gate every non-user-triggered animation behind `motionAllowed()`.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function motionAllowed() {
  return !reducedMotion.matches;
}

function syncMotionFlag() {
  document.documentElement.dataset.motion = motionAllowed() ? "full" : "reduced";
}

syncMotionFlag();
reducedMotion.addEventListener("change", syncMotionFlag);
