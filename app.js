/**
 * wedding-invite/frontend/app.js
 * Form logic: validation, conditional sections, Google Sheets submission.
 */

// ══════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════
const SCRIPT_URL  = 'https://script.google.com/macros/s/AKfycbxBOmNZF2hrvpnb8TwASgtw2apET1yJxgAuAq2dIv-9WvNWn-3kyYAWDaoCIuGzrA22/exec';
const ACCESS_CODE = 'JBLmay08';


// ══════════════════════════════════════════
// OPTIONAL ACCESS GATE
// ══════════════════════════════════════════
(function maybeGate() {
  if (!ACCESS_CODE) return;
  const body   = document.body;
  const stored = sessionStorage.getItem('invite_access');
  if (stored === ACCESS_CODE) return;

  body.style.filter       = 'blur(8px)';
  body.style.pointerEvents = 'none';

  const overlay = document.createElement('div');
  overlay.id = 'access-gate';
  overlay.innerHTML = `
    <div class="gate-box">
      <p class="gate-title">✦ Private Invitation</p>
      <p class="gate-hint">Please enter the access code from your invitation</p>
      <input type="password" id="gate-input" placeholder="Access code" autocomplete="off" maxlength="30"/>
      <button id="gate-btn">Enter</button>
      <p class="gate-error" id="gate-error" aria-live="polite"></p>
    </div>`;
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(250,247,242,0.95);display:flex;align-items:center;justify-content:center;z-index:9999;`;
  overlay.querySelector('.gate-box').style.cssText      = `text-align:center;padding:2.5rem;max-width:340px;background:#fff;border-radius:12px;box-shadow:0 8px 40px rgba(44,37,32,.14);font-family:'Jost',sans-serif;`;
  overlay.querySelector('.gate-title').style.cssText    = `font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-style:italic;color:#2c2520;margin-bottom:.5rem;`;
  overlay.querySelector('.gate-hint').style.cssText     = `font-size:.85rem;color:#6b5e57;margin-bottom:1.25rem;`;
  overlay.querySelector('#gate-input').style.cssText    = `width:100%;padding:.75rem 1rem;border:1.5px solid #e8dfd0;border-radius:4px;font-size:1rem;margin-bottom:.75rem;text-align:center;letter-spacing:.1em;`;
  overlay.querySelector('#gate-btn').style.cssText      = `width:100%;padding:.75rem;background:#4d5e42;color:#fff;border:none;border-radius:4px;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;`;
  overlay.querySelector('.gate-error').style.cssText    = `font-size:.8rem;color:#b94040;margin-top:.5rem;min-height:1.1em;`;

  document.body.parentNode.insertBefore(overlay, document.body.nextSibling);

  function tryCode() {
    const val = document.getElementById('gate-input').value.trim();
    if (val === ACCESS_CODE) {
      sessionStorage.setItem('invite_access', ACCESS_CODE);
      overlay.remove();
      body.style.filter        = '';
      body.style.pointerEvents = '';
    } else {
      document.getElementById('gate-error').textContent = 'Incorrect code. Please try again.';
      document.getElementById('gate-input').value = '';
    }
  }
  document.getElementById('gate-btn').addEventListener('click', tryCode);
  document.getElementById('gate-input').addEventListener('keydown', e => { if (e.key === 'Enter') tryCode(); });
})();


// ══════════════════════════════════════════
// ELEMENT REFS
// ══════════════════════════════════════════
const form           = document.getElementById('rsvp-form');
const formSuccess    = document.getElementById('form-success');
const formError      = document.getElementById('form-error');
const submitBtn      = document.getElementById('submit-btn');
const plusOneSection = document.getElementById('plus-one-section');
const plusOneNameSec = document.getElementById('plus-one-name-section');
const msgArea        = document.getElementById('message');
const msgCount       = document.getElementById('message-count');


// ══════════════════════════════════════════
// CONDITIONAL FIELD LOGIC
// ══════════════════════════════════════════
document.querySelectorAll('input[name="attendance"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const attending = radio.value === 'yes';
    plusOneSection.hidden = !attending;
    if (!attending) {
      document.querySelectorAll('input[name="plus_one"]').forEach(r => r.checked = false);
      plusOneNameSec.hidden = true;
      document.getElementById('plus_one_name').value    = '';
      document.getElementById('plus_one_name').required = false;
    }
  });
});

