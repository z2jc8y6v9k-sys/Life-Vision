
const SUPABASE_URL = "https://ssbgtibgpazxtnoagyrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_9RfCRi_W5ZecyZsY-l_Pgg_CNt9ueDG";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const categories = {
  Relationships: { color: "#1f4e79" },
  Health: { color: "#2e7d32" },
  Adventure: { color: "#0077b6" },
  Creativity: { color: "#6f42c1" },
  Impact: { color: "#e67e22" }
};

const ageBands = ["On-going", "53-58", "58-63", "63-68", "68-73", "73-78", "78-83", "83-88", "88-93"];

const starterGoals = [
  { category: "Relationships", title: "Spend time with my mom" },
  { category: "Relationships", title: "Spend as much time as possible with my kids" },
  { category: "Health", title: "Build strength, muscle, v02, reduce cholesterol, health span, pliability, energy over the next 10 years and then maintain as long as possible" },
  { category: "Adventure", title: "Live in Italy for 3 to 6 months" },
  { category: "Adventure", title: "Initiate My Town Project in 3-4 towns" },
  { category: "Adventure", title: "See Jason Isbell, Marcus King and Lyle Lovett in concert" },
  { category: "Adventure", title: "Have really cool adventures a year" },
  { category: "Creativity", title: "Write and finish one book" },
  { category: "Creativity", title: "Play in bands 8-10x/year" },
  { category: "Creativity", title: "Write music with Mark" },
  { category: "Creativity", title: "Read 20-30 books/year" },
  { category: "Creativity", title: "Own a profitable production company that creates theater, videos, articles, tv shows, books and other creative pursuits" },
  { category: "Impact", title: "Start a business that is high on impact, purpose and working with really great people" },
  { category: "Impact", title: "Teach a grad school class on leadership, culture and purpose" },
  { category: "Impact", title: "Build a convening mechanism that delivers real and durable outcomes for people (use AI prompts)" },
  { category: "Impact", title: "Maybe do something in politics" },
  { category: "Impact", title: "Help leaders become more effective." }
];

let state = { goals: [], user: null, reviews: { quarterly: "", annual: "" } };
let activeCategory = "All";
let showAdd = false;
let saveTimer = null;
let updateTimers = {};

async function init() {
  const { data } = await supabaseClient.auth.getSession();
  state.user = data.session?.user || null;
  if (!state.user) return renderAuth();
  await seedStarterGoalsIfEmpty();
  await loadGoals();
  loadLocalReviews();
  render();
}

