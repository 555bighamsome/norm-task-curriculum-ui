/* UI layer over solver-generated tasks: tabs, board animation, rule builder, logs. */

let CELL = 38;
let curIndex = 0;
let scn = TASKS[curIndex];
let rules = [];
const sceneRuleDrafts = new Map();
let library = [];
let robotEls = {};
let timer = null;
let runs = [];
let lastResult = null;
let lastFrames = [];
let frameIndex = 0;
let experimentStartedAt = Date.now();
let trialStartedAt = experimentStartedAt;
let lastAttemptAt = experimentStartedAt;
let ruleEvents = [];
let lastRuleEventIndex = 0;
let nextRuleId = 1;
let rulebookRevision = 0;
const sceneGuidesSeen = new Set();
const guideFeatureCatalog = new Map();
let initialSceneChosen = false;
const shiftStates = Object.fromEntries(TASKS.map(task => [
  task.id,
  { visited:false, lastOk:null, testedRevision:null, attempts:0 },
]));

const $ = id => document.getElementById(id);
const URL_PARAMS = new URLSearchParams(window.location.search);
const DEBUG_UI = URL_PARAMS.get("debug") === "1" ||
  window.location.hash.includes("debug");
const ORDER_MODE = DEBUG_UI ? "free" : (URL_PARAMS.get("order") || "curriculum");
const FREE_ORDER = ORDER_MODE === "free";

function taskUnlocked(task){
  // Keep every scene available during pilot testing. Participants can choose
  // any map, while each scene still records its own result independently.
  return true;
}

function unlockedTasks(){
  return TASKS.filter(taskUnlocked);
}

const EXPORTED_RULE_SCHEMA = RAW_LIBRARY.rule_schema || { fields:[], max_conditions:3 };
const MAX_RULE_CONDITIONS = EXPORTED_RULE_SCHEMA.max_conditions || 3;
const OBJECT_IDS = {
  "Target square":"target",
  "Robot":"robot",
  "Movement":"movement",
};
const RULE_SCHEMA = Object.values((EXPORTED_RULE_SCHEMA.fields || []).reduce((groups, field) => {
  const objectId = OBJECT_IDS[field.object] || field.object.toLowerCase().replaceAll(" ", "-");
  if(!groups[objectId]){
    groups[objectId] = { id:objectId, label:field.object, properties:[] };
  }
  groups[objectId].properties.push({
    id:field.id,
    label:field.id,
    predicate:field.predicate,
    values:field.values,
  });
  return groups;
}, {}));

const MUTATING_RULE_EVENTS = new Set([
  "rule_added",
  "condition_edited",
  "condition_added",
  "condition_removed",
  "rule_removed",
  "library_rule_used",
]);

function recordRuleEvent(type, detail={}){
  if(MUTATING_RULE_EVENTS.has(type)){
    rulebookRevision += 1;
    if(scn?.id && shiftStates[scn.id]){
      shiftStates[scn.id].lastOk = null;
      shiftStates[scn.id].testedRevision = null;
    }
  }
  ruleEvents.push({
    type,
    shift_id:scn?.id || null,
    rulebook_revision:rulebookRevision,
    time_from_experiment_start_ms:Date.now() - experimentStartedAt,
    time_from_trial_start_ms:Date.now() - trialStartedAt,
    timestamp:new Date().toISOString(),
    ...detail,
  });
}

function icon(name, extraClass=""){
  const cls = `ui-icon ${extraClass}`.trim();
  const base = `class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"`;
  const stroke = 'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"';
  const fill = 'fill="currentColor"';
  if(name === "carrier") return `<svg ${base}><path ${fill} d="M8 3h8v2h2v7H6V5h2V3ZM5 12h14v9H5v-9Z"/><circle cx="10" cy="8" r="1" fill="#202020"/><circle cx="14" cy="8" r="1" fill="#202020"/><path d="M9 16h6M9 18h6" stroke="#fff" stroke-width="1.4"/><rect ${fill} x="16" y="14" width="6" height="5"/><path d="M17 14.5 19 16l2-1.5" stroke="#fff" stroke-width="1.1" fill="none"/></svg>`;
  if(name === "cleaner") return `<svg ${base}><path ${fill} d="M8 3h8v2h2v7H6V5h2V3ZM5 12h14v9H5v-9Z"/><circle cx="10" cy="8" r="1" fill="#202020"/><circle cx="14" cy="8" r="1" fill="#202020"/><path d="m14 14 7 7M12.5 15.5l1.5 1.5M17 17l2 2M19 15l2 2" stroke="#202020" stroke-width="1.6" fill="none" stroke-linecap="square"/></svg>`;
  if(name === "operator") return `<svg ${base}><path ${fill} d="M8 3h8v2h2v7H6V5h2V3ZM5 12h14v9H5v-9Z"/><circle cx="10" cy="8" r="1" fill="#202020"/><circle cx="14" cy="8" r="1" fill="#202020"/><rect x="8" y="14" width="8" height="5" fill="#202020"/><circle cx="12" cy="16.5" r="1.4" fill="#fff"/><path d="M12 14.4v-1.1" stroke="#fff" stroke-width="1.1"/></svg>`;
  if(name === "spill") return `<svg ${base}><path ${fill} d="M12 2c3 4 6 7 6 11a6 6 0 1 1-12 0c0-4 3-7 6-11Z"/><path d="M12 9v4M12 16h.01" stroke="#fff" stroke-width="2.5" stroke-linecap="square"/></svg>`;
  if(name === "cold") return `<svg ${base}><path ${stroke} d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M8 4.5l4 3 4-3M8 19.5l4-3 4 3"/></svg>`;
  if(name === "intersection") return `<svg ${base}><path ${fill} d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2Z"/></svg>`;
  if(name === "machine") return `<svg ${base}><path ${fill} d="m9 2 3 2 3-2 2 3 3 1-.5 3.5L22 12l-2.5 2.5.5 3.5-3 1-2 3-3-2-3 2-2-3-3-1 .5-3.5L2 12l2.5-2.5L4 6l3-1 2-3Z"/><circle cx="12" cy="12" r="3.2" fill="#fff"/></svg>`;
  if(name === "wall") return `<svg ${base}><path ${fill} d="M3 4h7v5H3V4Zm9 0h9v5h-9V4ZM3 11h4v5H3v-5Zm6 0h8v5H9v-5Zm10 0h2v5h-2v-5ZM3 18h9v3H3v-3Zm11 0h7v3h-7v-3Z"/></svg>`;
  if(name === "floor") return `<svg ${base}><rect ${stroke} x="4" y="4" width="16" height="16" stroke-width="1.5"/></svg>`;
  if(name === "reach") return `<svg ${base}><path ${fill} d="M10 2h4v7h7v4h-7v7h-4v-7H3V9h7V2Z"/></svg>`;
  if(name === "operate") return icon("machine", extraClass);
  if(name === "deliver") return icon("carrier", extraClass);
  if(name === "done") return `<svg ${base}><circle ${fill} cx="12" cy="12" r="10"/><path d="m7 12 3.2 3.2L17.5 8" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="square"/></svg>`;
  if(name === "failed") return `<svg ${base}><circle ${fill} cx="12" cy="12" r="10"/><path d="m8 8 8 8M16 8l-8 8" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="square"/></svg>`;
  if(name === "waiting") return `<svg ${base}><circle ${fill} cx="12" cy="12" r="10"/><path d="M9 7v10M15 7v10" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="square"/></svg>`;
  if(name === "run") return `<svg ${base}><circle ${fill} cx="12" cy="12" r="10"/><path d="m10 7 7 5-7 5V7Z" fill="#fff"/></svg>`;
  if(name === "idle") return `<svg ${base}><circle ${stroke} cx="12" cy="12" r="9"/></svg>`;
  if(name === "target") return icon("reach", extraClass);
  return `<svg ${base}><circle ${stroke} cx="12" cy="12" r="8"/></svg>`;
}

function roleIconName(role){
  if(role === "cleaner") return "cleaner";
  if(role === "operator") return "operator";
  return "carrier";
}

function carryIcon(agent){
  return agent.carrying === "spill" ? icon("spill", "carry-icon") : "";
}

