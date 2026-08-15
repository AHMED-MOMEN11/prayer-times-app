import "./main.css";
import "./script.js";

document.querySelector("#app").innerHTML = `
<body>

  <main class="app-container">
    
    <!-- Location Badge -->
    <button class="btn-location">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
      <span></span>
    </button>

<button id="lang-toggle-btn" class="btn-lang">
  🌐 English
</button>

<header class="header-dates">
  <h1 class="date-hijri" data-key="hijriDate"></h1>
  <p class="date-gregorian" data-key="gregorianDate"></p>
</header>

<section class="next-prayer-card" id="next-prayer-card">
  <span class="badge" data-key="nextPrayerBadge">Next Prayer</span>
  <h2 class="next-prayer-title" data-key="nextPrayerTitle"></h2>
  <div class="countdown" data-key="countdownText"></div>
</section>

<section class="prayer-grid" id="prayer-grid">
      
</section>

  </main>

</body>
`;
