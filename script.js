const workbookFields = [
  'Key Results',
  'People',
  'Resources',
  'Today',
  'This Week',
  'Next 30 Days',
  'Next 12 Months',
  'Wins',
  'Lessons'
];

const fieldSections = document.querySelectorAll('.workbook-section .field-grid');

fieldSections.forEach((grid) => {
  const section = grid.closest('.workbook-section');
  const title = section.querySelector('h2')?.textContent || 'Section';
  const fields = title === 'Wins & Lessons' ? ['Wins', 'Lessons'] : title === 'Quarterly Priorities' ? ['Current Quarter'] : title === 'Weekly Focus' ? ['This Week'] : workbookFields;

  fields.forEach((field) => {
    const id = `${title}-${field}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const wrapper = document.createElement('div');
    wrapper.className = 'field';
    wrapper.innerHTML = `<label for="${id}">${field}</label><textarea id="${id}" placeholder="Add bullet points here..." spellcheck="true"></textarea>`;
    grid.appendChild(wrapper);

    const textarea = wrapper.querySelector('textarea');
    textarea.value = localStorage.getItem(id) || '';
    textarea.addEventListener('input', () => localStorage.setItem(id, textarea.value));
  });
});

document.querySelectorAll('.status-grid button').forEach((button) => {
  const key = `status-${button.dataset.status}`;
  if (localStorage.getItem(key) === 'active') button.classList.add('active');
  button.addEventListener('click', () => {
    button.classList.toggle('active');
    localStorage.setItem(key, button.classList.contains('active') ? 'active' : 'inactive');
  });
});
