// auto-submitting the filter form when a select value changes
// so users don't have to click the apply button manually
const filterForm     = document.getElementById('filter-form');
const filterSelects  = document.querySelectorAll('.filter-select');

if (filterForm && filterSelects.length > 0) {
  filterSelects.forEach((select) => {
    select.addEventListener('change', () => {
      filterForm.submit();
    });
  });
}