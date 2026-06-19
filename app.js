const categories = {
  Relationships: { color: "#1f4e79" },
  Health: { color: "#2e7d32" },
  Adventure: { color: "#0077b6" },
  Creativity: { color: "#6f42c1" },
  Impact: { color: "#e67e22" }
};

const ageBands = ["On-going", "53-58", "58-63", "63-68", "68-73", "73-78", "78-83", "83-88", "88-93"];
const storageKey = "lifeVisionGoalsV2";

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

let state = loadState();
let activeCategory = "All";
let showAdd = false;
let saveTimer = null;

function createGoal(goal) {
  return {
    id: self.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    category: goal.category,
    title: goal.title,
    why: "",
    people: "",
    money: "",
    next30: "",
    next12: "",
    ages: [],
    progress: 0,
    updatedAt: new Date().toISOString()
  };
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.goals)) return parsed;
    } catch (e) {}
  }

  const v1 = localStorage.getItem("lifeVisionGoalsV1");
  if (v1) {
    try {
      const parsed = JSON.parse(v1);
      if (parsed && Array.isArray(parsed.goals)) {
        localStorage.setItem(storageKey, JSON.stringify(parsed));
        return parsed;
      }
    } catch (e) {}
  }

  return { goals: starterGoals.map(createGoal) };
}

function saveState(show = true) {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (show) showSaved();
}

function showSaved() {
  const el = document.getElementById("saveStatus");
  if (!el) return;
  el.textContent = "Saved";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { if (el) el.textContent = "Autosave On"; }, 1200);
}

function updateGoalNoRender(id, key, value) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  goal[key] = value;
  goal.updatedAt = new Date().toISOString();
  saveState();
}

function updateProgress(id, value) {
  updateGoalNoRender(id, "progress", Number(value));
  const fill = document.querySelector(`[data-progress-fill="${id}"]`);
  const label = document.querySelector(`[data-progress-label="${id}"]`);
  if (fill) fill.style.width = `${value}%`;
  if (label) label.textContent = `Progress: ${value}%`;
  updateStatsOnly();
}

function toggleAge(id, age) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  goal.ages = goal.ages.includes(age) ? goal.ages.filter(a => a !== age) : [...goal.ages, age];
  goal.updatedAt = new Date().toISOString();
  saveState();
}

function addGoal(event) {
  event.preventDefault();
  const title = document.getElementById("newGoalTitle").value.trim();
  const category = document.getElementById("newGoalCategory").value;
  if (!title) return;
  state.goals.push(createGoal({ title, category }));
  saveState(false);
  showAdd = false;
  render();
}

function deleteGoal(id) {
  if (!confirm("Delete this goal?")) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveState(false);
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "my-life-vision-data-v2.json";
  a.click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.goals)) throw new Error("Invalid file");
      state = parsed;
      saveState(false);
      render();
      alert("Import complete.");
    } catch (e) {
      alert("That file could not be imported.");
    }
  };
  reader.readAsText(file);
}