function goalIconName(agent){
  if(agent.goal.kind === "operate") return "operate";
  if(agent.goal.kind === "deliver") return "deliver";
  return "reach";
}

function stateIconName(meta){
  if(!meta) return "idle";
  if(meta.offDuty) return "idle";
  if(meta.failed) return "failed";
  if(meta.done) return "done";
  if(meta.waiting) return "waiting";
  if(meta.step_count === null || meta.step_count === undefined) return "idle";
  return "run";
}

const ROLE_SHORT_ZH = { carrier:"C", cleaner:"Cl", operator:"O" };
const PROPERTY_LABELS = {
  target_type:"type",
  contested:"state",
  role:"role",
  carrying:"carrying",
  move_dir:"direction",
};

function agentColor(agent){
  return COL[agent.id % COL.length];
}

const ROLE_COLORS = {
  carrier: COL[0],
  operator: COL[1],
  cleaner: COL[2],
};

function roleColor(role){
  return ROLE_COLORS[role] || COL[5];
}

function roleLegendAvatar(role, extraClass=""){
  return `<span class="agent-avatar role-key-avatar ${extraClass}" style="--agent-color:${roleColor(role)}">${icon(roleIconName(role), "agent-avatar-icon")}</span>`;
}

function roleBadge(agent, className=""){
  return `<span class="role-badge role-${agent.role} ${className}">${ROLE_SHORT_ZH[agent.role] || "R"}</span>`;
}

function spillBadge(agent, className=""){
  if(agent.carrying === "none") return "";
  return `<span class="spill-badge ${className}" title="Carrying spill">spill</span>`;
}

function zoneMarkup(zone){
  if(zone === "cold") return icon("cold", "board-zone-icon");
  return "";
}

function targetMarkup(agent, targetIndex=0, onMachine=false){
  const corner = targetIndex % 4;
  return `<span class="target-label target-label-corner-${corner}${onMachine ? ` target-label-on-machine target-label-machine-${corner}` : ""}">${agent.id}</span>`;
}

function agentAvatar(agent, extraClass=""){
  return `<span class="agent-avatar ${extraClass}" style="--agent-color:${agentColor(agent)}">${icon(roleIconName(agent.role), "agent-avatar-icon")}<span class="agent-avatar-id">${agent.id}</span></span>`;
}

function spillIconBadge(agent, className=""){
  if(agent.carrying !== "spill") return "";
  return `<span class="spill-icon-badge ${className}" title="Carrying spill">${icon("spill", "spill-icon")}</span>`;
}

function robotMarkup(agent, meta){
  return [
    icon(roleIconName(agent.role), "robot-role"),
    `<span class="robot-id">${agent.id}</span>`,
    carryIcon(agent),
    meta?.done ? icon("done", "robot-state-mark") : "",
    meta?.failed ? icon("failed", "robot-state-mark") : "",
    meta?.waiting ? icon("waiting", "robot-state-mark wait") : "",
  ].join("");
}

const introducedFeatures = new Set();

const SCENE_GUIDES = {
  trial_1: {
    title:"Cold storage and spills",
    body:"The snowflake marks a cold-storage square. The spill symbol next to a robot means that it is currently carrying a spill.",
    example:"Run the scene to observe what happens before deciding whether a rule is needed.",
  },
  trial_2: {
    title:"Simultaneous movement",
    body:"Robots choose their routes independently and move at the same time.",
    example:"Run the scene to observe what happens when their planned routes interact.",
  },
  trial_3: {
    title:"Shared machines",
    body:"The gear marks a machine square. A robot uses the machine by entering this square. After completing its machine target, the robot leaves the square.",
    example:"Run the scene to observe what happens when more than one robot approaches the machine.",
  },
  trial_5: {
    title:"Cleaner robots",
    body:"The cleaner icon identifies the Cleaner role. A robot's role and what it is currently carrying are separate properties.",
    example:"Run the scene to observe how the newly introduced role behaves.",
  },
};

function sceneFeatureItems(task){
  const roles = new Set(task.agents.filter(agent => agent.active).map(agent => agent.role));
  const hasCold = Object.values(task.zones).includes("cold");
  const hasSpill = task.agents.some(agent => agent.active && agent.carrying === "spill") ||
    Object.values(task.items).some(item => item.hazardous);
  const specs = [
    {
      id:"wall",
      present:task.walls.size > 0,
      iconName:"wall",
      title:"Wall",
      detail:"The brick pattern marks a wall square. Robots cannot enter it, so their routes must go around it.",
    },
    {
      id:"shared-square",
      present:task.activeAgentCount > 1,
      iconName:"floor",
      title:"Simultaneous movement",
      detail:"Robots choose their routes independently and move at the same time.",
    },
    {
      id:"cold",
      present:hasCold,
      iconName:"cold",
      title:"Cold storage",
      detail:"The snowflake marks a cold-storage square.",
    },
    {
      id:"machine",
      present:Object.keys(task.machines).length > 0,
      iconName:"machine",
      title:"Machine",
      detail:"The gear marks a machine square. A robot uses the machine by entering it and leaves after completing its machine target.",
    },
    {
      id:"target",
      present:task.agents.some(agent => agent.active),
      iconName:"target",
      title:"Dashed numbered square",
      detail:"This is the destination of the robot with the same number. Reaching it completes that robot's task.",
      target:true,
    },
    {
      id:"spill",
      present:hasSpill,
      iconName:"spill",
      title:"Spill",
      detail:"This symbol next to a robot means that the robot is currently carrying a spill.",
    },
    {
      id:"carrier",
      present:roles.has("carrier"),
      iconName:"carrier",
      role:"carrier",
      title:"Carrier",
      detail:"This icon identifies the Carrier role. Role and carried item are separate; the spill symbol shows whether it is carrying a spill.",
    },
    {
      id:"operator",
      present:roles.has("operator"),
      iconName:"operator",
      role:"operator",
      title:"Operator",
      detail:"This icon identifies the Operator role. Role and carried item are separate properties.",
    },
    {
      id:"cleaner",
      present:roles.has("cleaner"),
      iconName:"cleaner",
      role:"cleaner",
      title:"Cleaner",
      detail:"This icon identifies the Cleaner role. Role and carried item are separate properties.",
    },
  ];
  return specs.filter(spec => spec.present && !introducedFeatures.has(spec.id));
}

function guideFeatureMarkup(feature){
  let symbol;
  if(feature.target){
    symbol = '<span class="legend-target-sample" style="--agent-color:#555"><span>0</span></span>';
  }else if(feature.role){
    symbol = roleLegendAvatar(feature.role);
  }else{
    symbol = legendIcon(feature.iconName, feature.legendClass || `${feature.iconName}-sample`);
  }
  return `<div class="guide-item">${symbol}<span><strong>${feature.title}</strong><small>${feature.detail}</small></span></div>`;
}

function renderGuideSummary(){
  const summary = $("guide-summary");
  const items = $("guide-summary-items");
  if(!summary || !items) return;
  if(!guideFeatureCatalog.size){
    summary.hidden = true;
    return;
  }
  items.innerHTML = [...guideFeatureCatalog.values()].map(guideFeatureMarkup).join("");
  summary.hidden = false;
}

function sceneHasGuide(task){
  return sceneFeatureItems(task).length > 0;
}

function shouldAutoShowGuide(task){
  return sceneFeatureItems(task).length > 0;
}

function closeSceneGuide(){
  const backdrop = $("guide-backdrop");
  if(!backdrop || backdrop.hidden) return;
  backdrop.hidden = true;
  sceneGuidesSeen.add(scn.id);
  recordRuleEvent("scene_guide_closed", {scene_guide_id:scn.id});
}

