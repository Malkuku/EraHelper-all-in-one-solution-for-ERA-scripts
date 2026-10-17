<template>
  <div class="task-manager main-container" :class="{ 'dark-mode': uiStore.darkMode }">
    <nav class="page-tabs" aria-label="任务配置分类">
      <button
        v-for="item in tabs"
        :key="item.id"
        class="tab-button"
        :class="{ active: tab === item.id }"
        @click="tab = item.id"
      >
        {{ item.label }}
      </button>
    </nav>
    <div class="toolbar">
      <button class="primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存配置' }}</button>
      <button :disabled="saving" @click="reset">撤销未保存修改</button>
      <button @click="exportConfiguration">导出配置</button>
      <label class="file-button"
        >导入配置<input :disabled="saving" type="file" accept=".json,application/json" @change="importConfiguration"
      /></label>
      <span>{{ dirty ? '有未保存修改' : '配置已同步' }}</span>
    </div>
    <p v-if="configurationError" class="error" role="alert">{{ configurationError }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <fieldset :disabled="saving">
      <section v-if="tab === 'selection'">
        <div class="header-actions">
          <h3>选择活动规则组</h3>
          <button
            class="primary"
            @click="
              addGroup();
              tab = 'groups';
            "
          >
            + 新建规则组
          </button>
        </div>
        <p class="hint">活动规则组用于常规链和附加事件；事件运行独立结算。点击保存后生效。</p>
        <button :class="{ selected: draft.activeGroupId === null }" @click="draft.activeGroupId = null">
          不启用常规任务链
        </button>
        <div class="task-grid">
          <article
            v-for="(groupItem, index) in draft.groups"
            :key="groupItem.id"
            class="task-card"
            :class="{ 'active-card': draft.activeGroupId === groupItem.id }"
          >
            <div class="card-header">
              <strong>{{ groupItem.name }}</strong
              ><span v-if="draft.activeGroupId === groupItem.id" class="status-badge active">使用中</span>
            </div>
            <p class="comment-text">{{ groupItem.comment || '暂无备注' }}</p>
            <p v-for="item in groupTasks(groupItem)" :key="item.id" class="hint">
              {{ item.name }} · 顺序 {{ item.order }} · 间隔 {{ item.triggerInterval }} 楼
            </p>
            <div class="toolbar">
              <button class="primary" @click="draft.activeGroupId = groupItem.id">选择</button
              ><button
                @click="
                  selectedGroup = groupItem.id;
                  tab = 'groups';
                "
              >
                编辑</button
              ><button @click="duplicateGroup(groupItem)">复制</button
              ><button :disabled="index === 0" @click="move(draft.groups, index, -1)">上移</button
              ><button :disabled="index === draft.groups.length - 1" @click="move(draft.groups, index, 1)">下移</button>
            </div>
          </article>
        </div>
        <p v-if="!draft.groups.length" class="empty-state">暂无规则组。先创建规则组并关联任务。</p>
      </section>
      <section v-if="tab === 'groups'">
        <div class="header-actions">
          <h3>规则组配置</h3>
          <button class="primary" @click="addGroup">+ 新建规则组</button>
        </div>
        <div class="list-editor">
          <aside class="list-sidebar">
            <button
              v-for="item in draft.groups"
              :key="item.id"
              class="sub-item"
              :class="{ active: selectedGroup === item.id }"
              @click="selectedGroup = item.id"
            >
              <strong>{{ item.name }}</strong
              ><small>{{ item.taskIds.length }} 个任务</small>
            </button>
          </aside>
          <div class="list-content">
            <template v-if="group"
              ><div class="fields">
                <label>名称<input v-model="group.name" /></label><label>备注<input v-model="group.comment" /></label>
              </div>
              <div class="toolbar">
                <button @click="duplicateGroup(group)">复制规则组</button
                ><button class="danger" @click="removeGroup(group.id)">删除规则组</button>
              </div>
              <h4>关联任务</h4>
              <div class="toolbar">
                <select v-model="taskToLink" aria-label="选择关联任务">
                  <option value="">请选择任务</option>
                  <option
                    v-for="item in draft.tasks.filter(t => !group!.taskIds.includes(t.id))"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.name }}
                  </option></select
                ><button
                  :disabled="!taskToLink"
                  @click="
                    group.taskIds.push(taskToLink);
                    taskToLink = '';
                  "
                >
                  关联任务</button
                ><button
                  @click="
                    addTask();
                    group.taskIds.push(selectedTask);
                    tab = 'tasks';
                  "
                >
                  + 新建并关联
                </button>
              </div>
              <article v-for="item in groupTasks(group)" :key="item.id" class="linked-task">
                <div>
                  <strong>{{ item.name }}</strong>
                  <p class="hint">
                    {{ item.enabled ? '启用' : '停用' }} · 顺序 {{ item.order }} · 间隔 {{ item.triggerInterval }} 楼 ·
                    {{ item.eventName || '常规触发' }}
                  </p>
                </div>
                <button
                  @click="
                    selectedTask = item.id;
                    taskTab = 'basic';
                    tab = 'tasks';
                  "
                >
                  编辑</button
                ><button @click="group.taskIds = group.taskIds.filter(id => id !== item.id)">移除关联</button>
              </article>
              <p v-if="!group.taskIds.length" class="empty-state">此规则组尚未关联任务。</p></template
            >
            <p v-else class="empty-state">从左侧选择规则组，或创建新规则组。</p>
          </div>
        </div>
      </section>
      <section v-if="tab === 'connections'">
        <div class="header-actions">
          <h3>API配置</h3>
          <button class="primary" @click="addConnection">+ 新建连接</button>
        </div>
        <p class="hint">密钥单独保存在本地，不包含在配置或预设导出中；留空保留已存密钥。</p>
        <div class="list-editor">
          <aside class="list-sidebar">
            <button
              v-for="item in draft.connections"
              :key="item.id"
              class="sub-item"
              :class="{ active: selectedConnection === item.id }"
              @click="selectedConnection = item.id"
            >
              <strong>{{ item.name }}</strong
              ><small>{{ item.model || '未配置模型' }}</small>
            </button>
          </aside>
          <div class="list-content">
            <template v-if="connection">
              <div class="fields">
                <label>名称<input v-model="connection.name" /></label
                ><label>备注<input v-model="connection.comment" /></label
                ><label
                  >API 根地址<input
                    v-model="connection.baseUrl"
                    type="url"
                    placeholder="https://example.com/v1" /></label
                ><label>模型<input v-model="connection.model" /></label
                ><label
                  >更新本地密钥<input
                    v-model="secrets[connection.secretRef]"
                    type="password"
                    autocomplete="new-password"
                    placeholder="留空保留已存密钥"
                /></label>
              </div>
              <div class="toolbar">
                <button
                  @click="
                    secrets[connection.secretRef] = '';
                    clearedSecrets.add(connection.secretRef);
                  "
                >
                  保存时清空密钥</button
                ><button class="danger" @click="removeConnection(connection.id)">删除连接</button>
              </div>
              <p v-if="clearedSecrets.has(connection.secretRef)" class="hint">将清空密钥；填写新值可替换。</p>
            </template>
            <p v-else class="empty-state">从左侧选择连接，或创建新连接。</p>
          </div>
        </div>
      </section>
      <section v-if="tab === 'presets'">
        <div class="toolbar">
          <button @click="addPreset">+ 新建预设</button
          ><label class="file-button"
            >导入酒馆原生预设<input type="file" accept=".json,application/json" @change="importPreset"
          /></label>
        </div>
        <p class="hint">
          预设是独立副本。修改酒馆原预设后需重新导入。只编辑下列原生字段，其他字段原样保留；未知扩展字段不代表受支持。
        </p>
        <div class="list-editor">
          <aside class="list-sidebar">
            <button
              v-for="item in draft.presets"
              :key="item.id"
              class="sub-item"
              :class="{ active: selectedPreset === item.id }"
              @click="selectedPreset = item.id"
            >
              {{ item.name }}
            </button>
            <p v-if="!draft.presets.length" class="hint">导入或新建预设后开始编辑。</p>
          </aside>
          <div class="list-content">
            <div v-if="preset" class="card">
              <label>预设名称<input v-model="preset.name" /></label>
              <div class="toolbar">
                <button @click="duplicatePreset">复制预设</button
                ><button @click="download(preset.name + '.json', preset.raw)">导出原生预设</button
                ><button class="danger" @click="removePreset(preset.id)">删除预设</button>
              </div>
              <div class="fields">
                <label v-for="field in samplingFields" :key="field.key"
                  >{{ field.label }}<input v-model.number="preset.raw[field.key]" type="number" :step="field.step"
                /></label>
              </div>
              <p class="hint">
                提示词按 character_id=100001
                的原生全局顺序排列。角色卡、玩家人设、作者注释不会自动填充，可通过宏或模板主动读取。
              </p>
              <p v-if="!rawPreset" class="error">原生预设结构无效，请修正预算参数，或重新导入有效预设后编辑提示词。</p>
              <button :disabled="!rawPreset" @click="addPrompt">+ 新增提示词</button>
              <details v-for="prompt in presetPrompts" :key="prompt.identifier" class="prompt card">
                <summary>
                  {{ prompt.name || prompt.identifier }} · {{ promptEnabled(prompt.identifier) ? '启用' : '停用' }}
                </summary>
                <div class="toolbar">
                  <label
                    ><input
                      type="checkbox"
                      :checked="promptEnabled(prompt.identifier)"
                      @change="togglePrompt(prompt.identifier, ($event.target as HTMLInputElement).checked)"
                    />启用</label
                  ><button @click="movePrompt(prompt.identifier, -1)">上移</button
                  ><button @click="movePrompt(prompt.identifier, 1)">下移</button
                  ><button class="danger" @click="removePrompt(prompt.identifier)">删除提示词</button>
                </div>
                <div class="fields">
                  <label>名称<input v-model="prompt.name" /></label
                  ><label
                    >角色<select v-model="prompt.role">
                      <option value="system">system</option>
                      <option value="user">user</option>
                      <option value="assistant">assistant</option>
                    </select></label
                  >
                </div>
                <p class="hint">标识：{{ prompt.identifier }}{{ prompt.marker ? '（原生占位符）' : '' }}</p>
                <label>内容<textarea v-model="prompt.content" rows="5" /></label>
                <details>
                  <summary>原生注入位置</summary>
                  <div class="fields">
                    <label
                      >位置<select v-model.number="prompt.injection_position">
                        <option :value="0">相对顺序</option>
                        <option :value="1">聊天深度</option>
                      </select></label
                    ><label>深度<input v-model.number="prompt.injection_depth" type="number" min="0" /></label
                    ><label>注入顺序<input v-model.number="prompt.injection_order" type="number" /></label>
                  </div>
                </details>
              </details>
            </div>
          </div>
        </div>
      </section>

      <section v-if="tab === 'tasks'">
        <div class="header-actions">
          <div class="search-bar"><span>🔍</span><input v-model="taskSearch" placeholder="搜索任务名称或备注…" /></div>
          <button class="primary" @click="addTask">+ 新建全局任务</button>
        </div>
        <p class="stats-bar">
          总任务数：<strong>{{ draft.tasks.length }}</strong> | 未被引用：<strong>{{ orphanedCount }}</strong>
        </p>
        <div class="task-grid">
          <article
            v-for="item in filteredTasks"
            :key="item.id"
            class="task-card"
            :class="{ 'is-orphaned': !taskUsage(item.id).length }"
          >
            <div class="card-header">
              <strong>{{ item.name }}</strong
              ><span class="status-badge" :class="{ active: item.enabled }">{{
                (item.enabled ? '启用' : '已停用') + (item.eventName ? ' · 附加事件' : '')
              }}</span>
            </div>
            <p class="comment-text">{{ item.comment || '暂无备注' }}</p>
            <div class="usage-section">
              引用：<span v-for="usageGroup in taskUsage(item.id)" :key="usageGroup.id" class="usage-tag">{{
                usageGroup.name
              }}</span
              ><span v-if="!taskUsage(item.id).length" class="hint">未被引用</span>
            </div>
            <div class="toolbar">
              <button
                @click="
                  selectedTask = item.id;
                  taskTab = 'basic';
                "
              >
                编辑任务</button
              ><button
                @click="
                  selectedTask = item.id;
                  duplicateTask();
                  selectedTask = '';
                "
              >
                复制</button
              ><button class="danger" @click="removeTask(item.id)">删除</button>
            </div>
          </article>
        </div>
        <p v-if="!filteredTasks.length" class="empty-state">没有找到匹配的任务。点击“新建全局任务”开始配置。</p>
        <div v-if="task" class="modal-overlay" @click.self="selectedTask = ''">
          <div class="task-editor-modal" role="dialog" aria-modal="true" :aria-label="task.name + ' · 任务编辑'">
            <header class="task-header">
              <strong>全局任务 · {{ task.name }}</strong
              ><button aria-label="关闭任务编辑" @click="selectedTask = ''">×</button>
            </header>
            <nav class="inner-tabs">
              <button
                v-for="item in taskTabs"
                :key="item.id"
                :class="{ active: taskTab === item.id }"
                @click="taskTab = item.id"
              >
                {{ item.label }}
              </button>
            </nav>
            <div class="editor-body">
              <p v-if="error" class="error" role="alert">{{ error }}</p>
              <p v-if="notice" class="notice" role="status">{{ notice }}</p>
              <section v-show="taskTab === 'basic'">
                <div class="toolbar">
                  <label><input v-model="task.enabled" type="checkbox" />启用任务（所有入口）</label
                  ><button @click="duplicateTask">复制任务</button
                  ><button class="danger" @click="removeTask(task.id)">删除任务</button>
                </div>
                <div class="fields">
                  <label>名称<input v-model="task.name" /></label><label>备注<input v-model="task.comment" /></label>
                  <label
                    >连接<select v-model="task.connectionId">
                      <option value="">请选择</option>
                      <option v-for="item in draft.connections" :key="item.id" :value="item.id">{{ item.name }}</option>
                    </select></label
                  >
                  <label
                    >预设<select v-model="task.presetId">
                      <option value="">请选择</option>
                      <option v-for="item in draft.presets" :key="item.id" :value="item.id">{{ item.name }}</option>
                    </select></label
                  >
                  <label>附加事件名（可空）<input v-model="task.eventName" /></label
                  ><label>执行顺序<input v-model.number="task.order" type="number" step="1" /></label>
                  <label>历史消息条数<input v-model.number="task.historyDepth" type="number" min="0" /></label
                  ><label>自动触发楼层间隔<input v-model.number="task.triggerInterval" type="number" min="1" /></label
                  ><label>失败重试次数<input v-model.number="task.retryCount" type="number" min="0" /></label>
                </div>
                <label>任务提示词<textarea v-model="task.prompt" rows="6" /></label>
              </section>
              <section v-show="taskTab === 'worldbook'">
                <h4>任务世界书候选池</h4>
                <div class="list-editor">
                  <aside class="list-sidebar">
                    <button @click="addCandidateBook">+ 添加世界书</button
                    ><button
                      v-for="(book, index) in task.candidateBooks"
                      :key="index"
                      class="sub-item"
                      :class="{ active: selectedBook === index }"
                      @click="selectedBook = index"
                    >
                      {{ book.bookName || '请选择世界书'
                      }}<small>{{ book.entryUids.length }} 项勾选 · {{ book.nameRegexes.length }} 条名称正则</small>
                    </button>
                  </aside>
                  <div class="list-content">
                    <p class="hint">
                      仅扫描显式选择的条目。UID
                      和名称正则取并集；两者都为空则不会选择条目。候选副本强制启用后仍需按扫描规则触发。
                    </p>
                    <div
                      v-for="(book, bookIndex) in selectedBooks"
                      :key="bookIndex + ':' + selectedBook"
                      class="book-editor"
                    >
                      <WorldbookPicker
                        v-model:book-name="book.bookName"
                        v-model:entry-uids="book.entryUids"
                        :name-regexes="book.nameRegexes"
                      />
                      <h4>名称正则（与勾选条目取并集）</h4>
                      <div v-for="(regex, index) in book.nameRegexes" :key="index" class="regex-row">
                        <RegexField
                          v-model="book.nameRegexes[index]"
                          :presets="draft.regexPresets"
                          label="名称正则"
                          @test="openRegex"
                        /><button @click="book.nameRegexes.splice(index, 1)">移除</button>
                      </div>
                      <button @click="book.nameRegexes.push({ pattern: '', flags: '' })">+ 名称正则</button
                      ><button
                        class="danger"
                        @click="
                          task.candidateBooks.splice(selectedBook, 1);
                          selectedBook = 0;
                        "
                      >
                        移除世界书
                      </button>
                    </div>
                  </div>
                </div>
                <details>
                  <summary>世界书扫描参数</summary>
                  <div class="fields">
                    <label v-for="field in scanNumbers" :key="field.key"
                      >{{ field.label
                      }}<input v-model.number="task.scan[field.key]" type="number" :min="0" :max="field.max"
                    /></label>
                  </div>
                  <div class="choices">
                    <label v-for="field in scanSwitches" :key="field.key"
                      ><input v-model="task.scan[field.key]" type="checkbox" />{{ field.label }}</label
                    >
                  </div>
                </details>
              </section>
              <section v-show="taskTab === 'regex'">
                <h4>显式任务正则（{{ task.regexRules.length }}）</h4>
                <p class="hint">依次执行；不继承酒馆全局或角色正则。</p>
                <button @click="addRegex">+ 添加正则</button>
                <div v-for="(regex, index) in task.regexRules" :key="regex.id" class="card">
                  <div class="toolbar">
                    <label><input v-model="regex.enabled" type="checkbox" />启用</label
                    ><button @click="move(task.regexRules, index, -1)">上移</button
                    ><button @click="move(task.regexRules, index, 1)">下移</button
                    ><button @click="task.regexRules.splice(index, 1)">删除</button>
                  </div>
                  <div class="fields">
                    <label
                      >阶段<select v-model="regex.stage">
                        <option value="history">历史</option>
                        <option value="worldinfo">世界书</option>
                        <option value="prompt">请求消息</option>
                        <option value="response">模型响应</option>
                      </select></label
                    ><RegexField
                      v-model="task.regexRules[index]"
                      purpose="task"
                      :presets="draft.regexPresets"
                      @test="openRegex"
                    />
                  </div>
                  <label>替换文本<textarea v-model="regex.replacement" rows="2" /></label>
                </div>
              </section>
              <section v-show="taskTab === 'output'">
                <h4>结果处理</h4>
                <label
                  >输出方式<select
                    :value="task.output.mode"
                    @change="setOutput(($event.target as HTMLSelectElement).value)"
                  >
                    <option value="return">仅返回结果</option>
                    <option value="write">写入目标</option>
                  </select></label
                >
                <template v-if="task.output.mode === 'write'"
                  ><p class="hint">写入成功才视为任务成功；世界书按 UID 定位，目标不存在时自动创建并启用。</p>
                  <button @click="task.output.writes.push(newWrite())">+ 添加写入</button>
                  <div v-for="(write, writeIndex) in task.output.writes" :key="write.id" class="card">
                    <div class="toolbar">
                      <label
                        >目标<select
                          :value="write.target.kind"
                          @change="setTarget(write, ($event.target as HTMLSelectElement).value)"
                        >
                          <option value="message">当前正文消息</option>
                          <option value="worldbook">世界书条目</option>
                        </select></label
                      ><button @click="move(task.output.writes, writeIndex, -1)">上移</button
                      ><button @click="move(task.output.writes, writeIndex, 1)">下移</button
                      ><button class="danger" @click="task.output.writes.splice(writeIndex, 1)">删除写入</button>
                    </div>
                    <WorldbookPicker
                      v-if="write.target.kind === 'worldbook'"
                      v-model:book-name="write.target.bookName"
                      v-model:entry-uid="write.target.entryUid"
                      v-model:entry-name="write.target.entryName"
                      single
                    />
                    <p class="hint">提取规则分别匹配完整响应，命中结果按列表顺序换行拼接；空列表使用完整响应。</p>
                    <div v-for="(extract, index) in write.extract" :key="index" class="regex-row">
                      <RegexField
                        v-model="write.extract[index]"
                        purpose="extract"
                        :presets="draft.regexPresets"
                        label="响应提取正则"
                        @test="openRegex"
                      /><button @click="write.extract.splice(index, 1)">删除</button>
                    </div>
                    <button @click="write.extract.push({ pattern: '', flags: '' })">+ 提取正则</button>
                    <label
                      >写入操作<select
                        :value="write.operation.kind"
                        @change="
                          write.operation =
                            ($event.target as HTMLSelectElement).value === 'append'
                              ? { kind: 'append' }
                              : { kind: 'replace', regex: { pattern: '', flags: '' } }
                        "
                      >
                        <option value="append">追加</option>
                        <option value="replace">正则替换</option>
                      </select></label
                    >
                    <div v-if="write.operation.kind === 'replace'" class="regex-row">
                      <RegexField
                        v-model="write.operation.regex"
                        purpose="target"
                        :presets="draft.regexPresets"
                        label="目标匹配正则"
                        @test="openRegex"
                      />
                    </div>
                  </div>
                </template>
              </section>
            </div>
            <footer class="editor-footer">
              <span class="hint">修改保留在草稿中，保存配置后生效。</span
              ><button class="primary" :disabled="saving" @click="save">保存配置</button
              ><button @click="selectedTask = ''">返回任务列表</button>
            </footer>
          </div>
        </div>
      </section>

      <section v-show="tab === 'regex'">
        <h3>正则调试助手</h3>
        <RegexWorkbench
          v-model="draft.regexPresets"
          :seed="regexSeed"
          :purpose="regexPurpose"
          @apply="applyRegex"
          @done="returnFromRegex"
        />
      </section>
      <section v-if="tab === 'runs'"><slot name="runs" /></section>
      <section v-if="tab === 'settings'">
        <h3>额外功能</h3>
        <label
          >自动常规任务的最少正文字数<input v-model.number="draft.automatic.minReceivedChars" type="number" min="0"
        /></label>
        <p class="hint">默认 300 字，仅自动常规任务受此限制。</p>
        <slot name="settings" />
      </section>
    </fieldset>
    <div class="footer"><button @click="uiStore.showUI = false">关闭</button></div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { klona } from 'klona';
