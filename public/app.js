// Elevate Women's Conference — Photo Booth
// Mirrors the structural flow of mxu-circuit-kiosk, reskinned for Capri/lemon theme.

const API_BASE = '__PORT_8000__'.startsWith('__')
  ? 'http://localhost:8000'
  : '__PORT_8000__';

// ---------- Tab routing ----------
function activateTab(name) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('is-active', t.dataset.tab === name)
  );
  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('is-active', p.dataset.panel === name)
  );
  if (window.location.hash !== '#' + name) {
    history.replaceState(null, '', '#' + name);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
});
document.querySelectorAll('[data-tab-link]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    activateTab(el.dataset.tabLink);
  });
});

const initialTab = (window.location.hash || '').replace('#', '') || 'booth';
if (['booth', 'conference', 'speakers', 'discover'].includes(initialTab)) {
  activateTab(initialTab);
}

// ---------- Live badge ticker ----------
function updateLiveBadge() {
  const now = new Date();
  // Conference fictional dates: May 15-17, 2026
  const start = new Date('2026-05-15T09:00:00');
  const end = new Date('2026-05-17T22:00:00');
  const line1 = document.getElementById('liveLine1');
  const line2 = document.getElementById('liveLine2');

  if (now < start) {
    const days = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
    line1.textContent = 'DESIGNED FOR MORE';
    line2.textContent = days <= 1 ? 'Tomorrow' : `In ${days}d`;
  } else if (now <= end) {
    line1.textContent = 'LIVE NOW';
    line2.textContent = 'Capri · Italy';
  } else {
    line1.textContent = 'SEE YOU IN \'27';
    line2.textContent = 'Closed';
  }
}
updateLiveBadge();
setInterval(updateLiveBadge, 30000);

// ---------- Conference data ----------
const CONFERENCE_DAYS = [
  { num: 'N° 01', day: 'FRI · MAY 15', title: 'Welcome & Reflection',
    copy: 'An intimate opening reception in the lemon grove. Set your intention for the weekend ahead.',
    img: './assets/conf-1.jpg' },
  { num: 'N° 02', day: 'SAT · MAY 16', title: 'Designed for More',
    copy: 'A full day of keynotes, panels, and workshops with founders, creatives, and changemakers.',
    img: './assets/conf-2.jpg' },
  { num: 'N° 03', day: 'SAT · MAY 16', title: 'Lemons & Limoncello',
    copy: 'Cocktail hour and curated networking on the cliffside terrace overlooking the Faraglioni.',
    img: './assets/conf-3.jpg' },
  { num: 'N° 04', day: 'SUN · MAY 17', title: 'Manifest Brunch',
    copy: 'Long-table brunch by the sea. Share what you\'re manifesting and the steps to get there.',
    img: './assets/conf-4.jpg' },
  { num: 'N° 05', day: 'SUN · MAY 17', title: 'Closing Sunset',
    copy: 'A final toast as the sun drops behind Anacapri. Take the feeling home with you.',
    img: './assets/conf-5.jpg' },
];

function renderConference() {
  const wrap = document.getElementById('conferenceList');
  wrap.innerHTML = CONFERENCE_DAYS.map(d => `
    <article class="night">
      <div class="night__img" style="background-image:url('${d.img}')">
        <span class="night__num">${d.num}</span>
      </div>
      <div class="night__body">
        <p class="night__day">${d.day}</p>
        <h3 class="night__title">${d.title}</h3>
        <p class="night__copy">${d.copy}</p>
      </div>
    </article>
  `).join('');
}
renderConference();