function showSceneGuide(force=false){
  const guide = SCENE_GUIDES[scn.id];
  const newFeatures = sceneFeatureItems(scn);
  const backdrop = $("guide-backdrop");
  if(!backdrop || !newFeatures.length) return;
  $("guide-kicker").textContent = `${scn.label} · Scene guide`;
  $("guide-title").textContent = guide?.title || "New elements in this scene";
  $("guide-items").innerHTML = newFeatures.map(guideFeatureMarkup).join("");
  $("guide-body").textContent = guide?.body ||
    "This scene contains several elements you may not have seen yet. The symbols below match the map and the Map key.";
  $("guide-example").textContent = guide?.example ||
    "These icons match the symbols on the map and in the Map key. Rules stay with this scene when you return; saved rules can be reused in later scenes.";
  newFeatures.forEach(feature => {
    introducedFeatures.add(feature.id);
    guideFeatureCatalog.set(feature.id, feature);
  });
  renderGuideSummary();
  renderSceneGuideButton();
  backdrop.hidden = false;
  recordRuleEvent("scene_guide_opened", {scene_guide_id:scn.id, first_view:!sceneGuidesSeen.has(scn.id)});
  $("guide-close")?.focus();
}

function renderSceneGuideButton(){
  const button = $("scene-guide");
  if(!button) return;
  const available = sceneHasGuide(scn);
  button.hidden = !available;
  button.onclick = available ? () => showSceneGuide(true) : null;
}

function closeScenePicker(){
  const backdrop = $("scene-picker-backdrop");
  if(backdrop) backdrop.hidden = true;
}

function sceneFullMapMarkup(task){
  const targets = new Map();
  task.agents.filter(agent => agent.active).forEach(agent => {
    const target = goalCell(task, agent);
    const key = K(target[0], target[1]);
    if(!targets.has(key)) targets.set(key, []);
    targets.get(key).push(agent);
  });
  const machines = new Map(Object.values(task.machines).map(machine => [K(machine.cell[0], machine.cell[1]), machine]));
  const cells = [];
  for(let row = 0; row < task.rows; row++){
    for(let col = 0; col < task.cols; col++){
      const key = K(row, col);
      const wall = task.walls.has(key);
      const zone = task.zones[key] || "normal";
      const agents = task.agents.filter(agent => agent.active && sameCell(agent.pos, [row, col]));
      const items = Object.values(task.items).filter(item => K(item.cell[0], item.cell[1]) === key);
      const feature = machines.has(key)
        ? `<span class="picker-machine"><span class="picker-machine-icon">${icon("machine")}</span></span>`
        : "";
      const itemMarkup = items.map(item => `<span class="picker-item item-${item.colour}" aria-hidden="true"></span>`).join("");
      const targetMarkup = (targets.get(key) || []).map((agent, targetIndex) =>
        `<span class="picker-target picker-target-${targetIndex % 4}${machines.has(key) ? ` picker-target-on-machine picker-target-on-machine-${targetIndex % 4}` : ""}" style="--agent-color:${agentColor(agent)}" aria-hidden="true"><span class="picker-target-label picker-target-label-${targetIndex % 4}">${agent.id}</span></span>`
      ).join("");
      const agentMarkup = agents.map((agent, agentIndex) =>
        `<span class="picker-agent ${agents.length > 1 ? "picker-agent-multi" : ""} picker-agent-index-${agentIndex}" style="--agent-color:${agentColor(agent)}" aria-hidden="true">${icon(roleIconName(agent.role), "picker-agent-icon")}<span class="picker-agent-id">${agent.id}</span>${agent.carrying === "spill" ? icon("spill", "picker-carry-icon") : ""}</span>`
      ).join("");
      const zoneMarkupText = !wall && zone === "cold" ? zoneMarkup("cold") : "";
      cells.push(`<span class="picker-map-cell ${wall ? "picker-map-wall" : `picker-map-${zone}`}" aria-hidden="true">${wall ? "" : zoneMarkupText + feature + itemMarkup + targetMarkup + agentMarkup}</span>`);
    }
  }
  return `<span class="scene-full-map" style="--map-cols:${task.cols};--map-rows:${task.rows}">${cells.join("")}</span>`;
}

function renderScenePickerKey(){
  const key = $("scene-picker-key");
  if(!key) return;
  const roles = [...new Set(TASKS.flatMap(task =>
    task.agents.filter(agent => agent.active).map(agent => agent.role)
  ))];
  const roleTiles = roles.map(role => {
    const agent = TASKS.flatMap(task => task.agents)
      .find(candidate => candidate.active && candidate.role === role);
    return `<div class="picker-key-tile">${roleLegendAvatar(role, "picker-key-symbol role-symbol")}<span>${ROLE_ZH[role] || role}</span></div>`;
  }).join("");
  const environmentTiles = [
    ["floor", "Open floor"],
    ["wall", "Wall"],
    ["cold", "Cold storage"],
    ["machine", "Machine"],
    ["spill", "Spill"],
  ].map(([iconName, label]) =>
    `<div class="picker-key-tile"><span class="picker-key-symbol ${iconName}-symbol">${icon(iconName)}</span><span>${label}</span></div>`
  ).join("");
  key.innerHTML = `<strong>Map key</strong><div class="picker-key-group"><span class="picker-key-group-label">Robots</span>${roleTiles}</div><div class="picker-key-group"><span class="picker-key-group-label">Map</span><div class="picker-key-grid"><div class="picker-key-tile"><span class="picker-key-target"><span>0</span></span><span>Target</span></div>${environmentTiles}</div></div>`;
}

function showScenePicker(){
  const backdrop = $("scene-picker-backdrop");
  const options = $("scene-picker-options");
  if(!backdrop || !options) return;
  renderScenePickerKey();
  options.innerHTML = "";
  TASKS.forEach((task, index) => {
    const button = document.createElement("button");
    button.className = "scene-picker-card";
    button.type = "button";
    button.innerHTML = `${sceneFullMapMarkup(task)}<span class="scene-picker-card-label">${task.label}</span>`;
    button.onclick = () => {
      initialSceneChosen = true;
      closeScenePicker();
      recordRuleEvent("initial_scene_selected", {
        selected_shift_id:task.id,
        selected_shift_index:index,
      });
      if(index === curIndex){
        renderAll();
        if(shouldAutoShowGuide(scn)) setTimeout(() => showSceneGuide(), 0);
      }else{
        switchTask(index);
      }
    };
    options.appendChild(button);
  });
  backdrop.hidden = false;
  options.querySelector("button")?.focus();
}

function switchTask(index){
  if(!taskUnlocked(TASKS[index])) return;
  sceneRuleDrafts.set(scn.id, rules);
  curIndex = index;
  scn = TASKS[curIndex];
  rules = sceneRuleDrafts.get(scn.id) || [];
  lastResult = null;
  lastFrames = [];
  frameIndex = 0;
  trialStartedAt = Date.now();
  if(timer){ clearInterval(timer); timer = null; }
  recordRuleEvent("shift_selected", {
    selected_shift_id:scn.id,
    selected_shift_index:index,
    previously_visited:shiftStates[scn.id].visited,
  });
  renderAll();
  if(shouldAutoShowGuide(scn)){
    setTimeout(() => showSceneGuide(), 0);
  }
}

function buildTabs(){
  const tabs = $("tabs");
  tabs.innerHTML = "";
  TASKS.forEach((task, index) => {
    const button = document.createElement("button");
    const state = shiftStates[task.id];
    const locked = !taskUnlocked(task);
    const stateClass = locked
      ? "locked"
      : !state.visited ? "unseen" : state.lastOk ? "solved" : "failed";
    button.className = `tab case-tab ${stateClass}` + (index === curIndex ? " active" : "");
    const mark = locked ? "" : !state.visited ? "" : state.lastOk ? "✓" : "×";
    button.innerHTML = `<span class="scene-number">${task.label}</span><span class="scene-mark" aria-hidden="true">${mark}</span>`;
    button.disabled = locked;
    button.title = locked
      ? `${task.label}: complete the previous scene first`
      : !state.visited
      ? `${task.label}: not yet run`
      : `${task.label}: ${state.lastOk ? "solved" : "not solved"}`;
    button.onclick = () => switchTask(index);
    tabs.appendChild(button);
  });
  const sceneLabel = $("scene-label");
  if(sceneLabel) sceneLabel.textContent = scn.label;
  const position = $("scene-position");
  if(position){
    position.textContent = `${scn.label} / ${TASKS.length}`;
  }
  renderSceneGuideButton();
  renderGuideSummary();
  const visited = Object.values(shiftStates).filter(state => state.visited).length;
  const currentSolved = Object.values(shiftStates).filter(state =>
    state.lastOk
  ).length;
  const available = unlockedTasks().length;
  const caseSummary = $("case-summary");
  if(caseSummary){
    caseSummary.textContent = `${visited}/${TASKS.length} checked · ${currentSolved}/${TASKS.length} solved`;
  }
  const courseProgress = $("course-progress");
  if(courseProgress){
    courseProgress.textContent = `${visited} / ${TASKS.length} checked`;
  }
}

