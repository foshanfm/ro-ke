// src/game/logger.js
import { reactive } from 'vue'

const MAX_LOGS = 200
const logQueue = []
let flushCallback = null

export function setLogCallback(fn) {
    flushCallback = fn
}

// 供 combat/player 等模块调用
export function log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    const entry = { time, msg, type }
    
    // 如果有回调（UI已准备好），可以尝试直接推送，或者使用队列缓冲
    // 建议：为了保证“顺序”，如果是在一个 Tick 内发生的事，应该按 push 顺序排
    // 这里我们简单直接调用回调，因为 JS 单线程特性，同步调用 log 本身就是有序的。
    // "异步乱序"是指：不同 setTimeout 回调执行顺序不可控。
    // 只要我们在 setTimeout 回调内部按顺序 log，日志就是有序的。
    
    // 如果需要严格的 Tick 对齐，我们可以加一个 Tick ID
    if (flushCallback) {
        flushCallback(entry)
    }
}

// 模拟器专用：无回调模式下，log 只是静默或存文件
export function simLog(msg) {
    // console.log(`[SIM] ${msg}`) 
}