import {
  ConfigSchema,
  ScanSchema,
  type TaskSettings,
  type TaskConfig,
  type WriteSpec,
  type RegexSpec,
} from '@/MVU助手/AsyncAnalyze/TaskSchema';
import {
  NativePresetSchema,
  parseNativePreset,
  type NativePreset,
} from '@/MVU助手/AsyncAnalyze/generation/NativePreset';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import WorldbookPicker from './WorldbookPicker.vue';
import RegexField from './RegexField.vue';
import RegexWorkbench from './RegexWorkbench.vue';
import { Modal } from '@/MVU助手/utils/modal';

const props = defineProps<{
  settings: TaskSettings;
  saveSettings: (settings: TaskSettings) => Promise<void>;
  setSecret: (reference: string, secret: string) => void;
  deleteSecret: (reference: string) => void;
  configurationError?: string;
}>();
const uiStore = useUiStore();
const draft = ref<TaskSettings>(klona(props.settings));
const baseline = ref(JSON.stringify(props.settings));
const secrets = reactive<Record<string, string>>({});
const clearedSecrets = reactive(new Set<string>());
const pendingDeletes = reactive(new Set<string>());
const dirty = computed(
  () =>
    JSON.stringify(draft.value) !== baseline.value || Object.values(secrets).some(Boolean) || clearedSecrets.size > 0,
);
const saving = ref(false);
const error = ref('');
const notice = ref('');
const tab = ref('selection');
const tabs = [
  { id: 'selection', label: '规则组选择' },
  { id: 'connections', label: 'API配置' },
  { id: 'groups', label: '规则组配置' },
  { id: 'tasks', label: '规则编辑' },
  { id: 'regex', label: '正则测试' },
  { id: 'presets', label: '预设管理' },
  { id: 'runs', label: '运行结果' },
  { id: 'settings', label: '额外功能' },
];
const taskTab = ref('basic');
const taskTabs = [
  { id: 'basic', label: '基础与提示词' },
  { id: 'worldbook', label: '任务世界书提取' },
  { id: 'output', label: '结果处理' },
  { id: 'regex', label: '显式任务正则' },
];
const taskSearch = ref(''),
  selectedGroup = ref(draft.value.groups[0]?.id ?? ''),
  selectedConnection = ref(draft.value.connections[0]?.id ?? ''),
  taskToLink = ref('');
