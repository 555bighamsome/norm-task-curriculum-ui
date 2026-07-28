/* Solver-backed social-norm engine.  The task definitions come from
 * data/tasks.generated.js, which is produced by solver/task_generator.py. */

const DIRS = { N:[-1,0], S:[1,0], E:[0,1], W:[0,-1] };
const K = (r,c) => r + "," + c;
const COL = ["#d85a30", "#378add", "#1d9e75", "#8b5fbf", "#b36b00", "#56606b", "#b0446f", "#2d7d87", "#746d2f"];

const RAW_LIBRARY = window.TASK_LIBRARY || { global_actions: [], global_vocabulary: [], action_condition_space: {}, tasks: [] };

const ACTION_ZH = { MOVE:"move into a square" };
const LABEL_ZH = {
  "dest_zone:cold": "the destination is cold storage",
  "dest_zone:fragile": "the destination is the fragile zone",
  "dest_zone:secure": "the destination is the secure zone",
  "dest_zone:intersection": "the destination is a bottleneck",
  "carrying:spill": "the robot is carrying a spill",
  "carrying:glass": "the robot is carrying glass",
  "carrying:valuable": "the robot is carrying a valuable item",
  "move_dir:N": "the robot is moving north",
  "move_dir:S": "the robot is moving south",
  "move_dir:E": "the robot is moving east",
  "move_dir:W": "the robot is moving west",
  "role_not:carrier": "the robot is not a carrier",
  "role_not:cleaner": "the robot is not a cleaner",
  "role_not:operator": "the robot is not an operator",
  "role:carrier": "the robot is a carrier",
  "role:cleaner": "the robot is a cleaner",
  "role:operator": "the robot is an operator",
  "contested:true": "the target square is being entered by multiple robots",
  "item_unscanned:true": "the item is unscanned",
  "item_colour:red": "the item is red",
  "item_colour:blue": "the item is blue",
  "machine:packer": "the machine is the packer",
  "no_permit:true": "the robot has no permit",
};

const ROLE_ZH = { carrier:"Carrier", cleaner:"Cleaner", operator:"Operator" };
const CARRY_ZH = { none:"none", spill:"spill", glass:"glass", valuable:"valuable item" };
const ZONE_ZH = { cold:"Cold storage square", fragile:"Fragile zone", secure:"Secure zone", intersection:"Bottleneck", normal:"Available square" };
const ITEM_ZH = { red:"red item", blue:"blue item" };
const MACHINE_ZH = { packer:"Packer", sealer:"Sealer" };

function literalKey(p, v){ return p + ":" + String(v); }
function literalLabel(p, v, fallback){ return LABEL_ZH[literalKey(p, v)] || fallback || `${p}=${v}`; }

function normalizeLiteral(l){
  return {
    p:l.predicate,
    v:l.value,
    negated:!!l.negated,
    object:l.object || null,
    property:l.property || null,
    label:literalLabel(l.predicate, l.value, l.label),
  };
}

const ACTIONS = (RAW_LIBRARY.global_actions || []).map(a => ({
  id: a.id,
  label: ACTION_ZH[a.id] || a.label || a.id,
}));
const VOCAB = RAW_LIBRARY.global_vocabulary.map(normalizeLiteral);
const ACTION_CONDITIONS = {};
Object.keys(RAW_LIBRARY.action_condition_space || {}).forEach(action => {
  ACTION_CONDITIONS[action] = RAW_LIBRARY.action_condition_space[action].map(normalizeLiteral);
});

function normalizeTask(task){
  const zones = {};
  task.world.zones.forEach(z => { zones[K(z.cell[0], z.cell[1])] = z.zone; });
  const items = {};
  (task.world.items || []).forEach(item => {
    items[item.id] = { ...item, cell:item.cell.slice() };
  });
  const machines = {};
  (task.world.machines || []).forEach(machine => {
    machines[machine.id] = { ...machine, cell:machine.cell.slice() };
  });
  const scanners = new Set((task.world.scanners || []).map(c => K(c[0], c[1])));
  return {
    id: task.id,
    level: task.level,
    layer: task.layer ?? task.level,
    prerequisites: task.prerequisites || [],
    label: task.label,
    family: task.family,
    description: task.description,
    participantPrompt: task.participant_prompt,
    activeAgentCount:task.active_agent_count,
    measure: task.measure,
    expectedMinNorms: task.expected_min_norms,
    solver: task.solver,
    baseline: task.baseline,
    rows: task.world.rows,
    cols: task.world.cols,
    walls: new Set(task.world.walls.map(c => K(c[0], c[1]))),
    zones,
    protected: task.world.protected,
    items,
    machines,
    scanners,
    agents: task.world.agents.map(a => ({
      id: a.id,
      pos: a.start.slice(),
      role: a.role,
      carrying: a.carrying,
      active:a.active !== false,
      tokens: a.tokens || [],
      goal: a.goal,
    })),
  };
}

