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

// ---- dynamic food item rows on listing forms ----

const itemsContainer = document.getElementById('items-container');
const addItemBtn     = document.getElementById('add-item-btn');

if (itemsContainer && addItemBtn) {
  let itemCount = 1;

  // showing the remove button on the first row if more rows exist
  const refreshRemoveButtons = () => {
    const rows = itemsContainer.querySelectorAll('.item-row');
    rows.forEach((row) => {
      const removeBtn = row.querySelector('.remove-item-btn');
      if (removeBtn) {
        removeBtn.style.display = rows.length > 1 ? 'inline-flex' : 'none';
      }
    });
  };

  addItemBtn.addEventListener('click', () => {
    const idx = itemCount;
    itemCount++;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.index = idx;

    row.innerHTML = `
      <div class="item-row-fields">
        <div class="form-group">
          <label class="form-label form-label--required" for="items[${idx}][name]">
            item name
          </label>
          <input
            class="form-input"
            type="text"
            id="items[${idx}][name]"
            name="items[${idx}][name]"
            placeholder="e.g. croissants"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label form-label--required" for="items[${idx}][quantity]">
            quantity
          </label>
          <input
            class="form-input"
            type="number"
            id="items[${idx}][quantity]"
            name="items[${idx}][quantity]"
            placeholder="12"
            min="1"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label form-label--required" for="items[${idx}][unit]">
            unit
          </label>
          <select
            class="form-select"
            id="items[${idx}][unit]"
            name="items[${idx}][unit]"
            required
          >
            <option value="pieces">pieces</option>
            <option value="trays">trays</option>
            <option value="pounds">pounds</option>
            <option value="boxes">boxes</option>
            <option value="bags">bags</option>
            <option value="gallons">gallons</option>
            <option value="servings">servings</option>
          </select>
        </div>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-sm remove-item-btn"
        aria-label="remove this item"
      >
        &times; remove
      </button>
    `;

    row.querySelector('.remove-item-btn').addEventListener('click', () => {
      row.remove();
      refreshRemoveButtons();
    });

    itemsContainer.appendChild(row);
    refreshRemoveButtons();

    // focusing the new item name field for better keyboard flow
    row.querySelector('input[type="text"]').focus();
  });
}

// ---- password show/hide toggle ----

document.querySelectorAll('.password-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input    = document.getElementById(targetId);
    if (!input) return;

    // switching between password and text type
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';

    // updating the aria label so screen readers know the state
    btn.setAttribute('aria-label', isHidden ? 'hide password' : 'show password');
  });
});