const selectedBook = ref(0);
const selectedBooks = computed(() =>
  task.value?.candidateBooks[selectedBook.value] ? [task.value.candidateBooks[selectedBook.value]] : [],
);
const group = computed(() => draft.value.groups.find(item => item.id === selectedGroup.value));
const connection = computed(() => draft.value.connections.find(item => item.id === selectedConnection.value));
const filteredTasks = computed(() =>
  draft.value.tasks.filter(item =>
    (item.name + ' ' + item.comment).toLowerCase().includes(taskSearch.value.toLowerCase()),
  ),
);
const taskUsage = (id: string) => draft.value.groups.filter(group => group.taskIds.includes(id));
const orphanedCount = computed(() => draft.value.tasks.filter(item => !taskUsage(item.id).length).length);
function groupTasks(group: TaskSettings['groups'][number]) {
  return group.taskIds
    .map(id => draft.value.tasks.find(task => task.id === id)!)
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}
function duplicateGroup(group: TaskSettings['groups'][number]) {
  const copy = klona(group);
  copy.id = uid();
  copy.name += '（副本）';
  draft.value.groups.push(copy);
  selectedGroup.value = copy.id;
}
function addCandidateBook() {
  task.value!.candidateBooks.push({ bookName: '', entryUids: [], nameRegexes: [] });
  selectedBook.value = task.value!.candidateBooks.length - 1;
}
const regexSeed = ref<RegexSpec & { replacement?: string }>();
const regexPurpose = ref<'match' | 'extract' | 'task' | 'target'>('match');
let regexTarget: (RegexSpec & { replacement?: string }) | undefined;
let regexReturnTab = 'tasks';
function openRegex(
  value: RegexSpec & { replacement?: string },
  purpose: 'match' | 'extract' | 'task' | 'target' = 'match',
) {
  regexPurpose.value = purpose;
  regexTarget = value;
  regexSeed.value = { ...value };
  regexReturnTab = tab.value;
  tab.value = 'regex';
}
function returnFromRegex() {
  tab.value = regexReturnTab;
  regexTarget = undefined;
  regexSeed.value = undefined;
}
function applyRegex(value: RegexSpec & { replacement: string }) {
  if (regexTarget) {
    regexTarget.pattern = value.pattern;
    regexTarget.flags = value.flags;
    if ('replacement' in regexTarget) regexTarget.replacement = value.replacement;
  }
  returnFromRegex();
}
const selectedTask = ref('');
const selectedPreset = ref(draft.value.presets[0]?.id ?? '');
const task = computed(() => draft.value.tasks.find(item => item.id === selectedTask.value));
const preset = computed(() => draft.value.presets.find(item => item.id === selectedPreset.value));
const rawPreset = computed(() => {
  const raw = preset.value?.raw;
  return raw && NativePresetSchema.safeParse(raw).success ? (raw as NativePreset) : undefined;
});
const presetPrompts = computed(() => {
  const raw = rawPreset.value;
  if (!raw) return [];
  const order = raw.prompt_order.find(item => item.character_id === 100001)!.order;
  return [...raw.prompts].sort((a, b) => {
    const rank = (id: string) => {
      const index = order.findIndex(item => item.identifier === id);
      return index < 0 ? order.length : index;
    };
    return rank(a.identifier) - rank(b.identifier);
  });
});
const samplingFields = [
  { key: 'temp_openai', label: '温度', step: '0.01' },
  { key: 'openai_max_tokens', label: '最大回复 Token', step: '1' },
  { key: 'openai_max_context', label: '上下文 Token', step: '1' },
  { key: 'top_p_openai', label: 'Top P', step: '0.01' },
  { key: 'top_k_openai', label: 'Top K', step: '1' },
  { key: 'freq_pen_openai', label: '频率惩罚', step: '0.01' },
  { key: 'pres_pen_openai', label: '存在惩罚', step: '0.01' },
  { key: 'seed', label: '随机种子（-1 随机）', step: '1' },
];
const scanNumbers: {
  key: 'depth' | 'minActivations' | 'minActivationDepthMax' | 'budgetPercent' | 'budgetCap' | 'maxRecursionSteps';
  label: string;
  max?: number;
}[] = [
  { key: 'depth', label: '扫描深度', max: 1000 },
  { key: 'minActivations', label: '最少激活条目数' },
  { key: 'minActivationDepthMax', label: '最少激活最大深度' },
  { key: 'budgetPercent', label: '上下文预算百分比', max: 100 },
  { key: 'budgetCap', label: '预算上限（0 不限制）' },
  { key: 'maxRecursionSteps', label: '最大递归步数（0 不限制）' },
];
const scanSwitches: {
  key: 'includeNames' | 'recursive' | 'caseSensitive' | 'matchWholeWords' | 'useGroupScoring';
  label: string;
}[] = [
  { key: 'includeNames', label: '包含消息名称' },
  { key: 'recursive', label: '递归扫描' },
  { key: 'caseSensitive', label: '区分大小写' },
  { key: 'matchWholeWords', label: '全词匹配' },
  { key: 'useGroupScoring', label: '分组评分' },
];
const uid = () => crypto.randomUUID();
const message = (value: unknown) => (value instanceof Error ? value.message : String(value));
watch(
  () => props.settings,
  value => {
    if (!dirty.value && !saving.value) {
      const hadRegexContext = invalidateRegexContext();
      if (hadRegexContext) notice.value = '外部配置已更新，测试器字段关联已结束；如需应用，请重新从字段打开。';
      draft.value = klona(value);
      baseline.value = JSON.stringify(value);
    } else if (JSON.stringify(value) !== baseline.value && !saving.value) {
      notice.value = '外部配置已更新；当前草稿已保留。撤销未保存修改可加载最新配置，保存则以草稿为准。';
    }
  },
  { deep: true },
);
function clearSecretDrafts() {
  Object.keys(secrets).forEach(key => delete secrets[key]);
  clearedSecrets.clear();
  pendingDeletes.clear();
}
function invalidateRegexContext() {
  if (!regexTarget) return false;
  regexTarget = undefined;
  regexSeed.value = undefined;
  return true;
}
function reset() {
  const hadRegexContext = invalidateRegexContext();
  draft.value = klona(props.settings);
  baseline.value = JSON.stringify(props.settings);
  clearSecretDrafts();
  error.value = '';
  notice.value = hadRegexContext ? '已加载最新配置，测试器字段关联已结束；如需应用，请重新从字段打开。' : '';
}
function validated() {
  const parsed = ConfigSchema.parse(draft.value);
  for (const item of parsed.presets) parseNativePreset(item.raw);
  return parsed;
}
async function save() {
  if (saving.value) return;
  error.value = '';
  notice.value = '';
  saving.value = true;
  try {
    const config = validated();
    await props.saveSettings(klona(config));
    // References are committed before deleting any local credential.
    for (const reference of pendingDeletes)
      if (!config.connections.some(item => item.secretRef === reference)) props.deleteSecret(reference);
    for (const reference of clearedSecrets)
      if (config.connections.some(item => item.secretRef === reference)) props.setSecret(reference, '');
    for (const [reference, secret] of Object.entries(secrets))
      if (secret && config.connections.some(item => item.secretRef === reference)) props.setSecret(reference, secret);
    const hadRegexContext = invalidateRegexContext();
    draft.value = klona(config);
    baseline.value = JSON.stringify(config);
    clearSecretDrafts();
    notice.value = hadRegexContext ? '配置已保存。测试器字段关联已结束；如需应用，请重新从字段打开。' : '配置已保存。';
  } catch (cause) {
    error.value = `保存未完成：${message(cause)}`;
  } finally {
    saving.value = false;
  }
}
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name.replace(/[<>:"/\\|?*]/g, '_');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportConfiguration() {
  try {
    download('任务配置.json', validated());
  } catch (cause) {
    error.value = `无法导出：${message(cause)}`;
  }
}
async function fileData(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return null;
  return { name: file.name.replace(/\.json$/i, ''), value: JSON.parse(await file.text()) as unknown };
}
async function importConfiguration(event: Event) {
  try {
    const file = await fileData(event);
    if (!file) return;
    const config = ConfigSchema.parse(file.value);
    config.presets.forEach(item => parseNativePreset(item.raw));
    if (!(await Modal.confirm('替换配置草稿', '导入将替换当前配置草稿；本地密钥不会导入。点击保存后生效。'))) return;
    clearSecretDrafts();
    for (const connection of props.settings.connections)
      if (!config.connections.some(item => item.secretRef === connection.secretRef))
        pendingDeletes.add(connection.secretRef);
    const hadRegexContext = invalidateRegexContext();
    draft.value = klona(config);
    error.value = '';
    notice.value =
      '配置已导入草稿，请检查后保存；新引用的密钥需在连接页填写。' +
      (hadRegexContext ? '测试器字段关联已结束；如需应用，请重新从字段打开。' : '');
  } catch (cause) {
    error.value = `导入失败（旧版配置不受支持）：${message(cause)}`;
  }
}
function addGroup() {
  const item = { id: uid(), name: '新规则组', comment: '', taskIds: [] };
  draft.value.groups.push(item);
  selectedGroup.value = item.id;
}
async function removeGroup(id: string) {
  if (!(await Modal.confirm('删除规则组', '从配置草稿删除此规则组？任务本身会保留。'))) return;
  draft.value.groups = draft.value.groups.filter(item => item.id !== id);
  if (draft.value.activeGroupId === id) draft.value.activeGroupId = null;
}
function addConnection() {
  const item = { id: uid(), name: '新连接', comment: '', baseUrl: '', model: '', secretRef: uid() };
  draft.value.connections.push(item);
  selectedConnection.value = item.id;
}
async function removeConnection(id: string) {
  if (draft.value.tasks.some(item => item.connectionId === id)) {
    error.value = '此连接仍被任务引用，请先修改或删除相关任务。';
    return;
  }
  if (!(await Modal.confirm('删除连接', '删除此连接？保存成功后会清理此连接不再使用的本地密钥。'))) return;
  const connection = draft.value.connections.find(item => item.id === id)!;
  pendingDeletes.add(connection.secretRef);
  delete secrets[connection.secretRef];
  clearedSecrets.delete(connection.secretRef);
  draft.value.connections = draft.value.connections.filter(item => item.id !== id);
}
async function addPreset() {
  const context = await Modal.prompt('新建预设', '请输入模型支持的上下文 Token 数（默认回复预算为 300 Token）。');
  if (context === null) return;
  const maxContext = Number(context);
  if (!Number.isInteger(maxContext) || maxContext <= 300) {
    error.value = '上下文 Token 数必须是大于回复预算 300 的整数。';
    return;
  }
  const id = uid();
  draft.value.presets.push({
    id,
    name: '新预设',
    raw: parseNativePreset({
      openai_max_context: maxContext,
      openai_max_tokens: 300,
      prompts: [
        { identifier: 'main', name: '主提示词', role: 'system', content: '', system_prompt: true },
        { identifier: 'worldInfoBefore', name: '世界书（前）', role: 'system', marker: true },
        { identifier: 'chatHistory', name: '聊天历史与任务', role: 'system', marker: true },
        { identifier: 'worldInfoAfter', name: '世界书（后）', role: 'system', marker: true },
      ],
      prompt_order: [
        {
          character_id: 100001,
          order: ['main', 'worldInfoBefore', 'chatHistory', 'worldInfoAfter'].map(identifier => ({
            identifier,
            enabled: true,
          })),
        },
      ],
    }),
  });
  selectedPreset.value = id;
}
async function importPreset(event: Event) {
  try {
    const file = await fileData(event);
    if (!file) return;
    const raw = parseNativePreset(file.value);
    const name = await Modal.prompt('导入原生预设', '插件副本名称；同名副本将提示覆盖。', file.name);
    if (!name?.trim()) return;
    const existing = draft.value.presets.find(item => item.name === name.trim());
    if (existing) {
      if (!(await Modal.confirm('覆盖同名预设', `覆盖“${name.trim()}”的副本？引用此预设的任务将在保存后使用新内容。`)))
        return;
      existing.raw = raw;
      selectedPreset.value = existing.id;
    } else {
      const id = uid();
      draft.value.presets.push({ id, name: name.trim(), raw });
      selectedPreset.value = id;
    }
    error.value = '';
    notice.value = '原生预设已导入草稿，请保存配置。';
  } catch (cause) {
    error.value = `预设导入失败：${message(cause)}`;
  }
}
function duplicatePreset() {
  if (!preset.value) return;
  const copy = klona(preset.value);
  copy.id = uid();
  copy.name += '（副本）';
  draft.value.presets.push(copy);
  selectedPreset.value = copy.id;
}
async function removePreset(id: string) {
  if (draft.value.tasks.some(item => item.presetId === id)) {
    error.value = '此预设仍被任务引用，请先修改或删除相关任务。';
    return;
  }
  if (await Modal.confirm('删除预设', '删除此插件预设副本？酒馆原预设不受影响。')) {
    draft.value.presets = draft.value.presets.filter(item => item.id !== id);
    selectedPreset.value = '';
  }
}
function globalOrder() {
  return rawPreset.value!.prompt_order.find(item => item.character_id === 100001)!.order;
}
function promptEnabled(id: string) {
  return globalOrder().find(item => item.identifier === id)?.enabled ?? false;
}
function togglePrompt(id: string, enabled: boolean) {
  const order = globalOrder();
  const item = order.find(item => item.identifier === id);
  if (item) item.enabled = enabled;
  else order.push({ identifier: id, enabled });
}
function move<T>(items: T[], index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
}
function movePrompt(id: string, delta: number) {
  const order = globalOrder();
  let index = order.findIndex(item => item.identifier === id);
  if (index < 0) {
    order.push({ identifier: id, enabled: false });
    index = order.length - 1;
  }
  move(order, index, delta);
}
function addPrompt() {
  const id = uid();
  rawPreset.value!.prompts.push({
    identifier: id,
    name: '新提示词',
    role: 'system',
    content: '',
    injection_position: 0,
  });
  globalOrder().push({ identifier: id, enabled: true });
}
async function removePrompt(id: string) {
  if (!(await Modal.confirm('删除提示词', `删除 ${id} 及预设内对它的顺序引用？`))) return;
  const raw = rawPreset.value!;
  raw.prompts = raw.prompts.filter(item => item.identifier !== id);
  raw.prompt_order.forEach(item => (item.order = item.order.filter(entry => entry.identifier !== id)));
}
function addTask() {
  const config: TaskConfig = {
    id: uid(),
    name: '新任务',
    comment: '',
    enabled: true,
    eventName: '',
    order: 0,
    historyDepth: 2,
    triggerInterval: 1,
    retryCount: 0,
    prompt: '',
    connectionId: draft.value.connections[0]?.id ?? '',
    presetId: draft.value.presets[0]?.id ?? '',
    candidateBooks: [],
    scan: ScanSchema.parse({}),
    regexRules: [],
    output: { mode: 'return' },
  };
  draft.value.tasks.push(config);
  selectedTask.value = config.id;
  taskTab.value = 'basic';
  selectedBook.value = 0;
}
function duplicateTask() {
  if (!task.value) return;
  const copy = klona(task.value);
  copy.id = uid();
  copy.name += '（副本）';
  draft.value.tasks.push(copy);
  selectedTask.value = copy.id;
}
async function removeTask(id: string) {
  if (!(await Modal.confirm('删除任务', '从任务池及所有规则组移除此任务？'))) return;
  draft.value.tasks = draft.value.tasks.filter(item => item.id !== id);
  draft.value.groups.forEach(group => (group.taskIds = group.taskIds.filter(value => value !== id)));
  selectedTask.value = '';
}
function addRegex() {
  task.value!.regexRules.push({ id: uid(), stage: 'prompt', pattern: '', flags: 'g', replacement: '', enabled: true });
}
function newWrite(): WriteSpec {
  return { id: uid(), target: { kind: 'message' }, extract: [], operation: { kind: 'append' } };
}
function setOutput(mode: string) {
  task.value!.output = mode === 'write' ? { mode: 'write', writes: [newWrite()] } : { mode: 'return' };
}
function setTarget(write: WriteSpec, kind: string) {
  write.target = kind === 'worldbook' ? { kind: 'worldbook', bookName: '', entryName: '' } : { kind: 'message' };
}
</script>

<style scoped lang="scss">
.task-manager {
  --panel: #fff;
  --soft: #f9fafb;
  --line: #d1d5db;
  --text: #111827;
  --muted: #6b7280;
  color-scheme: light;
  padding: 16px;
  color: var(--text);
  font-size: 14px;
  overflow-wrap: anywhere;
}
.task-manager.dark-mode {
  --panel: #1f2937;
  --soft: #111827;
  --line: #4b5563;
  --text: #e5e7eb;
  --muted: #9ca3af;
  color-scheme: dark;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.toolbar,
.tabs,
.choices,
.regex-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.tabs {
  border-bottom: 1px solid var(--line);
  padding: 8px 0;
}
.card {
  margin: 12px 0;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
}
summary {
  cursor: pointer;
  font-weight: 600;
  padding: 4px 0 10px;
}
.fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr));
  gap: 12px;
  margin: 12px 0;
}
:deep(label) {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 6px 0;
}
.choices label,
.toolbar label:has(input[type='checkbox']) {
  flex-direction: row;
  align-items: center;
}
:deep(input),
:deep(textarea),
:deep(select) {
  box-sizing: border-box;
  max-width: 100%;
  width: 100%;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: var(--text) !important;
  background: var(--soft) !important;
  font: inherit;
}
:deep(input[type='checkbox']),
:deep(input[type='radio']) {
  width: auto;
}
:deep(textarea) {
  resize: vertical;
}
:deep(button),
:deep(.file-button) {
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text) !important;
  background: var(--panel) !important;
  cursor: pointer;
  font: inherit;
}
button:hover,
.selected {
  border-color: #6366f1;
}
button.primary,
button.selected {
  background: #4f46e5 !important;
  color: #fff !important;
  border-color: #4f46e5;
}
button:disabled {
  opacity: 0.55;
  cursor: wait;
}
button.danger {
  color: #dc2626 !important;
}
:deep(.file-button input) {
  display: none;
}
.hint {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}
.error {
  color: #dc2626;
  white-space: pre-wrap;
}
.notice {
  color: #16a34a;
}
.regex-row label:first-child {
  flex: 1;
}
.regex-row label {
  flex-basis: 100px;
}