const TASKS = RAW_LIBRARY.tasks.map(normalizeTask);
const CORE_TASK_IDS = new Set(TASKS.map(t => t.id));

function goalCell(task, agent){
  if(agent.goal.kind === "reach" || agent.goal.kind === "deliver") return agent.goal.target;
  if(agent.goal.kind === "operate") return task.machines[agent.goal.machine]?.cell || agent.pos;
  return agent.pos;
}

function zoneOf(world, cell){ return world.zones[K(cell[0],cell[1])] || "normal"; }
function passable(world, cell){
  return cell[0] >= 0 && cell[1] >= 0 && cell[0] < world.rows && cell[1] < world.cols && !world.walls.has(K(cell[0],cell[1]));
}
function sameCell(a, b){ return a && b && a[0] === b[0] && a[1] === b[1]; }

function stepLabel(step){
  if(!step) return "";
  if(step.kind === "move") return `Move to (${step.cell[0]}, ${step.cell[1]})`;
  if(step.kind === "scan") return "Scan item";
  if(step.kind === "pick") return "Pick up item";
  if(step.kind === "use") return `Use ${MACHINE_ZH[step.machine] || step.machine}`;
  return step.kind;
}

function eventAgentIds(event){
  if(!event) return new Set();
  const ids = [];
  if(Array.isArray(event.agents)) ids.push(...event.agents);
  if(event.agent !== undefined && event.agent !== null) ids.push(event.agent);
  return new Set(ids.map(id => String(id)));
}

function atom(ctx, cond){
  if(cond.p === "target_type"){
    if(cond.v === "machine") return Object.values(ctx.world.machines).some(machine => sameCell(machine.cell, ctx.cell));
    return zoneOf(ctx.world, ctx.cell) === cond.v;
  }
  if(cond.p === "dest_zone") return zoneOf(ctx.world, ctx.cell) === cond.v;
  if(cond.p === "carrying") return ctx.agent.carrying === (cond.v === "spill" ? "spill" : cond.v);
  if(cond.p === "role") return ctx.agent.role === cond.v;
  if(cond.p === "role_not") return ctx.agent.role !== cond.v;
  if(cond.p === "contested") return !!ctx.contested === !!cond.v;
  if(cond.p === "move_dir") return ctx.moveDir === cond.v;
  if(cond.p === "item_colour") return !!ctx.item && ctx.item.colour === cond.v;
  if(cond.p === "item_unscanned") return !!ctx.item && !ctx.item.scanned === !!cond.v;
  if(cond.p === "machine") return !!ctx.machine && ctx.machine.id === cond.v;
  if(cond.p === "no_permit") return !ctx.agent.tokens.includes("permit") === !!cond.v;
  return false;
}

const isDynamic = norm => norm.conds.some(c => c.p === "contested");
const matchesNorm = (norm, ctx) =>
  norm.action === ctx.action && norm.conds.every(c => atom(ctx, c) !== !!c.negated);

function staticForbidden(world, agent, staticNorms, action, opts){
  const ctx = { world, agent, action, cell:opts.cell, moveDir:opts.moveDir || null, item:opts.item || null, machine:opts.machine || null, contested:false };
  return staticNorms.some(n => matchesNorm(n, ctx));
}

function stateKey(state){
  return [
    K(state.cell[0], state.cell[1]),
    state.hasItem ? 1 : 0,
    state.used ? 1 : 0,
    state.scanned ? 1 : 0,
    state.heading || "-",
  ].join("|");
}

