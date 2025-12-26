# 项目蓝图: RO-Idle-Bot (仙境传说挂机版)

## 1. 概述 (Overview)
一个基于 Web 的放置类游戏，旨在复刻使用自动化外挂（如 Kore Easy/OpenKore）挂机《仙境传说 Online》(RO) 的体验。游戏核心在于基于文本的控制台交互、自动化的战斗循环以及策略性的配置（类似 `config.txt`），而非手动操作角色。目标是从初学者 (Novice) 一路成长并转职为二转职业。

## 2. 架构与设计 (Architecture & Design)
*   **前端:** Vue 3 + Vite + Tailwind CSS。
*   **状态管理:** Vue `reactive`/`ref` 模拟游戏服务器数据。
*   **持久化:** `localStorage` (通过 `watch` 监听玩家状态自动保存)。
*   **游戏循环 (Game Loop):** 
    *   **异步双轨系统 (Dual Track Async System):** 
        *   **Player Loop:** 由玩家 ASPD 驱动 (Delay = `(200-ASPD)*20` ms)，负责索敌和攻击。
        *   **Monster Loop:** 由怪物 Attack Delay 驱动 (不同怪物攻速不同)，独立攻击玩家。
    *   **Recovery Loop:** 独立于战斗的自然回血/回蓝循环 (Tick rate: 5s)。
*   **属性公式 (Renewal + Classic Hybrid):**
    *   **ATK:** `StatusATK + WeaponATK`。StatusATK 包含 `(Str/10)^2` 的额外加成。
    *   **MATK:** `(Int/10)^2` 额外加成。
    *   **DEF:** `HardDEF` (装备) + `SoftDEF` (Vit/Agi/Lv)。
    *   **ASPD:** 受 Agi 和 Dex 影响，直接决定攻击间隔。
    *   **Hit/Flee/Crit:** 完全实装 RO 经典公式。
*   **交互体验 (UX):**
    *   **智能提示 (IntelliSense):** 命令行支持指令与参数的实时补全 (Tab/Enter)。
    *   **全中文环境:** 物品、怪物、帮助文档全面汉化。

## 3. 路线图 (Roadmap)

### 第一阶段: 核心引擎与地基 (Phase 1: Core Engine & Foundation) - [已完成]
- [x] **控制台 UI:** 基础日志显示、命令解析、自动滚动。
- [x] **战斗循环:** 
    - [x] 自动索敌与攻击。
    - [x] **异步双轨战斗:** 玩家和怪物拥有独立的攻击频率。
    - [x] 命中(Hit)、回避(Flee)、暴击(Crit) 判定。
- [x] **属性系统:**
    - [x] 六维基础属性 (STR, AGI, VIT, INT, DEX, LUK)。
    - [x] 素质点消耗递增机制 (2~11点/级)。
    - [x] 复杂的面板属性计算 (ATK, DEF, MATK 等)。
- [x] **职业架构:** Base Lv / Job Lv 双等级，职业配置修正。
- [x] **持久化:** 自动存档/读档。

### 第二阶段: 技能与进阶 (Phase 2: Skills & Progression) - [已完成]
- [x] **技能系统核心:**
    - [x] `skills.js` 数据库。
    - [x] 技能学习逻辑 (Skill Points)。
    - [x] 被动技能实装 (二刀连击, 回避率增加, HP回复增加)。
- [x] **装备系统 (Equipment System):**
    - [x] 装备部位 (Weapon, Armor)。
    - [x] `equip`/`unequip` 命令。
    - [x] 属性加成实装。
- [x] **消耗品与生存 (Consumables):**
    - [x] `use <item>` 命令 (红药水)。
    - [x] **Config 系统:** `conf` 指令，支持 `auto_hp_percent` 自动喝药。
- [x] **怪物图鉴完善:** 实装 Lv 1-10 所有怪物及其详细属性 (12种怪物)。

### 第三阶段: 世界与经济 (Phase 3: World & Economy) - [进行中]
- [x] **地图系统 (Map System):** 
    - [x] `maps.js` 定义地图与怪物分布。
    - [x] `map` 指令查看与移动。
    - [x] 区域化刷怪逻辑。
- [x] **智能交互 (Smart UI):**
    - [x] 命令行输入智能提示与补全。
- [x] **经济系统 (Economy):**
    - [x] Zeny 货币实装。
    - [x] 掉落物出售 (`sell`)。
    - [x] 商店购买 (`buy`) 消耗品。
- [ ] **代码重构 (Refactor):**
    - [ ] 提取公式到 `formulas.js`。
- [ ] **坐下 (Sitting):** `sit` 命令加速回复。
- [ ] **转职系统 (Job Change):**
    - [ ] `job change` 命令。
    - [ ] 转职任务或条件检查。

### 第四阶段: 二转职业 (Phase 4: Second Jobs)
- [ ] 2-1 和 2-2 职业。

## 4. 当前状态 (Current State)
*   **版本:** 0.8.0 (Economy & Map System)
*   **可玩内容:** 
    *   全功能挂机：自动打怪、自动喝药、自动存读档。
    *   经济闭环：打怪赚钱 -> 商店买药。
    *   探索世界：通过 `map` 指令在 5 张不同难度的地图间穿梭。
*   **下一步:** 提取核心公式，为转职系统的属性大修做准备。
