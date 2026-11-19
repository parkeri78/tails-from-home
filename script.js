// =========================================================
// Tails From Home: booking form helpers
// 1. "Add another pet" button
// 2. Must pick at least one service
// 3. Remember returning customers (saved only in THEIR browser)
// =========================================================

const form = document.getElementById('booking-form');
const petsBox = document.getElementById('pets');
const SAVE_KEY = 'tfh-customer';   // name of the saved info in the browser

// ---------- 1. Multiple pets ----------

// Give every pet box the right number: Pet 1, Pet 2... and names like pet_2_name
function renumberPets() {
  const pets = petsBox.querySelectorAll('[data-pet]');
  pets.forEach((pet, i) => {
    const n = i + 1;
    pet.querySelector('.pet-title').textContent = 'Pet ' + n;
    pet.querySelectorAll('input, select').forEach(field => {
      field.name = field.name.replace(/pet_\d+_/, 'pet_' + n + '_');
    });
    // Only extra pets get a Remove button (Pet 1 always stays)
    pet.querySelector('.remove-pet').hidden = (n === 1);
  });
}

function addPet() {
  const first = petsBox.querySelector('[data-pet]');
  const copy = first.cloneNode(true);                       // copy Pet 1's box
  copy.querySelectorAll('input').forEach(f => f.value = ''); // empty the copy
  copy.querySelector('select').selectedIndex = 0;
  petsBox.appendChild(copy);
  renumberPets();
  return copy;
}

document.getElementById('add-pet').addEventListener('click', () => {
  addPet().querySelector('input').focus();
});

// Remove button (one listener for all pets, even ones added later)
petsBox.addEventListener('click', e => {
  if (e.target.classList.contains('remove-pet')) {
    e.target.closest('[data-pet]').remove();
    renumberPets();
  }
});

// ---------- 3. Remember returning customers ----------
// localStorage = a small notebook inside the visitor's own browser.
// Nothing is sent anywhere; it just pre-fills the form next visit.

const OWNER_FIELDS = ['customer_name', 'phone', 'email', 'address'];

function saveCustomer() {
  const data = { owner: {}, pets: [] };
  OWNER_FIELDS.forEach(name => data.owner[name] = form.elements[name].value);
  petsBox.querySelectorAll('[data-pet]').forEach(pet => {
    const [name, breed, age] = pet.querySelectorAll('input');
    data.pets.push({
      name: name.value, breed: breed.value, age: age.value,
      size: pet.querySelector('select').value
    });
  });
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}

function loadCustomer() {
  let data;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
  if (!data) return;

  OWNER_FIELDS.forEach(name => form.elements[name].value = data.owner[name] || '');
  data.pets.forEach((p, i) => {
    const pet = i === 0 ? petsBox.querySelector('[data-pet]') : addPet();
    const [name, breed, age] = pet.querySelectorAll('input');
    name.value = p.name; breed.value = p.breed; age.value = p.age;
    pet.querySelector('select').value = p.size;
  });
  document.getElementById('welcome-back').hidden = false;
}

document.getElementById('clear-saved').addEventListener('click', () => {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  form.reset();
  petsBox.querySelectorAll('[data-pet]').forEach((pet, i) => { if (i > 0) pet.remove(); });
  renumberPets();
  document.getElementById('welcome-back').hidden = true;
});

// ---------- On submit ----------
form.addEventListener('submit', e => {
  // 2. At least one service must be checked
  const picked = form.querySelectorAll('input[name="services"]:checked').length;
  document.getElementById('service-error').hidden = picked > 0;
  if (picked === 0) { e.preventDefault(); return; }

  if (document.getElementById('remember-me').checked) saveCustomer();
  else { try { localStorage.removeItem(SAVE_KEY); } catch (err) {} }
});

loadCustomer();
