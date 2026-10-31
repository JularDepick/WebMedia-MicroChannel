<template>
  <div class="pwd-page">
    <div class="pwd-panel">
      <h1>密码生成器</h1>
      <div class="form-group">
        <label for="salt">盐值</label>
        <input type="text" id="salt" placeholder="输入配置文件中的盐值" v-model="saltValue" />
      </div>
      <div class="form-group">
        <label for="user">用户名</label>
        <input type="text" id="user" placeholder="输入用户名" v-model="userValue" />
      </div>
      <div class="form-group">
        <label for="pass">密码</label>
        <input type="text" id="pass" placeholder="输入密码" v-model="passValue" />
      </div>
      <button id="genBtn" :disabled="pending" @click="generate">生成</button>
      <p class="hint" v-if="hint !== ''">{{ hint }}</p>
      <div class="result" id="result" v-show="resultVisible">{{ result }}</div>
      <p class="author">
        &copy; 2026
        <a :href="AUTHOR_INFO.url" target="_blank" rel="noopener noreferrer">{{ AUTHOR_INFO.name }}</a>.
        <a :href="AUTHOR_INFO.projectUrl" target="_blank" rel="noopener noreferrer">{{ AUTHOR_INFO.project }}</a>
        v{{ PROJECT_VERSION }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AUTHOR_INFO, PROJECT_VERSION } from '~~/shared/constants/site'

/* 摘要算法与后端 hashPassword 保持一致: SHA-512(盐值|用户名|密码) */
const HASH_ALGORITHM = 'SHA-512'
const SALT_SEPARATOR = '|'

useHead({ title: '密码生成器' })

const saltValue = ref('')
const userValue = ref('')
const passValue = ref('')
const result = ref('')
const resultVisible = ref(false)
const hint = ref('')
const pending = ref(false)

/* 输入不完整时给出页面内提示, 不使用原生弹窗 */
function resetOutput(message: string): void {
  result.value = ''
  resultVisible.value = false
  hint.value = message
}

async function generate(): Promise<void> {
  const salt = saltValue.value
  const user = userValue.value
  const pass = passValue.value
  if (!salt || !user || !pass) {
    resetOutput('请填写盐值、用户名与密码')
    return
  }
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    resetOutput('当前环境不支持 Web Crypto, 请通过 HTTPS 或 localhost 访问')
    return
  }
  pending.value = true
  hint.value = ''
  try {
    const raw = salt + SALT_SEPARATOR + user + SALT_SEPARATOR + pass
    const bytes = new TextEncoder().encode(raw)
    const digest = await globalThis.crypto.subtle.digest(HASH_ALGORITHM, bytes)
    result.value = Array.from(new Uint8Array(digest))
      .map(item => item.toString(16).padStart(2, '0'))
      .join('')
    resultVisible.value = true
  } catch {
    resetOutput('生成失败, 请重试')
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.pwd-page {
  min-height: 100vh;
  padding: 60px 20px;
  background: #f5f5f7;
  color: #1a1a1e;
  font-family: -apple-system, sans-serif;
}

.pwd-panel {
  max-width: 480px;
  margin: 0 auto;
}

h1 {
  font-size: 20px;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #666;
}

input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

input:focus {
  outline: none;
  border-color: #2080e0;
}

button {
  padding: 10px 24px;
  background: #2080e0;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

button:hover {
  background: #1870c8;
}

button:disabled {
  background: #93b8dc;
  cursor: not-allowed;
}

.hint {
  margin-top: 12px;
  font-size: 13px;
  color: #c0392b;
}

.result {
  margin-top: 20px;
  padding: 12px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  word-break: break-all;
  font-family: monospace;
  font-size: 13px;
}

.author {
  margin-top: 32px;
  font-size: 12px;
  color: #999;
}

.author a {
  color: #666;
  text-decoration: none;
}

.author a:hover {
  color: #2080e0;
}
</style>