// ---------- Speakers ----------
const SPEAKERS = [
  { initials: 'AR', name: 'Alessandra Russo', role: 'FOUNDER · LEMONIA HOUSE',
    bio: 'Built a global lifestyle brand from a single Capri lemon recipe. Believes in the long compounding of small bets.' },
  { initials: 'MN', name: 'Maya Nakamura', role: 'CTO · NORTHSTAR LABS',
    bio: 'Engineer turned operator. Speaks on building inclusive technical teams and the cost of perfectionism.' },
  { initials: 'JC', name: 'Jordan Carter', role: 'AUTHOR · DESIGNED FOR MORE',
    bio: 'Three-time bestselling author exploring how women redesign their lives in the second act.' },
  { initials: 'SP', name: 'Sofia Palermo', role: 'CREATIVE DIRECTOR · ATELIER 21',
    bio: 'Mediterranean-rooted designer dressing the next generation of women in power.' },
  { initials: 'LK', name: 'Leah Kim', role: 'MANAGING PARTNER · AMARA CAPITAL',
    bio: 'Backs founders the rest of the industry overlooked. $200M deployed, all in underrepresented teams.' },
  { initials: 'RD', name: 'Renee Diallo', role: 'EXECUTIVE COACH',
    bio: 'Helps women in leadership transitions name what they actually want — and ask for it out loud.' },
];

function renderSpeakers() {
  const wrap = document.getElementById('speakersList');
  wrap.innerHTML = SPEAKERS.map(s => `
    <article class="speaker">
      <div class="speaker__avatar">${s.initials}</div>
      <div class="speaker__body">
        <h3 class="speaker__name">${s.name}</h3>
        <p class="speaker__role">${s.role}</p>
        <p class="speaker__bio">${s.bio}</p>
      </div>
    </article>
  `).join('');
}
renderSpeakers();

// ---------- Discover ----------
const DISCOVER = [
  { num: 'N° 01', emoji: '🍋', title: 'Capri Lemons',
    copy: 'The famed sfusato lemons that inspired our 2026 theme — and the gardens you can visit between sessions.',
    href: 'https://www.capri.com/en/s/the-capri-lemons' },
  { num: 'N° 02', emoji: '🌊', title: 'Faraglioni Rocks',
    copy: 'Three sea stacks rising from the Tyrrhenian. Best seen from a boat at golden hour.',
    href: 'https://www.capritourism.com/en/faraglioni' },
  { num: 'N° 03', emoji: '🏛️', title: 'Villa San Michele',
    copy: 'Axel Munthe\'s cliffside villa in Anacapri. A meditation on building a life of beauty and purpose.',
    href: 'https://www.villasanmichele.eu/en/' },
  { num: 'N° 04', emoji: '🍷', title: 'Where to Eat',
    copy: 'The handful of trattorias locals actually frequent — paccheri al limone, ravioli capresi, fresh fish.',
    href: 'https://www.capri.com/en/restaurants' },
  { num: 'N° 05', emoji: '🚤', title: 'Blue Grotto',
    copy: 'The sea cave that turns sapphire blue at midday. A short boat ride from Marina Grande.',
    href: 'https://www.capritourism.com/en/blue-grotto' },
  { num: 'N° 06', emoji: '🛍️', title: 'Via Camerelle',
    copy: 'Capri\'s elegant shopping spine — from handmade sandals to limoncello to one-off ceramics.',
    href: 'https://www.capri.com/en/shopping' },
];

function renderDiscover() {
  const wrap = document.getElementById('discoverList');
  wrap.innerHTML = DISCOVER.map(d => `
    <a class="discover-card" href="${d.href}" target="_blank" rel="noopener noreferrer">
      <p class="discover-card__num">${d.num}</p>
      <h3 class="discover-card__title">${d.emoji} ${d.title}</h3>
      <p class="discover-card__copy">${d.copy}</p>
      <span class="discover-card__cta">Open ↗</span>
    </a>
  `).join('');
}
renderDiscover();

// ---------- Photo Booth ----------
const cam = document.getElementById('cam');
const snap = document.getElementById('snap');
const cap = document.getElementById('cap');
const camWrap = document.getElementById('camWrap');
const flash = document.getElementById('flash');
const countdownEl = document.getElementById('countdown');
const errEl = document.getElementById('err');
const phonePill = document.getElementById('phonePill');
const phonePillText = document.getElementById('phonePillText');
const afterCaptureRow = document.getElementById('afterCaptureRow');
const btnTake = document.getElementById('btnTake');
const btnRetake = document.getElementById('btnRetake');
const btnGenerate = document.getElementById('btnGenerate');
const btnStart = document.getElementById('btnStart');
const btnSwitch = document.getElementById('btnSwitch');
const btnDownload = document.getElementById('btnDownload');
const btnSms = document.getElementById('btnSms');
const btnNewGuest = document.getElementById('btnNewGuest');
const loading = document.getElementById('loading');
const loadingTitle = document.getElementById('loadingTitle');
const result = document.getElementById('result');
const resultImg = document.getElementById('resultImg');
const status = document.getElementById('status');

