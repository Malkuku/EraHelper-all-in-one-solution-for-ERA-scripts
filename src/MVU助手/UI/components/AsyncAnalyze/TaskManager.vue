<template>
  <div ref="manager" class="task-manager main-container mvu-workspace" :class="{ 'dark-mode': uiStore.darkMode }">
    <header class="workbench-heading">
      <div>
        <p class="eyebrow">任务工作台</p>
        <h2>{{ tabs.find(item => item.id === tab)?.label }}</h2>
      </div>
      <div class="workspace-save">
        <span class="hint" role="status">{{ saving ? '保存中…' : dirty ? '有未保存修改' : '已保存' }}</span
        ><button class="primary" :disabled="saving || !dirty" @click="save">保存配置</button>
      </div>
    </header>
    <div class="workbench-layout">
      <nav class="workspace-nav" aria-label="工作台页面">
        <div v-for="section in navigation" :key="section.label" class="nav-section">
          <p>{{ section.label }}</p>
          <button
            v-for="item in section.items"
            :key="item.id"
            :class="{ active: tab === item.id }"
            :aria-current="tab === item.id ? 'page' : undefined"
            @click="tab = item.id"
          >
            {{ item.label }}
          </button>
        </div>
      </nav>
      <label class="mobile-navigation"
        ><select v-model="tab" aria-label="工作台页面">
          <optgroup v-for="section in navigation" :key="section.label" :label="section.label">
            <option v-for="item in section.items" :key="item.id" :value="item.id">{{ item.label }}</option>
          </optgroup>
        </select></label
      >
      <main class="workbench-content">
        <p v-if="configurationError" class="error" role="alert">{{ configurationError }}</p>
        <p v-if="configurationWarning" class="hint" role="status">{{ configurationWarning }}</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="notice" class="notice" role="status">{{ notice }}</p>
        <section v-if="validationIssues.length" class="validation-summary" role="alert" aria-label="需要修正的配置">
          <strong>请修正 {{ validationIssues.length }} 项配置后保存</strong>
          <ul>
            <li v-for="(issue, index) in validationIssues" :key="index">
              <button @click="locateIssue(issue)">{{ issueLabel(issue) }}：{{ issue.message }} · 前往修正</button>
            </li>
          </ul>
        </section>

        <fieldset :disabled="saving">
          <section v-if="tab === 'groups'">
            <div class="header-actions">
              <select v-model="selectedGroup" class="mobile-resource-select" aria-label="编辑规则组">
                <option v-if="!draft.groups.length" value="">暂无规则组</option>
                <option v-for="item in draft.groups" :key="item.id" :value="item.id">
                  {{ item.name || '未命名规则组' }}
                </option>
              </select>
              <button class="primary" @click="addGroup">+ 新建规则组</button>
            </div>
            <label class="active-group-control"
              >活动规则组<select v-model="draft.activeGroupId" aria-label="活动规则组">
                <option :value="null">不启用规则组</option>
                <option v-for="item in draft.groups" :key="item.id" :value="item.id">
                  {{ item.name || '未命名规则组' }}
                </option>
              </select></label
            >
            <div class="list-editor">
              <aside class="list-sidebar">
                <button
                  v-for="item in draft.groups"
                  :key="item.id"
                  class="sub-item"
                  :class="{ active: selectedGroup === item.id }"
                  @click="selectedGroup = item.id"
                >
                  <strong>{{ item.name || '未命名规则组' }}</strong
                  ><small>{{ item.taskIds.length }} 个任务</small>
                </button>
              </aside>
              <div class="list-content">
                <template v-if="group"
                  ><div class="fields">
                    <label>名称<input v-model="group.name" data-config-key="name" /></label
                    ><label>备注<input v-model="group.comment" data-config-key="comment" /></label>
                  </div>
                  <div class="toolbar">
                    <button :disabled="draft.activeGroupId === group.id" @click="draft.activeGroupId = group.id">
                      {{ draft.activeGroupId === group.id ? '当前活动规则组' : '设为活动规则组' }}</button
                    ><button @click="duplicateGroup(group)">复制规则组</button
                    ><button class="danger" @click="removeGroup(group.id)">删除规则组</button>
                  </div>
                  <details class="editor-help">
                    <summary>规则组排序</summary>
                    <div class="toolbar">
                      <button
                        :disabled="draft.groups.indexOf(group) === 0"
                        @click="move(draft.groups, draft.groups.indexOf(group), -1)"
                      >
                        上移规则组</button
                      ><button
                        :disabled="draft.groups.indexOf(group) === draft.groups.length - 1"
                        @click="move(draft.groups, draft.groups.indexOf(group), 1)"
                      >
                        下移规则组
                      </button>
                    </div>
                  </details>
                  <h4>关联任务</h4>
                  <div class="toolbar">
                    <select v-model="taskToLink" aria-label="选择关联任务">
                      <option value="">请选择任务</option>
                      <option
                        v-for="item in draft.tasks.filter(t => !group!.taskIds.includes(t.id))"
                        :key="item.id"
                        :value="item.id"
                      >
                        {{ item.name || '未命名任务' }}
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
                    <div class="linked-task-content">
                      <div class="linked-task-heading">
                        <strong>{{ item.name || '未命名任务' }}</strong>
                        <span class="task-status" :class="{ enabled: item.enabled || !!item.eventName }">{{
                          item.eventName ? '事件触发' : item.enabled ? '启用' : '停用'
                        }}</span>
                      </div>
                      <div class="linked-task-trigger">
                        <span>顺序 {{ item.order }}</span
                        ><span>每 {{ item.triggerInterval }} 楼</span>
                        <span class="task-event">{{ item.eventName ? '事件：' + item.eventName : '常规触发' }}</span>
                        <span v-if="item.eventName && !item.enabled">当前已停用，事件不会执行</span>
                      </div>
                      <dl class="linked-task-binding">
                        <div v-for="binding in taskBindings(item)" :key="binding.label">
                          <dt>{{ binding.label }}</dt>
                          <dd>{{ binding.value }}</dd>
                        </div>
                      </dl>
                    </div>
                    <div class="linked-task-actions">
                      <button
                        @click="
                          selectedTask = item.id;
                          taskTab = 'basic';
                          tab = 'tasks';
                        "
                      >
                        编辑</button
                      ><button @click="group.taskIds = group.taskIds.filter(id => id !== item.id)">移除关联</button>
                    </div>
                  </article>
                  <p v-if="!group.taskIds.length" class="empty-state">此规则组尚未关联任务。</p></template
                >
                <p v-else class="empty-state">从左侧选择规则组，或创建新规则组。</p>
              </div>
            </div>
          </section>
          <section v-if="tab === 'connections'">
            <div class="header-actions">
              <select v-model="selectedConnection" class="mobile-resource-select" aria-label="编辑 API 配置">
                <option v-if="!draft.connections.length" value="">暂无 API</option>
                <option v-for="item in draft.connections" :key="item.id" :value="item.id">
                  {{ item.name || '未命名 API' }}
                </option>
              </select>
              <button class="primary" @click="addConnection">+ 新建连接</button>
            </div>
            <div class="list-editor">
              <aside class="list-sidebar">
                <button
                  v-for="item in draft.connections"
                  :key="item.id"
                  class="sub-item"
                  :class="{ active: selectedConnection === item.id }"
                  @click="selectedConnection = item.id"
                >
                  <strong>{{ item.name || '未命名 API' }}</strong
                  ><small>{{ item.model || '未配置模型' }}</small>
                </button>
              </aside>
              <div class="list-content">
                <template v-if="connection">
                  <section class="form-section">
                    <h4>连接配置</h4>
                    <div class="fields">
                      <label
                        >名称<input v-model="connection.name" data-config-key="name" placeholder="为这套 API 起个名字"
                      /></label>
                      <label
                        >备注<input v-model="connection.comment" data-config-key="comment" placeholder="可选"
                      /></label>
                      <label
                        >API 根地址<input
                          v-model="connection.baseUrl"
                          data-config-key="baseUrl"
                          type="url"
                          placeholder="https://example.com/v1"
                      /></label>
                      <label
                        >模型<input
                          v-model="connection.model"
                          data-config-key="model"
                          placeholder="输入模型名称，或在下方获取"
                      /></label>
                      <label
                        >绑定预设<select v-model="connection.presetId" data-config-key="presetId">
                          <option :value="null">暂不绑定</option>
                          <option v-for="item in draft.presets" :key="item.id" :value="item.id">
                            {{ item.name || '未命名预设' }}
                          </option>
                        </select></label
                      >
                      <div class="field-action">
                        <button
                          class="text-action"
                          @click="
                            selectedPreset = connection.presetId || '';
                            tab = 'presets';
                          "
                        >
                          {{ connection.presetId ? '编辑绑定预设 →' : '管理预设 →' }}
                        </button>
                      </div>
                    </div>
                  </section>
                  <section class="form-section">
                    <h4>本地密钥</h4>
                    <label
                      >更新密钥<input
                        v-model="secrets[connection.secretRef]"
                        type="password"
                        autocomplete="new-password"
                        placeholder="留空保留已存密钥"
                    /></label>
                    <div class="secret-actions">
                      <span class="hint">密钥保存在本地，不随配置导出。</span
                      ><button
                        class="text-action"
                        @click="
                          secrets[connection.secretRef] = '';
                          clearedSecrets.add(connection.secretRef);
                        "
                      >
                        {{ clearedSecrets.has(connection.secretRef) ? '已标记清空' : '清空已存密钥' }}
                      </button>
                    </div>
                    <p v-if="clearedSecrets.has(connection.secretRef)" class="hint">保存后清空密钥；填写新值可替换。</p>
                    <p
                      v-if="
                        draft.connections.some(
                          item => item.id !== connection!.id && item.secretRef === connection!.secretRef,
                        )
                      "
                      class="hint"
                    >
                      此密钥由多个 API 配置共享，更新或清空会影响这些配置。
                    </p>
                  </section>
                  <section class="form-section">
                    <h4>连接检测</h4>
                    <ConnectionCheck
                      :key="connection.id"
                      :connection="connection"
                      :secret="connectionSecret"
                      :credential-revision="
                        JSON.stringify([
                          secrets[connection.secretRef],
                          clearedSecrets.has(connection.secretRef),
                          baseline,
                        ])
                      "
                      @select="connection.model = $event"
                    />
                  </section>
                  <details class="reference-list">
                    <summary>使用此 API 的任务 · {{ connectionTasks.length }}</summary>
                    <ul v-if="connectionTasks.length">
                      <li v-for="item in connectionTasks" :key="item.id">
                        <button class="text-action" @click="editTask(item.id)">
                          {{ item.name || '未命名任务' }} →
                        </button>
                      </li>
                    </ul>
                    <p v-else class="hint">暂无任务引用。</p>
                  </details>
                  <footer class="resource-footer">
                    <button class="danger text-action" @click="removeConnection(connection.id)">删除 API 配置</button>
                  </footer>
                </template>
                <p v-else class="empty-state">从左侧选择连接，或创建新连接。</p>
              </div>
            </div>
          </section>
          <section v-if="tab === 'presets'">
            <select v-model="selectedPreset" class="mobile-resource-select preset-selector" aria-label="编辑预设">
              <option v-if="!draft.presets.length" value="">暂无预设</option>
              <option v-for="item in draft.presets" :key="item.id" :value="item.id">
                {{ item.name || '未命名预设' }}
              </option>
            </select>
            <div class="toolbar">
              <button @click="addPreset">+ 新建预设</button
              ><label class="file-button"
                >导入酒馆原生预设<input type="file" accept=".json,application/json" @change="importPreset"
              /></label>
            </div>

            <div class="list-editor">
              <aside class="list-sidebar">
                <button
                  v-for="item in draft.presets"
                  :key="item.id"
                  class="sub-item"
                  :class="{ active: selectedPreset === item.id }"
                  @click="selectedPreset = item.id"
                >
                  {{ item.name || '未命名预设' }}
                </button>
                <p v-if="!draft.presets.length" class="hint">导入或新建预设后开始编辑。</p>
              </aside>
              <div class="list-content">
                <div v-if="preset" class="preset-editor">
                  <label>预设名称<input v-model="preset.name" data-config-key="name" /></label>
                  <div class="toolbar">
                    <button @click="duplicatePreset">复制预设</button
                    ><button @click="download(preset.name + '.json', preset.raw)">导出原生预设</button
                    ><button class="danger" @click="removePreset(preset.id)">删除预设</button>
                  </div>
                  <div class="fields">
                    <label
                      v-for="field in samplingFields.filter(item =>
                        ['openai_max_context', 'openai_max_tokens'].includes(item.key),
                      )"
                      :key="field.key"
                      >{{ field.label
                      }}<input
                        v-model.number="preset.raw[field.key]"
                        :data-config-key="field.key"
                        type="number"
                        :step="field.step"
                    /></label>
                  </div>
                  <details class="sampling-settings">
                    <summary>采样参数</summary>
                    <div class="fields">
                      <label
                        v-for="field in samplingFields.filter(
                          item => !['openai_max_context', 'openai_max_tokens'].includes(item.key),
                        )"
                        :key="field.key"
                        >{{ field.label
                        }}<input
                          v-model.number="preset.raw[field.key]"
                          :data-config-key="field.key"
                          type="number"
                          :step="field.step"
                      /></label>
                    </div>
                  </details>
                  <details class="editor-help">
                    <summary>提示词与原生预设说明</summary>
                    <p class="hint">
                      提示词使用原生全局顺序。预设为插件独立副本；角色卡、玩家人设、作者注释可通过宏或模板主动读取。
                    </p>
                  </details>
                  <p v-if="!rawPreset" class="error">
                    提示词数组结构无法编辑，其他字段仍可修改和保存；可重新导入预设恢复提示词。
                  </p>
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
              <div class="search-bar">
                <input v-model="taskSearch" aria-label="搜索任务" placeholder="搜索任务名称或备注…" />
              </div>
              <button class="primary" @click="addTask">+ 新建任务</button>
            </div>
            <div class="task-list" aria-label="任务列表">
              <article v-for="item in filteredTasks" :key="item.id" class="task-row">
                <label class="task-enable"
                  ><input v-model="item.enabled" type="checkbox" :aria-label="'启用 ' + item.name"
                /></label>
                <button class="task-row-main text-action" @click="editTask(item.id)">
                  <strong>{{ item.name || '未命名任务' }}</strong
                  ><span>{{
                    item.comment || draft.connections.find(api => api.id === item.connectionId)?.name || '未选择 API'
                  }}</span>
                </button>
                <span class="task-row-meta">{{ taskUsage(item.id).length }} 个规则组</span>
                <div class="row-actions">
                  <button class="text-action" @click="editTask(item.id)">编辑</button>
                  <details class="row-menu">
                    <summary aria-label="任务更多操作">•••</summary>
                    <div>
                      <button
                        @click="
                          selectedTask = item.id;
                          duplicateTask();
                          selectedTask = '';
                        "
                      >
                        复制</button
                      ><button class="danger" @click="removeTask(item.id)">删除</button>
                    </div>
                  </details>
                </div>
              </article>
            </div>
            <p v-if="!filteredTasks.length" class="empty-state">
              {{ taskSearch ? '没有匹配的任务。' : '暂无任务，点击“新建任务”开始。' }}
            </p>
            <div v-if="task" class="modal-overlay" @click.self="selectedTask = ''">
              <div
                ref="taskDialog"
                class="task-editor-modal"
                tabindex="-1"
                role="dialog"
                aria-modal="true"
                :aria-label="(task.name || '未命名任务') + ' · 任务编辑'"
              >
                <header class="task-header">
                  <strong>任务 · {{ task.name || '未命名任务' }}</strong
                  ><button aria-label="关闭任务编辑" @click="selectedTask = ''">×</button>
                </header>
                <nav class="inner-tabs" aria-label="任务编辑分区">
                  <button
                    v-for="item in taskTabs"
                    :key="item.id"
                    :class="{ active: taskTab === item.id }"
                    :aria-current="taskTab === item.id ? 'page' : undefined"
                    @click="taskTab = item.id"
                  >
                    {{ item.label }}
                  </button>
                </nav>
                <div class="editor-body">
                  <p class="binding-summary">{{ bindingSummary(task) }}</p>
                  <p v-if="error" class="error" role="alert">{{ error }}</p>
                  <ul v-if="validationIssues.length" class="validation-summary">
                    <li v-for="(issue, index) in validationIssues" :key="index">
                      <button @click="locateIssue(issue)">
                        {{ issueLabel(issue) }}：{{ issue.message }} · 前往修正
                      </button>
                    </li>
                  </ul>
                  <p v-if="notice" class="notice" role="status">{{ notice }}</p>
                  <section v-show="taskTab === 'basic'">
                    <p class="binding-summary">
                      触发：{{ task.order < 0 ? '发送前，等待任务结束再继续正文' : '接收正文后；相同顺序可并发'
                      }}{{ task.eventName ? '；额外事件：' + task.eventName : '' }}。{{
                        task.historyDepth === 0 ? '不提供聊天历史' : '读取最近 ' + task.historyDepth + ' 条历史'
                      }}。
                    </p>
                    <div class="toolbar">
                      <label
                        ><input
                          v-model="task.enabled"
                          data-config-key="enabled"
                          type="checkbox"
                        />启用任务（所有入口）</label
                      ><button @click="duplicateTask">复制任务</button
                      ><button class="danger" @click="removeTask(task.id)">删除任务</button>
                    </div>
                    <div class="fields">
                      <label>名称<input v-model="task.name" data-config-key="name" /></label
                      ><label>备注<input v-model="task.comment" data-config-key="comment" /></label>
                      <label
                        >API 配置<select v-model="task.connectionId" data-config-key="connectionId">
                          <option value="">请选择 API 配置</option>
                          <option v-for="item in draft.connections" :key="item.id" :value="item.id">
                            {{ item.name || '未命名 API' }}
                          </option>
                        </select></label
                      >
                    </div>

                    <label>任务提示词<textarea v-model="task.prompt" data-config-key="prompt" rows="8" /></label>
                    <details>
                      <summary>触发与高级参数</summary>
                      <p class="hint">
                        负顺序在发送前执行；非负顺序在正文接收后执行。同一顺序可并发，数值越小越先执行。附加事件不会退出常规链；间隔仅限制自动触发，失败重试不重试写入冲突。
                      </p>
                      <div class="fields">
                        <label>附加事件名（可空）<input v-model="task.eventName" data-config-key="eventName" /></label
                        ><label
                          >执行顺序<input v-model.number="task.order" data-config-key="order" type="number" step="1"
                        /></label>
                        <label
                          >历史消息条数<input
                            v-model.number="task.historyDepth"
                            data-config-key="historyDepth"
                            type="number"
                            min="0" /></label
                        ><label
                          >自动触发楼层间隔<input
                            v-model.number="task.triggerInterval"
                            data-config-key="triggerInterval"
                            type="number"
                            min="1" /></label
                        ><label
                          >失败重试次数<input
                            v-model.number="task.retryCount"
                            data-config-key="retryCount"
                            type="number"
                            min="0"
                        /></label>
                      </div>
                    </details>
                    <p class="hint">预设由所选 API 配置确定。更换模型或预设，请编辑 API 配置。</p>
                    <button
                      @click="
                        selectedConnection = task.connectionId;
                        selectedTask = '';
                        tab = 'connections';
                      "
                    >
                      编辑此 API 与预设绑定
                    </button>
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
                          }}<input
                            v-model.number="task.scan[field.key]"
                            :data-config-key="field.key"
                            type="number"
                            :min="0"
                            :max="field.max"
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
                  <span class="hint">此按钮保存全部配置草稿，包括其他页面的修改。</span
                  ><button class="primary" :disabled="saving" @click="save">保存全部配置</button
                  ><button @click="selectedTask = ''">返回任务列表</button>
                </footer>
              </div>
            </div>
          </section>

          <section v-show="tab === 'regex'">
            <p v-if="regexSeed" class="binding-summary">
              正在调试：{{ regexSource }}。应用仅更新任务草稿，保存全部配置后生效。
            </p>
            <h3>正则调试助手</h3>
            <RegexWorkbench
              v-model="draft.regexPresets"
              :seed="regexSeed"
              :purpose="regexPurpose"
              @apply="applyRegex"
              @done="returnFromRegex"
            />
          </section>
          <section v-if="tab === 'runs'"><slot name="runs" :dirty="dirty" /></section>
          <section v-if="tab === 'settings'">
            <h3>额外功能</h3>
            <label
              >自动常规任务的最少正文字数<input v-model.number="draft.automatic.minReceivedChars" type="number" min="0"
            /></label>
            <p class="hint">默认 300 字，仅自动常规任务受此限制。</p>
            <slot name="settings" />
          </section>
          <section v-if="tab === 'transfer'">
            <h3>配置文件</h3>
            <p class="hint">导入替换当前草稿，保存后生效。导出包含全部配置草稿，不包含密钥。</p>
            <div class="toolbar">
              <button @click="exportConfiguration">导出配置</button
              ><label class="file-button"
                >导入配置<input
                  :disabled="saving"
                  type="file"
                  accept=".json,application/json"
                  @change="importConfiguration"
              /></label>
            </div>
            <section class="form-section">
              <h4>草稿</h4>
              <p class="hint">切换页面和关闭工作台会保留本次会话的草稿。</p>
              <button :disabled="saving || !dirty" @click="confirmReset">撤销全部未保存修改</button>
            </section>
          </section>
        </fieldset>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, nextTick, onActivated, onDeactivated } from 'vue';
