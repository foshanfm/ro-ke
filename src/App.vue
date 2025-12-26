<script setup>
  import { ref, onMounted, watch, nextTick, computed, onUnmounted } from 'vue' 
  import { player, saveGame, loadGame, increaseStat, learnSkill, equipItem, unequipItem, useItem, setConfig, warp, sellItem, buyItem, getShopList } from './game/player.js'
  import { getItemInfo, ItemType } from './game/items.js'
  import { startBot, stopBot, setLogCallback, gameState, startRecovery } from './game/combat.js'
  import { JobConfig } from './game/jobs.js'
  import { Skills } from './game/skills.js'
  import { getEquipInfo, EquipType } from './game/equipment.js'
  import { Maps } from './game/maps.js'

  // --- 核心状态 ---
  const logs = ref([]) 
  const logContainer = ref(null) 
  const cmdInput = ref(null)
  const userCommand = ref('')
  
  // --- 智能提示状态 ---
  const showSuggestions = ref(false)
  const suggestionIndex = ref(0)
  
  // 基础指令库
  const baseCommands = [
      'auto', 'start', 'stop', 'map', 'conf', 's', 'stat', 'i', 'item', 
      'add', 'skill', 'use', 'equip', 'unequip', 'sell', 'buy', 'help', 'clear'
  ]

  // 计算当前的提示列表
  const suggestions = computed(() => {
      const raw = userCommand.value
      if (!raw) return []

      const parts = raw.split(/\s+/)
      const cmd = parts[0].toLowerCase()
      const arg = parts.length > 1 ? parts[1].toLowerCase() : ''

      if (parts.length === 1) {
          return baseCommands.filter(c => c.startsWith(cmd)).map(c => ({ text: c, type: 'cmd' }))
      }

      if (parts.length === 2) {
          if (cmd === 'map') {
              return Object.entries(Maps)
                  .filter(([id, m]) => id.includes(arg) || m.name.includes(arg))
                  .map(([id, m]) => ({ text: id, hint: m.name, type: 'arg' }))
          }
          if (cmd === 'add') {
              const stats = ['str', 'agi', 'vit', 'int', 'dex', 'luk']
              return stats.filter(s => s.startsWith(arg)).map(s => ({ text: s, type: 'arg' }))
          }
          if (cmd === 'equip' || cmd === 'use' || cmd === 'sell') {
               const uniqueItems = new Set()
               if (cmd === 'sell') uniqueItems.add('all') 
               
               player.inventory.forEach(slot => {
                   const info = getItemInfo(slot.id)
                   if (info.name.toLowerCase().includes(arg)) {
                       uniqueItems.add(info.name)
                   }
               })
               return Array.from(uniqueItems).map(name => ({ text: name, type: 'arg' }))
          }
          if (cmd === 'buy') {
              const shop = getShopList()
              return shop.filter(item => item.name.toLowerCase().includes(arg))
                         .map(item => ({ text: item.name, hint: `${item.price}z`, type: 'arg' }))
          }
          if (cmd === 'unequip' || cmd === 'ueq') {
              return ['weapon', 'armor'].filter(s => s.startsWith(arg)).map(s => ({ text: s, type: 'arg' }))
          }
          if (cmd === 'conf') {
              return ['auto_hp_percent', 'auto_hp_item'].filter(s => s.startsWith(arg)).map(s => ({ text: s, type: 'arg' }))
          }
      }
      
      return []
  })

  // 监听输入，重置选择索引
  watch(userCommand, () => {
      suggestionIndex.value = 0
      showSuggestions.value = true
  })

  const applySuggestion = (sug) => {
      if (!sug) return
      
      const parts = userCommand.value.split(/\s+/)
      if (parts.length <= 1) {
          userCommand.value = sug.text + ' '
      } else {
          parts.pop()
          parts.push(sug.text)
          userCommand.value = parts.join(' ') + ' '
      }
      focusInput()
  }

  const handleKeyDown = (e) => {
      if (suggestions.value.length === 0) return

      if (e.key === 'ArrowUp') {
          e.preventDefault()
          suggestionIndex.value = Math.max(0, suggestionIndex.value - 1)
      } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          suggestionIndex.value = Math.min(suggestions.value.length - 1, suggestionIndex.value + 1)
      } else if (e.key === 'Tab') {
          e.preventDefault()
          applySuggestion(suggestions.value[suggestionIndex.value])
      } 
  }


  
  // --- 日志系统 ---
  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
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
  
    const parts = rawCmd.split(/\s+/)
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)
    
    // --- 指令解析 ---
    if (cmd === 'auto' || cmd === 'start') {
        startBot()
    } else if (cmd === 'stop') {
        stopBot()
    }
    else if (cmd === 's' || cmd === 'st' || cmd === 'stat') {
      const jobName = JobConfig[player.job] ? JobConfig[player.job].name : player.job
      const mapName = Maps[player.currentMap] ? Maps[player.currentMap].name : player.currentMap
      
      addLog(`----------------[ 角色状态 ]----------------`, 'system')
      addLog(`名字: ${player.name} | 职业: ${jobName}`, 'system')
      addLog(`位置: ${mapName} (${player.currentMap})`, 'system')
      addLog(`Base Lv: ${player.lv} | Exp: ${player.exp}/${player.nextExp} (${((player.exp/player.nextExp)*100).toFixed(2)}%)`, 'system')
      addLog(`Job  Lv: ${player.jobLv} | Exp: ${player.jobExp}/${player.nextJobExp} (${((player.jobExp/player.nextJobExp)*100).toFixed(2)}%)`, 'system')
      addLog(`HP: ${player.hp}/${player.maxHp} | SP: ${player.sp}/${player.maxSp}`, 'system')
      
      addLog(`[战斗属性]`, 'dim')
      addLog(`Atk: ${player.atk} | Matk: ${player.matk} | Aspd: ${player.aspd}`, 'system')
      addLog(`Def: ${player.def} | Mdef: ${player.mdef}`, 'system')
      addLog(`Hit: ${player.hit} | Flee: ${player.flee} | Crit: ${player.crit}`, 'system')

      addLog(`[基础属性] (剩余素质点: ${player.statPoints})`, 'dim')
      addLog(`Str: ${player.str} | Agi: ${player.agi} | Dex: ${player.dex}`, 'system')
      addLog(`Vit: ${player.vit} | Int: ${player.int} | Luk: ${player.luk}`, 'system')
      
      if (player.equipment) {
         const w = player.equipment[EquipType.WEAPON] ? getEquipInfo(player.equipment[EquipType.WEAPON]).name : '(无)'
         const a = player.equipment[EquipType.ARMOR] ? getEquipInfo(player.equipment[EquipType.ARMOR]).name : '(无)'
         addLog(`[装备] 右手: ${w} | 身体: ${a}`, 'dim')
      }

      // 显示资产
      addLog(`[资产] Zeny: ${player.zeny}`, 'warning')

      if (player.config) {
          addLog(`[配置] AutoHP: < ${player.config.auto_hp_percent}% (Use: ${player.config.auto_hp_item})`, 'dim')
      }

      const learnedSkills = Object.entries(player.skills).map(([id, lv]) => {
          const s = Skills[id]
          return s ? `${s.name} Lv.${lv}` : `${id} Lv.${lv}`
      }).join(', ')
      if (learnedSkills) {
          addLog(`[技能] (剩余技能点: ${player.skillPoints})`, 'dim')
          addLog(`${learnedSkills}`, 'dim')
      }
      addLog(`--------------------------------------------`, 'system')
    } 
    else if (cmd === 'add') {
      if (args.length < 2) {
        addLog('用法: add <属性> <点数>', 'error')
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
             const jobName = JobConfig[player.job] ? JobConfig[player.job].name : player.job
             addLog(`[${jobName}] 可学习技能:`, 'system')
             for (const [id, skill] of Object.entries(Skills)) {
                 if (skill.req.job === player.job || skill.req.job === 'Novice') {
                     const curLv = player.skills[id] || 0
                     addLog(`  ${id} : ${skill.name} (Lv.${curLv}/${skill.maxLv}) - ${skill.desc}`, 'dim')
                 }
             }
             addLog(`输入 'skill <id> <Lv>' 进行学习。`, 'system')
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
    else if (cmd === 'equip' || cmd === 'eq') {
        if (args.length === 0) {
             addLog('用法: equip <物品名>', 'error')
        } else {
             const target = args.join(' ') 
             const asId = parseInt(target)
             const res = equipItem(isNaN(asId) ? target : asId)
             
             if (res.success) {
                 addLog(res.msg, 'success')
             } else {
                 addLog(res.msg, 'error')
             }
        }
    }
    else if (cmd === 'unequip' || cmd === 'ueq') {
         if (args.length === 0) {
              addLog('用法: unequip <部位>', 'error')
         } else {
              const slot = args[0].toLowerCase()
              let type = null
              if (slot === 'weapon' || slot === 'w' || slot === '武器') type = EquipType.WEAPON
              if (slot === 'armor' || slot === 'a' || slot === '防具') type = EquipType.ARMOR
              
              if (type) {
                  const res = unequipItem(type)
                  if (res.success) {
                      addLog(res.msg, 'success')
                  } else {
                      addLog(res.msg, 'error')
                  }
              } else {
                  addLog('未知部位。请使用 weapon 或 armor。', 'error')
              }
         }
    }
    else if (cmd === 'use') {
        if (args.length === 0) {
             addLog('用法: use <物品名>', 'error')
        } else {
             const target = args.join(' ') 
             const asId = parseInt(target)
             const res = useItem(isNaN(asId) ? target : asId)
             
             if (res.success) {
                 addLog(res.msg, 'success')
             } else {
                 addLog(res.msg, 'error')
             }
        }
    }
    else if (cmd === 'sell') {
        if (args.length === 0) {
             addLog('用法: sell <物品名> [数量] 或 sell all', 'error')
        } else {
             const target = args[0]
             const count = args.length > 1 ? parseInt(args[1]) : 1
             const asId = parseInt(target)
             const res = sellItem(isNaN(asId) ? target : asId, isNaN(count) ? 1 : count)
             if (res.success) {
                 addLog(res.msg, 'success')
             } else {
                 addLog(res.msg, 'error')
             }
        }
    }
    else if (cmd === 'buy') {
        if (args.length === 0) {
             const list = getShopList()
             addLog('[ 商店列表 ]', 'system')
             list.forEach(item => {
                 addLog(`  ${item.name} - ${item.price}z`, 'dim')
             })
             addLog('输入 buy <物品名> [数量] 进行购买。', 'system')
        } else {
             const target = args[0]
             const count = args.length > 1 ? parseInt(args[1]) : 1
             const res = buyItem(target, isNaN(count) ? 1 : count)
             if (res.success) {
                 addLog(res.msg, 'success')
             } else {
                 addLog(res.msg, 'error')
             }
        }
    }
    else if (cmd === 'conf' || cmd === 'config') {
        if (args.length < 2) {
             addLog('用法: conf <key> <value>', 'error')
        } else {
             const key = args[0]
             const val = args[1]
             const res = setConfig(key, val)
             if (res.success) {
                 addLog(res.msg, 'success')
             } else {
                 addLog(res.msg, 'error')
             }
        }
    }
    else if (cmd === 'map') {
        if (args.length === 0) {
            addLog('[ 世界地图 ]', 'system')
            for (const [id, m] of Object.entries(Maps)) {
                addLog(`  ${id} : ${m.name} (Lv.${m.minLv}-${m.maxLv})`, 'dim')
            }
            addLog(`输入 'map <id>' 进行移动。`, 'system')
        } else {
            const mapId = args[0]
            // 如果正在挂机，先停止
            if (gameState.isAuto) {
                stopBot()
                addLog('正在停止战斗以进行移动...', 'warning')
                setTimeout(() => {
                    const res = warp(mapId)
                    if (res.success) {
                        addLog(res.msg, 'success')
                        addLog('移动完毕。', 'system')
                    } else {
                        addLog(res.msg, 'error')
                    }
                }, 1000)
            } else {
                const res = warp(mapId)
                if (res.success) {
                    addLog(res.msg, 'success')
                } else {
                    addLog(res.msg, 'error')
                }
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
          let extra = ''
          if (info.type === ItemType.EQUIP) {
              extra = info.atk ? ` (Atk:${info.atk})` : (info.def ? ` (Def:${info.def})` : '')
          }
          addLog(`${index + 1}. ${info.name} x ${slot.count}${extra}`, 'info')
        })
        addLog('================', 'system')
      }
    }
    else if (cmd === 'help' || cmd === 'h' || cmd === '?') {
      addLog(`========== [ 帮助手册 ] ==========`, 'system')
      addLog(`  auto        : 开始自动战斗`, 'dim')
      addLog(`  stop        : 停止自动战斗`, 'dim')
      addLog(`  map         : 查看地图/移动`, 'dim')
      addLog(`  conf <k> <v>: 修改配置`, 'dim')
      addLog(`  s / stat    : 查看状态`, 'dim')
      addLog(`  i / item    : 查看背包`, 'dim')
      addLog(`  add <k> <v> : 分配素质点`, 'dim')
      addLog(`  skill       : 学习技能`, 'dim')
      addLog(`  use <name>  : 使用物品`, 'dim')
      addLog(`  equip <name>: 装备物品`, 'dim')
      addLog(`  unequip <k> : 卸下装备`, 'dim')
      addLog(`  sell <n>    : 贩卖 (sell all 卖杂物)`, 'dim')
      addLog(`  buy <n>     : 购买物品`, 'dim')
      addLog(`  clear       : 清空日志`, 'dim')
      addLog(`[提示] 输入指令时按 Tab 键可智能补全`, 'system')
      addLog(`==================================`, 'system')
    }
    else if (cmd === 'clear') {
      logs.value = []
    } 
    else if (rawCmd === 'echo "sys_connect_ai"') { 
      addLog('正在建立安全连接...', 'system')
      setTimeout(() => {
        addLog('AI_ARCHITECT: 信号已接收。', 'warning')
      }, 1500)
    }
    else {
      addLog(`未知指令: ${rawCmd}`, 'error')
    }
  
    userCommand.value = '' 
  }
  
  // 移除深度 watch，改为每 30秒 自动保存
  let autoSaveTimer = null
  
  onMounted(() => {
    setLogCallback(addLog)
    startRecovery()

    const hasSave = loadGame()
    
    const jobName = JobConfig[player.job] ? JobConfig[player.job].name : '初学者'
    const mapName = Maps[player.currentMap] ? Maps[player.currentMap].name : '未知区域'
    
    if (hasSave) {
      addLog(`读取存档成功。欢迎回来，${player.name} (Lv.${player.lv} ${jobName})`, 'system')
      addLog(`当前位置: ${mapName}`, 'system')
    } else {
      addLog('未找到存档，初始化新角色...', 'system')
    }
    
    addLog(`系统就绪。输入 'auto' 开始挂机，输入 'help' 查看帮助。`, 'system')
    
    focusInput()

    // 启动自动保存
    autoSaveTimer = setInterval(() => {
        saveGame()
        // addLog('Auto saved.', 'dim') // 可选提示
    }, 30000)
  })

  onUnmounted(() => {
      if (autoSaveTimer) clearInterval(autoSaveTimer)
  })
  </script>
  
  <template>
    <div 
      class="bg-black text-gray-300 font-mono h-screen flex flex-col overflow-hidden text-sm select-text"
      @click="focusInput"
    >
      
      <div class="bg-[#e0e0e0] text-black text-xs px-2 py-1 flex justify-between select-none border-b border-gray-400">
        <div class="flex items-center gap-2">
          <!-- 动态显示职业中文名 -->
          <span class="font-bold">OpenKore Web - {{ player.name }} ({{ JobConfig[player.job]?.name || player.job }} {{ player.lv }}/{{ player.jobLv }}) - {{ Maps[player.currentMap]?.name || player.currentMap }}</span>
        </div>
        <div class="flex gap-2 text-gray-600">
          <span>_</span>
          <span>□</span>
          <span>×</span>
        </div>
      </div>
  
      <div ref="logContainer" class="flex-1 overflow-y-auto p-1 scrollbar-hide break-all font-mono leading-tight relative">
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

      <!-- 智能提示浮窗 -->
      <div v-if="suggestions.length > 0 && userCommand" class="bg-gray-800 border-t border-gray-600 text-gray-300 px-2 py-1 absolute bottom-8 left-0 w-full opacity-90">
         <div v-for="(sug, idx) in suggestions" :key="idx" 
              class="flex gap-2 cursor-pointer" 
              :class="{'bg-gray-700 text-white': idx === suggestionIndex}"
              @click="applySuggestion(sug)"
         >
             <span class="font-bold">{{ sug.text }}</span>
             <span v-if="sug.hint" class="text-gray-500 text-xs">({{ sug.hint }})</span>
         </div>
      </div>
  
      <div class="bg-black px-1 pb-1">
        <input 
          ref="cmdInput"
          v-model="userCommand"
          @keyup.enter="executeCommand"
          @keydown="handleKeyDown"
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