function renderAuth(message = "") {
  document.getElementById("app").innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <h1>My Life Vision</h1>
        <p>Sign in to sync your goals between your Mac and iPhone.</p>
        <input id="email" type="email" placeholder="Email" />
        <input id="password" type="password" placeholder="Password" />
        <div class="auth-actions">
          <button onclick="signIn()">Sign In</button>
          <button class="secondary" onclick="signUp()">Create Account</button>
        </div>
        <div class="message">${escapeHtml(message)}</div>
      </div>
    </div>`;
}

async function signUp() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) return renderAuth(error.message);
  const session = await supabaseClient.auth.getSession();
  state.user = session.data.session?.user || data.user;
  await seedStarterGoalsIfEmpty();
  await loadGoals();
  render();
}

async function signIn() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return renderAuth(error.message);
  state.user = data.user;
  await seedStarterGoalsIfEmpty();
  await loadGoals();
  loadLocalReviews();
  render();
}

async function logout() {
  await supabaseClient.auth.signOut();
  state = { goals: [], user: null, reviews: { quarterly: "", annual: "" } };
  renderAuth("Signed out.");
}

async function seedStarterGoalsIfEmpty() {
  const { data, error } = await supabaseClient.from("goals").select("id").limit(1);
  if (error) return alert("Database error: " + error.message);
  if (data && data.length > 0) return;
  const rows = starterGoals.map(g => ({ user_id: state.user.id, category: g.category, title: g.title, why: "", people: "", money: "", next30: "", next12: "", progress: 0, ages: [] }));
  await supabaseClient.from("goals").insert(rows);
}

async function loadGoals() {
  const { data, error } = await supabaseClient.from("goals").select("*").order("created_at", { ascending: true });
  if (error) return alert("Could not load goals: " + error.message);
  state.goals = data || [];
}

function showSaved(text = "Saved to cloud") {
  const el = document.getElementById("saveStatus");
  if (!el) return;
  el.textContent = text;
  el.style.background = text.includes("error") ? "#fff1f2" : "#ecfdf3";
  el.style.color = text.includes("error") ? "#9f1239" : "#027a48";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { if (el) el.textContent = "Cloud Sync On"; }, 1400);
}

function updateGoalNoRender(id, key, value) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  goal[key] = value;
  clearTimeout(updateTimers[id + key]);
  updateTimers[id + key] = setTimeout(async () => {
    const { error } = await supabaseClient.from("goals").update({ [key]: value, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) showSaved("Save error"); else showSaved();
  }, 450);
}

function updateProgress(id, value) {
  updateGoalNoRender(id, "progress", Number(value));
  const fill = document.querySelector(`[data-progress-fill="${id}"]`);
  const label = document.querySelector(`[data-progress-label="${id}"]`);
  if (fill) fill.style.width = `${value}%`;
  if (label) label.textContent = `Progress: ${value}%`;
  updateStatsOnly();
  updateDashboardOnly();
}

async function toggleAge(id, age) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  goal.ages = goal.ages.includes(age) ? goal.ages.filter(a => a !== age) : [...goal.ages, age];
  const { error } = await supabaseClient.from("goals").update({ ages: goal.ages, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) showSaved("Save error"); else showSaved();
}

async function addGoal(event) {
  event.preventDefault();
  const title = document.getElementById("newGoalTitle").value.trim();
  const category = document.getElementById("newGoalCategory").value;
  if (!title) return;
  const row = { user_id: state.user.id, category, title, why: "", people: "", money: "", next30: "", next12: "", progress: 0, ages: [] };
  const { error } = await supabaseClient.from("goals").insert(row);
  if (error) return alert("Could not add goal: " + error.message);
  showAdd = false;
  await loadGoals();
  render();
}

async function deleteGoal(id) {
  if (!confirm("Delete this goal?")) return;
  const { error } = await supabaseClient.from("goals").delete().eq("id", id);
  if (error) return alert("Could not delete goal: " + error.message);
  await loadGoals();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ goals: state.goals, reviews: state.reviews }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "my-life-vision-v4-backup.json";
  a.click();
}

function loadLocalReviews() {
  const key = `lifeVisionReviews_${state.user.id}`;
  try { state.reviews = JSON.parse(localStorage.getItem(key)) || { quarterly: "", annual: "" }; } catch(e) {}
}

function updateReview(key, value) {
  state.reviews[key] = value;
  localStorage.setItem(`lifeVisionReviews_${state.user.id}`, JSON.stringify(state.reviews));
  showSaved("Saved locally");
}

function filteredGoals() {
  return activeCategory === "All" ? state.goals : state.goals.filter(g => g.category === activeCategory);
}

function completionStats() {
  const total = state.goals.length || 1;
  const avg = Math.round(state.goals.reduce((sum, g) => sum + Number(g.progress || 0), 0) / total);
  const active = state.goals.filter(g => Number(g.progress || 0) > 0).length;
  const complete = state.goals.filter(g => Number(g.progress || 0) >= 100).length;
  return { total, avg, active, complete };
}

function categoryStats() {
  return Object.keys(categories).map(cat => {
    const goals = state.goals.filter(g => g.category === cat);
    const avg = goals.length ? Math.round(goals.reduce((s,g)=>s+Number(g.progress||0),0)/goals.length) : 0;
    return { cat, count: goals.length, avg };
  });
}

function recentGoals() {
  return [...state.goals].sort((a,b)=>new Date(b.updated_at || b.created_at)-new Date(a.updated_at || a.created_at)).slice(0,5);
}

function updateStatsOnly() {
  const stats = completionStats();
  ["Total","Avg","Active","Complete"].forEach(k => {
    const el = document.getElementById("stat"+k);
    if (!el) return;
    if (k==="Total") el.textContent = stats.total;
    if (k==="Avg") el.textContent = stats.avg + "%";
    if (k==="Active") el.textContent = stats.active;
    if (k==="Complete") el.textContent = stats.complete;
  });
}

function updateDashboardOnly() {
  const el = document.getElementById("categoryProgress");
  if (el) el.innerHTML = categoryProgressHtml();
}

function categoryProgressHtml() {
  return categoryStats().map(s => `
    <div class="category-row">
      <span style="color:${categories[s.cat].color}">${s.cat}</span>
      <div class="mini-bar"><div class="mini-fill" style="width:${s.avg}%;background:${categories[s.cat].color}"></div></div>
      <small>${s.avg}%</small>
    </div>`).join("");
}

function recentHtml() {
  return recentGoals().map(g => `
    <div class="recent-item">
      <strong style="color:${categories[g.category].color}">${escapeHtml(g.title)}</strong>
      <small>${g.category} • Progress ${g.progress || 0}%</small>
    </div>`).join("");
}

function fieldCard(goal, key, label, className = "") {
  const color = categories[goal.category].color;
  return `
    <div class="field-card ${className}">
      <div class="field-header" style="background:${color}">${label}</div>
      <textarea class="field-body ${className === "full" ? "large" : ""}" style="color:${color}" oninput="updateGoalNoRender('${goal.id}', '${key}', this.value)">${escapeHtml(goal[key] || "")}</textarea>
    </div>`;
}

function goalCard(goal) {
  const color = categories[goal.category].color;
  return `
    <article class="goal-card">
      <div class="goal-top">
        <span class="category-pill" style="background:${color}">${goal.category}</span>
        <textarea class="goal-title" style="color:${color}" oninput="updateGoalNoRender('${goal.id}', 'title', this.value)">${escapeHtml(goal.title)}</textarea>
      </div>
      ${fieldCard(goal, "why", "Why This Matters", "full")}
      <div class="timeline-label">Time Horizon</div>
      <div class="timeline">${ageBands.map(age => `<label class="age-chip"><input type="checkbox" ${goal.ages?.includes(age) ? "checked" : ""} onchange="toggleAge('${goal.id}', '${age}')" />${age}</label>`).join("")}</div>
      <div class="grid-two">${fieldCard(goal, "people", "People")}${fieldCard(goal, "money", "Money")}</div>
      <div class="grid-two">${fieldCard(goal, "next30", "Next 30 Days")}${fieldCard(goal, "next12", "Next 12 Months")}</div>
      <div class="card-actions">
        <div class="progress-wrap">
          <div class="progress-label" data-progress-label="${goal.id}">Progress: ${goal.progress || 0}%</div>
          <input class="progress-slider" type="range" min="0" max="100" value="${goal.progress || 0}" oninput="updateProgress('${goal.id}', this.value)" />
          <div class="progress-bar"><div class="progress-fill" data-progress-fill="${goal.id}" style="width:${goal.progress || 0}%;background:${color}"></div></div>
        </div>
        <button class="delete" onclick="deleteGoal('${goal.id}')">Delete</button>
      </div>
    </article>`;
}

function addForm() {
  return `
    <form class="add-form" onsubmit="addGoal(event)">
      <strong>Add a New Goal</strong>
      <textarea id="newGoalTitle" rows="3" placeholder="Write your goal..."></textarea>
      <select id="newGoalCategory">${Object.keys(categories).map(c => `<option value="${c}">${c}</option>`).join("")}</select>
      <button type="submit">Add Goal</button>
    </form>`;
}

function reviewsHtml() {
  return `
    <section class="panel">
      <h3>Planning Reviews</h3>
      <div class="review-grid">
        <div class="review-card">
          <div class="field-header" style="background:#111827">Quarterly Review</div>
          <textarea placeholder="What changed this quarter? What needs attention?" oninput="updateReview('quarterly', this.value)">${escapeHtml(state.reviews.quarterly || "")}</textarea>
        </div>
        <div class="review-card">
          <div class="field-header" style="background:#111827">Annual Review</div>
          <textarea placeholder="What mattered most this year? What do I want next year?" oninput="updateReview('annual', this.value)">${escapeHtml(state.reviews.annual || "")}</textarea>
        </div>
      </div>
    </section>`;
}

function render() {
  const stats = completionStats();
  const nav = ["All", ...Object.keys(categories)].map(cat => {
    const color = cat === "All" ? "#111827" : categories[cat].color;
    return `<button class="nav-button ${activeCategory === cat ? "active" : ""}" style="${activeCategory === cat ? `background:${color}` : ""}" onclick="activeCategory='${cat}'; render();">${cat}</button>`;
  }).join("");
  const grouped = Object.keys(categories).map(cat => {
    const goals = filteredGoals().filter(g => g.category === cat);
    if (!goals.length) return "";
    return `<h3 class="category-title" style="color:${categories[cat].color}">${cat}</h3>${goals.map(goalCard).join("")}`;
  }).join("");
  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><h1>My Life Vision</h1><p>Strategic Life Workbook | Ages 53–93</p></div>
        ${nav}
        <button class="add-button" onclick="showAdd=!showAdd; render();">${showAdd ? "Close Add Goal" : "+ Add Goal"}</button>
        <button class="utility-button" onclick="exportData()">Export Backup</button>
        <button class="utility-button" onclick="logout()">Sign Out</button>
        <div id="saveStatus" class="save-status">Cloud Sync On</div>
        <div class="user-box">Signed in as:<br>${escapeHtml(state.user.email || "")}</div>
      </aside>
      <main class="content">
        <section class="hero">
          <div><h2>Life Portfolio</h2><p>A cloud-synced operating system for your goals, people, money, next actions, and long-term life horizon.</p></div>
          <div class="hero-badge"><strong>${stats.avg}%</strong><span>Average progress across ${stats.total} goals</span></div>
        </section>
        <section class="stats">
          <div class="stat"><strong id="statTotal">${stats.total}</strong><span>Total goals</span></div>
          <div class="stat"><strong id="statAvg">${stats.avg}%</strong><span>Average progress</span></div>
          <div class="stat"><strong id="statActive">${stats.active}</strong><span>Goals started</span></div>
          <div class="stat"><strong id="statComplete">${stats.complete}</strong><span>Completed</span></div>
        </section>
        <section class="dashboard-grid">
          <div class="panel"><h3>Progress by Category</h3><div id="categoryProgress">${categoryProgressHtml()}</div></div>
          <div class="panel"><h3>Recently Updated</h3><div class="recent-list">${recentHtml()}</div></div>
        </section>
        ${reviewsHtml()}
        ${showAdd ? addForm() : ""}
        ${grouped}
      </main>
    </div>`;
}

function escapeHtml(text) {
  return String(text || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

init();