import { useDialogFocus } from '@/MVU助手/utils/useDialogFocus';
import '../../design.scss';
import { klona } from 'klona';
import {
  ConfigSchema,
  parseTaskSettings,
  ScanSchema,
  type TaskSettings,
  type TaskConfig,
  type WriteSpec,
  type RegexSpec,
} from '@/MVU助手/AsyncAnalyze/TaskSchema';
import { preparePresetEditor } from '@/MVU助手/AsyncAnalyze/generation/NativePreset';
import { removeTaskResource } from '@/MVU助手/AsyncAnalyze/TaskConfiguration';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import WorldbookPicker from './WorldbookPicker.vue';
import RegexField from './RegexField.vue';
import RegexWorkbench from './RegexWorkbench.vue';
import ConnectionCheck from './ConnectionCheck.vue';
import { Modal } from '@/MVU助手/utils/modal';

const props = defineProps<{
  settings: TaskSettings;
  saveSettings: (settings: TaskSettings) => Promise<void>;
  setSecret: (reference: string, secret: string) => void;
  getSecret: (reference: string) => string;
  configurationError?: string;
  configurationWarning?: string;
}>();
const uiStore = useUiStore();
const manager = ref<HTMLElement | null>(null);
const taskDialog = ref<HTMLElement | null>(null);
const pageActive = ref(true);
onActivated(() => {
  pageActive.value = true;
});
onDeactivated(() => {
  pageActive.value = false;
});
const draft = ref<TaskSettings>(klona(props.settings));
const baseline = ref(JSON.stringify(props.settings));
const secrets = reactive<Record<string, string>>({});
const clearedSecrets = reactive(new Set<string>());
const dirty = computed(
  () =>
    JSON.stringify(draft.value) !== baseline.value || Object.values(secrets).some(Boolean) || clearedSecrets.size > 0,
);
const saving = ref(false);
const error = ref('');
const notice = ref('');
const tab = ref('presets');
const navigation = [
  {
    label: '配置',
    items: [
      { id: 'presets', label: '预设管理' },
      { id: 'connections', label: 'API 配置' },
    ],
  },
  {
    label: '编排',
    items: [
      { id: 'tasks', label: '任务' },
      { id: 'groups', label: '规则组' },
    ],
  },
  {
    label: '运行',
    items: [
      { id: 'runs', label: '运行结果' },
      { id: 'settings', label: '自动运行' },
    ],
  },
  {
    label: '工具',
    items: [
      { id: 'regex', label: '正则库与测试' },
      { id: 'transfer', label: '导入与导出' },
    ],
  },
];
const tabs = navigation.flatMap(section => section.items);
const taskTab = ref('basic');
const taskTabs = [
  { id: 'basic', label: '基础与提示词' },
  { id: 'worldbook', label: '输入世界书' },
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
const connectionTasks = computed(() => draft.value.tasks.filter(item => item.connectionId === connection.value?.id));
function presetName(id: string | null, config = draft.value) {
  return config.presets.find(item => item.id === id)?.name || (id ? '未命名预设' : '未绑定预设');
}
function taskBindings(task: TaskConfig) {
  const api = draft.value.connections.find(item => item.id === task.connectionId);
  return [
    { label: 'API', value: api ? api.name || '未命名 API' : '未选择' },
    { label: '模型', value: api?.model || '未配置' },
    { label: '预设', value: api ? presetName(api.presetId) : '未绑定预设' },
  ];
}
function bindingSummary(task: TaskConfig, config = draft.value) {
  const api = config.connections.find(item => item.id === task.connectionId);
  return api
    ? `API：${api.name || '未命名 API'} · 模型：${api.model || '未配置'} · 预设：${presetName(api.presetId, config)}`
    : '尚未选择 API 配置';
}
function editTask(id: string) {
  selectedTask.value = id;
  taskTab.value = 'basic';
  tab.value = 'tasks';
}
function connectionSecret() {
  const reference = connection.value!.secretRef;
  return secrets[reference] || (clearedSecrets.has(reference) ? '' : props.getSecret(reference));
}
const filteredTasks = computed(() =>
  draft.value.tasks.filter(item =>
    (item.name + ' ' + item.comment).toLowerCase().includes(taskSearch.value.toLowerCase()),
  ),
);
const taskUsage = (id: string) => draft.value.groups.filter(group => group.taskIds.includes(id));
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
const regexSource = ref('');
const regexPurpose = ref<'match' | 'extract' | 'task' | 'target'>('match');
let regexTarget: (RegexSpec & { replacement?: string }) | undefined;
let regexReturnTab = 'tasks';
function openRegex(
  value: RegexSpec & { replacement?: string },
  purpose: 'match' | 'extract' | 'task' | 'target' = 'match',
) {
  regexPurpose.value = purpose;
  regexSource.value = `${task.value?.name || '配置字段'} > ${taskTabs.find(item => item.id === taskTab.value)?.label || '正则'} > ${{ match: '名称匹配', extract: '响应提取', task: '显式替换', target: '目标替换' }[purpose]}`;
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
watch(
  () => [
    draft.value.groups.map(item => item.id),
    draft.value.connections.map(item => item.id),
    draft.value.presets.map(item => item.id),
  ],
  () => {
    if (!draft.value.groups.some(item => item.id === selectedGroup.value))
      selectedGroup.value = draft.value.groups[0]?.id ?? '';
    if (!draft.value.connections.some(item => item.id === selectedConnection.value))
      selectedConnection.value = draft.value.connections[0]?.id ?? '';
    if (!draft.value.presets.some(item => item.id === selectedPreset.value))
      selectedPreset.value = draft.value.presets[0]?.id ?? '';
  },
);
const task = computed(() => draft.value.tasks.find(item => item.id === selectedTask.value));
useDialogFocus(
  taskDialog,
  () => !!task.value && tab.value === 'tasks' && pageActive.value && uiStore.showUI,
  () => {
    selectedTask.value = '';
  },
);
const preset = computed(() => draft.value.presets.find(item => item.id === selectedPreset.value));
const rawPreset = computed(() => {
  if (!preset.value) return undefined;
  try {
    return preparePresetEditor(preset.value.raw);
  } catch {
    return undefined;
  }
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
  validationIssues.value = [];
  notice.value = hadRegexContext ? '已加载最新配置，测试器字段关联已结束；如需应用，请重新从字段打开。' : '';
}

type ConfigIssue = { path: PropertyKey[]; message: string };
const validationIssues = ref<ConfigIssue[]>([]);
const fieldLabels: Record<string, string> = {
  name: '名称',
  comment: '备注',
  baseUrl: 'API 根地址',
  model: '模型',
  presetId: '绑定预设',
  connectionId: 'API 配置',
  prompt: '任务提示词',
  eventName: '附加事件名',
  order: '执行顺序',
  historyDepth: '历史消息条数',
  triggerInterval: '自动触发楼层间隔',
  retryCount: '失败重试次数',
  openai_max_context: '上下文预算',
  openai_max_tokens: '回复预算',
  pattern: '表达式',
  flags: '正则标记',
  raw: '预设参数',
  tasks: '任务',
  groups: '规则组',
  connections: 'API',
  presets: '预设',
  automatic: '自动运行',
  minReceivedChars: '最少正文字数',
  regexPresets: '正则库',
  candidateBooks: '世界书候选',
  bookName: '世界书名称',
  entryName: '条目名称',
  entryUid: '条目编号',
  entryUids: '勾选条目',
  nameRegexes: '名称正则',
  regexRules: '任务正则',
  output: '结果处理',
  writes: '写入目标',
  extract: '响应提取',
  operation: '写入操作',
  target: '目标',
  scan: '扫描参数',
  taskIds: '关联任务',
  activeGroupId: '活动规则组',
  prompts: '提示词',
  prompt_order: '提示词顺序',
  depth: '扫描深度',
  budgetPercent: '上下文预算百分比',
  budgetCap: '预算上限',
  temp_openai: '温度',
  top_p_openai: 'Top P',
  top_k_openai: 'Top K',
  seed: '随机种子',
};
function localizedIssue(issue: {
  code: string;
  message: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  expected?: string;
  origin?: string;
  format?: string;
}) {
  if (issue.code === 'custom' || /[\u3400-\u9fff]/.test(issue.message)) return issue.message;
  if (issue.code === 'too_small') {
    if (issue.origin === 'string')
      return issue.minimum === 1 ? '此字段不能为空' : '请至少填写 ' + issue.minimum + ' 个字符';
    if (issue.origin === 'array') return '请至少添加 ' + issue.minimum + ' 项';
    return '数值不能小于 ' + issue.minimum;
  }
  if (issue.code === 'too_big') return '值不能大于 ' + issue.maximum;
  if (issue.code === 'invalid_type')
    return issue.expected === 'number' ? '请输入有效数字' : '字段类型不正确，请检查输入';
  if (issue.code === 'invalid_format') return issue.format === 'url' ? '请输入有效的 API 地址' : '格式无效，请检查输入';
  return '配置值无效，请检查此字段';
}
function issueLabel(issue: ConfigIssue) {
  const [kind, index] = issue.path;
  const items = draft.value[kind as 'tasks' | 'connections' | 'presets' | 'groups' | 'regexPresets'];
  const entity = Array.isArray(items) && typeof index === 'number' ? items[index] : undefined;
  const kindLabel = fieldLabels[String(kind)] || String(kind);
  const entityLabel =
    entity && 'name' in entity ? entity.name.trim() || `未命名对象（第 ${Number(index) + 1} 项）` : '';
  return (
    kindLabel +
    (entity ? ' · ' + entityLabel : '') +
    ' / ' +
    issue.path
      .slice(entity ? 2 : 1)
      .map(key => (typeof key === 'number' ? `第 ${key + 1} 项` : fieldLabels[String(key)] || String(key)))
      .join(' / ')
  );
}
async function locateIssue(issue: ConfigIssue) {
  const [kind, index] = issue.path;
  selectedTask.value = '';
  if (kind === 'tasks' && typeof index === 'number') {
    tab.value = 'tasks';
    selectedTask.value = draft.value.tasks[index]?.id || '';
    const key = issue.path[2];
    taskTab.value =
      key === 'output'
        ? 'output'
        : key === 'regexRules'
          ? 'regex'
          : ['candidateBooks', 'scan'].includes(String(key))
            ? 'worldbook'
            : 'basic';
  } else if (kind === 'connections') {
    tab.value = 'connections';
    selectedConnection.value = draft.value.connections[Number(index)]?.id || '';
  } else if (kind === 'presets') {
    tab.value = 'presets';
    selectedPreset.value = draft.value.presets[Number(index)]?.id || '';
  } else if (kind === 'groups') {
    tab.value = 'groups';
    selectedGroup.value = draft.value.groups[Number(index)]?.id || '';
  } else {
    tab.value = 'settings';
  }
  await nextTick();
  const key = String(issue.path.at(-1));
  const scope = taskDialog.value || manager.value;
  const input = scope?.querySelector<HTMLElement>('[data-config-key="' + key.replace(/[^a-zA-Z0-9_]/g, '') + '"]');
  if (input) {
    input.closest('details')?.setAttribute('open', '');
    input.scrollIntoView({ block: 'center' });
    input.focus();
  } else {
    scope?.scrollIntoView({ block: 'start' });
  }
}
async function confirmReset() {
  if (await Modal.confirm('撤销全部未保存修改', '任务、API、预设、规则组、正则库及本地密钥草稿都将恢复到已保存状态。'))
    reset();
}

function validated() {
  validationIssues.value = [];
  const result = ConfigSchema.safeParse(draft.value);
  if (!result.success) {
    validationIssues.value = result.error.issues.map(issue => ({ path: issue.path, message: localizedIssue(issue) }));
    throw new Error('配置存在待修正字段，请使用问题清单定位。');
  }
  const parsed = result.data;
  return parsed;
}
async function save() {
  if (saving.value) return;
  error.value = '';
  notice.value = '';
  saving.value = true;
  let configurationSaved = false;
  try {
    const config = validated();
    await props.saveSettings(klona(config));
    configurationSaved = true;
    baseline.value = JSON.stringify(config);
    for (const reference of clearedSecrets)
      if (config.connections.some(item => item.secretRef === reference)) props.setSecret(reference, '');
    for (const [reference, secret] of Object.entries(secrets))
      if (secret && config.connections.some(item => item.secretRef === reference)) props.setSecret(reference, secret);
    const hadRegexContext = invalidateRegexContext();
    draft.value = klona(config);
    clearSecretDrafts();
    notice.value = hadRegexContext ? '配置已保存。测试器字段关联已结束；如需应用，请重新从字段打开。' : '配置已保存。';
  } catch (cause) {
    error.value = configurationSaved
      ? `配置已保存，本地密钥更新未完成：${message(cause)}。密钥草稿已保留，可再次保存重试。`
      : `保存未完成：${message(cause)}`;
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
    const config = parseTaskSettings(file.value);
    if (!(await Modal.confirm('替换配置草稿', '导入将替换当前配置草稿；本地密钥不会导入。点击保存后生效。'))) return;
    clearSecretDrafts();
    const hadRegexContext = invalidateRegexContext();
    draft.value = klona(config);
    error.value = '';
    notice.value =
      '配置已导入草稿，请检查后保存；新引用的密钥需在连接页填写。' +
      (hadRegexContext ? '测试器字段关联已结束；如需应用，请重新从字段打开。' : '');
  } catch (cause) {
    error.value = `导入失败：${message(cause)}`;
  }
}
function addGroup() {
  const item = { id: uid(), name: '新规则组', comment: '', taskIds: [] };
  draft.value.groups.push(item);
  selectedGroup.value = item.id;
}
function removeGroup(id: string) {
  draft.value = removeTaskResource(draft.value, 'group', id);
  selectedGroup.value = draft.value.groups[0]?.id ?? '';
}
function addConnection() {
  const item = { id: uid(), name: '新连接', comment: '', baseUrl: '', model: '', secretRef: uid(), presetId: null };
  draft.value.connections.push(item);
  selectedConnection.value = item.id;
}
function removeConnection(id: string) {
  const removed = draft.value.connections.find(item => item.id === id);
  draft.value = removeTaskResource(draft.value, 'connection', id);
  if (removed && !draft.value.connections.some(item => item.secretRef === removed.secretRef)) {
    delete secrets[removed.secretRef];
    clearedSecrets.delete(removed.secretRef);
  }
  selectedConnection.value = draft.value.connections[0]?.id ?? '';
  error.value = '';
  notice.value = 'API 已从草稿删除，引用任务已保留并清空 API 选择。保存后生效。';
}
function addPreset() {
  const id = uid();
  draft.value.presets.push({
    id,
    name: '新预设',
    raw: {
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
    },
  });
  selectedPreset.value = id;
}
async function importPreset(event: Event) {
  try {
    const file = await fileData(event);
    if (!file) return;
    if (!file.value || typeof file.value !== 'object' || Array.isArray(file.value))
      throw new Error('预设文件必须是 JSON 对象');
    const raw = file.value as Record<string, unknown>;
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
function removePreset(id: string) {
  draft.value = removeTaskResource(draft.value, 'preset', id);
  selectedPreset.value = draft.value.presets[0]?.id ?? '';
  error.value = '';
  notice.value = '预设已从草稿删除，API 的预设绑定已清空。保存后生效。';
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
    connectionId: '',
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
function removeTask(id: string) {
  draft.value = removeTaskResource(draft.value, 'task', id);
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
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  container: task-workbench / inline-size;
  min-width: 0;
}
.workbench-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
}
.eyebrow {
  color: var(--muted);
  font-size: 12px;
  margin: 0 0 3px;
}
h2 {
  font-size: 24px;
  line-height: 1.3;
  margin: 0;
  color: var(--text);
}
h3 {
  margin: 0;
  font-size: 17px;
}
h4 {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 650;
}
.workspace-save {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-shrink: 0;
}
.workbench-layout {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  gap: 28px;
  padding-top: 22px;
}
.workspace-nav {
  border-right: 1px solid var(--line);
  padding-right: 16px;
}
.nav-section {
  margin-bottom: 24px;
}
.nav-section p {
  margin: 0 0 6px 10px;
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.08em;
}
.workspace-nav button {
  display: block;
  width: 100%;
  border: 0;
  text-align: left;
  background: transparent !important;
  color: var(--muted) !important;
  padding: 9px 10px;
  margin: 2px 0;
}
.workspace-nav button.active {
  color: var(--mvu-accent) !important;
  background: var(--soft) !important;
  font-weight: 650;
}
.mobile-resource-select {
  display: none;
}
.mobile-navigation {
  display: none;
}
.workbench-content {
  min-width: 0;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: 0 0 18px;
  justify-content: flex-end;
}
.toolbar,
.choices,
.regex-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.toolbar {
  margin: 0 0 14px;
}
.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 20px;
  margin: 0 0 16px;
}
:deep(label) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
  font-weight: 500;
  min-width: 0;
}
.choices label,
.toolbar label:has(input[type='checkbox']) {
  flex-direction: row;
  align-items: center;
}
:deep(input),
:deep(select),
:deep(textarea) {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--mvu-control-line);
  border-radius: 7px;
  color: var(--text) !important;
  background: var(--panel) !important;
  font: inherit;
}
:deep(select) {
  appearance: auto !important;
  padding-right: 26px;
  cursor: pointer;
}
:deep(input[type='checkbox']),
:deep(input[type='radio']) {
  width: 18px;
  height: 18px;
  min-height: 18px;
  flex-shrink: 0;
  accent-color: var(--mvu-accent);
}
:deep(textarea) {
  resize: vertical;
  min-height: 90px;
}
:deep(button),
:deep(.file-button) {
  min-height: 38px;
  padding: 7px 12px;
  border: 1px solid var(--mvu-control-line);
  border-radius: 7px;
  background: var(--panel) !important;
  color: var(--text) !important;
  cursor: pointer;
  font: inherit;
  line-height: 1.5;
}
:deep(button:hover),
:deep(.file-button:hover) {
  border-color: var(--mvu-accent);
}
button.primary,
button.selected {
  background: var(--mvu-accent) !important;
  color: var(--mvu-on-accent) !important;
  border-color: var(--mvu-accent);
  font-weight: 600;
}
:deep(button:disabled) {
  cursor: not-allowed;
  opacity: 0.5;
}
button.danger {
  color: var(--mvu-danger) !important;
}
button.text-action {
  border: 0;
  background: transparent !important;
  padding: 6px 0;
  color: var(--mvu-accent) !important;
}
button.text-action:hover {
  text-decoration: underline;
}
button.danger.text-action {
  color: var(--mvu-danger) !important;
}
:deep(.file-button) {
  display: inline-flex;
  position: relative;
  flex-direction: row;
  align-items: center;
  margin: 0;
  overflow: hidden;
}
:deep(.file-button input) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
:deep(.file-button:focus-within) {
  outline: 3px solid var(--mvu-focus);
  outline-offset: 3px;
}
.hint,
.comment-text {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}
.error,
.validation-summary {
  color: var(--mvu-danger);
  white-space: pre-wrap;
}
.notice {
  color: var(--mvu-success);
  font-size: 13px;
}
.validation-summary {
  padding: 14px;
  margin: 12px 0;
  border: 1px solid currentColor;
  border-radius: 8px;
}
.validation-summary ul {
  padding-left: 20px;
}
.validation-summary button {
  text-align: left;
  color: var(--mvu-danger) !important;
}
summary {
  cursor: pointer;
  font-weight: 500;
  padding: 6px 0;
}
.editor-help {
  margin: 12px 0;
  color: var(--muted);
  font-size: 12px;
}
.list-editor {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  min-width: 0;
  border-top: 1px solid var(--line);
}
.list-sidebar {
  padding: 12px 14px 12px 0;
  border-right: 1px solid var(--line);
}
.list-content {
  min-width: 0;
  padding: 22px 0 0 24px;
}
.sub-item {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent !important;
  padding: 10px 12px;
  margin: 0 0 4px;
}
.sub-item.active {
  background: var(--soft) !important;
  color: var(--mvu-accent) !important;
  box-shadow: inset 2px 0 var(--mvu-accent);
}
.sub-item strong {
  font-size: 13px;
  font-weight: 550;
}
.sub-item small {
  display: block;
  color: var(--muted);
  font-size: 11px;
  margin-top: 3px;
}
.form-section {
  padding: 22px 0;
  border-bottom: 1px solid var(--line);
}
.form-section:first-child {
  padding-top: 0;
}
.form-section:last-child {
  border-bottom: 0;
}
.form-section .fields {
  margin-bottom: 0;
}
.field-action {
  display: flex;
  align-items: end;
  padding-bottom: 8px;
}
.secret-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 20px;
  justify-content: space-between;
}
.reference-list {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.reference-list ul {
  list-style: none;
  padding: 4px 0 0;
  margin: 0;
}
.reference-list li {
  border-top: 1px solid var(--line);
}
.reference-list button {
  text-align: left;
}
.resource-footer {
  padding: 16px 0 0;
}
.active-group-control {
  max-width: 420px;
  margin-bottom: 20px;
}
.linked-task {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}
.linked-task-content {
  flex: 1 1 280px;
  min-width: 0;
}
.linked-task-heading,
.linked-task-trigger,
.linked-task-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.linked-task-heading strong {
  font-size: 16px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.task-status {
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  background: var(--soft);
}
.task-status.enabled {
  color: var(--mvu-accent);
  border-color: currentColor;
}
.linked-task-trigger {
  margin: 8px 0 12px;
  font-size: 13px;
  line-height: 1.6;
}
.task-event {
  overflow-wrap: anywhere;
  min-width: 0;
}
.linked-task-binding {
  display: grid;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}
.linked-task-binding > div {
  display: grid;
  grid-template-columns: 3em minmax(0, 1fr);
  gap: 12px;
}
.linked-task-binding dt {
  color: var(--muted);
}
.linked-task-binding dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.linked-task-actions {
  flex: 0 0 auto;
  gap: 8px;
}
.search-bar {
  display: flex;
  align-items: center;
  max-width: 440px;
  flex: 1;
  min-width: 180px;
}
.task-list {
  border-top: 1px solid var(--line);
}
.task-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  padding: 12px 2px;
  border-bottom: 1px solid var(--line);
}
.task-enable {
  margin: 0;
}
button.task-row-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  min-width: 0;
  color: var(--text) !important;
  padding: 2px 0;
}
.task-row-main strong {
  font-size: 14px;
  font-weight: 550;
}
.task-row-main span,
.task-row-meta {
  font-size: 12px;
  color: var(--muted);
}
.task-row-main span {
  margin-top: 3px;
}
.row-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}
.row-menu {
  position: relative;
}
.row-menu > summary {
  list-style: none;
  min-width: 30px;
  text-align: center;
  padding: 8px 0;
}
.row-menu > div {
  position: absolute;
  z-index: 5;
  right: 0;
  top: 100%;
  padding: 6px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 8px 24px #0002;
  min-width: 96px;
}
.row-menu button {
  display: block;
  width: 100%;
  border: 0;
  text-align: left;
}
.empty-state {
  color: var(--muted);
  text-align: center;
  padding: 28px 14px;
  font-size: 13px;
}
.card {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  margin: 12px 0;
  background: var(--panel);
}
.binding-summary {
  padding: 10px 0;
  color: var(--muted);
  font-size: 12px;
  border-bottom: 1px solid var(--line);
}
.regex-row label:first-child {
  flex: 1;
}
.regex-row label {
  flex-basis: 100px;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgb(15 23 42 / 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.task-editor-modal {
  width: min(1120px, 100%);
  height: min(880px, calc(100dvh - 48px));
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 20px 80px rgb(0 0 0 / 24%);
  overflow: hidden;
}
.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.task-header strong {
  font-size: 17px;
  overflow-wrap: anywhere;
}
.inner-tabs {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  border-bottom: 1px solid var(--line);
  margin: 0;
  padding: 6px 12px;
}
.inner-tabs button {
  border: 0;
  background: transparent !important;
  color: var(--muted) !important;
  border-radius: 0;
  padding: 9px 13px;
  min-height: 40px;
}
.inner-tabs button.active {
  color: var(--mvu-accent) !important;
  box-shadow: inset 0 -2px var(--mvu-accent);
}
.editor-body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px;
  container-type: inline-size;
}
.editor-body > section {
  margin: 0;
}
.editor-footer {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid var(--line);
  background: var(--panel);
}
.editor-footer .hint {
  flex: 1;
  min-width: 160px;
}
:deep(.entry-row) {
  flex-direction: row;
}
:deep(.regex-inputs label),
:deep(.picker-toolbar label) {
  min-width: 0;
}
@container (max-width:1000px) {
  .workbench-layout {
    grid-template-columns: 126px minmax(0, 1fr);
    gap: 20px;
  }
  .list-editor {
    grid-template-columns: 150px minmax(0, 1fr);
  }
  .list-content {
    padding-left: 18px;
  }
}
@container (max-width:760px) {
  .workbench-layout {
    display: block;
    padding-top: 16px;
  }
  .workspace-nav {
    display: none;
  }
  .mobile-navigation {
    display: flex;
    margin: 0 0 22px;
  }
  .list-editor {
    grid-template-columns: 140px minmax(0, 1fr);
  }
  .fields {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .task-row-meta {
    display: none;
  }
  .task-row {
    grid-template-columns: 20px minmax(0, 1fr) auto;
  }
}
@container (max-width:520px) {
  .mobile-resource-select {
    display: block;
    flex: 1;
    min-width: 0;
    width: 0;
  }
  .mobile-resource-select.preset-selector {
    width: 100%;
    margin-bottom: 12px;
  }
  .header-actions {
    flex-wrap: nowrap;
  }
  .header-actions > button {
    flex-shrink: 0;
  }
  .list-sidebar {
    display: none !important;
  }
  .eyebrow {
    display: none;
  }
  .workspace-save {
    flex-direction: row !important;
    align-items: center !important;
  }
  .mobile-navigation {
    margin-bottom: 14px;
  }

  .workbench-heading {
    gap: 8px;
    align-items: flex-start;
    padding-bottom: 16px;
  }
  h2 {
    font-size: 20px;
  }
  .workspace-save {
    gap: 6px;
    flex-direction: column;
    align-items: flex-end;
  }
  .workspace-save .hint {
    font-size: 11px;
  }
  .list-editor {
    display: block;
  }
  .list-sidebar {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 10px 0;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .sub-item {
    min-width: 130px;
    width: 160px;
    flex-shrink: 0;
    margin: 0;
  }
  .sub-item small {
    display: none;
  }
  .list-content {
    padding: 20px 0 0;
  }
  .task-row {
    gap: 10px;
  }
  .row-actions {
    gap: 8px;
  }
  .field-action {
    padding: 0;
  }
  .header-actions {
    gap: 10px;
  }
}
@media (max-width: 700px), (max-height: 480px) {
  .modal-overlay {
    padding: 0;
  }
  .task-editor-modal {
    width: 100%;
    height: 100dvh;
    border-radius: 0;
  }
  .task-header,
  .editor-body {
    padding: 12px;
  }
  .editor-footer {
    padding: 10px 12px;
  }
  .inner-tabs {
    padding: 4px;
  }
  .inner-tabs button {
    padding: 8px;
    font-size: 12px;
  }
  .editor-footer .hint {
    flex-basis: 100%;
  }
  .editor-footer button {
    flex: 1;
  }
}
</style>
