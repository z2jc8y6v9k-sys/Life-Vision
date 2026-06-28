
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
const statuses = ["Not Started", "In Progress", "On Track", "At Risk", "Completed"];
const behaviorRatings = ["Needs Improvement", "Meets", "Exceeds"];
const metricKeys = ["Strength", "VO2", "Weight", "Cholesterol", "Energy", "Kids", "Mom", "Friends", "Books Read", "Songs Written"];

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

let state = { goals: [], user: null, reviews: {}, metrics: {}, vision: [] };
let activeCategory = "All";
let activeView = "Workbook";
let showAdd = false;
let showAddVision = false;
let saveTimer = null;
let updateTimers = {};

async function init() {
  const { data } = await supabaseClient.auth.getSession();
  state.user = data.session?.user || null;
  if (!state.user) return renderAuth();
  await seedStarterGoalsIfEmpty();
  await Promise.all([loadGoals(), loadReviews(), loadMetrics(), loadVision()]);
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
  await Promise.all([loadGoals(), loadReviews(), loadMetrics(), loadVision()]);
  render();
}

async function signIn() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return renderAuth(error.message);
  state.user = data.user;
  await seedStarterGoalsIfEmpty();
  await Promise.all([loadGoals(), loadReviews(), loadMetrics(), loadVision()]);
  render();
}

async function logout() {
  await supabaseClient.auth.signOut();
  state = { goals: [], user: null, reviews: {}, metrics: {}, vision: [] };
  renderAuth("Signed out.");
}

async function seedStarterGoalsIfEmpty() {
  const { data, error } = await supabaseClient.from("goals").select("id").limit(1);
  if (error) return alert("Database error: " + error.message + "\nDid you run the v5 SQL migration?");
  if (data && data.length > 0) return;
  const rows = starterGoals.map(g => ({ 
    user_id: state.user.id, category: g.category, title: g.title, why: "", people: "", money: "", 
    next30: "", next12: "", progress: 0, ages: [], status: "Not Started", objective: "", key_results: "", friction: "", resources: ""
  }));
  await supabaseClient.from("goals").insert(rows);
}

async function loadGoals() {
  const { data, error } = await supabaseClient.from("goals").select("*").order("created_at", { ascending: true });
  if (error) return alert("Could not load goals: " + error.message);
  state.goals = data || [];
}
async function loadReviews() {
  const { data, error } = await supabaseClient.from("life_reviews").select("*");
  if (error) return;
  state.reviews = {};
  (data || []).forEach(r => state.reviews[r.review_type] = r.content || "");
}
async function loadMetrics() {
  const { data, error } = await supabaseClient.from("life_metrics").select("*");
  if (error) return;
  state.metrics = {};
  (data || []).forEach(m => state.metrics[m.metric_key] = m.metric_value || "");
}
async function loadVision() {
  const { data, error } = await supabaseClient.from("vision_items").select("*").order("created_at", { ascending: true });
  if (error) return;
  state.vision = data || [];
}

