/* Pre-task tutorial for the curriculum version of Shared Rulebook.
 *
 * It teaches only the interface and the warehouse's base mechanics. Special
 * elements such as cold storage, machines, Cleaners, and Operators remain for
 * the curriculum to introduce.
 */

(function(){
"use strict";

const CELL = 42;
const STEP_MS = 420;

let emit = () => {};
let finish = () => {};

const state = {
  page:0,
  result:null,
  frames:[],
  frameIndex:0,
  timer:null,
  startedAt:0,
  pageStartedAt:0,
  pageVisits:[],
  runs:[],
};

function makeScene(id, walls, agents){
  return normalizeTask({
    id,
    level:0,
    layer:0,
    prerequisites:[],
    label:id,
    family:"tutorial",
    description:"",
    participant_prompt:"",
    active_agent_count:agents.length,
    measure:"",
    expected_min_norms:null,
    solver:null,
    baseline:null,
    world:{
      rows:5,
      cols:7,
      walls,
      zones:[],
      protected:[],
      items:[],
      machines:[],
      scanners:[],
      agents,
    },
  });
}

function carrier(id, start, target){
  return {
    id,
    start,
    role:"carrier",
    carrying:"none",
    active:true,
    tokens:[],
    goal:{kind:"reach", target},
  };
}

const MOVEMENT_SCENE = makeScene(
  "tutorial_movement",
  [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[2,3]],
  [carrier(0, [2,0], [2,6])],
);

const COLLISION_SCENE = makeScene(
  "tutorial_collision",
  [[0,0],[0,1],[0,2],[0,4],[0,5],[0,6],[4,0],[4,1],[4,2],[4,4],[4,5],[4,6]],
  [
    carrier(0, [2,1], [2,5]),
    carrier(1, [0,3], [4,3]),
  ],
);

const PAGES = [
  {
    id:"goal",
    title:"What you need to do",
    lead:"In each scene, build shared rules that let every active robot complete its target without causing a failure.",
    points:[
      "Each robot has a number and a colour.",
      "The dashed square with the same number and colour is that robot's target.",
      "Available squares can be entered. Dark squares are walls.",
      "You write rules for the robots; you do not move them directly.",
    ],
    scene:MOVEMENT_SCENE,
    controls:false,
    initialNote:"Robot 0 and its dashed target use the same number and colour.",
  },
  {
    id:"movement",
    title:"How robots move",
    lead:"Press Run to watch Robot 0 plan a route around the wall and reach its target.",
    points:[
      "A robot moves one square during each time step.",
      "It chooses the shortest legal route. If routes are equally short, it prefers fewer turns.",
      "A wall changes the route; it does not stop the robot from planning.",
      "Use the arrows after a run to inspect the movement one step at a time.",
    ],
    scene:MOVEMENT_SCENE,
    controls:true,
    initialNote:"Press Run to see the planned route.",
  },
  {
    id:"simultaneous",
    title:"Robots move at the same time",
    lead:"Press Run to see what happens when two independently planned routes cross.",
    points:[
      "All active robots act during the same time step.",
      "If multiple robots try to enter the same square in the same step, they collide.",
      "The scene is solved only when every active robot completes its target.",
      "Run feedback identifies what happened; the arrows show where it happened.",
    ],
    scene:COLLISION_SCENE,
    controls:true,
    initialNote:"Both robots are heading toward the centre square.",
  },
  {
    id:"rules",
    title:"Build, test, and refine rules",
    lead:"A shared rule removes a move from every robot whenever all of its conditions are true.",
    points:[
      "Rules use the form FORBID MOVE INTO A SQUARE WHEN [conditions].",
      "Use IS when a fact must hold and IS NOT when it must not hold.",
      "Conditions joined by AND must all be true for the rule to apply.",
      "Rules apply to every robot in the current scene.",
    ],
    ruleReference:true,
  },
];

const el = id => document.getElementById(id);

function stopAnimation(){
  if(state.timer !== null){
    clearInterval(state.timer);
    state.timer = null;
  }
}

function drawBoard(host, scene, frame=null){
  host.innerHTML = "";
  host.style.width = `${scene.cols * CELL}px`;
  host.style.height = `${scene.rows * CELL}px`;

  for(let row = 0; row < scene.rows; row += 1){
    for(let col = 0; col < scene.cols; col += 1){
      const cell = document.createElement("div");
      const blocked = !passable(scene, [row, col]);
      cell.className = blocked ? "cell wall" : "cell zone-normal";
      cell.style.left = `${col * CELL}px`;
      cell.style.top = `${row * CELL}px`;
      cell.style.width = `${blocked ? CELL : CELL - 4}px`;
      cell.style.height = `${blocked ? CELL : CELL - 4}px`;
      cell.dataset.tutorialCell = K(row, col);
      host.appendChild(cell);
    }
  }

  scene.agents.forEach(agent => {
    const target = goalCell(scene, agent);
    const ring = document.createElement("div");
    ring.className = "ring";
    ring.style.left = `${target[1] * CELL}px`;
    ring.style.top = `${target[0] * CELL}px`;
    ring.style.width = `${CELL - 4}px`;
    ring.style.height = `${CELL - 4}px`;
    ring.style.borderColor = COL[agent.id % COL.length];
    ring.style.setProperty("--agent-color", COL[agent.id % COL.length]);
    ring.innerHTML = `<span class="target-label target-label-corner-0">${agent.id}</span>`;
    host.appendChild(ring);
  });

  scene.agents.forEach(agent => {
    const position = frame?.pos?.[agent.id] || agent.pos;
    const meta = frame?.agents?.[agent.id] || frame?.agents?.[String(agent.id)] || {};
    const robot = document.createElement("div");
    robot.className = "robot";
    robot.classList.toggle("done", !!meta.done);
    robot.classList.toggle("failed", !!meta.failed);
    robot.style.left = `${position[1] * CELL + 7}px`;
    robot.style.top = `${position[0] * CELL + 7}px`;
    robot.style.width = `${CELL - 14}px`;
    robot.style.height = `${CELL - 14}px`;
    robot.style.background = COL[agent.id % COL.length];
    robot.innerHTML = icon("carrier", "robot-role") +
      `<span class="robot-id">${agent.id}</span>` +
      (meta.failed ? icon("failed", "robot-state-mark") : "") +
      (meta.done ? icon("done", "robot-state-mark") : "");
    host.appendChild(robot);
  });

  const eventCell = frame?.event?.cell;
  if(eventCell){
    host.querySelector(`[data-tutorial-cell="${K(eventCell[0], eventCell[1])}"]`)?.classList.add("flash");
  }
}

function feedbackEntry(result){
  if(result.ok){
    const steps = Math.max(0, result.frames.length - 1);
    return {
      kind:"ok",
      title:"Solved",
      text:`Every robot completed its target in ${steps} steps.`,
    };
  }
  if(result.reason === "collision"){
    const event = result.frames[result.frames.length - 1]?.event;
    const names = (event?.agents || []).map(id => `Robot ${id}`).join(" and ");
    return {
      kind:"bad",
      title:"Collision",
      text:`${names || "The robots"} tried to enter the same square in the same step.`,
    };
  }
  return {
    kind:"bad",
    title:"Not solved",
    text:reasonText(result.reason, result),
  };
}

function setFeedback(entry, plainText=""){
  const box = el("tut-feedback");
  box.className = "tut-feedback" + (entry ? ` ${entry.kind}` : "");
  if(entry){
    box.innerHTML = `<strong>${entry.title}</strong><span>${entry.text}</span>`;
  }else{
    box.textContent = plainText;
  }
}

function showFrame(index, inspected=false){
  const page = PAGES[state.page];
  if(!page.scene || !state.frames.length) return;
  state.frameIndex = Math.max(0, Math.min(index, state.frames.length - 1));
  drawBoard(el("tut-board"), page.scene, state.frames[state.frameIndex]);
  el("tut-step-label").textContent = `Step ${state.frameIndex} / ${state.frames.length - 1}`;
  el("tut-prev").disabled = state.frameIndex === 0;
  el("tut-next-step").disabled = state.frameIndex === state.frames.length - 1;
  if(state.frameIndex === state.frames.length - 1) setFeedback(feedbackEntry(state.result));
  if(inspected){
    emit("tutorial_step_inspected", {
      tutorial_page:page.id,
      step_index:state.frameIndex,
    });
  }
}

function runCurrentScene(){
  const page = PAGES[state.page];
  if(!page.scene) return;
  stopAnimation();
  state.result = simulate(page.scene, []);
  state.frames = state.result.frames || [];
  state.frameIndex = 0;
  state.runs.push({
    page_id:page.id,
    ok:state.result.ok,
    reason:state.result.reason,
    timestamp:new Date().toISOString(),
  });
  emit("tutorial_run", {
    tutorial_page:page.id,
    ok:state.result.ok,
    reason:state.result.reason,
  });
  setFeedback(null);
  showFrame(0);
  state.timer = setInterval(() => {
    if(state.frameIndex < state.frames.length - 1){
      showFrame(state.frameIndex + 1);
      return;
    }
    stopAnimation();
  }, STEP_MS);
}

function resetCurrentScene(){
  const page = PAGES[state.page];
  stopAnimation();
  state.result = null;
  state.frames = [];
  state.frameIndex = 0;
  if(page.scene) drawBoard(el("tut-board"), page.scene);
  el("tut-step-label").textContent = "Step 0 / 0";
  el("tut-prev").disabled = true;
  el("tut-next-step").disabled = true;
  setFeedback(null, page.initialNote || "");
}

function ruleReferenceMarkup(){
  return `
    <div class="tut-rule-example" aria-label="Rule structure">
      <div class="tut-rule-action"><span>FORBID</span><strong>MOVE INTO A SQUARE</strong></div>
      <div class="tut-rule-cond"><span>WHEN</span><b>[condition]</b></div>
      <div class="tut-rule-cond"><span>AND</span><b>[optional condition]</b></div>
    </div>
    <div class="tut-workflow">
      <div><span>1</span><strong>Run</strong><small>Observe what happens.</small></div>
      <div><span>2</span><strong>Add Rule</strong><small>Choose the conditions.</small></div>
      <div><span>3</span><strong>Run again</strong><small>Inspect the result and revise.</small></div>
      <div><span>4</span><strong>Save useful rules</strong><small>Reuse them in later scenes if helpful.</small></div>
    </div>
  `;
}

function recordPageVisit(){
  if(!state.pageStartedAt) return;
  state.pageVisits.push({
    page_id:PAGES[state.page].id,
    duration_ms:Date.now() - state.pageStartedAt,
  });
}

function renderPage(index){
  recordPageVisit();
  stopAnimation();
  state.page = Math.max(0, Math.min(index, PAGES.length - 1));
  state.pageStartedAt = Date.now();
  const page = PAGES[state.page];

  el("tut-title").textContent = page.title;
  el("tut-lead").textContent = page.lead;
  el("tut-points").innerHTML = page.points.map(point => `<li>${point}</li>`).join("");

  const visual = el("tut-visual");
  const ruleReference = el("tut-rule-reference");
  visual.hidden = !page.scene;
  ruleReference.hidden = !page.ruleReference;

  if(page.scene){
    el("tut-controls").hidden = !page.controls;
    resetCurrentScene();
  }
  if(page.ruleReference) ruleReference.innerHTML = ruleReferenceMarkup();

  el("tut-progress-label").textContent = `${state.page + 1} of ${PAGES.length}`;
  el("tut-progress-bar").style.width = `${((state.page + 1) / PAGES.length) * 100}%`;
  el("tut-back").disabled = state.page === 0;
  el("tut-continue").textContent = state.page === PAGES.length - 1 ? "Start task" : "Next";
  el("tut-continue").disabled = false;
  el("tut-dots").innerHTML = PAGES.map((row, pageIndex) => {
    const className = pageIndex === state.page ? "is-active" : pageIndex < state.page ? "is-complete" : "";
    return `<span class="${className}"></span>`;
  }).join("");

  emit("tutorial_page_viewed", {
    tutorial_page:page.id,
    tutorial_page_index:state.page,
  });
}

function completeTutorial(){
  recordPageVisit();
  stopAnimation();
  window.tutorialReport = {
    duration_ms:Date.now() - state.startedAt,
    page_visits:state.pageVisits,
    runs:state.runs,
  };
  emit("tutorial_completed", {
    duration_ms:window.tutorialReport.duration_ms,
    run_count:state.runs.length,
  });
  el("tutorial-screen").hidden = true;
  document.body.classList.remove("tutorial-active");
  document.querySelector(".wrap")?.removeAttribute("aria-hidden");
  finish();
}

function bind(){
  el("tut-run").onclick = runCurrentScene;
  el("tut-reset").onclick = resetCurrentScene;
  el("tut-prev").onclick = () => {
    stopAnimation();
    showFrame(state.frameIndex - 1, true);
  };
  el("tut-next-step").onclick = () => {
    stopAnimation();
    showFrame(state.frameIndex + 1, true);
  };
  el("tut-back").onclick = () => renderPage(state.page - 1);
  el("tut-continue").onclick = () => {
    if(state.page === PAGES.length - 1) completeTutorial();
    else renderPage(state.page + 1);
  };
}

window.ResearchTutorial = {
  start(options={}){
    emit = options.log || (() => {});
    finish = options.onComplete || (() => {});
    const screen = el("tutorial-screen");
    if(!screen){
      finish();
      return;
    }
    state.startedAt = Date.now();
    state.pageStartedAt = 0;
    document.body.classList.add("tutorial-active");
    document.querySelector(".wrap")?.setAttribute("aria-hidden", "true");
    screen.hidden = false;
    bind();
    emit("tutorial_started", {page_count:PAGES.length});
    renderPage(0);
    el("tut-continue").focus();
  },
};

})();
