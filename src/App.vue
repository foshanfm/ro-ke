<script setup>
  import { ref, onMounted, watch, nextTick, computed, onUnmounted } from 'vue' 
  import { player, saveGame, getStatPointCost, equipItem, unequipItem, useItem, insertCard, addItem } from './game/player.js'
  import { setLogCallback, startRecovery, gameState } from './game/combat.js'
  import { JobConfig } from './game/jobs.js'
  import { Maps } from './game/maps.js'
  import { executeGameCommand, getCommandNames, registerCommand, getCommandSuggestions } from './game/commands.js'
  import { initializeGameData } from './game/DataManager.js'
  import { setItemsDB, getItemInfo, getItemByName, ItemType, getEquippableName } from './game/items.js'
  import { setMonstersDB, getMonster, getMonsterByName } from './game/monsters.js'
  import { setSpawnData, setWarpData, mapState, initMap } from './game/mapManager.js'
  import { moveTo } from './game/combat.js'
  import { parseElementCode, ElementNames } from './game/elementalTable.js'
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
  const showInventoryModal = ref(false)
  const inventoryTab = ref('All')
  const cardInsertingMode = ref(false) // Whether we are selecting an item to insert a card into
  const activeCardId = ref(null) // The card we are currently trying to insert
  
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

  const handleEntityClick = (nameOrInstance, isInstance = false) => {
      let name = ''
      let instance = null

      if (isInstance) {
          if (typeof nameOrInstance === 'number') {
              instance = { id: nameOrInstance }
          } else {
              instance = nameOrInstance
          }
          name = getItemInfo(instance.id).name
      } else {
          name = nameOrInstance
      }

      // 去除修饰符如 RARE 和 [] 以及空格
      const cleanName = name.replace('RARE', '').replace('[', '').replace(']', '').trim()
      if (!cleanName) return

      console.log(`[UI] Clicking entity: ${cleanName}`)

      // 1. 尝试从当前地图怪物找
      const mobOnMap = mapMonsters.value.find(m => m.name.toLowerCase().includes(cleanName.toLowerCase()))
      if (mobOnMap) {
          const template = getMonster(mobOnMap.id)
          if (template) {
              selectedDetail.value = { type: 'Monster', data: template, instance: null }
              return
          }
      }
      
      // 2. 如果提供了实例，直接用
      if (isInstance && instance) {
          const info = getItemInfo(instance.id)
          selectedDetail.value = { type: 'Item', data: info, instance: instance }
          return
      }

      // 3. 尝试从背包/装备找
      const itemInInv = player.inventory.find(i => getItemInfo(i.id).name.toLowerCase().includes(cleanName.toLowerCase()))
      if (itemInInv) {
           const info = getItemInfo(itemInInv.id)
           selectedDetail.value = { type: 'Item', data: info, instance: itemInInv }
           return
      }

      // 4. 深度搜索: 直接查 DB
      const mobFromDB = getMonsterByName(cleanName)
      if (mobFromDB) {
          selectedDetail.value = { type: 'Monster', data: mobFromDB, instance: null }
          return
      }

      const itemFromDB = getItemByName(cleanName)
      if (itemFromDB) {
          selectedDetail.value = { type: 'Item', data: itemFromDB, instance: null }
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
    const curMapId = (player.currentMap || '').toLowerCase()
    const mapName = Maps[curMapId] ? Maps[curMapId].name : '未知区域'
    
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
      const { itemsDB, mobsDB, spawnData, warpDB, jobStats } = await initializeGameData(99)
      
      setItemsDB(itemsDB)
      setMonstersDB(mobsDB)
      setSpawnData(spawnData)
      setWarpData(warpDB)
      
      // 确保当前地图 ID 是小写的
      if (player.currentMap) player.currentMap = player.currentMap.toLowerCase()
      
      isDataLoaded.value = true
      
      // 数据加载后，显式初始化当前地图
      if (player.currentMap) {
          initMap(player.currentMap)
      }

      if (jobStats) {
        addLog('职业属性数据库加载成功!', 'success')
      }

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
    if (isDataLoaded.value && newMapId && newMapId !== oldMapId) {
        initMap(newMapId.toLowerCase())
        // 可选：添加一条系统日志
        // addLog(`进入地图: ${Maps[newMapId.toLowerCase()]?.name || newMapId}`, 'system')
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
        // 解析属性
        let elementName = '无'
        if (template?.element) {
          const parsed = parseElementCode(template.element)
          elementName = ElementNames[parsed.element] || '无'
        }
        monsterCounts[id] = {
          id,
          name: template?.name || `Monster ${id}`,
          lv: template?.lv || '?',
          element: elementName,
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
      targetName: Maps[w.targetMap.toLowerCase()]?.name || w.targetMap,
      name: w.name
    }))
  })

  // --- Inventory & Equipment Actions ---
  const handleEquip = (nameOrId) => {
      const res = equipItem(nameOrId)
      addLog(res.msg, res.success ? 'success' : 'error')
  }

  const handleUnequip = (type) => {
      const res = unequipItem(type)
      addLog(res.msg, res.success ? 'success' : 'error')
  }

  const handleUseItem = (nameOrId) => {
      const res = useItem(nameOrId)
      addLog(res.msg, res.success ? 'success' : 'error')
  }

  const startInsertCard = (cardId) => {
      activeCardId.value = cardId
      cardInsertingMode.value = true
      addLog('请选择要插入卡片的装备部位', 'info')
  }

  const cancelInsertCard = () => {
      cardInsertingMode.value = false
      activeCardId.value = null
  }

  const confirmInsertCard = (equipType) => {
      if (!activeCardId.value) return
      
      const cardInfo = getItemInfo(activeCardId.value)
      const res = insertCard(cardInfo.name, equipType)
      addLog(res.msg, res.success ? 'success' : 'error')
      
      cardInsertingMode.value = false
      activeCardId.value = null
  }

  const filteredInventory = computed(() => {
     if (!player.inventory) return []
     if (inventoryTab.value === 'All') return player.inventory
     
     return player.inventory.filter(item => {
         const info = getItemInfo(item.id)
          if (inventoryTab.value === 'Equip') return info.type === 'Equip' || info.type === 'Ammo'
          if (inventoryTab.value === 'Usable') return info.type === 'Usable'
         if (inventoryTab.value === 'Card') return info.type === 'Card'
         if (inventoryTab.value === 'Etc') return info.type === 'Etc'
         return true
     })
  })

  const getSlotName = (slot) => {
      const names = {
          'Weapon': '武器',
          'Shield': '盾牌',
          'HeadTop': '头饰(上)',
          'HeadMid': '头饰(中)',
          'HeadLow': '头饰(下)',
          'Armor': '衣服',
          'Garment': '披肩',
          'Footgear': '鞋子',
          'Accessory1': '饰品 1',
          'Accessory2': '饰品 2',
          'Ammo': '箭矢/弹药'
      }
      return names[slot] || slot
  }

  // Ordered list for display
  const EQUIPMENT_SLOTS = [
      'HeadTop', 'HeadMid', 'HeadLow',
      'Weapon', 'Shield', 'Armor',
      'Garment', 'Footgear',
      'Accessory1', 'Accessory2',
      'Ammo'
  ]

  const isTwoHandedWeapon = (itemId) => {
      if (!itemId) return false
      const info = getItemInfo(itemId)
      const subType = info.subType
      return [
        'TWO_HAND_SWORD', 'TWO_HAND_AXE', 'TWO_HAND_SPEAR',
        'TWO_HAND_STAFF', 'BOW', 'KATAR', 'INSTRUMENT', 'WHIP', 'BOOK' // Book usually 1h but keeping safe, Instrument/Whip strict 2h? Check RO. Actually Book is Shield-compatible? For now, simplify.
      ].includes(subType) || info.range > 3 // Simple heuristic if subtype fails
  }

  const isOccupiedByTwoHanded = (slot) => {
      if (slot !== 'Shield') return false
      const weapon = player.equipment['Weapon']
      if (!weapon) return false
      return isTwoHandedWeapon(weapon.id)
  }

  // Bonus Translator
  const translateBonus = (key, val) => {
      const map = {
          str: 'Str', agi: 'Agi', vit: 'Vit', int: 'Int', dex: 'Dex', luk: 'Luk',
          atk: 'Atk', matk: 'Matk', def: 'Def', mdef: 'Mdef',
          maxhp: 'MaxHP', maxsp: 'MaxSP',
          hp: 'MaxHP', sp: 'MaxSP', // Alias
          crit: 'Crit', hit: 'Hit', flee: 'Flee',
          aspdrate: 'Aspd %',
          speedrate: 'Move Speed %'
      }
      const label = map[key.toLowerCase()] || key
      const sign = val >= 0 ? '+' : ''
      return `${label} ${sign}${val}`
  }

  const getItemBonuses = (item) => {
      if (!item.bonuses) return []
      return Object.entries(item.bonuses).map(([k, v]) => translateBonus(k, v))
  }

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
                 <span>{{ Maps[(player.currentMap || '').toLowerCase()]?.name }}</span>
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
          <button @click="showInventoryModal = true" class="w-full mt-1 bg-gray-700 hover:bg-gray-600 text-xs py-1 rounded text-yellow-500">
              背包 & 装备
          </button>

          <!-- Assets -->
          <div class="pt-2 border-t border-gray-700">
               <div class="text-xs text-yellow-500 font-bold flex justify-between">
                   <span>Zeny</span>
                  <span>{{ (player.zeny || 0).toLocaleString() }} z</span>
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
                <div v-for="mob in mapMonsters" :key="mob.id" class="text-gray-300 cursor-pointer hover:text-white hover:bg-gray-700 rounded px-1 transition-colors" @click="handleEntityClick(mob.name)">
                  <span class="text-yellow-500">[Lv.{{ mob.lv }}]</span> {{ mob.name }} <span class="text-cyan-600 text-[10px]">({{ mob.element }})</span>
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
        <div v-if="selectedDetail" class="fixed right-4 top-20 w-72 bg-[#1e1e1e] border border-gray-600 h-[500px] flex flex-col shadow-2xl z-[90] rounded">
            <div class="flex justify-between items-center p-2 border-b border-gray-700">
                <div class="flex flex-col">
                    <span class="text-yellow-500 font-bold">{{ selectedDetail.type === 'Item' ? getEquippableName(selectedDetail.instance || { id: selectedDetail.data.id }) : selectedDetail.data.name }}</span>
                    <span class="text-[9px] text-gray-600">ID: {{ selectedDetail.data.id }}</span>
                </div>
                <button @click="selectedDetail = null" class="text-gray-500 hover:text-white font-bold">×</button>
            </div>
            <div class="p-3 text-xs space-y-3 overflow-y-auto custom-scrollbar flex-1">
                
                <!-- Basic Info for Equip -->
                <div v-if="selectedDetail.data.type === 'Equip'" class="grid grid-cols-2 gap-2 bg-gray-800 p-2 rounded">
                    <div class="text-gray-400">Atk: <span class="text-gray-100">{{ selectedDetail.data.atk || 0 }}</span></div>
                    <div class="text-gray-400">Matk: <span class="text-gray-100">{{ selectedDetail.data.matk || 0 }}</span></div>
                    <div class="text-gray-400">Def: <span class="text-gray-100">{{ selectedDetail.data.def || 0 }}</span></div>
                    <div class="text-gray-400">Weight: <span class="text-gray-100">{{ selectedDetail.data.weight }}</span></div>
                    <div class="text-gray-400 col-span-2">Type: <span class="text-cyan-400">{{ selectedDetail.data.subType }}</span></div>
                    <div v-if="selectedDetail.data.reqLv" class="text-gray-400 col-span-2">Req Lv: <span class="text-gray-100">{{ selectedDetail.data.reqLv }}</span></div>
                </div>

                <!-- Inserted Cards (Equip Instance Only) -->
                <div v-if="selectedDetail.instance && selectedDetail.instance.cards && selectedDetail.instance.cards.some(c => c)" class="bg-orange-900 bg-opacity-20 border border-orange-800 p-2 rounded">
                    <div class="text-orange-500 font-bold text-[10px] mb-1 uppercase tracking-wider">已插卡片 (Inserted Cards)</div>
                    <div class="space-y-1">
                        <div v-for="(cid, idx) in selectedDetail.instance.cards" :key="idx" 
                             class="flex items-center gap-2 p-1 rounded hover:bg-orange-950 transition-colors cursor-pointer group/slot"
                             @click="cid && handleEntityClick(cid, true)">
                            <div class="w-2 h-2 rounded-full" :class="cid ? 'bg-orange-500' : 'bg-gray-700'"></div>
                            <span v-if="cid" class="text-xs text-gray-200 group-hover/slot:text-white">{{ getItemInfo(cid).name }}</span>
                            <span v-else class="text-xs text-gray-600 italic">空插槽</span>
                        </div>
                    </div>
                </div>

                <!-- Card Info -->
                <div v-if="selectedDetail.data.type === 'Card'" class="bg-indigo-900 bg-opacity-30 border border-indigo-700 p-2 rounded">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-indigo-300 font-bold uppercase text-[10px]">卡片类物品</span>
                        <span class="text-indigo-400 text-[10px]">Compound on</span>
                    </div>
                    <div class="text-lg text-indigo-100 font-bold">{{ selectedDetail.data.compoundOn || 'Common' }}</div>
                </div>

                <!-- Price (for non-equipped items/monsters) -->
                <div v-if="selectedDetail.data.price && !selectedDetail.instance" class="flex justify-between text-gray-400 bg-gray-800 p-2 rounded">
                    <span>Price:</span>
                    <span class="text-yellow-500">{{ selectedDetail.data.price.buy }} z</span>
                </div>

                <!-- Parsed Bonuses (Script Translation) -->
                <div v-if="getItemBonuses(selectedDetail.data).length > 0" class="bg-gray-800 p-2 rounded border border-gray-700 shadow-inner">
                    <div class="text-green-500 font-bold mb-1 border-b border-gray-600 pb-1 flex justify-between">
                        <span>属性加成效果</span>
                        <span class="text-[9px] text-gray-500 uppercase">Effective</span>
                    </div>
                    <div v-for="(bonus, idx) in getItemBonuses(selectedDetail.data)" :key="idx" class="text-green-400 font-mono">
                        ● {{ bonus }}
                    </div>
                </div>

                <!-- Lore Description -->
                <div v-if="selectedDetail.data.description" class="bg-[#121212] p-3 rounded text-gray-500 whitespace-pre-wrap leading-relaxed border border-gray-800 text-[10px]">
                    <div class="text-gray-600 font-bold mb-1 uppercase tracking-tighter opacity-50">Item Background</div>
                    {{ selectedDetail.data.description }}
                </div>

                <!-- Drops (Monster Only) -->
                <template v-if="selectedDetail.type === 'Monster'">
                     <div class="mt-2 text-cyan-400 font-bold border-b border-gray-700 pb-1">掉落物品</div>
                     <div v-for="drop in selectedDetail.data.drops" :key="drop.id" class="flex justify-between py-0.5">
                        <span class="text-gray-300">{{ getItemInfo(drop.id).name }}</span>
                        <span class="text-yellow-600">{{ (drop.rate * 100).toFixed(2) }}%</span>
                     </div>
                </template>
            </div>
        </div>

    <!-- Stats Modal -->
    <div v-if="showStatsModal" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[80]" @click.self="showStatsModal = false">
        <div class="bg-gray-800 border border-gray-600 p-4 rounded w-96 shadow-xl">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-white">素质点分配</h3>
                 <span class="text-yellow-500">剩余点数: {{ player.statPoints }}</span>
            </div>
            <div class="space-y-2 text-sm">
                <div v-for="stat in ['Str', 'Agi', 'Vit', 'Int', 'Dex', 'Luk']" :key="stat" class="flex items-center justify-between bg-gray-900 p-2 rounded">
                    <span class="w-8 font-bold text-gray-400">{{ stat }}</span>
                    <div class="flex items-baseline gap-1">
                        <span class="text-white font-mono text-lg">{{ player[stat.toLowerCase()] }}</span>
                        <!-- Bonus Display: Sum of Equip Bonus + Job Bonus -->
                        <span class="text-green-400 text-xs font-bold" v-if="(player.equipmentBonuses?.[stat.toLowerCase()] || 0) + (player.equipmentBonuses?.[`job${stat}`] || 0) > 0">
                            +{{ (player.equipmentBonuses?.[stat.toLowerCase()] || 0) + (player.equipmentBonuses?.[`job${stat}`] || 0) }}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                         <span class="text-gray-500 text-xs">Cost: {{ getStatPointCost(player[stat.toLowerCase()]) }}</span>
                         <button @click="handleIncreaseStat(stat.toLowerCase())" class="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded">+</button>
                    </div>
                </div>
            </div>
            <button @click="showStatsModal = false" class="mt-4 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded">关闭</button>
        </div>
    </div>

    <!-- Inventory Modal -->
    <div v-if="showInventoryModal" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60]" @click.self="showInventoryModal = false">
        <div class="bg-[#1e1e1e] border border-gray-700 w-[800px] h-[600px] flex flex-col shadow-2xl rounded-lg overflow-hidden">
            <!-- Header & Tabs -->
            <div class="bg-gray-900 border-b border-gray-700 p-2 flex justify-between items-center">
                <div class="flex gap-2">
                    <button v-for="tab in ['All', 'Equip', 'Usable', 'Card', 'Etc']" 
                            :key="tab"
                            @click="inventoryTab = tab"
                            class="px-3 py-1 rounded text-xs transition-colors"
                            :class="inventoryTab === tab ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
                    >
                        {{ tab === 'All' ? '全部' : (tab === 'Equip' ? '装备' : (tab === 'Usable' ? '消耗品' : (tab === 'Card' ? '卡片' : '其他'))) }}
                    </button>
                </div>
                <button @click="showInventoryModal = false" class="text-gray-500 hover:text-white text-xl px-2">×</button>
            </div>

            <div class="flex-1 flex overflow-hidden">
                <!-- Left: Equipment Grid -->
                <div class="w-72 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto">
                    <h4 class="text-cyan-400 text-xs font-bold mb-4 uppercase tracking-wider">当前装备</h4>
                    <div class="space-y-3">
                        <div v-for="slot in EQUIPMENT_SLOTS" :key="slot" 
                             class="bg-gray-800 border p-2 rounded relative group transition-all"
                             :class="[
                                 player.equipment[slot] ? 'border-gray-600' : 'border-dashed border-gray-800',
                                 cardInsertingMode && player.equipment[slot] && getItemInfo(player.equipment[slot].id).slots > (player.equipment[slot].cards?.filter(c => c !== null).length || 0) ? 'ring-2 ring-yellow-500 border-yellow-500 cursor-pointer scale-[1.02]' : ''
                             ]"
                             @click="cardInsertingMode && confirmInsertCard(slot)"
                        >
                            <!-- 2H Weapon Blocking Shield Slot -->
                            <div v-if="isOccupiedByTwoHanded(slot)" class="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-10 text-gray-500 text-xs italic">
                                (双手武器占用)
                            </div>

                            <div class="text-[10px] text-gray-500 mb-1 flex justify-between">
                                <span>{{ getSlotName(slot) }}</span>
                                <span v-if="player.equipment[slot] && getItemInfo(player.equipment[slot].id).slots" class="text-cyan-600">
                                    [{{ player.equipment[slot].cards?.filter(c => c !== null).length || 0 }}/{{ getItemInfo(player.equipment[slot].id).slots }}]
                                </span>
                            </div>
                            
                            <div v-if="player.equipment[slot]" class="flex justify-between items-center">
                                <div class="flex-1">
                                    <div class="text-sm text-gray-100 font-bold truncate">{{ getEquippableName(player.equipment[slot]) }}</div>
                                    <div v-if="player.equipment[slot].cards && player.equipment[slot].cards.some(c => c)" class="flex gap-1 mt-1">
                                        <div v-for="(cid, cidx) in player.equipment[slot].cards" :key="cidx" 
                                             class="w-2 h-2 rounded-full"
                                             :class="cid ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'bg-gray-700'"
                                             :title="cid ? getItemInfo(cid).name : '空插槽'"
                                        ></div>
                                    </div>
                                </div>
                                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative z-20">
                                    <button @click.stop="handleEntityClick(player.equipment[slot], true)" class="text-[10px] bg-gray-700 hover:bg-gray-600 px-1 rounded">详情</button>
                                    <button @click.stop="handleUnequip(slot)" class="text-[10px] bg-red-900 hover:bg-red-800 px-1 rounded text-red-100">脱下</button>
                                </div>
                            </div>
                            <div v-else class="text-xs text-gray-700 italic py-1">未装备</div>
                        </div>
                    </div>
                </div>

                <!-- Right: Inventory List -->
                <div class="flex-1 bg-[#121212] flex flex-col overflow-hidden">
                    <div v-if="cardInsertingMode" class="bg-yellow-900 bg-opacity-30 p-2 text-xs text-yellow-500 border-b border-yellow-900 flex justify-between items-center">
                        <span>正在进行插卡：请点击左侧有空位的装备完成插卡</span>
                        <button @click="cancelInsertCard" class="bg-yellow-800 text-white px-2 py-0.5 rounded">取消</button>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div v-if="filteredInventory.length === 0" class="h-full flex items-center justify-center text-gray-600 italic">
                            该分类下没有物品
                        </div>
                        <div class="grid grid-cols-1 gap-2">
                            <div v-for="(item, idx) in filteredInventory" :key="idx" 
                                 class="bg-[#1a1a1a] border border-gray-800 p-3 rounded flex justify-between items-center hover:border-gray-600 transition-colors"
                            >
                                <div class="flex items-center gap-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm font-bold text-gray-200 truncate">
                                            {{ getEquippableName(item) }}
                                            <span class="text-[9px] text-gray-600 ml-1">#{{ item.id }}</span>
                                        </div>
                                        <div class="text-[10px] text-gray-500 flex gap-2">
                                            <span v-if="item.count > 1" class="text-cyan-500 ml-1">x{{ item.count }}</span>
                                        </div>
                                        <div class="text-[10px] text-gray-500 mt-0.5">
                                            <span v-if="getItemInfo(item.id).slots > 0" class="ml-2 text-cyan-800">插槽: {{ getItemInfo(item.id).slots }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex gap-1">
                                    <button @click="handleEntityClick(item, true)" class="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-[10px] text-gray-300">详细</button>
                                    
                                    <!-- Context Actions -->
                                    <template v-if="getItemInfo(item.id).type === 'Equip' || getItemInfo(item.id).type === 'Ammo'">
                                        <button @click="handleEquip(item.id)" class="px-2 py-1 bg-blue-900 hover:bg-blue-800 rounded text-[10px] text-blue-100">装备</button>
                                    </template>
                                    <template v-else-if="getItemInfo(item.id).type === 'Usable'">
                                        <button @click="handleUseItem(item.id)" class="px-2 py-1 bg-green-900 hover:bg-green-800 rounded text-[10px] text-green-100">使用</button>
                                    </template>
                                    <template v-else-if="getItemInfo(item.id).type === 'Card'">
                                        <button @click="startInsertCard(item.id)" class="px-2 py-1 bg-orange-900 hover:bg-orange-800 rounded text-[10px] text-orange-100">插卡</button>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
  .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
      background: #000;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #555;
  }
  </style>