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

### Phase 7: Authentic Experience System [Completed]
- [x] **Renewal Exp Curve:** Implemented `base_exp.json` and `job_exp.json` for levels 1-99.
- [x] **Level Difference Penalty:** Implemented `calcLevelDiffRate` for experience and drop scaling based on player-monster level gap.
- [x] **Job Type Recognition:** Differentiated between Novice and 1st Class job experience requirements.

### Phase 8: Real Route System [Completed]
- [x] **Warp Database:** Parsed `src/game/data/airports/**/*.txt` (rAthena format).
- [x] **Collision Detection:** Implemented `checkWarpCollision` in `mapManager.js`.
- [x] **Automatic Logic:** Seamless map transitions when walking into portals during AI movement.
- [x] **Data Completion:** Added missing warp data for `prt_fild08`.

### Phase 9: Advanced Navigation & UX [Completed]
- [x] **Manual Movement:** Implemented `move` command with map boundary checks.
- [x] **Navigation Panel:** Added top-right UI panel for "Map Info" (Monsters & Portals).
- [x] **Auto-Pilot:** Clickable portal buttons that automatically move the player to the exit.
- [x] **Context Awareness:** Enhanced `map` command with level range hints and nearby portal lists.

### Phase 10: Data Architecture Optimization [Completed]
- [x] **Monster Instance Refactoring:**
  - [x] Separated monster templates from instances (Template-Instance Pattern).
  - [x] Instances now store only `guid`, `templateId`, `x`, `y`, `hp`, and runtime state.
  - [x] Combat system uses `getMobTemplate()` to access template attributes.
- [x] **Attack Speed System:**
  - [x] Parsed `aDelay` field from `mob_db.txt` (column 26).
  - [x] Applied monster-specific attack delays in combat loop.
  - [x] Each monster now has unique attack intervals instead of hardcoded 2000ms.
- [x] **Map Metadata Cleanup:**
  - [x] Removed `spawnRate` and `monsters` fields from `maps.js`.
  - [x] Deleted legacy `fillMonstersLegacy` and `spawnSingleMonsterWeighted` functions.
  - [x] Map metadata now only contains: `id`, `name`, `width`, `height`, `minLv`, `maxLv`.
- [x] **UI Synchronization:**
  - [x] Fixed `mapMonsters` computed property to read `mapState.monsters` (real-time instances).
  - [x] Monster list now displays live data with counts (e.g., "波利 (Lv.1) x5").

### Phase 11: World Connectivity & Navigation Refinement [Completed]
- [x] **Massive Warp Restoration**:
  - [x] Restored 100+ core world warps (Prontera, Payon, Morroc, Geffen fields) from reference data.
  - [x] Connectivity rate from Prontera increased from **4.27%** to **43.07%** (202 reachable maps).
- [x] **Warp Logic Refinement**:
  - [x] **Sticky Portal Fix**: Added landing offset ($\pm 2-4$ units) to prevent immediate re-warp loops.
  - [x] **Deduplication**: Implemented proximity-based de-dupe logic in `dataLoader.js` to merge redundant portals (< 5 units apart).
- [x] **Recursive Data Discovery**: Enabled recursive globbing for all monster and warp data files.

### Phase 12: Account Experience & Data Integrity [Completed]
- [x] **Multi-Character UX Optimization**:
  - [x] Implemented scrollable character list to handle 4+ accounts.
  - [x] Added character deletion functionality with absolute confirmation.
- [x] **Data Stability Fixes**:
  - [x] Resolved "NaN Coordinate" bug for new characters via default initialization and load-time validation.
- [x] **Aggressive Warp Deduplication**:
  - [x] Refined `loadWarpData` to strictly enforce one portal per destination per map, drastically cleaning up the navigation UI.

### Phase 14: Kiting & Range Mechanics [Completed]
- [x] **Data Parsing**:
  - [x] Parsed `Range1` (Attack), `Range2` (Skill), `Range3` (Chase) from `mob_db.txt`.
- [x] **Spatial Logic (Cells)**:
  - [x] Implemented `CELL_SIZE = 20` constant (1 Cell = 20px).
  - [x] Added `WeaponRangeTable` mapping weapons to cell ranges (e.g., Bow=8, Spear=2).
  - [x] `player.attackRange` now dynamically calculates based on finding Weapon Type.
- [x] **Combat State Machine**:
  - [x] **Chase State**: Monsters now chase players if out of attack range (Kiting support).
  - [x] **Attack State**: Monsters only attack when within range (Melee vs Ranged behaviors).
- [x] **Spatial Movement & Patrol**:
  - [x] Implemented destination-based **Patrol System** replacing instant movement.
  - [x] Added real-time movement logs showing coordinates (X, Y).
- [x] **Area Spawning**:
  - [x] Parsed `X1, Y1, X2, Y2` area boundaries from `mobs/*.txt`.
  - [x] Map Manager now respects localized spawn zones.
- [x] **RO Data Alignment**:
  - [x] Refactored `moveSpeed` to follow RO standard (150 = 100% speed, ms/cell).
  - [x] Aligned `WeaponRangeTable` with official RO values (e.g., Spears=3).
  - [x] Integrated `Vulture's Eye` passive skill for Archer range bonuses.

### Phase 15: Save Points & Responsiveness [Completed]
- [x] **Save Point System**:
    - [x] `save` command to set a persistent respawn location.
    - [x] Gated to cities (Prontera, etc.) for authentic RO feel.
    - [x] Automated `respawn` on death with full HP/SP recovery.
- [x] **Spatial Refactor (10px/Cell)**:
    - [x] Reduced logic scale from 20px to **10px per Cell** for tighter feel.
    - [x] Adjusted all spatial databases (Warps, Spawns, Ranges) to matching the 10x scale.
    - [x] Multi-layer coordinate display logic (Internal Pixels vs External Cells).
- [x] **Movement & Pace Optimization**:
    - [x] Increased base movement speed (150 -> 100) to reduce travel friction.
    - [x] Unified `attackRange` and `viewRange` (30 Cells) for better engagement.
    - [x] Smooth Monster Chasing: Reaction-delay-aware movement scaling.

## 4. Current State
*   **Version:** 1.5.0 (Phase 15 - Save Points & Responsiveness Complete)
*   **Stability:** High. Combat logic now supports kiting, varied weapon ranges, and localized spawning.
*   **Performance:** Optimal.
*   **New Features:**
    - **Kiting Support**: Ranged characters can "free hit" chasing monsters.
    - **Weapon Realism**: Spears reach further than Daggers; Bows have long range.
    - **Smart AI**: Monsters chase before attacking.
    - **Patrol System**: Players walk to destinations instead of teleporting.
    - **Area Spawning**: Monsters spawn in designated zones according to scripts.
    - **Save Point System**: Death is no longer a soft-lock; players respawn at cities.
    - **High Responsiveness**: Faster movement and tighter 10px grid.
*   **Next Objective:** Implement 1st Job active skills (Bash, Double Strafe, etc.) and SP consumption.