function renderSceneGoal(){
  const list = $("scene-goal-list");
  if(!list) return;
  list.innerHTML = scn.agents.filter(agent => agent.active).map(agent => {
    const target = goalCell(scn, agent);
    const robotSymbol = `<span class="goal-robot-symbol" style="--agent-color:${agentColor(agent)}">${icon(roleIconName(agent.role))}<span>${agent.id}</span></span>`;
    const targetSymbol = agent.goal.kind === "operate"
      ? `<span class="goal-feature-symbol">${icon("machine")}</span>`
      : `<span class="goal-target-symbol" style="--agent-color:${agentColor(agent)}"><span>${agent.id}</span></span>`;
    const targetText = agent.goal.kind === "operate"
      ? `use ${MACHINE_ZH[agent.goal.machine] || agent.goal.machine}`
      : goalLabel(agent);
    const location = agent.goal.kind === "operate" ? "" : ` · (${target[0]}, ${target[1]})`;
    return `<div class="scene-goal-row">${robotSymbol}<span class="goal-arrow" aria-hidden="true">→</span>${targetSymbol}<span class="goal-copy"><strong>Robot ${agent.id}</strong><small>${targetText}${location}</small></span></div>`;
  }).join("");
}

function buildBoard(){
  const board = $("board");
  board.innerHTML = "";
  robotEls = {};
  const frame = document.querySelector(".board-frame");
  const frameWidth = frame?.clientWidth || window.innerWidth;
  const availableWidth = Math.max(0, frameWidth - 40);
  // Use the viewport, rather than the board's current height, so repeated
  // renders do not progressively shrink the map.
  const availableHeight = Math.max(0, window.innerHeight - 250);
  const widthCell = Math.floor(availableWidth / scn.cols);
  const heightCell = Math.floor(availableHeight / scn.rows);
  const widthLimit = widthCell > 0 ? widthCell : 38;
  const heightLimit = heightCell > 0 ? heightCell : 38;
  CELL = Math.min(38, Math.max(24, Math.min(widthLimit, heightLimit)));
  board.style.width = (scn.cols * CELL) + "px";
  board.style.height = (scn.rows * CELL) + "px";

  for(let r=0; r<scn.rows; r++) for(let c=0; c<scn.cols; c++){
    const key = K(r,c);
    const blocked = !passable(scn, [r,c]);
    const zone = zoneOf(scn, [r,c]);
    const visualZone = zone === "intersection" ? "normal" : zone;
    const cell = document.createElement("div");
    cell.className = blocked
      ? `cell wall${r % 2 ? " wall-row-offset" : ""}`
      : "cell zone-" + visualZone;
    cell.style.left = (c * CELL) + "px";
    cell.style.top = (r * CELL) + "px";
    cell.style.width = (blocked ? CELL : CELL - 4) + "px";
    cell.style.height = (blocked ? CELL : CELL - 4) + "px";
    cell.dataset.cell = key;
    cell.setAttribute("aria-label", blocked ? "Wall" : (ZONE_ZH[visualZone] || visualZone));
    if(!blocked){
      cell.innerHTML = zoneMarkup(visualZone);
    }
    board.appendChild(cell);
  }

  Object.values(scn.machines).forEach(machine => {
    const el = document.createElement("div");
    el.className = "machine";
    el.style.left = (machine.cell[1] * CELL + 3) + "px";
    el.style.top = (machine.cell[0] * CELL + 3) + "px";
    el.style.width = (CELL - 8) + "px";
    el.style.height = (CELL - 8) + "px";
    el.innerHTML = icon("machine", "board-feature-icon");
    el.setAttribute("aria-label", machine.setup_role
      ? `${MACHINE_ZH[machine.id] || machine.id}: ${ROLE_ZH[machine.setup_role] || machine.setup_role} prepares it first`
      : (MACHINE_ZH[machine.id] || machine.id));
    board.appendChild(el);
  });

  Object.values(scn.items).forEach(item => {
    const el = document.createElement("div");
    el.className = "item item-" + item.colour;
    el.style.left = (item.cell[1] * CELL + 11) + "px";
    el.style.top = (item.cell[0] * CELL + 11) + "px";
    el.style.width = (CELL - 22) + "px";
    el.style.height = (CELL - 22) + "px";
    el.setAttribute("aria-label", ITEM_ZH[item.colour] || item.id);
    board.appendChild(el);
  });

  const activeAgents = scn.agents.filter(agent => agent.active);
  const targetGroups = {};
  activeAgents.forEach(agent => {
    const target = goalCell(scn, agent);
    const key = K(target[0], target[1]);
    targetGroups[key] = targetGroups[key] || [];
    targetGroups[key].push(agent.id);
  });

  activeAgents.forEach(agent => {
    const target = goalCell(scn, agent);
    const targetIds = targetGroups[K(target[0], target[1])];
    const targetIndex = targetIds.indexOf(agent.id);
    const targetIsMachine = Object.values(scn.machines).some(machine => sameCell(machine.cell, target));
    const inset = targetIsMachine ? 0 : targetIndex * 4;
    const ring = document.createElement("div");
    ring.className = "ring";
    if(targetIds.length > 1) ring.classList.add("shared-target-ring");
    ring.style.left = (target[1] * CELL + inset) + "px";
    ring.style.top = (target[0] * CELL + inset) + "px";
    ring.style.width = (CELL - 4 - inset * 2) + "px";
    ring.style.height = (CELL - 4 - inset * 2) + "px";
    ring.style.borderColor = agentColor(agent);
    ring.style.setProperty("--agent-color", agentColor(agent));
    ring.classList.add("goal-" + agent.goal.kind);
    if(targetIsMachine){
      ring.classList.add("machine-target-ring");
    }
    ring.setAttribute("aria-label", `Robot ${agent.id} target: ${goalLabel(agent)}`);
    ring.innerHTML = targetMarkup(agent, targetIndex, targetIsMachine);
    board.appendChild(ring);
  });

  scn.agents.forEach(agent => {
    const robot = document.createElement("div");
    robot.className = "robot" + (agent.active ? "" : " off-duty");
    robot.style.width = (CELL - 14) + "px";
    robot.style.height = (CELL - 14) + "px";
    robot.style.background = agentColor(agent);
    robot.setAttribute("aria-label", agent.active ? `Robot ${agent.id}` : `Robot ${agent.id}: off duty`);
    robot.innerHTML = robotMarkup(agent, null);
    board.appendChild(robot);
    robotEls[agent.id] = robot;
  });

  renderFrame(initialFrame());
}

function initialFrame(){
  const pos = Object.fromEntries(scn.agents.map(a => [a.id, a.pos]));
  const agents = {};
  scn.agents.forEach(agent => {
    agents[agent.id] = {
      state:agent.active ? "pending" : "off-duty",
      done:!agent.active,
      offDuty:!agent.active,
      waiting:false,
      failed:false,
      step_index:null,
      step_count:null,
      next_step:"",
    };
  });
  return { pos, event:null, agents, tick:0 };
}

function stateText(meta){
  if(!meta) return "Not run";
  if(meta.offDuty) return "Off duty";
  if(meta.failed) return "Failed";
  if(meta.done) return "Complete";
  if(meta.waiting) return "Waiting by rule";
  if(meta.step_count === null || meta.step_count === undefined) return "Not run";
  return "Moving";
}

function stateClass(meta){
  if(!meta) return "idle";
  if(meta.offDuty) return "off-duty";
  if(meta.failed) return "bad";
  if(meta.done) return "ok";
  if(meta.waiting) return "wait";
  return "run";
}

function goalLabel(agent){
  const target = goalCell(scn, agent);
  if(agent.goal.kind === "deliver") return `deliver ${agent.goal.item} to (${target[0]}, ${target[1]})`;
  if(agent.goal.kind === "operate") return `use ${MACHINE_ZH[agent.goal.machine] || agent.goal.machine}`;
  return `reach (${target[0]}, ${target[1]})`;
}