function plan(world, agent, staticNorms){
  const goal = agent.goal;
  const item = goal.kind === "deliver" ? world.items[goal.item] : null;
  const init = {
    cell:agent.pos.slice(),
    hasItem:false,
    used:false,
    scanned:item ? !!item.scanned : false,
    heading:null,
  };
  const prev = {};
  const best = {};
  let serial = 0;
  const q = [{state:init, steps:0, turns:0, serial:serial++}];
  prev[stateKey(init)] = null;
  best[stateKey(init)] = {steps:0, turns:0};
  let goalState = null;

  function goalReached(state){
    if(goal.kind === "reach") return sameCell(state.cell, goal.target);
    if(goal.kind === "deliver") return state.hasItem && sameCell(state.cell, goal.target);
    if(goal.kind === "operate") return sameCell(state.cell, world.machines[goal.machine].cell);
    return false;
  }

  while(q.length){
    q.sort((left, right) =>
      left.steps - right.steps ||
      left.turns - right.turns ||
      left.serial - right.serial
    );
    const row = q.shift();
    const cur = row.state;
    const currentBest = best[stateKey(cur)];
    if(!currentBest || currentBest.steps !== row.steps || currentBest.turns !== row.turns) continue;
    if(goalReached(cur)){ goalState = cur; break; }
    const succ = [];

    for(const d in DIRS){
      const nxt = [cur.cell[0] + DIRS[d][0], cur.cell[1] + DIRS[d][1]];
      if(passable(world, nxt) && !staticForbidden(world, agent, staticNorms, "MOVE", { cell:nxt, moveDir:d })){
        succ.push({
          step:{ kind:"move", cell:nxt, dir:d },
          state:{ ...cur, cell:nxt, heading:d },
          addedTurns:cur.heading && cur.heading !== d ? 1 : 0,
        });
      }
    }

    if(goal.kind === "deliver" && world.scanners.has(K(cur.cell[0], cur.cell[1])) && !cur.scanned){
      succ.push({
        step:{ kind:"scan", item:item.id },
        state:{ ...cur, scanned:true },
        addedTurns:0,
      });
    }

    if(goal.kind === "deliver" && !cur.hasItem && sameCell(cur.cell, item.cell)){
      const snap = { ...item, scanned:cur.scanned };
      if(!staticForbidden(world, agent, staticNorms, "PICK", { cell:cur.cell, item:snap })){
        succ.push({
          step:{ kind:"pick", item:item.id },
          state:{ ...cur, hasItem:true },
          addedTurns:0,
        });
      }
    }

    for(const successor of succ){
      const key = stateKey(successor.state);
      const nextCost = {
        steps:row.steps + 1,
        turns:row.turns + successor.addedTurns,
      };
      const oldCost = best[key];
      if(
        !oldCost ||
        nextCost.steps < oldCost.steps ||
        (nextCost.steps === oldCost.steps && nextCost.turns < oldCost.turns)
      ){
        best[key] = nextCost;
        prev[key] = { from:stateKey(cur), step:successor.step, state:cur };
        q.push({
          state:successor.state,
          ...nextCost,
          serial:serial++,
        });
      }
    }
  }

  if(!goalState) return null;
  const steps = [];
  let key = stateKey(goalState);
  while(prev[key]){
    steps.push(prev[key].step);
    key = prev[key].from;
  }
  return steps.reverse();
}

function protectedPollution(world, agent, cell){
  const z = zoneOf(world, cell);
  return world.protected.find(p => p.zone === z && p.contaminant === agent.carrying && agent.role !== "cleaner");
}