/* Restored from the original AsyncAnalyze page-tabs, TaskPoolManager card grid,
   and TaskEditorModal list-editor / inner-tabs structure (b5944676^). */
.main-container {
  padding: 10px;
  position: relative;
}
.page-tabs {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--line);
}
.page-tabs .tab-button,
.inner-tabs button {
  padding: 10px 20px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent !important;
  color: var(--muted) !important;
  font-size: 14px;
}
.page-tabs .tab-button:hover,
.inner-tabs button:hover {
  background: var(--soft) !important;
  color: var(--text) !important;
}
.page-tabs .tab-button.active,
.inner-tabs button.active {
  color: #6366f1 !important;
  border-bottom-color: #6366f1;
  font-weight: 500;
}
.header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--soft);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px 12px;
  flex: 1;
  max-width: 400px;
}
.search-bar input {
  border: 0;
  padding: 0;
  background: transparent !important;
}
.stats-bar {
  font-size: 13px;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
  padding-bottom: 12px;
}
.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 12px;
  margin-top: 16px;
  align-content: start;
}
.task-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  min-width: 0;
}
.task-card:hover {
  border-color: #a5b4fc;
}
.task-card.is-orphaned {
  border-style: dashed;
  background: var(--soft);
}
.task-card.active-card {
  border-color: #6366f1;
  box-shadow: 0 0 0 1px #6366f1;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.status-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #e5e7eb;
  color: #4b5563;
  flex-shrink: 0;
}
.status-badge.active {
  background: #dcfce7;
  color: #166534;
}
.comment-text {
  font-size: 12px;
  color: var(--muted);
  white-space: pre-wrap;
}
.usage-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  background: var(--soft);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  margin-bottom: 10px;
}
.usage-tag {
  background: #e0e7ff;
  color: #3730a3;
  padding: 2px 6px;
  border-radius: 4px;
}
.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--muted);
  background: var(--soft);
  border: 1px dashed var(--line);
  border-radius: 8px;
}
.list-editor {
  display: flex;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}
