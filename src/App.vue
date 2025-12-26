<script setup>
  import { ref, onMounted, watch, nextTick, computed, onUnmounted } from 'vue' 
  import { player, saveGame, getStatPointCost } from './game/player.js'
  import { setLogCallback, startRecovery, gameState } from './game/combat.js'
  import { JobConfig } from './game/jobs.js'
  import { Maps } from './game/maps.js'
  import { executeGameCommand, getCommandNames, registerCommand, getCommandSuggestions } from './game/commands.js'
  import { initializeGameData } from './game/DataManager.js'
  import { setItemsDB, getItemInfo, getItemByName } from './game/items.js'
  import { setMonstersDB, getMonster, getMonsterByName } from './game/monsters.js'
  import { setSpawnData, setWarpData, mapState, initMap } from './game/mapManager.js'
  import { moveTo } from './game/combat.js'
  import LoginScreen from './components/LoginScreen.vue'

  // --- 核心状态 ---
  const logs = ref([]) 
  const logContainer = ref(null) 
  const cmdInput = ref(null)
  const userCommand = ref('')
  const isDataLoaded = ref(false) // 数据加载状态
  const isLoggedIn = ref(false) // 登录状态
  const isInitializing = ref(false) // 初始化状态
  
  // --- 智能提示状态 ---
  const showSuggestions = ref(false)
  const suggestionIndex = ref(0)
  
  // --- 交互详情状态 ---
  const selectedDetail = ref(null) // { type: 'item'|'monster', data: ... }
  const showStatsModal = ref(false)
  
  // --- 素质点加点 ---
  import { increaseStat } from './game/player.js'
  const handleIncreaseStat = (stat) => {
      const res = increaseStat(stat)
      if (res.success) {
          addLog(res.msg, 'success')
      } else {
          addLog(res.msg, 'error')
      }
  }
  
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
  // --- 日志系统 ---
  // 解析日志中的 [Name] 模式，使其可点击
  // 格式: [Type:ID:Name] 
  // 例如: [Item:501:Red Potion], [Monster:1001:Poring]
  // 简化版我们可以在逻辑层生成日志时就把 ID 埋进去，或者简单点正则匹配名称
  // 为了健壮性，我们修改 combat.js 发送日志的格式，或者在这里做文本匹配
  // 现阶段这里做简单文本匹配: 如果日志包含 "Loot: [RARE] Name"
  
  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    if (logs.value.length > 200) logs.value.shift()
    
    // 解析交互实体
    // 简单正则: 匹配 [Name]
    // 更好的方式是让 msg 本身是一个对象结构，但为了兼容旧代码，我们先做简单处理
    // 在这里我们不改变 msg 存储结构，而是在 template里用 v-html 或组件渲染
    // 但 Vue 推荐数据驱动。
    
    // 方案: 存储 parsedMsg 数组
    const parsedSegments = []
    const regex = /\[(.*?)\]/g
    let lastIndex = 0
    let match
    
    while ((match = regex.exec(msg)) !== null) {
        // Text before match
        if (match.index > lastIndex) {
            parsedSegments.push({ text: msg.substring(lastIndex, match.index), type: 'text' })
        }
        
        const content = match[1] // e.g., "RARE", "Poring", "Red Potion"
        // 尝试判断类型 (这很脆弱，但在有限的日志格式下可行)
        // 比如: [RARE] 是修饰符， [Name] 是实体
        // 我们可以约定，游戏逻辑发出的日志，实体用特殊标记，比如 {Item:501}
        // 但为了不重构 combat.js 所有日志，我们先只针对 UI 
        
        // 临时方案: 只是把 [] 里的内容高亮，点击尝试搜索名字
        parsedSegments.push({ 
            text: `[${content}]`, 
            type: 'interactive', 
            content: content 
        })
        
        lastIndex = regex.lastIndex
    }
    
    if (lastIndex < msg.length) {
        parsedSegments.push({ text: msg.substring(lastIndex), type: 'text' })
    }
    
    logs.value.push({ time, msg, type, segments: parsedSegments.length > 0 ? parsedSegments : null })
  }

  const handleEntityClick = (name) => {
      // 去除修饰符如 RARE 和 [] 以及空格
      const cleanName = name.replace('RARE', '').replace('[', '').replace(']', '').trim()
      if (!cleanName) return

      console.log(`[UI] Clicking entity: ${cleanName}`)

      // 1. 尝试从当前地图怪物找
      const mobOnMap = mapMonsters.value.find(m => m.name.toLowerCase().includes(cleanName.toLowerCase()))
      if (mobOnMap) {
          const template = getMonster(mobOnMap.id)
          if (template) {
              selectedDetail.value = { type: 'Monster', data: template }
              return
          }
      }
      
      // 2. 尝试从背包/装备找
      const itemInInv = player.inventory.find(i => getItemInfo(i.id).name.toLowerCase().includes(cleanName.toLowerCase()))
      if (itemInInv) {
           const info = getItemInfo(itemInInv.id)
           selectedDetail.value = { type: 'Item', data: info }
           return
      }

      // 3. 深度搜索: 直接查 DB
      const mobFromDB = getMonsterByName(cleanName)
      if (mobFromDB) {
          selectedDetail.value = { type: 'Monster', data: mobFromDB }
          return
      }

      const itemFromDB = getItemByName(cleanName)
      if (itemFromDB) {
          selectedDetail.value = { type: 'Item', data: itemFromDB }
          return
      }
      
      console.warn(`[UI] Entity not found in DB: ${cleanName}`)
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
  
  // 登录处理
  const handleLogin = async (saveId) => {
    isLoggedIn.value = true
    isInitializing.value = true

    // 初始化游戏数据
    await initializeGameDataAsync()

    const jobName = JobConfig[player.job] ? JobConfig[player.job].name : '初学者'
    const mapName = Maps[player.currentMap] ? Maps[player.currentMap].name : '未知区域'
    
    addLog(`欢迎回来,${player.name} (Lv.${player.lv} ${jobName})`, 'system')
    addLog(`当前位置: ${mapName}`, 'system')
    addLog(`系统就绪。输入 'auto' 开始挂机,输入 'help' 查看帮助。`, 'system')
    
    isInitializing.value = false
    focusInput()
  }

  // 异步加载游戏数据
  const initializeGameDataAsync = async () => {
    addLog('正在加载游戏数据...', 'system')
    try {
      const { itemsDB, mobsDB, spawnData, warpDB } = await initializeGameData(20)
      
      setItemsDB(itemsDB)
      setMonstersDB(mobsDB)
      setSpawnData(spawnData)
      setWarpData(warpDB)
      
      isDataLoaded.value = true
      
      // 数据加载后，初始化当前地图
      initMap(player.currentMap)

      addLog('游戏数据加载完成!', 'success')
    } catch (error) {
      addLog('游戏数据加载失败,将使用后备数据', 'warning')
      console.error(error)
    }
  }

  onMounted(async () => {
    setLogCallback(addLog)
    startRecovery()

    // 启动自动保存 (异步)
    autoSaveTimer = setInterval(async () => {
        await saveGame()
        // addLog('Auto saved.', 'dim') // 可选提示
    }, 30000)
  })

  // 监听地图变更，自动更新地图数据
  watch(() => player.currentMap, (newMapId, oldMapId) => {
    if (newMapId && newMapId !== oldMapId) {
        initMap(newMapId)
        // 可选：添加一条系统日志
        // addLog(`进入地图: ${Maps[newMapId]?.name || newMapId}`, 'system')
    }
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


  // 地图怪物列表 - 显示当前地图上的实时怪物实例
  const mapMonsters = computed(() => {
    if (!mapState.monsters || mapState.monsters.length === 0) return []
    
    // 统计每种怪物的数量
    const monsterCounts = {}
    mapState.monsters.forEach(instance => {
      const id = instance.templateId
      if (!monsterCounts[id]) {
        const template = getMonster(id)
        monsterCounts[id] = {
          id,
          name: template?.name || `Monster ${id}`,
          lv: template?.lv || '?',
          count: 0
        }
      }
      monsterCounts[id].count++
    })
    
    return Object.values(monsterCounts)
  })


  // 地图传送点列表
  const mapPortals = computed(() => {
    if (!mapState.activeWarps) return []
    return mapState.activeWarps.map(w => ({
      x: w.x,
      y: w.y,
      targetMap: w.targetMap,
      targetName: Maps[w.targetMap]?.name || w.targetMap,
      name: w.name
    }))
  })

  // 导航到传送点
  const navigateToPortal = (x, y) => {
    moveTo(x, y)
  }

  </script>
  
  <template>
    <!-- 登录界面 -->
    <LoginScreen v-if="!isLoggedIn" @login="handleLogin" />

    <!-- 加载中界面 -->
    <div v-else-if="isInitializing" class="bg-black text-gray-300 font-mono h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="text-2xl mb-4">加载中...</div>
        <div class="text-sm text-gray-500">正在初始化游戏数据</div>
      </div>
    </div>

    <!-- 主游戏界面 -->
    <div v-else class="bg-black text-gray-300 font-mono h-screen flex overflow-hidden text-sm select-text">
      
      <!-- Left Sidebar: Character Status (Always visible now) -->
      <div class="w-64 bg-gray-900 border-r border-gray-700 flex flex-col p-4 gap-4 shrink-0">
          <!-- Name & Job -->
          <div class="text-center pb-2 border-b border-gray-700">
              <h2 class="text-lg font-bold text-white">{{ player.name }}</h2>
              <div class="text-xs text-cyan-400">{{ jobName }}</div>
              <div class="text-xs text-gray-500 mt-1 flex justify-between px-2">
                 <span>{{ Maps[player.currentMap]?.name }}</span>
                 <!-- Coordinate Display -->
                  <span>({{ Math.floor(player.x / 10) }}, {{ Math.floor(player.y / 10) }})</span>
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
          <button @click="showStatsModal = true" class="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-xs py-1 rounded text-cyan-400">
              详细素质点 & 加点
          </button>

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

        <!-- Map Navigation Panel -->
        <div class="bg-gray-800 border-b border-gray-600 p-2 text-xs shrink-0">
          <div class="grid grid-cols-2 gap-2">
            <!-- Monsters -->
            <div>
              <div class="text-cyan-400 font-bold mb-1">地图生物</div>
              <div class="space-y-0.5">
                <div v-if="mapMonsters.length === 0" class="text-gray-500">无数据</div>
                <div v-for="mob in mapMonsters" :key="mob.id" class="text-gray-300">
                  <span class="text-yellow-500">[Lv.{{ mob.lv }}]</span> {{ mob.name }}
                </div>
              </div>
            </div>
            
            <!-- Portals -->
            <div>
              <div class="text-cyan-400 font-bold mb-1">已知出口</div>
              <div class="space-y-0.5">
                <div v-if="mapPortals.length === 0" class="text-gray-500">无传送点</div>
                <button 
                  v-for="(portal, idx) in mapPortals" 
                  :key="idx"
                  @click="navigateToPortal(portal.x, portal.y)"
                  class="block w-full text-left px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 transition-colors"
                >
                  → {{ portal.targetName }}
                  <span class="text-gray-500 text-[10px]">({{ Math.floor(portal.x / 10) }}, {{ Math.floor(portal.y / 10) }})</span>
                </button>
              </div>
            </div>
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
            }">
                <template v-if="log.segments">
                    <span v-for="(seg, idx) in log.segments" :key="idx" 
                          :class="{'cursor-pointer underline hover:text-white': seg.type === 'interactive'}"
                          @click="seg.type === 'interactive' && handleEntityClick(seg.content)"
                    >{{ seg.text }}</span>
                </template>
                <template v-else>{{ log.msg }}</template>
            </span>
          </div>
        </div>

        <!-- Details Panel (Overlay on right side) -->
        <div v-if="selectedDetail" class="absolute right-0 top-10 w-64 bg-gray-900 border-l border-gray-600 h-3/4 p-2 overflow-y-auto shadow-lg bg-opacity-95">
            <div class="flex justify-between items-center mb-2 border-b border-gray-700 pb-1">
                <span class="text-yellow-500 font-bold">{{ selectedDetail.type }} Info</span>
                <button @click="selectedDetail = null" class="text-red-500 font-bold">×</button>
            </div>
            <div class="text-xs space-y-2">
                <div v-if="selectedDetail.data.name" class="font-bold text-lg text-white">{{ selectedDetail.data.name }}</div>
                
                <!-- Special Layout for Drops -->
                <div v-for="(val, key) in selectedDetail.data" :key="key">
                    <template v-if="key === 'drops' && Array.isArray(val)">
                        <div class="mt-2 bg-black bg-opacity-30 p-2 rounded border border-gray-800">
                            <div class="text-cyan-400 font-bold border-b border-gray-700 pb-1 mb-1 mb-2 flex justify-between">
                                <span>掉落物品</span>
                                <span class="text-[10px] text-gray-500 font-normal">概率</span>
                            </div>
                            <div v-for="drop in val" :key="drop.id" class="flex justify-between py-0.5 hover:bg-gray-800 px-1 rounded transition-colors">
                                <span class="text-gray-300">{{ getItemInfo(drop.id).name }}</span>
                                <span :class="drop.rate < 0.01 ? 'text-orange-400' : 'text-yellow-600'">
                                    {{ (drop.rate * 100).toFixed(drop.rate < 0.001 ? 3 : 2) }}%
                                </span>
                            </div>
                        </div>
                    </template>
                    <template v-else-if="!['id', 'templateId', 'guid', 'isAggressive', 'lastAttackTime', 'x', 'y', 'name'].includes(key) && val !== null && typeof val !== 'object'">
                        <div class="flex justify-between border-b border-gray-800 py-1 px-1">
                            <span class="text-gray-500 capitalize">{{ key }}</span>
                            <span class="text-gray-200 font-mono">{{ val }}</span>
                        </div>
                    </template>
                </div>
            </div>
        </div>

    <!-- Stats Modal -->
    <div v-if="showStatsModal" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" @click.self="showStatsModal = false">
        <div class="bg-gray-800 border border-gray-600 p-4 rounded w-96 shadow-xl">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-white">素质点分配</h3>
                 <span class="text-yellow-500">剩余点数: {{ player.statPoints }}</span>
            </div>
            <div class="space-y-2 text-sm">
                <div v-for="stat in ['Str', 'Agi', 'Vit', 'Int', 'Dex', 'Luk']" :key="stat" class="flex items-center justify-between bg-gray-900 p-2 rounded">
                    <span class="w-8 font-bold text-gray-400">{{ stat }}</span>
                    <span class="text-white font-mono text-lg">{{ player[stat.toLowerCase()] }}</span>
                    <div class="flex items-center gap-2">
                         <span class="text-gray-500 text-xs">Cost: {{ getStatPointCost(player[stat.toLowerCase()]) }}</span>
                         <button @click="handleIncreaseStat(stat.toLowerCase())" class="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded">+</button>
                    </div>
                </div>
            </div>
            <button @click="showStatsModal = false" class="mt-4 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded">关闭</button>
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