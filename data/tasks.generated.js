window.TASK_LIBRARY = {
  "experiment_version": 7,
  "title": "Shared Rulebook",
  "objective": "Solve each scene with shared rules. Save useful rules and reuse them in later scenes when helpful.",
  "world_rules": [
    "Every scene uses a 10 by 10 warehouse and the same rule language. Walls shape which routes are available.",
    "Robots choose the shortest legal route. If routes are equally short, they choose the one with fewer turns.",
    "If multiple robots enter the same square in the same step, they collide.",
    "A robot that reaches a floor target stops there. A robot that finishes at a machine returns to the square it entered from.",
    "A target square is being entered by multiple robots when at least two robots currently intend to enter it.",
    "Carrying a spill into cold storage can contaminate the shared area. A cleaner can enter with a spill without causing contamination.",
    "A machine is used by entering its square. Only one robot can enter it per step.",
    "At setup machines, an operator must enter first to prepare the station; a carrier can enter after the operator releases it.",
    "Within a scene, every active rule applies to every robot."
  ],
  "rule_schema": {
    "action": {
      "id": "MOVE",
      "label": "MOVE INTO A SQUARE"
    },
    "operators": [
      {
        "id": "IS",
        "label": "IS"
      },
      {
        "id": "IS_NOT",
        "label": "IS NOT"
      }
    ],
    "fields": [
      {
        "id": "target_type",
        "object": "Target square",
        "predicate": "target_type",
        "values": [
          {
            "id": "cold",
            "label": "cold storage"
          },
          {
            "id": "machine",
            "label": "a machine station"
          }
        ]
      },
      {
        "id": "contested",
        "object": "Target square",
        "predicate": "contested",
        "values": [
          {
            "id": true,
            "label": "being entered by multiple robots"
          }
        ]
      },
      {
        "id": "role",
        "object": "Robot",
        "predicate": "role",
        "values": [
          {
            "id": "carrier",
            "label": "a carrier"
          },
          {
            "id": "cleaner",
            "label": "a cleaner"
          },
          {
            "id": "operator",
            "label": "an operator"
          }
        ]
      },
      {
        "id": "carrying",
        "object": "Robot",
        "predicate": "carrying",
        "values": [
          {
            "id": "spill",
            "label": "carrying a spill"
          }
        ]
      },
      {
        "id": "move_dir",
        "object": "Movement",
        "predicate": "move_dir",
        "values": [
          {
            "id": "N",
            "label": "northbound"
          },
          {
            "id": "S",
            "label": "southbound"
          },
          {
            "id": "E",
            "label": "eastbound"
          },
          {
            "id": "W",
            "label": "westbound"
          }
        ]
      }
    ],
    "max_conditions": 8,
    "canonical_rule_count": 5669,
    "canonicalization": "The interface accepts up to eight conditions. The exact solver collapses logically equivalent categorical descriptions."
  },
  "global_actions": [
    {
      "id": "MOVE",
      "label": "move into a square"
    }
  ],
  "global_vocabulary": [
    {
      "object": "Target square",
      "property": "target_type",
      "predicate": "target_type",
      "value": "cold",
      "negated": false,
      "label": "cold storage"
    },
    {
      "object": "Target square",
      "property": "target_type",
      "predicate": "target_type",
      "value": "cold",
      "negated": true,
      "label": "cold storage"
    },
    {
      "object": "Target square",
      "property": "target_type",
      "predicate": "target_type",
      "value": "machine",
      "negated": false,
      "label": "a machine station"
    },
    {
      "object": "Target square",
      "property": "target_type",
      "predicate": "target_type",
      "value": "machine",
      "negated": true,
      "label": "a machine station"
    },
    {
      "object": "Target square",
      "property": "contested",
      "predicate": "contested",
      "value": true,
      "negated": false,
      "label": "being entered by multiple robots"
    },
    {
      "object": "Target square",
      "property": "contested",
      "predicate": "contested",
      "value": true,
      "negated": true,
      "label": "being entered by multiple robots"
    },
    {
      "object": "Robot",
      "property": "role",
      "predicate": "role",
      "value": "carrier",
      "negated": false,
      "label": "a carrier"
    },
    {
      "object": "Robot",
      "property": "role",
      "predicate": "role",
      "value": "carrier",
      "negated": true,
      "label": "a carrier"
    },
    {
      "object": "Robot",
      "property": "role",
      "predicate": "role",
      "value": "cleaner",
      "negated": false,
      "label": "a cleaner"
    },
    {
      "object": "Robot",
      "property": "role",
      "predicate": "role",
      "value": "cleaner",
      "negated": true,
      "label": "a cleaner"
    },
    {
      "object": "Robot",
      "property": "role",
      "predicate": "role",
      "value": "operator",
      "negated": false,
      "label": "an operator"
    },
    {
      "object": "Robot",
      "property": "role",
      "predicate": "role",
      "value": "operator",
      "negated": true,
      "label": "an operator"
    },
    {
      "object": "Robot",
      "property": "carrying",
      "predicate": "carrying",
      "value": "spill",
      "negated": false,
      "label": "carrying a spill"
    },
    {
      "object": "Robot",
      "property": "carrying",
      "predicate": "carrying",
      "value": "spill",
      "negated": true,
      "label": "carrying a spill"
    },
    {
      "object": "Movement",
      "property": "move_dir",
      "predicate": "move_dir",
      "value": "N",
      "negated": false,
      "label": "northbound"
    },
    {
      "object": "Movement",
      "property": "move_dir",
      "predicate": "move_dir",
      "value": "N",
      "negated": true,
      "label": "northbound"
    },
    {
      "object": "Movement",
      "property": "move_dir",
      "predicate": "move_dir",
      "value": "S",
      "negated": false,
      "label": "southbound"
    },
    {
      "object": "Movement",
      "property": "move_dir",
      "predicate": "move_dir",
      "value": "S",
      "negated": true,
      "label": "southbound"
    },
    {
      "object": "Movement",
      "property": "move_dir",
      "predicate": "move_dir",
      "value": "E",
      "negated": false,
      "label": "eastbound"
    },
    {
      "object": "Movement",
      "property": "move_dir",
      "predicate": "move_dir",
      "value": "E",
      "negated": true,
      "label": "eastbound"
    },
    {
      "object": "Movement",
      "property": "move_dir",
      "predicate": "move_dir",
      "value": "W",
      "negated": false,
      "label": "westbound"
    },
    {
      "object": "Movement",
      "property": "move_dir",
      "predicate": "move_dir",
      "value": "W",
      "negated": true,
      "label": "westbound"
    }
  ],
  "action_condition_space": {
    "MOVE": [
      {
        "object": "Target square",
        "property": "target_type",
        "predicate": "target_type",
        "value": "cold",
        "negated": false,
        "label": "cold storage"
      },
      {
        "object": "Target square",
        "property": "target_type",
        "predicate": "target_type",
        "value": "cold",
        "negated": true,
        "label": "cold storage"
      },
      {
        "object": "Target square",
        "property": "target_type",
        "predicate": "target_type",
        "value": "machine",
        "negated": false,
        "label": "a machine station"
      },
      {
        "object": "Target square",
        "property": "target_type",
        "predicate": "target_type",
        "value": "machine",
        "negated": true,
        "label": "a machine station"
      },
      {
        "object": "Target square",
        "property": "contested",
        "predicate": "contested",
        "value": true,
        "negated": false,
        "label": "being entered by multiple robots"
      },
      {
        "object": "Target square",
        "property": "contested",
        "predicate": "contested",
        "value": true,
        "negated": true,
        "label": "being entered by multiple robots"
      },
      {
        "object": "Robot",
        "property": "role",
        "predicate": "role",
        "value": "carrier",
        "negated": false,
        "label": "a carrier"
      },
      {
        "object": "Robot",
        "property": "role",
        "predicate": "role",
        "value": "carrier",
        "negated": true,
        "label": "a carrier"
      },
      {
        "object": "Robot",
        "property": "role",
        "predicate": "role",
        "value": "cleaner",
        "negated": false,
        "label": "a cleaner"
      },
      {
        "object": "Robot",
        "property": "role",
        "predicate": "role",
        "value": "cleaner",
        "negated": true,
        "label": "a cleaner"
      },
      {
        "object": "Robot",
        "property": "role",
        "predicate": "role",
        "value": "operator",
        "negated": false,
        "label": "an operator"
      },
      {
        "object": "Robot",
        "property": "role",
        "predicate": "role",
        "value": "operator",
        "negated": true,
        "label": "an operator"
      },
      {
        "object": "Robot",
        "property": "carrying",
        "predicate": "carrying",
        "value": "spill",
        "negated": false,
        "label": "carrying a spill"
      },
      {
        "object": "Robot",
        "property": "carrying",
        "predicate": "carrying",
        "value": "spill",
        "negated": true,
        "label": "carrying a spill"
      },
      {
        "object": "Movement",
        "property": "move_dir",
        "predicate": "move_dir",
        "value": "N",
        "negated": false,
        "label": "northbound"
      },
      {
        "object": "Movement",
        "property": "move_dir",
        "predicate": "move_dir",
        "value": "N",
        "negated": true,
        "label": "northbound"
      },
      {
        "object": "Movement",
        "property": "move_dir",
        "predicate": "move_dir",
        "value": "S",
        "negated": false,
        "label": "southbound"
      },
      {
        "object": "Movement",
        "property": "move_dir",
        "predicate": "move_dir",
        "value": "S",
        "negated": true,
        "label": "southbound"
      },
      {
        "object": "Movement",
        "property": "move_dir",
        "predicate": "move_dir",
        "value": "E",
        "negated": false,
        "label": "eastbound"
      },
      {
        "object": "Movement",
        "property": "move_dir",
        "predicate": "move_dir",
        "value": "E",
        "negated": true,
        "label": "eastbound"
      },
      {
        "object": "Movement",
        "property": "move_dir",
        "predicate": "move_dir",
        "value": "W",
        "negated": false,
        "label": "westbound"
      },
      {
        "object": "Movement",
        "property": "move_dir",
        "predicate": "move_dir",
        "value": "W",
        "negated": true,
        "label": "westbound"
      }
    ]
  },
  "ground_truth_design": {
    "final_trial_reference_rulebook": [
      "FORBID MOVE WHEN [target_type=cold & carrying=spill & role!=cleaner]",
      "FORBID MOVE WHEN [contested=True & move_dir=E]",
      "FORBID MOVE WHEN [target_type=machine & contested=True & role!=operator]"
    ],
    "rule_count": 3,
    "mdl": 8,
    "curriculum_logic": "A broad safety rule is refined by legitimate counterexamples. A road convention and a machine-priority norm are then learned. T7--T9 then require each pair of these three rules, before T10 requires all three together. Earlier scenes do not need to share one rulebook.",
    "recommended_order": [
      "trial_1",
      "trial_2",
      "trial_3",
      "trial_4",
      "trial_5",
      "trial_6",
      "trial_7",
      "trial_8",
      "trial_9",
      "trial_10"
    ]
  },
  "global_solver": {
    "solver": "not_run",
    "global_rulebook_required": false,
    "candidate_rule_count": 5669,
    "calibrated_trial_ids": [],
    "trial_optima": [],
    "final_trial_requirement": {
      "trial_id": "trial_10",
      "minimum_rule_count": 3,
      "minimum_mdl": 9,
      "components_must_have_prior_evidence": true
    },
    "scope_note": "Scenes are solved independently. The library is an optional external memory for carrying successful rules into later scenes."
  },
  "curriculum_prefixes": [],
  "tasks": [
    {
      "id": "trial_1",
      "label": "T1",
      "level": 1,
      "layer": 1,
      "prerequisites": [],
      "family": "shared_rulebook_curriculum",
      "active_agent_count": 1,
      "description": "One robot must reach its target in a warehouse containing cold storage.",
      "participant_prompt": "Run the scene, inspect what goes wrong, and decide whether the shared rulebook should be added to or refined.",
      "analysis": {
        "layer": 1,
        "prerequisites": [],
        "stage": "Safety discovery",
        "evidence_function": "A single visible externality makes a broad protective norm a reasonable first hypothesis.",
        "expected_transition": "no rule -> broad cold-storage protection",
        "selected_variant": "safety_broad",
        "nuisance_score": [
          2,
          7
        ],
        "active_agent_count": 1,
        "contract_satisfied": true,
        "contract": {
          "empty": {
            "ok": false,
            "reason": "pollution:cold",
            "expected_ok": false,
            "expected_reason": "pollution",
            "matches": true
          },
          "broad": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "cargo": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "negated_exception": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          }
        },
        "optimality": null
      },
      "world": {
        "name": "safety_broad",
        "rows": 10,
        "cols": 10,
        "walls": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ],
          [
            0,
            3
          ],
          [
            0,
            4
          ],
          [
            0,
            5
          ],
          [
            0,
            6
          ],
          [
            0,
            7
          ],
          [
            0,
            8
          ],
          [
            0,
            9
          ],
          [
            1,
            0
          ],
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            7
          ],
          [
            1,
            9
          ],
          [
            2,
            0
          ],
          [
            2,
            9
          ],
          [
            3,
            0
          ],
          [
            3,
            2
          ],
          [
            3,
            3
          ],
          [
            3,
            5
          ],
          [
            3,
            6
          ],
          [
            3,
            7
          ],
          [
            3,
            9
          ],
          [
            4,
            0
          ],
          [
            4,
            2
          ],
          [
            4,
            3
          ],
          [
            4,
            5
          ],
          [
            4,
            6
          ],
          [
            4,
            7
          ],
          [
            4,
            9
          ],
          [
            5,
            0
          ],
          [
            5,
            9
          ],
          [
            6,
            0
          ],
          [
            6,
            2
          ],
          [
            6,
            3
          ],
          [
            6,
            5
          ],
          [
            6,
            6
          ],
          [
            6,
            7
          ],
          [
            6,
            9
          ],
          [
            7,
            0
          ],
          [
            7,
            2
          ],
          [
            7,
            3
          ],
          [
            7,
            5
          ],
          [
            7,
            6
          ],
          [
            7,
            7
          ],
          [
            7,
            9
          ],
          [
            8,
            0
          ],
          [
            8,
            9
          ],
          [
            9,
            0
          ],
          [
            9,
            1
          ],
          [
            9,
            2
          ],
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "zones": [
          {
            "cell": [
              5,
              2
            ],
            "zone": "cold"
          },
          {
            "cell": [
              5,
              3
            ],
            "zone": "cold"
          }
        ],
        "protected": [
          {
            "zone": "cold",
            "contaminant": "spill"
          }
        ],
        "agents": [
          {
            "id": 0,
            "start": [
              5,
              1
            ],
            "role": "carrier",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                5,
                8
              ]
            }
          }
        ],
        "items": [],
        "machines": [],
        "scanners": []
      },
      "baseline": {
        "ok": false,
        "reason": "pollution:cold",
        "frames": [
          {
            "pos": {
              "0": [
                5,
                1
              ]
            },
            "carry": {
              "0": "spill"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                5,
                2
              ]
            },
            "carry": {
              "0": "spill"
            },
            "released": [],
            "prepared_machines": [],
            "event": {
              "type": "pollution",
              "cell": [
                5,
                2
              ]
            }
          }
        ]
      }
    },
    {
      "id": "trial_2",
      "label": "T2",
      "level": 1,
      "layer": 1,
      "prerequisites": [],
      "family": "shared_rulebook_curriculum",
      "active_agent_count": 2,
      "description": "Two robots must reach their targets through the warehouse.",
      "participant_prompt": "Run the scene, inspect what goes wrong, and decide whether the shared rulebook should be added to or refined.",
      "analysis": {
        "layer": 1,
        "prerequisites": [],
        "stage": "Road convention discovery",
        "evidence_function": "Two robots approach the same ordinary square. A direction-based yielding convention can coordinate them without assigning IDs.",
        "expected_transition": "no road norm -> contested eastbound yielding",
        "selected_variant": "road_eastbound_yields",
        "nuisance_score": [
          2,
          5
        ],
        "active_agent_count": 2,
        "contract_satisfied": true,
        "contract": {
          "empty": {
            "ok": false,
            "reason": "collision",
            "expected_ok": false,
            "expected_reason": "collision",
            "matches": true
          },
          "yield_east": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "yield_west": {
            "ok": false,
            "reason": "collision",
            "expected_ok": false,
            "expected_reason": "collision",
            "matches": true
          },
          "scoped_yield_east": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          }
        },
        "optimality": null
      },
      "world": {
        "name": "road_eastbound_yields",
        "rows": 10,
        "cols": 10,
        "walls": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ],
          [
            0,
            3
          ],
          [
            0,
            4
          ],
          [
            0,
            5
          ],
          [
            0,
            6
          ],
          [
            0,
            7
          ],
          [
            0,
            8
          ],
          [
            0,
            9
          ],
          [
            1,
            0
          ],
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            7
          ],
          [
            1,
            9
          ],
          [
            2,
            0
          ],
          [
            2,
            9
          ],
          [
            3,
            0
          ],
          [
            3,
            2
          ],
          [
            3,
            3
          ],
          [
            3,
            5
          ],
          [
            3,
            6
          ],
          [
            3,
            7
          ],
          [
            3,
            9
          ],
          [
            4,
            0
          ],
          [
            4,
            2
          ],
          [
            4,
            3
          ],
          [
            4,
            5
          ],
          [
            4,
            6
          ],
          [
            4,
            7
          ],
          [
            4,
            9
          ],
          [
            5,
            0
          ],
          [
            5,
            9
          ],
          [
            6,
            0
          ],
          [
            6,
            2
          ],
          [
            6,
            3
          ],
          [
            6,
            5
          ],
          [
            6,
            6
          ],
          [
            6,
            7
          ],
          [
            6,
            9
          ],
          [
            7,
            0
          ],
          [
            7,
            2
          ],
          [
            7,
            3
          ],
          [
            7,
            5
          ],
          [
            7,
            6
          ],
          [
            7,
            7
          ],
          [
            7,
            9
          ],
          [
            8,
            0
          ],
          [
            8,
            9
          ],
          [
            9,
            0
          ],
          [
            9,
            1
          ],
          [
            9,
            2
          ],
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "zones": [],
        "protected": [
          {
            "zone": "cold",
            "contaminant": "spill"
          }
        ],
        "agents": [
          {
            "id": 0,
            "start": [
              2,
              3
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                2,
                4
              ]
            }
          },
          {
            "id": 1,
            "start": [
              1,
              4
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                5,
                4
              ]
            }
          }
        ],
        "items": [],
        "machines": [],
        "scanners": []
      },
      "baseline": {
        "ok": false,
        "reason": "collision",
        "frames": [
          {
            "pos": {
              "0": [
                2,
                3
              ],
              "1": [
                1,
                4
              ]
            },
            "carry": {
              "0": "none",
              "1": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                2,
                3
              ],
              "1": [
                1,
                4
              ]
            },
            "carry": {
              "0": "none",
              "1": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": {
              "type": "collision",
              "cell": [
                2,
                4
              ],
              "agents": [
                0,
                1
              ]
            }
          }
        ]
      }
    },
    {
      "id": "trial_3",
      "label": "T3",
      "level": 1,
      "layer": 1,
      "prerequisites": [],
      "family": "shared_rulebook_curriculum",
      "active_agent_count": 2,
      "description": "Two robots must complete their targets at the same machine.",
      "participant_prompt": "Run the scene, inspect what goes wrong, and decide whether the shared rulebook should be added to or refined.",
      "analysis": {
        "layer": 1,
        "prerequisites": [],
        "stage": "Machine priority discovery",
        "evidence_function": "An operator must prepare a shared station before a carrier uses it, making role-based priority useful.",
        "expected_transition": "no machine norm -> carrier yields at a contested machine",
        "selected_variant": "machine_operator_setup",
        "nuisance_score": [
          2,
          2
        ],
        "active_agent_count": 2,
        "contract_satisfied": true,
        "contract": {
          "empty": {
            "ok": false,
            "reason": "resource-conflict",
            "expected_ok": false,
            "expected_reason": "resource-conflict",
            "matches": true
          },
          "machine_carrier_priority": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "broad_carrier_priority": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "yield_east": {
            "ok": false,
            "reason": "resource-conflict",
            "expected_ok": false,
            "expected_reason": "resource-conflict",
            "matches": true
          }
        },
        "optimality": null
      },
      "world": {
        "name": "machine_operator_setup",
        "rows": 10,
        "cols": 10,
        "walls": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ],
          [
            0,
            3
          ],
          [
            0,
            4
          ],
          [
            0,
            5
          ],
          [
            0,
            6
          ],
          [
            0,
            7
          ],
          [
            0,
            8
          ],
          [
            0,
            9
          ],
          [
            1,
            0
          ],
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            7
          ],
          [
            1,
            9
          ],
          [
            2,
            0
          ],
          [
            2,
            9
          ],
          [
            3,
            0
          ],
          [
            3,
            2
          ],
          [
            3,
            3
          ],
          [
            3,
            5
          ],
          [
            3,
            6
          ],
          [
            3,
            7
          ],
          [
            3,
            9
          ],
          [
            4,
            0
          ],
          [
            4,
            2
          ],
          [
            4,
            3
          ],
          [
            4,
            5
          ],
          [
            4,
            6
          ],
          [
            4,
            7
          ],
          [
            4,
            9
          ],
          [
            5,
            0
          ],
          [
            5,
            9
          ],
          [
            6,
            0
          ],
          [
            6,
            2
          ],
          [
            6,
            3
          ],
          [
            6,
            5
          ],
          [
            6,
            6
          ],
          [
            6,
            7
          ],
          [
            6,
            9
          ],
          [
            7,
            0
          ],
          [
            7,
            2
          ],
          [
            7,
            3
          ],
          [
            7,
            5
          ],
          [
            7,
            6
          ],
          [
            7,
            7
          ],
          [
            7,
            9
          ],
          [
            8,
            0
          ],
          [
            8,
            9
          ],
          [
            9,
            0
          ],
          [
            9,
            1
          ],
          [
            9,
            2
          ],
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "zones": [],
        "protected": [
          {
            "zone": "cold",
            "contaminant": "spill"
          }
        ],
        "agents": [
          {
            "id": 0,
            "start": [
              3,
              4
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "operate",
              "machine": "packer"
            }
          },
          {
            "id": 1,
            "start": [
              2,
              5
            ],
            "role": "operator",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "operate",
              "machine": "packer"
            }
          }
        ],
        "items": [],
        "machines": [
          {
            "id": "packer",
            "cell": [
              2,
              4
            ],
            "needs_permit": false,
            "setup_role": "operator"
          }
        ],
        "scanners": []
      },
      "baseline": {
        "ok": false,
        "reason": "resource-conflict",
        "frames": [
          {
            "pos": {
              "0": [
                3,
                4
              ],
              "1": [
                2,
                5
              ]
            },
            "carry": {
              "0": "none",
              "1": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                3,
                4
              ],
              "1": [
                2,
                5
              ]
            },
            "carry": {
              "0": "none",
              "1": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": {
              "type": "resource-conflict",
              "cell": [
                2,
                4
              ],
              "agents": [
                0,
                1
              ]
            }
          }
        ]
      }
    },
    {
      "id": "trial_4",
      "label": "T4",
      "level": 2,
      "layer": 2,
      "prerequisites": [
        "trial_1"
      ],
      "family": "shared_rulebook_curriculum",
      "active_agent_count": 2,
      "description": "Two robots must reach their targets in a warehouse containing cold storage.",
      "participant_prompt": "Run the scene, inspect what goes wrong, and decide whether the shared rulebook should be added to or refined.",
      "analysis": {
        "layer": 2,
        "prerequisites": [
          "trial_1"
        ],
        "stage": "Safety refinement",
        "evidence_function": "A legitimate clean delivery is a counterexample to banning everyone from cold storage.",
        "expected_transition": "broad protection -> spill-sensitive protection",
        "selected_variant": "safety_clean_access_3",
        "nuisance_score": [
          2,
          10
        ],
        "active_agent_count": 2,
        "contract_satisfied": true,
        "contract": {
          "empty": {
            "ok": false,
            "reason": "pollution:cold",
            "expected_ok": false,
            "expected_reason": "pollution",
            "matches": true
          },
          "broad": {
            "ok": false,
            "reason": "agent1:no-legal-plan",
            "expected_ok": false,
            "expected_reason": "no-legal-plan",
            "matches": true
          },
          "cargo": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "negated_exception": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          }
        },
        "optimality": null
      },
      "world": {
        "name": "safety_clean_access_3",
        "rows": 10,
        "cols": 10,
        "walls": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ],
          [
            0,
            3
          ],
          [
            0,
            4
          ],
          [
            0,
            5
          ],
          [
            0,
            6
          ],
          [
            0,
            7
          ],
          [
            0,
            8
          ],
          [
            0,
            9
          ],
          [
            1,
            0
          ],
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            7
          ],
          [
            1,
            9
          ],
          [
            2,
            0
          ],
          [
            2,
            9
          ],
          [
            3,
            0
          ],
          [
            3,
            2
          ],
          [
            3,
            3
          ],
          [
            3,
            5
          ],
          [
            3,
            6
          ],
          [
            3,
            7
          ],
          [
            3,
            9
          ],
          [
            4,
            0
          ],
          [
            4,
            2
          ],
          [
            4,
            3
          ],
          [
            4,
            5
          ],
          [
            4,
            6
          ],
          [
            4,
            7
          ],
          [
            4,
            9
          ],
          [
            5,
            0
          ],
          [
            5,
            9
          ],
          [
            6,
            0
          ],
          [
            6,
            2
          ],
          [
            6,
            3
          ],
          [
            6,
            5
          ],
          [
            6,
            6
          ],
          [
            6,
            7
          ],
          [
            6,
            9
          ],
          [
            7,
            0
          ],
          [
            7,
            2
          ],
          [
            7,
            3
          ],
          [
            7,
            5
          ],
          [
            7,
            6
          ],
          [
            7,
            7
          ],
          [
            7,
            9
          ],
          [
            8,
            0
          ],
          [
            8,
            9
          ],
          [
            9,
            0
          ],
          [
            9,
            1
          ],
          [
            9,
            2
          ],
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "zones": [
          {
            "cell": [
              5,
              2
            ],
            "zone": "cold"
          },
          {
            "cell": [
              5,
              3
            ],
            "zone": "cold"
          }
        ],
        "protected": [
          {
            "zone": "cold",
            "contaminant": "spill"
          }
        ],
        "agents": [
          {
            "id": 0,
            "start": [
              5,
              1
            ],
            "role": "carrier",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                5,
                7
              ]
            }
          },
          {
            "id": 1,
            "start": [
              2,
              4
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                5,
                3
              ]
            }
          }
        ],
        "items": [],
        "machines": [],
        "scanners": []
      },
      "baseline": {
        "ok": false,
        "reason": "pollution:cold",
        "frames": [
          {
            "pos": {
              "0": [
                5,
                1
              ],
              "1": [
                2,
                4
              ]
            },
            "carry": {
              "0": "spill",
              "1": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                5,
                2
              ],
              "1": [
                3,
                4
              ]
            },
            "carry": {
              "0": "spill",
              "1": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": {
              "type": "pollution",
              "cell": [
                5,
                2
              ]
            }
          }
        ]
      }
    },
    {
      "id": "trial_5",
      "label": "T5",
      "level": 2,
      "layer": 2,
      "prerequisites": [
        "trial_4"
      ],
      "family": "shared_rulebook_curriculum",
      "active_agent_count": 4,
      "description": "All robots must reach their targets in a warehouse containing cold storage.",
      "participant_prompt": "Run the scene, inspect what goes wrong, and decide whether the shared rulebook should be added to or refined.",
      "analysis": {
        "layer": 2,
        "prerequisites": [
          "trial_4"
        ],
        "stage": "Exception and negation",
        "evidence_function": "A cleaner carrying a spill is a legitimate exception, while an operator carrying the same spill remains harmful.",
        "expected_transition": "spill-sensitive protection -> compact not-cleaner exception",
        "selected_variant": "safety_cleaner_exception",
        "nuisance_score": [
          4,
          22
        ],
        "active_agent_count": 4,
        "contract_satisfied": true,
        "contract": {
          "empty": {
            "ok": false,
            "reason": "pollution:cold",
            "expected_ok": false,
            "expected_reason": "pollution",
            "matches": true
          },
          "cargo": {
            "ok": false,
            "reason": "agent0:no-legal-plan",
            "expected_ok": false,
            "expected_reason": "no-legal-plan",
            "matches": true
          },
          "operator_patch": {
            "ok": false,
            "reason": "pollution:cold",
            "expected_ok": false,
            "expected_reason": "pollution",
            "matches": true
          },
          "carrier_patch": {
            "ok": false,
            "reason": "pollution:cold",
            "expected_ok": false,
            "expected_reason": "pollution",
            "matches": true
          },
          "negated_exception": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          }
        },
        "optimality": null
      },
      "world": {
        "name": "safety_cleaner_exception",
        "rows": 10,
        "cols": 10,
        "walls": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ],
          [
            0,
            3
          ],
          [
            0,
            4
          ],
          [
            0,
            5
          ],
          [
            0,
            6
          ],
          [
            0,
            7
          ],
          [
            0,
            8
          ],
          [
            0,
            9
          ],
          [
            1,
            0
          ],
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            7
          ],
          [
            1,
            9
          ],
          [
            2,
            0
          ],
          [
            2,
            9
          ],
          [
            3,
            0
          ],
          [
            3,
            2
          ],
          [
            3,
            3
          ],
          [
            3,
            5
          ],
          [
            3,
            6
          ],
          [
            3,
            7
          ],
          [
            3,
            9
          ],
          [
            4,
            0
          ],
          [
            4,
            2
          ],
          [
            4,
            3
          ],
          [
            4,
            5
          ],
          [
            4,
            6
          ],
          [
            4,
            7
          ],
          [
            4,
            9
          ],
          [
            5,
            0
          ],
          [
            5,
            9
          ],
          [
            6,
            0
          ],
          [
            6,
            2
          ],
          [
            6,
            3
          ],
          [
            6,
            5
          ],
          [
            6,
            6
          ],
          [
            6,
            7
          ],
          [
            6,
            9
          ],
          [
            7,
            0
          ],
          [
            7,
            2
          ],
          [
            7,
            3
          ],
          [
            7,
            5
          ],
          [
            7,
            6
          ],
          [
            7,
            7
          ],
          [
            7,
            9
          ],
          [
            8,
            0
          ],
          [
            8,
            9
          ],
          [
            9,
            0
          ],
          [
            9,
            1
          ],
          [
            9,
            2
          ],
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "zones": [
          {
            "cell": [
              5,
              2
            ],
            "zone": "cold"
          },
          {
            "cell": [
              5,
              3
            ],
            "zone": "cold"
          }
        ],
        "protected": [
          {
            "zone": "cold",
            "contaminant": "spill"
          }
        ],
        "agents": [
          {
            "id": 0,
            "start": [
              5,
              1
            ],
            "role": "cleaner",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                5,
                2
              ]
            }
          },
          {
            "id": 1,
            "start": [
              5,
              8
            ],
            "role": "operator",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                6,
                1
              ]
            }
          },
          {
            "id": 2,
            "start": [
              3,
              4
            ],
            "role": "carrier",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                4,
                1
              ]
            }
          },
          {
            "id": 3,
            "start": [
              1,
              8
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                5,
                3
              ]
            }
          }
        ],
        "items": [],
        "machines": [],
        "scanners": []
      },
      "baseline": {
        "ok": false,
        "reason": "pollution:cold",
        "frames": [
          {
            "pos": {
              "0": [
                5,
                1
              ],
              "1": [
                5,
                8
              ],
              "2": [
                3,
                4
              ],
              "3": [
                1,
                8
              ]
            },
            "carry": {
              "0": "spill",
              "1": "spill",
              "2": "spill",
              "3": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                5,
                2
              ],
              "1": [
                5,
                7
              ],
              "2": [
                4,
                4
              ],
              "3": [
                2,
                8
              ]
            },
            "carry": {
              "0": "spill",
              "1": "spill",
              "2": "spill",
              "3": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                5,
                2
              ],
              "1": [
                5,
                6
              ],
              "2": [
                5,
                4
              ],
              "3": [
                3,
                8
              ]
            },
            "carry": {
              "0": "spill",
              "1": "spill",
              "2": "spill",
              "3": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                5,
                2
              ],
              "1": [
                5,
                5
              ],
              "2": [
                5,
                3
              ],
              "3": [
                4,
                8
              ]
            },
            "carry": {
              "0": "spill",
              "1": "spill",
              "2": "spill",
              "3": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": {
              "type": "pollution",
              "cell": [
                5,
                3
              ]
            }
          }
        ]
      }
    },
    {
      "id": "trial_6",
      "label": "T6",
      "level": 3,
      "layer": 3,
      "prerequisites": [
        "trial_5"
      ],
      "family": "shared_rulebook_curriculum",
      "active_agent_count": 5,
      "description": "Five robots must reach their targets in a warehouse containing cold storage.",
      "participant_prompt": "Run the scene, inspect what goes wrong, and decide whether the shared rulebook should be added to or refined.",
      "analysis": {
        "layer": 3,
        "prerequisites": [
          "trial_5"
        ],
        "stage": "Safety-rule reuse",
        "evidence_function": "The same precise safety rule handles harmful entries from opposite directions while preserving legitimate cleaner and clean-cargo access.",
        "expected_transition": "retrieve one compact safety rule instead of enumerating roles or routes",
        "selected_variant": "safety_rule_reuse",
        "nuisance_score": [
          4,
          19
        ],
        "active_agent_count": 5,
        "contract_satisfied": true,
        "contract": {
          "empty": {
            "ok": false,
            "reason": "collision",
            "expected_ok": false,
            "expected_reason": null,
            "matches": true
          },
          "negated_exception": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "enumerated_roles": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "cargo": {
            "ok": false,
            "reason": "agent2:no-legal-plan",
            "expected_ok": false,
            "expected_reason": "no-legal-plan",
            "matches": true
          },
          "broad": {
            "ok": false,
            "reason": "agent2:no-legal-plan",
            "expected_ok": false,
            "expected_reason": "no-legal-plan",
            "matches": true
          }
        },
        "optimality": null
      },
      "world": {
        "name": "safety_rule_reuse",
        "rows": 10,
        "cols": 10,
        "walls": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ],
          [
            0,
            3
          ],
          [
            0,
            4
          ],
          [
            0,
            5
          ],
          [
            0,
            6
          ],
          [
            0,
            7
          ],
          [
            0,
            8
          ],
          [
            0,
            9
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            1,
            4
          ],
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            9
          ],
          [
            2,
            0
          ],
          [
            2,
            8
          ],
          [
            2,
            9
          ],
          [
            3,
            0
          ],
          [
            3,
            9
          ],
          [
            4,
            0
          ],
          [
            4,
            9
          ],
          [
            5,
            0
          ],
          [
            5,
            9
          ],
          [
            6,
            0
          ],
          [
            6,
            9
          ],
          [
            7,
            0
          ],
          [
            7,
            9
          ],
          [
            8,
            0
          ],
          [
            8,
            1
          ],
          [
            8,
            2
          ],
          [
            8,
            3
          ],
          [
            8,
            4
          ],
          [
            8,
            5
          ],
          [
            8,
            6
          ],
          [
            8,
            7
          ],
          [
            8,
            8
          ],
          [
            8,
            9
          ],
          [
            9,
            0
          ],
          [
            9,
            1
          ],
          [
            9,
            2
          ],
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "zones": [
          {
            "cell": [
              1,
              8
            ],
            "zone": "cold"
          },
          {
            "cell": [
              4,
              4
            ],
            "zone": "cold"
          },
          {
            "cell": [
              4,
              5
            ],
            "zone": "cold"
          },
          {
            "cell": [
              5,
              4
            ],
            "zone": "cold"
          },
          {
            "cell": [
              5,
              5
            ],
            "zone": "cold"
          }
        ],
        "protected": [
          {
            "zone": "cold",
            "contaminant": "spill"
          }
        ],
        "agents": [
          {
            "id": 0,
            "start": [
              4,
              1
            ],
            "role": "operator",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                4,
                8
              ]
            }
          },
          {
            "id": 1,
            "start": [
              5,
              8
            ],
            "role": "carrier",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                5,
                1
              ]
            }
          },
          {
            "id": 2,
            "start": [
              2,
              4
            ],
            "role": "cleaner",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                4,
                4
              ]
            }
          },
          {
            "id": 3,
            "start": [
              7,
              5
            ],
            "role": "cleaner",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                5,
                5
              ]
            }
          },
          {
            "id": 4,
            "start": [
              1,
              7
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                1,
                8
              ]
            }
          }
        ],
        "items": [],
        "machines": [],
        "scanners": []
      },
      "baseline": {
        "ok": false,
        "reason": "collision",
        "frames": [
          {
            "pos": {
              "0": [
                4,
                1
              ],
              "1": [
                5,
                8
              ],
              "2": [
                2,
                4
              ],
              "3": [
                7,
                5
              ],
              "4": [
                1,
                7
              ]
            },
            "carry": {
              "0": "spill",
              "1": "spill",
              "2": "spill",
              "3": "spill",
              "4": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                4,
                2
              ],
              "1": [
                5,
                7
              ],
              "2": [
                3,
                4
              ],
              "3": [
                6,
                5
              ],
              "4": [
                1,
                8
              ]
            },
            "carry": {
              "0": "spill",
              "1": "spill",
              "2": "spill",
              "3": "spill",
              "4": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                4,
                3
              ],
              "1": [
                5,
                6
              ],
              "2": [
                4,
                4
              ],
              "3": [
                5,
                5
              ],
              "4": [
                1,
                8
              ]
            },
            "carry": {
              "0": "spill",
              "1": "spill",
              "2": "spill",
              "3": "spill",
              "4": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                4,
                3
              ],
              "1": [
                5,
                6
              ],
              "2": [
                4,
                4
              ],
              "3": [
                5,
                5
              ],
              "4": [
                1,
                8
              ]
            },
            "carry": {
              "0": "spill",
              "1": "spill",
              "2": "spill",
              "3": "spill",
              "4": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": {
              "type": "collision",
              "cell": [
                4,
                4
              ],
              "agents": [
                0,
                2
              ]
            }
          }
        ]
      }
    },
    {
      "id": "trial_7",
      "label": "T7",
      "level": 3,
      "layer": 3,
      "prerequisites": [
        "trial_5",
        "trial_2"
      ],
      "family": "shared_rulebook_curriculum",
      "active_agent_count": 4,
      "description": "Four robots must reach their targets through cold storage and a shared crossing.",
      "participant_prompt": "Run the scene, inspect what goes wrong, and decide whether the shared rulebook should be added to or refined.",
      "analysis": {
        "layer": 3,
        "prerequisites": [
          "trial_5",
          "trial_2"
        ],
        "stage": "Safety and road reuse",
        "evidence_function": "A familiar safety event and a familiar road conflict occur in one small warehouse. Both earlier rules are needed, with no new rule type introduced.",
        "expected_transition": "retrieve the safety and road rules together",
        "selected_variant": "safety_and_road",
        "nuisance_score": [
          2,
          12
        ],
        "active_agent_count": 4,
        "contract_satisfied": true,
        "contract": {
          "empty": {
            "ok": false,
            "reason": "collision",
            "expected_ok": false,
            "expected_reason": null,
            "matches": true
          },
          "protect_and_road": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "negated_exception": {
            "ok": false,
            "reason": "collision",
            "expected_ok": false,
            "expected_reason": "collision",
            "matches": true
          },
          "yield_east": {
            "ok": false,
            "reason": "pollution:cold",
            "expected_ok": false,
            "expected_reason": "pollution",
            "matches": true
          }
        },
        "optimality": null
      },
      "world": {
        "name": "safety_and_road",
        "rows": 10,
        "cols": 10,
        "walls": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ],
          [
            0,
            3
          ],
          [
            0,
            4
          ],
          [
            0,
            5
          ],
          [
            0,
            6
          ],
          [
            0,
            7
          ],
          [
            0,
            8
          ],
          [
            0,
            9
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            1,
            3
          ],
          [
            1,
            4
          ],
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            7
          ],
          [
            1,
            8
          ],
          [
            1,
            9
          ],
          [
            2,
            0
          ],
          [
            2,
            9
          ],
          [
            3,
            0
          ],
          [
            3,
            1
          ],
          [
            3,
            3
          ],
          [
            3,
            4
          ],
          [
            3,
            5
          ],
          [
            3,
            6
          ],
          [
            3,
            7
          ],
          [
            3,
            9
          ],
          [
            4,
            0
          ],
          [
            4,
            1
          ],
          [
            4,
            2
          ],
          [
            4,
            3
          ],
          [
            4,
            4
          ],
          [
            4,
            5
          ],
          [
            4,
            6
          ],
          [
            4,
            7
          ],
          [
            4,
            9
          ],
          [
            5,
            0
          ],
          [
            5,
            1
          ],
          [
            5,
            2
          ],
          [
            5,
            3
          ],
          [
            5,
            4
          ],
          [
            5,
            5
          ],
          [
            5,
            6
          ],
          [
            5,
            7
          ],
          [
            5,
            9
          ],
          [
            6,
            0
          ],
          [
            6,
            9
          ],
          [
            7,
            0
          ],
          [
            7,
            9
          ],
          [
            8,
            0
          ],
          [
            8,
            9
          ],
          [
            9,
            0
          ],
          [
            9,
            1
          ],
          [
            9,
            2
          ],
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "zones": [
          {
            "cell": [
              7,
              3
            ],
            "zone": "cold"
          }
        ],
        "protected": [
          {
            "zone": "cold",
            "contaminant": "spill"
          }
        ],
        "agents": [
          {
            "id": 0,
            "start": [
              2,
              1
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                2,
                2
              ]
            }
          },
          {
            "id": 1,
            "start": [
              1,
              2
            ],
            "role": "operator",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                3,
                2
              ]
            }
          },
          {
            "id": 2,
            "start": [
              7,
              1
            ],
            "role": "carrier",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                7,
                8
              ]
            }
          },
          {
            "id": 3,
            "start": [
              6,
              3
            ],
            "role": "cleaner",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                7,
                4
              ]
            }
          }
        ],
        "items": [],
        "machines": [],
        "scanners": []
      },
      "baseline": {
        "ok": false,
        "reason": "collision",
        "frames": [
          {
            "pos": {
              "0": [
                2,
                1
              ],
              "1": [
                1,
                2
              ],
              "2": [
                7,
                1
              ],
              "3": [
                6,
                3
              ]
            },
            "carry": {
              "0": "none",
              "1": "none",
              "2": "spill",
              "3": "spill"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                2,
                1
              ],
              "1": [
                1,
                2
              ],
              "2": [
                7,
                1
              ],
              "3": [
                6,
                3
              ]
            },
            "carry": {
              "0": "none",
              "1": "none",
              "2": "spill",
              "3": "spill"
            },
            "released": [],
            "prepared_machines": [],
            "event": {
              "type": "collision",
              "cell": [
                2,
                2
              ],
              "agents": [
                0,
                1
              ]
            }
          }
        ]
      }
    },
    {
      "id": "trial_8",
      "label": "T8",
      "level": 3,
      "layer": 3,
      "prerequisites": [
        "trial_5",
        "trial_3"
      ],
      "family": "shared_rulebook_curriculum",
      "active_agent_count": 4,
      "description": "Four robots must complete their targets at cold storage and a setup machine.",
      "participant_prompt": "Run the scene, inspect what goes wrong, and decide whether the shared rulebook should be added to or refined.",
      "analysis": {
        "layer": 3,
        "prerequisites": [
          "trial_5",
          "trial_3"
        ],
        "stage": "Safety and machine reuse",
        "evidence_function": "A familiar safety event and a familiar operator-first machine event occur together. Both earlier rules are needed.",
        "expected_transition": "retrieve the safety and machine rules together",
        "selected_variant": "safety_and_machine",
        "nuisance_score": [
          2,
          11
        ],
        "active_agent_count": 4,
        "contract_satisfied": true,
        "contract": {
          "empty": {
            "ok": false,
            "reason": "resource-conflict",
            "expected_ok": false,
            "expected_reason": null,
            "matches": true
          },
          "protect_and_machine": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "negated_exception": {
            "ok": false,
            "reason": "resource-conflict",
            "expected_ok": false,
            "expected_reason": "resource-conflict",
            "matches": true
          },
          "machine_non_operator_priority": {
            "ok": false,
            "reason": "pollution:cold",
            "expected_ok": false,
            "expected_reason": "pollution",
            "matches": true
          }
        },
        "optimality": null
      },
      "world": {
        "name": "safety_and_machine",
        "rows": 10,
        "cols": 10,
        "walls": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ],
          [
            0,
            3
          ],
          [
            0,
            4
          ],
          [
            0,
            5
          ],
          [
            0,
            6
          ],
          [
            0,
            7
          ],
          [
            0,
            8
          ],
          [
            0,
            9
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            1,
            4
          ],
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            8
          ],
          [
            1,
            9
          ],
          [
            2,
            0
          ],
          [
            2,
            9
          ],
          [
            3,
            0
          ],
          [
            3,
            1
          ],
          [
            3,
            2
          ],
          [
            3,
            3
          ],
          [
            3,
            4
          ],
          [
            3,
            5
          ],
          [
            3,
            6
          ],
          [
            3,
            9
          ],
          [
            4,
            0
          ],
          [
            4,
            1
          ],
          [
            4,
            2
          ],
          [
            4,
            3
          ],
          [
            4,
            4
          ],
          [
            4,
            5
          ],
          [
            4,
            6
          ],
          [
            4,
            7
          ],
          [
            4,
            9
          ],
          [
            5,
            0
          ],
          [
            5,
            1
          ],
          [
            5,
            2
          ],
          [
            5,
            3
          ],
          [
            5,
            4
          ],
          [
            5,
            5
          ],
          [
            5,
            6
          ],
          [
            5,
            7
          ],
          [
            5,
            9
          ],
          [
            6,
            0
          ],
          [
            6,
            9
          ],
          [
            7,
            0
          ],
          [
            7,
            9
          ],
          [
            8,
            0
          ],
          [
            8,
            9
          ],
          [
            9,
            0
          ],
          [
            9,
            1
          ],
          [
            9,
            2
          ],
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "zones": [
          {
            "cell": [
              7,
              3
            ],
            "zone": "cold"
          }
        ],
        "protected": [
          {
            "zone": "cold",
            "contaminant": "spill"
          }
        ],
        "agents": [
          {
            "id": 0,
            "start": [
              3,
              7
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "operate",
              "machine": "sealer"
            }
          },
          {
            "id": 1,
            "start": [
              2,
              8
            ],
            "role": "operator",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "operate",
              "machine": "sealer"
            }
          },
          {
            "id": 2,
            "start": [
              7,
              1
            ],
            "role": "carrier",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                7,
                8
              ]
            }
          },
          {
            "id": 3,
            "start": [
              6,
              3
            ],
            "role": "cleaner",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                7,
                4
              ]
            }
          }
        ],
        "items": [],
        "machines": [
          {
            "id": "sealer",
            "cell": [
              2,
              7
            ],
            "needs_permit": false,
            "setup_role": "operator"
          }
        ],
        "scanners": []
      },
      "baseline": {
        "ok": false,
        "reason": "resource-conflict",
        "frames": [
          {
            "pos": {
              "0": [
                3,
                7
              ],
              "1": [
                2,
                8
              ],
              "2": [
                7,
                1
              ],
              "3": [
                6,
                3
              ]
            },
            "carry": {
              "0": "none",
              "1": "none",
              "2": "spill",
              "3": "spill"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                3,
                7
              ],
              "1": [
                2,
                8
              ],
              "2": [
                7,
                1
              ],
              "3": [
                6,
                3
              ]
            },
            "carry": {
              "0": "none",
              "1": "none",
              "2": "spill",
              "3": "spill"
            },
            "released": [],
            "prepared_machines": [],
            "event": {
              "type": "resource-conflict",
              "cell": [
                2,
                7
              ],
              "agents": [
                0,
                1
              ]
            }
          }
        ]
      }
    },
    {
      "id": "trial_9",
      "label": "T9",
      "level": 3,
      "layer": 3,
      "prerequisites": [
        "trial_2",
        "trial_3"
      ],
      "family": "shared_rulebook_curriculum",
      "active_agent_count": 4,
      "description": "Four robots must complete their targets across a shared crossing and a setup machine.",
      "participant_prompt": "Run the scene, inspect what goes wrong, and decide whether the shared rulebook should be added to or refined.",
      "analysis": {
        "layer": 3,
        "prerequisites": [
          "trial_2",
          "trial_3"
        ],
        "stage": "Road and machine reuse",
        "evidence_function": "A familiar road conflict and a familiar machine conflict occur in one small warehouse. Both earlier rules are needed.",
        "expected_transition": "retrieve the road and machine rules together",
        "selected_variant": "road_and_machine",
        "nuisance_score": [
          2,
          5
        ],
        "active_agent_count": 4,
        "contract_satisfied": true,
        "contract": {
          "empty": {
            "ok": false,
            "reason": "resource-conflict",
            "expected_ok": false,
            "expected_reason": "resource-conflict",
            "matches": true
          },
          "road_and_machine": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          },
          "yield_east": {
            "ok": false,
            "reason": "resource-conflict",
            "expected_ok": false,
            "expected_reason": "resource-conflict",
            "matches": true
          },
          "machine_non_operator_priority": {
            "ok": false,
            "reason": "collision",
            "expected_ok": false,
            "expected_reason": "collision",
            "matches": true
          }
        },
        "optimality": null
      },
      "world": {
        "name": "road_and_machine",
        "rows": 10,
        "cols": 10,
        "walls": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ],
          [
            0,
            3
          ],
          [
            0,
            4
          ],
          [
            0,
            5
          ],
          [
            0,
            6
          ],
          [
            0,
            7
          ],
          [
            0,
            8
          ],
          [
            0,
            9
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            1,
            3
          ],
          [
            1,
            4
          ],
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            8
          ],
          [
            1,
            9
          ],
          [
            2,
            0
          ],
          [
            2,
            9
          ],
          [
            3,
            0
          ],
          [
            3,
            1
          ],
          [
            3,
            3
          ],
          [
            3,
            4
          ],
          [
            3,
            5
          ],
          [
            3,
            6
          ],
          [
            3,
            8
          ],
          [
            3,
            9
          ],
          [
            4,
            0
          ],
          [
            4,
            1
          ],
          [
            4,
            2
          ],
          [
            4,
            3
          ],
          [
            4,
            4
          ],
          [
            4,
            5
          ],
          [
            4,
            6
          ],
          [
            4,
            7
          ],
          [
            4,
            8
          ],
          [
            4,
            9
          ],
          [
            5,
            0
          ],
          [
            5,
            1
          ],
          [
            5,
            2
          ],
          [
            5,
            3
          ],
          [
            5,
            4
          ],
          [
            5,
            5
          ],
          [
            5,
            6
          ],
          [
            5,
            7
          ],
          [
            5,
            8
          ],
          [
            5,
            9
          ],
          [
            6,
            0
          ],
          [
            6,
            1
          ],
          [
            6,
            2
          ],
          [
            6,
            3
          ],
          [
            6,
            4
          ],
          [
            6,
            5
          ],
          [
            6,
            6
          ],
          [
            6,
            7
          ],
          [
            6,
            8
          ],
          [
            6,
            9
          ],
          [
            7,
            0
          ],
          [
            7,
            1
          ],
          [
            7,
            2
          ],
          [
            7,
            3
          ],
          [
            7,
            4
          ],
          [
            7,
            5
          ],
          [
            7,
            6
          ],
          [
            7,
            7
          ],
          [
            7,
            8
          ],
          [
            7,
            9
          ],
          [
            8,
            0
          ],
          [
            8,
            1
          ],
          [
            8,
            2
          ],
          [
            8,
            3
          ],
          [
            8,
            4
          ],
          [
            8,
            5
          ],
          [
            8,
            6
          ],
          [
            8,
            7
          ],
          [
            8,
            8
          ],
          [
            8,
            9
          ],
          [
            9,
            0
          ],
          [
            9,
            1
          ],
          [
            9,
            2
          ],
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "zones": [],
        "protected": [
          {
            "zone": "cold",
            "contaminant": "spill"
          }
        ],
        "agents": [
          {
            "id": 0,
            "start": [
              2,
              1
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                2,
                2
              ]
            }
          },
          {
            "id": 1,
            "start": [
              1,
              2
            ],
            "role": "operator",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                3,
                2
              ]
            }
          },
          {
            "id": 2,
            "start": [
              3,
              7
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "operate",
              "machine": "sealer"
            }
          },
          {
            "id": 3,
            "start": [
              2,
              8
            ],
            "role": "operator",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "operate",
              "machine": "sealer"
            }
          }
        ],
        "items": [],
        "machines": [
          {
            "id": "sealer",
            "cell": [
              2,
              7
            ],
            "needs_permit": false,
            "setup_role": "operator"
          }
        ],
        "scanners": []
      },
      "baseline": {
        "ok": false,
        "reason": "resource-conflict",
        "frames": [
          {
            "pos": {
              "0": [
                2,
                1
              ],
              "1": [
                1,
                2
              ],
              "2": [
                3,
                7
              ],
              "3": [
                2,
                8
              ]
            },
            "carry": {
              "0": "none",
              "1": "none",
              "2": "none",
              "3": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                2,
                1
              ],
              "1": [
                1,
                2
              ],
              "2": [
                3,
                7
              ],
              "3": [
                2,
                8
              ]
            },
            "carry": {
              "0": "none",
              "1": "none",
              "2": "none",
              "3": "none"
            },
            "released": [],
            "prepared_machines": [],
            "event": {
              "type": "resource-conflict",
              "cell": [
                2,
                7
              ],
              "agents": [
                2,
                3
              ]
            }
          }
        ]
      }
    },
    {
      "id": "trial_10",
      "label": "T10",
      "level": 4,
      "layer": 4,
      "prerequisites": [
        "trial_6",
        "trial_9"
      ],
      "family": "shared_rulebook_curriculum",
      "active_agent_count": 6,
      "description": "Six robots must complete their targets in a warehouse containing cold storage, a shared crossing, and a setup machine.",
      "participant_prompt": "Run the scene, inspect what goes wrong, and decide whether the shared rulebook should be added to or refined.",
      "analysis": {
        "layer": 4,
        "prerequisites": [
          "trial_6",
          "trial_9"
        ],
        "stage": "Integrated system",
        "evidence_function": "One instance of each familiar problem type appears together. The task tests selection of three cached rules, not a larger map.",
        "expected_transition": "retrieve and jointly apply the safety, road, and machine rules",
        "selected_variant": "integrated_shared_system",
        "nuisance_score": [
          2,
          14
        ],
        "active_agent_count": 6,
        "contract_satisfied": true,
        "contract": {
          "empty": {
            "ok": false,
            "reason": "resource-conflict",
            "expected_ok": false,
            "expected_reason": null,
            "matches": true
          },
          "negated_exception": {
            "ok": false,
            "reason": "resource-conflict",
            "expected_ok": false,
            "expected_reason": null,
            "matches": true
          },
          "protect_and_road": {
            "ok": false,
            "reason": "resource-conflict",
            "expected_ok": false,
            "expected_reason": "resource-conflict",
            "matches": true
          },
          "protect_and_machine": {
            "ok": false,
            "reason": "collision",
            "expected_ok": false,
            "expected_reason": "collision",
            "matches": true
          },
          "complete_rulebook": {
            "ok": true,
            "reason": "ok",
            "expected_ok": true,
            "expected_reason": "ok",
            "matches": true
          }
        },
        "optimality": null
      },
      "world": {
        "name": "integrated_shared_system",
        "rows": 10,
        "cols": 10,
        "walls": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ],
          [
            0,
            3
          ],
          [
            0,
            4
          ],
          [
            0,
            5
          ],
          [
            0,
            6
          ],
          [
            0,
            7
          ],
          [
            0,
            8
          ],
          [
            0,
            9
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            1,
            3
          ],
          [
            1,
            4
          ],
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            8
          ],
          [
            1,
            9
          ],
          [
            2,
            0
          ],
          [
            2,
            9
          ],
          [
            3,
            0
          ],
          [
            3,
            1
          ],
          [
            3,
            3
          ],
          [
            3,
            4
          ],
          [
            3,
            5
          ],
          [
            3,
            6
          ],
          [
            3,
            9
          ],
          [
            4,
            0
          ],
          [
            4,
            1
          ],
          [
            4,
            2
          ],
          [
            4,
            3
          ],
          [
            4,
            4
          ],
          [
            4,
            5
          ],
          [
            4,
            6
          ],
          [
            4,
            7
          ],
          [
            4,
            9
          ],
          [
            5,
            0
          ],
          [
            5,
            1
          ],
          [
            5,
            2
          ],
          [
            5,
            3
          ],
          [
            5,
            4
          ],
          [
            5,
            5
          ],
          [
            5,
            6
          ],
          [
            5,
            7
          ],
          [
            5,
            9
          ],
          [
            6,
            0
          ],
          [
            6,
            9
          ],
          [
            7,
            0
          ],
          [
            7,
            9
          ],
          [
            8,
            0
          ],
          [
            8,
            9
          ],
          [
            9,
            0
          ],
          [
            9,
            1
          ],
          [
            9,
            2
          ],
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "zones": [
          {
            "cell": [
              7,
              3
            ],
            "zone": "cold"
          }
        ],
        "protected": [
          {
            "zone": "cold",
            "contaminant": "spill"
          }
        ],
        "agents": [
          {
            "id": 0,
            "start": [
              2,
              1
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                2,
                2
              ]
            }
          },
          {
            "id": 1,
            "start": [
              1,
              2
            ],
            "role": "operator",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                3,
                2
              ]
            }
          },
          {
            "id": 2,
            "start": [
              3,
              7
            ],
            "role": "carrier",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "operate",
              "machine": "sealer"
            }
          },
          {
            "id": 3,
            "start": [
              2,
              8
            ],
            "role": "operator",
            "carrying": "none",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "operate",
              "machine": "sealer"
            }
          },
          {
            "id": 4,
            "start": [
              7,
              1
            ],
            "role": "carrier",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                7,
                8
              ]
            }
          },
          {
            "id": 5,
            "start": [
              6,
              3
            ],
            "role": "cleaner",
            "carrying": "spill",
            "active": true,
            "tokens": [],
            "goal": {
              "kind": "reach",
              "target": [
                7,
                4
              ]
            }
          }
        ],
        "items": [],
        "machines": [
          {
            "id": "sealer",
            "cell": [
              2,
              7
            ],
            "needs_permit": false,
            "setup_role": "operator"
          }
        ],
        "scanners": []
      },
      "baseline": {
        "ok": false,
        "reason": "resource-conflict",
        "frames": [
          {
            "pos": {
              "0": [
                2,
                1
              ],
              "1": [
                1,
                2
              ],
              "2": [
                3,
                7
              ],
              "3": [
                2,
                8
              ],
              "4": [
                7,
                1
              ],
              "5": [
                6,
                3
              ]
            },
            "carry": {
              "0": "none",
              "1": "none",
              "2": "none",
              "3": "none",
              "4": "spill",
              "5": "spill"
            },
            "released": [],
            "prepared_machines": [],
            "event": null
          },
          {
            "pos": {
              "0": [
                2,
                1
              ],
              "1": [
                1,
                2
              ],
              "2": [
                3,
                7
              ],
              "3": [
                2,
                8
              ],
              "4": [
                7,
                1
              ],
              "5": [
                6,
                3
              ]
            },
            "carry": {
              "0": "none",
              "1": "none",
              "2": "none",
              "3": "none",
              "4": "spill",
              "5": "spill"
            },
            "released": [],
            "prepared_machines": [],
            "event": {
              "type": "resource-conflict",
              "cell": [
                2,
                7
              ],
              "agents": [
                2,
                3
              ]
            }
          }
        ]
      }
    }
  ]
};
