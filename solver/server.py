"""
Local backend for the norm task.  The interface is a thin client; THIS computes
everything:
  - generates the tasks with lab.generate()
  - precomputes ground truth (minimal #norms, search cost) with lab.minimal_normset()
  - on each human run, rebuilds the World and runs the REAL engine simulate(trace=True)
    for the success verdict + animation frames
  - logs every run (the human search trajectory) to logs/run_log.jsonl

Run:   python3 server.py      then open http://localhost:8000
"""
import json, os, time, http.server, socketserver
import lab
from wh_engine import simulate, norm_str

HERE = os.path.dirname(os.path.abspath(__file__))
CLIENT = os.path.join(HERE, "client.html")
LOGDIR = os.path.join(HERE, "logs")
os.makedirs(LOGDIR, exist_ok=True)

LABELS = {
    ("dest_zone", "cold"): "目标格是冷链区", ("dest_zone", "fragile"): "目标格是易碎区",
    ("dest_zone", "secure"): "目标格是安保区",
    ("carrying", "spill"): "机器人带着泄漏物", ("carrying", "glass"): "机器人带着玻璃",
    ("carrying", "valuable"): "机器人带着贵重品",
    ("move_dir", "N"): "机器人向北走", ("move_dir", "S"): "机器人向南走",
    ("move_dir", "E"): "机器人向东走", ("move_dir", "W"): "机器人向西走",
    ("role_not", "cleaner"): "机器人不是清洁工", ("role_not", "carrier"): "机器人不是搬运工",
    ("role", "cleaner"): "机器人是清洁工", ("role", "carrier"): "机器人是搬运工",
    ("contested", True): "另一个机器人也要进该格",
}
VOCAB = [{"p": p, "v": v, "label": LABELS.get((p, v), f"{p}={v}")}
         for (p, v) in lab.GLOBAL_LITERALS]

CONFIGS = [
    ("入库污染",         [0],        False, "搬运工带泄漏物要去对面；另一个要把干净货入库到冷链区。别污染，也别挡住入库。"),
    ("清洁工例外",       [0],        True,  "多了清洁工——它必须带泄漏物进冷链区清理(合法)。规则要放它进去，却拦住别的带泄漏物的机器人。"),
    ("两种危险",         [0, 1],     False, "冷链区 + 易碎区两类危险同时出现，各需各的规则。"),
    ("三种危险",         [0, 1, 2],  False, "冷链 + 易碎 + 安保三类危险叠加。"),
    ("两种 + 清洁工例外", [0, 1],     True,  "两类危险，且每类都有清洁工要进去。"),
]

def serialize(w):
    R, C = lab._dims(w)
    return {
        "rows": R, "cols": C,
        "walls": [list(c) for c in w.walls],
        "zones": {f"{r},{c}": z for (r, c), z in w.zone.items()},
        "agents": [{"id": a.id, "pos": list(a.pos), "target": list(a.goal.target),
                    "role": a.role, "carrying": a.carrying} for a in w.agents],
    }

print("Generating tasks + precomputing ground truth (this takes a moment)…")
TASKS = []
for i, (name, types, rexc, prompt) in enumerate(CONFIGS):
    w = lab.generate(types, role_exc=rexc, name=name)
    t0 = time.time()
    gt = lab.minimal_normset(w)
    TASKS.append({"world": w, "meta": {
        "id": i, "name": name, "prompt": prompt, "grid": serialize(w), "vocab": VOCAB,
        "ground_truth": {"min_norms": gt["k"], "min_mdl": gt["mdl"],
                         "search_cost": gt["search_cost"], "space": gt["space"],
                         "solution": [norm_str(n) for n in (gt["law"] or [])]}}})
    print(f"  [{i}] {name:<16} min_norms={gt['k']}  search_cost={gt['search_cost']}  ({time.time()-t0:.1f}s)")

def build_norms(rules):
    return [("MOVE", [(c[0], c[1]) for c in rule]) for rule in rules]

class H(http.server.BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        b = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path in ("/", "/index.html", "/client.html"):
            with open(CLIENT, "rb") as f:
                self._send(200, f.read(), "text/html")
        elif self.path == "/api/tasks":
            self._send(200, json.dumps([t["meta"] for t in TASKS], ensure_ascii=False))
        else:
            self._send(404, "not found", "text/plain")

    def do_POST(self):
        if self.path != "/api/run":
            self._send(404, "not found", "text/plain"); return
        n = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(n) or b"{}")
        tid = data.get("task_id", 0)
        rules = data.get("rules", [])
        w = TASKS[tid]["world"]
        norms = build_norms(rules)
        ok, reason, frames = simulate(w, norms, trace=True)
        # log the human search step
        with open(os.path.join(LOGDIR, "run_log.jsonl"), "a") as f:
            f.write(json.dumps({"ts": time.time(), "task": tid,
                                "n_rules": len(rules),
                                "n_conditions": sum(len(r) for r in rules),
                                "ok": ok, "reason": reason}, ensure_ascii=False) + "\n")
        self._send(200, json.dumps({"ok": ok, "reason": reason, "frames": frames},
                                   ensure_ascii=False))

if __name__ == "__main__":
    PORT = 8000
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), H) as httpd:
        print(f"\n  ready →  http://localhost:{PORT}\n  (Ctrl-C to stop)")
        httpd.serve_forever()
