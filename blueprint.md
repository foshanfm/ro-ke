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

### Phase 4: Job Change & Advancement [Next Step]
- [ ] **Job Change System:**
    - [ ] `job change` command.
    - [ ] Requirements check (Job Lv 10).
    - [ ] Stat/Skill reset and bonus application.
- [ ] **1st Jobs Implementation:**
    - [ ] **Swordman:** Bash, Magnum Break, Provoke.
    - [ ] **Mage:** Cast Time system, Elemental Bolts.
    - [ ] **Archer:** Arrow consumption, Double Strafe.
    - [ ] **Thief:** Envenom, Hiding.
    - [ ] **Acolyte:** Heal, Blessing, Agi Up.
- [ ] **World Interaction:**
    - [ ] `sit` command (2x Regen).

## 4. Current State
*   **Version:** 0.9.5 (Refactor & Automation Update)
*   **Stability:** Enterprise-grade. Protected against race conditions and save corruption.
*   **Automation:** Fully autonomous loop (Fight -> Auto Potion -> Loot -> Auto Sell -> Auto Buy).
*   **Data Integrity:** 
    - Damage formulas behave correctly (High Agi = Dodge, High Luk = Crit).
    - Drop system ensures "Bad Luck Protection" for rares.
*   **Next Objective:** Begin Phase 4 (Job Change) to break the Novice limit.