const guestModal = document.getElementById('guestModal');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const phoneInput = document.getElementById('phone');
const modalErr = document.getElementById('modalErr');
const btnCancel = document.getElementById('btnCancel');
const btnContinue = document.getElementById('btnContinue');

let stream = null;
let facingMode = 'user';
let capturedBlob = null;
let generatedBlob = null;
let guestData = null;

function showError(msg) {
  errEl.textContent = msg;
  errEl.hidden = !msg;
}
function clearError() { showError(''); }

async function startCamera() {
  clearError();
  try {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1707 } },
      audio: false,
    });
    cam.srcObject = stream;
    cam.hidden = false;
    snap.hidden = true;
    await cam.play();
  } catch (e) {
    showError(`Camera unavailable. Tap Switch then Start Camera. (${e.message || e})`);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}

btnStart.addEventListener('click', startCamera);
btnSwitch.addEventListener('click', () => {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  startCamera();
});

// Take photo button → opens guest info modal
btnTake.addEventListener('click', () => {
  if (!stream || !cam.videoWidth) {
    showError('Camera is not ready yet. Wait a moment and try again.');
    return;
  }
  modalErr.hidden = true;
  guestModal.hidden = false;
  setTimeout(() => firstNameInput.focus(), 100);
});

btnCancel.addEventListener('click', () => {
  guestModal.hidden = true;
});

function validateGuest() {
  const first = firstNameInput.value.trim();
  const last = lastNameInput.value.trim();
  const phoneRaw = phoneInput.value.trim();
  const digits = phoneRaw.replace(/\D/g, '');

  if (!first) return 'Please enter your first name.';
  if (!last) return 'Please enter your last name.';
  if (digits.length < 10) return 'Please enter a valid phone number.';
  return null;
}

btnContinue.addEventListener('click', () => {
  const err = validateGuest();
  if (err) {
    modalErr.textContent = err;
    modalErr.hidden = false;
    return;
  }
  guestData = {
    firstName: firstNameInput.value.trim(),
    lastName: lastNameInput.value.trim(),
    phone: phoneInput.value.trim(),
  };
  guestModal.hidden = true;
  phonePillText.textContent = `${guestData.firstName} · ${formatPhone(guestData.phone)}`;
  phonePill.hidden = false;
  startCountdown();
});

function formatPhone(s) {
  const d = s.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  return s;
}

// 5-second countdown then capture
function startCountdown() {
  let n = 5;
  countdownEl.hidden = false;
  countdownEl.textContent = n;
  const tick = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      clearInterval(tick);
      countdownEl.textContent = '📸';
      setTimeout(() => {
        countdownEl.hidden = true;
        captureFrame();
      }, 350);
    } else {
      countdownEl.textContent = n;
    }
  }, 1000);
}

function captureFrame() {
  // Flash
  flash.classList.add('is-firing');
  setTimeout(() => flash.classList.remove('is-firing'), 170);

  // Capture
  const w = cam.videoWidth || 720;
  const h = cam.videoHeight || 960;
  cap.width = w; cap.height = h;
  const ctx = cap.getContext('2d');
  // Mirror to match the live preview
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(cam, 0, 0, w, h);

  cap.toBlob((blob) => {
    capturedBlob = blob;
    snap.src = URL.createObjectURL(blob);
    snap.hidden = false;
    cam.hidden = true;
    btnTake.hidden = true;
    afterCaptureRow.hidden = false;
    stopCamera();
  }, 'image/jpeg', 0.92);
}

btnRetake.addEventListener('click', () => {
  capturedBlob = null;
  snap.hidden = true;
  cam.hidden = false;
  btnTake.hidden = false;
  afterCaptureRow.hidden = true;
  startCamera();
});

// Themed loading messages cycle
const LOADING_MESSAGES = [
  'Painting your Capri scene…',
  'Squeezing a few extra lemons…',
  'Polishing the chrome…',
  'Adjusting the cliffside light…',
  'Tying the silk scarf…',
];

