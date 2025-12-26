RO-KE 项目 AI 开发上下文 (Context)
1. 项目核心愿景
目标：复刻经典挂机软件 OpenKore (KE) 的自动化体验，将其网页化并提供可视化 UI。

核心体验：实时控制台日志（Console-driven）、高效的后台自动循环（Botting Logic）、以及基于 RO 经典公式的战斗模拟。

2. 状态管理与数据协议 (State & Data)
响应式状态：使用 Vue 3 的 reactive 维护 player 状态。

严禁行为：禁止在 UI 组件 (.vue) 或指令层直接修改 player 的核心数值。 所有状态变更必须通过 modules/ 下对应的 Action 函数执行。

数据隔离：

静态数据：从 `src/game/data/` 目录下的 `item_db.txt` 和 `mob_db.txt` 读取，由 `dataLoader.js` 在启动时动态解析。这些文件遵循 rAthena/eAthena 数据库格式。

动态实例：装备和卡片必须以“对象实例”形式存储（包含 id 和 cards 数组），而非简单的 ID 整数，以支持后续的插卡和精炼系统。

3. 编码规范 (Vibe Coding Rules)
数据驱动 (Data-Driven)：逻辑中不得出现硬编码的数值（如 if (id === 501)）。必须通过 `getItemInfo(id)` 获取静态属性，通过 `recalculateMaxStats()` 处理公式叠加。

公式一致性：所有的二次属性（Atk, Aspd, Flee 等）必须统一在 `src/game/formulas.js` 中定义，确保模拟器 (simulator.js) 与游戏逻辑计算结果一致。其中 Aspd 逻辑由于复杂度较高，封装在 `modules/aspd.js` 中并由 `formulas.js` 调用。

特殊数据文件：`src/game/data/system/job_base_aspd.json` 存储了职业与武器配套的基础攻速和盾牌惩罚，严禁随意修改其结构。

异步循环：战斗和恢复逻辑采用非阻塞的计时器（Tick）机制，通过 `combatSessionId` 确保异步操作的安全性，防止内存泄漏或逻辑冲突。

4. 关键机制约束
负重系统：物品拥有 weight 属性。负重 > 50% 停止自然恢复，> 90% 禁止攻击并需触发回城补给逻辑。

插卡逻辑：卡片效果必须通过遍历装备实例中的 cards 数组，并累加其在数据文件中定义的 stats 属性来实现，不得使用长串 if-else。

寻路与坐标：玩家和怪物拥有 (x, y) 坐标。移动速度与 AGI 和装备加成挂钩，寻怪应基于视野范围 (View Range)。

5. AI 协作指南
上下文感知：在实现新功能前，请先查阅 `blueprint.md` 确认进度，并参考 `architecture.md` 确保模块调用符合当前的层级关系。

测试优先：涉及复杂伤害公式或技能逻辑时，请先提供独立的测试用例或模拟函数进行验证。

日志规范：通过 `addLog(msg, type)` 输出信息，确保日志类别（info, warning, success, error）使用正确以维持 UI 视觉一致性。