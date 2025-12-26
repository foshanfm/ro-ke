# RO-Idle-Bot Technical Architecture

本文档旨在指导 AI 开发者理解本项目的核心架构设计原则，确保后续开发的一致性和稳定性。

## 1. 核心设计原则 (Design Principles)

### 1.1. 异步双轨模型 (Async Dual-Track Model)
战斗系统 **不是** 传统的回合制。玩家 (`Player Loop`) 和怪物 (`Monster Loop`) 运行在两个完全独立的 `setTimeout` 递归链上。
*   **目的:** 模拟真实时间 (Real-time) 战斗。高攻速 (Agi) 可以压制低攻速。
*   **风险:** 竞态条件 (Race Condition)。例如玩家死后，怪物已经发出的攻击指令依然会生效。
*   **解决方案:** **会话锁 (Session Lock)**。

### 1.2. 会话锁机制 (Session Locking)
在 `src/game/combat.js` 中，维护一个全局 `combatSessionId`。
*   每次 `startBot()` 时，ID 自增。
*   每个异步 Loop 在启动时捕获当前的 ID。
*   在执行任何状态修改（扣血、移动、结算）前，**必须** 校验持有 ID 是否等于全局 ID。
*   **如果 ID 不匹配，立即静默退出**。这是防止“死后诈尸”和“多重循环”的唯一真理。

### 1.3. 显式持久化 (Explicit Persistence)
我们 **摒弃了** `watch(player)` 这种全自动保存模式。
*   **原因:** 战斗中每秒可能触发 10 次状态变更，频繁写入 `localStorage` 既耗能又不安全（可能写入中间态）。
*   **策略:** 仅在“安全检查点 (Checkpoints)”保存：
    *   战斗结算完成 (Monster Dead)。
    *   玩家执行关键指令 (Equip, Add Stat, Buy/Sell)。
    *   定时器备份 (每 30s)。

### 1.4. 公式纯函数化 (Pure Formulas)
所有数值计算逻辑（伤害、命中、属性）必须位于 `src/game/formulas.js`。
*   **目的:** 复用。战斗循环 (`combat.js`) 和 模拟器 (`simulator.js`) 必须使用完全相同的公式，保证模拟结果的真实性。
*   **禁止:** 在 `combat.js` 中硬编码伤害公式。

## 2. 模块职责 (Module Responsibilities)

*   **`player.js`**: 
    *   **State Owner**: 只有它能直接修改 `player` 对象（除了 combat 中的扣血）。
    *   **Action Handler**: 处理 `equip`, `learnSkill`, `warp` 等指令逻辑。
*   **`combat.js`**: 
    *   **Loop Manager**: 管理战斗循环的生命周期。
    *   **Logger**: 生成战斗日志。
*   **`formulas.js`**:
    *   **Math**: 只包含计算，不包含状态。输入属性，输出数值。
*   **`simulator.js`**:
    *   **Headless Runner**: 模拟 `combat.js` 的逻辑，但不依赖 `setTimeout`，用于快速计算期望值。

## 3. 开发指南 (Developer Guide)

### 当你需要添加新功能时...

1.  **添加新属性 (如 Luck 影响掉率):**
    *   先修改 `formulas.js`，添加 `calcDropRate(baseRate, luk)`。
    *   在 `combat.js` 和 `simulator.js` 中同时引用该公式。
2.  **添加新职业 (如转职):**
    *   在 `jobs.js` 定义配置。
    *   在 `player.js` 中处理转职重置逻辑。
    *   **注意:** 检查 `recalculateMaxStats` 是否需要适配新职业特性。
3.  **修改战斗逻辑:**
    *   **永远** 检查 `combatSessionId`。
    *   **永远** 检查 `target.hp > 0` 和 `player.hp > 0`。

## 4. 已知风险与规避 (Known Risks)

*   **Floating Point**: JS 浮点数精度问题。目前使用 `Math.floor` 向下取整。涉及 Zeny 计算时需小心。
*   **Map Transition**: 切换地图时必须调用 `stopBot()` 清除循环，防止旧地图的怪物在新地图“追杀”。（已通过 Session Lock 解决，但逻辑上仍需注意）。
