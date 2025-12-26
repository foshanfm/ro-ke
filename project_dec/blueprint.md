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
- [x] **Persistence:** Safe Save System (Checkpoints + Auto-backup), migrated to IndexedDB.
- [x] **Storage Upgrade:** Migrate from localStorage to IndexedDB (Dexie.js) for scalability. <!-- id: storage_upgrade -->

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

### Phase 4: Job Change & Advancement [Completed]
- [x] **Job Change System**: `job change` command, Job Lv 10 requirement, Stat/Skill reset.
- [x] **Advanced Mechanics**: Skill Engine (`castSkill`), Spatial System (`mapManager`), Card System.
- [x] **ASPD Overhaul**: Comprehensive engine with `job_base_aspd.json`.

### Phase 5: Data-Driven Infrastructure [Completed]
- [x] **Universal Database**: Transitioned to `.txt` (rAthena format) parsing.
- [x] **ETL Engine**: `dataLoader.js` for async startup asset loading.
- [x] **Massive Content**: 12k+ Items, 200+ Monsters.
- [x] **Script-Based Spawning**: Using standard RO spawn scripts.

### Phase 7: Authentic Experience System [Completed]
- [x] **Renewal Exp Curve**: `base_exp.json` and `job_exp.json`.
- [x] **Level Difference Penalty**: Reward scaling based on player-monster gap.

### Phase 8: Real Route System [Completed]
- [x] **Warp Database**: Parsed `airports/**/*.txt`.
- [x] **Collision Detection**: Real-time map transitions via `checkWarpCollision`.

### Phase 9: Advanced Navigation & UX [Completed]
- [x] **Navigation Panel**: UI for Map Info (Monsters & Portals).
- [x] **Auto-Pilot**: Clickable portals for automated navigation.

### Phase 10: Data Architecture Optimization [Completed]
- [x] **Monster Instance Refactoring**: Template-Instance Pattern.
- [x] **Attack Speed System**: Unique monster delays from `mob_db`.
- [x] **Live UI Synchronization**: Real-time monster list with counts.

### Phase 11: World Connectivity & Navigation Refinement [Completed]
- [x] **Massive Warp Restoration**: Connectivity rate increased to >40%.
- [x] **Sticky Portal Fix**: Landing offsets for seamless loops.
- [x] **Warp Deduplication**: Proximity-aware merge.

### Phase 12: Account Experience & Data Integrity [Completed]
- [x] **Account Management**: Scrollable list, Character deletion.
- [x] **Data Integrity**: NaN protection and load-time validation.

### Phase 14: Kiting & Range Mechanics [Completed]
- [x] **Combat State Machine**: Chase, Attack, and Kiting behaviors.
- [x] **Spatial Movement & Patrol**: Destination-based movement system.
- [x] **Area Spawning**: Respecting script-defined boundary zones.

### Phase 15: Save Points & Responsiveness [Completed]
- [x] **Save Point System**: City-based respawning via `save` command.
- [x] **Spatial Refactor (10px/Cell)**: tighter feeling world scale.
- [x] **Movement Pace**: Increased base speeds for better flow.

### Phase 16: Hyper-Interactive UX & Content Unlocked [Completed]
- [x] **Slot Expansion**: All equipment slots implemented.
- [x] **Interactive Console**: Clickable `[Name]` tags + Details Overlay.
- [x] **Stats Modal**: UI-based point allocation.
- [x] **Navigation Graph**: BFS multi-map pathfinding and Auto-Return logic.

### Phase 17: Structured Data & Automated Logic [Completed]
- [x] **DB Compiler**: rAthena TXT to JSON transformation.
- [x] **Automated Item Scripts**: Regex-based parser for `itemheal` and other scripts.
- [x] **UX Detail Polish**: Enhanced fuzzy search and drop rate displays.

### Phase 18: Stability & Content Unification [Completed]
- [x] **Case-Insensitive Map Engine**: Standardized all Map IDs to lowercase.
- [x] **Universal Content Unlock**: Removed Level 20 gating; all 1k+ monsters and 400+ maps accessible.
- [x] **Persistence Safety (Serialization Fix)**: Post-load hydration logic (`injectRuntimeEffects`) to fix IndexedDB crashes.
- [x] **Initialization Polish**: Resolved login race-conditions and refined warp de-duplication.

### Phase 19: SP Mechanics & Skills [Upcoming]
- [ ] **SP Consumption**: Integrate cast costs into `castSkill`.
- [ ] **1st Jobs Action Skills**: Bash, Double Strafe, Elemental Bolts.
- [ ] **Cast Time System**: Variable cast times based on DEX and skill level.

## 4. Current State
*   **Version:** 2.1.0 (Phase 18 - Stability & Content Unlocked)
*   **Stability:** High. Content fully synchronized and ID case-sensitivity resolved.
*   **Performance:** Elite. Safe persistence with post-load logic injection.
*   **New Features:**
    - **Global Content**: All maps and monsters (Lv 1-99) now fully spawning.
    - **Robust Saving**: Eliminated DataCloneErrors by isolating non-serializable logic.
    - **Precise Warp Deduplication**: Preserve multi-entrance layouts while cleaning redundant data.
*   **Next Objective:** Implement 1st Job active skills (Bash, Double Strafe, etc.) and SP consumption.
