<script setup>
  import { ref, onMounted, watch, nextTick } from 'vue'
  import { player, saveGame, loadGame, increaseStat, learnSkill } from './game/player.js'
  import { getItemInfo, ItemType } from './game/items.js'
  import { startBot, stopBot, setLogCallback, gameState, startRecovery } from './game/combat.js' // 导入 startRecovery
  import { JobConfig } from './game/jobs.js'
  import { Skills } from './game/skills.js'

  // --- 核心状态 ---
  const logs = ref([]) 
  const logContainer = ref(null) 
  const cmdInput = ref(null)
  const userCommand = ref('')
  
  // --- 日志系统 (模拟 ANSI 颜色) ---
  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    if (logs.value.length > 200) logs.value.shift()
    logs.value.push({ time, msg, type })
  }
  
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
    const rawCmd = userCommand.value.trim()
    if (!rawCmd) return
  
    addLog(rawCmd, 'info') 
  
    // 拆分命令：add str 1 -> ['add', 'str', '1']
    const parts = rawCmd.split(/\s+/)
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)
    
    if (cmd === 'auto') {
        startBot()
    } else if (cmd === 'stop') {
        stopBot()
    }
    else if (cmd === 's' || cmd === 'st' || cmd === 'stat') {
      addLog(`----------------[ Character Status ]----------------`, 'system')
      addLog(`Name: ${player.name} | Job: ${player.job}`, 'system')
      addLog(`Base Lv: ${player.lv} | Exp: ${player.exp}/${player.nextExp} (${((player.exp/player.nextExp)*100).toFixed(2)}%)`, 'system')
      addLog(`Job  Lv: ${player.jobLv} | Exp: ${player.jobExp}/${player.nextJobExp} (${((player.jobExp/player.nextJobExp)*100).toFixed(2)}%)`, 'system')
      addLog(`HP: ${player.hp}/${player.maxHp} | SP: ${player.sp}/${player.maxSp}`, 'system')
      addLog(`Str: ${player.str} | Agi: ${player.agi} | Dex: ${player.dex}`, 'system')
      addLog(`Vit: ${player.vit} | Int: ${player.int} | Luk: ${player.luk}`, 'system')
      addLog(`Atk: ${player.atk} | Stat Points: ${player.statPoints}`, 'system')
      addLog(`Skill Points: ${player.skillPoints}`, 'system')
      // 显示已学技能
      const learnedSkills = Object.entries(player.skills).map(([id, lv]) => {
          const s = Skills[id]
          return s ? `${s.name} Lv.${lv}` : `${id} Lv.${lv}`
      }).join(', ')
      if (learnedSkills) {
          addLog(`Skills: ${learnedSkills}`, 'system')
      }
      addLog(`----------------------------------------------------`, 'system')
    } 
    else if (cmd === 'add') {
      if (args.length < 2) {
        addLog('Usage: add <stat> <amount>', 'error')
        addLog('Example: add str 1', 'dim')
      } else {
        const statName = args[0]
        const amount = parseInt(args[1])
        if (isNaN(amount) || amount <= 0) {
          addLog('请输入有效的点数。', 'error')
        } else {
          const res = increaseStat(statName, amount)
          if (res.success) {
            addLog(res.msg, 'success')
          } else {
            addLog(res.msg, 'error')
          }
        }
      }
    }
    else if (cmd === 'skill' || cmd === 'sk') {
        if (args.length === 0) {
             // 列出可学习技能 (简化版：列出当前职业所有技能)
             addLog(`Available Skills for ${player.job}:`, 'system')
             for (const [id, skill] of Object.entries(Skills)) {
                 // 简单的筛选逻辑：只显示本职业或Novice技能
                 if (skill.req.job === player.job || skill.req.job === 'Novice') {
                     const curLv = player.skills[id] || 0
                     addLog(`  ${id} : ${skill.name} (Lv.${curLv}/${skill.maxLv}) - ${skill.desc}`, 'dim')
                 }
             }
             addLog(`Type 'skill <id> <level>' to learn.`, 'system')
        } else {
            const skillId = args[0]
            const level = parseInt(args[1]) || 1
            const res = learnSkill(skillId, level)
            if (res.success) {
                addLog(res.msg, 'success')
            } else {
                addLog(res.msg, 'error')
            }
        }
    }
    else if (cmd === 'i'|| cmd === 'item') { 
      if (!player.inventory || player.inventory.length === 0) {
        addLog('背包是空的。', 'system')
      } else {
        addLog('=== 背包物品 ===', 'system')
        player.inventory.forEach((slot, index) => {
          const info = getItemInfo(slot.id)
          addLog(`${index + 1}. ${info.name} x ${slot.count}`, 'info')
        })
        addLog('================', 'system')
      }
    }
    else if (cmd === 'help') {
      addLog(`Commands:`, 'system')
      addLog(`  auto        - Start auto-attack`, 'dim')
      addLog(`  stop        - Stop auto-attack`, 'dim')
      addLog(`  s / stat    - Check status`, 'dim')
      addLog(`  i / item    - Check inventory`, 'dim')
      addLog(`  add <stat> <n> - Increase stats (e.g., add str 1)`, 'dim')
      addLog(`  skill       - List available skills`, 'dim')
      addLog(`  skill <id>  - Learn skill (e.g., skill basic_skill 1)`, 'dim')
      addLog(`  clear       - Clear log`, 'dim')
    }
    else if (cmd === 'clear') {
      logs.value = []
    } 
    else if (rawCmd === 'echo "sys_connect_ai"') { 
      addLog('Establishing secure connection...', 'system')
      setTimeout(() => {
        addLog('AI_ARCHITECT: Signal received. I am here.', 'warning')
        addLog('AI_ARCHITECT: The code is alive. Continue your journey.', 'warning')
      }, 1500)
    }
    else {
      addLog(`Unknown command or macro: ${rawCmd}`, 'error')
    }
  
    userCommand.value = '' 
  }
  
  watch(player, () => {
    saveGame()
  }, { deep: true })

  onMounted(() => {
    setLogCallback(addLog)
    
    // 启动回复循环
    startRecovery()

    const hasSave = loadGame()
    
    if (hasSave) {
      addLog(`读取存档成功。欢迎回来，${player.name} (Lv.${player.lv} ${player.job})`, 'system')
    } else {
      addLog('未找到存档，初始化新角色...', 'system')
    }
    
    addLog(`System ready. Type 'auto' to start fighting.`, 'system')
    
    focusInput()
  })
  </script>
  
  <template>
    <div 
      class="bg-black text-gray-300 font-mono h-screen flex flex-col overflow-hidden text-sm select-text"
      @click="focusInput"
    >
      
      <div class="bg-[#e0e0e0] text-black text-xs px-2 py-1 flex justify-between select-none border-b border-gray-400">
        <div class="flex items-center gap-2">
          <span class="font-bold">OpenKore Web - {{ player.name }} ({{ player.job }} {{ player.lv }}/{{ player.jobLv }})</span>
        </div>
        <div class="flex gap-2 text-gray-600">
          <span>_</span>
          <span>□</span>
          <span>×</span>
        </div>
      </div>
  
      <div ref="logContainer" class="flex-1 overflow-y-auto p-1 scrollbar-hide break-all font-mono leading-tight">
        <div v-for="(log, index) in logs" :key="index">
          <span class="text-gray-500 mr-2">[{{ log.time }}]</span>
          <span :class="{
            'text-gray-300': log.type === 'info', 
            'text-yellow-400': log.type === 'warning',   
            'text-green-400': log.type === 'success',    
            'text-red-500': log.type === 'error',        
            'text-white': log.type === 'levelup',        
            'text-cyan-600': log.type === 'system',      
            'text-gray-500': log.type === 'dim',         
            'text-gray-100': log.type === 'default'
          }">{{ log.msg }}</span>
        </div>
      </div>
  
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
  .scrollbar-hide::-webkit-scrollbar {
      display: none;
  }
  .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
  }
  </style>