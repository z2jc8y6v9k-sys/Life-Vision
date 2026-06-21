
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
  const row = { user_id: state.user.id, category, title, why: "", people: "", money: "", next30: "", next12: "", progress: 0, ages: [], status: "Not Started", objective:"", key_results:"", today_this_week:"", behavior_standard:"", goal_type:"Project", behavior_rating:"Needs Improvement", friction:"", resources:"" };
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

function fieldCard(goal, key, label, className = "") {
  const color = categories[goal.category].color;
  return `<div class="field-card ${className}"><div class="field-header" style="background:${color}">${label}</div><textarea class="field-body ${className === "full" ? "large" : ""}" style="color:${color}" oninput="updateGoalNoRender('${goal.id}', '${key}', this.value)">${escapeHtml(goal[key] || "")}</textarea></div>`;
}

function goalType(goal) {
  return goal?.goal_type || "Project";
}

function progressLabelFor(goal) {
  return goalType(goal) === "Behavior" ? "Consistency" : "Completion";
}

function objectiveLabelFor(goal) {
  return goalType(goal) === "Behavior" ? "Behavior Standard" : "Objective";
}

function keyResultsLabelFor(goal) {
  return goalType(goal) === "Behavior" ? "How I’ll Know I’m Living It" : "Key Results";
}