function agentBadge(agent, className=""){
  return `<span class="agent-chip ${className}">${agentAvatar(agent)}${spillIconBadge(agent, "chip-spill")}</span>`;
}

function legendSection(title, content, className=""){
  if(!content) return "";
  return `<section class="legend-section ${className}"><div class="legend-title">${title}</div><div class="legend-grid">${content}</div></section>`;
}

function legendTile(symbol, title, detail="", extraClass=""){
  return `<div class="legend-tile ${extraClass}">${symbol}<span class="legend-copy"><strong>${title}</strong>${detail ? `<small>${detail}</small>` : ""}</span></div>`;
}

function legendSample(text, className=""){
  return `<span class="legend-sample ${className}">${text}</span>`;
}

function legendIcon(iconName, className=""){
  return `<span class="legend-symbol ${className}">${icon(iconName)}</span>`;
}

function statePill(meta){
  return `<span class="state-pill ${stateClass(meta)}">${stateText(meta)}</span>`;
}

function renderAgentProgress(frame){
  const panel = $("agent-progress");
  if(!panel) return;
  panel.innerHTML = "";
  const head = document.createElement("div");
  head.className = "agent-head";
  head.innerHTML = "<span>Robots</span>";
  panel.appendChild(head);

  scn.agents.filter(agent => agent.active).forEach(agent => {
    const meta = frame?.agents?.[agent.id] || frame?.agents?.[String(agent.id)] || null;
    const row = document.createElement("div");
    row.className = "agent-row " + stateClass(meta);

    const main = document.createElement("span");
    main.className = "agent-main";
    const roleValue = String(agent.role || "robot");
    const role = roleValue.charAt(0).toUpperCase() + roleValue.slice(1);
    const cargoLabel = agent.carrying === "spill" ? "Carrying spill" : "No spill";
    main.innerHTML = `<span class="agent-identity">${agentAvatar(agent, "progress-avatar")}<strong>${role}</strong>${spillIconBadge(agent, "progress-spill")}</span><small class="agent-cargo">${cargoLabel}</small>`;
    row.appendChild(main);

    const state = document.createElement("span");
    state.className = "agent-state " + stateClass(meta);
    state.innerHTML = icon(stateIconName(meta), "state-inline-icon") + `<span>${stateText(meta)}</span>`;
    row.appendChild(state);

    if(meta && meta.next_step && !meta.done && !meta.failed){
      const next = document.createElement("span");
      next.className = "agent-next";
      next.textContent = `Next: ${meta.next_step}`;
      row.appendChild(next);
    }
    panel.appendChild(row);
  });
}

function renderFrame(frame){
  scn.agents.forEach(agent => {
    const p = frame.pos[agent.id];
    const el = robotEls[agent.id];
    if(!el || !p) return;
    const meta = frame.agents?.[agent.id] || frame.agents?.[String(agent.id)] || null;
    el.style.display = meta?.released ? "none" : "";
    el.style.left = (p[1] * CELL + 7) + "px";
    el.style.top = (p[0] * CELL + 7) + "px";
    el.classList.toggle("done", !!meta?.done);
    el.classList.toggle("off-duty", !!meta?.offDuty);
    el.classList.toggle("waiting", !!meta?.waiting);
    el.classList.toggle("failed", !!meta?.failed);
    el.setAttribute("aria-label", `Robot ${agent.id}: ${stateText(meta)}`);
    el.innerHTML = robotMarkup(agent, meta);
  });
  document.querySelectorAll(".cell.flash").forEach(el => el.classList.remove("flash"));
  if(frame.event && frame.event.cell){
    const cell = document.querySelector('[data-cell="' + K(frame.event.cell[0], frame.event.cell[1]) + '"]');
    if(cell) cell.classList.add("flash");
  }
  renderAgentProgress(frame);
  updateFrameButtons();
}

function schemaObject(id){
  return RULE_SCHEMA.find(object => object.id === id) || null;
}

function schemaProperty(objectId, propertyId){
  return schemaObject(objectId)?.properties.find(property => property.id === propertyId) || null;
}

function conditionText(cond){
  const negated = !!cond.negated;
  if(cond.p === "target_type"){
    return `the target square is${negated ? " not" : ""} ${cond.v === "cold" ? "cold storage" : "a machine station"}`;
  }
  if(cond.p === "role"){
    const role = {carrier:"a carrier", cleaner:"a cleaner", operator:"an operator"}[cond.v] || cond.v;
    return `the robot is${negated ? " not" : ""} ${role}`;
  }
  if(cond.p === "carrying"){
    return `the robot is${negated ? " not" : ""} carrying a spill`;
  }
  if(cond.p === "move_dir"){
    const direction = {N:"north", S:"south", E:"east", W:"west"}[cond.v] || cond.v;
    return `the robot is${negated ? " not" : ""} moving ${direction}`;
  }
  if(cond.p === "contested"){
    return `the target square is${negated ? " not" : ""} being entered by multiple robots`;
  }
  if(cond.p === "role_not"){
    return `the robot's role is not ${String(cond.v).toLowerCase()}`;
  }
  return cond.label || `${cond.p} ${negated ? "is not" : "is"} ${cond.v}`;
}

function displayCondition(_rule, cond){
  return conditionText(cond);
}

function cloneCondition(cond){
  return {
    object:cond.object,
    property:cond.property,
    p:cond.p,
    v:cond.v,
    negated:!!cond.negated,
  };
}

function cloneRule(rule, sourceLibraryId=null){
  return {
    id:nextRuleId++,
    action:"MOVE",
    conds:rule.conds.map(cloneCondition),
    editor:null,
    sourceLibraryId,
  };
}

function ruleSignature(rule){
  return rule.conds
    .map(cond => `${cond.p}|${String(cond.v)}|${cond.negated ? 1 : 0}`)
    .sort()
    .join(";");
}

function ruleText(rule){
  return `If ${rule.conds.map(c => displayCondition(rule, c)).join(" and ")}, then do not move into the square`;
}

function saveRuleToLibrary(rule, ruleIndex){
  if(!rule.conds.length){
    showNotice("Add a complete condition before saving this rule.");
    return;
  }
  const signature = ruleSignature(rule);
  const existing = library.find(entry => entry.signature === signature);
  if(existing){
    recordRuleEvent("library_save_skipped", {
      rule_id:rule.id,
      rule_index:ruleIndex,
      library_rule_id:existing.id,
      reason:"duplicate_rule",
    });
    setStatus("This rule is already in the library.", "");
    return;
  }
  const entry = {
    id:`L${Math.max(0, ...library.map(row => Number(row.id.slice(1)) || 0)) + 1}`,
    signature,
    sourceRuleId:rule.id,
    rule:{action:"MOVE", conds:rule.conds.map(cloneCondition)},
  };
  library.push(entry);
  recordRuleEvent("library_rule_saved", {
    rule_id:rule.id,
    rule_index:ruleIndex,
    library_rule_id:entry.id,
    rule:ruleJson([rule])[0],
  });
  renderRules();
}

function useLibraryRule(entry){
  const signature = entry.signature;
  if(rules.some(rule => ruleSignature(rule) === signature)){
    recordRuleEvent("library_rule_use_skipped", {
      library_rule_id:entry.id,
      reason:"already_active",
    });
    setStatus("This library rule is already active in the scene.", "");
    return;
  }
  const rule = cloneRule(entry.rule, entry.id);
  rules.push(rule);
  recordRuleEvent("library_rule_used", {
    rule_id:rule.id,
    rule_index:rules.length - 1,
    library_rule_id:entry.id,
    source_rule_id:entry.sourceRuleId,
  });
  renderRules();
}

function removeLibraryRule(entry){
  library = library.filter(row => row.id !== entry.id);
  recordRuleEvent("library_rule_removed", {library_rule_id:entry.id});
  renderRules();
}