function showSaved(text = "Saved to cloud") {
  const el = document.getElementById("saveStatus");
  if (!el) return;
  el.textContent = text;
  el.style.background = text.toLowerCase().includes("error") ? "#fff1f2" : "#ecfdf3";
  el.style.color = text.toLowerCase().includes("error") ? "#9f1239" : "#027a48";
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
  if (label) { const goal = state.goals.find(g => g.id === id); label.textContent = `${progressLabelFor(goal)}: ${value}%`; }
  updateStatsOnly();
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
  const row = { user_id: state.user.id, category, title, why: "", people: "", money: "", next30: "", next12: "", progress: 0, ages: [], status: "Not Started", objective:"", key_results:"", today_this_week:"", behavior_standard:"", goal_type:"Project", behavior_rating:"Needs Improvement", priority_rank:null, resource_time:"", resource_money:"", resource_physical:"", wins:"", lessons:"", today_this_week:"", friction:"", resources:"" };
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

async function updateReview(type, value) {
  state.reviews[type] = value;
  clearTimeout(updateTimers["review"+type]);
  updateTimers["review"+type] = setTimeout(async () => {
    const { error } = await supabaseClient.from("life_reviews").upsert({ user_id: state.user.id, review_type: type, content: value, updated_at: new Date().toISOString() }, { onConflict: "user_id,review_type" });
    if (error) showSaved("Save error"); else showSaved();
  }, 450);
}

async function updateMetric(key, value) {
  state.metrics[key] = value;
  clearTimeout(updateTimers["metric"+key]);
  updateTimers["metric"+key] = setTimeout(async () => {
    const { error } = await supabaseClient.from("life_metrics").upsert({ user_id: state.user.id, metric_key: key, metric_value: value, updated_at: new Date().toISOString() }, { onConflict: "user_id,metric_key" });
    if (error) showSaved("Save error"); else showSaved();
  }, 450);
}

async function addVisionItem(event) {
  event.preventDefault();
  const row = {
    user_id: state.user.id,
    category: document.getElementById("visionCategory").value,
    title: document.getElementById("visionTitle").value.trim(),
    image_url: document.getElementById("visionImage").value.trim(),
    note: document.getElementById("visionNote").value.trim()
  };
  const { error } = await supabaseClient.from("vision_items").insert(row);
  if (error) return alert("Could not add vision item: " + error.message);
  showAddVision = false;
  await loadVision();
  render();
}

async function updateVision(id, key, value) {
  const item = state.vision.find(v => v.id === id);
  if (!item) return;
  item[key] = value;
  clearTimeout(updateTimers["vision"+id+key]);
  updateTimers["vision"+id+key] = setTimeout(async () => {
    const { error } = await supabaseClient.from("vision_items").update({ [key]: value, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) showSaved("Save error"); else showSaved();
  }, 450);
}

async function deleteVision(id) {
  if (!confirm("Delete this vision item?")) return;
  await supabaseClient.from("vision_items").delete().eq("id", id);
  await loadVision();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ goals: state.goals, reviews: state.reviews, metrics: state.metrics, vision: state.vision }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "my-life-vision-v5-backup.json";
  a.click();
}

function filteredGoals() {
  return activeCategory === "All" ? state.goals : state.goals.filter(g => g.category === activeCategory);
}
function completionStats() {
  const total = state.goals.length || 1;
  const avg = Math.round(state.goals.reduce((sum, g) => sum + Number(g.progress || 0), 0) / total);
  const active = state.goals.filter(g => Number(g.progress || 0) > 0).length;
  const complete = state.goals.filter(g => Number(g.progress || 0) >= 100 || g.status === "Completed").length;
  return { total, avg, active, complete };
}
function categoryStats() {
  return Object.keys(categories).map(cat => {
    const goals = state.goals.filter(g => g.category === cat);
    const avg = goals.length ? Math.round(goals.reduce((s,g)=>s+Number(g.progress||0),0)/goals.length) : 0;
    const atRisk = goals.filter(g => g.status === "At Risk").length;
    return { cat, count: goals.length, avg, atRisk };
  });
}
function recentGoals() {
  return [...state.goals].sort((a,b)=>new Date(b.updated_at || b.created_at)-new Date(a.updated_at || a.created_at)).slice(0,5);
}
function updateStatsOnly() {
  const stats = completionStats();
  const ids = {Total:stats.total, Avg:stats.avg+"%", Active:stats.active, Complete:stats.complete};
  Object.keys(ids).forEach(k => { const el = document.getElementById("stat"+k); if (el) el.textContent = ids[k]; });
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
    <div class="recent-item"><strong style="color:${categories[g.category].color}">${escapeHtml(g.title)}</strong><small>${g.category} • ${g.status || "Not Started"} • Progress ${g.progress || 0}%</small></div>`).join("");
}

function coachInsights() {
  const insights = [];
  const cats = categoryStats();
  const lowest = [...cats].sort((a,b)=>a.avg-b.avg)[0];
  const highest = [...cats].sort((a,b)=>b.avg-a.avg)[0];
  const atRisk = state.goals.filter(g => (g.goal_type || "Project") === "Project" && g.status === "At Risk");
  const noNext30 = state.goals.filter(g => !(g.next30||"").trim());
  const noPeople = state.goals.filter(g => !(g.people||"").trim());
  if (lowest) insights.push({title:`Under-invested area: ${lowest.cat}`, text:`This category has the lowest average progress at ${lowest.avg}%. Pick one small next action this week.`});
  if (highest && highest.avg > 0) insights.push({title:`Strongest momentum: ${highest.cat}`, text:`This category is currently leading at ${highest.avg}%. Ask what is working here that could transfer elsewhere.`});
  if (atRisk.length) insights.push({title:`At-risk goals need attention`, text:`You marked ${atRisk.length} goal(s) as At Risk. Review friction and resources before adding new goals.`});
  if (noNext30.length) insights.push({title:`Next 30 Days gap`, text:`${noNext30.length} goal(s) have no next-30-day action. These are likely to stay aspirational unless you define the next move.`});
  if (noPeople.length) insights.push({title:`People strategy gap`, text:`${noPeople.length} goal(s) do not name people yet. Add collaborators, beneficiaries, or supporters.`});
  if (insights.length === 0) insights.push({title:"Solid system health", text:"Your goals have next actions, people, and progress. Use the quarterly review to choose what matters most now."});
  return insights;
}

const bulletFieldKeys = new Set(["key_results", "people", "money", "today_this_week", "next30", "next12", "wins", "lessons"]);

function fieldCard(goal, key, label, className = "") {
  const color = categories[goal.category].color;
  const textareaId = `field-${goal.id}-${key}`;
  const bulletTools = bulletFieldKeys.has(key)
    ? `<button type="button" class="bullet-tool" onclick="insertBullet('${textareaId}')" title="Add bullet point">• Bullet</button>`
    : "";
  return `<div class="field-card ${className}"><div class="field-header field-header-with-tool" style="background:${color}"><span>${label}</span>${bulletTools}</div><textarea id="${textareaId}" class="field-body ${className === "full" ? "large" : ""}" style="color:${color}" onkeydown="handleBulletKeydown(event)" oninput="updateGoalNoRender('${goal.id}', '${key}', this.value)">${escapeHtml(goal[key] || "")}</textarea></div>`;
}

function insertBullet(textareaId) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;

  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || start;
  const value = textarea.value || "";
  const selected = value.slice(start, end);

  let insert;
  if (selected.trim()) {
    insert = selected
      .split("\n")
      .map(line => line.trim() ? (line.match(/^\s*[-•*]\s+/) ? line : `- ${line}`) : line)
      .join("\n");
  } else {
    const needsNewLine = start > 0 && value[start - 1] !== "\n";
    insert = `${needsNewLine ? "\n" : ""}- `;
  }

  textarea.value = value.slice(0, start) + insert + value.slice(end);
  const cursor = start + insert.length;
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = cursor;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function handleBulletKeydown(event) {
  if (event.key !== "Enter") return;
  const textarea = event.target;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const currentLine = value.slice(lineStart, start);
  const bulletMatch = currentLine.match(/^(\s*)([-•*])\s*(.*)$/);
  if (!bulletMatch) return;

  event.preventDefault();

  // If the current bullet is empty, pressing Enter removes the bullet instead of creating another one.
  if (!bulletMatch[3].trim()) {
    textarea.value = value.slice(0, lineStart) + value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = lineStart;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  const prefix = `${bulletMatch[1]}${bulletMatch[2]} `;
  const insert = `\n${prefix}`;
  textarea.value = value.slice(0, start) + insert + value.slice(end);
  textarea.selectionStart = textarea.selectionEnd = start + insert.length;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function goalType(goal) {
  return goal?.goal_type || "Project";
}

function progressLabelFor(goal) {
  return goalType(goal) === "Behavior" ? "Consistency" : "Completion";
}

function keyResultsLabelFor(goal) {
  return "Key Results";
}


function countUsefulLines(text) {
  return (text || "")
    .split(/\n+/)
    .map(line => line.replace(/^\s*[•\-*]\s*/, "").trim())
    .filter(Boolean).length;
}

function autoBehaviorRating(goal) {
  if (goalType(goal) !== "Behavior") return goal.status || "Not Started";
  const wins = countUsefulLines(goal.wins);
  const actions = countUsefulLines(goal.today_this_week);
  const keyResults = countUsefulLines(goal.key_results);
  const next30 = countUsefulLines(goal.next30);

  if (wins >= 2 || (wins >= 1 && actions >= 1 && next30 >= 1)) return "Exceeds";
  if (wins >= 1 || actions >= 1 || keyResults >= 1 || next30 >= 1) return "Meets";
  return "Needs Improvement";
}

function isBehaviorRatingManual(goal) {
  return metaValue(goal, "behavior_rating_manual") === "true";
}

function effectiveBehaviorRating(goal) {
  if (goalType(goal) !== "Behavior") return goal.status || "Not Started";
  if (isBehaviorRatingManual(goal) && goal.behavior_rating) return goal.behavior_rating;
  return autoBehaviorRating(goal);
}

function setBehaviorRating(goalId, value) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  if (value === "__auto__") {
    updateGoalNoRender(goalId, "behavior_rating", autoBehaviorRating(goal));
    updateGoalMeta(goalId, "behavior_rating_manual", "false");
    return;
  }
  updateGoalNoRender(goalId, "behavior_rating", value);
  updateGoalMeta(goalId, "behavior_rating_manual", "true");
}

function behaviorRatingPill(goal) {
  const rating = effectiveBehaviorRating(goal);
  const manual = isBehaviorRatingManual(goal);
  return `<div class="behavior-rating-control">
    <select class="status-select behavior-rating-select" onchange="setBehaviorRating('${goal.id}', this.value)">
      <option value="__auto__" ${manual ? "" : "selected"}>Auto: ${autoBehaviorRating(goal)}</option>
      ${behaviorRatings.map(r=>`<option value="${r}" ${manual && rating===r ? "selected" : ""}>${r}</option>`).join("")}
    </select>
  </div>`;
}


function priorityValue(goal) {
  const value = goal?.priority_rank;
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function priorityLabel(goal) {
  const value = priorityValue(goal);
  if (value === -1) return "Inventory";
  if (value !== null) return `#${value}`;
  return "No Priority";
}

function prioritySortValue(goal) {
  const value = priorityValue(goal);
  if (value === null) return 999;
  if (value === -1) return 500;
  return value;
}

const timeOptions = [
  ["", "Select", 0],
  ["5 min", "5 min", 5],
  ["15 min", "15 min", 15],
  ["30 min", "30 min", 30],
  ["1 hour", "1 hour", 60],
  ["2–4 hours", "2–4 hours", 180],
  ["1 day", "1 day", 480],
  ["Multi-day", "Multi-day", 1440],
  ["Ongoing", "Ongoing", 9999]
];

function optionMinutes(value) {
  const match = timeOptions.find(opt => opt[0] === (value || ""));
  return match ? match[2] : 0;
}

function timeMinutes(goal) {
  return optionMinutes(goal?.resource_time || "");
}

function parseGoalMeta(goal) {
  try {
    const raw = goal?.friction || "";
    if (!raw.trim().startsWith("{")) return {};
    const parsed = JSON.parse(raw);
    return parsed && parsed.__lifeVisionMeta ? parsed : {};
  } catch (e) {
    return {};
  }
}

function metaValue(goal, key) {
  return parseGoalMeta(goal)[key] || "";
}

function metaTimeMinutes(goal, key) {
  return optionMinutes(metaValue(goal, key));
}

function updateGoalMeta(goalId, key, value) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  const meta = parseGoalMeta(goal);
  meta.__lifeVisionMeta = true;
  meta[key] = value;
  const next = JSON.stringify(meta);
  updateGoalNoRender(goalId, "friction", next);
  setTimeout(render, 150);
}

function timeOptionsSelect(value, onChange) {
  return `<select class="status-select time-select" onchange="${onChange}">
    ${timeOptions.map(([v,label]) => `<option value="${v}" ${value===v ? "selected" : ""}>${label}</option>`).join("")}
  </select>`;
}

function resourceTimeOptionsHtml(goal) {
  const current = goal.resource_time || "";
  const options = ["", "Low", "Medium", "High"];
  return `<select class="status-select resource-time-select" onchange="updateGoalNoRender('${goal.id}','resource_time',this.value); setTimeout(render, 150);">
    ${options.map(v => `<option value="${v}" ${current===v ? "selected" : ""}>${v || "Select"}</option>`).join("")}
  </select>`;
}

function actionTimeOptionsHtml(goal, key) {
  const current = metaValue(goal, key);
  return timeOptionsSelect(current, `updateGoalMeta('${goal.id}','${key}',this.value)`);
}

function sortGoalsByCategoryPriority(goals) {
  return [...goals].sort((a, b) => {
    const priorityDiff = prioritySortValue(a) - prioritySortValue(b);
    if (priorityDiff !== 0) return priorityDiff;
    const timeDiff = timeMinutes(a) - timeMinutes(b);
    if (timeDiff !== 0) return timeDiff;
    return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
  });
}

function priorityOptions(goal) {
  const current = priorityValue(goal);
  return `<select class="status-select" onchange="updateGoalNoRender('${goal.id}','priority_rank', this.value ? Number(this.value) : null); setTimeout(render, 150);">
    <option value="" ${current===null ? "selected" : ""}>None</option>
    ${[1,2,3,4,5].map(n => `<option value="${n}" ${current===n ? "selected" : ""}>${n}</option>`).join("")}
    <option value="-1" ${current===-1 ? "selected" : ""}>Inventory</option>
  </select>`;
}