function goalCard(goal) {
  const color = categories[goal.category].color;
  const type = goalType(goal);
  const progressLabel = progressLabelFor(goal);

  return `<article class="goal-card">
    <div class="goal-top">
      <span class="category-pill" style="background:${color}">${goal.category}</span>
      <textarea class="goal-title" style="color:${color}" oninput="updateGoalNoRender('${goal.id}', 'title', this.value)">${escapeHtml(goal.title)}</textarea>
    </div>

    <div class="grid-two">
      <label>Type<br>
        <select class="status-select" onchange="updateGoalNoRender('${goal.id}','goal_type',this.value); setTimeout(render, 300);">
          <option ${type==="Project"?"selected":""}>Project</option>
          <option ${type==="Behavior"?"selected":""}>Behavior</option>
        </select>
      </label>
      ${type === "Behavior" ? `
        <label>Behavior Rating<br>
          <select class="status-select behavior-rating" onchange="updateGoalNoRender('${goal.id}','behavior_rating',this.value)">
            ${behaviorRatings.map(r=>`<option ${(goal.behavior_rating||"Needs Improvement")===r?"selected":""}>${r}</option>`).join("")}
          </select>
        </label>
      ` : `
        <label>Status<br>
          <select class="status-select" onchange="updateGoalNoRender('${goal.id}','status',this.value)">
            ${statuses.map(s=>`<option ${(goal.status||"Not Started")===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </label>
      `}
    </div>

    <div class="grid-two">
      ${fieldCard(goal, "objective", objectiveLabelFor(goal))}
      ${fieldCard(goal, "key_results", keyResultsLabelFor(goal))}
    </div>

    ${fieldCard(goal, "why", "Why This Matters", "full")}

    <div class="timeline-label">Time Horizon</div>
    <div class="timeline">${ageBands.map(age => `<label class="age-chip"><input type="checkbox" ${goal.ages?.includes(age) ? "checked" : ""} onchange="toggleAge('${goal.id}', '${age}')" />${age}</label>`).join("")}</div>

    <div class="grid-two">
      ${fieldCard(goal, "people", "People")}
      ${fieldCard(goal, "money", "Resources")}
    </div>

    <div class="grid-two">
      ${fieldCard(goal, "today_this_week", "Today / This Week")}
      ${fieldCard(goal, "next30", "Next 30 Days")}
    </div>

    ${fieldCard(goal, "next12", "Next 12 Months", "full")}

    ${type === "Behavior" ? fieldCard(goal, "behavior_standard", "Behavior Rhythm / Standard", "full") : ""}

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
      behavior_rating: g.behavior_rating,
      why: g.why,
      people: g.people,
      resources: g.money,
      next30: g.next30,
      next12: g.next12,
      objective: g.objective,
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
    <p>Use this once a week to decide what deserves attention now.</p>
    <div class="review-grid">
      <div class="review-card">
        <div class="field-header" style="background:#111827">Wins</div>
        <textarea placeholder="What worked this week? What gave you energy?" oninput="updateReview('weekly_wins', this.value)">${escapeHtml(state.reviews.weekly_wins || "")}</textarea>
      </div>
      <div class="review-card">
        <div class="field-header" style="background:#111827">Lessons</div>
        <textarea placeholder="What did you learn? What pattern do you notice?" oninput="updateReview('weekly_lessons', this.value)">${escapeHtml(state.reviews.weekly_lessons || "")}</textarea>
      </div>
      <div class="review-card">
        <div class="field-header" style="background:#111827">What Mattered Most</div>
        <textarea placeholder="What mattered most this week?" oninput="updateReview('weekly_mattered', this.value)">${escapeHtml(state.reviews.weekly_mattered || "")}</textarea>
      </div>
      <div class="review-card">
        <div class="field-header" style="background:#111827">What Drained Energy</div>
        <textarea placeholder="What drained energy or pulled you out of alignment?" oninput="updateReview('weekly_drained', this.value)">${escapeHtml(state.reviews.weekly_drained || "")}</textarea>
      </div>
      <div class="review-card">
        <div class="field-header" style="background:#111827">Top 3 Priorities Next Week</div>
        <textarea placeholder="1.
2.
3." oninput="updateReview('weekly_priorities', this.value)">${escapeHtml(state.reviews.weekly_priorities || "")}</textarea>
      </div>
      <div class="review-card">
        <div class="field-header" style="background:#111827">What To Stop Doing</div>
        <textarea placeholder="What should you stop doing, pause, or decline?" oninput="updateReview('weekly_stop', this.value)">${escapeHtml(state.reviews.weekly_stop || "")}</textarea>
      </div>
    </div>
  </section>`;
}


function statusCounts() {
  return {
    onTrack: state.goals.filter(g => (g.goal_type || "Project") === "Project" && g.status === "On Track").length,
    atRisk: state.goals.filter(g => (g.goal_type || "Project") === "Project" && g.status === "At Risk").length,
    completed: state.goals.filter(g => (g.goal_type || "Project") === "Project" && (g.status === "Completed" || Number(g.progress||0) >= 100)).length,
    notStarted: state.goals.filter(g => (g.status || "Not Started") === "Not Started" && Number(g.progress||0) === 0).length
  };
}

function statusDashboardHtml() {
  const s = statusCounts();
  return `<section class="stats">
    <div class="stat"><strong>${s.onTrack}</strong><span>Goals On Track</span></div>
    <div class="stat"><strong>${s.atRisk}</strong><span>Goals At Risk</span></div>
    <div class="stat"><strong>${s.completed}</strong><span>Goals Completed</span></div>
    <div class="stat"><strong>${s.notStarted}</strong><span>Goals Not Started</span></div>
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
  const needsImprovement = state.goals.filter(g => g.goal_type === "Behavior" && (g.behavior_rating || "Needs Improvement") === "Needs Improvement");
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

function render() {
  const stats = completionStats();
  const navCats = ["All", ...Object.keys(categories)].map(cat => {
    const color = cat === "All" ? "#111827" : categories[cat].color;
    return `<button class="nav-button ${activeCategory === cat && activeView==="Workbook" ? "active" : ""}" style="${activeCategory === cat && activeView==="Workbook" ? `background:${color}` : ""}" onclick="activeView='Workbook';activeCategory='${cat}';render();">${cat}</button>`;
  }).join("");
  const viewButtons = ["Dashboard","Weekly Review","Strategic Brief","Reviews","Vision Board","Coach"].map(v=>`<button class="nav-button ${activeView===v?"active":""}" style="${activeView===v?"background:#111827":""}" onclick="activeView='${v}';render();">${v}</button>`).join("");
  const grouped = Object.keys(categories).map(cat => {
    const goals = filteredGoals().filter(g => g.category === cat);
    if (!goals.length) return "";
    return `<h3 class="category-title" style="color:${categories[cat].color}">${cat}</h3>${goals.map(goalCard).join("")}`;
  }).join("");
  const dashboard = `${statusDashboardHtml()}<section class="dashboard-grid"><div class="panel"><h3>Progress by Category</h3><div>${categoryProgressHtml()}</div></div><div class="panel"><h3>Recently Updated</h3><div class="recent-list">${recentHtml()}</div></div></section>${metricsHtml()}${coachHtml()}`;
  let main = activeView === "Dashboard" ? dashboard : activeView === "Weekly Review" ? weeklyReviewHtml() : activeView === "Strategic Brief" ? strategicBriefHtml() : activeView === "Reviews" ? reviewsHtml() : activeView === "Vision Board" ? visionHtml() : activeView === "Coach" ? aiCoachHtml() : `${showAdd ? addForm() : ""}<section class="type-note"><strong>Project vs Behavior:</strong> Use Project for discrete outcomes with an endpoint. Use Behavior for ongoing ways of living; the slider becomes consistency, not completion.</section>${grouped}`;
  document.getElementById("app").innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand"><h1>My Life Vision</h1><p>Strategic Life OS | Ages 53–93</p></div>${viewButtons}<hr>${navCats}<button class="add-button" onclick="activeView='Workbook';showAdd=!showAdd;render();">${showAdd ? "Close Add Goal" : "+ Add Goal"}</button><button class="utility-button" onclick="exportData()">Export Backup</button><button class="utility-button" onclick="logout()">Sign Out</button><div id="saveStatus" class="save-status">Cloud Sync On</div><div class="user-box">Signed in as:<br>${escapeHtml(state.user.email || "")}</div></aside><main class="content"><section class="hero"><div><h2>Life Portfolio</h2><p>A cloud-synced personal operating system for goals, people, money, next actions, scorecards, reviews, vision, and coaching.</p></div><div class="hero-badge"><strong>${stats.avg}%</strong><span>Average progress across ${stats.total} goals</span></div></section><section class="stats"><div class="stat"><strong id="statTotal">${stats.total}</strong><span>Total goals</span></div><div class="stat"><strong id="statAvg">${stats.avg}%</strong><span>Average progress</span></div><div class="stat"><strong id="statActive">${stats.active}</strong><span>Goals started</span></div><div class="stat"><strong id="statComplete">${stats.complete}</strong><span>Completed</span></div></section>${main}</main></div>`;
}
function escapeHtml(text) {
  return String(text || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
init();
