let interval;
const otpContainer = document.getElementById('otp-container');
const invalid = document.getElementById('invalid');
const inputKey = document.getElementById("key");
const otpCode = document.getElementById('otp');
const queryParams = new URLSearchParams(window.location.search);

if (queryParams.has('otp')) {
    const otp = queryParams.get('otp');
    inputKey.value = otp;
    startOTP();
}

function isValidBase32(secret) {
    const base32Regex = /^[A-Z2-7]+=*$/i;
    return base32Regex.test(secret) && secret.replace(/=/g, "").length >= 16;
}

function startOTP() {
    clearInterval(interval);
    const key = document.getElementById("key").value.trim();
    if (!isValidBase32(key)) {
        invalid.style.display = key.length > 0 ? 'block' : 'none';
        otpContainer.style.display = 'none';
        return;
    }
    otpContainer.style.display = 'block';
    const encodedKey = encodeURIComponent(key);
    const params = new URLSearchParams({ otp: encodedKey });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    history.replaceState(null, "", newUrl);

    updateOTP(key);
    interval = setInterval(() => updateOTP(key), 1000);
}

function copyOTP() {
    const otp = document.getElementById("otp").textContent;
    navigator.clipboard.writeText(otp);
    document.getElementById("copied").style.display = "block";
    setTimeout(() => document.getElementById("copied").style.display = "none", 5000);
}

async function updateOTP(base32Key) {
    const epochTime = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const timeCounter = Math.floor(epochTime / timeStep);
    const timeRemaining = timeStep - (epochTime % timeStep);

    if (timeRemaining === 30 || otpCode.textContent === "") {
        const otp = await computeTOTP(base32Key, timeCounter);
        otpCode.textContent = otp;
    }

    updateProgressCircle(timeRemaining, timeStep);
}

async function computeTOTP(base32Key, counter) {
    const key = base32Decode(base32Key);
    const hmac = await hmacSHA1(key, counter);
    return truncateOTP(hmac);
}

function base32Decode(str) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "", result = [];
    str = str.replace(/=+$/, "").toUpperCase();

    for (let i = 0; i < str.length; i++) {
        let val = alphabet.indexOf(str[i]);
        bits += val.toString(2).padStart(5, "0");
    }

    for (let i = 0; i < bits.length - 7; i += 8) {
        result.push(parseInt(bits.substr(i, 8), 2));
    }

    return new Uint8Array(result);
}

async function hmacSHA1(key, counter) {
    const counterBuffer = new ArrayBuffer(8);
    new DataView(counterBuffer).setBigUint64(0, BigInt(counter));
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, counterBuffer));
}

function truncateOTP(hmac) {
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    return (binary % 1_000_000).toString().padStart(6, "0");
}

function updateProgressCircle(timeRemaining, totalTime) {
    const progressCircle = document.getElementById("progressCircle");
    const dashOffset = (timeRemaining / totalTime) * 251.2;
    progressCircle.style.strokeDashoffset = dashOffset;
}
