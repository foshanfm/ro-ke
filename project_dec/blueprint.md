# Project Blueprint: RO-Idle-Bot

## 1. Overview
A web-based idle game recreating the experience of using automated botting software (like Kore Easy/OpenKore) for Ragnarok Online. The core features include **asynchronous dual-track combat**, **text-based console interaction**, **deep data simulation**, and an **industrial-grade economy/drop system**.

## 2. Architecture & Design
*   **Frontend:** Vue 3 + Vite + Tailwind CSS.
*   **State Management:** Vue `reactive` (Player State) + Explicit Persistence Strategy.
*   **Core Engine:**
    *   **Dual-Track Async Loop:** Player and Monster act independently based on ASPD/Delay.
    *   **Session Lock:** Prevents race conditions during state transitions.
    *   **Pure Formulas:** All math (Damage, Hit, Drop) is isolated in `formulas.js`.
    *   **Command Registry:** All console commands are decoupled using the Registry Pattern (`commands.js`).
    *   **Skill Engine:** Unified system for active/passive skills (`skillEngine.js`) handling casts, SP, and damage modifiers.
    *   **Map Manager:** Spatial simulation (`mapManager.js`) managing coordinates, movement, and monster spawns.
*   **Drop System:** Layered RNG with "Normal" (Trash) vs "Rare" (Equip/Card) tables, featuring a **Soft Pity** mechanism.

## 3. Roadmap

### Phase 1: Core Engine & Foundation [Completed]
- [x] **Console UI:** Log stream, IntelliSense (Tab completion), Command parsing.
- [x] **Combat Loop:** Async dual loops, Session ID locking, Auto-Resurrection.
- [x] **Stats:** 6 Primary Stats, Scaling Cost, Renewal/Classic hybrid formulas.
- [x] **Persistence:** Safe Save System (Checkpoints + Auto-backup), removed watchers.

### Phase 2: Skills & Progression [Completed]
- [x] **Skills:** Database, Learning logic, Passive effects (Double Attack, HP Recov, Improve Dodge).
- [x] **Equipment:** Slots (Weapon/Armor), Stat aggregation, Weapon Type ASPD base.
- [x] **Consumables:** Item usage, Config-based Auto-Potion.
- [x] **Monsters:** Full Lv 1-10 DB with correct stats/drops.

### Phase 3: World & Economy [Completed]
- [x] **Map System:** `maps.js` with ecological spawn tables. `map` command.
- [x] **Economy:** Zeny currency.
    - [x] **Smart Sell:** `sell all` only sells junk (ETC), protecting Rares.
    - [x] **Auto Buy:** `auto_buy_potion` config to replenish supplies automatically.
- [x] **Simulation:** `sim` command to run 1000+ battles instantly and analyze DPS/Efficiency/Profit.
- [x] **Technical Refactor:** 
    - [x] Extracted `formulas.js` (Pure Math).
    - [x] Implemented `drops.js` (Weighted Tables + Pity).
    - [x] Refactored `App.vue` command parser to Registry Pattern (`commands.js`).

### Phase 4: Job Change & Advancement [In Progress]
- [x] **Job Change System:**
    - [x] `job change` command.
    - [x] Requirements check (Job Lv 10).
    - [x] Stat/Skill reset and bonus application.
- [x] **Advanced Mechanics:**
    - [x] **Skill Engine:** `castSkill` (Active) & `PassiveHooks` (Double Attack).
    - [x] **Spatial System:** `mapManager` handling X, Y coordinates and `moveSpeed`.
    - [x] **Card System:** Weapon/Armor slots, `card` command, and attribute bonuses.
- [x] **Equipment:** Added `SHIELD` slot.
- [x] **ASPD Overhaul:** Comprehensive Renewal-based calculation engine with `job_base_aspd.json` backing.

- [ ] **1st Jobs Implementation:**
    - [ ] **Swordman:** Bash, Magnum Break, Provoke.
    - [ ] **Mage:** Cast Time system, Elemental Bolts.
    - [ ] **Archer:** Arrow consumption, Double Strafe.
    - [ ] **Thief:** Envenom, Hiding.
    - [ ] **Acolyte:** Heal, Blessing, Agi Up.
- [ ] **World Interaction:**
    - [ ] `sit` command (2x Regen).

### Phase 5: Data-Driven Infrastructure [Completed]
- [x] **Universal Database:** Transitioned from hardcoded JS objects to `.txt` (rAthena format) parsing.
- [x] **ETL Engine:** Implemented `dataLoader.js` for asynchronous asset loading on startup.
- [x] **Massive Content Enrichment:**
    - [x] Items: 12k+ entries loaded.
    - [x] Monsters: 200+ (Lv 1-20) entries loaded.
- [x] **Script-Based Spawning:** Map spawns now use standard RO spawn scripts (`mobs/fields/*.txt`).
- [x] **Content Gating:** Implemented Level 20 restriction for initial open content.

## 4. Current State
*   **Version:** 0.9.9 (Phase 4 - Advanced Mechanics Integration)
*   **Stability:** High. Advanced formulas for ASPD and spatial combat verified.
*   **Automation:** Fully autonomous loop with high-fidelity RO data.
*   **New Features:**
    - **Advanced ASPD:** Real-time calculation based on Job, Weapon, Stats, and corrections.
    - **Physical Spawn Logic:** Monsters now spawn at fixed counts as per official scripts.
*   **Next Objective:** Improve Map navigation UI and implement 1st Job skills.