let loadingTimer = null;
function startLoadingMessages() {
  let i = 0;
  loadingTitle.textContent = LOADING_MESSAGES[0];
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    loadingTitle.textContent = LOADING_MESSAGES[i];
  }, 4500);
}
function stopLoadingMessages() {
  if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
}

btnGenerate.addEventListener('click', async () => {
  if (!capturedBlob) {
    showError('Take a picture first.');
    return;
  }
  if (!guestData) {
    showError('Guest info missing — please retake.');
    return;
  }
  clearError();
  // Hide camera area, show loading
  camWrap.hidden = true;
  afterCaptureRow.hidden = true;
  loading.hidden = false;
  startLoadingMessages();

  try {
    const fd = new FormData();
    fd.append('image', capturedBlob, 'guest.jpg');
    fd.append('first_name', guestData.firstName);
    fd.append('last_name', guestData.lastName);
    fd.append('phone', guestData.phone);

    const res = await fetch(`${API_BASE}/api/generate`, { method: 'POST', body: fd });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Generation failed (${res.status}). ${txt}`);
    }
    const blob = await res.blob();
    generatedBlob = blob;
    resultImg.src = URL.createObjectURL(blob);
    loading.hidden = true;
    stopLoadingMessages();
    result.hidden = false;
    status.textContent = '';
    status.className = 'booth__status';
  } catch (e) {
    loading.hidden = true;
    stopLoadingMessages();
    camWrap.hidden = false;
    afterCaptureRow.hidden = false;
    showError(`Failed: ${e.message || e}`);
  }
});

// Download
btnDownload.addEventListener('click', () => {
  if (!generatedBlob) return;
  const url = URL.createObjectURL(generatedBlob);
  const a = document.createElement('a');
  const safeName = (guestData?.firstName || 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = url;
  a.download = `elevate-capri-${safeName}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = '✓ Downloaded — check your Photos.';
  status.className = 'booth__status is-success';
});

// SMS
btnSms.addEventListener('click', async () => {
  if (!generatedBlob || !guestData) return;
  btnSms.disabled = true;
  status.textContent = 'Sending…';
  status.className = 'booth__status';

  try {
    // Compress for transport
    const b64 = await blobToBase64Compressed(generatedBlob, 768, 0.85);
    const res = await fetch(`${API_BASE}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: guestData.phone,
        firstName: guestData.firstName,
        lastName: guestData.lastName,
        imageBase64: b64,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.ok) {
      status.textContent = '✓ Texted! Check your phone.';
      status.className = 'booth__status is-success';
    } else if (data.scaffolded) {
      status.textContent = `SMS not configured yet — use Download for now.`;
      status.className = 'booth__status is-error';
    } else {
      throw new Error(data.detail || 'SMS failed');
    }
  } catch (e) {
    status.textContent = `Send failed: ${e.message || e}`;
    status.className = 'booth__status is-error';
  } finally {
    btnSms.disabled = false;
  }
});

async function blobToBase64Compressed(blob, maxDim, quality) {
  const bitmap = await createImageBitmap(blob);
  const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  const dataUrl = c.toDataURL('image/jpeg', quality);
  return dataUrl.split(',')[1];
}

// New guest — reset
btnNewGuest.addEventListener('click', () => {
  capturedBlob = null;
  generatedBlob = null;
  guestData = null;
  resultImg.src = '';
  result.hidden = true;
  loading.hidden = true;
  camWrap.hidden = false;
  snap.hidden = true;
  cam.hidden = false;
  btnTake.hidden = false;
  afterCaptureRow.hidden = true;
  phonePill.hidden = true;
  firstNameInput.value = '';
  lastNameInput.value = '';
  phoneInput.value = '';
  status.textContent = '';
  status.className = 'booth__status';
  clearError();
  startCamera();
});

// ---------- Kiosk lockdown ----------
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    if (['t','n','w','r','f','p'].includes(e.key.toLowerCase())) e.preventDefault();
  }
  if (e.key === 'F5' || e.key === 'F11') e.preventDefault();
});

// Auto-start camera
startCamera();
