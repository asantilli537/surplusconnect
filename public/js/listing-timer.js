// ---- listing countdown timers ----

/*
  each listing card has a data-expiration attribute containing the ISO
  timestamp of when the food expires. this script reads that value,
  calculates remaining time, updates the timer display every second,
  and shifts the card's urgency class as time runs down.
  
  urgency thresholds:
    > 2 hours remaining  -> no urgency class (default green border)
    1-2 hours remaining  -> urgent-medium (yellow border)
    < 1 hour remaining   -> urgent-high (red border)
    expired              -> shows "expired" and stops the interval
*/

const URGENCY_HIGH_MS   = 60 * 60 * 1000;       // 1 hour
const URGENCY_MEDIUM_MS = 2 * 60 * 60 * 1000;   // 2 hours

const formatTimeRemaining = (ms) => {
  if (ms <= 0) return 'expired';

  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // padding each unit to two digits so the timer doesn't jump around
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${hh}:${mm}:${ss} remaining`;
};

const applyUrgencyClass = (card, ms) => {
  card.classList.remove(
    'listing-card--urgent-low',
    'listing-card--urgent-medium',
    'listing-card--urgent-high'
  );

  if (ms <= 0) return;

  if (ms <= URGENCY_HIGH_MS) {
    card.classList.add('listing-card--urgent-high');
  } else if (ms <= URGENCY_MEDIUM_MS) {
    card.classList.add('listing-card--urgent-medium');
  } else {
    card.classList.add('listing-card--urgent-low');
  }
};

const applyTimerClass = (timerEl, ms) => {
  timerEl.classList.remove('listing-timer--urgent', 'listing-timer--critical');

  if (ms <= URGENCY_HIGH_MS) {
    timerEl.classList.add('listing-timer--critical');
  } else if (ms <= URGENCY_MEDIUM_MS) {
    timerEl.classList.add('listing-timer--urgent');
  }
};

const initListingTimers = () => {
  const timerEls = document.querySelectorAll('.listing-timer[data-expiration]');
  if (timerEls.length === 0) return;

  timerEls.forEach((timerEl) => {
    const expirationStr = timerEl.dataset.expiration;
    if (!expirationStr) return;

    const expirationMs = new Date(expirationStr).getTime();

    let intervalId;

    const tick = () => {
      const remaining = expirationMs - Date.now();
      timerEl.textContent = formatTimeRemaining(remaining);
      applyTimerClass(timerEl, remaining);

      const parentCard = timerEl.closest('.listing-card');
      if (parentCard) applyUrgencyClass(parentCard, remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
        timerEl.textContent = 'expired';
      }
    };

    tick();
    intervalId = setInterval(tick, 1000);
  });
};

// kicking off once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initListingTimers);