function moneyOptionsHtml(goal) {
  return `<select onchange="updateGoalNoRender('${goal.id}','resource_money',this.value)">
    ${[
      ["", "Select"],
      ["$", "$ — under $500"],
      ["$$", "$$ — $500–$1,000"],
      ["$$$", "$$$ — $1,000–$5,000"],
      ["$$$$", "$$$$ — $5,000–$10,000"],
      ["$$$$$", "$$$$$ — $10,000–$50,000"],
      ["$$$$$$", "$$$$$$ — $50,000+"]
    ].map(([v,label])=>`<option value="${v}" ${(goal.resource_money||"")===v?"selected":""}>${label}</option>`).join("")}
  </select>`;
}

function resourceProfileHtml(goal) {
  return `<div class="resource-profile resource-profile-compact">
    <label><strong>Time Required</strong>
      ${resourceTimeOptionsHtml(goal)}
    </label>
    <label><strong>Money Required</strong>
      ${moneyOptionsHtml(goal)}
    </label>
    <label><strong>Physical Demand</strong>
      <select onchange="updateGoalNoRender('${goal.id}','resource_physical',this.value)">
        ${["","Low","Medium","High"].map(v=>`<option value="${v}" ${(goal.resource_physical||"")===v?"selected":""}>${v || "Select"}</option>`).join("")}
      </select>
    </label>
  </div>`;
}

function formatMinutes(total) {
  if (!total) return "No time set";
  if (total >= 9999) return "Ongoing included";
  if (total < 60) return `${total} min`;
  const hours = Math.round((total / 60) * 10) / 10;
  return `${hours} hr${hours === 1 ? "" : "s"}`;
}

function categoryEffortSummaryHtml(goals) {
  const active = goals.filter(g => priorityValue(g) !== -1);
  const high = active.filter(g => priorityValue(g) === 1);
  const quickWins = active.filter(g => timeMinutes(g) > 0 && timeMinutes(g) <= 30).length;
  const total = active.reduce((sum, g) => {
    const mins = timeMinutes(g);
    return mins >= 9999 ? sum : sum + mins;
  }, 0);
  const ongoing = active.some(g => timeMinutes(g) >= 9999);
  return `<div class="category-effort-summary">
    <span><b>${high.length}</b> high priority</span>
    <span><b>${formatMinutes(total)}</b>${ongoing ? " + ongoing" : ""} resource time</span>
    <span><b>${quickWins}</b> quick wins (&lt;30 min)</span>
    <span>Sorted by priority, then resource time low → high</span>
  </div>`;
}

function actionTimeControlHtml(goal, key, label) {
  return `<div class="section-time-control"><span>${label}</span>${actionTimeOptionsHtml(goal, key)}</div>`;
}


function priorityStackHtml() {
  const priorities = state.goals
    .filter(g => {
      const value = priorityValue(g);
      return value !== null && value > 0;
    })
    .sort((a,b) => prioritySortValue(a)-prioritySortValue(b));

  return `<section class="panel">
    <h3>Priority Stack</h3>
    <p>The 3–5 goals that matter most right now.</p>
    <div class="recent-list">
      ${priorities.length ? priorities.map(g => `<div class="recent-item clickable-card" onclick="openGoal('${g.id}')"><strong style="color:${categories[g.category].color}">${priorityLabel(g)} — ${escapeHtml(g.title)}</strong><small>${g.category} • ${goalType(g)} • ${goalStatusLabel(g)}</small></div>`).join("") : `<div class="recent-item"><strong>No priorities selected yet.</strong><small>Set Priority 1–5 on any goal card.</small></div>`}
    </div>
  </section>`;
}

function lifeSeasonsHtml() {
  return `<section class="panel">
    <h3>Life Seasons</h3>
    <p>See which goals belong to each stage of life. This uses your existing Life Season selections.</p>
    ${ageBands.map(age => {
      const goals = state.goals.filter(g => (g.ages || []).includes(age));
      return `<div class="season-block">
        <h4>${age}</h4>
        ${goals.length ? goals.map(g => `<div class="recent-item"><strong style="color:${categories[g.category].color}">${escapeHtml(g.title)}</strong><small>${g.category} • ${goalType(g)}</small></div>`).join("") : `<div class="recent-item"><small>No goals assigned to this season yet.</small></div>`}
      </div>`;
    }).join("")}
  </section>`;
}







