# RO-Idle-Bot Technical Architecture

This document guides AI developers in understanding the core architectural principles, data structures, and algorithms of the project.

## 1. Design Principles

### 1.1. Async Dual-Track Model
Combat is **Real-time**, not Turn-based.
*   **Player Loop:** Driven by `player.aspd`.
*   **Monster Loop:** Driven by `monster.attackDelay`.
*   **Safety:** Must use **Session Locks** (`combatSessionId`) to prevent race conditions (e.g., dead monsters attacking).

### 1.2. Explicit Persistence
*   **No Watchers:** We do NOT use `watch(player)` for saving.
*   **IndexedDB (Dexie.js):** Primary storage for characters and static data.
*   **Checkpoints:** Save only on key events: Battle End, Map Change, Manual Action (Equip/Stat/Buy/Sell).
*   **Backup:** A background timer (30s) acts as a fail-safe async save.

### 1.3. Pure Formulas
All math logic resides in `src/game/formulas.js`.
*   **Single Source of Truth:** Both `combat.js` (Real-time) and `simulator.js` (Headless) MUST import formulas from here.
*   **No Hardcoding:** Never write `damage = atk - def` inside combat logic. Call `calculateDamageFlow()`.

## 2. Module Responsibilities

*   **`player.js`**: State Owner. Handles Inventory, Stats, Config. Delegates persistence to `db/index.js`.
*   **`db/index.js`**: Dexie.js Database Wrapper. Manages `saves` and `static_data` object stores.
*   **`DataManager.js`**: Logic Orchestrator. Manages the lifecycle of game data, including parsing, caching to IndexedDB, and memory retrieval.
*   **`dataLoader.js`**: Parser. Responsible for parsing external text databases (`item_db.txt`, `mob_db.txt`) and map spawn scripts. Called by `DataManager` if cache is stale.

## 3. Core Algorithms (Standard)

### 3.1. Combat Formula (Renewal Standard)
We prioritize "Feel" over "Academic Accuracy".
*   **Hit Rate:** `min(100, max(5, Hit + 80 - Flee))`.
*   **Damage:** `Atk * (600 / (600 + Def))`.
*   **Crit:** `Atk * 1.4` (Subject to Def reduction), ignore Flee.
*   **ASPD (Standard):** Based on RO Renewal mechanics.


### 3.2. Spatial & AI Logic
*   **Movement:** `Speed = Base + (Agi * 0.05)`.
*   **Search:** Scan `viewRange` for nearest entity.
*   **Chase:** `movePlayerToward(target.x, target.y)` until `dist <= attackRange`.

### 3.3. Drop System (Layered)
Structure: `Normal` (Trash/Consumables) vs `Rare` (Equip/Cards).
*   **Normal:** Independent rolls. Affected by Drop Rate modifiers.
*   **Rare:** Independent rolls. Affected by **Soft Pity**.
    *   *Pity Algorithm:* `Rate = BaseRate + (FailCount * Bonus)`. Resets on drop.

## 4. Developer Guide

### How to add a new Feature?

    *   Add raw data to `src/game/data/item_db.txt` or `mob_db.txt` following the rAthena/eAthena format.
    *   `dataLoader.js` will automatically parse and inject them into `items.js` / `monsters.js` on startup.
    *   Monster objects include `attackDelay` (ms), `aspd` (display value), and `aps` (attacks per second).
2.  **ASPD Balancing:**
    *   Update `src/game/data/system/job_base_aspd.json` to adjust base attack speeds or shield penalties for specific jobs.

2.  **New Map/Spawn:** 
    *   Update `src/game/maps.js` for metadata (Width/Height/Name).
    *   Add spawn script to `src/game/data/mobs/fields/*.txt`.
3.  **New Skill:**
    *   Add definition to `skills.js`.
    *   If passive stat bonus: Update `formulas.js` or `PassiveHooks` in `skillEngine.js`.
    *   If active combat logic: `skillEngine.js` handles it automatically via `castSkill`.
3.  **New Config:**
    *   Add to `defaultStats` in `player.js`.
    *   Add setter in `setConfig`.
    *   Add logic in `combat.js` (e.g., `checkAutoPotion`).
4.  **New Command:**
    *   Use `registerCommand()` in `commands.js`.

## 5. Known Risks

*   **NaN Propagation:** Always check `isNaN()` when loading saves or calculating stats.
*   **Zombie Timers:** Always clear timers and increment Session ID in `stopBot()`.