document.querySelectorAll('input[name="plus_one"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const bringing = radio.value === 'yes';
    plusOneNameSec.hidden = !bringing;
    document.getElementById('plus_one_name').required = bringing;
  });
});


// ══════════════════════════════════════════
// CHARACTER COUNTER
// ══════════════════════════════════════════
if (msgArea) {
  msgArea.addEventListener('input', () => {
    msgCount.textContent = `${msgArea.value.length} / 500`;
  });
}


// ══════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════
function setError(id, msg) {
  const el = document.getElementById(id + '-error');
  if (!el) return;
  el.textContent = msg;
  const field = document.getElementById(id);
  if (field) field.classList.toggle('invalid', !!msg);
}

function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
}

function validateForm(data) {
  let valid = true;

  if (!data.name.trim() || data.name.trim().length < 2) {
    setError('name', 'Please enter your full name.'); valid = false;
  }

  const hasEmail = data.email.trim() !== '';
  const hasPhone = data.phone.trim() !== '';
  if (!hasEmail && !hasPhone) {
    setError('email', 'Please provide at least an email or mobile number.');
    setError('phone', ' ');
    valid = false;
  }
  if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    setError('email', 'Please enter a valid email address.'); valid = false;
  }
  if (hasPhone && !/^[\d\s\+\-\(\)]{7,20}$/.test(data.phone.trim())) {
    setError('phone', 'Please enter a valid phone number.'); valid = false;
  }

  if (!data.attendance) {
    setError('attendance', 'Please select whether you will attend.'); valid = false;
  }

  if (data.plus_one === 'yes' && !data.plus_one_name.trim()) {
    setError('plus-one-name', "Please enter your guest's name."); valid = false;
  }

  return valid;
}


// ══════════════════════════════════════════
// FORM SUBMISSION
// Uses a hidden <form> + iframe trick to POST
// to Google Apps Script without CORS errors.
// This is the most reliable method for GitHub
// Pages → Google Sheets with no backend.
// ══════════════════════════════════════════
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAllErrors();
  formError.hidden = true;

  const data = {
    timestamp:     new Date().toISOString(),
    name:          (document.getElementById('name').value          || '').trim(),
    email:         (document.getElementById('email').value         || '').trim(),
    phone:         (document.getElementById('phone').value         || '').trim(),
    attendance:    (form.querySelector('input[name="attendance"]:checked') || {}).value || '',
    plus_one:      (form.querySelector('input[name="plus_one"]:checked')   || {}).value || '',
    plus_one_name: (document.getElementById('plus_one_name').value || '').trim(),
    dietary:       (document.getElementById('dietary').value       || '').trim(),
    message:       (document.getElementById('message').value       || '').trim(),
  };

  if (!validateForm(data)) return;

  // Loading state
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').hidden    = true;
  submitBtn.querySelector('.btn-loading').hidden = false;

  try {
    // ── Build URL with all fields as query parameters ──
    // Apps Script doGet() can read these reliably without CORS issues.
    // We append action=submit so the script knows it's a real submission.
    const params = new URLSearchParams({ action: 'submit', ...data });
    const url    = SCRIPT_URL + '?' + params.toString();

    // Use an <img> ping — fires the GET request, no CORS block, no response needed.
    // The script reads query params and writes to the sheet.
    await new Promise((resolve) => {
      const img  = new Image();
      img.onload = img.onerror = resolve; // resolve either way
      img.src    = url;
      // Fallback timeout in case neither event fires
      setTimeout(resolve, 5000);
    });

    showSuccess();

  } catch (err) {
    console.error('RSVP submission error:', err);
    formError.hidden = false;
    formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').hidden    = false;
    submitBtn.querySelector('.btn-loading').hidden = true;
  }
});

function showSuccess() {
  form.hidden         = false; // keep form mounted
  formSuccess.hidden  = false;
  form.style.display  = 'none';
  formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

window.resetForm = function () {
  form.reset();
  form.style.display  = '';
  formSuccess.hidden  = true;
  plusOneSection.hidden  = true;
  plusOneNameSec.hidden  = true;
  clearAllErrors();
  document.getElementById('message-count').textContent = '0 / 500';
  window.scrollTo({ top: document.getElementById('rsvp').offsetTop - 20, behavior: 'smooth' });
};


// ══════════════════════════════════════════
// SMOOTH SCROLL (Safari polyfill)
// ══════════════════════════════════════════
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