function renderLibrary(){
  const box = $("library");
  if(!box) return;
  box.innerHTML = "";
  $("library-count").textContent = `${library.length} saved`;
  if(!library.length){
    box.innerHTML = '<div class="library-empty">No saved rules yet.</div>';
    return;
  }
  library.forEach(entry => {
    const row = document.createElement("div");
    row.className = "library-row";
    const text = document.createElement("span");
    text.className = "library-rule-text";
    text.textContent = `${entry.id}: ${ruleText(entry.rule)}`;
    row.appendChild(text);

    const use = document.createElement("button");
    use.className = "library-use";
    use.textContent = "Add to rulebook";
    use.title = "Add this saved rule to the shared rulebook";
    use.onclick = () => useLibraryRule(entry);
    row.appendChild(use);

    const remove = document.createElement("button");
    remove.className = "library-remove";
    remove.textContent = "×";
    remove.title = "Remove this rule from the library";
    remove.setAttribute("aria-label", `Remove ${entry.id} from library`);
    remove.onclick = () => removeLibraryRule(entry);
    row.appendChild(remove);
    box.appendChild(row);
  });
}

function emptyConditionEditor(conditionIndex=null){
  return {
    conditionIndex,
    object:null,
    property:null,
    operator:null,
    value:null,
  };
}

function editorSelect(className, placeholder, options, selected, onChange, disabled=false){
  const select = document.createElement("select");
  select.className = className;
  select.disabled = disabled;
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = placeholder;
  select.appendChild(blank);
  options.forEach(option => {
    const row = document.createElement("option");
    row.value = String(option.id);
    row.textContent = option.label;
    row.selected = selected !== null && selected !== undefined && String(option.id) === String(selected);
    select.appendChild(row);
  });
  select.onchange = () => onChange(select.value);
  return select;
}

function editorField(label, control){
  const field = document.createElement("label");
  field.className = "editor-field";
  const caption = document.createElement("span");
  caption.className = "editor-field-label";
  caption.textContent = label;
  field.appendChild(caption);
  field.appendChild(control);
  return field;
}

function conditionPayload(cond){
  return {
    object:cond.object,
    property:cond.property,
    predicate:cond.p,
    value:cond.v,
    operator:cond.negated ? "IS_NOT" : "IS",
    negated:!!cond.negated,
    text:conditionText(cond),
  };
}

function conditionTerms(object){
  if(!object) return [];
  return object.properties.flatMap(property =>
    property.values.map(value => ({
      id:`${property.id}|${String(value.id)}`,
      label:value.label,
      property:property.id,
      predicate:property.predicate,
      value:value.id,
    }))
  );
}

function termPlaceholder(objectId){
  if(objectId === "target") return "Choose target fact";
  if(objectId === "robot") return "Choose robot fact";
  if(objectId === "movement") return "Choose movement fact";
  return "Choose fact";
}

function renderConditionEditor(rule, card){
  const editor = rule.editor;
  if(!editor) return;

  const panel = document.createElement("div");
  panel.className = "condition-editor";
  const prefix = document.createElement("span");
  prefix.className = "condition-builder-prefix";
  const hasPreviousCondition = editor.conditionIndex === null
    ? rule.conds.length > 0
    : editor.conditionIndex > 0;
  prefix.textContent = hasPreviousCondition
    ? "AND"
    : "WHEN";
  panel.appendChild(prefix);

  const object = schemaObject(editor.object);
  const property = schemaProperty(editor.object, editor.property);
  const availableObjects = RULE_SCHEMA;

  const objectSelect = editorSelect(
    "typed-select object-select",
    "Select object",
    availableObjects,
    editor.object,
    value => {
      editor.object = value || null;
      editor.property = null;
      editor.value = null;
      recordRuleEvent("condition_field_selected", {rule_id:rule.id, field:"object", value:value || null});
      renderRules();
    }
  );
  objectSelect.setAttribute("aria-label", "Condition object");
  panel.appendChild(objectSelect);

  const operatorSelect = editorSelect(
    "typed-select operator-select",
    "IS or IS NOT",
    [{id:"IS", label:"IS"}, {id:"IS_NOT", label:"IS NOT"}],
    editor.operator,
    value => {
      editor.operator = value || null;
      recordRuleEvent("condition_field_selected", {
        rule_id:rule.id,
        field:"operator",
        value:editor.operator,
      });
      renderRules();
    }
  );
  operatorSelect.setAttribute("aria-label", "Condition relation");
  panel.appendChild(operatorSelect);

  const terms = conditionTerms(object);
  const selectedTerm = editor.property === null
    ? null
    : `${editor.property}|${String(editor.value)}`;
  const valueSelect = editorSelect(
    "typed-select value-select",
    "Select fact",
    terms,
    selectedTerm,
    value => {
      const selected = terms.find(option => option.id === value) || null;
      editor.property = selected?.property || null;
      editor.value = selected ? selected.value : null;
      recordRuleEvent("condition_term_selected", {
        rule_id:rule.id,
        object:editor.object,
        property:editor.property,
        predicate:selected?.predicate || null,
        value:editor.value,
        label:selected?.label || null,
      });
      renderRules();
    },
    !object
  );
  valueSelect.setAttribute("aria-label", "Condition fact");
  panel.appendChild(valueSelect);

  const actions = document.createElement("div");
  actions.className = "condition-editor-actions";
  const save = document.createElement("button");
  save.className = "btn condition-save";
  save.textContent = editor.conditionIndex === null ? "Add" : "Save";
  save.disabled = !object || !property || !editor.operator || editor.value === null;
  save.onclick = () => {
    const cond = {
      object:object.id,
      property:property.id,
      p:property.predicate,
      v:editor.value,
      negated:editor.operator === "IS_NOT",
    };
    const editing = editor.conditionIndex !== null;
    if(editing) rule.conds[editor.conditionIndex] = cond;
    else rule.conds.push(cond);
    recordRuleEvent(editing ? "condition_edited" : "condition_added", {
      rule_id:rule.id,
      condition_index:editing ? editor.conditionIndex : rule.conds.length - 1,
      condition:conditionPayload(cond),
    });
    rule.editor = null;
    renderRules();
  };
  actions.appendChild(save);

  const cancel = document.createElement("button");
  cancel.className = "btn condition-cancel";
  cancel.textContent = "Cancel";
  cancel.onclick = () => {
    recordRuleEvent("condition_editor_closed", {rule_id:rule.id, saved:false});
    rule.editor = null;
    renderRules();
  };
  actions.appendChild(cancel);
  panel.appendChild(actions);
  card.appendChild(panel);
}