function openGoal(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  activeView = "Workbook";
  activeCategory = goal.category;
  showAdd = false;
  render();
  setTimeout(() => {
    const el = document.getElementById(`goal-${goalId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("goal-highlight");
      setTimeout(() => el.classList.remove("goal-highlight"), 1800);
    }
  }, 100);
}


function reflectionHtml(goal) {
  const color = categories[goal.category].color;
  const hasReflection = (goal.wins || "").trim() || (goal.lessons || "").trim();

  return `<details class="reflection-drawer" ${hasReflection ? "open" : ""}>
    <summary style="color:${color}">Wins & Lessons ${hasReflection ? "•" : ""}</summary>
    <div class="grid-two reflection-grid">
      ${fieldCard(goal, "wins", "Wins")}
      ${fieldCard(goal, "lessons", "Lessons")}
    </div>
  </details>`;
}

function weeklyGoalReflectionsHtml() {
  const withReflections = state.goals.filter(g => (g.wins || "").trim() || (g.lessons || "").trim());

  if (!withReflections.length) {
    return `<div class="recent-item"><strong>No goal-level wins or lessons yet.</strong><small>Add Wins or Lessons inside any goal card.</small></div>`;
  }

  return withReflections.map(g => `
    <div class="reflection-summary">
      <strong style="color:${categories[g.category].color}">${escapeHtml(g.title)}</strong>
      ${(g.wins || "").trim() ? `<div><b>Wins:</b><br>${escapeHtml(g.wins).replaceAll("\\n","<br>")}</div>` : ""}
      ${(g.lessons || "").trim() ? `<div><b>Lessons:</b><br>${escapeHtml(g.lessons).replaceAll("\\n","<br>")}</div>` : ""}
    </div>
  `).join("");
}


function parseWeeklyArchive() {
  try {
    const raw = state.reviews.weekly_archive || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function weekOfMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

async function startNewWeek() {
  const items = state.goals
    .filter(g => (g.wins || "").trim() || (g.lessons || "").trim())
    .map(g => ({
      goal_id: g.id,
      category: g.category,
      title: g.title,
      wins: g.wins || "",
      lessons: g.lessons || ""
    }));

  if (!items.length) {
    alert("There are no Wins or Lessons to archive yet.");
    return;
  }

  if (!confirm("Archive this week's Wins & Lessons and clear the current Wins/Lessons fields for a fresh week?")) return;

  const archive = parseWeeklyArchive();
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    week_of: weekOfMonday(),
    archived_at: new Date().toISOString(),
    items
  };

  const nextArchive = [entry, ...archive];
  const archiveText = JSON.stringify(nextArchive);

  const { error: archiveError } = await supabaseClient.from("life_reviews").upsert({
    user_id: state.user.id,
    review_type: "weekly_archive",
    content: archiveText,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,review_type" });

  if (archiveError) {
    alert("Could not archive weekly review: " + archiveError.message);
    return;
  }

  const results = await Promise.all(items.map(item =>
    supabaseClient.from("goals").update({ wins: "", lessons: "", updated_at: new Date().toISOString() }).eq("id", item.goal_id)
  ));
  const failed = results.find(r => r.error);
  if (failed) {
    alert("Archive was saved, but Wins/Lessons could not be cleared: " + failed.error.message);
    return;
  }

  state.reviews.weekly_archive = archiveText;
  state.goals = state.goals.map(g => items.some(item => item.goal_id === g.id) ? { ...g, wins: "", lessons: "" } : g);
  showSaved("Week archived");
  render();
}

function weeklyArchiveHtml() {
  const archive = parseWeeklyArchive();
  if (!archive.length) {
    return `<div class="recent-item"><strong>No archived weekly reviews yet.</strong><small>Use Start New Week after you finish your review to save this week's Wins & Lessons.</small></div>`;
  }

  return archive.map(entry => `
    <details class="weekly-archive-entry">
      <summary>Week of ${escapeHtml(entry.week_of || "Archived Week")}</summary>
      <div class="weekly-archive-body">
        ${(entry.items || []).map(item => `
          <div class="reflection-summary">
            <strong style="color:${categories[item.category]?.color || '#111827'}">${escapeHtml(item.title || "Untitled Goal")}</strong>
            <small>${escapeHtml(item.category || "")}</small>
            ${(item.wins || "").trim() ? `<div><b>Wins:</b><br>${escapeHtml(item.wins).replaceAll("\n","<br>")}</div>` : ""}
            ${(item.lessons || "").trim() ? `<div><b>Lessons:</b><br>${escapeHtml(item.lessons).replaceAll("\n","<br>")}</div>` : ""}
          </div>
        `).join("")}
      </div>
    </details>
  `).join("");
}

function goalStatusLabel(goal) {
  return goalType(goal) === "Behavior" ? effectiveBehaviorRating(goal) : (goal.status || "Not Started");
}

function goalCard(goal) {
  const color = categories[goal.category].color;
  const type = goalType(goal);
  const isInventory = priorityValue(goal) === -1;

  if (isInventory) {
    return `<article class="goal-card inventory-card" id="goal-${goal.id}">
      <div class="inventory-row">
        <textarea class="goal-title inventory-title" style="color:${color}" oninput="updateGoalNoRender('${goal.id}', 'title', this.value)">${escapeHtml(goal.title)}</textarea>
        <label>Type<br>
          <select class="status-select" onchange="updateGoalNoRender('${goal.id}','goal_type',this.value); setTimeout(render, 300);">
            <option ${type==="Project"?"selected":""}>Project</option>
            <option ${type==="Behavior"?"selected":""}>Behavior</option>
          </select>
        </label>
        ${type === "Behavior" ? `
          <label>Behavior Rating<br>
            ${behaviorRatingPill(goal)}
          </label>
        ` : `
          <label>Status<br>
            <select class="status-select" onchange="updateGoalNoRender('${goal.id}','status',this.value)">
              ${statuses.map(s=>`<option ${(goal.status||"Not Started")===s?"selected":""}>${s}</option>`).join("")}
            </select>
          </label>
        `}
        <label>Priority<br>${priorityOptions(goal)}</label>
      </div>
    </article>`;
  }

  return `<article class="goal-card" id="goal-${goal.id}">
    <div class="goal-top">
      <span class="category-pill" style="background:${color}">${goal.category}</span>
      <textarea class="goal-title" style="color:${color}" oninput="updateGoalNoRender('${goal.id}', 'title', this.value)">${escapeHtml(goal.title)}</textarea>
    </div>

    <div class="grid-three goal-controls-grid">
      <label>Type<br>
        <select class="status-select" onchange="updateGoalNoRender('${goal.id}','goal_type',this.value); setTimeout(render, 300);">
          <option ${type==="Project"?"selected":""}>Project</option>
          <option ${type==="Behavior"?"selected":""}>Behavior</option>
        </select>
      </label>
      ${type === "Behavior" ? `
        <label>Behavior Rating<br>
          ${behaviorRatingPill(goal)}
        </label>
      ` : `
        <label>Status<br>
          <select class="status-select" onchange="updateGoalNoRender('${goal.id}','status',this.value)">
            ${statuses.map(s=>`<option ${(goal.status||"Not Started")===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </label>
      `}
      <label>Priority<br>${priorityOptions(goal)}</label>
    </div>

    ${fieldCard(goal, "key_results", "Key Results", "full")}

    ${fieldCard(goal, "why", "Why This Matters", "full")}

    <div class="timeline-label">Life Season</div>
    <div class="timeline">${ageBands.map(age => `<label class="age-chip"><input type="checkbox" ${goal.ages?.includes(age) ? "checked" : ""} onchange="toggleAge('${goal.id}', '${age}')" />${age}</label>`).join("")}</div>

    <div class="grid-two">
      ${fieldCard(goal, "people", "People")}
      <div>
        ${fieldCard(goal, "money", "Resources")}
        ${resourceProfileHtml(goal)}
      </div>
    </div>

    <div class="grid-two">
      <div>
        ${fieldCard(goal, "today_this_week", "Today / This Week")}
        ${actionMetadataEditorHtml(goal, "today_this_week", "Today / This Week")}
      </div>
      <div>
        ${fieldCard(goal, "next30", "Next 30 Days")}
        ${actionMetadataEditorHtml(goal, "next30", "Next 30 Days")}
      </div>
    </div>

    ${fieldCard(goal, "next12", "Next 12 Months", "full")}

    ${reflectionHtml(goal)}

    <div class="card-actions">
      <div class="progress-wrap">
        ${type === "Behavior" ? `
          <div class="progress-help">Behavior goals are rated above as Needs Improvement, Meets, or Exceeds instead of tracked by project completion.</div>
        ` : `
          <div class="progress-label" data-progress-label="${goal.id}">Completion: ${goal.progress || 0}%</div>
          <input class="progress-slider" type="range" min="0" max="100" value="${goal.progress || 0}" oninput="updateProgress('${goal.id}', this.value)" />
          <div class="progress-bar"><div class="progress-fill" data-progress-fill="${goal.id}" style="width:${goal.progress || 0}%;background:${color}"></div></div>
          <div class="progress-help">Use this as project completion.</div>
        `}
      </div>
      <button class="delete" onclick="deleteGoal('${goal.id}')">Delete</button>
    </div>
  </article>`;
}

function addForm() {
  return `<form class="add-form" onsubmit="addGoal(event)"><strong>Add a New Goal</strong><textarea id="newGoalTitle" rows="3" placeholder="Write your goal..."></textarea><select id="newGoalCategory">${Object.keys(categories).map(c => `<option value="${c}">${c}</option>`).join("")}</select><button type="submit">Add Goal</button></form>`;
}
function metricsHtml() {
  return `<section class="panel"><h3>Life Dashboard</h3><p>Track the numbers or signals that matter most.</p><div class="metric-grid">${metricKeys.map(k=>`<div class="metric-card"><label>${k}</label><input value="${escapeHtml(state.metrics[k]||"")}" oninput="updateMetric('${k}', this.value)" placeholder="Enter value..." /></div>`).join("")}</div></section>`;
}
function reviewsHtml() {
  const reviews = [
    ["quarterly","Quarterly Review","Objective, key results, next 30 days, friction, resources."],
    ["annual","Annual Review","What mattered most this year? What do I want next year?"],
    ["stop_doing","Stop Doing","What should I stop doing to make room for what matters?"],
    ["year_success","This Year Success","What would make this year a success?"]
  ];
  return `<section class="panel"><h3>Planning Reviews</h3><div class="review-grid">${reviews.map(r=>`<div class="review-card"><div class="field-header" style="background:#111827">${r[1]}</div><textarea placeholder="${r[2]}" oninput="updateReview('${r[0]}', this.value)">${escapeHtml(state.reviews[r[0]] || "")}</textarea></div>`).join("")}</div></section>`;
}
function coachHtml() {
  return `<section class="panel"><h3>Built-in Coach</h3><p>Rules-based coaching based on your goals, progress, statuses, people fields, and next actions.</p><div class="coach-list">${coachInsights().map(i=>`<div class="coach-item"><strong>${escapeHtml(i.title)}</strong><p>${escapeHtml(i.text)}</p></div>`).join("")}</div></section>`;
}
function visionHtml() {
  return `<section class="panel"><h3>Vision Board</h3><p>Add image URLs for Italy, music, family, adventure, leadership, or anything that pulls you forward.</p><button class="primary" onclick="showAddVision=!showAddVision;render()">${showAddVision?"Close":"Add Vision Item"}</button>${showAddVision?`<form class="add-form" onsubmit="addVisionItem(event)"><select id="visionCategory">${Object.keys(categories).map(c=>`<option>${c}</option>`).join("")}</select><input id="visionTitle" placeholder="Title" /><input id="visionImage" placeholder="Image URL" /><textarea id="visionNote" placeholder="Note"></textarea><button>Add</button></form>`:""}<div class="vision-grid">${state.vision.map(v=>`<div class="vision-item"><div class="vision-img" style="background-image:url('${escapeHtml(v.image_url)}')"></div><div class="vision-body"><select onchange="updateVision('${v.id}','category',this.value)">${Object.keys(categories).map(c=>`<option ${v.category===c?"selected":""}>${c}</option>`).join("")}</select><input value="${escapeHtml(v.title)}" oninput="updateVision('${v.id}','title',this.value)" placeholder="Title" /><input value="${escapeHtml(v.image_url)}" oninput="updateVision('${v.id}','image_url',this.value)" placeholder="Image URL" /><textarea oninput="updateVision('${v.id}','note',this.value)" placeholder="Note">${escapeHtml(v.note||"")}</textarea><button class="delete" onclick="deleteVision('${v.id}')">Delete</button></div></div>`).join("")}</div></section>`;
}

function getOpenAIKey() {
  return localStorage.getItem("lifeVisionOpenAIKey") || "";
}

function saveOpenAIKey() {
  const key = document.getElementById("openaiKey")?.value.trim();
  if (!key) return alert("Paste your OpenAI API key first.");
  localStorage.setItem("lifeVisionOpenAIKey", key);
  showSaved("AI key saved locally");
  render();
}

function clearOpenAIKey() {
  localStorage.removeItem("lifeVisionOpenAIKey");
  showSaved("AI key removed");
  render();
}

function buildAIPrompt() {
  const payload = {
    goals: state.goals.map(g => ({
      category: g.category,
      title: g.title,
      status: g.status,
      progress: g.progress,
      behavior_rating: autoBehaviorRating(g),
      why: g.why,
      people: g.people,
      resources: g.money,
      resource_time: g.resource_time,
      resource_money: g.resource_money,
      resource_physical: g.resource_physical,
      priority_rank: g.priority_rank,
      wins: g.wins,
      lessons: g.lessons,
      next30: g.next30,
      next12: g.next12,
      
      key_results: g.key_results,
      today_this_week: g.today_this_week,
      
      ages: g.ages
    })),
    reviews: state.reviews,
    metrics: state.metrics,
    vision: state.vision
  };

  return `You are a direct, thoughtful personal strategy coach. Analyze this Life Vision operating system for Todd.

Return a concise but substantive review with these sections:
1. Biggest pattern you see
2. What is over-invested
3. What is under-invested
4. Top 3 priorities for the next 30 days
5. Top 3 questions Todd should answer
6. One bold recommendation
7. One thing to stop doing
8. One relationship/resource move to make

Use the user's own categories: Relationships, Health, Adventure, Creativity, Impact.
Be candid, practical, and not generic.

Here is the data:
${JSON.stringify(payload, null, 2)}`;
}

async function runAICoach() {
  const key = getOpenAIKey();
  if (!key) return alert("Add your OpenAI API key first.");
  const out = document.getElementById("aiOutput");
  if (out) out.textContent = "Reviewing your Life Vision data...";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        input: buildAIPrompt()
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI request failed.");
    }

    const text = data.output_text || (data.output || []).map(item => {
      return (item.content || []).map(c => c.text || "").join("");
    }).join("\n");

    if (out) out.textContent = text || "No response text returned.";
  } catch (error) {
    if (out) out.textContent = "AI Coach error: " + error.message + "\n\nIf this happens in Safari, the next version should move the OpenAI call into a Supabase Edge Function so the browser never calls OpenAI directly.";
  }
}

function aiCoachHtml() {
  const hasKey = !!getOpenAIKey();
  return `<section class="panel">
    <h3>AI Coach</h3>
    <p>This uses OpenAI to review your goals, progress, reviews, metrics, vision board, friction, people, and resources. Your OpenAI key is stored only in this browser's local storage.</p>
    <div class="ai-warning">For a stronger production version, the OpenAI key should eventually be moved to a secure Supabase Edge Function. This version is designed for your personal use.</div>
    <div class="ai-setup">
      <input id="openaiKey" type="password" placeholder="${hasKey ? "OpenAI API key saved locally" : "Paste OpenAI API key"}" />
      <div class="ai-actions">
        <button class="primary" onclick="saveOpenAIKey()">Save API Key</button>
        <button class="secondary" onclick="clearOpenAIKey()">Clear Key</button>
        <button class="primary" onclick="runAICoach()">Review My Life</button>
      </div>
      <div id="aiOutput" class="ai-output">Click “Review My Life” to generate a personalized strategic review.</div>
    </div>
  </section>`;
}


function weeklyReviewHtml() {
  return `<section class="panel weekly-review-box">
    <h3>Weekly Review</h3>
    <p>Current week Wins and Lessons are pulled from individual goals. When your review is complete, use Start New Week to archive them and clear the working fields.</p>

    <div class="weekly-review-actions">
      <button type="button" class="primary" onclick="startNewWeek()">Start New Week</button>
      <span>Archives current Wins & Lessons, then clears them for the new week.</span>
    </div>

    <section class="panel compact-panel">
      <h3>Current Goal Wins & Lessons</h3>
      ${weeklyGoalReflectionsHtml()}
    </section>

    <section class="panel compact-panel">
      <h3>Previous Weekly Reviews</h3>
      ${weeklyArchiveHtml()}
    </section>
  </section>`;
}

function strategicBriefText() {
  const stats = completionStats();
  const cats = categoryStats();
  const lowest = [...cats].sort((a,b)=>a.avg-b.avg)[0];
  const highest = [...cats].sort((a,b)=>b.avg-a.avg)[0];
  const atRisk = state.goals.filter(g => (g.goal_type || "Project") === "Project" && g.status === "At Risk");
  const onTrack = state.goals.filter(g => (g.goal_type || "Project") === "Project" && g.status === "On Track");
  const completed = state.goals.filter(g => (g.goal_type || "Project") === "Project" && (g.status === "Completed" || Number(g.progress||0) >= 100));
  const notStarted = state.goals.filter(g => (g.status || "Not Started") === "Not Started" && Number(g.progress||0) === 0);
  const needsImprovement = state.goals.filter(g => g.goal_type === "Behavior" && autoBehaviorRating(g) === "Needs Improvement");
  const noNext30 = state.goals.filter(g => !(g.next30||"").trim());
  const noResources = state.goals.filter(g => !(g.money||"").trim());
  const noPeople = state.goals.filter(g => !(g.people||"").trim());
  const recent = recentGoals().slice(0,3);

  const highestLeverage = state.goals
    .filter(g => (g.next30||"").trim() || (g.friction||"").trim() || g.status === "At Risk")
    .sort((a,b) => (b.status === "At Risk") - (a.status === "At Risk") || Number(b.progress||0)-Number(a.progress||0))[0];

  return `TODD'S STRATEGIC BRIEF

What changed:
- You currently have ${stats.total} goals with ${stats.avg}% average progress.
- ${onTrack.length} goals are On Track, ${atRisk.length} are At Risk, ${completed.length} are Completed, and ${notStarted.length} are Not Started.
- Most recent updates: ${recent.map(g => g.title).join("; ") || "No recent updates yet."}

Biggest opportunity:
- ${highest ? highest.cat + " has the strongest current momentum at " + highest.avg + "%." : "Add progress data to see momentum."}
- The opportunity is to transfer what is working there into a weaker category.

Biggest risk:
- ${lowest ? lowest.cat + " is the most neglected category at " + lowest.avg + "%." : "No category risk detected yet."}
- ${atRisk.length ? atRisk.length + " project/goal(s) are marked At Risk." : "No project goals are currently marked At Risk."}\n- ${needsImprovement.length ? needsImprovement.length + " behavior goal(s) are rated Needs Improvement." : "No behavior goals are currently rated Needs Improvement."}

Most neglected category:
- ${lowest ? lowest.cat + " needs the most attention right now." : "Not enough data yet."}

Highest leverage action:
- ${highestLeverage ? "Focus on: " + highestLeverage.title : "Pick one goal and define a concrete next 30-day action."}

Top 3 actions this week:
1. Add or update Next 30 Days for ${noNext30.length ? "one of the " + noNext30.length + " goals missing it" : "your highest-priority goal"}.
2. Add People or Resources to ${Math.max(noPeople.length, noResources.length)} goal(s) missing execution support.
3. Move one Not Started goal either into action or consciously defer it.

One thing to stop doing:
- Stop letting goals remain only aspirational. Every active goal should have a next 30-day move, people/resources attached, or a conscious decision to defer it.`;
}

function strategicBriefHtml() {
  return `<section class="panel">
    <h3>Todd's Strategic Brief</h3>
    <p>A concise operating brief based on your current goals, progress, statuses, and next actions.</p>
    <div class="brief-actions">
      <button class="primary" onclick="document.getElementById('briefOutput').textContent = strategicBriefText()">Generate Strategic Brief</button>
    </div>
    <div id="briefOutput" class="brief-output">Click “Generate Strategic Brief.”</div>
  </section>`;
}



function actionHash(text) {
  let h = 0;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return "a" + Math.abs(h).toString(36);
}

function cleanActionLine(line) {
  return String(line || "")
    .replace(/^\s*[•\-*]\s*/, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .trim();
}

function actionLines(goal, field = "today_this_week") {
  return String(goal?.[field] || "")
    .split(/\n+/)
    .map((line, index) => ({ raw: line, text: cleanActionLine(line), index }))
    .filter(item => item.text);
}

function actionMetaKey(goalId, field, lineText, suffix) {
  return `action_${field}_${actionHash(goalId + "|" + field + "|" + lineText)}_${suffix}`;
}

function actionTimeValue(goal, field, lineText) {
  return metaValue(goal, actionMetaKey(goal.id, field, lineText, "time"));
}

function actionOwnerValue(goal, field, lineText) {
  return metaValue(goal, actionMetaKey(goal.id, field, lineText, "owner")) || "Me";
}

function actionMinutes(goal, field, lineText) {
  return optionMinutes(actionTimeValue(goal, field, lineText));
}

function actionTimeSelect(goal, field, lineText) {
  const key = actionMetaKey(goal.id, field, lineText, "time");
  const current = metaValue(goal, key);
  return `<select class="status-select action-mini-select" onclick="event.stopPropagation()" onchange="updateGoalMeta('${goal.id}','${key}',this.value)">
    ${timeOptions.map(([v,label]) => `<option value="${v}" ${current===v ? "selected" : ""}>${label}</option>`).join("")}
  </select>`;
}

function actionOwnerSelect(goal, field, lineText) {
  const key = actionMetaKey(goal.id, field, lineText, "owner");
  const current = actionOwnerValue(goal, field, lineText);
  const owners = ["Me", "Waiting", "Delegated", "Scheduled"];
  return `<select class="status-select action-mini-select" onclick="event.stopPropagation()" onchange="updateGoalMeta('${goal.id}','${key}',this.value)">
    ${owners.map(v => `<option value="${v}" ${current===v ? "selected" : ""}>${v}</option>`).join("")}
  </select>`;
}

function actionMetadataEditorHtml(goal, field, label) {
  const items = actionLines(goal, field);
  if (!items.length) {
    return `<div class="action-meta-panel empty"><span>Add bullets above to set time and owner for each action.</span></div>`;
  }
  return `<div class="action-meta-panel">
    <div class="action-meta-title">${label} action details</div>
    ${items.map(item => {
      const actionKey = actionHash(goal.id + "|" + field + "|" + item.text);
      return `<div class="action-meta-row">
        <label class="action-meta-check-wrap" title="Complete and move to Wins">
          <input type="checkbox" class="action-meta-check" onchange="completeWorkplanAction('${goal.id}','${field}','${actionKey}')" />
        </label>
        <div class="action-meta-text">${escapeHtml(item.text)}</div>
        <div class="action-meta-controls">
          ${actionTimeSelect(goal, field, item.text)}
          ${actionOwnerSelect(goal, field, item.text)}
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

function workplanActionItems() {
  const fields = ["today_this_week", "next30"];
  return state.goals
    .flatMap(goal => fields.flatMap(field => actionLines(goal, field).map(item => {
      const timeValue = actionTimeValue(goal, field, item.text) || "";
      const minutes = optionMinutes(timeValue);
      const owner = actionOwnerValue(goal, field, item.text);
      return {
        goal,
        goalId: goal.id,
        actionKey: actionHash(goal.id + "|" + field + "|" + item.text),
        field,
        fieldLabel: field === "today_this_week" ? "Today / This Week" : "Next 30 Days",
        lineIndex: item.index,
        title: goal.title || "Untitled Goal",
        action: item.text,
        category: goal.category || "",
        priority: prioritySortValue(goal),
        priorityRaw: priorityValue(goal),
        priorityLabel: priorityLabel(goal),
        minutes,
        timeLabel: timeValue || "No time set",
        owner,
        type: goalType(goal),
        rating: goalType(goal) === "Behavior" ? effectiveBehaviorRating(goal) : (goal.status || "Not Started")
      };
    })))
    .sort((a,b) => {
      const ownerRank = ownerSortValue(a.owner) - ownerSortValue(b.owner);
      if (ownerRank) return ownerRank;
      const fieldRank = fieldSortValue(a.field) - fieldSortValue(b.field);
      if (fieldRank) return fieldRank;
      if (a.priority !== b.priority) return a.priority - b.priority;
      const at = a.minutes || 9998;
      const bt = b.minutes || 9998;
      if (at !== bt) return at - bt;
      return a.action.localeCompare(b.action);
    });
}

function ownerSortValue(owner) {
  const order = {"Me": 1, "Scheduled": 2, "Delegated": 3, "Waiting": 4};
  return order[owner] || 9;
}

function fieldSortValue(field) {
  return field === "today_this_week" ? 1 : 2;
}

function workplanTotals(items) {
  const active = items.filter(i => !["Waiting", "Delegated"].includes(i.owner));
  const timed = active.filter(i => i.minutes && i.minutes < 9999);
  const total = timed.reduce((sum, i) => sum + i.minutes, 0);
  return {
    total,
    actions: items.length,
    activeActions: active.length,
    noTime: active.filter(i => !i.minutes).length,
    waiting: items.filter(i => i.owner === "Waiting").length,
    delegated: items.filter(i => i.owner === "Delegated").length,
    scheduled: items.filter(i => i.owner === "Scheduled").length
  };
}

function recommendedFirstAction(items) {
  return items.find(i => i.owner === "Me" && i.field === "today_this_week" && i.minutes && i.minutes < 9999) ||
    items.find(i => i.owner === "Me" && i.minutes && i.minutes < 9999) ||
    items.find(i => !["Waiting", "Delegated"].includes(i.owner) && i.minutes && i.minutes < 9999) ||
    items.find(i => !["Waiting", "Delegated"].includes(i.owner)) ||
    items[0] || null;
}

function workplanFocusText(items, totals) {
  if (!items.length) return "Add actions inside Today / This Week or Next 30 Days. Workplan will organize them automatically.";
  const highGoals = state.goals.filter(g => priorityValue(g) === 1);
  const actionGoalIds = new Set(items.map(i => i.goalId));
  const highWithoutActions = highGoals.filter(g => !actionGoalIds.has(g.id)).length;
  const timePart = totals.total ? `${formatMinutes(totals.total)} active work` : `${totals.noTime} active action${totals.noTime===1?"":"s"} need time`;
  const waitPart = totals.waiting ? ` ${totals.waiting} waiting.` : "";
  const delegatedPart = totals.delegated ? ` ${totals.delegated} delegated.` : "";
  const priorityPart = highWithoutActions ? ` ${highWithoutActions} top-priority goal${highWithoutActions===1?"":"s"} have no action.` : "";
  return `${items.length} action${items.length===1?"":"s"} found. ${timePart}.${waitPart}${delegatedPart}${priorityPart}`;
}

function actionRecommendationReason(item) {
  if (!item) return "Add one action to a high-priority goal.";
  if (item.owner === "Waiting") return "This is waiting on someone else. Follow up if needed.";
  if (item.owner === "Delegated") return "This is delegated. Check whether the next move is yours.";
  if (!item.minutes) return "This needs a time estimate before the Workplan can fully prioritize it.";
  if (item.priorityRaw === 1 && item.minutes <= 15) return "Highest-priority goal + shortest completion.";
  if (item.priorityRaw === 1) return "Highest-priority goal with a clear next action.";
  if (item.minutes <= 15) return "Quick win that creates momentum.";
  return "Best next action based on priority, timing, and ownership.";
}

function workplanRecommendation(items, totals) {
  if (!items.length) return "Add one action to the highest-priority goal that matters most this week.";
  if (totals.noTime) return "Set time estimates for active actions so the Workplan can guide the right order.";
  const first = recommendedFirstAction(items);
  return first ? actionRecommendationReason(first) : "Choose one action and start small.";
}

function todayString() {
  return new Date().toLocaleDateString();
}

function completeWorkplanAction(goalId, field, actionKey) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  const lines = String(goal[field] || "").split(/\n+/);
  const matchIndex = lines.findIndex(line => actionHash(goalId + "|" + field + "|" + cleanActionLine(line)) === actionKey);
  if (matchIndex < 0) return;
  const actionText = cleanActionLine(lines[matchIndex]);
  const remaining = lines.filter((_, idx) => idx !== matchIndex).join("\n").trim();
  const winLine = `• ${actionText} (${todayString()})`;
  const wins = String(goal.wins || "").trim();
  goal[field] = remaining;
  goal.wins = wins ? `${wins}\n${winLine}` : winLine;
  supabaseClient.from("goals").update({ [field]: remaining, wins: goal.wins, updated_at: new Date().toISOString() }).eq("id", goalId).then(({ error }) => {
    if (error) showSaved("Save error"); else showSaved("Completed + moved to Wins");
    render();
  });
}

function actionBadgesHtml(item) {
  const ownerClass = `owner-${String(item.owner || "Me").toLowerCase().replace(/\s+/g,"-")}`;
  const timeClass = item.minutes && item.minutes <= 15 ? "tag-quick" : item.minutes >= 60 && item.minutes < 9999 ? "tag-deep" : "tag-time";
  const tag = item.minutes && item.minutes <= 15 ? "Quick Win" : item.minutes >= 60 && item.minutes < 9999 ? "Deep Work" : item.fieldLabel;
  return `<div class="action-meta-pills">
    <span class="${timeClass}">${escapeHtml(item.timeLabel)}</span>
    <span class="${ownerClass}">${escapeHtml(item.owner)}</span>
    <span>${escapeHtml(tag)}</span>
  </div>`;
}

function actionQueueRow(item, opts = {}) {
  const compact = opts.compact ? " compact" : "";
  return `<div class="action-queue-row${compact} clickable-card" onclick="openGoal('${item.goalId}')">
    <input type="checkbox" class="action-check" onclick="event.stopPropagation()" onchange="completeWorkplanAction('${item.goalId}','${item.field}','${item.actionKey}')" title="Complete and move to Wins" />
    <div class="action-main">
      <strong>${escapeHtml(item.action)}</strong>
      <small>${escapeHtml(item.title)} • ${escapeHtml(item.priorityLabel)}${item.category ? " • " + escapeHtml(item.category) : ""}</small>
    </div>
    ${actionBadgesHtml(item)}
  </div>`;
}

function actionQueueHtml(items) {
  if (!items.length) return `<div class="recent-item"><strong>No actions yet.</strong><small>Add bullets inside Today / This Week or Next 30 Days.</small></div>`;
  return items.map(i => actionQueueRow(i, { compact: true })).join("");
}

function waitingListHtml(items) {
  const waiting = items.filter(i => i.owner === "Waiting" || i.owner === "Delegated");
  if (!waiting.length) return `<div class="recent-item"><strong>Nothing waiting.</strong><small>No blocked or delegated actions are marked.</small></div>`;
  return waiting.map(i => `<div class="mini-action-row clickable-card" onclick="openGoal('${i.goalId}')">
    <span>${escapeHtml(i.action)}<small>${escapeHtml(i.owner)} • ${escapeHtml(i.title)}</small></span><b>${escapeHtml(i.timeLabel)}</b>
  </div>`).join("");
}

function completedTodayItems() {
  const today = todayString();
  return state.goals.flatMap(goal => String(goal.wins || "").split(/\n+/).map(line => cleanActionLine(line)).filter(line => line && line.includes(`(${today})`)).map(line => ({
    goalId: goal.id,
    title: goal.title || "Untitled Goal",
    action: line.replace(`(${today})`, "").trim(),
    category: goal.category || ""
  })));
}

function completedTodayHtml(items) {
  if (!items.length) return `<div class="recent-item"><strong>Nothing completed yet today.</strong><small>Completed actions will collect here.</small></div>`;
  return items.map(i => `<div class="completed-action-row clickable-card" onclick="openGoal('${i.goalId}')">
    <span>✓</span><strong>${escapeHtml(i.action)}</strong><small>${escapeHtml(i.title)}${i.category ? " • " + escapeHtml(i.category) : ""}</small>
  </div>`).join("");
}

function workplanHtml() {
  const items = workplanActionItems();
  const totals = workplanTotals(items);
  const first = recommendedFirstAction(items);
  const activeItems = items.filter(i => i !== first && !["Waiting", "Delegated"].includes(i.owner));
  const todayItems = activeItems.filter(i => i.field === "today_this_week");
  const next30Items = activeItems.filter(i => i.field === "next30");
  const waitingItems = items.filter(i => i.owner === "Waiting" || i.owner === "Delegated");
  const completed = completedTodayItems();

  return `<section class="workplan-page action-plan-page single-source-workplan">
    <div class="workplan-focus-card">
      <span class="workplan-eyebrow">Today's Focus</span>
      <p>${escapeHtml(workplanFocusText(items, totals))}</p>
    </div>

    <div class="workplan-main-grid action-plan-grid single-source-grid">
      <div class="workplan-card start-here-card">
        <span class="workplan-eyebrow">Start Here</span>
        ${first ? actionQueueRow(first) + `<p class="start-reason">${escapeHtml(actionRecommendationReason(first))}</p>` : `<div class="recent-item"><strong>Add one action.</strong><small>Use Today / This Week or Next 30 Days inside a goal.</small></div>`}
      </div>

      <div class="workplan-card action-queue-card">
        <span class="workplan-eyebrow">Today / This Week</span>
        ${actionQueueHtml(todayItems)}
      </div>

      <div class="workplan-card action-queue-card">
        <span class="workplan-eyebrow">Next 30 Days</span>
        ${actionQueueHtml(next30Items)}
      </div>

      <div class="workplan-card waiting-card">
        <span class="workplan-eyebrow">Waiting / Delegated</span>
        ${waitingListHtml(waitingItems)}
      </div>

      <div class="workplan-card completed-card">
        <span class="workplan-eyebrow">Completed Today</span>
        ${completedTodayHtml(completed)}
      </div>
    </div>
  </section>`;
}

function todayThisWeekHtml() {
  return workplanHtml();
}





function statusCardHtml(stats) {
  return statusRibbonHtml(stats);
}

function mainNavCardHtml() {
  const views = [
    ["Dashboard", "Overview"],
    ["Workplan", "Workplan"],
    ["Priority Stack", "Priority Stack"],
    ["Resources", "Resources"],
    ["Life Seasons", "Life Seasons"],
    ["Weekly Review", "Weekly Review"],
    ["Strategic Brief", "Strategic Brief"],
    ["Coach", "Coach"]
  ];
  return `<aside class="nav-box dashboard-box">
    <div class="box-title">Dashboard</div>
    <div class="button-wrap">
      ${views.map(([v,label]) => `<button onclick="setMainView('${v}')" class="${activeView===v ? "active" : ""}">${label}</button>`).join("")}
    </div>
  </aside>`;
}

function workbookCardHtml() {
  return `<aside class="nav-box workbook-box">
    <div class="box-title">Workbook</div>
    <div class="button-wrap">
      <button onclick="setWorkbookView('All')" class="${activeView==='Workbook' && activeCategory==='All' ? 'active' : ''}">All</button>
      ${Object.keys(categories).map(cat => `<button onclick="setWorkbookView('${cat}')" class="${activeView==='Workbook' && activeCategory===cat ? 'active' : ''}" style="${activeView==='Workbook' && activeCategory===cat ? `background:${categories[cat].color};color:#fff;border-color:${categories[cat].color}` : `color:${categories[cat].color}`}">${cat}</button>`).join("")}
    </div>
  </aside>`;
}

function viewTitleHtml() {
  if (activeView === "Workbook") return "";

  const titles = {
    "Dashboard": "Overview",
    "Workplan": "Your Action Plan",
    "Priority Stack": "Priority Stack",
    "Resources": "Resources",
    "Life Seasons": "Life Seasons",
    "Weekly Review": "Weekly Review",
    "Strategic Brief": "Strategic Brief",
    "Coach": "Coach"
  };

  return `<section class="view-title"><h2>${titles[activeView] || activeCategory || activeView}</h2></section>`;
}


function resourceRankValue(value) {
  const map = {"Low": 1, "Medium": 2, "High": 3};
  return map[value] || 0;
}

function moneyRankValue(value) {
  const map = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4, "$$$$$": 5, "$$$$$$": 6};
  return map[value] || 0;
}

function moneyLabel(value) {
  const labels = {
    "$": "$ — under $500",
    "$$": "$$ — $500–$1,000",
    "$$$": "$$$ — $1,000–$5,000",
    "$$$$": "$$$$ — $5,000–$10,000",
    "$$$$$": "$$$$$ — $10,000–$50,000",
    "$$$$$$": "$$$$$$ — $50,000+"
  };
  return labels[value] || "Not set";
}

function resourceProfileScore(goal) {
  const time = resourceRankValue(goal.resource_time);
  const money = moneyRankValue(goal.resource_money);
  const physical = resourceRankValue(goal.resource_physical);
  const highCount = [time >= 3, money >= 4, physical >= 3].filter(Boolean).length;
  const mediumCount = [time >= 2, money >= 3, physical >= 2].filter(Boolean).length;
  if (highCount >= 1 || mediumCount >= 2) return {label:"Major Commitment", cls:"major", note:"Requires planning"};
  if (mediumCount >= 1) return {label:"Requires Planning", cls:"planning", note:"Manage consciously"};
  if (time || money || physical) return {label:"Easy to Start", cls:"easy", note:"Good near-term move"};
  return {label:"Not Fully Set", cls:"unset", note:"Add resources"};
}

function resourcesAnalysisRecommendations(goals) {
  const recs = [];
  const top = goals.filter(g => priorityValue(g) !== null && priorityValue(g) > 0 && priorityValue(g) <= 3);
  const highTime = top.filter(g => g.resource_time === "High");
  const highMoney = top.filter(g => moneyRankValue(g.resource_money) >= 4);
  const highPhysical = top.filter(g => g.resource_physical === "High");
  const incomplete = top.filter(g => !g.resource_time || !g.resource_money || !g.resource_physical);
  const easy = top.filter(g => resourceProfileScore(g).cls === "easy");
  if (highTime.length >= 3) recs.push(`You have ${highTime.length} top-priority goals requiring High time. Consider sequencing them instead of trying to advance all at once.`);
  if (highMoney.length) recs.push(`${highMoney.length} top-priority goal${highMoney.length===1?"":"s"} require $5,000+. Confirm timing before committing money.`);
  if (highPhysical.length >= 2) recs.push(`${highPhysical.length} top-priority goals require High physical effort. Spread them out to protect consistency.`);
  if (easy.length) recs.push(`${easy.length} top-priority goal${easy.length===1?" is":"s are"} easy to start. Use these for near-term momentum.`);
  if (incomplete.length) recs.push(`${incomplete.length} top-priority goal${incomplete.length===1?" is":"s are"} missing at least one resource estimate. Fill those in first for a clearer plan.`);
  if (!recs.length) recs.push("Your top-priority resources look balanced. Keep using Workplan to turn them into next actions.");
  return recs.slice(0,3);
}

function resourcesHtml() {
  const goals = state.goals || [];
  const topGoals = goals
    .filter(g => priorityValue(g) !== null && priorityValue(g) > 0 && priorityValue(g) <= 5)
    .sort((a,b) => prioritySortValue(a) - prioritySortValue(b));
  const priorities = topGoals.length ? topGoals : sortGoalsByCategoryPriority(goals).slice(0,8);
  const timeCounts = ["Low","Medium","High"].map(v => [v, priorities.filter(g => g.resource_time === v).length]);
  const physicalCounts = ["Low","Medium","High"].map(v => [v, priorities.filter(g => g.resource_physical === v).length]);
  const moneyLevels = ["$","$$","$$$","$$$$","$$$$$","$$$$$$"].map(v => [v, priorities.filter(g => g.resource_money === v).length]);
  const recs = resourcesAnalysisRecommendations(priorities);

  return `<section class="resources-page">
    <section class="panel resources-analysis-panel">
      <h3>Resources</h3>
      <p>Resource analysis for your highest-priority goals: time, money, and physical effort.</p>
      <div class="resource-summary-strip">
        <div><b>${priorities.length}</b><span>Priority goals analyzed</span></div>
        <div><b>${priorities.filter(g=>g.resource_time === "High").length}</b><span>High time</span></div>
        <div><b>${priorities.filter(g=>moneyRankValue(g.resource_money) >= 4).length}</b><span>$5k+ goals</span></div>
        <div><b>${priorities.filter(g=>g.resource_physical === "High").length}</b><span>High physical effort</span></div>
      </div>
    </section>
    <section class="panel">
      <h3>Top Priorities Resource Snapshot</h3>
      <div class="resource-priority-table">
        <div class="resource-table-head"><span>Priority</span><span>Goal</span><span>Time</span><span>Money</span><span>Physical</span><span>Profile</span></div>
        ${priorities.length ? priorities.map(g => {
          const profile = resourceProfileScore(g);
          return `<div class="resource-table-row clickable-card" onclick="openGoal('${g.id}')">
            <span>${priorityLabel(g)}</span><strong style="color:${categories[g.category]?.color || '#111827'}">${escapeHtml(g.title)}</strong><span>${g.resource_time || "Not set"}</span><span>${moneyLabel(g.resource_money)}</span><span>${g.resource_physical || "Not set"}</span><em class="resource-profile-badge ${profile.cls}">${profile.label}</em>
          </div>`;
        }).join("") : `<div class="recent-item"><strong>No priorities available yet.</strong><small>Set priorities and resources in the Workbook.</small></div>`}
      </div>
    </section>
    <section class="resource-analysis-grid">
      <div class="panel"><h3>Time</h3><div class="resource-count-list">${timeCounts.map(([label,count])=>`<div><strong>${label}</strong><span>${count} goal${count===1?"":"s"}</span></div>`).join("")}</div></div>
      <div class="panel"><h3>Money</h3><div class="resource-count-list">${moneyLevels.map(([label,count])=>`<div><strong>${label}</strong><span>${count} goal${count===1?"":"s"}</span></div>`).join("")}</div></div>
      <div class="panel"><h3>Physical Effort</h3><div class="resource-count-list">${physicalCounts.map(([label,count])=>`<div><strong>${label}</strong><span>${count} goal${count===1?"":"s"}</span></div>`).join("")}</div></div>
    </section>
    <section class="panel recommendation-card"><h3>Analysis & Recommendations</h3><div class="resource-recommendations">${recs.map(r=>`<div>${escapeHtml(r)}</div>`).join("")}</div></section>
  </section>`;
}

function dashboardIntroHtml(stats) {
  return `<section class="dashboard-hero compact-hero">
    <div>
      <h2>Overview</h2>
      <p>Choose where to focus: work, priorities, resources, review, strategy, or coaching.</p>
    </div>
  </section>`;
}


function utilityMenuHtml() {
  return `<details class="tiny-menu">
    <summary>☰</summary>
    <div id="saveStatus" class="menu-save-status">Cloud Sync On</div>
    <button onclick="activeView='Workbook';showAdd=!showAdd;render();jumpToSelectedContent();">${showAdd ? "Close Add Goal" : "Add Goal"}</button>
    <button onclick="exportData()">Export Backup</button>
    <button onclick="logout()">Sign Out</button>
  </details>`;
}


function statusRibbonHtml(stats) {
  const projects = state.goals.filter(g => (g.goal_type || "Project") === "Project");
  const behaviors = state.goals.filter(g => g.goal_type === "Behavior");

  const projectStarted = projects.filter(g => Number(g.progress || 0) > 0 || !["Not Started", "", null, undefined].includes(g.status)).length;
  const projectDone = projects.filter(g => g.status === "Completed" || Number(g.progress || 0) >= 100).length;

  const behaviorStarted = behaviors.filter(g => effectiveBehaviorRating(g) !== "Needs Improvement" || (g.today_this_week || "").trim() || (g.key_results || "").trim()).length;
  const behaviorMeets = behaviors.filter(g => ["Meets", "Exceeds"].includes(effectiveBehaviorRating(g))).length;

  return `<section class="status-ribbon">
    <span class="status-ribbon-title">Status</span>
    <span><b>Projects</b> ${projectStarted}/${projects.length} started • ${projectDone} done</span>
    <span><b>Behaviors</b> ${behaviorStarted}/${behaviors.length} started • ${behaviorMeets} meet+</span>
  </section>`;
}

function jumpToSelectedContent() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const target = document.querySelector(".content-start");
      if (target) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
      } else {
        window.scrollTo(0, 0);
      }
    });
  });
}

function jumpToTopNavigation() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const target = document.querySelector(".nav-workbook-row") || document.querySelector(".app-header-simple");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

function openWorkbookTop() {
  activeView = "Workbook";
  showAdd = false;
  render();
  jumpToTopNavigation();
}

function openDashboardTop() {
  activeView = "Dashboard";
  render();
  jumpToTopNavigation();
}

function setMainView(view) {
  activeView = view;
  render();
  jumpToTopNavigation();
}

function setWorkbookView(category) {
  activeView = "Workbook";
  activeCategory = category;
  showAdd = false;
  render();
  jumpToTopNavigation();
}

function render() {
  const stats = completionStats();
  const navCats = "";
  const viewButtons = "";
  const grouped = Object.keys(categories).map(cat => {
    const goals = sortGoalsByCategoryPriority(filteredGoals().filter(g => g.category === cat));
    if (!goals.length) return "";
    return `<h3 class="category-title" style="color:${categories[cat].color}">${cat}</h3>${goals.map(goalCard).join("")}`;
  }).join("");
  const dashboard = `${priorityStackHtml()}<section class="dashboard-grid"><div class="panel"><h3>Progress by Category</h3><div>${categoryProgressHtml()}</div></div><div class="panel"><h3>Recently Updated</h3><div class="recent-list">${recentHtml()}</div></div></section>${metricsHtml()}${coachHtml()}`;
  let main = activeView === "Dashboard" ? dashboard : activeView === "Today / This Week" ? workplanHtml() : activeView === "Weekly Review" ? weeklyReviewHtml() : activeView === "Strategic Brief" ? strategicBriefHtml() : activeView === "Priority Stack" ? priorityStackHtml() : activeView === "Resources" ? resourcesHtml() : activeView === "Workplan" ? workplanHtml() : activeView === "Life Seasons" ? lifeSeasonsHtml() : activeView === "Reviews" ? reviewsHtml() : activeView === "Coach" ? aiCoachHtml() : `${showAdd ? addForm() : ""}${grouped}`;
  document.getElementById("app").innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand-row"><div class="brand"><h1>My Life Vision</h1><p>Strategic Life OS</p></div></div>${utilityMenuHtml()}</aside><main class="content ${activeView==='Workbook' ? 'workbook-page' : ''}">
        <header class="app-header-simple">
          ${utilityMenuHtml()}
          <div class="brand-main">
            <h1>My Life Vision</h1>
            <p>Strategic Life OS</p>
          </div>
        </header>


        <div class="global-top-nav" aria-label="Quick top navigation">
          <button onclick="openWorkbookTop()">Workbook</button>
          <button onclick="openDashboardTop()">Dashboard</button>
        </div>

        <div class="nav-workbook-row">
          ${workbookCardHtml()}
          ${mainNavCardHtml()}
        </div>

        <div class="content-start"></div>
        ${activeView === "Dashboard" ? dashboardIntroHtml(stats) : viewTitleHtml()}
        ${main}
      </main></div>`;
}
function escapeHtml(text) {
  return String(text || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
init();
