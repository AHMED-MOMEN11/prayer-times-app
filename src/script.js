import axios from 'axios';

// ==========================================
// 1. Global Variables & State Management
// ==========================================
let nextPrayerInterval = null;
const CACHE_KEY = 'prayer_app_data';

// ==========================================
// 2. Helper Functions & Geolocation
// ==========================================
function getCurrentFormatData() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = String(today.getFullYear());

    return `${day}-${month}-${year}`;
}

// تعريف دالة الموقع باستخدام Promise
function getCoordinates() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }),
            (error) => reject(error)
        );
    });
}

// ==========================================
// 3. LocalStorage Helpers
// ==========================================
function getCachedData() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        console.error("Failed to parse LocalStorage data", e);
        return null;
    }
}

function setCachedData(data, date) {
    try {
        const payload = {
            dateKey: date,
            data: data
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
        console.error("Failed to save data to LocalStorage", e);
    }
}

// ==========================================
// 4. UI Rendering Functions
// ==========================================
function renderHeaderDates(dateData) {
    const hijriEl = document.querySelector('[data-key="hijriDate"]');
    const gregorianEl = document.querySelector('[data-key="gregorianDate"]');

    if (hijriEl) {
        hijriEl.textContent = `${dateData.hijri.day} ${dateData.hijri.month.ar} ${dateData.hijri.year} هـ`;
    }
    if (gregorianEl) {
        gregorianEl.textContent = `${dateData.gregorian.weekday.en}, ${dateData.gregorian.day} ${dateData.gregorian.month.en} ${dateData.gregorian.year}`;
    }
}

function renderPrayerCards(timings) {
    const mainPrayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const prayerGrid = document.getElementById('prayer-grid');
    if (!prayerGrid) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayerList = mainPrayers.map(name => {
        const [h, m] = timings[name].split(':').map(Number);
        return {
            name: name,
            timeStr: timings[name],
            totalMinutes: h * 60 + m
        };
    });

    let currentPrayerName = 'Isha';
    for (let i = 0; i < prayerList.length; i++) {
        if (currentMinutes >= prayerList[i].totalMinutes) {
            currentPrayerName = prayerList[i].name;
        } else {
            break;
        }
    }

    let prayerCardsHTML = '';
    prayerList.forEach(prayer => {
        let [hours, minutes] = prayer.timeStr.split(':');
        hours = parseInt(hours);

        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        const formattedHours = String(hours12).padStart(2, '0');
        const formattedTime = `${formattedHours}:${minutes} ${period}`;

        const isActive = prayer.name === currentPrayerName ? 'active' : '';

        prayerCardsHTML += `
            <div class="prayer-card ${isActive}">
                <span class="prayer-name">${prayer.name}</span>
                <span class="prayer-time">${formattedTime}</span>
            </div>
        `;
    });

    prayerGrid.innerHTML = prayerCardsHTML;
}

function setupNextPrayer(timings, coords, date) {
    const mainPrayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayerList = mainPrayers.map(name => {
        const [h, m] = timings[name].split(':').map(Number);
        return {
            name: name,
            timeStr: timings[name],
            totalMinutes: h * 60 + m
        };
    });

    let nextPrayer = prayerList.find(p => p.totalMinutes > currentMinutes);
    let isTomorrow = false;

    if (!nextPrayer) {
        nextPrayer = prayerList[0];
        isTomorrow = true;
    }

    const titleElement = document.querySelector('[data-key="nextPrayerTitle"]');
    if (titleElement) {
        titleElement.textContent = nextPrayer.name;
    }

    const countdownElement = document.querySelector('[data-key="countdownText"]');

    if (nextPrayerInterval) {
        clearInterval(nextPrayerInterval);
    }

    nextPrayerInterval = setInterval(() => {
        const currentTime = new Date();
        const [hours, minutes] = nextPrayer.timeStr.split(':').map(Number);

        const targetDate = new Date();
        targetDate.setHours(hours, minutes, 0, 0);

        if (isTomorrow) {
            targetDate.setDate(targetDate.getDate() + 1);
        }

        const diffInSeconds = Math.floor((targetDate - currentTime) / 1000);

        if (diffInSeconds <= 0) {
            clearInterval(nextPrayerInterval);
            if (countdownElement) {
                countdownElement.textContent = "It's time for prayer!";
            }
            loadAndSyncPrayerData(date, coords);
            return;
        }

        const h = String(Math.floor(diffInSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((diffInSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(diffInSeconds % 60).padStart(2, '0');

        if (countdownElement) {
            countdownElement.textContent = `Remaining ${h}:${m}:${s}`;
        }
    }, 1000);
}

function updateLocationName(coords) {
    return axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`)
        .then(response => {
            const data = response.data;
            const city = data.city || data.locality || data.principalSubdivision || "Current Location";
            const country = data.countryName || "";
            const locationText = country ? `${city}, ${country}` : city;

            const locationSpan = document.querySelector('.btn-location span');
            if (locationSpan) {
                locationSpan.textContent = locationText;
            }
        })
        .catch(error => console.error("Error fetching location name:", error));
}

function renderAllUI(data, coords, date) {
    renderHeaderDates(data.date);
    renderPrayerCards(data.timings);
    setupNextPrayer(data.timings, coords, date);
}

// ==========================================
// 5. Main Logic with Stale-While-Revalidate
// ==========================================
function loadAndSyncPrayerData(date, coords) {
    const cachedPayload = getCachedData();

    if (cachedPayload && cachedPayload.dateKey === date) {
        renderAllUI(cachedPayload.data, coords, date);
    }

    return axios.get(`https://api.aladhan.com/v1/timings/${date}?latitude=${coords.latitude}&longitude=${coords.longitude}`)
        .then(response => {
            const freshData = response.data.data;
            setCachedData(freshData, date);
            renderAllUI(freshData, coords, date);
        })
        .catch(error => {
            console.error("API error, keeping cached data if present:", error);
        });
}

// ==========================================
// 6. App Initialization
// ==========================================
getCoordinates()
    .then(coords => {
        const date = getCurrentFormatData();
        loadAndSyncPrayerData(date, coords);
        updateLocationName(coords);
    })
    .catch(error => {
        console.error("Geolocation error:", error);
        
        const cachedPayload = getCachedData();
        if (cachedPayload) {
            renderAllUI(cachedPayload.data, { latitude: 0, longitude: 0 }, getCurrentFormatData());
        }
    });