// =========================================================
// Tails From Home: booking form
// - Look up returning customers by phone (Google Sheet)
// - Add / remove pets
// - Send the booking to the Google Sheet
// =========================================================

// 👉 After setup, paste the Web App URL from Google Apps Script here.
//    Steps are in apps-script/SETUP.md
const SCRIPT_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';

const form       = document.getElementById('booking-form');
const petsBox    = document.getElementById('pets');
const phoneInput = document.getElementById('phone');
const lookupMsg  = document.getElementById('lookup-msg');
const SAVE_KEY   = 'tfh-phone';   // only the phone number is saved on the device
let returning    = false;         // true once we find them in the Sheet

const isConnected = () => !SCRIPT_URL.includes('PASTE');
const digits = str => str.replace(/\D/g, '').slice(-10);   // "(555) 123-4567" -> "5551234567"

// ---------- Pets ----------

function renumberPets() {
  petsBox.querySelectorAll('[data-pet]').forEach((pet, i) => {
    const n = i + 1;
    pet.querySelector('.pet-title').textContent = 'Pet ' + n;
    pet.querySelectorAll('input, select').forEach(f => f.name = f.name.replace(/pet_\d+_/, 'pet_' + n + '_'));
    pet.querySelector('.remove-pet').hidden = (n === 1);
  });
}

function addPet() {
  const copy = petsBox.querySelector('[data-pet]').cloneNode(true);
  copy.querySelectorAll('input').forEach(f => f.value = '');
  copy.querySelector('select').selectedIndex = 0;
  petsBox.appendChild(copy);
  renumberPets();
  return copy;
}

function readPets() {
  return [...petsBox.querySelectorAll('[data-pet]')].map(pet => {
    const [name, breed, age] = pet.querySelectorAll('input');
    return { name: name.value.trim(), breed: breed.value.trim(), age: age.value.trim(),
             size: pet.querySelector('select').value };
  });
}

function fillPets(pets) {
  petsBox.querySelectorAll('[data-pet]').forEach((p, i) => { if (i > 0) p.remove(); });
  pets.forEach((p, i) => {
    const pet = i === 0 ? petsBox.querySelector('[data-pet]') : addPet();
    const [name, breed, age] = pet.querySelectorAll('input');
    name.value = p.name || ''; breed.value = p.breed || ''; age.value = p.age || '';
    if (p.size) pet.querySelector('select').value = p.size;
  });
  renumberPets();
}

document.getElementById('add-pet').addEventListener('click', () => addPet().querySelector('input').focus());
petsBox.addEventListener('click', e => {
  if (e.target.classList.contains('remove-pet')) { e.target.closest('[data-pet]').remove(); renumberPets(); }
});

// ---------- Returning customer look-up ----------

function showMsg(text, kind) {
  lookupMsg.innerHTML = text;
  lookupMsg.className = 'lookup-msg ' + (kind || '');
  lookupMsg.hidden = false;
}

// Returning customers don't need to retype name / email / address
function setReturning(on) {
  returning = on;
  document.getElementById('on-file').hidden = !on;
  document.getElementById('contact-fields').hidden = on;
  ['customer_name', 'email', 'address'].forEach(n => {
    form.elements[n].required = !on;
    form.elements[n].placeholder = on ? 'Leave blank to keep what we have' : '';
  });
}

document.getElementById('edit-contact').addEventListener('click', () => {
  document.getElementById('contact-fields').hidden = false;
  document.getElementById('on-file').hidden = true;
});

async function lookUp() {
  const phone = digits(phoneInput.value);
  if (phone.length !== 10) { showMsg('Please type your full 10-digit phone number.', 'bad'); return; }
  if (!isConnected()) { showMsg('Look-up isn\'t turned on yet. Please fill in the form below.', 'bad'); return; }

  showMsg('Looking you up...');
  try {
    // fetch = ask our Google Sheet (through Apps Script) if this phone is a customer
    const res = await fetch(SCRIPT_URL + '?phone=' + phone);
    const data = await res.json();
    if (data.found) {
      setReturning(true);
      if (data.pets && data.pets.length) fillPets(data.pets);
      showMsg('Welcome back, <strong>' + data.firstName + '</strong>! 🐾 We filled in your pets. ' +
              'Just pick your dates and services. <button type="button" class="link-btn" id="not-me">Not you?</button>', 'good');
    } else {
      setReturning(false);
      showMsg('We didn\'t find that number. No problem, just fill in the form below!');
    }
  } catch (err) {
    setReturning(false);
    showMsg('We couldn\'t look you up right now. Please fill in the form below.', 'bad');
  }
}

document.getElementById('lookup-btn').addEventListener('click', lookUp);
phoneInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); lookUp(); } });

lookupMsg.addEventListener('click', e => {
  if (e.target.id !== 'not-me') return;
  try { localStorage.removeItem(SAVE_KEY); } catch (err) {}
  phoneInput.value = '';
  setReturning(false);
  fillPets([{}]);
  lookupMsg.hidden = true;
  phoneInput.focus();
});

// ---------- "Other" service: show a type-in box ----------

const otherCheck = document.getElementById('other-check');
const otherText  = document.getElementById('other-text');
otherCheck.addEventListener('change', () => {
  document.getElementById('other-box').hidden = !otherCheck.checked;
  otherText.required = otherCheck.checked;   // must type something if "Other" is ticked
  if (otherCheck.checked) otherText.focus();
});

// ---------- Send the booking ----------

form.addEventListener('submit', async e => {
  e.preventDefault();   // stop the page from reloading; we send it ourselves
  const errorBox = document.getElementById('form-error');
  const services = [...form.querySelectorAll('input[name="services"]:checked')].map(c => c.value === 'Other' ? 'Other: ' + otherText.value.trim() : c.value);

  document.getElementById('service-error').hidden = services.length > 0;
  if (!form.checkValidity() || services.length === 0) {
    form.reportValidity();
    return;
  }
  if (digits(phoneInput.value).length !== 10) {
    errorBox.textContent = 'Please type your full 10-digit phone number.'; errorBox.hidden = false; return;
  }
  if (!isConnected()) {
    errorBox.textContent = 'Sorry, online booking isn\'t turned on yet. Please reach out to our family directly.';
    errorBox.hidden = false; return;
  }

  const booking = {
    phone:    digits(phoneInput.value),
    name:     form.elements.customer_name.value.trim(),
    email:    form.elements.email.value.trim(),
    address:  form.elements.address.value.trim(),
    pets:     readPets(),
    services: services,
    start:    form.elements.start_date.value,
    end:      form.elements.end_date.value,
    meet:     form.elements.meet_and_greet.value,
    notes:    form.elements.notes.value.trim()
  };

  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.textContent = 'Sending...'; errorBox.hidden = true;

  try {
    // "text/plain" keeps Google happy (no extra security check from the browser)
    const res = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' },
                                          body: JSON.stringify(booking) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);

    if (document.getElementById('remember-me').checked) {
      try { localStorage.setItem(SAVE_KEY, booking.phone); } catch (err) {}
    }
    document.getElementById('thank-name').textContent = data.firstName ? ', ' + data.firstName : '';
    form.hidden = true;
    document.getElementById('thank-you').hidden = false;
    document.getElementById('thank-you').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    errorBox.textContent = 'Something went wrong sending your request. Please try again in a minute.';
    errorBox.hidden = false;
    btn.disabled = false; btn.textContent = 'Submit Request';
  }
});

// ---------- On page load: returning visitor on the same device ----------
try {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) { phoneInput.value = saved; if (isConnected()) lookUp(); }
} catch (err) {}