.list-sidebar {
  width: 220px;
  flex-shrink: 0;
  padding: 8px;
  background: var(--soft);
  border-right: 1px solid var(--line);
}
.list-content {
  flex: 1;
  min-width: 0;
  padding: 16px;
  background: var(--panel);
}
.sub-item {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  padding: 10px;
  background: transparent !important;
}
.sub-item.active {
  background: var(--panel) !important;
  border-left: 3px solid #4f46e5;
  color: #6366f1 !important;
}
.sub-item small {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-top: 5px;
}
.linked-task {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px;
  border-bottom: 1px solid var(--line);
}
.linked-task > div {
  flex: 1;
  min-width: 140px;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}
.task-editor-modal {
  width: 100%;
  max-width: 1100px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  color: var(--text);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}
.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
}
.task-header strong {
  overflow-wrap: anywhere;
}
.inner-tabs {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--line);
}
.editor-body {
  overflow-y: auto;
  padding: 16px;
}
.editor-body > section {
  margin: 0;
}
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid var(--line);
  padding: 10px 16px;
}
.editor-footer .hint {
  flex: 1;
}
.footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
:deep(.regex-inputs label) {
  min-width: 0;
}
:deep(.regex-tools button) {
  font-size: 12px;
}
:deep(.picker-toolbar label) {
  min-width: min(150px, 100%);
}
:deep(.entry-row) {
  flex-direction: row;
}
@media (max-width: 768px) {
  .list-editor {
    flex-direction: column;
  }
  .list-sidebar {
    width: auto;
    max-height: 220px;
    overflow-y: auto;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .list-content {
    padding: 10px;
  }
  .modal-overlay {
    padding: 0;
    align-items: stretch;
  }
  .task-editor-modal {
    max-width: none;
    border-radius: 0;
  }
  .inner-tabs button {
    padding: 10px 12px;
    font-size: 12px;
  }
  .editor-body {
    padding: 10px;
  }
  .task-manager {
    padding: 8px;
  }
  .page-tabs .tab-button {
    padding: 10px 12px;
  }
  .toolbar > select {
    width: auto;
    max-width: 100%;
  }
  .header-actions .search-bar {
    max-width: none;
  }
}
</style>
