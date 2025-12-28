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
- [x] **Initialization Polish**: 
  - [x] Resolved login race-conditions and refined warp de-duplication.
  - [x] **Zeny Stability**: Fixed `toLocaleString` crash in UI rendering.
- [x] **Combat Realism**:
  - [x] **Monster Persistence**: Monsters continue attacking if player stops bot but remains in range.
  - [x] **Safety Checks**: Prevented cross-map zombie loops.
  - [x] **Loading Logic Refactor**: Fixed race-condition where `loadGame` occurred before Static DB init. Enforced strict 4-step sequence + UI-side stat refresh to guarantee correct attribute display upon login.

### Phase 19: Economy & Data Stability [Completed]
- [x] **Dynamic Pricing**: Hybrid price system merging compiled DB with hardcoded objects.
- [x] **Automatic Price Generation**: Compiler now auto-calculates sell prices (50% of buy) if missing in DB.
- [x] **Account Migration Safety**: Incremented `DATA_VERSION` to force DB refresh for legacy characters.
- [x] **Zeny Safeguards**: Robust `NaN` protection and formatted number displays.
- [x] **Equipment Data Unification**: Data-driven stat engine fully integrated with `item_db.txt`.
- [x] **Item Detail Enrichment**: Merged description tables and parsed job/location metadata in compiler.
- [x] **Conflict Logic**: Implemented two-handed weapon vs shield constraints.
- [x] **Dynamic Bonus Engine**: Support for script-based `bonus` commands (STR, ATK, HP, etc.).

### Phase 20: SP Mechanics & Skills [Upcoming]
- [ ] **SP Consumption**: Integrate cast costs into `castSkill`.
- [ ] **1st Jobs Action Skills**: Bash, Double Strafe, Elemental Bolts.
- [ ] **Cast Time System**: Variable cast times based on DEX and skill level.

### Phase 21: Advanced Item Systems [Upcoming]
- [ ] **Enchantment System**: 
    - Support for NPC-based item stat re-rolling.
    - Note: Metadata for enchantment NPCs (NAVI tags) is currently stripped in `db_compiler.cjs` to clean up UI, will need to be restored or parsed into a proper `enchant_at` field later.
- [ ] **Refining System**: Material-based equipment upgrades (e.g., Elunium, Oridecon).

### Phase 22: Advanced Inventory & Card System [Completed]
- [x] **Inventory UI**: Modal-based management for Gear, Usables, and Cards.
- [x] **Card Insertion Flow**: Interactive UI for compounding cards with location validation.
- [x] **Multiplier Naming**: Support for Double/Triple/Quadruple prefixes.
- [x] **Suffix Support**: Integration of `cardpostfixnametable.txt` for `of XXX` naming convention.
- [x] **Sub-Detail Inspection**: Clickable card slots in equipment details for rapid cross-referencing.

### Phase 23: Ammo System & UI Refinement [Completed]
- [x] **Ammo System**: Dedicated `Ammo` gear slot with stack-based equipping logic.
- [x] **Combat Enforcement**: Bow attacks require and consume 1 arrow per hit.
- [x] **UI Cleanup**: Transitioned to lean, text-only inventory (removed icons and redundant type tags).
- [x] **Legacy Migration**: Automated equipment object patching for existing accounts.
- [x] **Map Monster Details**: Clickable map monster list for instant stat inspection.
- [x] **Slot Display Fix**: Only show slot indicators for items that actually have slots.

### Phase 24: Codebase Modularization & Refactoring [Completed]
- [x] **Global Logger**: Dedicated reactive logging module (`logger.js`) for decoupled event tracking.
- [x] **Stat Manager**: Extracted complex stat calculation logic into `statManager.js`.
- [x] **AI Handler Pattern**: Split monolithic `aiTick` into specialized `MovementHandler`, `TargetingHandler`, and `CombatHandler`.
- [x] **Code Quality**: Improved testability and readablity of the core combat loop.
- [x] **Navigation Graph Fix**: Restored missing `buildNavigationGraph` call in `DataManager.js` initialization.

### Phase 25: UI & Logic Stabilization [Upcoming]
- [ ] **Navigation Path UI**: Visual indicator of the current path planned by the AI.
- [ ] **Map Context Menu**: Right-click on map names or entities to trigger actions.
- [ ] **Warp De-duplication Refinement**: Better proximity-based merging for large cities.

### Phase 26: Coordinate System Standardization [Completed]
- [x] **Universal Constant**: Introduced `CELL_SIZE = 10` in `constants.js`.
- [x] **Refactoring**: Updated `mapManager`, `combat`, and `MovementHandler` to use centralized defaults instead of magic numbers.
- [x] **Helpers**: Added `toGrid`, `toPixel`, and `formatPos` for consistent logging.

### Phase 27: Authentic RO Damage System Implementation [Completed]
- [x] **DB Range Storage**: Updated `db_compiler.cjs` to store `atkMin` and `atkMax` using the `base ± variance` formula.
- [x] **Dynamic Sampling**: Modified `combat.js` to sample random ATK from monster ranges during attack.
- [x] **Damage Variance**: Added ±5% damage variance to `calculateDamageFlow` in `formulas.js` for unpredictable combat.
- [x] **Backward Compatibility**: Implemented fallback for legacy monster instances to prevent `NaN` damage.
- [x] **Data Re-compilation**: Regenerated monster database (1964 mobs) with enhanced ATK metadata.

