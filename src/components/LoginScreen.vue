<script setup>
import { ref, onMounted } from 'vue'
import { listSaves, createNewCharacter, saveGame, deleteCharacter } from '../game/player.js'

const emit = defineEmits(['login'])

// 状态
const saves = ref([])
const showNewCharacter = ref(false)
const newCharacterName = ref('')
const loading = ref(true)

// 加载存档列表
onMounted(async () => {
  try {
    saves.value = await listSaves()
    loading.value = false
  } catch (error) {
    console.error('[LoginScreen] 加载存档列表失败:', error)
    loading.value = false
  }
})

// 选择存档
const selectSave = (save) => {
  emit('login', save.id)
}

// 删除存档
const confirmDelete = async (event, save) => {
  event.stopPropagation() // 阻止触发 selectSave
  
  if (confirm(`确定要删除角色 "${save.name}" 吗？此操作无法撤销。`)) {
    try {
      const success = await deleteCharacter(save.id)
      if (success) {
        // 重新加载存档列表
        saves.value = await listSaves()
      } else {
        alert('删除存档失败')
      }
    } catch (error) {
      console.error('[LoginScreen] 删除存档失败:', error)
      alert('删除存档失败')
    }
  }
}

// 创建新角色
const createCharacter = async () => {
  const name = newCharacterName.value.trim()
  if (!name) {
    alert('请输入角色名称')
    return
  }
  
  try {
    createNewCharacter(name)
    await saveGame()
    
    // 重新加载存档列表
    saves.value = await listSaves()
    
    // 自动选择新创建的存档
    const newSave = saves.value[0] // 最新的存档在最前面
    if (newSave) {
      await selectSave(newSave)
    }
    
    showNewCharacter.value = false
    newCharacterName.value = ''
  } catch (error) {
    console.error('[LoginScreen] 创建角色失败:', error)
    alert('创建角色失败')
  }
}

// 格式化时间
const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="bg-black text-gray-300 font-mono h-screen flex items-center justify-center">
    <div class="bg-gray-900 border border-gray-700 rounded-lg p-8 w-full max-w-2xl">
      <!-- 标题 -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">RO Idle Bot</h1>
        <p class="text-sm text-gray-500">选择角色或创建新角色</p>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="text-center py-8">
        <div class="text-gray-500">加载中...</div>
      </div>

      <div v-else-if="!showNewCharacter" class="space-y-4">
        <!-- 存档列表 - 增加滚动区域 -->
        <div class="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
          <!-- 存档卡片 -->
          <div 
            v-for="save in saves" 
            :key="save.id"
            @click="selectSave(save)"
            class="bg-gray-800 border border-gray-700 rounded p-4 cursor-pointer hover:bg-gray-750 hover:border-gray-600 transition-all group relative"
          >
            <div class="flex justify-between items-start">
              <div>
                <div class="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{{ save.name }}</div>
                <div class="text-sm text-gray-400 mt-1">
                  Lv.{{ save.data.lv }} {{ save.data.job }}
                </div>
                <div class="text-xs text-gray-500 mt-2">
                  最后保存: {{ formatDate(save.updatedAt) }}
                </div>
              </div>
              <div class="text-right flex flex-col items-end gap-4">
                <div class="text-yellow-500 font-mono">{{ save.data.zeny?.toLocaleString() || 0 }} z</div>
                
                <!-- 删除按钮 -->
                <button 
                  @click="confirmDelete($event, save)"
                  class="text-xs text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-gray-900/50 px-2 py-1 rounded"
                >
                  删除
                </button>
              </div>
            </div>
          </div>

          <!-- 无存档提示 -->
          <div v-if="saves.length === 0" class="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded">
            暂无存档，请创建新角色
          </div>
        </div>

        <!-- 创建新角色按钮 -->
        <button
          @click="showNewCharacter = true"
          class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded transition-colors"
        >
          + 创建新角色
        </button>
      </div>

      <!-- 创建新角色表单 -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-2">角色名称</label>
          <input
            v-model="newCharacterName"
            @keyup.enter="createCharacter"
            type="text"
            maxlength="20"
            placeholder="输入角色名称"
            class="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-600"
            autofocus
          />
        </div>

        <div class="flex gap-2">
          <button
            @click="createCharacter"
            class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition-colors"
          >
            确认创建
          </button>
          <button
            @click="showNewCharacter = false; newCharacterName = ''"
            class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded transition-colors"
          >
            取消
          </button>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="mt-8 text-center text-xs text-gray-600">
        <p>数据存储在本地浏览器 IndexedDB 中</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-gray-750 {
  background-color: #2d3748;
}

/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #1a202c;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #718096;
}
</style>