function snapshot(scn, pos, event, meta={}){
  const out = {};
  Object.keys(pos).forEach(id => { out[id] = pos[id].slice(); });
  const plans = meta.plans || {};
  const ptr = meta.ptr || {};
  const blocked = meta.blocked || new Set();
  const released = meta.released || new Set();
  const intend = meta.intend || {};
  const failedAgent = meta.failedAgent === undefined ? null : String(meta.failedAgent);
  const failureEvent = new Set([
    "no-plan",
    "resource-conflict",
    "collision",
    "jam",
    "machine-order",
    "incident",
    "pollution",
    "timeout",
  ]).has(event?.type);
  const involved = failureEvent ? eventAgentIds(event) : new Set();
  const agents = {};
  scn.agents.forEach(agent => {
    const id = String(agent.id);
    const plan = plans[agent.id] || plans[id] || [];
    const hasPlan = Object.prototype.hasOwnProperty.call(plans, agent.id) ||
      Object.prototype.hasOwnProperty.call(plans, id);
    const index = ptr[agent.id] ?? ptr[id] ?? 0;
    const done = hasPlan && index >= plan.length;
    const blockedNow = blocked.has(agent.id) || blocked.has(id);
    const releasedNow = released.has(agent.id) || released.has(id);
    const failed = failedAgent === id || involved.has(id);
    let state = "pending";
    if(done) state = "done";
    if(blockedNow) state = "waiting";
    if(failed) state = "failed";
    agents[id] = {
      state:agent.active ? state : "off-duty",
      done,
      offDuty:!agent.active,
      waiting: blockedNow,
      failed,
      released:releasedNow,
      step_index: hasPlan ? index : null,
      step_count: hasPlan ? plan.length : null,
      next_step: hasPlan && !done ? stepLabel(plan[index]) : "",
      intent: intend[agent.id] || intend[id] || null,
    };
  });
  return { pos:out, event:event || null, agents, tick:meta.tick ?? null };
}

