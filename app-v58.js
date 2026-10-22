
const SUPABASE_URL = "https://ssbgtibgpazxtnoagyrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_9RfCRi_W5ZecyZsY-l_Pgg_CNt9ueDG";
const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

function renderStartupError(message) {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card startup-error" role="alert">
        <h1>My Life Vision</h1>
        <h2>The app could not start</h2>
        <p>${escapeHtml(message)}</p>
        <button onclick="window.location.reload()">Try Again</button>
      </div>
    </div>`;
}

const categories = {
  Relationships: { color: "#1f4e79" },
  Health: { color: "#2e7d32" },
  Adventure: { color: "#0077b6" },
  Creativity: { color: "#6f42c1" },
  Impact: { color: "#e67e22" }
};
const ageBands = ["On-going", "53-58", "58-63", "63-68", "68-73", "73-78", "78-83", "83-88", "88-93"];
const statuses = ["Not Started", "In Progress", "On Track", "At Risk", "Completed", "Archived"];
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

const WORKPLAN_META_REVIEW_KEY = "workplan_action_meta_v29";
const CAPTURE_INBOX_REVIEW_KEY = "capture_inbox_v32";
const NEXT30_REVIEW_SETTINGS_KEY = "next30_review_settings_v57";
const NEXT30_REVIEW_DAYS = 14;

let state = { goals: [], user: null, reviews: {}, metrics: {}, vision: [], actionMeta: {}, captures: [] };
let activeCategory = "All";
let activeView = "Workbook";
let showAdd = false;
let showAddVision = false;
let saveTimer = null;
let updateTimers = {};
let decisionSort = { key: "priority", dir: "asc" };
let workplanCategory = "All";
let doNextFocusOnly = false;
let showWorkplanAdd = false;
let showCapturePanel = false;
let showPauseEntry = true;
let possibilityStage = 0;
let possibilityAnswers = { belief: "", boundaries: "", gratitude: "" };
let possibilityAdvancing = false;
let next30ReviewOpen = false;
let passwordRecoveryMode = window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      passwordRecoveryMode = true;
      state.user = session?.user || null;
      setTimeout(() => renderPasswordRecovery(), 0);
    }
  });
}

async function init() {
  if (!supabaseClient) {
    return renderStartupError("The secure cloud connection did not load. Check your internet connection, then try again.");
  }
  const { data } = await supabaseClient.auth.getSession();
  state.user = data.session?.user || null;
  if (!state.user) return renderAuth();
  if (passwordRecoveryMode) return renderPasswordRecovery();
  await seedStarterGoalsIfEmpty();
  await Promise.all([loadGoals(), loadReviews(), loadMetrics(), loadVision()]);
  await migrateLocalActionMetadata();
  await initializeNext30ReviewTracking();
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
        <button class="secondary" style="width:100%;margin-top:12px" onclick="requestPasswordReset()">Forgot Password?</button>
        <div class="message">${escapeHtml(message)}</div>
      </div>
    </div>`;
}

async function requestPasswordReset() {
  const email = document.getElementById("email").value.trim();
  if (!email) return renderAuth("Enter your email address first, then click Forgot Password.");
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return renderAuth(error.message);
  renderAuth("Check your email for a password-reset link. You may also need to check Spam or Junk.");
}

function renderPasswordRecovery(message = "") {
  document.getElementById("app").innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <h1>Choose a New Password</h1>
        <p>Enter a new password for your existing My Life Vision account.</p>
        <input id="newPassword" type="password" autocomplete="new-password" placeholder="New password" />
        <input id="confirmPassword" type="password" autocomplete="new-password" placeholder="Confirm new password" />
        <button style="width:100%;margin-top:12px" onclick="saveRecoveredPassword()">Save New Password</button>
        <div class="message">${escapeHtml(message)}</div>
      </div>
    </div>`;
}

async function saveRecoveredPassword() {
  const password = document.getElementById("newPassword").value;
  const confirmation = document.getElementById("confirmPassword").value;
  if (password.length < 6) return renderPasswordRecovery("Your new password must be at least 6 characters.");
  if (password !== confirmation) return renderPasswordRecovery("The two passwords do not match. Please try again.");
  const { data, error } = await supabaseClient.auth.updateUser({ password });
  if (error) return renderPasswordRecovery(error.message);
  passwordRecoveryMode = false;
  state.user = data.user;
  history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`);
  await Promise.all([loadGoals(), loadReviews(), loadMetrics(), loadVision()]);
  await migrateLocalActionMetadata();
  await initializeNext30ReviewTracking();
  render();
  alert("Your password has been changed. You are now signed in.");
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
  await migrateLocalActionMetadata();
  await initializeNext30ReviewTracking();
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
  await migrateLocalActionMetadata();
  await initializeNext30ReviewTracking();
  render();
}

async function logout() {
  await supabaseClient.auth.signOut();
  state = { goals: [], user: null, reviews: {}, metrics: {}, vision: [], actionMeta: {}, captures: [] };
  showCapturePanel = false;
  renderAuth("Signed out.");
}

