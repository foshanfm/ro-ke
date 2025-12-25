# 项目蓝图: RO-Idle-Bot (仙境传说挂机版)

## 1. 概述 (Overview)
一个基于 Web 的放置类游戏，旨在复刻使用自动化外挂（如 Kore Easy/OpenKore）挂机《仙境传说 Online》(RO) 的体验。游戏核心在于基于文本的控制台交互、自动化的战斗循环以及策略性的配置（类似 `config.txt`），而非手动操作角色。目标是从初学者 (Novice) 一路成长并转职为二转职业。

## 2. 架构与设计 (Architecture & Design)
*   **前端:** Vue 3 + Vite + Tailwind CSS。
*   **状态管理:** Vue `reactive`/`ref` 模拟游戏服务器数据。
*   **持久化:** `localStorage` (通过 `watch` 监听玩家状态自动保存)。
*   **游戏循环:** 
    *   **Combat Loop:** 基于 ASPD (攻速) 的异步循环。
    *   **Recovery Loop:** 独立于战斗的自然回血/回蓝循环 (Tick rate: 5s)。
*   **UI:** "控制台优先" 设计。核心交互是查看日志流和输入指令（提供快捷指令按钮）。

## 3. 路线图 (Roadmap)

### 第一阶段: 核心引擎与地基 (Phase 1: Core Engine & Foundation) - [已完成]
- [x] **控制台 UI:** 基础日志显示、命令解析、自动滚动。
- [x] **战斗循环 (Combat Loop):** 自动索敌、攻击、基于属性的伤害计算。
- [x] **回复循环 (Recovery Loop):** 站立/战斗中自动回复 HP/SP，支持技能修正。
- [x] **职业架构:** 
    *   Base Lv / Job Lv 双等级分离。
    *   职业配置 (Novice + 5大一转职业) 的 HP/SP 系数与 ASPD 修正。
    *   指数级经验成长表。
- [x] **属性系统:**
    *   六维基础属性 (STR, AGI, VIT, INT, DEX, LUK)。
    *   素质点 (Stat Points) 分配功能 (`add str 1`)。
    *   衍生属性计算 (MaxHP, MaxSP, Hit, Flee)。
- [x] **持久化:** 自动存档/读档，支持数据迁移。
- [x] **基础背包:** 物品掉落与 `i` (item) 查看命令。
- [x] **容错机制:** 启动时自动复活 (Auto-Resurrection)、数值安全检查。

### 第二阶段: 技能与进阶 (Phase 2: Skills & Progression) - [进行中]
- [x] **技能系统核心:**
    *   `skills.js` 数据库 (定义 Novice & 一转技能)。
    *   前置条件检查 (职业、前置技能等级)。
    *   `skill` 命令：查看与学习技能。
- [ ] **装备系统 (Equipment System):**
    *   [ ] 装备数据结构 (武器、防具)。
    *   [ ] 装备栏位 (右手、身体等)。
    *   [ ] `equip` 命令与属性加成 (Atk, Def)。
- [ ] **消耗品与生存 (Consumables):**
    *   [ ] `use <item>` 命令。
    *   [ ] 自动吃药配置 (Auto-Potion Config)。
- [ ] **战斗 2.0 (Active Skills):**
    *   [ ] 主动技能释放逻辑 (消耗 SP 造成伤害/Buff)。
    *   [ ] 被动技能实装 (如 HP Recovery, Sword Mastery)。
- [ ] **转职系统 (Job Change):**
    *   [ ] `job change` 命令 (需满足 Job Lv 10 & Basic Skill Lv 9)。
    *   [ ] 转职属性重算与加成。

### 第三阶段: 世界与经济 (Phase 3: World & Economy)
- [ ] **地图系统:** 抽象地图移动 (prontera_fild01, pay_dun00)。
- [ ] **商店:** NPC 买卖系统。
- [ ] **坐下 (Sitting):** `sit` 命令加速回复。

### 第四阶段: 二转职业 (Phase 4: Second Jobs)
- [ ] 2-1 和 2-2 职业 (骑士、巫师、猎人、刺客、牧师)。

## 4. 当前状态 (Current State)
*   **版本:** 0.3.0 (Skill & Recovery Update)
*   **可玩内容:** 
    *   挂机打怪 (波利/疯兔/绿棉虫)。
    *   升级 Base/Job 等级。
    *   分配素质点。
    *   学习技能 (Novice 技能)。
    *   体验自然回血机制。
*   **下一步:** 实装 **装备系统**，让角色拥有武器和防具，为转职后的物理/魔法伤害差异化做准备。