function renderRules(){
  const box = $("rules");
  box.innerHTML = "";
  $("rule-count").textContent = `${rules.filter(rule => rule.conds.length > 0).length} active`;
  if(rules.length === 0){
    box.innerHTML = "";
  }

  const displayRules = rules
    .map((rule, sourceIndex) => ({rule, sourceIndex}))
    .sort((a, b) => Number(a.rule.conds.length > 0) - Number(b.rule.conds.length > 0));
  let activeRuleNumber = 0;

  displayRules.forEach(({rule, sourceIndex}) => {
    if(rule.conds.length > 0 && activeRuleNumber === 0){
      const label = document.createElement("div");
      label.className = "rule-group-label";
      label.textContent = "Active rules";
      box.appendChild(label);
    }
    const ruleLabel = rule.conds.length === 0
      ? ""
      : `Rule ${++activeRuleNumber}`;
    const card = document.createElement("div");
    card.className = "rule";

    const header = document.createElement("div");
    header.className = "rule-header";
    header.innerHTML = ruleLabel ? `<strong>${ruleLabel}</strong>` : "";
    const actions = document.createElement("div");
    actions.className = "rule-actions";
    const save = document.createElement("button");
    save.className = "save-rule";
    save.textContent = "Save to library";
    if(!rule.conds.length) save.classList.add("needs-condition");
    save.title = rule.conds.length
      ? "Save this rule for reuse in another scene"
      : "Add a complete condition before saving";
    save.onclick = () => saveRuleToLibrary(rule, sourceIndex);
    actions.appendChild(save);

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "×";
    del.title = "Remove rule";
    del.setAttribute("aria-label", "Remove rule");
    del.onclick = () => {
      recordRuleEvent("rule_removed", {rule_id:rule.id, rule_index:sourceIndex});
      rules.splice(sourceIndex, 1);
      renderRules();
    };
    actions.appendChild(del);
    header.appendChild(actions);
    card.appendChild(header);

    const actionLine = document.createElement("div");
    actionLine.className = "rule-action-line";
    actionLine.innerHTML = '<span class="kw2">FORBID</span><strong>MOVE INTO A SQUARE</strong>';
    card.appendChild(actionLine);

    const conditions = document.createElement("div");
    conditions.className = "condition-list";
    rule.conds.forEach((cond, ci) => {
      const row = document.createElement("div");
      row.className = "condition-row";
      const join = document.createElement("span");
      join.className = "condition-join";
      join.textContent = ci === 0 ? "WHEN" : "AND";
      row.appendChild(join);

      const edit = document.createElement("button");
      edit.className = "condition-sentence";
      edit.textContent = conditionText(cond);
      edit.title = "Edit this condition";
      edit.onclick = () => {
        rule.editor = {
          conditionIndex:ci,
          object:cond.object,
          property:cond.property,
          operator:cond.negated ? "IS_NOT" : "IS",
          value:cond.v,
        };
        recordRuleEvent("condition_editor_opened", {rule_id:rule.id, condition_index:ci, mode:"edit"});
        renderRules();
      };
      row.appendChild(edit);

      const remove = document.createElement("button");
      remove.className = "condition-remove";
      remove.textContent = "×";
      remove.title = "Delete this condition";
      remove.onclick = () => {
        recordRuleEvent("condition_removed", {
          rule_id:rule.id,
          condition_index:ci,
          condition:conditionPayload(cond),
        });
        rule.conds.splice(ci, 1);
        rule.editor = null;
        renderRules();
      };
      row.appendChild(remove);
      conditions.appendChild(row);
    });
    card.appendChild(conditions);

    if(!rule.editor && rule.conds.length < MAX_RULE_CONDITIONS){
      const add = document.createElement("button");
      add.className = "add-condition";
      add.textContent = "+ Add condition";
      add.onclick = () => {
        rule.editor = emptyConditionEditor();
        recordRuleEvent("condition_editor_opened", {rule_id:rule.id, condition_index:null, mode:"add"});
        renderRules();
      };
      card.appendChild(add);
    }

    renderConditionEditor(rule, card);
    box.appendChild(card);
  });
  renderLibrary();
  buildTabs();
}

function renderLegend(){
  const activeAgents = scn.agents.filter(agent => agent.active);
  const roles = [...new Set(activeAgents.map(agent => agent.role))];
  const roleTiles = roles.map(role => {
    const symbol = roleLegendAvatar(role);
    return legendTile(symbol, ROLE_ZH[role] || role, "Robot role", "role-tile");
  }).join("");

  const targetTile = legendTile(
    '<span class="legend-target-sample" style="--agent-color:#555"><span>0</span></span>',
    "Target",
    "Dashed number matches the robot number",
    "target-tile",
  );
  const zoneSet = new Set(Object.values(scn.zones));
  const hasSpill = activeAgents.some(agent => agent.carrying === "spill") ||
    Object.values(scn.items).some(item => item.hazardous);
  const environmentTiles = [
    legendTile(legendIcon("floor", "floor-sample"), "Open floor", "Available for movement", "floor-tile"),
    scn.walls.size ? legendTile(legendIcon("wall", "wall-sample"), "Wall", "Not available for movement", "wall-tile") : "",
    zoneSet.has("cold") ? legendTile(legendIcon("cold", "cold-sample"), "Cold storage", "A spill can contaminate it", "zone-tile cold") : "",
    Object.keys(scn.machines).length ? legendTile(legendIcon("machine", "machine-sample"), "Machine", "One robot enters at a time", "machine-tile") : "",
    hasSpill ? legendTile(legendIcon("spill", "spill-sample"), "Spill", "Carried by a robot", "item-tile") : "",
  ].filter(Boolean).join("");

  $("legend").innerHTML = `<section class="map-key" aria-labelledby="map-key-title"><h3 class="map-key-title" id="map-key-title">Map key</h3><div class="map-key-body">${[
    legendSection("Robot roles", roleTiles, "roles"),
    legendSection("Target", targetTile, "targets"),
    legendSection("Environment", environmentTiles, "environment"),
  ].join("")}</div></section>`;
  const conditionLines = RULE_SCHEMA.map(object => {
    const fields = object.properties.map(property =>
      `${property.label}: ${property.values.map(value => value.label).join(" / ")}`
    );
    return `${object.label} — ${fields.join("; ")}`;
  });
  const atomicPredicateCount = RULE_SCHEMA.reduce(
    (sum, object) => sum + object.properties.reduce(
      (objectSum, property) => objectSum + property.values.length,
      0
    ),
    0
  );
  $("vocab").innerHTML = [
    `<div class="vocab-summary">Typed MOVE-rule space · ${atomicPredicateCount} atomic predicates · IS / IS NOT · up to ${MAX_RULE_CONDITIONS} conditions</div>`,
    `<details class="vocab-detail"><summary>Show typed fields</summary><div>${conditionLines.join("<br>")}<br>Runs on this page = human attempts.</div></details>`
  ].join("");
}

function ruleSummary(){
  const active = rules.filter(r => r.conds.length > 0);
  if(active.length === 0) return "(no rules)";
  return active.map(ruleText).join("; ");
}

function ruleJson(sourceRules=rules){
  return sourceRules
    .filter(r => r.conds.length > 0)
    .map(r => ({
      rule_id:r.id,
      source_library_id:r.sourceLibraryId || null,
      action:"MOVE",
      literals:r.conds.map(c => ({
        object:c.object,
        property:c.property,
        predicate:c.p,
        operator:c.negated ? "IS_NOT" : "IS",
        value:c.v,
        negated:!!c.negated,
        label:displayCondition(r, c),
      })),
    }));
}

function renderLog(){
  const el = $("log");
  if(runs.length === 0){ el.innerHTML = ""; return; }
  let html = '<h4>Run log (human attempts = ' + runs.length + ')</h4>';
  runs.forEach(r => {
    html += '<div class="logrow"><span class="n">' + r.global_attempt_index + '</span><span class="log-main"><strong>' +
      r.shift_label + '</strong> · ' + r.rule_summary + '<span class="reason">' + r.reason_text + '</span></span><span class="res ' +
      (r.ok ? "ok" : "bad") + '">' + (r.ok ? "Success" : "Fail") + '</span></div>';
  });
  el.innerHTML = html;
}

function setStatus(text, kind){
  const status = $("status");
  status.textContent = text;
  status.className = "status" + (kind ? " " + kind : "");
}

function closeNotice(){
  const backdrop = $("notice-backdrop");
  if(backdrop) backdrop.hidden = true;
}

function showNotice(message){
  const backdrop = $("notice-backdrop");
  const text = $("notice-message");
  if(!backdrop || !text) return;
  text.textContent = message;
  backdrop.hidden = false;
  $("notice-close")?.focus();
}

function updateFrameButtons(){
  const prev = $("prev");
  const next = $("next");
  const label = $("step-label");
  if(!prev || !next) return;
  const enabled = lastFrames.length > 0;
  prev.disabled = !enabled || frameIndex <= 0;
  next.disabled = !enabled || frameIndex >= lastFrames.length - 1;
  if(label){
    label.textContent = enabled
      ? `Step ${frameIndex} / ${lastFrames.length - 1}`
      : "Step 0 / 0";
  }
}

function showFrameAt(index, updateStatus=true){
  if(!lastFrames.length) return;
  frameIndex = Math.max(0, Math.min(index, lastFrames.length - 1));
  renderFrame(lastFrames[frameIndex]);
  if(updateStatus){
    if(lastResult && frameIndex === lastFrames.length - 1){
      setStatus(
        lastResult.curriculumMessage || reasonText(lastResult.reason, lastResult),
        lastResult.ok ? "ok" : "bad",
      );
    }else{
      setStatus(`Step ${frameIndex}/${lastFrames.length - 1}`, "");
    }
  }
}

function currentNorms(){
  return rules
    .filter(rule => rule.conds.length > 0)
    .map(rule => ({
      action:"MOVE",
      conds:rule.conds.map(condition => ({
        p:condition.p,
        v:condition.v,
        negated:!!condition.negated,
      })),
    }));
}