function resetApp() {
  if (!confirm("Reset all goals and notes to the original starter version?")) return;
  localStorage.removeItem(storageKey);
  state = { goals: starterGoals.map(createGoal) };
  render();
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

function updateStatsOnly() {
  const stats = completionStats();
  const total = document.getElementById("statTotal");
  const avg = document.getElementById("statAvg");
  const active = document.getElementById("statActive");
  const complete = document.getElementById("statComplete");
  if (total) total.textContent = stats.total;
  if (avg) avg.textContent = `${stats.avg}%`;
  if (active) active.textContent = stats.active;
  if (complete) complete.textContent = stats.complete;
}

function fieldCard(goal, key, label, className = "") {
  const color = categories[goal.category].color;
  return `
    <div class="field-card ${className}">
      <div class="field-header" style="background:${color}">${label}</div>
      <textarea class="field-body ${className === "full" ? "large" : ""}" style="color:${color}" 
        oninput="updateGoalNoRender('${goal.id}', '${key}', this.value)">${escapeHtml(goal[key] || "")}</textarea>
    </div>
  `;
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
      <div class="timeline">
        ${ageBands.map(age => `
          <label class="age-chip">
            <input type="checkbox" ${goal.ages.includes(age) ? "checked" : ""} onchange="toggleAge('${goal.id}', '${age}')" />
            ${age}
          </label>
        `).join("")}
      </div>

      <div class="grid-two">
        ${fieldCard(goal, "people", "People")}
        ${fieldCard(goal, "money", "Money")}
      </div>

      <div class="grid-two">
        ${fieldCard(goal, "next30", "Next 30 Days")}
        ${fieldCard(goal, "next12", "Next 12 Months")}
      </div>

      <div class="card-actions">
        <div class="progress-wrap">
          <div class="progress-label" data-progress-label="${goal.id}">Progress: ${goal.progress || 0}%</div>
          <input class="progress-slider" type="range" min="0" max="100" value="${goal.progress || 0}" 
            oninput="updateProgress('${goal.id}', this.value)" />
          <div class="progress-bar"><div class="progress-fill" data-progress-fill="${goal.id}" style="width:${goal.progress || 0}%; background:${color}"></div></div>
        </div>
        <button class="delete" onclick="deleteGoal('${goal.id}')">Delete</button>
      </div>
    </article>
  `;
}

function addForm() {
  return `
    <form class="add-form" onsubmit="addGoal(event)">
      <strong>Add a New Goal</strong>
      <textarea id="newGoalTitle" rows="3" placeholder="Write your goal..."></textarea>
      <select id="newGoalCategory">
        ${Object.keys(categories).map(c => `<option value="${c}">${c}</option>`).join("")}
      </select>
      <button type="submit">Add Goal</button>
    </form>
  `;
}

function render() {
  const stats = completionStats();
  const nav = ["All", ...Object.keys(categories)].map(cat => {
    const color = cat === "All" ? "#111827" : categories[cat].color;
    return `<button class="nav-button ${activeCategory === cat ? "active" : ""}" 
      style="${activeCategory === cat ? `background:${color}` : ""}"
      onclick="activeCategory='${cat}'; render();">${cat}</button>`;
  }).join("");

  const grouped = Object.keys(categories).map(cat => {
    const goals = filteredGoals().filter(g => g.category === cat);
    if (!goals.length) return "";
    return `<h3 class="category-title" style="color:${categories[cat].color}">${cat}</h3>${goals.map(goalCard).join("")}`;
  }).join("");

  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <h1>My Life Vision</h1>
          <p>Strategic Life Workbook | Ages 53–93</p>
        </div>
        ${nav}
        <button class="add-button" onclick="showAdd=!showAdd; render();">${showAdd ? "Close Add Goal" : "+ Add Goal"}</button>
        <button class="utility-button" onclick="exportData()">Export Data</button>
        <label class="import-label">Import Data<input class="import-input" type="file" accept="application/json" onchange="importData(event)" /></label>
        <button class="utility-button" onclick="resetApp()">Reset</button>
        <div id="saveStatus" class="save-status">Autosave On</div>
      </aside>

      <main class="content">
        <section class="hero">
          <h2>Life Portfolio</h2>
          <p>Add goals, fill in your planning fields, choose age horizons, and track progress over time. Your writing is saved automatically in this browser.</p>
        </section>

        <section class="stats">
          <div class="stat"><strong id="statTotal">${stats.total}</strong><span>Total goals</span></div>
          <div class="stat"><strong id="statAvg">${stats.avg}%</strong><span>Average progress</span></div>
          <div class="stat"><strong id="statActive">${stats.active}</strong><span>Goals started</span></div>
          <div class="stat"><strong id="statComplete">${stats.complete}</strong><span>Completed</span></div>
        </section>

        ${showAdd ? addForm() : ""}
        ${grouped}
      </main>
    </div>
  `;
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

render();