async function seedStarterGoalsIfEmpty() {
  const { data, error } = await supabaseClient.from("goals").select("id").limit(1);
  if (error) return alert("Database error: " + error.message + "\nDid you run the v5 SQL migration?");
  if (data && data.length > 0) return;
  const rows = starterGoals.map(g => ({ 
    user_id: state.user.id, category: g.category, title: g.title, why: "", people: "", money: "", 
    next30: "", next12: "", progress: 0, ages: [], status: "Not Started", objective: "", key_results: ""
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
  state.actionMeta = parseActionMetaBundle(state.reviews[WORKPLAN_META_REVIEW_KEY]);
  state.captures = parseCaptureInbox(state.reviews[CAPTURE_INBOX_REVIEW_KEY]);
}

function parseCaptureInbox(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter(item => item && item.id && item.text) : [];
  } catch (error) {
    return [];
  }
}

async function saveCaptures(message = "Capture saved") {
  if (!state.user) return;
  const content = JSON.stringify(state.captures || []);
  state.reviews[CAPTURE_INBOX_REVIEW_KEY] = content;
  const { error } = await supabaseClient.from("life_reviews").upsert({
    user_id: state.user.id,
    review_type: CAPTURE_INBOX_REVIEW_KEY,
    content,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,review_type" });
  if (error) showSaved("Save error"); else showSaved(message);
}

function toggleCapturePanel() {
  showCapturePanel = !showCapturePanel;
  render();
  if (showCapturePanel) {
    requestAnimationFrame(() => document.getElementById("captureText")?.focus());
  }
}

async function addCapture(event) {
  event.preventDefault();
  const input = event.currentTarget.elements.capture_text;
  const text = String(input.value || "").trim();
  if (!text) return;
  state.captures.unshift({
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`,
    text,
    createdAt: new Date().toISOString()
  });
  await saveCaptures();
  render();
  requestAnimationFrame(() => document.getElementById("captureText")?.focus());
}

async function deleteCapture(captureId) {
  state.captures = state.captures.filter(item => item.id !== captureId);
  await saveCaptures("Capture deleted");
  render();
}

async function turnCaptureIntoAction(captureId) {
  const capture = state.captures.find(item => item.id === captureId);
  const select = document.getElementById(`captureGoal-${captureId}`);
  const goal = state.goals.find(item => item.id === select?.value);
  if (!capture || !goal) return alert("Choose a goal for this action.");
  const action = cleanActionLine(capture.text);
  if (actionLines(goal, "today_this_week").some(item => item.text.toLowerCase() === action.toLowerCase())) {
    return alert("That action is already listed for this goal.");
  }
  const existing = String(goal.today_this_week || "").trim();
  const nextText = existing ? `${existing}\n• ${action}` : `• ${action}`;
  const updatedAt = new Date().toISOString();
  const { error } = await supabaseClient.from("goals").update({ today_this_week: nextText, updated_at: updatedAt }).eq("id", goal.id);
  if (error) return alert("Could not create action: " + error.message);
  goal.today_this_week = nextText;
  goal.updated_at = updatedAt;
  state.captures = state.captures.filter(item => item.id !== captureId);
  await saveCaptures("Moved to Workplan");
  render();
}

function capturePanelHtml() {
  if (!showCapturePanel) return "";
  const hasGoals = state.goals.some(goal => !isCompletedGoal(goal) && !isArchivedGoal(goal) && priorityValue(goal) !== -1);
  return `<aside class="capture-panel" aria-label="Capture inbox">
    <div class="capture-panel-header">
      <div><strong>Capture</strong><span>${state.captures.length} saved</span></div>
      <button type="button" class="capture-close" onclick="toggleCapturePanel()" aria-label="Close Capture">×</button>
    </div>
    <form class="capture-form" onsubmit="addCapture(event)">
      <textarea id="captureText" name="capture_text" rows="2" required placeholder="What just came to mind?"></textarea>
      <button type="submit">Save</button>
    </form>
    <div class="capture-list">
      ${state.captures.length ? state.captures.map(item => `<div class="capture-item">
        <p>${escapeHtml(item.text)}</p>
        <div class="capture-item-actions">
          <select id="captureGoal-${item.id}" aria-label="Goal for captured idea" ${hasGoals ? "" : "disabled"}>
            <option value="">Choose a goal</option>
            ${workplanGoalOptionsHtml()}
          </select>
          <button type="button" onclick="turnCaptureIntoAction('${item.id}')" ${hasGoals ? "" : "disabled"}>Make Action</button>
          <button type="button" class="capture-delete" onclick="deleteCapture('${item.id}')">Delete</button>
        </div>
      </div>`).join("") : `<div class="capture-empty">Ideas and tasks you capture will wait here.</div>`}
    </div>
  </aside>`;
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

async function setGoalCategory(id, category) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal || !categories[category] || goal.category === category) return;

  const updates = { category, updated_at: new Date().toISOString() };
  const { error } = await supabaseClient.from("goals").update(updates).eq("id", id);
  if (error) {
    render();
    return alert("Could not update goal category: " + error.message);
  }

  Object.assign(goal, updates);
  if (activeView === "Workbook" && activeCategory !== "All") activeCategory = category;
  render();
  showSaved("Category updated");
  requestAnimationFrame(() => {
    document.getElementById(`goal-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

async function setGoalStatus(id, value) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;

  if (value === "Completed" && goal.status !== "Completed") {
    const reflection = prompt("Congratulations. What did accomplishing this make possible? (Optional)", "");
    const nextWins = reflection && reflection.trim()
      ? `${goal.wins ? goal.wins.trim() + "\n" : ""}Completion reflection: ${reflection.trim()}`
      : goal.wins || "";
    const updates = { status: "Completed", wins: nextWins, updated_at: new Date().toISOString() };
    const { error } = await supabaseClient.from("goals").update(updates).eq("id", id);
    if (error) return alert("Could not complete goal: " + error.message);
    Object.assign(goal, updates);
    showSaved("Moved to Achievements");
    render();
    return;
  }

  const updates = { status: value, updated_at: new Date().toISOString() };
  const { error } = await supabaseClient.from("goals").update(updates).eq("id", id);
  if (error) return alert("Could not update goal status: " + error.message);
  Object.assign(goal, updates);
  showSaved();
  render();
}

async function toggleAge(id, age) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  goal.ages = goal.ages.includes(age) ? goal.ages.filter(a => a !== age) : [...goal.ages, age];
  const { error } = await supabaseClient.from("goals").update({ ages: goal.ages, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) showSaved("Save error"); else showSaved();
}

async function setLifeSeason(id, age) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  goal.ages = age ? [age] : [];
  const { error } = await supabaseClient.from("goals").update({ ages: goal.ages, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) showSaved("Save error"); else showSaved();
}

async function addGoal(event) {
  event.preventDefault();
  const title = document.getElementById("newGoalTitle").value.trim();
  const category = document.getElementById("newGoalCategory").value;
  if (!title) return;
  const row = { user_id: state.user.id, category, title, why: "", people: "", money: "", next30: "", next12: "", progress: 0, ages: [], status: "Not Started", objective:"", key_results:"", today_this_week:"", behavior_standard:"", goal_type:"Project", behavior_rating:"Needs Improvement", priority_rank:null, resource_time:"", resource_money:"", resource_physical:"", wins:"", lessons:"", today_this_week:"" };
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
  if (state.actionMeta?.[id]) {
    delete state.actionMeta[id];
    localStorage.removeItem(goalMetaStorageKey(id));
    queueActionMetaCloudSave("Goal details removed");
  }
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

function isCompletedGoal(goal) {
  return goal.status === "Completed";
}

function isArchivedGoal(goal) {
  return goal.status === "Archived";
}

function activeWorkbookGoals() {
  return state.goals.filter(g => !isCompletedGoal(g) && !isArchivedGoal(g));
}

function filteredGoals() {
  const goals = activeWorkbookGoals();
  return activeCategory === "All" ? goals : goals.filter(g => g.category === activeCategory);
}
function completionStats() {
  const total = state.goals.length;
  const active = state.goals.filter(g => !["Not Started", "Completed", "Archived"].includes(g.status || "Not Started")).length;
  const complete = state.goals.filter(g => g.status === "Completed").length;
  return { total, active, complete };
}
function categoryStats() {
  return Object.keys(categories).map(cat => {
    const goals = state.goals.filter(g => g.category === cat);
    const atRisk = goals.filter(g => g.status === "At Risk").length;
    const complete = goals.filter(g => g.status === "Completed").length;
    const notStarted = goals.filter(g => (g.status || "Not Started") === "Not Started").length;
    return { cat, count: goals.length, atRisk, complete, notStarted };
  });
}
function recentGoals() {
  return [...state.goals].sort((a,b)=>new Date(b.updated_at || b.created_at)-new Date(a.updated_at || a.created_at)).slice(0,5);
}
function categoryStatusHtml() {
  return categoryStats().map(s => `
    <div class="category-row">
      <span style="color:${categories[s.cat].color}">${s.cat}</span>
      <small>${s.count} goal${s.count === 1 ? "" : "s"} • ${s.complete} completed${s.atRisk ? ` • ${s.atRisk} at risk` : ""}</small>
    </div>`).join("");
}
function recentHtml() {
  return recentGoals().map(g => `
    <div class="recent-item"><strong style="color:${categories[g.category].color}">${escapeHtml(g.title)}</strong><small>${g.category} • ${g.status || "Not Started"}</small></div>`).join("");
}

function coachInsights() {
  const insights = [];
  const atRisk = state.goals.filter(g => (g.goal_type || "Project") === "Project" && g.status === "At Risk");
  const noNext30 = state.goals.filter(g => !(g.next30||"").trim());
  const notStarted = state.goals.filter(g => (g.status || "Not Started") === "Not Started");
  if (atRisk.length) insights.push({title:`At-risk goals need attention`, text:`You marked ${atRisk.length} goal(s) as At Risk. Review blockers and resources before adding new goals.`});
  if (noNext30.length) insights.push({title:`Next 30+/- Days gap`, text:`${noNext30.length} goal(s) have no next-30+/-day action. These are likely to stay aspirational unless you define the next move.`});
  if (notStarted.length) insights.push({title:`Goals waiting for a decision`, text:`${notStarted.length} goal(s) are Not Started. Choose which one deserves attention and consciously defer the rest.`});
  if (insights.length === 0) insights.push({title:"Solid system health", text:"Your goals have clear statuses, next actions, and resources. Use the quarterly review to choose what matters most now."});
  return insights;
}

const bulletFieldKeys = new Set(["key_results", "money", "today_this_week", "next30", "wins", "lessons"]);

function fieldCard(goal, key, label, className = "") {
  const color = categories[goal.category].color;
  const textareaId = `field-${goal.id}-${key}`;
  const bulletTools = bulletFieldKeys.has(key)
    ? `<button type="button" class="bullet-tool" onclick="insertBullet('${textareaId}')" title="Add bullet point">• Bullet</button>`
    : "";
  const inputHandler = key === "next30"
    ? `updateNext30Field('${goal.id}', this.value)`
    : `updateGoalNoRender('${goal.id}', '${key}', this.value)`;
  return `<div class="field-card ${className}"><div class="field-header field-header-with-tool" style="background:${color}"><span>${label}</span>${bulletTools}</div><textarea id="${textareaId}" class="field-body ${className === "full" ? "large" : ""}" style="color:${color}" onkeydown="handleBulletKeydown(event)" oninput="${inputHandler}">${escapeHtml(goal[key] || "")}</textarea></div>`;
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

function goalMetaStorageKey(goalId) {
  return `lifeVisionGoalMeta:${state.user?.id || "local"}:${goalId}`;
}

function parseActionMetaBundle(raw) {
  try {
    if (!raw || typeof raw !== "string") return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function localGoalMeta(goalId) {
  try {
    if (!goalId) return {};
    const raw = localStorage.getItem(goalMetaStorageKey(goalId)) || "";
    if (!raw.trim().startsWith("{")) return {};
    const parsed = JSON.parse(raw);
    return parsed && parsed.__lifeVisionMeta ? parsed : {};
  } catch (error) {
    return {};
  }
}

function parseGoalMeta(goal) {
  if (!goal?.id) return {};
  const local = localGoalMeta(goal.id);
  const cloud = state.actionMeta?.[goal.id];
  return cloud && typeof cloud === "object" ? { ...local, ...cloud } : local;
}

async function saveActionMetaBundle(message = "Saved to cloud") {
  if (!state.user) return;
  const content = JSON.stringify(state.actionMeta || {});
  state.reviews[WORKPLAN_META_REVIEW_KEY] = content;
  const { error } = await supabaseClient.from("life_reviews").upsert({
    user_id: state.user.id,
    review_type: WORKPLAN_META_REVIEW_KEY,
    content,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,review_type" });
  if (error) showSaved("Save error"); else showSaved(message);
}

function queueActionMetaCloudSave(message = "Saved to cloud") {
  state.reviews[WORKPLAN_META_REVIEW_KEY] = JSON.stringify(state.actionMeta || {});
  clearTimeout(updateTimers.workplanActionMeta);
  updateTimers.workplanActionMeta = setTimeout(() => saveActionMetaBundle(message), 650);
}

function storeGoalMeta(goalId, meta, message = "Saved to cloud", shouldRender = false) {
  meta.__lifeVisionMeta = true;
  state.actionMeta = state.actionMeta || {};
  state.actionMeta[goalId] = meta;
  localStorage.setItem(goalMetaStorageKey(goalId), JSON.stringify(meta));
  queueActionMetaCloudSave(message);
  if (shouldRender) setTimeout(render, 0);
}

async function migrateLocalActionMetadata() {
  state.actionMeta = state.actionMeta || {};
  let changed = false;
  state.goals.forEach(goal => {
    if (state.actionMeta[goal.id]) return;
    const local = localGoalMeta(goal.id);
    if (!local.__lifeVisionMeta) return;
    state.actionMeta[goal.id] = local;
    changed = true;
  });
  if (changed) await saveActionMetaBundle("Workplan details synced");
}

function next30DatePlusDays(from, days = NEXT30_REVIEW_DAYS) {
  const date = new Date(from || Date.now());
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function next30RecordId() {
  return crypto.randomUUID ? crypto.randomUUID() : `n30-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

function next30ReviewRecords(goal) {
  const records = parseGoalMeta(goal).next30ReviewItems;
  return Array.isArray(records) ? records.filter(record => record && record.id && record.text) : [];
}

function buildReconciledNext30Records(goal, now = new Date()) {
  const lines = actionLines(goal, "next30");
  const existing = next30ReviewRecords(goal);
  const used = new Set();
  const next = new Array(lines.length);
  const normalized = text => cleanActionLine(text).toLowerCase();

  // Preserve exact matches first, even if a line moved within the textarea.
  lines.forEach((line, index) => {
    const matchIndex = existing.findIndex((record, recordIndex) =>
      !used.has(recordIndex) && normalized(record.text) === normalized(line.text)
    );
    if (matchIndex < 0) return;
    used.add(matchIndex);
    const record = existing[matchIndex];
    next[index] = {
      ...record,
      text: line.text,
      index,
      addedAt: record.addedAt || now.toISOString(),
      reviewDueAt: record.reviewDueAt || next30DatePlusDays(now)
    };
  });

  // When the number of lines is unchanged, treat a change in-place as a rename.
  lines.forEach((line, index) => {
    if (next[index]) return;
    const sameIndex = existing.findIndex((record, recordIndex) =>
      !used.has(recordIndex) && existing.length === lines.length && Number(record.index) === index
    );
    if (sameIndex >= 0) {
      used.add(sameIndex);
      const record = existing[sameIndex];
      next[index] = {
        ...record,
        text: line.text,
        index,
        addedAt: record.addedAt || now.toISOString(),
        reviewDueAt: record.reviewDueAt || next30DatePlusDays(now)
      };
      return;
    }
    next[index] = {
      id: next30RecordId(),
      text: line.text,
      index,
      addedAt: now.toISOString(),
      reviewDueAt: next30DatePlusDays(now),
      lastReviewedAt: ""
    };
  });

  return next;
}

function reconcileNext30ReviewItems(goal, message = "Next 30 review updated") {
  if (!goal) return false;
  const meta = parseGoalMeta(goal);
  const before = JSON.stringify(Array.isArray(meta.next30ReviewItems) ? meta.next30ReviewItems : []);
  const records = buildReconciledNext30Records(goal);
  if (before === JSON.stringify(records)) return false;
  meta.next30ReviewItems = records;
  storeGoalMeta(goal.id, meta, message);
  return true;
}

async function initializeNext30ReviewTracking() {
  state.actionMeta = state.actionMeta || {};
  let changed = false;
  const now = new Date();
  state.goals.forEach(goal => {
    if (isCompletedGoal(goal) || isArchivedGoal(goal)) return;
    const meta = parseGoalMeta(goal);
    const before = JSON.stringify(Array.isArray(meta.next30ReviewItems) ? meta.next30ReviewItems : []);
    const records = buildReconciledNext30Records(goal, now);
    if (before === JSON.stringify(records)) return;
    meta.__lifeVisionMeta = true;
    meta.next30ReviewItems = records;
    state.actionMeta[goal.id] = meta;
    localStorage.setItem(goalMetaStorageKey(goal.id), JSON.stringify(meta));
    changed = true;
  });
  if (changed) await saveActionMetaBundle("Next 30 review tracking started");
}

function updateNext30Field(goalId, value) {
  const goal = state.goals.find(item => item.id === goalId);
  if (!goal) return;
  goal.next30 = value;
  clearTimeout(updateTimers[goalId + "next30"]);
  updateTimers[goalId + "next30"] = setTimeout(async () => {
    const updatedAt = new Date().toISOString();
    const { error } = await supabaseClient.from("goals").update({ next30: value, updated_at: updatedAt }).eq("id", goalId);
    if (error) return showSaved("Save error");
    goal.updated_at = updatedAt;
    reconcileNext30ReviewItems(goal);
    showSaved();
  }, 500);
}

function next30ReviewSettings() {
  try {
    const parsed = JSON.parse(state.reviews[NEXT30_REVIEW_SETTINGS_KEY] || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

async function saveNext30ReviewSettings(settings) {
  const content = JSON.stringify(settings || {});
  state.reviews[NEXT30_REVIEW_SETTINGS_KEY] = content;
  const { error } = await supabaseClient.from("life_reviews").upsert({
    user_id: state.user.id,
    review_type: NEXT30_REVIEW_SETTINGS_KEY,
    content,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,review_type" });
  if (error) showSaved("Save error");
}

function dueNext30Items() {
  const now = Date.now();
  return state.goals
    .filter(goal => !isCompletedGoal(goal) && !isArchivedGoal(goal))
    .flatMap(goal => next30ReviewRecords(goal)
      .filter(record => Date.parse(record.reviewDueAt || "") <= now)
      .map(record => ({ goal, record })))
    .sort((a, b) => Date.parse(a.record.reviewDueAt) - Date.parse(b.record.reviewDueAt));
}

function next30ReviewIsSnoozed() {
  const until = Date.parse(next30ReviewSettings().snoozedUntil || "");
  return Number.isFinite(until) && until > Date.now();
}

function next30ReviewBadgeHtml() {
  const count = dueNext30Items().length;
  return count ? `<span class="next30-review-badge" aria-label="${count} Next 30 actions need review">${count}</span>` : "";
}

function next30ReviewBannerHtml() {
  const count = dueNext30Items().length;
  if (!count || next30ReviewOpen || next30ReviewIsSnoozed()) return "";
  return `<section class="next30-review-banner" aria-label="Next 30 review reminder">
    <div>
      <strong>Next 30 Review · ${count} action${count === 1 ? "" : "s"}</strong>
      <span>${count === 1 ? "One action has" : "These actions have"} been on the list for 14 days.</span>
    </div>
    <div class="next30-review-banner-actions">
      <button type="button" onclick="openNext30Review()">Review Now</button>
      <button type="button" class="secondary" onclick="remindNext30Tomorrow()">Remind Me Tomorrow</button>
    </div>
  </section>`;
}

function openNext30Review() {
  if (!dueNext30Items().length) return;
  next30ReviewOpen = true;
  render();
}

function closeNext30Review() {
  next30ReviewOpen = false;
  render();
}

async function remindNext30Tomorrow() {
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  await saveNext30ReviewSettings({ ...next30ReviewSettings(), snoozedUntil: tomorrow.toISOString() });
  next30ReviewOpen = false;
  render();
  showSaved("Reminder set for tomorrow");
}

function removeNext30Line(goal, recordId) {
  const records = next30ReviewRecords(goal);
  const record = records.find(item => item.id === recordId);
  if (!record) return null;
  const lines = String(goal.next30 || "").split(/\n+/);
  let lineIndex = Number(record.index);
  if (!lines[lineIndex] || cleanActionLine(lines[lineIndex]).toLowerCase() !== cleanActionLine(record.text).toLowerCase()) {
    lineIndex = lines.findIndex(line => cleanActionLine(line).toLowerCase() === cleanActionLine(record.text).toLowerCase());
  }
  if (lineIndex < 0) return null;
  const next30 = lines.filter((_, index) => index !== lineIndex).join("\n").trim();
  return { record, next30, remainingRecords: records.filter(item => item.id !== recordId).map((item, index) => ({ ...item, index })) };
}

async function reviewNext30Action(goalId, recordId, decision) {
  const goal = state.goals.find(item => item.id === goalId);
  if (!goal) return;
  const meta = parseGoalMeta(goal);

  if (decision === "keep") {
    const reviewedAt = new Date().toISOString();
    meta.next30ReviewItems = next30ReviewRecords(goal).map(record => record.id === recordId
      ? { ...record, lastReviewedAt: reviewedAt, reviewDueAt: next30DatePlusDays(reviewedAt) }
      : record);
    storeGoalMeta(goalId, meta, "Kept for 14 more days");
  } else {
    const removal = removeNext30Line(goal, recordId);
    if (!removal) return;
    const updates = { next30: removal.next30, updated_at: new Date().toISOString() };

    if (decision === "move") {
      const existingActions = actionLines(goal, "today_this_week");
      if (!existingActions.some(item => item.text.toLowerCase() === removal.record.text.toLowerCase())) {
        const current = String(goal.today_this_week || "").trim();
        updates.today_this_week = current ? `${current}\n• ${removal.record.text}` : `• ${removal.record.text}`;
      }
    }

    const { error } = await supabaseClient.from("goals").update(updates).eq("id", goalId);
    if (error) return alert("Could not update this action: " + error.message);
    Object.assign(goal, updates);
    meta.next30ReviewItems = removal.remainingRecords;
    if (decision === "archive") {
      const archive = Array.isArray(meta.next30ReviewArchive) ? meta.next30ReviewArchive : [];
      meta.next30ReviewArchive = [{ ...removal.record, archivedAt: new Date().toISOString() }, ...archive];
    }
    storeGoalMeta(goalId, meta, decision === "move" ? "Moved to Today / This Week" : "Action archived");
  }

  if (!dueNext30Items().length) next30ReviewOpen = false;
  render();
}

function next30ReviewPanelHtml() {
  if (!next30ReviewOpen) return "";
  const current = dueNext30Items()[0];
  if (!current) {
    next30ReviewOpen = false;
    return "";
  }
  const remaining = dueNext30Items().length;
  return `<div class="next30-review-overlay" role="dialog" aria-modal="true" aria-labelledby="next30ReviewTitle">
    <section class="next30-review-dialog">
      <button type="button" class="next30-review-close" onclick="closeNext30Review()" aria-label="Close review">×</button>
      <span class="next30-review-kicker">Next 30 Review · ${remaining} remaining</span>
      <h2 id="next30ReviewTitle">Still relevant?</h2>
      <p class="next30-review-action">${escapeHtml(current.record.text)}</p>
      <p class="next30-review-goal">${escapeHtml(current.goal.title || "Untitled Goal")} · ${escapeHtml(current.goal.category || "")}</p>
      <div class="next30-review-decisions">
        <button type="button" onclick="reviewNext30Action('${current.goal.id}','${current.record.id}','move')">Move to Today / This Week</button>
        <button type="button" class="secondary" onclick="reviewNext30Action('${current.goal.id}','${current.record.id}','keep')">Keep for 14 More Days</button>
        <button type="button" class="secondary archive" onclick="reviewNext30Action('${current.goal.id}','${current.record.id}','archive')">Archive</button>
      </div>
      <small>Nothing is removed automatically. You decide what happens to each action.</small>
    </section>
  </div>`;
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
  meta[key] = value;
  storeGoalMeta(goalId, meta, "Saved to cloud", true);
}

function updateGoalMetaNoRender(goalId, key, value) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  const meta = parseGoalMeta(goal);
  meta[key] = value;
  storeGoalMeta(goalId, meta);
}

function updateActionMeta(goalId, field, actionKey, index, suffix, value) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  const meta = parseGoalMeta(goal);
  meta[`action_${field}_${actionKey}_${suffix}`] = value;
  meta[`action_${field}_idx_${index}_${suffix}`] = value;
  storeGoalMeta(goalId, meta);
}

function localMetaFieldCard(goal, key, label, cls = "") {
  const value = metaValue(goal, key);
  const color = categories[goal.category]?.color || "#111827";
  return `<div class="field-card ${cls}">
    <div class="field-header" style="background:${color}">${label}</div>
    <textarea class="field-body ${cls==='full' ? 'large' : ''}" style="color:${color}" oninput="updateGoalMetaNoRender('${goal.id}', '${key}', this.value)">${escapeHtml(value)}</textarea>
  </div>`;
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

function resourcesDrawerHtml(goal) {
  const color = categories[goal.category].color;
  const hasResources = Boolean(goal.resource_time || goal.resource_money || goal.resource_physical);
  return `<details class="reflection-drawer">
    <summary style="color:${color}">Resources ${hasResources ? "•" : ""}</summary>
    <div class="reflection-grid">
      ${resourceProfileHtml(goal)}
    </div>
  </details>`;
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


function priorityStackHtml(showHeading = true) {
  const priorities = state.goals
    .filter(g => !isCompletedGoal(g) && !isArchivedGoal(g))
    .filter(g => {
      const value = priorityValue(g);
      return value !== null && value > 0;
    })
    .sort((a,b) => prioritySortValue(a)-prioritySortValue(b));

  const inventoryGoals = state.goals
    .filter(g => !isCompletedGoal(g) && !isArchivedGoal(g))
    .filter(g => priorityValue(g) === -1)
    .sort((a,b) => (a.category || "").localeCompare(b.category || "") || (a.title || "").localeCompare(b.title || ""));

  return `<section class="panel priority-stack-panel">
    ${showHeading ? "<h3>Priority Stack</h3>" : ""}
    <div class="recent-list">
      ${priorities.length ? priorities.map(g => `<div class="recent-item clickable-card" onclick="openGoal('${g.id}')"><strong style="color:${categories[g.category].color}">${priorityLabel(g)} — ${escapeHtml(g.title)}</strong><small>${g.category} • ${goalType(g)} • ${goalStatusLabel(g)}</small></div>`).join("") : `<div class="recent-item"><strong>No priorities selected yet.</strong><small>Set Priority 1–5 on any goal card.</small></div>`}
    </div>

    <div class="inventory-goals-section">
      <h4>Inventory Goals</h4>
      <div class="recent-list">
        ${inventoryGoals.length ? inventoryGoals.map(g => `<div class="recent-item clickable-card inventory-goal-item" onclick="openGoal('${g.id}')"><strong style="color:${categories[g.category].color}">${escapeHtml(g.title)}</strong><small>${g.category} • ${goalType(g)} • ${goalStatusLabel(g)}</small></div>`).join("") : `<div class="recent-item"><strong>No inventory goals yet.</strong><small>Set a goal's priority to Inventory to list it here.</small></div>`}
      </div>
    </div>
  </section>`;
}

function achievementsHtml() {
  const completed = state.goals
    .filter(g => isCompletedGoal(g) && !isArchivedGoal(g))
    .sort((a,b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

  return `<section class="achievements-page">
    <section class="panel achievements-hero">
      <p>A record of the goals you completed and the evidence of the life you created.</p>
      <div class="achievement-count"><strong>${completed.length}</strong><span>completed goal${completed.length===1?"":"s"}</span></div>
    </section>
    <section class="achievements-grid">
      ${completed.length ? completed.map(g => {
        const completedDate = new Date(g.updated_at || g.created_at || Date.now()).toLocaleDateString(undefined, { month:"long", day:"numeric", year:"numeric" });
        return `<article class="panel achievement-card">
          <div class="achievement-check">✓</div>
          <div>
            <span class="category-pill" style="background:${categories[g.category]?.color || '#111827'}">${escapeHtml(g.category || "Goal")}</span>
            <h3>${escapeHtml(g.title || "Untitled Goal")}</h3>
            <p class="achievement-date">Completed ${escapeHtml(completedDate)}</p>
            ${(g.wins || "").trim() ? `<div class="achievement-detail"><strong>Wins & reflection</strong><p>${escapeHtml(g.wins).replaceAll("\n","<br>")}</p></div>` : ""}
            ${(g.lessons || "").trim() ? `<div class="achievement-detail"><strong>Lessons</strong><p>${escapeHtml(g.lessons).replaceAll("\n","<br>")}</p></div>` : ""}
            <div class="achievement-actions">
              <button class="secondary" onclick="setGoalStatus('${g.id}','In Progress')">Return to Workbook</button>
              <button class="delete" onclick="setGoalStatus('${g.id}','Archived')">Archive</button>
            </div>
          </div>
        </article>`;
      }).join("") : `<section class="panel"><h3>No achievements yet.</h3><p>When you mark a project Completed, it will move here and leave the main Workbook.</p></section>`}
    </section>
  </section>`;
}

function lifeSeasonsHtml() {
  return `<section class="panel">
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
  return goal.status || "Not Started";
}

function goalCategorySelectHtml(goal, className = "status-select") {
  const color = categories[goal.category]?.color || "#111827";
  const pillStyle = className.includes("category-pill")
    ? ` style="background:${color};color:#fff;border:0;cursor:pointer;font:inherit;"`
    : "";

  return `<select class="${className}"${pillStyle} aria-label="Change goal category" onchange="setGoalCategory('${goal.id}', this.value)">
    ${Object.keys(categories).map(category => `<option value="${category}" ${goal.category === category ? "selected" : ""}>${category}</option>`).join("")}
  </select>`;
}

function goalCard(goal) {
  const color = categories[goal.category].color;
  const type = goalType(goal);
  const currentPriority = priorityValue(goal);
  const prioritySummary = currentPriority === null ? "No Priority" : currentPriority === -1 ? "Inventory" : `Priority ${currentPriority}`;
  const lifeSeasonSummary = goal.ages?.[0] || "No Life Season";
  const isInventory = priorityValue(goal) === -1;

  if (isInventory) {
    return `<article class="goal-card inventory-card" id="goal-${goal.id}">
      <div class="inventory-row">
        <textarea class="goal-title inventory-title" style="color:${color}" oninput="updateGoalNoRender('${goal.id}', 'title', this.value)">${escapeHtml(goal.title)}</textarea>
        <label>Category<br>${goalCategorySelectHtml(goal)}</label>
        <label>Type<br>
          <select class="status-select" onchange="updateGoalNoRender('${goal.id}','goal_type',this.value); setTimeout(render, 300);">
            <option ${type==="Project"?"selected":""}>Project</option>
            <option ${type==="Behavior"?"selected":""}>Behavior</option>
          </select>
        </label>
        <label>Status<br>
          <select class="status-select" onchange="setGoalStatus('${goal.id}',this.value)">
            ${statuses.map(s=>`<option ${(goal.status||"Not Started")===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </label>
        <label>Priority<br>${priorityOptions(goal)}</label>
      </div>
    </article>`;
  }

  return `<article class="goal-card" id="goal-${goal.id}">
    <div class="goal-top">
      ${goalCategorySelectHtml(goal, "category-pill category-select-pill")}
      <textarea class="goal-title" style="color:${color}" oninput="updateGoalNoRender('${goal.id}', 'title', this.value)">${escapeHtml(goal.title)}</textarea>
    </div>

    <details class="goal-settings-drawer">
      <summary>
        <span class="goal-settings-summary">
          <strong>Goal Settings</strong>
          <span class="goal-settings-values">
            <span>${escapeHtml(type)}</span>
            <span>${escapeHtml(goal.status || "Not Started")}</span>
            <span>${escapeHtml(prioritySummary)}</span>
            <span>${escapeHtml(lifeSeasonSummary)}</span>
          </span>
        </span>
        <span class="goal-settings-edit">Edit <span class="goal-settings-chevron" aria-hidden="true">⌄</span></span>
      </summary>
      <div class="goal-settings-fields">
        <label>Type
          <select class="status-select" onchange="updateGoalNoRender('${goal.id}','goal_type',this.value); setTimeout(render, 300);">
            <option ${type==="Project"?"selected":""}>Project</option>
            <option ${type==="Behavior"?"selected":""}>Behavior</option>
          </select>
        </label>
        <label>Status
          <select class="status-select" onchange="setGoalStatus('${goal.id}',this.value)">
            ${statuses.map(s=>`<option ${(goal.status||"Not Started")===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </label>
        <label>Priority
          ${priorityOptions(goal)}
        </label>
        <label for="life-season-${goal.id}">Life Season
          <select id="life-season-${goal.id}" class="status-select life-season-select" onchange="setLifeSeason('${goal.id}', this.value)">
            <option value="">Select a life season</option>
            ${ageBands.map(age => `<option value="${age}" ${goal.ages?.includes(age) ? "selected" : ""}>${age}</option>`).join("")}
          </select>
        </label>
      </div>
    </details>

    <div class="grid-two meaning-feeling-grid">
      ${fieldCard(goal, "key_results", "My Beliefs")}
      ${localMetaFieldCard(goal, "feeling_completed", "Feeling This Will Provide")}
    </div>

    <div class="grid-two">
      <div>
        ${fieldCard(goal, "today_this_week", "Today / This Week")}
        ${actionMetadataEditorHtml(goal, "today_this_week", "Today / This Week")}
      </div>
      <div>
        ${fieldCard(goal, "next30", "Next 30+/- Days")}
      </div>
    </div>

    ${resourcesDrawerHtml(goal)}

    ${reflectionHtml(goal)}

    <div class="card-actions" style="justify-content:flex-end">
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
    ["quarterly","Quarterly Review","Objective, key results, next 30+/- days, blockers, resources."],
    ["annual","Annual Review","What mattered most this year? What do I want next year?"],
    ["stop_doing","Stop Doing","What should I stop doing to make room for what matters?"],
    ["year_success","This Year Success","What would make this year a success?"]
  ];
  return `<section class="panel"><h3>Planning Reviews</h3><div class="review-grid">${reviews.map(r=>`<div class="review-card"><div class="field-header" style="background:#111827">${r[1]}</div><textarea placeholder="${r[2]}" oninput="updateReview('${r[0]}', this.value)">${escapeHtml(state.reviews[r[0]] || "")}</textarea></div>`).join("")}</div></section>`;
}
function coachHtml() {
  return `<section class="panel"><h3>Built-in Coach</h3><p>Rules-based coaching based on your goals, statuses, people fields, and next actions.</p><div class="coach-list">${coachInsights().map(i=>`<div class="coach-item"><strong>${escapeHtml(i.title)}</strong><p>${escapeHtml(i.text)}</p></div>`).join("")}</div></section>`;
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
      people: g.people,
      resource_time: g.resource_time,
      resource_money: g.resource_money,
      resource_physical: g.resource_physical,
      priority_rank: g.priority_rank,
      wins: g.wins,
      lessons: g.lessons,
      next30: g.next30,
      
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
4. Top 3 priorities for the next 30+/- days
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
    <p>This uses OpenAI to review your goals, statuses, reviews, metrics, vision board, blockers, people, and resources. Your OpenAI key is stored only in this browser's local storage.</p>
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
  const atRisk = state.goals.filter(g => g.status === "At Risk");
  const onTrack = state.goals.filter(g => g.status === "On Track");
  const completed = state.goals.filter(g => g.status === "Completed");
  const notStarted = state.goals.filter(g => (g.status || "Not Started") === "Not Started");
  const noNext30 = state.goals.filter(g => !(g.next30||"").trim());
  const noResources = state.goals.filter(g => !g.resource_time && !g.resource_money && !g.resource_physical);
  const recent = recentGoals().slice(0,3);
  const mostAtRisk = [...cats].sort((a,b) => b.atRisk - a.atRisk)[0];
  const mostNotStarted = [...cats].sort((a,b) => b.notStarted - a.notStarted)[0];

  const highestLeverage = state.goals
    .filter(g => (g.next30||"").trim() || g.status === "At Risk")
    .sort((a,b) => (b.status === "At Risk") - (a.status === "At Risk") || prioritySortValue(a) - prioritySortValue(b))[0];

  return `TODD'S STRATEGIC BRIEF

What changed:
- You currently have ${stats.total} goals, with ${stats.active} active and ${stats.complete} completed.
- ${onTrack.length} goals are On Track, ${atRisk.length} are At Risk, ${completed.length} are Completed, and ${notStarted.length} are Not Started.
- Most recent updates: ${recent.map(g => g.title).join("; ") || "No recent updates yet."}

Biggest opportunity:
- ${noNext30.length ? noNext30.length + " goal(s) still need a concrete Next 30+/- Days action." : "Every goal has a Next 30+/- Days action."}
- Turn one high-priority intention into a scheduled next move.

Biggest risk:
- ${mostAtRisk && mostAtRisk.atRisk ? mostAtRisk.cat + " has the most At Risk goals (" + mostAtRisk.atRisk + ")." : "No category currently has an At Risk goal."}
- ${atRisk.length ? atRisk.length + " goal(s) are marked At Risk." : "No goals are currently marked At Risk."}

Most neglected category:
- ${mostNotStarted && mostNotStarted.notStarted ? mostNotStarted.cat + " has the most goals that have not started (" + mostNotStarted.notStarted + ")." : "No category is clearly neglected based on status."}

Highest leverage action:
- ${highestLeverage ? "Focus on: " + highestLeverage.title : "Pick one goal and define a concrete next 30-day action."}

Top 3 actions this week:
1. Add or update Next 30+/- Days for ${noNext30.length ? "one of the " + noNext30.length + " goals missing it" : "your highest-priority goal"}.
2. Add Resources to ${noResources.length} goal(s) missing execution support.
3. Move one Not Started goal either into action or consciously defer it.

One thing to stop doing:
- Stop letting goals remain only aspirational. Every active goal should have a next 30-day move, resources attached, or a conscious decision to defer it.`;
}

function strategicBriefHtml() {
  return `<section class="panel">
    <p>A concise operating brief based on your current goals, statuses, priorities, and next actions.</p>
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

function actionKeyFor(goalId, field, lineText) {
  return actionHash(goalId + "|" + field + "|" + cleanActionLine(lineText));
}

function actionMetaKey(goalId, field, lineText, suffix) {
  return `action_${field}_${actionKeyFor(goalId, field, lineText)}_${suffix}`;
}

function actionIndexMetaKey(field, index, suffix) {
  return `action_${field}_idx_${index}_${suffix}`;
}

function actionMetaValue(goal, field, lineText, index, suffix) {
  const meta = parseGoalMeta(goal);
  const textKey = actionMetaKey(goal.id, field, lineText, suffix);
  const idxKey = actionIndexMetaKey(field, index, suffix);
  return meta[textKey] || meta[idxKey] || "";
}

function actionTimeValue(goal, field, lineText, index = 0) {
  return actionMetaValue(goal, field, lineText, index, "time");
}

const actionStatusOptions = [
  ["Me", "Active"],
  ["Scheduled", "Scheduled"],
  ["Waiting", "Waiting"],
  ["Delegated", "Delegated"]
];

function actionStatusLabel(value) {
  return actionStatusOptions.find(([storedValue]) => storedValue === value)?.[1] || "Active";
}

function actionOwnerValue(goal, field, lineText, index = 0) {
  return actionMetaValue(goal, field, lineText, index, "owner") || "Me";
}

function actionDoNextValue(goal, field, lineText, index = 0) {
  return actionMetaValue(goal, field, lineText, index, "do_next") === "1";
}

function actionNotesValue(goal, field, lineText, index = 0) {
  return actionMetaValue(goal, field, lineText, index, "notes");
}

function updateWorkplanActionTime(goalId, field, actionKey, index, value) {
  updateActionMeta(goalId, field, actionKey, index, "time", value);
  render();
}

function updateWorkplanActionStatus(goalId, field, actionKey, index, value) {
  const goal = state.goals.find(item => item.id === goalId);
  if (!goal) return;
  const meta = parseGoalMeta(goal);
  const ownerTextKey = `action_${field}_${actionKey}_owner`;
  const ownerIndexKey = `action_${field}_idx_${index}_owner`;
  meta[ownerTextKey] = value;
  meta[ownerIndexKey] = value;

  if (value !== "Me") {
    meta[`action_${field}_${actionKey}_do_next`] = "";
    meta[`action_${field}_idx_${index}_do_next`] = "";
  }

  storeGoalMeta(goalId, meta, "Status updated");
  const focusedCount = workplanActionItems().filter(item => item.owner === "Me" && item.doNext).length;
  if (doNextFocusOnly && focusedCount === 0) doNextFocusOnly = false;
  render();
}

function handleWorkplanActionKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    event.currentTarget.value = event.currentTarget.dataset.original || "";
    event.currentTarget.blur();
  }
}

async function saveWorkplanActionText(goalId, field, actionKey, index, value, input) {
  const goal = state.goals.find(item => item.id === goalId);
  if (!goal || input?.dataset.saving === "true") return;
  const lines = String(goal[field] || "").split(/\n+/);
  let lineIndex = index;
  if (!lines[lineIndex] || actionKeyFor(goalId, field, cleanActionLine(lines[lineIndex])) !== actionKey) {
    lineIndex = lines.findIndex(line => actionKeyFor(goalId, field, cleanActionLine(line)) === actionKey);
  }
  if (lineIndex < 0) return render();

  const previousText = cleanActionLine(lines[lineIndex]);
  const nextAction = cleanActionLine(value);
  if (!nextAction) {
    if (input) input.value = previousText;
    return;
  }
  if (nextAction === previousText) return;
  const duplicate = actionLines(goal, field).some(item => item.index !== lineIndex && item.text.toLowerCase() === nextAction.toLowerCase());
  if (duplicate) {
    if (input) input.value = previousText;
    return alert("That action is already listed for this goal.");
  }

  if (input) input.dataset.saving = "true";
  const originalLine = lines[lineIndex];
  const prefix = originalLine.match(/^(\s*(?:[•\-*]|\d+[.)])\s*)/)?.[1] || "• ";
  lines[lineIndex] = `${prefix}${nextAction}`;
  const nextText = lines.join("\n").trim();
  const updatedAt = new Date().toISOString();
  const { error } = await supabaseClient.from("goals").update({ [field]: nextText, updated_at: updatedAt }).eq("id", goalId);
  if (error) {
    if (input) {
      input.dataset.saving = "false";
      input.value = previousText;
    }
    showSaved("Save error");
    return alert("Could not update action: " + error.message);
  }

  goal[field] = nextText;
  goal.updated_at = updatedAt;
  const meta = parseGoalMeta(goal);
  const nextKey = actionKeyFor(goalId, field, nextAction);
  ["time", "owner", "do_next", "notes"].forEach(suffix => {
    const oldTextKey = `action_${field}_${actionKey}_${suffix}`;
    const newTextKey = `action_${field}_${nextKey}_${suffix}`;
    const indexKey = `action_${field}_idx_${lineIndex}_${suffix}`;
    const existingValue = meta[oldTextKey] || meta[indexKey] || "";
    if (existingValue) meta[newTextKey] = existingValue;
    if (oldTextKey !== newTextKey) delete meta[oldTextKey];
  });
  storeGoalMeta(goalId, meta, "Action updated");
  render();
}

function actionMinutes(goal, field, lineText, index = 0) {
  return optionMinutes(actionTimeValue(goal, field, lineText, index));
}

function actionTimeSelect(goal, field, item) {
  const actionKey = actionKeyFor(goal.id, field, item.text);
  const current = actionTimeValue(goal, field, item.text, item.index);
  return `<select class="status-select action-mini-select" onclick="event.stopPropagation()" onchange="updateActionMeta('${goal.id}','${field}','${actionKey}',${item.index},'time',this.value)">
    ${timeOptions.map(([v,label]) => `<option value="${v}" ${current===v ? "selected" : ""}>${label}</option>`).join("")}
  </select>`;
}

function actionOwnerSelect(goal, field, item) {
  const actionKey = actionKeyFor(goal.id, field, item.text);
  const current = actionOwnerValue(goal, field, item.text, item.index);
  return `<select class="status-select action-mini-select" onclick="event.stopPropagation()" onchange="updateActionMeta('${goal.id}','${field}','${actionKey}',${item.index},'owner',this.value)">
    ${actionStatusOptions.map(([value,label]) => `<option value="${value}" ${current===value ? "selected" : ""}>${label}</option>`).join("")}
  </select>`;
}

function actionMetadataEditorHtml(goal, field, label) {
  const items = actionLines(goal, field);
  if (!items.length) {
    return `<div class="action-meta-panel empty"><span>Add bullets above to set time and status for each action.</span></div>`;
  }
  return `<div class="action-meta-panel">
    <div class="action-meta-title">${label} action details</div>
    ${items.map(item => {
      const actionKey = actionKeyFor(goal.id, field, item.text);
      return `<div class="action-meta-row">
        <label class="action-meta-check-wrap" title="Complete and move to Wins">
          <input type="checkbox" class="action-meta-check" onchange="completeWorkplanAction('${goal.id}','${field}','${actionKey}')" />
        </label>
        <div class="action-meta-text">${escapeHtml(item.text)}</div>
        <div class="action-meta-controls">
          ${actionTimeSelect(goal, field, item)}
          ${actionOwnerSelect(goal, field, item)}
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

function workplanActionItems() {
  const fields = ["today_this_week"];
  return state.goals
    .filter(goal => !isCompletedGoal(goal) && !isArchivedGoal(goal))
    .flatMap(goal => fields.flatMap(field => actionLines(goal, field).map(item => {
      const timeValue = actionTimeValue(goal, field, item.text, item.index) || "";
      const minutes = optionMinutes(timeValue);
      const owner = actionOwnerValue(goal, field, item.text, item.index);
      const feeling = metaValue(goal, "feeling_completed") || "—";
      const doNext = owner === "Me" && actionDoNextValue(goal, field, item.text, item.index);
      const notes = actionNotesValue(goal, field, item.text, item.index);
      return {
        goal,
        goalId: goal.id,
        actionKey: actionKeyFor(goal.id, field, item.text),
        field,
        fieldLabel: "Today / This Week",
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
        rating: goal.status || "Not Started",
        feeling,
        doNext,
        notes
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

function recommendedFirstAction(items) {
  return items.find(i => i.owner === "Me" && i.field === "today_this_week" && i.minutes && i.minutes < 9999) ||
    items.find(i => i.owner === "Me" && i.minutes && i.minutes < 9999) ||
    items.find(i => !["Waiting", "Delegated"].includes(i.owner) && i.minutes && i.minutes < 9999) ||
    items.find(i => !["Waiting", "Delegated"].includes(i.owner)) ||
    items[0] || null;
}

function workplanFocusText(items, totals) {
  if (!items.length) return "Add actions inside Today / This Week. Workplan will organize them automatically.";
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
  const matchIndex = lines.findIndex(line => actionKeyFor(goalId, field, cleanActionLine(line)) === actionKey);
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
    <span class="${ownerClass}">${escapeHtml(actionStatusLabel(item.owner))}</span>
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
  if (!items.length) return `<div class="recent-item"><strong>No actions yet.</strong><small>Add bullets inside Today / This Week.</small></div>`;
  return items.map(i => actionQueueRow(i, { compact: true })).join("");
}

function waitingListHtml(items) {
  const waiting = items.filter(i => i.owner === "Waiting");
  if (!waiting.length) return `<div class="recent-item"><strong>Nothing waiting.</strong><small>No Today / This Week actions are marked Waiting.</small></div>`;
  return waiting.map(i => `<div class="mini-action-row clickable-card" onclick="openGoal('${i.goalId}')">
    <span>${escapeHtml(i.action)}<small>Waiting • ${escapeHtml(i.title)}</small></span><b>${escapeHtml(i.timeLabel)}</b>
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


function toggleDoNext(goalId, field, actionKey, index) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  const meta = parseGoalMeta(goal);
  const textKey = `action_${field}_${actionKey}_do_next`;
  const indexKey = `action_${field}_idx_${index}_do_next`;
  const isSelected = (meta[textKey] || meta[indexKey] || "") === "1";
  const selectedCount = workplanActionItems().filter(item => item.owner === "Me" && item.doNext).length;

  if (!isSelected && selectedCount >= 3) {
    alert("Choose no more than three Focus actions.");
    return;
  }

  const value = isSelected ? "" : "1";
  meta[textKey] = value;
  meta[indexKey] = value;
  storeGoalMeta(goalId, meta, isSelected ? "Removed from Focus" : "Added to Focus");
  const remainingFocused = workplanActionItems().filter(item =>
    item.owner === "Me" &&
    item.doNext &&
    (workplanCategory === "All" || item.category === workplanCategory)
  ).length;
  if (doNextFocusOnly && remainingFocused === 0) doNextFocusOnly = false;
  render();
}

function toggleDoNextFocus() {
  const selectedCount = workplanActionItems().filter(item => item.owner === "Me" && item.doNext).length;
  if (!doNextFocusOnly && selectedCount === 0) {
    alert("Select a Focus star first. You can choose up to three actions.");
    return;
  }
  doNextFocusOnly = !doNextFocusOnly;
  render();
}


function decisionTableRowHtml(item) {
  const categoryColor = categories[item.category]?.color || "#667085";
  return `<div class="decision-table-row clickable-card ${item.doNext ? "do-next-row" : ""}" style="--row-category:${categoryColor}" onclick="openGoal('${item.goalId}')">
    <div class="decision-action-cell ${item.owner === "Me" ? "with-do-next" : ""}">
      <input type="checkbox" class="action-check" onclick="event.stopPropagation()" onchange="completeWorkplanAction('${item.goalId}','${item.field}','${item.actionKey}')" title="Complete and move to Wins" />
      ${item.owner === "Me" ? `<button type="button" class="do-next-toggle ${item.doNext ? "active" : ""}" onclick="event.stopPropagation();toggleDoNext('${item.goalId}','${item.field}','${item.actionKey}',${item.lineIndex})" aria-pressed="${item.doNext ? "true" : "false"}" title="${item.doNext ? "Remove from Focus" : "Add to Focus"}">${item.doNext ? "★" : "☆"}</button>` : ""}
      <div class="decision-action-copy">
        <input class="decision-action-input" value="${escapeHtml(item.action)}" data-original="${escapeHtml(item.action)}" aria-label="Edit action" title="Click to edit this action" onclick="event.stopPropagation()" onkeydown="handleWorkplanActionKeydown(event)" onblur="saveWorkplanActionText('${item.goalId}','${item.field}','${item.actionKey}',${item.lineIndex},this.value,this)" />
        <small class="decision-action-context">
          <span>${escapeHtml(item.title)}</span>
          ${item.category ? `<span class="workplan-category-pill" style="--category-color:${categoryColor}">${escapeHtml(item.category)}</span>` : ""}
        </small>
      </div>
    </div>
    <div><span class="decision-pill decision-feeling-pill">${escapeHtml(item.feeling || "—")}</span></div>
    <div class="decision-priority-cell" title="${escapeHtml(item.priorityLabel)}"><span>${item.priorityRaw || "—"}</span></div>
    <div><select class="decision-time-select" aria-label="Time for ${escapeHtml(item.action)}" onclick="event.stopPropagation()" onchange="event.stopPropagation();updateWorkplanActionTime('${item.goalId}','${item.field}','${item.actionKey}',${item.lineIndex},this.value)">
      ${timeOptions.map(([value,label]) => `<option value="${value}" ${actionTimeValue(item.goal, item.field, item.action, item.lineIndex) === value ? "selected" : ""}>${label}</option>`).join("")}
    </select></div>
    <div><select class="decision-status-select" aria-label="Status for ${escapeHtml(item.action)}" onclick="event.stopPropagation()" onchange="event.stopPropagation();updateWorkplanActionStatus('${item.goalId}','${item.field}','${item.actionKey}',${item.lineIndex},this.value)">
      ${actionStatusOptions.map(([value,label]) => `<option value="${value}" ${item.owner === value ? "selected" : ""}>${label}</option>`).join("")}
    </select></div>
    <div><textarea class="decision-notes-input" rows="1" placeholder="Add note…" onclick="event.stopPropagation()" oninput="updateActionMeta('${item.goalId}','${item.field}','${item.actionKey}',${item.lineIndex},'notes',this.value)">${escapeHtml(item.notes || "")}</textarea></div>
  </div>`;
}


function setDecisionSort(key) {
  if (decisionSort.key === key) {
    decisionSort.dir = decisionSort.dir === "asc" ? "desc" : "asc";
  } else {
    decisionSort.key = key;
    decisionSort.dir = key === "time" ? "asc" : "desc";
    if (key === "priority") decisionSort.dir = "asc";
  }
  render();
}

function decisionSortValue(item, allItems, key) {
  if (key === "priority") return item.priority || 999;
  if (key === "time") return item.minutes || 9998;
  if (key === "owner") return ownerSortValue(item.owner);
  if (key === "feeling") return String(item.feeling || "").toLowerCase();
  if (key === "action") return String(item.action || "").toLowerCase();
  return item.priority || 999;
}

function sortedDecisionItems(items) {
  const key = decisionSort.key || "priority";
  const dir = decisionSort.dir || "asc";
  return [...items].sort((a,b) => {
    const doNextDifference = Number(Boolean(b.doNext)) - Number(Boolean(a.doNext));
    if (doNextDifference !== 0) return doNextDifference;
    const av = decisionSortValue(a, items, key);
    const bv = decisionSortValue(b, items, key);
    let cmp = 0;
    if (typeof av === "string" || typeof bv === "string") cmp = String(av).localeCompare(String(bv));
    else cmp = av - bv;
    if (dir === "desc") cmp = -cmp;
    if (cmp !== 0) return cmp;
    if ((a.priority || 999) !== (b.priority || 999)) return (a.priority || 999) - (b.priority || 999);
    const at = a.minutes || 9998;
    const bt = b.minutes || 9998;
    if (at !== bt) return at - bt;
    return String(a.action || "").localeCompare(String(b.action || ""));
  });
}

function decisionHeaderButton(label, key) {
  const active = decisionSort.key === key;
  const arrow = active ? (decisionSort.dir === "asc" ? "↑" : "↓") : "↕";
  return `<button class="${active ? "active" : ""}" onclick="setDecisionSort('${key}')" aria-label="Sort by ${label}">${label} <span class="decision-header-arrow">${arrow}</span></button>`;
}

function decisionTableHtml(items) {
  if (!items.length) return `<div class="recent-item"><strong>No actions yet.</strong><small>Add bullets inside Today / This Week.</small></div>`;
  const visibleItems = sortedDecisionItems(items);
  return `<div class="decision-table">
      <div class="decision-table-head">
        <span aria-hidden="true"></span>
        ${decisionHeaderButton("Feeling", "feeling")}
        ${decisionHeaderButton("Priority", "priority")}
        ${decisionHeaderButton("Time", "time")}
        ${decisionHeaderButton("Status", "owner")}
        <span class="decision-static-heading">Notes</span>
      </div>
      ${visibleItems.map(i => decisionTableRowHtml(i)).join("")}
    </div>`;
}


function workplanSectionHtml(title, items, intro = "") {
  return `<div class="workplan-card decision-table-card owner-workplan-section">
    <span class="workplan-eyebrow">${title} (${items.length})</span>
    ${intro ? `<p class="decision-table-intro">${intro}</p>` : ""}
    ${decisionTableHtml(items)}
  </div>`;
}

function myActionsSectionHtml(myItems, scheduledItems, focusOnly = false) {
  return `<div class="workplan-card decision-table-card owner-workplan-section my-actions-section">
    ${focusOnly && !myItems.length
      ? `<div class="recent-item"><strong>No Focus actions in this view.</strong><small>Show all actions, then select a star beside up to three actions.</small></div>`
      : decisionTableHtml(myItems)}
    ${!focusOnly && scheduledItems.length ? `
      <div class="delegated-inline-block scheduled-inline-block">
        <div class="delegated-inline-label">Scheduled (${scheduledItems.length})</div>
        ${decisionTableHtml(scheduledItems)}
      </div>` : ""}
  </div>`;
}

function workplanGoalOptionsHtml() {
  const activeGoals = state.goals.filter(goal =>
    !isCompletedGoal(goal) &&
    !isArchivedGoal(goal) &&
    priorityValue(goal) !== -1
  );

  return Object.keys(categories).map(category => {
    const goals = sortGoalsByCategoryPriority(activeGoals.filter(goal => goal.category === category));
    if (!goals.length) return "";
    return `<optgroup label="${escapeHtml(category)}">
      ${goals.map(goal => `<option value="${escapeHtml(goal.id)}">${escapeHtml(goal.title || "Untitled Goal")} — ${escapeHtml(priorityLabel(goal))}</option>`).join("")}
    </optgroup>`;
  }).join("");
}

function workplanQuickAddHtml() {
  const hasActiveGoals = state.goals.some(goal =>
    !isCompletedGoal(goal) &&
    !isArchivedGoal(goal) &&
    priorityValue(goal) !== -1
  );

  if (!hasActiveGoals) {
    return `<div class="workplan-add-empty">Add an active goal in the Workbook before creating an action.</div>`;
  }

  return `<div class="workplan-add-panel">
    <form class="workplan-add-form" onsubmit="addWorkplanAction(event)">
      <label class="workplan-action-input">Action
        <input name="action" type="text" required autocomplete="off" placeholder="What needs to happen?" />
      </label>
      <label>Goal
        <select name="goal_id" required>
          <option value="">Choose a goal</option>
          ${workplanGoalOptionsHtml()}
        </select>
      </label>
      <label>Time
        <select name="time">
          ${timeOptions.map(([value,label]) => `<option value="${value}">${label}</option>`).join("")}
        </select>
      </label>
      <label>Status
        <select name="owner">
          ${actionStatusOptions.map(([value,label]) => `<option value="${value}" ${value === "Me" ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
      <button type="submit">Add</button>
    </form>
  </div>`;
}

function toggleWorkplanAdd() {
  showWorkplanAdd = !showWorkplanAdd;
  render();
  if (showWorkplanAdd) {
    requestAnimationFrame(() => document.querySelector(".workplan-add-form input[name='action']")?.focus());
  }
}

async function addWorkplanAction(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const action = cleanActionLine(form.elements.action.value);
  const goalId = form.elements.goal_id.value;
  const time = form.elements.time.value;
  const owner = form.elements.owner.value || "Me";
  const goal = state.goals.find(item => item.id === goalId);
  if (!action || !goal) return;

  const field = "today_this_week";
  const existingActions = actionLines(goal, field);
  if (existingActions.some(item => item.text.toLowerCase() === action.toLowerCase())) {
    alert("That action is already listed for this goal.");
    return;
  }

  const existingText = String(goal[field] || "").trim();
  const nextText = existingText ? `${existingText}\n• ${action}` : `• ${action}`;
  const updatedAt = new Date().toISOString();
  const { error } = await supabaseClient.from("goals").update({ [field]: nextText, updated_at: updatedAt }).eq("id", goalId);
  if (error) {
    alert("Could not add action: " + error.message);
    return;
  }

  goal[field] = nextText;
  goal.updated_at = updatedAt;
  const newIndex = actionLines(goal, field).length - 1;
  const actionKey = actionKeyFor(goalId, field, action);
  const meta = parseGoalMeta(goal);
  meta[`action_${field}_${actionKey}_time`] = time;
  meta[`action_${field}_${actionKey}_owner`] = owner;
  meta[`action_${field}_idx_${newIndex}_time`] = time;
  meta[`action_${field}_idx_${newIndex}_owner`] = owner;
  storeGoalMeta(goalId, meta, "Action added");

  if (workplanCategory !== "All" && workplanCategory !== goal.category) workplanCategory = goal.category;
  doNextFocusOnly = false;
  showWorkplanAdd = false;
  render();
}

function setWorkplanCategory(category) {
  if (category !== "All" && !categories[category]) return;
  workplanCategory = workplanCategory === category ? "All" : category;
  render();
}

function workplanCategoryFiltersHtml(items) {
  return `<div class="workplan-controls">
    <div class="workplan-category-filters workplan-toolbar" aria-label="Workplan controls">
      <button type="button" class="workplan-toolbar-add ${showWorkplanAdd ? "active" : ""}" onclick="toggleWorkplanAdd()" aria-expanded="${showWorkplanAdd ? "true" : "false"}">+ Action</button>
      <button type="button" class="workplan-toolbar-do-next ${doNextFocusOnly ? "active" : ""}" onclick="toggleDoNextFocus()" aria-pressed="${doNextFocusOnly ? "true" : "false"}" title="${doNextFocusOnly ? "Show all actions" : "Show only Focus actions"}">+ Focus</button>
    </div>
    ${showWorkplanAdd ? workplanQuickAddHtml() : ""}
  </div>`;
}

function workplanHtml() {
  const allItems = workplanActionItems();
  const categoryItems = workplanCategory === "All" ? allItems : allItems.filter(item => item.category === workplanCategory);
  const items = doNextFocusOnly ? categoryItems.filter(item => item.owner === "Me" && item.doNext) : categoryItems;
  const myItems = items.filter(i => i.owner === "Me");
  const delegatedItems = items.filter(i => i.owner === "Delegated");
  const waitingItems = items.filter(i => i.owner === "Waiting");
  const scheduledItems = items.filter(i => i.owner === "Scheduled");
  const allCompleted = completedTodayItems();
  const completed = workplanCategory === "All" ? allCompleted : allCompleted.filter(item => item.category === workplanCategory);

  return `<section class="workplan-page action-plan-page single-source-workplan decision-view-page decision-table-page owner-based-workplan-page cleaner-workplan-page">
    ${workplanCategoryFiltersHtml(allItems)}
    ${myActionsSectionHtml(myItems, scheduledItems, doNextFocusOnly)}

    ${doNextFocusOnly ? "" : `<div class="workplan-card decision-table-card waiting-card-focused">
      <span class="workplan-eyebrow">Waiting (${waitingItems.length})</span>
      ${waitingItems.length
        ? decisionTableHtml(waitingItems)
        : `<div class="recent-item"><strong>Nothing waiting.</strong><small>Actions moved to Waiting will collect here.</small></div>`}
    </div>`}

    ${doNextFocusOnly ? "" : `<div class="workplan-card decision-table-card delegated-card-focused">
      <span class="workplan-eyebrow">Delegated (${delegatedItems.length})</span>
      ${delegatedItems.length
        ? decisionTableHtml(delegatedItems)
        : `<div class="recent-item"><strong>Nothing delegated.</strong><small>Actions assigned to someone else will collect here.</small></div>`}
    </div>`}

    ${doNextFocusOnly ? "" : `<div class="workplan-card completed-card">
      <span class="workplan-eyebrow">Completed Today</span>
      ${completedTodayHtml(completed)}
    </div>`}
  </section>`;
}

function todayThisWeekHtml() {
  return workplanHtml();
}





function statusCardHtml(stats) {
  return statusRibbonHtml(stats);
}

function mainNavCardHtml() {
  const primaryViews = [
    ["Workplan", "Workplan"],
    ["Priority Stack", "Priority Stack"],
    ["Achievements", "Achievements"]
  ];
  const moreViews = [
    ["Resources", "Resources"],
    ["Life Seasons", "Life Seasons"],
    ["Weekly Review", "Weekly Review"],
    ["Strategic Brief", "Strategic Brief"],
    ["Coach", "Coach"]
  ];
  const moreIsActive = moreViews.some(([view]) => activeView === view);
  return `<aside class="nav-box dashboard-box">
    <div class="box-title">Dashboard</div>
    <div class="button-wrap">
      ${primaryViews.map(([v,label]) => `<button onclick="setMainView('${v}')" class="${activeView===v ? "active" : ""}">${label}</button>`).join("")}
      <details class="dashboard-more">
        <summary class="${moreIsActive ? "active" : ""}">More</summary>
        <div class="dashboard-more-menu">
          ${moreViews.map(([v,label]) => `<button onclick="setMainView('${v}')" class="${activeView===v ? "active" : ""}">${label}</button>`).join("")}
        </div>
      </details>
    </div>
  </aside>`;
}

function workbookCardHtml() {
  return `<aside class="nav-box workbook-box">
    <div class="box-title">Workbook ${next30ReviewBadgeHtml()}</div>
    <div class="button-wrap">
      <button onclick="setWorkbookView('All')" class="${activeView==='Workbook' && activeCategory==='All' ? 'active' : ''}">All</button>
      ${Object.keys(categories).map(cat => `<button onclick="setWorkbookView('${cat}')" class="${activeView==='Workbook' && activeCategory===cat ? 'active' : ''}" style="${activeView==='Workbook' && activeCategory===cat ? `background:${categories[cat].color};color:#fff;border-color:${categories[cat].color}` : `color:${categories[cat].color}`}">${cat}</button>`).join("")}
    </div>
  </aside>`;
}

function viewTitleHtml() {
  if (activeView === "Workbook") return "";

  if (activeView === "Workplan") {
    const workplanItems = workplanActionItems();
    const visibleWorkplanItems = workplanCategory === "All"
      ? workplanItems
      : workplanItems.filter(item => item.category === workplanCategory);
    const delegatedCount = visibleWorkplanItems.filter(item => item.owner === "Delegated").length;
    const waitingCount = visibleWorkplanItems.filter(item => item.owner === "Waiting").length;
    const todayCount = visibleWorkplanItems.length - delegatedCount - waitingCount;
    return `<section class="view-title workplan-view-title">
      <div class="workplan-title-stack">
        <h2>This Moment's Decisions (${visibleWorkplanItems.length})</h2>
        <div class="workplan-title-breakdown" aria-label="Workplan status counts">
          <span>Active <strong>${todayCount}</strong></span>
          <span>Waiting <strong>${waitingCount}</strong></span>
          <span>Delegated <strong>${delegatedCount}</strong></span>
        </div>
      </div>
    </section>`;
  }

  const titles = {
    "Priority Stack": "Priority Stack",
    "Achievements": "Achievements",
    "Resources": "Resources",
    "Life Seasons": "Life Seasons",
    "Weekly Review": "Weekly Review",
    "Strategic Brief": "Strategic Brief",
    "Coach": "Coach"
  };

  return `<section class="view-title ${activeView === "Workplan" ? "workplan-view-title" : ""}"><h2>${titles[activeView] || activeCategory || activeView}</h2></section>`;
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

  const projectStarted = projects.filter(g => !["Not Started", "", null, undefined].includes(g.status)).length;
  const projectDone = projects.filter(g => g.status === "Completed").length;

  const behaviorStarted = behaviors.filter(g => !["Not Started", "", null, undefined].includes(g.status)).length;
  const behaviorDone = behaviors.filter(g => g.status === "Completed").length;

  return `<section class="status-ribbon">
    <span class="status-ribbon-title">Status</span>
    <span><b>Projects</b> ${projectStarted}/${projects.length} started • ${projectDone} done</span>
    <span><b>Behaviors</b> ${behaviorStarted}/${behaviors.length} started • ${behaviorDone} done</span>
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

function jumpToTopNavigation(selector = ".nav-workbook-row") {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const target = document.querySelector(selector) || document.querySelector(".nav-workbook-row") || document.querySelector(".app-header-simple");
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
  activeCategory = "All";
  showAdd = false;
  render();
  jumpToSelectedContent();
}

function openDashboardTop() {
  activeView = "Workplan";
  render();
  jumpToSelectedContent();
}

function setMainView(view) {
  activeView = view;
  render();
  jumpToSelectedContent();
}

function setWorkbookView(category) {
  activeView = "Workbook";
  activeCategory = category;
  showAdd = false;
  render();
  jumpToSelectedContent();
}


function enterFromPossibility() {
  possibilityStage = 1;
  possibilityAdvancing = false;
  renderPauseEntry();
}

function possibilityConfig() {
  if (possibilityStage === 1) return { key: "belief", prompt: "What do you Believe?", action: "Next" };
  if (possibilityStage === 2) return { key: "boundaries", prompt: "What are my Boundaries?", action: "Next" };
  return { key: "gratitude", prompt: "What are you Grateful for?", action: "Continue" };
}

function updatePossibilityAnswer(value) {
  const config = possibilityConfig();
  possibilityAnswers[config.key] = value;
  const button = document.getElementById("possibilityNext");
  if (button) button.disabled = !value.trim();
}

function handlePossibilityKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  updatePossibilityAnswer(event.currentTarget.value);
  if (event.currentTarget.value.trim()) advancePossibility();
}

function advancePossibility() {
  const config = possibilityConfig();
  if (possibilityAdvancing || !possibilityAnswers[config.key].trim()) return;
  possibilityAdvancing = true;
  const panel = document.querySelector(".possibility-prompt-panel");
  if (panel) panel.classList.add("is-leaving");
  window.setTimeout(() => {
    if (possibilityStage < 3) {
      possibilityStage += 1;
      possibilityAdvancing = false;
      renderPauseEntry();
      return;
    }
    try {
      localStorage.setItem("myLifeVisionPossibility", JSON.stringify({
        date: new Date().toISOString(),
        ...possibilityAnswers
      }));
    } catch (error) {
      console.warn("Could not save possibility responses locally", error);
    }
    showPauseEntry = false;
    activeView = "Workplan";
    render();
  }, 360);
}

function openingPaletteHtml() {
  return `<style>
    .pause-entry-image-page .pause-entry-action,
    .pause-entry-image-page .possibility-prompt-panel button {
      background: linear-gradient(125deg, rgba(58, 17, 111, 0.97) 0%, rgba(24, 58, 123, 0.97) 64%, rgba(164, 105, 20, 0.94) 100%) !important;
      border-color: rgba(239, 210, 154, 0.66) !important;
      color: #fffdf8 !important;
      box-shadow: 0 12px 30px rgba(51, 58, 125, 0.20), inset 0 1px 0 rgba(255,255,255,0.20) !important;
    }
    .pause-entry-image-page .pause-entry-action {
      opacity: 0.96 !important;
    }
    .pause-entry-image-page:hover .pause-entry-action {
      opacity: 1 !important;
    }
    .pause-entry-image-page .pause-entry-action:hover,
    .pause-entry-image-page .pause-entry-action:focus,
    .pause-entry-image-page .pause-entry-action:focus-visible,
    .pause-entry-image-page .possibility-prompt-panel button:hover:not(:disabled),
    .pause-entry-image-page .possibility-prompt-panel button:focus-visible:not(:disabled) {
      background: linear-gradient(125deg, #451887 0%, #234b96 64%, #b77c24 100%) !important;
      color: #fffdf8 !important;
    }
    .pause-entry-image-page .possibility-prompt-panel textarea {
      color: #d8d2c4 !important;
      -webkit-text-fill-color: #d8d2c4 !important;
      caret-color: #d8d2c4 !important;
      font-family: "Fraunces MLV", Georgia, "Times New Roman", serif !important;
      font-weight: 500 !important;
      text-shadow:
        0 1px 1px rgba(25,24,24,.48),
        0 3px 14px rgba(25,24,24,.42) !important;
    }
    .pause-entry-image-page .possibility-prompt-panel label {
      color: #d8d2c4 !important;
      font-family: "Fraunces MLV", Georgia, "Times New Roman", serif !important;
      font-weight: 500 !important;
      text-shadow: 0 3px 16px rgba(25,24,24,.62) !important;
    }
  </style>`;
}

function syncOpeningViewportHeight() {
  const viewportHeight = Math.round(window.visualViewport?.height || window.innerHeight || 0);
  if (viewportHeight > 0) {
    document.documentElement.style.setProperty("--opening-viewport-height", `${viewportHeight}px`);
  }
}

window.addEventListener("resize", syncOpeningViewportHeight, { passive: true });
window.addEventListener("orientationchange", syncOpeningViewportHeight, { passive: true });
window.visualViewport?.addEventListener("resize", syncOpeningViewportHeight, { passive: true });

function renderPauseEntry() {
  syncOpeningViewportHeight();
  if (possibilityStage === 0) {
    document.getElementById("app").innerHTML = `
      <div class="pause-entry-page pause-entry-image-page">
        ${openingPaletteHtml()}
        <main class="pause-entry-main" aria-label="Pause entry">
          <h1 class="sr-only">Pause.</h1>
        </main>
        <button class="pause-word-action" type="button" onclick="enterFromPossibility()" aria-label="Create from Possibility">
          <span class="pause-word-default" aria-hidden="true">Pause.</span>
          <span class="pause-word-invitation" aria-hidden="true">Create from Possibility</span>
        </button>
      </div>`;
    return;
  }

  const config = possibilityConfig();
  const answer = possibilityAnswers[config.key] || "";
  document.getElementById("app").innerHTML = `
    <div class="pause-entry-page pause-entry-image-page possibility-entry-page">
      ${openingPaletteHtml()}
      <main class="possibility-prompt-panel" aria-label="${config.prompt}">
        <label for="possibilityAnswer">${config.prompt}</label>
        <textarea id="possibilityAnswer" autofocus enterkeyhint="${possibilityStage < 3 ? "next" : "done"}" aria-label="${config.prompt}. Press Return to continue." oninput="updatePossibilityAnswer(this.value)" onkeydown="handlePossibilityKeydown(event)">${escapeHtml(answer)}</textarea>
      </main>
    </div>`;
  requestAnimationFrame(() => document.getElementById("possibilityAnswer")?.focus());
}

function render() {
  if (showPauseEntry) return renderPauseEntry();
  const stats = completionStats();
  const navCats = "";
  const viewButtons = "";
  const grouped = Object.keys(categories).map(cat => {
    const goals = sortGoalsByCategoryPriority(filteredGoals().filter(g => g.category === cat));
    if (!goals.length) return "";
    return `<h3 class="category-title" style="color:${categories[cat].color}">${cat}</h3>${goals.map(goalCard).join("")}`;
  }).join("");
  let main = activeView === "Today / This Week" ? workplanHtml() : activeView === "Weekly Review" ? weeklyReviewHtml() : activeView === "Strategic Brief" ? strategicBriefHtml() : activeView === "Priority Stack" ? priorityStackHtml(false) : activeView === "Achievements" ? achievementsHtml() : activeView === "Resources" ? resourcesHtml() : activeView === "Workplan" ? workplanHtml() : activeView === "Life Seasons" ? lifeSeasonsHtml() : activeView === "Reviews" ? reviewsHtml() : activeView === "Coach" ? aiCoachHtml() : `${showAdd ? addForm() : ""}${grouped}`;
  document.getElementById("app").innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand-row"><div class="brand"><h1>My Life Vision</h1><p>Strategic Life OS</p></div></div>${utilityMenuHtml()}</aside><main class="content ${activeView==='Workbook' ? 'workbook-page' : ''}">
        <header class="app-header-simple">
          ${utilityMenuHtml()}
          <div class="brand-main">
            <h1>My Life Vision</h1>
            <p>Strategic Life OS</p>
          </div>
        </header>


        <div class="global-top-nav" aria-label="Quick top navigation">
          <button onclick="openDashboardTop()">Dashboard</button>
          <button onclick="openWorkbookTop()">Workbook ${next30ReviewBadgeHtml()}</button>
          <span class="global-nav-divider" aria-hidden="true"></span>
          <button class="capture-nav-button" onclick="toggleCapturePanel()" aria-expanded="${showCapturePanel ? "true" : "false"}">+ Capture</button>
        </div>

        ${capturePanelHtml()}

        ${next30ReviewBannerHtml()}

        <div class="nav-workbook-row">
          ${mainNavCardHtml()}
          ${workbookCardHtml()}
        </div>

        <div class="content-start"></div>
        ${viewTitleHtml()}
        ${main}
        ${next30ReviewPanelHtml()}
      </main></div>`;
}
function escapeHtml(text) {
  return String(text || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
init().catch(error => {
  console.error("My Life Vision failed to start", error);
  renderStartupError("Your content is still safe, but the app hit a startup error. Refresh the page and try again.");
});