function libraryNorms(){
  return library
    .filter(entry => entry.rule && entry.rule.conds && entry.rule.conds.length > 0)
    .map(entry => ({
      action:"MOVE",
      conds:entry.rule.conds.map(condition => ({
        p:condition.p,
        v:condition.v,
        negated:!!condition.negated,
      })),
    }));
}

function play(){
  if(timer){ clearInterval(timer); timer = null; }
  const norms = currentNorms();
  const result = simulate(scn, norms);
  const availableBefore = new Set(unlockedTasks().map(task => task.id));
  const shiftState = shiftStates[scn.id];
  shiftState.visited = true;
  shiftState.lastOk = result.ok;
  shiftState.testedRevision = rulebookRevision;
  shiftState.attempts += 1;
  if(!FREE_ORDER && result.ok){
    const newlyUnlocked = unlockedTasks().filter(task => !availableBefore.has(task.id));
    if(newlyUnlocked.length){
      result.curriculumMessage =
        `Scene complete. Available next: ${newlyUnlocked.map(task => task.label).join(", ")}.`;
      newlyUnlocked.forEach(task => recordRuleEvent("shift_unlocked", {
        unlocked_shift_id:task.id,
        unlocked_shift_index:TASKS.indexOf(task),
        unlocked_by_shift_id:scn.id,
      }));
    }else if(unlockedTasks().length === TASKS.length &&
             TASKS.every(task => shiftStates[task.id].lastOk)){
      result.curriculumMessage = "Curriculum complete.";
    }
  }
  lastResult = result;
  lastFrames = result.frames || [];
  frameIndex = 0;
  const now = Date.now();
  const record = {
    participant_id: null,
    experiment_version:RAW_LIBRARY.experiment_version || 2,
    shift_id: scn.id,
    shift_label: scn.label,
    shift_attempt_index:shiftState.attempts,
    global_attempt_index:runs.length + 1,
    rulebook_revision:rulebookRevision,
    rule_summary: ruleSummary(),
    rule_json: ruleJson(),
    active_rule_ids:rules.map(rule => rule.id),
    active_library_rule_ids:rules.map(rule => rule.sourceLibraryId).filter(Boolean),
    saved_library_rule_ids:library.map(entry => entry.id),
    ok: result.ok,
    reason: result.reason,
    reason_text: reasonText(result.reason, result),
    curriculum_message:result.curriculumMessage || null,
    frames: result.frames,
    agent_report: result.frames.length ? result.frames[result.frames.length - 1].agents : {},
    time_from_trial_start_ms: now - trialStartedAt,
    time_from_experiment_start_ms: now - experimentStartedAt,
    time_from_last_attempt_ms: now - lastAttemptAt,
    rule_construction_events: ruleEvents.slice(lastRuleEventIndex),
    timestamp: new Date(now).toISOString(),
  };
  runs.push(record);
  lastRuleEventIndex = ruleEvents.length;
  lastAttemptAt = now;
  renderLog();
  buildTabs();

  if(lastFrames.length) showFrameAt(0, false);
  setStatus("Running...", "");
  timer = setInterval(() => {
    if(frameIndex < lastFrames.length - 1){
      showFrameAt(frameIndex + 1, false);
    }
    if(frameIndex >= lastFrames.length - 1){
      clearInterval(timer);
      timer = null;
      setStatus(
        result.curriculumMessage || reasonText(result.reason, result),
        result.ok ? "ok" : "bad",
      );
    }
  }, 280);
}

function resetBoard(){
  if(timer){ clearInterval(timer); timer = null; }
  lastResult = null;
  lastFrames = [];
  frameIndex = 0;
  buildBoard();
  setStatus("The board has been reset.", "");
  updateFrameButtons();
}

function renderCourseResults(results){
  const box = $("course-results");
  if(!box) return;
  box.hidden = false;
  box.innerHTML = "";

  const heading = document.createElement("div");
  heading.className = "course-results-heading";
  heading.textContent = "All scenes";
  box.appendChild(heading);

  const summary = document.createElement("div");
  summary.className = "course-results-summary";
  const solved = results.filter(row => row.result.ok).length;
  summary.textContent = `${solved} of ${results.length} scenes solved with the working rulebook`;
  box.appendChild(summary);

  const list = document.createElement("div");
  list.className = "course-result-list";
  results.forEach(({task, result}) => {
    const row = document.createElement("div");
    row.className = `course-result ${result.ok ? "ok" : "bad"}`;
    const label = document.createElement("span");
    label.textContent = task.label;
    const outcome = document.createElement("span");
    outcome.textContent = result.ok ? "Solved" : "Not solved";
    row.append(label, outcome);
    list.appendChild(row);
  });
  box.appendChild(list);
}

function runAllScenes(){
  if(timer){ clearInterval(timer); timer = null; }
  const norms = currentNorms();
  const results = TASKS.map(task => ({task, result:simulate(task, norms)}));
  const solved = results.filter(row => row.result.ok).length;
  renderCourseResults(results);
  recordRuleEvent("rulebook_scope_checked", {
    solved_shifts:solved,
    total_shifts:TASKS.length,
    scope:"working_rulebook_across_all_scenes",
    active_rule_ids:rules.map(rule => rule.id),
    saved_library_rule_ids:library.map(entry => entry.id),
    outcomes:results.map(({task, result}) => ({
      shift_id:task.id,
      ok:result.ok,
      reason:result.reason,
    })),
  });
  setStatus(
    solved === TASKS.length
      ? "The working rulebook solves every scene."
      : `The working rulebook solves ${solved} of ${TASKS.length} scenes.`,
    solved === TASKS.length ? "ok" : "bad",
  );
}

function checkWholeRulebook(){
  runAllScenes();
}

function download(name, mime, content){
  const blob = new Blob([content], { type:mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJson(){
  download("norm-task-log.json", "application/json", JSON.stringify(runs, null, 2));
}

function exportCsv(){
  const cols = ["shift_id","shift_label","shift_attempt_index","global_attempt_index","rulebook_revision","active_rule_ids","active_library_rule_ids","saved_library_rule_ids","ok","reason","rule_summary","time_from_trial_start_ms","time_from_experiment_start_ms","time_from_last_attempt_ms","timestamp"];
  const esc = v => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  const rows = [cols.join(",")].concat(runs.map(r => cols.map(c => esc(r[c])).join(",")));
  download("norm-task-log.csv", "text/csv", rows.join("\n") + "\n");
}

function renderAll(){
  buildTabs();
  renderSceneGoal();
  buildBoard();
  renderRules();
  renderLegend();
  renderLog();
}

if(!TASKS.length){
  setStatus("Could not find data/tasks.generated.js. Run python3 solver/task_generator.py first.", "bad");
}else{
  const researcherPanel = $("researcher-panel");
  if(researcherPanel) researcherPanel.hidden = !DEBUG_UI;
  $("run").onclick = play;
  $("reset").onclick = resetBoard;
  $("prev").onclick = () => showFrameAt(frameIndex - 1);
  $("next").onclick = () => showFrameAt(frameIndex + 1);
  $("guide-close").onclick = closeSceneGuide;
  $("guide-backdrop").onclick = event => {
    if(event.target.id === "guide-backdrop") closeSceneGuide();
  };
  $("notice-close").onclick = closeNotice;
  $("notice-backdrop").onclick = event => {
    if(event.target.id === "notice-backdrop") closeNotice();
  };
  document.addEventListener("keydown", event => {
    if(event.key === "Escape") {
      closeSceneGuide();
      closeNotice();
    }
  });
  $("addrule").onclick = () => {
    const rule = { id:nextRuleId++, action:"MOVE", conds:[], editor:null };
    rules.push(rule);
    recordRuleEvent("rule_added", {rule_id:rule.id, rule_index:rules.length - 1});
    renderRules();
  };
  $("export-json").onclick = exportJson;
  $("export-csv").onclick = exportCsv;
  rules = sceneRuleDrafts.get(scn.id) || [];
  renderAll();
  if(!initialSceneChosen && FREE_ORDER){
    setTimeout(() => showScenePicker(), 0);
  }else if(shouldAutoShowGuide(scn)){
    setTimeout(() => showSceneGuide(), 0);
  }
}
