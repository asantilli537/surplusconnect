// wiring up the mobile hamburger menu toggle
const navToggle = document.querySelector('.navbar-toggle');
const navMenu   = document.querySelector('.navbar-menu');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // closing the menu if user clicks outside of it
  document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
      navMenu.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// wiring up flash message dismiss buttons
document.querySelectorAll('.flash-dismiss').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.closest('.flash-message')?.remove();
  });
});