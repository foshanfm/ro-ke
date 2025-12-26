<script setup>
  import { ref, onMounted, watch, nextTick, computed, onUnmounted } from 'vue' 
  import { player, loadGame, saveGame } from './game/player.js'
  import { setLogCallback, startRecovery, gameState } from './game/combat.js'
  import { JobConfig } from './game/jobs.js'
  import { Maps } from './game/maps.js'
  import { executeGameCommand, getCommandNames, registerCommand, getCommandSuggestions } from './game/commands.js'
  import { initializeGameData } from './game/dataLoader.js'
  import { setItemsDB } from './game/items.js'
  import { setMonstersDB } from './game/monsters.js'
  import { setSpawnData } from './game/mapManager.js'

  // --- 核心状态 ---
  const logs = ref([]) 
  const logContainer = ref(null) 
  const cmdInput = ref(null)
  const userCommand = ref('')
  const isDataLoaded = ref(false) // 数据加载状态
  
  // --- 智能提示状态 ---
  const showSuggestions = ref(false)
  const suggestionIndex = ref(0)
  
  // 基础指令库 (动态获取)
  const baseCommands = computed(() => getCommandNames())

  // 注册隐藏的系统指令
  registerCommand({
      name: 'echo',
      description: '', // Hidden from help
      execute: (args, { log }) => {
          const msg = args.join(' ')
          if (msg === '"sys_connect_ai"') {
              log('正在建立安全连接...', 'system')
              setTimeout(() => {
                  log('AI_ARCHITECT: 信号已接收。', 'warning')
              }, 1500)
          } else {
              log(msg, 'info')
          }
      }
  })

  // 计算当前的提示列表
  const suggestions = computed(() => {
      return getCommandSuggestions(userCommand.value)
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

  const clearLogs = () => {
      logs.value = []
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
    
    // --- 使用新的命令注册器 ---
    const context = {
        log: addLog,
        clear: clearLogs
    }

    const found = executeGameCommand(cmd, args, context)
    
    if (!found) {
        addLog(`未知指令: ${cmd}`, 'error')
    }
  
    userCommand.value = '' 
  }
  
  // 移除深度 watch，改为每 30秒 自动保存
  let autoSaveTimer = null
  
  onMounted(async () => {
    setLogCallback(addLog)
    startRecovery()

    // 加载游戏数据
    addLog('正在加载游戏数据...', 'system')
    try {
      const { itemsDB, mobsDB, spawnData } = await initializeGameData(20) // 限制等级 20
      
      // 设置数据到各个模块
      setItemsDB(itemsDB)
      setMonstersDB(mobsDB)
      setSpawnData(spawnData)
      
      isDataLoaded.value = true
      addLog('游戏数据加载完成!', 'success')
    } catch (error) {
      addLog('游戏数据加载失败,将使用后备数据', 'warning')
      console.error(error)
    }

    const hasSave = loadGame()
    
    const jobName = JobConfig[player.job] ? JobConfig[player.job].name : '初学者'
    const mapName = Maps[player.currentMap] ? Maps[player.currentMap].name : '未知区域'
    
    if (hasSave) {
      addLog(`读取存档成功。欢迎回来,${player.name} (Lv.${player.lv} ${jobName})`, 'system')
      addLog(`当前位置: ${mapName}`, 'system')
    } else {
      addLog('未找到存档,初始化新角色...', 'system')
    }
    
    addLog(`系统就绪。输入 'auto' 开始挂机,输入 'help' 查看帮助。`, 'system')
    
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

  // --- Computed for UI ---
  const hpPercent = computed(() => {
      if (player.maxHp <= 0) return 0
      return Math.min(100, Math.max(0, (player.hp / player.maxHp) * 100))
  })
  
  const spPercent = computed(() => {
      if (player.maxSp <= 0) return 0
      return Math.min(100, Math.max(0, (player.sp / player.maxSp) * 100))
  })
  
  const baseExpPercent = computed(() => {
      if (player.nextExp <= 0) return 0
      return Math.min(100, Math.max(0, (player.exp / player.nextExp) * 100))
  })
  
  const jobExpPercent = computed(() => {
      if (player.nextJobExp <= 0) return 0
      return Math.min(100, Math.max(0, (player.jobExp / player.nextJobExp) * 100))
  })

  const jobName = computed(() => JobConfig[player.job] ? JobConfig[player.job].name : player.job)

  </script>
  
  <template>
    <div class="bg-black text-gray-300 font-mono h-screen flex overflow-hidden text-sm select-text">
      
      <!-- Left Sidebar: Character Status (Always visible now) -->
      <div class="w-64 bg-gray-900 border-r border-gray-700 flex flex-col p-4 gap-4 shrink-0">
          <!-- Name & Job -->
          <div class="text-center pb-2 border-b border-gray-700">
              <h2 class="text-lg font-bold text-white">{{ player.name }}</h2>
              <div class="text-xs text-cyan-400">{{ jobName }}</div>
              <div class="text-xs text-gray-500 mt-1 flex justify-between px-2">
                 <span>{{ Maps[player.currentMap]?.name }}</span>
                 <!-- Coordinate Display -->
                 <span>({{ Math.floor(player.x) }}, {{ Math.floor(player.y) }})</span>
              </div>
          </div>

          <!-- HP / SP Bars -->
          <div class="space-y-3">
              <!-- HP -->
              <div>
                  <div class="flex justify-between text-xs mb-1">
                      <span class="text-green-400">HP</span>
                      <span>{{ Math.floor(player.hp) }} / {{ player.maxHp }}</span>
                  </div>
                  <div class="h-3 w-full bg-gray-800 rounded overflow-hidden border border-gray-700">
                      <div class="h-full bg-green-600 transition-all duration-300" :style="{ width: hpPercent + '%' }"></div>
                  </div>
              </div>
              <!-- SP -->
              <div>
                  <div class="flex justify-between text-xs mb-1">
                      <span class="text-blue-400">SP</span>
                      <span>{{ Math.floor(player.sp) }} / {{ player.maxSp }}</span>
                  </div>
                  <div class="h-3 w-full bg-gray-800 rounded overflow-hidden border border-gray-700">
                      <div class="h-full bg-blue-600 transition-all duration-300" :style="{ width: spPercent + '%' }"></div>
                  </div>
              </div>
          </div>

          <!-- Exp Bars -->
          <div class="space-y-2 pt-2 border-t border-gray-700">
               <div class="text-xs flex justify-between">
                   <span>Base Lv.{{ player.lv }}</span>
                   <span class="text-gray-500">{{ baseExpPercent.toFixed(1) }}%</span>
               </div>
               <div class="h-1.5 w-full bg-gray-800 rounded overflow-hidden">
                    <div class="h-full bg-yellow-600 transition-all duration-500" :style="{ width: baseExpPercent + '%' }"></div>
               </div>
               
               <div class="text-xs flex justify-between mt-1">
                   <span>Job Lv.{{ player.jobLv }}</span>
                   <span class="text-gray-500">{{ jobExpPercent.toFixed(1) }}%</span>
               </div>
               <div class="h-1.5 w-full bg-gray-800 rounded overflow-hidden">
                    <div class="h-full bg-purple-600 transition-all duration-500" :style="{ width: jobExpPercent + '%' }"></div>
               </div>
          </div>

          <!-- Combat Stats Preview -->
          <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs pt-2 border-t border-gray-700">
              <div class="text-gray-400">Atk</div><div class="text-right">{{ player.atk }}</div>
              <div class="text-gray-400">Matk</div><div class="text-right">{{ player.matk }}</div>
              <div class="text-gray-400">Def</div><div class="text-right">{{ player.def }}</div>
              <div class="text-gray-400">Hit</div><div class="text-right">{{ player.hit }}</div>
              <div class="text-gray-400">Flee</div><div class="text-right">{{ player.flee }}</div>
              <div class="text-gray-400">Aspd</div><div class="text-right">{{ player.aspd }}</div>
          </div>

          <!-- Assets -->
          <div class="pt-2 border-t border-gray-700">
               <div class="text-xs text-yellow-500 font-bold flex justify-between">
                   <span>Zeny</span>
                   <span>{{ player.zeny.toLocaleString() }} z</span>
               </div>
          </div>
          
           <!-- Status Indicator -->
           <div class="mt-auto pt-2 border-t border-gray-700 text-xs text-center">
              <div v-if="gameState.isAuto">
                  <div class="text-green-500 font-bold animate-pulse">● AUTO BATTLE</div>
                  <div class="text-gray-500 text-[10px] mt-1">{{ gameState.status }}</div>
              </div>
              <span v-else class="text-gray-500">● IDLE</span>
           </div>
      </div>

      <!-- Main Console Area -->
      <div class="flex-1 flex flex-col h-full overflow-hidden relative" @click="focusInput">
        <div class="bg-[#e0e0e0] text-black text-xs px-2 py-1 flex justify-between select-none border-b border-gray-400 shrink-0">
          <div class="flex items-center gap-2">
            <span class="font-bold">OpenKore Web Console</span>
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
    
        <div class="bg-black px-1 pb-1 shrink-0">
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