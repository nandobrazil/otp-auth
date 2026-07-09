let interval;
const otpContainer = document.getElementById('otp-container');
const invalid = document.getElementById('invalid');
const inputKey = document.getElementById('key');
const otpCode = document.getElementById('otp');
const progressCircle = document.getElementById('progressCircle');
const queryParams = new URLSearchParams(window.location.search);

if (queryParams.has('otp')) {
    inputKey.value = queryParams.get('otp');
    startOTP();
}

// brilho de fundo seguindo o cursor
window.addEventListener('pointermove', (e) => {
    document.body.style.setProperty('--mx', `${e.clientX}px`);
    document.body.style.setProperty('--my', `${e.clientY}px`);
});

function isValidBase32(secret) {
    const base32Regex = /^[A-Z2-7]+=*$/i;
    return base32Regex.test(secret) && secret.replace(/=/g, '').length >= 16;
}

function toggleKeyVisibility() {
    const btn = document.getElementById('toggleVisibility');
    const icon = document.getElementById('toggleIcon').querySelector('use');
    const isHidden = inputKey.type === 'password';
    inputKey.type = isHidden ? 'text' : 'password';
    btn.setAttribute('aria-label', isHidden ? 'Ocultar chave' : 'Mostrar chave');
    icon.setAttribute('href', isHidden ? '#icon-hide' : '#icon-show');
}

function startOTP() {
    clearInterval(interval);
    const key = inputKey.value.trim();

    if (!isValidBase32(key)) {
        invalid.style.display = key.length > 0 ? 'block' : 'none';
        otpContainer.style.display = 'none';
        return;
    }

    invalid.style.display = 'none';
    otpContainer.style.display = 'block';

    const params = new URLSearchParams({ otp: key });
    history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);

    updateOTP(key);
    interval = setInterval(() => updateOTP(key), 1000);
}

function copyOTP() {
    const otp = otpCode.textContent;
    if (!otp) return;
    navigator.clipboard.writeText(otp);

    const btn = document.querySelector('.copy-btn');
    const icon = document.getElementById('copyIcon').querySelector('use');
    const label = document.getElementById('copyLabel');

    btn.classList.add('copied');
    icon.setAttribute('href', '#icon-check');
    label.textContent = 'Copiado!';

    clearTimeout(copyOTP._timeout);
    copyOTP._timeout = setTimeout(() => {
        btn.classList.remove('copied');
        icon.setAttribute('href', '#icon-copy');
        label.textContent = 'Copiar código';
    }, 2000);
}

async function updateOTP(base32Key) {
    const epochTime = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const timeCounter = Math.floor(epochTime / timeStep);
    const timeRemaining = timeStep - (epochTime % timeStep);

    if (timeRemaining === 30 || otpCode.textContent === '') {
        otpCode.textContent = await computeTOTP(base32Key, timeCounter);
    }

    updateProgressCircle(timeRemaining, timeStep);
}

async function computeTOTP(base32Key, counter) {
    const key = base32Decode(base32Key);
    const hmac = await hmacSHA1(key, counter);
    return truncateOTP(hmac);
}

function base32Decode(str) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    const result = [];
    str = str.replace(/=+$/, '').toUpperCase();

    for (let i = 0; i < str.length; i++) {
        const val = alphabet.indexOf(str[i]);
        bits += val.toString(2).padStart(5, '0');
    }

    for (let i = 0; i < bits.length - 7; i += 8) {
        result.push(parseInt(bits.substr(i, 8), 2));
    }

    return new Uint8Array(result);
}

async function hmacSHA1(key, counter) {
    const counterBuffer = new ArrayBuffer(8);
    new DataView(counterBuffer).setBigUint64(0, BigInt(counter));
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer));
}

function truncateOTP(hmac) {
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    return (binary % 1_000_000).toString().padStart(6, '0');
}

function updateProgressCircle(timeRemaining, totalTime) {
    const circumference = 2 * Math.PI * 56;
    progressCircle.style.strokeDasharray = circumference;
    progressCircle.style.strokeDashoffset = (timeRemaining / totalTime) * circumference;

    progressCircle.classList.toggle('warning', timeRemaining <= 10 && timeRemaining > 5);
    progressCircle.classList.toggle('danger', timeRemaining <= 5);
}