function simulate(scn, rules){
  const world = {
    rows:scn.rows,
    cols:scn.cols,
    walls:scn.walls,
    zones:scn.zones,
    protected:scn.protected,
    items:JSON.parse(JSON.stringify(scn.items)),
    machines:scn.machines,
    scanners:scn.scanners,
  };
  Object.values(world.items).forEach(item => { item.cell = item.cell.slice(); });
  const staticNorms = rules.filter(n => !isDynamic(n));
  const dynamicNorms = rules.filter(isDynamic);
  const agentsById = {}, pos = {}, plans = {}, ptr = {};
  const released = new Set();
  const machineEntryCells = {};
  const preparedMachines = new Set();
  scn.agents.forEach(a => { agentsById[a.id] = a; pos[a.id] = a.pos.slice(); });

  for(const agent of scn.agents){
    const p = plan(world, agent, staticNorms);
    if(!p){
      return {
        ok:false,
        reason:"no-plan",
        blockedAgent:agent.id,
        frames:[snapshot(scn, pos, {type:"no-plan", cell:agent.pos, agent:agent.id}, {plans, ptr, failedAgent:agent.id, tick:0})],
      };
    }
    plans[agent.id] = p;
    ptr[agent.id] = 0;
  }

  const frames = [snapshot(scn, pos, null, {plans, ptr, tick:0})];
  const done = id => ptr[id] >= plans[id].length;

  for(let t=0; t<100; t++){
    // Entering a station occupies it for one step. A robot that completes a
    // machine target retreats to its entry square, then releases the station.
    const newlyReleased = [];
    for(const agent of scn.agents){
      if(done(agent.id) && agent.goal.kind === "operate" && !released.has(agent.id)){
        const machine = world.machines[agent.goal.machine];
        if(machine && sameCell(pos[agent.id], machine.cell)) newlyReleased.push(agent);
      }
    }
    if(newlyReleased.length){
      newlyReleased.forEach(agent => {
        pos[agent.id] = (machineEntryCells[agent.id] || pos[agent.id]).slice();
      });
      frames.push(snapshot(scn, pos, {
        type:"machine-retreat",
        cell:world.machines[newlyReleased[0].goal.machine].cell,
        agents:newlyReleased.map(agent => agent.id),
      }, {
        plans,
        ptr,
        released,
        tick:t + 1,
      }));
      newlyReleased.forEach(agent => released.add(agent.id));
      frames.push(snapshot(scn, pos, null, {
        plans,
        ptr,
        released,
        tick:t + 1,
      }));
    }
    if(scn.agents.every(a => done(a.id))){
      return { ok:true, reason:"ok", frames };
    }

    const previousPos = {};
    Object.keys(pos).forEach(id => { previousPos[id] = pos[id].slice(); });

    const intend = {};
    for(const agent of scn.agents){
      const id = agent.id;
      if(done(id)){ intend[id] = { kind:"stay", cell:pos[id], dir:null }; continue; }
      const step = plans[id][ptr[id]];
      if(step.kind === "move") intend[id] = { kind:"move", cell:step.cell, dir:step.dir };
      else intend[id] = { kind:step.kind, cell:pos[id], dir:null, item:step.item, machine:step.machine };
    }

    const targetKey = id => {
      const it = intend[id];
      if(it.kind === "move") return "cell:" + K(it.cell[0], it.cell[1]);
      return "self:" + id;
    };
    const keys = {};
    scn.agents.forEach(a => { keys[a.id] = targetKey(a.id); });

    const blocked = new Set();
    for(const agent of scn.agents){
      const id = agent.id;
      if(done(id)) continue;
      const it = intend[id];
      const contested = scn.agents.some(b => b.id !== id && keys[b.id] === keys[id]);
      const action = { move:"MOVE", pick:"PICK", scan:"SCAN", stay:"MOVE" }[it.kind];
      const ctx = {
        world,
        agent:agentsById[id],
        action,
        cell:it.cell,
        moveDir:it.dir,
        item:it.item ? world.items[it.item] : null,
        machine:it.machine ? world.machines[it.machine] : null,
        contested,
      };
      if(it.kind !== "stay" && dynamicNorms.some(n => matchesNorm(n, ctx))) blocked.add(id);
    }

    const final = {};
    Object.keys(pos).forEach(id => { final[id] = pos[id].slice(); });
    for(const agent of scn.agents){
      const id = agent.id;
      if(!done(id) && !blocked.has(id) && intend[id].kind === "move") final[id] = intend[id].cell;
    }

    const machineCells = new Set(Object.values(world.machines).map(machine => K(machine.cell[0], machine.cell[1])));
    const machineEntries = {};
    for(const agent of scn.agents){
      const id = agent.id;
      if(done(id) || blocked.has(id) || intend[id].kind !== "move") continue;
      const cellKey = K(intend[id].cell[0], intend[id].cell[1]);
      if(!machineCells.has(cellKey)) continue;
      machineEntries[cellKey] = machineEntries[cellKey] || [];
      machineEntries[cellKey].push(id);
    }
    const contestedMachineCell = Object.keys(machineEntries).find(cellKey => machineEntries[cellKey].length > 1);
    if(contestedMachineCell){
      const cell = contestedMachineCell.split(",").map(Number);
      return {
        ok:false,
        reason:"resource-conflict",
        frames:[...frames, snapshot(scn, pos, {
          type:"resource-conflict",
          cell,
          agents:machineEntries[contestedMachineCell],
        }, {plans, ptr, intend, blocked, released, tick:t + 1})],
      };
    }

    const occupants = {};
    for(const id in final){
      if(released.has(Number(id)) || released.has(id)) continue;
      const cellKey = K(final[id][0], final[id][1]);
      occupants[cellKey] = occupants[cellKey] || [];
      occupants[cellKey].push(Number(id));
    }
    const collisionKey = Object.keys(occupants).find(cellKey =>
      occupants[cellKey].length > 1 &&
      occupants[cellKey].some(id => !sameCell(final[id], pos[id]))
    );
    if(collisionKey){
      const cell = collisionKey.split(",").map(Number);
      return {
        ok:false,
        reason:"collision",
        frames:[...frames, snapshot(scn, pos, {
          type:"collision",
          cell,
          agents:occupants[collisionKey],
        }, {plans, ptr, intend, blocked, released, tick:t + 1})],
      };
    }

    for(const a of scn.agents) for(const b of scn.agents) if(a.id < b.id){
      if(released.has(a.id) || released.has(b.id)) continue;
      if(sameCell(final[a.id], pos[b.id]) && sameCell(final[b.id], pos[a.id]) && !sameCell(pos[a.id], pos[b.id])){
        return {
          ok:false,
          reason:"collision",
          frames:[...frames, snapshot(scn, pos, {
            type:"collision",
            cell:final[a.id],
            agents:[a.id, b.id],
          }, {plans, ptr, intend, blocked, released, tick:t + 1})],
        };
      }
    }

    Object.keys(final).forEach(id => { pos[id] = final[id]; });

    for(const agent of scn.agents){
      const id = agent.id;
      if(done(id) || blocked.has(id)) continue;
      const step = plans[id][ptr[id]];
      if(step.kind === "move"){
        if(sameCell(pos[id], step.cell)){
          const machine = Object.values(world.machines).find(row => sameCell(row.cell, pos[id]));
          if(machine && agent.goal.kind === "operate" && !machineEntryCells[id]){
            machineEntryCells[id] = previousPos[id].slice();
          }
          if(machine?.needs_permit && !agent.tokens.includes("permit")){
            return {
              ok:false,
              reason:"jam",
              frames:[...frames, snapshot(scn, pos, {type:"jam", cell:machine.cell, agent:id}, {plans, ptr, intend, blocked, released, tick:t + 1})],
            };
          }
          if(machine?.setup_role){
            if(!preparedMachines.has(machine.id) && agent.role !== machine.setup_role){
              return {
                ok:false,
                reason:"machine-order",
                frames:[...frames, snapshot(scn, pos, {
                  type:"machine-order",
                  cell:machine.cell,
                  agent:id,
                  machine:machine.id,
                  required_role:machine.setup_role,
                }, {plans, ptr, intend, blocked, released, tick:t + 1})],
              };
            }
            if(agent.role === machine.setup_role) preparedMachines.add(machine.id);
          }
          ptr[id]++;
        }
      }else if(step.kind === "scan"){
        world.items[step.item].scanned = true;
        ptr[id]++;
      }else if(step.kind === "pick"){
        const item = world.items[step.item];
        if(item.hazardous && !item.scanned){
          return {
            ok:false,
            reason:"incident",
            frames:[...frames, snapshot(scn, pos, {type:"incident", cell:item.cell, agent:id}, {plans, ptr, intend, blocked, released, tick:t + 1})],
          };
        }
        ptr[id]++;
      }
    }

    for(const agent of scn.agents){
      if(released.has(agent.id)) continue;
      const pollution = protectedPollution(world, agent, pos[agent.id]);
      if(pollution){
        return {
          ok:false,
          reason:"pollution:" + pollution.zone,
          frames:[...frames, snapshot(scn, pos, {type:"pollution", cell:pos[agent.id], agent:agent.id}, {plans, ptr, intend, blocked, released, tick:t + 1})],
        };
      }
    }

    frames.push(snapshot(scn, pos, null, {plans, ptr, intend, blocked, released, tick:t + 1}));
  }

  return { ok:false, reason:"timeout", frames:[...frames, snapshot(scn, pos, {type:"timeout", cell:scn.agents[0].pos}, {plans, ptr, tick:100})] };
}

