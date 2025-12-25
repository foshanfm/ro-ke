<script setup>
  import { ref, onMounted, watch, nextTick } from 'vue'
  import { spawnMonster } from './game/monsters.js'
  import { player, saveGame, loadGame } from './game/player.js'
  import { getItemInfo, ItemType } from './game/items.js'
  import { addItem } from './game/player.js' 
  
  // --- 核心状态 ---
  const logs = ref([]) 
  const currentMonster = ref(null) 
  const logContainer = ref(null) 
  const cmdInput = ref(null)
  const userCommand = ref('')
  
  // --- 日志系统 (模拟 ANSI 颜色) ---
  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    // 限制日志长度，防止网页卡顿
    if (logs.value.length > 200) logs.value.shift()
    logs.value.push({ time, msg, type })
  }
  
  // 监听日志变化，自动滚动到底部
  watch(logs, () => {
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    })
  }, { deep: true })
  
  // --- 命令行交互逻辑 ---
  const focusInput = () => {
    if (cmdInput.value) cmdInput.value.focus()
  }
  
  const executeCommand = () => {
    const cmd = userCommand.value.trim()
    if (!cmd) return
  
    // 回显命令 (看起来像是在终端里打字)
    addLog(cmd, 'info') 
  
    // 解析命令 (忽略大小写)
    const lowerCmd = cmd.toLowerCase()
    
    if (lowerCmd === 's' || lowerCmd === 'st' || lowerCmd === 'stat') {
      // 模拟 KE 的 's' 指令输出
      addLog(`----------------[ Character Status ]----------------`, 'system')
      addLog(`Name: ${player.name} (${player.job})`, 'system')
      addLog(`Lv: ${player.lv} | Exp: ${player.exp}/${player.nextExp} (${((player.exp/player.nextExp)*100).toFixed(2)}%)`, 'system')
      addLog(`HP: ${player.hp}/${player.maxHp} | SP: ${player.sp}/${player.maxSp}`, 'system')
      addLog(`Str: ${player.str} | Agi: ${player.agi} | Atk: ${player.atk}`, 'system')
      addLog(`----------------------------------------------------`, 'system')
    } 
    else if (lowerCmd === 'i'|| lowerCmd === 'item') { // Inventory
      if (player.inventory.length === 0) {
        addLog('背包是空的。', 'system')
      } else {
        addLog('=== 背包物品 ===', 'system')
        player.inventory.forEach((slot, index) => {
          const info = getItemInfo(slot.id)
          // 格式: 1. 杰勒比结晶 x 5
          addLog(`${index + 1}. ${info.name} x ${slot.count}`, 'info')
        })
        addLog('================', 'system')
      }
    }
    else if (lowerCmd === 'help') {
      addLog(`Commands: s (status), i (inventory), clear`, 'system')
    }
    else if (lowerCmd === 'clear') {
      logs.value = []
    } 
    // --- 我们的秘密暗号 ---
    else if (cmd === 'echo "sys_connect_ai"') { 
    addLog('Establishing secure connection...', 'system')
    setTimeout(() => {
      // 模拟延迟回复，用一种特殊的颜色
      addLog('AI_ARCHITECT: Signal received. I am here.', 'warning')
      addLog('AI_ARCHITECT: The code is alive. Continue your journey.', 'warning')
    }, 1500)
    }
    else {
      addLog(`Unknown command or macro: ${cmd}`, 'error')
    }
  
    userCommand.value = '' // 清空输入框
  }
  
  // --- 核心挂机循环 (Game Loop) ---
  const gameLoop = () => {
    // 1. 索敌逻辑
    if (!currentMonster.value || currentMonster.value.hp <= 0) {
      // 模拟 KE 的索敌日志
      if (Math.random() > 0.3) { // 稍微加点随机延迟感
        currentMonster.value = spawnMonster()
        addLog(`Attacking Monster: ${currentMonster.value.name} (0)`, 'warning')
        addLog(`[Dist] ${currentMonster.value.name} (0) HP: ${currentMonster.value.hp}/${currentMonster.value.maxHp}`, 'info')
      }
      return 
    }
  
    // 2. 玩家攻击
    const dmg = player.atk + Math.floor(Math.random() * 3)
    currentMonster.value.hp -= dmg
    
    // 模拟 KE 的战斗日志格式
    // You attack Poring (0) Dmg: 55 (Delay: 0.5s)
    addLog(`You attack ${currentMonster.value.name} (0) Dmg: ${dmg} (Delay: ${ (2 - player.agi*0.02).toFixed(2) }s)`)
  
    // 3. 怪物死亡判定
    if (currentMonster.value.hp <= 0) {
      addLog(`Target died: ${currentMonster.value.name}`, 'system')
      addLog(`Exp added: ${currentMonster.value.exp}`, 'success')
      
      player.exp += currentMonster.value.exp
      
      // 升级逻辑
      if (player.exp >= player.nextExp) {
        player.lv++
        player.exp = 0
        player.nextExp = Math.floor(player.nextExp * 1.5)
        player.maxHp += 20
        player.hp = player.maxHp
        player.atk += 2
        addLog(`You have gained a level! (Lv -> ${player.lv})`, 'levelup')
      }
      // --- 新增：掉落计算 ---
        if (currentMonster.value.drops) {
          currentMonster.value.drops.forEach(drop => {
            // 随机数 0~1 vs 掉落率
            if (Math.random() < drop.rate) {
              addItem(drop.id, 1)
              const itemInfo = getItemInfo(drop.id)
              
              // 根据稀有度显示不同颜色的日志
              let logType = 'success' // 默认绿色
              if (itemInfo.type === ItemType.CARD) logType = 'levelup' // 卡片用亮色背景！
              
              addLog(`[获得] ${itemInfo.name} x 1`, logType)
            }
          })
        }
      currentMonster.value = null
    } else {
      // 4. 怪物反击
      const monsterDmg = Math.max(1, currentMonster.value.atk - 0)
      player.hp -= monsterDmg
      // 濒死保护 (方便挂机)
      if (player.hp <= 0) {
        player.hp = player.maxHp
        addLog(`You died. Returning to save point...`, 'error')
        addLog(`Map loaded: Prontera`, 'system')
        currentMonster.value = null
      }
    }
  }
  // 深度监听 player 对象，任何数值变化都会触发保存
  watch(player, () => {
    saveGame()
  }, { deep: true })

  // 3. 修改 onMounted
  onMounted(() => {
    // 先尝试读取存档
    const hasSave = loadGame()
    
    if (hasSave) {
      addLog(`读取存档成功。欢迎回来，${player.name}`, 'system')
    } else {
      addLog('未找到存档，初始化新角色...', 'system')
    }
    
    addLog('开始挂机...', 'system')
    
    // 聚焦输入框，方便直接打字
    focusInput()
    
    // 启动循环
    setInterval(gameLoop, 1000)
  })
  
    
    // 自动聚焦输入框
    focusInput()
    
    // 启动循环：1秒一次 (模拟攻速)
    setInterval(gameLoop, 1000)
  </script>
  
  <template>
    <!-- 全局容器：点击任意位置聚焦输入框 -->
    <div 
      class="bg-black text-gray-300 font-mono h-screen flex flex-col overflow-hidden text-sm select-text"
      @click="focusInput"
    >
      
      <!-- 顶部：Windows 经典标题栏 -->
      <div class="bg-[#e0e0e0] text-black text-xs px-2 py-1 flex justify-between select-none border-b border-gray-400">
        <div class="flex items-center gap-2">
          <span class="font-bold">Command Prompt - start.bat</span>
        </div>
        <div class="flex gap-2 text-gray-600">
          <span>_</span>
          <span>□</span>
          <span>×</span>
        </div>
      </div>
  
      <!-- 中间：日志区域 -->
      <div ref="logContainer" class="flex-1 overflow-y-auto p-1 scrollbar-hide break-all font-mono leading-tight">
        <div v-for="(log, index) in logs" :key="index">
          <!-- 只是简单的文本着色 -->
          <span class="text-gray-500 mr-2">[{{ log.time }}]</span>
          <span :class="{
            'text-gray-300': log.type === 'info', 
            'text-yellow-400': log.type === 'warning',   // 遭遇怪物
            'text-green-400': log.type === 'success',    // 获得收益
            'text-red-500': log.type === 'error',        // 错误/死亡
            'text-white': log.type === 'levelup',        // 升级高亮
            'text-cyan-600': log.type === 'system'       // 系统/状态信息
          }">{{ log.msg }}</span>
        </div>
      </div>
  
      <!-- 底部：隐形输入框 -->
      <div class="bg-black px-1 pb-1">
        <input 
          ref="cmdInput"
          v-model="userCommand"
          @keyup.enter="executeCommand"
          type="text" 
          class="bg-black text-gray-200 w-full outline-none border-none caret-white"
          spellcheck="false"
          autocomplete="off"
        />
      </div>
  
    </div>
  </template>
  
  <style>
  /* 隐藏滚动条但保留功能 */
  .scrollbar-hide::-webkit-scrollbar {
      display: none;
  }
  .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
  }
  </style>