### Phase 28: Merchant NPC & Bot Strategies [Completed]
- [x] **Merchant Infrastructure**: City-based NPC deployment with `npcs.js`.
- [x] **Proximity Enforcement**: Trading requires being within 5 cells of a Merchant.
- [x] **Official Item Shop**: Dynamic inventory loading from `dealer.json`.
- [x] **Advanced Configuration**: `conf strategy` command for per-item supply/loot rules.
- [x] **Autonomous Restocking**: FSM-based `RestockHandler` for recall, trading, and auto-return to field.
- [x] **Smart Looting**: Protected items (Cards/Rares) vs automated junk (ETC) liquidation.
- [x] **Stabilization**: Resolved `saveGame` import missing in `commands.js` and `curMapId` initialization order in `combat.js`.

### Phase 29: Elemental Damage System [Completed]
- [x] **Elemental Table**: 10 element types with 4-level damage modifier matrix based on `attr_fix.txt`.
- [x] **Monster Element Parsing**: `db_compiler.cjs` extracts element code from `mob_db.txt` (fixed formula).
- [x] **Damage Integration**: `formulas.js` applies elemental modifiers during damage calculation.
- [x] **UI Enhancement**: Map monsters now display element type (e.g., "波利 (水)").

### Phase 30: Advanced Combat Modifiers (Size & Race) [Completed]
- [x] **Size Fix Matrix**: Weapon damage correction based on `size_fix.txt` (Dagger vs Large = 50%, etc.).
- [x] **Race & Size Extraction**: `db_compiler.cjs` parses monster size and race from `mob_db.txt`.
- [x] **Multiplier Engine**: `statManager.js` aggregates percentages from `bonus2 bAddRace/Ele/Size`.
- [x] **Combat Integration**: Damage formula applies Elemental, Size, and Card multipliers (Race/Ele/Size).
- [x] **UI Display**: Map monsters show full metadata (e.g., "波利 (水/中/植物)").
- [x] **Ammo Property**: Arrow element propagates to Player attack element for bows.

### Phase 31: Advanced Configuration UI & Shopping Experience [Completed]
- [x] **Strategy Modal**: Dedicated GUI for configuring bot behaviors (Supply/Loot).
- [x] **Visual Configuration**: Input validation, granular toggles, and inventory-based whitelist/blacklist management.
- [x] **Interactive Shop Modal**: 
    - **Visual Shopping**: Grid view of items sold by nearby merchants.
    - **Sell Logic**: Tabbed interface for selling items ("Sell Queue") with inventory hiding.
    - **Starter Pack**: Quick-buy button for novice essentials.
- [x] **UI Optimization**: 
    - **Portal Decluttering**: Smart filtering of "Known Exits" list in high-density maps (e.g. Prontera).
    - **Modal Architecture**: Standardized overlay system for Shops, Strategy, Inventory, and Stats.
    - **Focus Protection**: Refactored `App.vue` to move modals to root level and implemented `@click.stop` to prevent console input stealing focus.
    - [x] **Interaction Polish**: Removed `pointer-events-none` from disabled strategy sections to allow configuration before activation.
- [x] **Retro CMD Boot Interface**:
    - [x] Standard B/W Terminal style with real-time initialization logs.
    - [x] Sequential data-driven loading (Items -> Monsters -> Warps -> Maps).
    - [x] Explicit stat recalculation gate to ensure 100% attribute accuracy on game start.
- [x] **Smart Navigation UI**:
    - [x] Categorization of portals into "World Exits" (high priority) and "Local Facilities" (distance-filtered).
    - [x] Prevents major gates (e.g., Prontera East/West) from being hidden by indoor facilities.
### Phase 32: Stat Stability & Precision [Completed]
- [x] **Zero-Tolerance Loading**: Removed legacy "survival" HP/SP formulas. If DB fails, game errors out rather than showing inaccurate data.
- [x] **Attribute Bonus Sync**: Fixed data binding so that Job and Equipment bonuses (e.g., Novice Job 10's +1) are visible in the Stats Modal.
- [x] **Loading Pipeline Integrity**: Enforced strict validation of `JobStats` before game entry.

### Phase 33: AI Engine Stability [Completed]
- [x] **Session Breakthrough**: Allowed `auto` command to bypass state locks and force-reset the AI engine.
- [x] **Loop Continuity**: Fixed race conditions during map transitions (warps) that caused the AI loop to die.
- [x] **Standardized Movement**: Unified warp handling across manual and autonomous navigation.
- [x] **Spawn Logic**: Fixed monster stacking via collision detection and robust HP initialization.
- [x] **Navigation UI**: Added NPC list with coordinates and compacted indoor portals into a dropdown.
- [x] **Batch Selling**: Implemented "Add All" and "Queue All Junk" functions in the Shop UI.
- [x] **Test Support**: Created 10 level-distributed test maps (Lv 1-100) with chained warps.
- [x] **UI Polish**: Optimized monster list with level-sorting and display limits.

## 4. Current State
*   **Version:** 3.5.0 (Phase 33 - AI Stability)
*   **Stability:** High (Fixed AI loop death on warp).
*   **Performance:** Elite.
*   **New Features:**
    - **Session Breakthrough**: `auto` command now acts as a reset if the bot hangs.
    - **Test Ecosystem**: 10 standard-monster-only test maps (Lv 1-100) with chained navigation.
    - **Batch Merchant Tools**: Batch selling of ETC junk and "Sell All" queue for inventory management.
    - **Navigation Navigation**: NPC coordinates and facility dropdown for cleaner UI.
*   **Next Objective:** Phase 20: SP Mechanics & Skills (SP costs, Cast Time, Cool Down).