const REASON = {
  ok: "All robots completed their targets.",
  collision: "Two robots collided.",
  timeout: "The robots got stuck and the task failed.",
  "no-plan": "A rule is too restrictive, so a robot has no path.",
  incident: "A hazardous item was picked up before being scanned.",
  jam: "A robot entered a machine station without a permit, so the machine jammed.",
  "resource-conflict": "Two robots tried to enter the same machine station at the same time.",
  "machine-order": "A carrier entered a machine before an operator prepared it.",
};

function lastEvent(result){
  if(!result || !result.frames || result.frames.length === 0) return null;
  return result.frames[result.frames.length - 1].event || null;
}

function agentListText(ids){
  if(!ids || !ids.length) return "";
  return ids.map(id => `Robot ${id}`).join(" and ");
}

function reasonText(reason, result=null){
  const event = lastEvent(result);
  const agents = agentListText(event?.agents || (event?.agent !== undefined ? [event.agent] : []));
  if(reason && reason.startsWith("pollution:")){
    const zone = reason.split(":")[1];
    return `${ZONE_ZH[zone] || zone} was contaminated${agents ? " by " + agents : ""}.`;
  }
  if(reason === "no-plan" && result?.blockedAgent !== undefined) return `A rule is too restrictive, so Robot ${result.blockedAgent} has no path.`;
  if(reason === "collision" && agents) return `${agents} collided.`;
  if(reason === "resource-conflict" && agents) return `${agents} tried to enter the same machine station at the same time.`;
  if(reason === "incident" && agents) return `${agents} picked up a hazardous item before scanning it.`;
  if(reason === "jam" && agents) return `${agents} entered a machine station without a permit.`;
  if(reason === "machine-order" && agents) return `${agents} entered the machine before an operator prepared it.`;
  return REASON[reason] || reason || "The task failed.";
}
