
"use strict";

// ======================================
// WANDERWISE SMART TRAVEL PLANNER
// ======================================

const TRIPS_KEY = "smartTravelTrips";
const PACKING_KEY = "smartTravelPacking";
const PROFILE_KEY = "smartTravelDemoProfile";
const SESSION_KEY = "smartTravelDemoSession";

const $ = id => document.getElementById(id);

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function todayString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "Not specified";
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric"
  });
}

function daysBetween(start, end) {
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  return Math.round((last - first) / 86400000);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ======================================
// MOBILE NAVIGATION AND FOOTER
// ======================================

const menuToggle = $("menu-toggle");
const mainNav = $("main-nav");

menuToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

mainNav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

$("current-year").textContent = new Date().getFullYear();

// ======================================
// DESTINATION CARD SELECTION
// ======================================

document.querySelectorAll("[data-destination]").forEach(card => {
  card.addEventListener("click", () => {
    const destination = card.dataset.destination;
    $("destination").value = destination;
    $("hotel-destination").value = destination.split(",")[0].trim();
    $("planner").scrollIntoView({ behavior: "smooth" });
  });
});

// ======================================
// TRIP PLANNER AND ITINERARY
// ======================================

const travelForm = $("travel-form");
const tripResult = $("trip-result");

const activityPlans = {
  Relaxed: [
    "Enjoy a leisurely breakfast and explore the neighborhood.",
    "Visit a scenic spot, take photos, and enjoy a relaxed lunch.",
    "Spend the afternoon browsing local shops or relaxing at a cafe.",
    "Explore a popular attraction and enjoy a quiet evening."
  ],
  Adventure: [
    "Start with a nature walk or outdoor activity.",
    "Explore a scenic trail, viewpoint, or adventure destination.",
    "Try a new outdoor experience and discover the surrounding area.",
    "Spend time exploring a landmark and enjoy an active day outdoors."
  ],
  Cultural: [
    "Visit a local museum or historical landmark.",
    "Explore traditional neighborhoods and local architecture.",
    "Discover cultural attractions, galleries, and heritage sites.",
    "Visit a historic area and learn about local traditions."
  ],
  Foodie: [
    "Explore a local market and sample regional breakfast options.",
    "Try a popular local lunch and visit nearby food streets.",
    "Discover a cafe, bakery, or traditional food market.",
    "Enjoy a regional dinner and explore the evening food scene."
  ],
  Family: [
    "Enjoy a relaxed breakfast and visit a family-friendly attraction.",
    "Explore a park, aquarium, or interactive museum.",
    "Take a break and enjoy a family activity or local sightseeing.",
    "Visit an accessible attraction and finish with a relaxed meal."
  ]
};

function buildItinerary(style, destination, days) {
  const plan = activityPlans[style] || activityPlans.Relaxed;
  const itinerary = [];

  for (let day = 1; day <= days; day++) {
    itinerary.push({
      day,
      activity: plan[(day - 1) % plan.length]
    });
  }

  return itinerary;
}

function calculateBudget(budget) {
  return [
    { label: "Accommodation", amount: Math.round(budget * 0.35) },
    { label: "Food", amount: Math.round(budget * 0.25) },
    { label: "Transport", amount: Math.round(budget * 0.20) },
    { label: "Activities", amount: Math.round(budget * 0.15) },
    { label: "Emergency reserve", amount: Math.round(budget * 0.05) }
  ];
}

function renderItinerary(trip) {
  tripResult.replaceChildren();

  const card = document.createElement("article");
  card.className = "itinerary-card";

  const heading = document.createElement("h3");
  heading.textContent = `Your trip to ${trip.destination}`;
  card.appendChild(heading);

  const meta = document.createElement("p");
  meta.className = "itinerary-meta";
  meta.textContent =
    `${formatDate(trip.startDate)} – ${formatDate(trip.returnDate)} · ` +
    `${trip.days} day(s) · ${trip.travelers} traveler(s) · ${trip.style} · ` +
    `Budget: ₹${trip.budget.toLocaleString("en-IN")}`;
  card.appendChild(meta);

  const dayList = document.createElement("div");
  dayList.className = "itinerary-days";

  trip.itinerary.forEach(item => {
    const day = document.createElement("div");
    day.className = "itinerary-day";

    const dayHeading = document.createElement("h4");
    dayHeading.textContent = `Day ${item.day}`;

    const activity = document.createElement("p");
    activity.textContent = item.activity;

    day.append(dayHeading, activity);
    dayList.appendChild(day);
  });

  card.appendChild(dayList);

  const budgetHeading = document.createElement("h3");
  budgetHeading.textContent = "Suggested budget breakdown";
  card.appendChild(budgetHeading);

  const budgetList = document.createElement("div");
  budgetList.className = "itinerary-days";

  trip.budgetBreakdown.forEach(item => {
    const row = document.createElement("div");
    row.className = "itinerary-day";
    row.textContent = `${item.label}: ₹${item.amount.toLocaleString("en-IN")}`;
    budgetList.appendChild(row);
  });

  card.appendChild(budgetList);

  const actions = document.createElement("div");
  actions.className = "itinerary-actions";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "btn-primary";
  saveButton.textContent = "Save trip";
  saveButton.addEventListener("click", () => {
    const trips = readStorage(TRIPS_KEY, []);
    if (trips.some(existing => existing.id === trip.id)) {
      saveButton.textContent = "Already saved";
      return;
    }
    trips.unshift(trip);
    writeStorage(TRIPS_KEY, trips);
    saveButton.textContent = "Trip saved!";
    renderSavedTrips();
    populatePackingTrips();
  });

  const printButton = document.createElement("button");
  printButton.type = "button";
  printButton.className = "btn-secondary";
  printButton.textContent = "Print itinerary";
  printButton.addEventListener("click", () => window.print());

  actions.append(saveButton, printButton);
  card.appendChild(actions);
  tripResult.appendChild(card);
}

travelForm?.addEventListener("submit", event => {
  event.preventDefault();

  const destination = $("destination").value.trim();
  const startDate = $("start-date").value;
  const returnDate = $("return-date").value;
  const travelers = Number($("travelers").value);
  const style = $("travel-style").value;
  const budget = Number($("budget").value);

  if (!destination || !startDate || !returnDate || !Number.isFinite(budget) || budget <= 0) {
    tripResult.textContent = "Please complete all trip details and enter a budget greater than zero.";
    return;
  }

  if (startDate < todayString()) {
    tripResult.textContent = "Please choose a departure date that is today or later.";
    return;
  }

  if (returnDate < startDate) {
    tripResult.textContent = "Return date must be on or after the departure date.";
    return;
  }

  const days = daysBetween(startDate, returnDate) + 1;
  if (days > 60) {
    tripResult.textContent = "For this demo, please plan trips of 60 days or fewer.";
    return;
  }

  const trip = {
    id: makeId(),
    destination,
    startDate,
    returnDate,
    travelers,
    style,
    budget,
    days,
    itinerary: buildItinerary(style, destination, days),
    budgetBreakdown: calculateBudget(budget),
    createdAt: new Date().toISOString()
  };

  renderItinerary(trip);
});

// Set minimum dates and keep return date aligned with departure.
$("start-date").min = todayString();
$("return-date").min = todayString();

$("start-date").addEventListener("change", () => {
  $("return-date").min = $("start-date").value || todayString();
  if ($("return-date").value && $("return-date").value < $("start-date").value) {
    $("return-date").value = "";
  }
});

// ======================================
// SAVED TRIPS
// ======================================

function getTrips() {
  const trips = readStorage(TRIPS_KEY, []);
  return Array.isArray(trips) ? trips : [];
}

function renderSavedTrips() {
  const trips = getTrips();
  const list = $("saved-trips-list");
  const empty = $("saved-trips-empty");

  $("saved-trip-count").textContent = String(trips.length);
  list.replaceChildren();
  empty.classList.toggle("hidden", trips.length > 0);

  trips.forEach(trip => {
    const card = document.createElement("article");
    card.className = "saved-trip-card";

    const heading = document.createElement("h3");
    heading.textContent = trip.destination || "Saved trip";

    const dates = document.createElement("p");
    dates.textContent = `${formatDate(trip.startDate)} – ${formatDate(trip.returnDate)}`;

    const details = document.createElement("p");
    details.textContent =
      `${trip.travelers || 1} traveler(s) · ${trip.style || "Relaxed"} · ` +
      `₹${Number(trip.budget || 0).toLocaleString("en-IN")}`;

    const actions = document.createElement("div");
    actions.className = "saved-trip-actions";

    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.textContent = "View itinerary";
    loadButton.addEventListener("click", () => {
      renderItinerary(trip);
      $("planner").scrollIntoView({ behavior: "smooth" });
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-trip";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      const remaining = getTrips().filter(item => item.id !== trip.id);
      writeStorage(TRIPS_KEY, remaining);
      renderSavedTrips();
      populatePackingTrips();
    });

    actions.append(loadButton, deleteButton);
    card.append(heading, dates, details, actions);
    list.appendChild(card);
  });
}

$("refresh-saved-trips").addEventListener("click", () => {
  renderSavedTrips();
  populatePackingTrips();
});

// ======================================
// PACKING CHECKLIST
// ======================================

const packingTripSelect = $("packing-trip");
const packingForm = $("packing-form");
const packingItemInput = $("packing-item");
const packingList = $("packing-list");
const packingEmpty = $("packing-empty");
const packingProgressText = $("packing-progress-text");
const packingProgressBar = $("packing-progress-bar");

function getPackingData() {
  const data = readStorage(PACKING_KEY, {});
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function getTripKey(trip, index) {
  return String(trip.id || trip.createdAt || `${trip.destination || "trip"}-${trip.startDate || index}-${index}`);
}

function populatePackingTrips() {
  const previousValue = packingTripSelect.value;
  const trips = getTrips();

  packingTripSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a trip";
  packingTripSelect.appendChild(placeholder);

  trips.forEach((trip, index) => {
    const option = document.createElement("option");
    option.value = getTripKey(trip, index);
    option.textContent = `${trip.destination || "Unnamed trip"}${trip.startDate ? ` — ${trip.startDate}` : ""}`;
    packingTripSelect.appendChild(option);
  });

  if (trips.some((trip, index) => getTripKey(trip, index) === previousValue)) {
    packingTripSelect.value = previousValue;
  }

  renderPackingList();
}

function renderPackingList() {
  const tripKey = packingTripSelect.value;
  const allPacking = getPackingData();
  const items = tripKey && Array.isArray(allPacking[tripKey]) ? allPacking[tripKey] : [];

  packingList.replaceChildren();

  if (!tripKey) {
    packingEmpty.textContent = getTrips().length
      ? "Select a saved trip to see its checklist."
      : "Save a trip in the planner first, then create its packing checklist.";
    packingEmpty.classList.remove("hidden");
    packingProgressText.textContent = "Choose a trip to begin";
    packingProgressBar.style.width = "0%";
    return;
  }

  packingEmpty.textContent = "No items yet. Add your first packing item above.";
  packingEmpty.classList.toggle("hidden", items.length > 0);

  const packedCount = items.filter(item => item.packed).length;
  const percentage = items.length ? Math.round(packedCount / items.length * 100) : 0;
  packingProgressText.textContent = `${packedCount} of ${items.length} items packed (${percentage}%)`;
  packingProgressBar.style.width = `${percentage}%`;

  items.forEach((item, index) => {
    const li = document.createElement("li");
    if (item.packed) li.classList.add("is-packed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(item.packed);
    checkbox.setAttribute("aria-label", `Mark ${item.name} as packed`);
    checkbox.addEventListener("change", () => {
      const data = getPackingData();
      data[tripKey][index].packed = checkbox.checked;
      writeStorage(PACKING_KEY, data);
      renderPackingList();
    });

    const name = document.createElement("span");
    name.textContent = item.name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "packing-delete";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${item.name}`);
    remove.addEventListener("click", () => {
      const data = getPackingData();
      data[tripKey].splice(index, 1);
      writeStorage(PACKING_KEY, data);
      renderPackingList();
    });

    li.append(checkbox, name, remove);
    packingList.appendChild(li);
  });
}

packingTripSelect.addEventListener("change", renderPackingList);

packingForm.addEventListener("submit", event => {
  event.preventDefault();
  const tripKey = packingTripSelect.value;
  const itemName = packingItemInput.value.trim();

  if (!tripKey) {
    packingEmpty.textContent = "Please select a saved trip first.";
    packingEmpty.classList.remove("hidden");
    return;
  }
  if (!itemName) return;

  const data = getPackingData();
  if (!Array.isArray(data[tripKey])) data[tripKey] = [];
  data[tripKey].push({ name: itemName, packed: false });
  writeStorage(PACKING_KEY, data);

  packingItemInput.value = "";
  renderPackingList();
  packingItemInput.focus();
});

// ======================================
// DEMO LOGIN AND PROFILE
// ======================================

const accountForms = $("account-forms");
const profileView = $("profile-view");
const accountMessage = $("account-message");
const loginForm = $("login-form");
const signupForm = $("signup-form");

function showAccountMessage(message) {
  accountMessage.textContent = message;
}

function showAccountTab(tabName) {
  document.querySelectorAll("[data-account-tab]").forEach(button => {
    const active = button.dataset.accountTab === tabName;
    button.classList.toggle("active", active);
  });
  loginForm.classList.toggle("hidden", tabName !== "login");
  signupForm.classList.toggle("hidden", tabName !== "signup");
  showAccountMessage("");
}

document.querySelectorAll("[data-account-tab]").forEach(button => {
  button.addEventListener("click", () => showAccountTab(button.dataset.accountTab));
});

function getProfile() {
  const profile = readStorage(PROFILE_KEY, null);
  return profile && typeof profile === "object" ? profile : null;
}

function getSession() {
  const session = readStorage(SESSION_KEY, null);
  return session && typeof session === "object" ? session : null;
}

function renderAccount() {
  const session = getSession();

  if (session && session.name && session.email) {
    accountForms.classList.add("hidden");
    profileView.classList.remove("hidden");
    $("profile-name").textContent = session.name;
    $("profile-email").textContent = session.email;
    $("profile-avatar").textContent = session.name.trim().charAt(0).toUpperCase() || "T";
  } else {
    accountForms.classList.remove("hidden");
    profileView.classList.add("hidden");
  }
}

signupForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = $("signup-name").value.trim();
  const email = $("signup-email").value.trim();
  const password = $("signup-password").value;

  if (!name || !email || password.length < 4) {
    showAccountMessage("Please complete all fields and use at least 4 characters for the demo password.");
    return;
  }

  // This is a frontend demonstration: never store the password.
  const profile = { name, email };
  writeStorage(PROFILE_KEY, profile);
  writeStorage(SESSION_KEY, profile);
  signupForm.reset();
  showAccountMessage("Demo profile created.");
  renderAccount();
});

loginForm.addEventListener("submit", event => {
  event.preventDefault();

  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  if (!email || password.length < 4) {
    showAccountMessage("Enter a valid email and a demo password of at least 4 characters.");
    return;
  }

  // Demo only: this does not authenticate or verify a password.
  const savedProfile = getProfile();
  const session = savedProfile && savedProfile.email.toLowerCase() === email.toLowerCase()
    ? savedProfile
    : { name: email.split("@")[0] || "Traveler", email };

  writeStorage(SESSION_KEY, session);
  loginForm.reset();
  showAccountMessage("Demo login successful.");
  renderAccount();
});


$("logout-button").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  showAccountMessage("You have logged out of the demo profile.");
  renderAccount();
  showAccountTab("login");
});


// ======================================
// FLIGHT AND HOTEL SEARCH DEMO
// ======================================

const bookingTabs = document.querySelectorAll("[data-booking-tab]");
const flightForm = $("flight-search-form");
const hotelForm = $("hotel-search-form");
const bookingResults = $("booking-results");

function showBookingTab(tabName) {
  bookingTabs.forEach(tab => {
    tab.classList.toggle("active", tab.dataset.bookingTab === tabName);
  });

  flightForm.classList.toggle("hidden", tabName !== "flights");
  hotelForm.classList.toggle("hidden", tabName !== "hotels");

  showBookingPlaceholder(
    tabName === "flights" ? "✈️" : "🏨",
    tabName === "flights" ? "Where would you like to fly?" : "Where would you like to stay?",
    `Enter your details above to view sample ${tabName === "flights" ? "flight" : "hotel"} options.`
  );
}

bookingTabs.forEach(tab => {
  tab.addEventListener("click", () => showBookingTab(tab.dataset.bookingTab));
});

function showBookingPlaceholder(icon, title, message) {
  bookingResults.replaceChildren();
  const box = document.createElement("div");
  box.className = "booking-placeholder";
  const emoji = document.createElement("span");
  emoji.className = "booking-placeholder-icon";
  emoji.textContent = icon;
  const heading = document.createElement("h3");
  heading.textContent = title;
  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  box.append(emoji, heading, paragraph);
  bookingResults.appendChild(box);
}

function showBookingError(message) {
  bookingResults.replaceChildren();
  const error = document.createElement("p");
  error.className = "booking-error";
  error.textContent = message;
  bookingResults.appendChild(error);
}

function addBookingResult(title, details, price) {
  const card = document.createElement("article");
  card.className = "booking-result-card";

  const info = document.createElement("div");
  info.className = "booking-result-info";
  const heading = document.createElement("h3");
  heading.textContent = title;
  info.appendChild(heading);

  details.forEach(detail => {
    const paragraph = document.createElement("p");
    paragraph.textContent = detail;
    info.appendChild(paragraph);
  });

  const priceArea = document.createElement("div");
  priceArea.className = "booking-result-price";
  const priceText = document.createElement("strong");
  priceText.textContent = price;

  const selectButton = document.createElement("button");
  selectButton.type = "button";
  selectButton.textContent = "Select option";
  selectButton.addEventListener("click", () => {
    selectButton.textContent = "Selected";
    selectButton.disabled = true;
    const note = document.createElement("p");
    note.className = "booking-demo-note";
    note.textContent = "Demo selection only. This option has not been booked.";
    card.appendChild(note);
  });

  priceArea.append(priceText, selectButton);
  card.append(info, priceArea);
  bookingResults.appendChild(card);
}

function startBookingResults(title, note) {
  bookingResults.replaceChildren();
  const heading = document.createElement("h2");
  heading.className = "booking-results-heading";
  heading.textContent = title;
  const disclaimer = document.createElement("p");
  disclaimer.className = "booking-demo-note";
  disclaimer.textContent = note;
  bookingResults.append(heading, disclaimer);
}

const sampleFlights = [
  { airline: "SkyWay Air", time: "08:30 AM", duration: "6h 20m", stops: "Non-stop", fare: 12500 },
  { airline: "CloudLine Airways", time: "01:15 PM", duration: "8h 05m", stops: "1 stop", fare: 9800 },
  { airline: "Horizon Express", time: "07:45 PM", duration: "5h 55m", stops: "Non-stop", fare: 15700 }
];

flightForm.addEventListener("submit", event => {
  event.preventDefault();

  const from = $("flight-from").value.trim();
  const to = $("flight-to").value.trim();
  const departure = $("flight-departure").value;
  const returnDate = $("flight-return").value;
  const passengers = Number($("flight-passengers").value);
  const travelClass = $("flight-class").value;

  if (!from || !to || !departure) {
    showBookingError("Please enter your departure city, destination, and departure date.");
    return;
  }
  if (from.toLowerCase() === to.toLowerCase()) {
    showBookingError("Departure and destination must be different.");
    return;
  }
  if (departure < todayString()) {
    showBookingError("Please choose a departure date that is today or later.");
    return;
  }
  if (returnDate && returnDate < departure) {
    showBookingError("Return date must be on or after departure.");
    return;
  }

  startBookingResults(
    `Sample flights: ${from} to ${to}`,
    "Illustrative demo fares only. These are not live schedules, airline offers, or bookable prices."
  );

  sampleFlights.forEach(flight => {
    const total = flight.fare * passengers;
    addBookingResult(
      flight.airline,
      [
        `${from} → ${to}`,
        `${formatDate(departure)}${returnDate ? ` – ${formatDate(returnDate)}` : " · One-way"}`,
        `${flight.time} · ${flight.duration} · ${flight.stops}`,
        `${passengers} passenger(s) · ${travelClass}`
      ],
      `₹${total.toLocaleString("en-IN")}*`
    );
  });
});

const sampleHotels = [
  { name: "City Garden Hotel", type: "Budget", rating: "3-star demo", nightly: 3200, tier: "budget" },
  { name: "Grand Horizon Stay", type: "Mid-range", rating: "4-star demo", nightly: 6800, tier: "midrange" },
  { name: "Royal Vista Resort", type: "Luxury", rating: "5-star demo", nightly: 14500, tier: "luxury" }
];

hotelForm.addEventListener("submit", event => {
  event.preventDefault();

  const destination = $("hotel-destination").value.trim();
  const checkin = $("hotel-checkin").value;
  const checkout = $("hotel-checkout").value;
  const guests = Number($("hotel-guests").value);
  const rooms = Number($("hotel-rooms").value);
  const budget = $("hotel-budget").value;

  if (!destination || !checkin || !checkout) {
    showBookingError("Please enter your destination, check-in, and check-out dates.");
    return;
  }
  if (checkin < todayString()) {
    showBookingError("Please choose a check-in date that is today or later.");
    return;
  }
  if (checkout <= checkin) {
    showBookingError("Check-out must be after check-in.");
    return;
  }

  const nights = daysBetween(checkin, checkout);
  const hotels = sampleHotels.filter(hotel => budget === "any" || hotel.tier === budget);

  startBookingResults(
    `Sample hotels in ${destination}`,
    "Illustrative demo rates only. Not live availability or bookable hotel offers; taxes and fees are not included."
  );

  hotels.forEach(hotel => {
    const total = hotel.nightly * nights * rooms;
    addBookingResult(
      hotel.name,
      [
        `${destination} · ${hotel.type} · ${hotel.rating}`,
        `Check-in: ${formatDate(checkin)}`,
        `Check-out: ${formatDate(checkout)} · ${nights} night(s)`,
        `${guests} guest(s) · ${rooms} room(s)`,
        `Illustrative rate: ₹${hotel.nightly.toLocaleString("en-IN")} per room, per night`
      ],
      `₹${total.toLocaleString("en-IN")}*`
    );
  });

  if (hotels.length === 0) {
    showBookingError("No sample hotels match that budget. Try another budget category.");
  }
});

// Booking date constraints
["flight-departure", "flight-return", "hotel-checkin", "hotel-checkout"].forEach(id => {
  $(id).min = todayString();
});

$("flight-departure").addEventListener("change", () => {
  const departure = $("flight-departure").value;
  $("flight-return").min = departure || todayString();
  if ($("flight-return").value && $("flight-return").value < departure) {
    $("flight-return").value = "";
  }
});

$("hotel-checkin").addEventListener("change", () => {
  const checkin = $("hotel-checkin").value;
  $("hotel-checkout").min = checkin || todayString();
  if ($("hotel-checkout").value && $("hotel-checkout").value <= checkin) {
    $("hotel-checkout").value = "";
  }
});

// ======================================
// INITIALIZE APP
// ======================================

renderSavedTrips();
populatePackingTrips();
renderAccount();
showBookingTab("flights");