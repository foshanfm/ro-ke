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
*   **Checkpoints:** Save only on key events: Battle End, Map Change, Manual Action (Equip/Stat/Buy/Sell).
*   **Backup:** A background timer (30s) acts as a fail-safe.

### 1.3. Pure Formulas
All math logic resides in `src/game/formulas.js`.
*   **Single Source of Truth:** Both `combat.js` (Real-time) and `simulator.js` (Headless) MUST import formulas from here.
*   **No Hardcoding:** Never write `damage = atk - def` inside combat logic. Call `calculateDamageFlow()`.

## 2. Module Responsibilities

*   **`player.js`**: State Owner. Handles Inventory, Stats, Config, Persistence.
*   **`combat.js`**: Loop Manager. Handles Timers, Session IDs, Logging.
*   **`formulas.js`**: Pure Math. Stat calculation, Damage formulas.
*   **`drops.js`**: RNG Engine. Handles Drop Tables and Pity Counters.
*   **`simulator.js`**: Analytics. Runs Monte Carlo simulations for efficiency analysis.
*   **`commands.js`**: Registry Pattern. Handles all console commands and their executions.

## 3. Core Algorithms (Standard)

### 3.1. Combat Formula (Behavioral)
We prioritize "Feel" over "Academic Accuracy".
*   **Hit:** `clamp(80 + Hit - Flee, 5, 95)`%
*   **Crit:** `clamp(Crit - Luk, 1, 50)`%. Deals 1.4x Damage, Ignores Def.
*   **Damage:** `floor((Atk - Def) * random(0.9, 1.1))`. Min 1.

### 3.2. Drop System (Layered)
Structure: `Normal` (Trash/Consumables) vs `Rare` (Equip/Cards).
*   **Normal:** Independent rolls. Affected by Drop Rate modifiers.
*   **Rare:** Independent rolls. Affected by **Soft Pity**.
    *   *Pity Algorithm:* `Rate = BaseRate + (FailCount * Bonus)`. Resets on drop.

## 4. Developer Guide

### How to add a new Feature?

1.  **New Item/Monster:** Update `items.js` / `monsters.js`. **Always** add price to items if sellable.
2.  **New Skill:**
    *   Add definition to `skills.js`.
    *   If passive stat bonus: Update `formulas.js`.
    *   If active combat logic: Update `combat.js` loop.
3.  **New Config:**
    *   Add to `defaultStats` in `player.js`.
    *   Add setter in `setConfig`.
    *   Add logic in `combat.js` (e.g., `checkAutoPotion`).
4.  **New Command:**
    *   Use `registerCommand()` in `commands.js`.

## 5. Known Risks

*   **NaN Propagation:** Always check `isNaN()` when loading saves or calculating stats.
*   **Zombie Timers:** Always clear timers and increment Session ID in `stopBot()`.
