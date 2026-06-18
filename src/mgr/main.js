/**
 * 管理端主逻辑
 */
(function () {
    'use strict';

    /* ============================================================
       全局配置
       ============================================================ */

    var DEBUG = true;

    var CFG = {
        API_BASE: 'api',
        TOKEN_KEY: 'mgr_token',
        USERNAME_KEY: 'mgr_username',
        SOURCE_KEY: 'mgr_source',
        WORKSPACE_KEY: 'mgr_workspace',
        PANELS: ['authPanel', 'channelPanel', 'channelDetailPanel'],
        LABEL_MAX_LENGTH: 20,
        LABEL_MAX_COUNT: 10
    };

    /* ============================================================
       调试系统
       ============================================================ */

    var DBG_STYLES = {
        '系统初化': 'color:#60A5FA;font-weight:bold',
        '认证': 'color:#A78BFA;font-weight:bold',
        '频道': 'color:#34D399;font-weight:bold',
        '数据': 'color:#FBBF24;font-weight:bold',
        '标签': 'color:#F472B6;font-weight:bold',
        '用户操作': 'color:#60A5FA;font-weight:bold',
        'API': 'color:#818CF8;font-weight:bold',
        'Toast': 'color:#888',
        'warn': 'color:#F59E0B;font-weight:bold',
        'error': 'color:#EF4444;font-weight:bold;font-style:italic'
    };

    var debugPanelEl = null;

    function initDebugPanel() {
        debugPanelEl = document.createElement('div');
        debugPanelEl.className = 'debug-panel';
        debugPanelEl.id = 'debugPanel';
        document.body.appendChild(debugPanelEl);
    }

    function appendDebugLine(level, cat, text, data) {
        if (!debugPanelEl) return;
        var now = new Date();
        var time = pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
        var line = document.createElement('div');
        line.className = 'debug-line' + (level === 'warn' ? ' dbg-warn' : level === 'error' ? ' dbg-error' : '');
        var html = '<span class="dbg-time">' + time + '</span><span class="dbg-tag">[' + cat + ']</span> ' + escapeHtml(text);
        if (data !== undefined) {
            try { html += ' ' + escapeHtml(JSON.stringify(data)); } catch (e) {}
        }
        line.innerHTML = html;
        debugPanelEl.appendChild(line);
        debugPanelEl.scrollTop = debugPanelEl.scrollHeight;
    }

    function toggleDebugPanel() {
        if (!debugPanelEl) return;
        debugPanelEl.classList.toggle('visible');
    }

    function dbg(cat, text, data) {
        if (!DEBUG) return;
        var style = DBG_STYLES[cat] || 'color:#888';
        if (data !== undefined) {
            console.log('%c[' + cat + ']%c ' + text, style, 'color:inherit', data);
        } else {
            console.log('%c[' + cat + ']%c ' + text, style, 'color:inherit');
        }
        appendDebugLine('log', cat, text, data);
    }

    function dbgW(cat, text, data) {
        if (!DEBUG) return;
        var style = DBG_STYLES['warn'];
        if (data !== undefined) {
            console.warn('%c[' + cat + ']%c ' + text, style, 'color:inherit', data);
        } else {
            console.warn('%c[' + cat + ']%c ' + text, style, 'color:inherit');
        }
        appendDebugLine('warn', cat, text, data);
    }

    function dbgE(cat, text, data) {
        if (!DEBUG) return;
        var style = DBG_STYLES['error'];
        if (data !== undefined) {
            console.error('%c[' + cat + ']%c ' + text, style, 'color:inherit', data);
        } else {
            console.error('%c[' + cat + ']%c ' + text, style, 'color:inherit');
        }
        appendDebugLine('error', cat, text, data);
    }

    /* ============================================================
       工具函数
       ============================================================ */

    function pad2(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatNum(n) {
        return String(n || 0);
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    /* ============================================================
       Toast
       ============================================================ */

    var MAX_TOASTS = 3;

    function showToast(message, type, duration) {
        if (type === undefined) type = 'info';
        if (duration === undefined) duration = 3000;
        var container = document.getElementById('toastContainer');
        /* 超出上限时立即移除旧的 */
        while (container.children.length >= MAX_TOASTS) {
            container.removeChild(container.firstChild);
        }
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(function () {
            toast.classList.add('toast-show');
        });
        setTimeout(function () {
            toast.classList.remove('toast-show');
            toast.addEventListener('transitionend', function () { toast.remove(); });
        }, duration);
        dbg('Toast', type + ': ' + message);
    }

    /* ============================================================
       面板切换
       ============================================================ */

    function showPanel(panelId) {
        console.log('[MGR-DEBUG] 面板切换: ' + panelId);
        CFG.PANELS.forEach(function (id) {
            document.getElementById(id).style.display = id === panelId ? 'block' : 'none';
        });
    }

    /* ============================================================
       API 请求
       ============================================================ */

    function apiRequest(endpoint, options) {
        if (options === undefined) options = {};
        var token = localStorage.getItem(CFG.TOKEN_KEY);
        var headers = { 'Content-Type': 'application/json' };
        if (options.headers) {
            Object.keys(options.headers).forEach(function (k) { headers[k] = options.headers[k]; });
        }
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        var method = options.method || 'GET';
        var url = CFG.API_BASE + '/' + endpoint;
        console.log('[MGR-DEBUG] API请求发出: ' + method + ' ' + url, options.body ? JSON.parse(options.body) : '');
        dbg('API', method + ' ' + url, options.body ? JSON.parse(options.body) : undefined);
        return fetch(url, {
            method: method,
            headers: headers,
            body: options.body || undefined
        }).then(function (r) { return r.json(); }).then(function (data) {
            if (data.code !== 0) {
                console.warn('[MGR-DEBUG] API响应异常: code=' + data.code + ' message=' + data.message);
                dbgW('API', 'code=' + data.code + ' ' + data.message);
                throw new Error(data.message || '请求失败');
            }
            console.log('[MGR-DEBUG] API响应成功: ' + endpoint, data.data);
            dbg('API', 'OK ' + endpoint, data.data);
            return data;
        }).catch(function (err) {
            console.error('[MGR-DEBUG] API请求失败: ' + endpoint + ' - ' + err.message);
            dbgE('API', 'FAIL ' + endpoint + ': ' + err.message);
            throw err;
        });
    }

    /* ============================================================
       状态
       ============================================================ */

    /* 来源模式: config=服务端指定, local=同源数据库 */
    var sourceType = localStorage.getItem(CFG.SOURCE_KEY) || 'config';
    var channelsCache = [];
    var currentChannel = null;
    var currentRangeMin = 1;
    var currentRangeMax = 100;
    var statsCache = [];
    var extraCache = [];
    var labelsCache = [];
    var activeTab = 'stats';
    var focusAfterRenderId = null;

    /* ============================================================
       工作区状态持久化
       ============================================================ */

    function saveWorkspace() {
        if (!currentChannel) return;
        var state = {
            sourceType: sourceType,
            dbName: currentChannel.dbName || '',
            dbPath: currentChannel.dbPath || '',
            channelName: currentChannel.name || '',
            mediaIdMin: currentChannel.mediaIdMin || 0,
            mediaIdMax: currentChannel.mediaIdMax || 0,
            mediaType: currentChannel.mediaType || '',
            activeTab: activeTab,
            rangeMin: currentRangeMin,
            rangeMax: currentRangeMax
        };
        localStorage.setItem(CFG.WORKSPACE_KEY, JSON.stringify(state));
        console.log('[MGR-DEBUG] 工作区状态已保存', state);
        dbg('工作区', '保存状态', state);
    }

    function clearWorkspace() {
        localStorage.removeItem(CFG.WORKSPACE_KEY);
        localStorage.removeItem(CFG.SOURCE_KEY);
        console.log('[MGR-DEBUG] 工作区状态已清空');
        dbg('工作区', '清空状态');
    }

    function tryRestoreWorkspace() {
        var raw = localStorage.getItem(CFG.WORKSPACE_KEY);
        if (!raw) {
            console.log('[MGR-DEBUG] 工作区恢复: 无保存的状态');
            return false;
        }
        try {
            var state = JSON.parse(raw);
            if (!state || !state.dbName) {
                console.log('[MGR-DEBUG] 工作区恢复: 状态数据无效');
                return false;
            }
            console.log('[MGR-DEBUG] 工作区恢复中...', state);
            dbg('工作区', '恢复状态', state);
            sourceType = state.sourceType || 'config';
            var ch = {
                id: state.dbName.replace(/\.db$/, ''),
                name: state.channelName || state.dbName,
                dbPath: state.dbPath || '',
                dbName: state.dbName,
                mediaIdMin: state.mediaIdMin || 0,
                mediaIdMax: state.mediaIdMax || 0,
                mediaType: state.mediaType || '',
                _source: sourceType
            };
            currentChannel = ch;
            currentRangeMin = state.rangeMin || 1;
            currentRangeMax = state.rangeMax || 100;
            activeTab = state.activeTab || 'stats';
            console.log('[MGR-DEBUG] 工作区恢复成功: ' + state.dbName);
            return true;
        } catch (e) {
            console.error('[MGR-DEBUG] 工作区恢复失败: ' + e.message);
            dbgW('工作区', '恢复失败', { error: e.message });
            return false;
        }
    }

    /* ============================================================
       认证
       ============================================================ */

    function loadUserInfo() {
        console.log('[MGR-DEBUG] 开始验证Token...');
        dbg('认证', '验证Token...');
        apiRequest('user_info.php').then(function (data) {
            console.log('[MGR-DEBUG] Token验证成功: 用户=' + data.data.username + ' 权限=' + data.data.permission);
            dbg('认证', '已认证', { username: data.data.username, permission: data.data.permission });
            document.getElementById('usernameDisplay').textContent = data.data.username;
            document.getElementById('adminUser').style.display = '';
            restoreOrShowChannelPanel();
        }).catch(function () {
            console.warn('[MGR-DEBUG] Token验证失败，跳转登录面板');
            dbgW('认证', 'Token无效或已过期');
            localStorage.removeItem(CFG.TOKEN_KEY);
            localStorage.removeItem(CFG.USERNAME_KEY);
            showPanel('authPanel');
        });
    }

    function handleLogin(e) {
        e.preventDefault();
        var username = document.getElementById('username').value.trim();
        var password = document.getElementById('password').value.trim();
        if (!username || !password) {
            showToast('请输入用户名和密码', 'error');
            return;
        }
        console.log('[MGR-DEBUG] 登录请求: 用户=' + username);
        dbg('认证', '尝试登录', { username: username });
        apiRequest('user_login.php', {
            method: 'POST',
            body: JSON.stringify({ username: username, password: password })
        }).then(function (data) {
            console.log('[MGR-DEBUG] 登录成功: 用户=' + data.data.username);
            localStorage.setItem(CFG.TOKEN_KEY, data.data.token);
            localStorage.setItem(CFG.USERNAME_KEY, data.data.username);
            showToast('登录成功', 'success');
            document.getElementById('usernameDisplay').textContent = data.data.username;
            document.getElementById('adminUser').style.display = '';
            restoreOrShowChannelPanel();
        }).catch(function (err) {
            console.error('[MGR-DEBUG] 登录失败: ' + err.message);
            showToast(err.message || '登录失败', 'error');
        });
    }

    function restoreOrShowChannelPanel() {
        if (tryRestoreWorkspace()) {
            console.log('[MGR-DEBUG] 尝试恢复工作区: dbName=' + currentChannel.dbName);
            dbg('工作区', '尝试恢复上次工作区', { dbName: currentChannel.dbName });
            /* 尝试加载数据验证数据库是否可用 */
            var dbPath = currentChannel.dbPath || '';
            var dbName = currentChannel.dbName || '';
            var url = 'stats_view.php?dbPath=' + encodeURIComponent(dbPath) +
                '&dbName=' + encodeURIComponent(dbName) +
                '&min=' + currentRangeMin + '&max=' + currentRangeMax;
            apiRequest(url).then(function (data) {
                console.log('[MGR-DEBUG] 工作区恢复数据加载成功: dbName=' + currentChannel.dbName);
                dbg('工作区', '恢复成功', { dbName: currentChannel.dbName });
                statsCache = data.data.stats || [];
                extraCache = data.data.extra || [];
                labelsCache = data.data.labels || [];
                document.getElementById('rangeMin').value = currentRangeMin;
                document.getElementById('rangeMax').value = currentRangeMax;
                document.getElementById('detailChannelName').textContent = currentChannel.name;
                switchTab(activeTab);
                showPanel('channelDetailPanel');
                renderStatsTable();
                renderLabelTable();
            }).catch(function (err) {
                console.warn('[MGR-DEBUG] 工作区恢复失败，返回首页: ' + err.message);
                dbgW('工作区', '恢复失败，返回首页', { error: err.message });
                clearWorkspace();
                currentChannel = null;
                showChannelPanel();
            });
        } else {
            showChannelPanel();
        }
    }

    function handleLogout() {
        console.log('[MGR-DEBUG] 用户登出');
        dbg('认证', '登出');
        apiRequest('user_logout.php', { method: 'POST' }).catch(function () {});
        localStorage.removeItem(CFG.TOKEN_KEY);
        localStorage.removeItem(CFG.USERNAME_KEY);
        clearWorkspace();
        currentChannel = null;
        document.getElementById('adminUser').style.display = 'none';
        showPanel('authPanel');
        showToast('已登出', 'info');
    }

    /* ============================================================
       频道列表
       ============================================================ */

    function showChannelPanel() {
        console.log('[MGR-DEBUG] 显示频道列表面板, 数据来源=' + sourceType);
        showPanel('channelPanel');
        initSourceUI();
        loadChannels();
    }

    function initSourceUI() {
        document.querySelectorAll('.source-tab').forEach(function (el) {
            el.classList.toggle('active', el.dataset.source === sourceType);
        });
        updateSourceStatus();
    }

    function updateSourceStatus() {
        var el = document.getElementById('sourceStatus');
        if (sourceType === 'config') {
            el.textContent = '从 main.js 读取频道配置';
        } else {
            el.textContent = '扫描数据库目录';
        }
    }

    function loadChannels() {
        console.log('[MGR-DEBUG] 加载频道列表, 来源模式=' + sourceType);
        var listEl = document.getElementById('channelList');
        listEl.innerHTML = '<p class="connect-status">加载中...</p>';

        if (sourceType === 'config') {
            loadChannelsFromConfig();
        } else {
            loadChannelsFromLocalScan();
        }
    }

    /* 模式1: 服务端指定 - 从 main.js 解析频道配置 */
    function loadChannelsFromConfig() {
        console.log('[MGR-DEBUG] 从服务端配置加载频道...');
        dbg('频道', '加载频道配置（服务端指定）...');
        apiRequest('channel_list.php').then(function (data) {
            channelsCache = (data.data.channels || []).map(function (ch) {
                ch._source = 'config';
                return ch;
            });
            console.log('[MGR-DEBUG] 服务端频道加载完成: ' + channelsCache.length + ' 个频道');
            dbg('频道', '加载完成', { count: channelsCache.length });
            renderChannelList();
        }).catch(function (err) {
            console.error('[MGR-DEBUG] 服务端频道加载失败: ' + err.message);
            document.getElementById('channelList').innerHTML =
                '<p class="connect-status" style="color:var(--color-danger);">' + escapeHtml(err.message || '加载失败') + '</p>';
        });
    }

    /* 模式2: 同源数据库 - 扫描数据库目录 */
    function loadChannelsFromLocalScan() {
        console.log('[MGR-DEBUG] 扫描同源数据库目录...');
        dbg('频道', '扫描同源数据库...');
        apiRequest('db_list.php').then(function (data) {
            var files = data.data.files || [];
            channelsCache = files.map(function (f) {
                return {
                    id: f.name.replace(/\.db$/, ''),
                    name: f.name,
                    dbPath: '',
                    dbName: f.path,
                    mediaIdMin: 0,
                    mediaIdMax: 0,
                    mediaType: '',
                    _source: 'local',
                    _size: f.size,
                    _mtime: f.mtime
                };
            });
            console.log('[MGR-DEBUG] 同源数据库扫描完成: ' + channelsCache.length + ' 个数据库');
            dbg('频道', '扫描完成', { count: channelsCache.length });
            renderChannelList();
        }).catch(function (err) {
            console.error('[MGR-DEBUG] 同源数据库扫描失败: ' + err.message);
            document.getElementById('channelList').innerHTML =
                '<p class="connect-status" style="color:var(--color-danger);">' + escapeHtml(err.message || '扫描失败') + '</p>';
        });
    }

    function renderChannelList() {
        var listEl = document.getElementById('channelList');
        listEl.innerHTML = '';
        console.log('[MGR-DEBUG] 渲染频道列表: ' + channelsCache.length + ' 个频道');

        if (channelsCache.length === 0) {
            listEl.innerHTML = '<p class="connect-status">未发现频道或数据库</p>';
            return;
        }

        channelsCache.forEach(function (ch) {
            var card = document.createElement('div');
            card.className = 'channel-card';
            var meta = '';
            if (ch._source === 'config') {
                meta = '<span class="channel-card-badge">' + escapeHtml(ch.mediaType || '?') + '</span>' +
                    '<span>' + escapeHtml(ch.dbName) + '</span>' +
                    (ch.mediaIdMax > 0 ? '<span>ID: ' + ch.mediaIdMin + '-' + ch.mediaIdMax + '</span>' : '');
            } else {
                meta = '<span>' + escapeHtml(ch.dbName) + '</span>' +
                    '<span>' + formatSize(ch._size) + '</span>' +
                    '<span>' + ch._mtime + '</span>';
            }
            card.innerHTML =
                '<div>' +
                '<div class="channel-card-name">' + escapeHtml(ch.name) + '</div>' +
                '<div class="channel-card-meta">' + meta + '</div>' +
                '</div>' +
                '<div style="color:var(--color-text-light);font-size:0.85rem;">进入 &rarr;</div>';
            card.addEventListener('click', function () {
                openChannel(ch);
            });
            listEl.appendChild(card);
        });
    }

    /* ============================================================
       频道详情
       ============================================================ */

    function openChannel(ch) {
        console.log('[MGR-DEBUG] 打开频道: name=' + ch.name + ' dbName=' + ch.dbName + ' source=' + ch._source);
        dbg('频道', '打开频道', { name: ch.name, dbName: ch.dbName, source: ch._source });
        currentChannel = ch;
        if (ch.mediaIdMax > 0) {
            currentRangeMin = ch.mediaIdMin;
            currentRangeMax = ch.mediaIdMax;
        }
        document.getElementById('rangeMin').value = currentRangeMin;
        document.getElementById('rangeMax').value = currentRangeMax;
        document.getElementById('detailChannelName').textContent = ch.name;
        activeTab = 'stats';
        switchTab('stats');
        showPanel('channelDetailPanel');
        loadChannelData();
        saveWorkspace();
    }

    function loadChannelData() {
        var ch = currentChannel;
        if (!ch) return;

        var dbPath = ch.dbPath || '';
        var dbName = ch.dbName || '';
        /* local 模式: dbName 存的是相对路径如 cait/xxx.db，dbPath 为空 */
        /* config 模式: dbPath=sqlitedb/cait/, dbName=cait20260609-0.db */

        var url = 'stats_view.php?dbPath=' + encodeURIComponent(dbPath) +
            '&dbName=' + encodeURIComponent(dbName) +
            '&min=' + currentRangeMin + '&max=' + currentRangeMax;
        console.log('[MGR-DEBUG] 加载频道数据: dbPath=' + dbPath + ' dbName=' + dbName + ' range=' + currentRangeMin + '-' + currentRangeMax);
        dbg('数据', '加载频道数据', { dbPath: dbPath, dbName: dbName });
        apiRequest(url).then(function (data) {
            statsCache = data.data.stats || [];
            extraCache = data.data.extra || [];
            labelsCache = data.data.labels || [];
            console.log('[MGR-DEBUG] 频道数据加载完成: stats=' + statsCache.length + ' extra=' + extraCache.length + ' labels=' + labelsCache.length);
            dbg('数据', '加载完成', { stats: statsCache.length, extra: extraCache.length, labels: labelsCache.length });
            renderStatsTable();
            renderLabelTable();
            showToast('已加载 ' + statsCache.length + ' 条数据', 'success');
        }).catch(function (err) {
            console.error('[MGR-DEBUG] 频道数据加载失败: ' + err.message);
            showToast(err.message || '加载失败', 'error');
        });
    }

    function switchTab(tab) {
        console.log('[MGR-DEBUG] 切换Tab: ' + tab);
        activeTab = tab;
        document.querySelectorAll('.detail-tab').forEach(function (el) {
            el.classList.toggle('active', el.dataset.tab === tab);
        });
        document.getElementById('statsContent').style.display = tab === 'stats' ? '' : 'none';
        document.getElementById('labelsContent').style.display = tab === 'labels' ? '' : 'none';
        if (tab !== 'stats') disconnectFloatingHeader();
        saveWorkspace();
    }

    /* ============================================================
       数据统计表格
       ============================================================ */

    function renderStatsTable() {
        var tbody = document.getElementById('statsTableBody');
        tbody.innerHTML = '';

        if (statsCache.length === 0) {
            document.getElementById('statsEmptyTip').style.display = '';
            return;
        }
        document.getElementById('statsEmptyTip').style.display = 'none';

        statsCache.forEach(function (stat) {
            var tr = document.createElement('tr');

            var tdId = document.createElement('td');
            tdId.textContent = stat.id;
            tr.appendChild(tdId);

            [stat.views, stat.likes, stat.favorites].forEach(function (val) {
                var td = document.createElement('td');
                td.className = 'num';
                td.textContent = formatNum(val);
                tr.appendChild(td);
            });

            tr.appendChild(createExtraCell(stat.id, 'downloads'));
            tr.appendChild(createExtraCell(stat.id, 'shares'));
            tr.appendChild(createExtraCell(stat.id, 'blocks'));

            tbody.appendChild(tr);
        });

        /* 预构建浮动表头 */
        buildFloatingHeader(document.getElementById('statsTable'));
    }

    function createExtraCell(id, field) {
        var td = document.createElement('td');
        var val = getExtraValue(id, field);
        td.className = 'num';
        td.textContent = formatNum(val);
        return td;
    }

    function getExtraValue(id, field) {
        for (var i = 0; i < extraCache.length; i++) {
            if (extraCache[i].id === id) return extraCache[i][field] || 0;
        }
        return 0;
    }

    /* ============================================================
       标签管理
       ============================================================ */

    function renderLabelTable() {
        var tbody = document.getElementById('labelTableBody');
        tbody.innerHTML = '';

        if (labelsCache.length === 0) {
            document.getElementById('labelEmptyTip').style.display = '';
            return;
        }
        document.getElementById('labelEmptyTip').style.display = 'none';

        labelsCache.forEach(function (item) {
            var tr = document.createElement('tr');
            tr.dataset.id = item.id;

            var tdId = document.createElement('td');
            tdId.textContent = item.id;
            tr.appendChild(tdId);

            var tdLabels = document.createElement('td');
            var labelsDiv = document.createElement('div');
            labelsDiv.className = 'labels-edit';
            item.labels.forEach(function (label, idx) {
                labelsDiv.appendChild(createLabelChip(item.id, label, idx));
            });
            var addInput = document.createElement('input');
            addInput.type = 'text';
            addInput.className = 'add-label-input';
            addInput.placeholder = item.labels.length + '/' + CFG.LABEL_MAX_COUNT + '，回车添加';
            addInput.maxLength = CFG.LABEL_MAX_LENGTH;
            /* 点击容器聚焦输入框 */
            labelsDiv.addEventListener('click', function () {
                addInput.focus();
            });
            /* 回车或逗号添加标签 */
            addInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ',' || e.key === '\uFF0C') {
                    e.preventDefault();
                    addLabelFromInput(addInput, item);
                }
                /* 退格键删除最后一个标签（输入框为空时） */
                if (e.key === 'Backspace' && addInput.value === '' && item.labels.length > 0) {
                    e.preventDefault();
                    item.labels.pop();
                    /* 本地移除最后一个chip，不重建表格 */
                    var chips = labelsDiv.querySelectorAll('.label-chip');
                    if (chips.length > 0) chips[chips.length - 1].remove();
                    addInput.placeholder = item.labels.length + '/' + CFG.LABEL_MAX_COUNT + '，回车添加';
                    /* 延迟同步服务端 */
                    clearTimeout(addInput._saveTimer);
                    addInput._saveTimer = setTimeout(function () {
                        updateLabelsOnServer(item.id, item.labels, true);
                    }, 600);
                }
                /* 禁止输入空格 */
                if (e.key === ' ') e.preventDefault();
            });
            /* 输入逗号时也添加 */
            addInput.addEventListener('input', function () {
                if (addInput.value.indexOf(',') !== -1 || addInput.value.indexOf('\uFF0C') !== -1) {
                    addLabelFromInput(addInput, item);
                }
            });
            /* 阻止回车提交表单（保持键盘展开） */
            addInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') e.preventDefault();
            });
            labelsDiv.appendChild(addInput);
            tdLabels.appendChild(labelsDiv);
            tr.appendChild(tdLabels);

            var tdActions = document.createElement('td');
            var clearBtn = document.createElement('button');
            clearBtn.className = 'btn btn-sm label-action-clear';
            clearBtn.textContent = '清空';
            /* 二次确认逻辑 */
            var resetClearBtn = function () {
                clearTimeout(clearBtn._confirmTimer);
                clearBtn._confirmTimer = null;
                clearBtn.classList.remove('confirm-state');
                clearBtn.textContent = '清空';
            };
            clearBtn.addEventListener('click', function () {
                if (item.labels.length === 0) return;
                if (clearBtn.classList.contains('confirm-state')) {
                    resetClearBtn();
                    console.log('[MGR-DEBUG] 清空标签: id=' + item.id);
                    item.labels = [];
                    updateLabelsOnServer(item.id, item.labels);
                } else {
                    clearBtn.classList.add('confirm-state');
                    clearBtn.textContent = '确认';
                    clearBtn._confirmTimer = setTimeout(resetClearBtn, 3000);
                }
            });
            var saveBtn = document.createElement('button');
            saveBtn.className = 'btn btn-primary btn-sm';
            saveBtn.textContent = '保存';
            saveBtn.addEventListener('click', function () {
                updateLabelsOnServer(item.id, item.labels);
            });
            tdActions.appendChild(clearBtn);
            tdActions.appendChild(saveBtn);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });

        /* 恢复聚焦 */
        if (focusAfterRenderId !== null) {
            var targetRow = tbody.querySelector('tr[data-id="' + focusAfterRenderId + '"]');
            if (targetRow) {
                var targetInput = targetRow.querySelector('.add-label-input');
                if (targetInput) targetInput.focus();
            }
            focusAfterRenderId = null;
        }
    }

    function createLabelChip(mediaId, label, idx) {
        var chip = document.createElement('span');
        chip.className = 'label-chip';
        var text = document.createElement('span');
        text.textContent = label;
        chip.appendChild(text);
        var remove = document.createElement('span');
        remove.className = 'remove-label';
        remove.textContent = '\u00d7';
        remove.title = '移除';
        remove.addEventListener('click', function (e) {
            e.stopPropagation();
            var item = labelsCache.find(function (d) { return d.id === mediaId; });
            if (item) {
                console.log('[MGR-DEBUG] 移除标签: id=' + mediaId + ' label=' + label);
                item.labels.splice(idx, 1);
                updateLabelsOnServer(item.id, item.labels);
            }
        });
        chip.appendChild(remove);
        return chip;
    }

    function addLabelFromInput(input, item) {
        var val = input.value.replace(/[,，\s]/g, '').trim();
        if (!val || item.labels.indexOf(val) !== -1) {
            input.value = '';
            return;
        }
        if (val.length > CFG.LABEL_MAX_LENGTH) {
            console.warn('[MGR-DEBUG] 标签添加失败: 长度超限(' + val.length + '>' + CFG.LABEL_MAX_LENGTH + ')');
            showToast('标签长度不能超过' + CFG.LABEL_MAX_LENGTH + '个字符', 'error');
            input.value = '';
            return;
        }
        if (item.labels.length >= CFG.LABEL_MAX_COUNT) {
            console.warn('[MGR-DEBUG] 标签添加失败: 数量达上限(' + item.labels.length + '>=' + CFG.LABEL_MAX_COUNT + ')');
            showToast('标签数量已达上限（' + CFG.LABEL_MAX_COUNT + '个）', 'error');
            input.value = '';
            return;
        }
        console.log('[MGR-DEBUG] 添加标签: id=' + item.id + ' label=' + val);
        focusAfterRenderId = item.id;
        item.labels.push(val);
        updateLabelsOnServer(item.id, item.labels);
        input.value = '';
    }

    function updateLabelsOnServer(mediaId, labels, skipRender) {
        var ch = currentChannel;
        if (!ch) return;
        var relPath = ch.dbPath ? ch.dbPath.replace(/^sqlitedb\//, '') + ch.dbName : ch.dbName;
        console.log('[MGR-DEBUG] 更新标签到服务端: id=' + mediaId + ' labels=' + JSON.stringify(labels) + ' skipRender=' + !!skipRender);
        dbg('用户操作', '更新标签', { id: mediaId, labels: labels, relPath: relPath, skipRender: !!skipRender });
        apiRequest('label_update.php', {
            method: 'POST',
            body: JSON.stringify({ dbPath: relPath, id: mediaId, labels: labels })
        }).then(function (data) {
            console.log('[MGR-DEBUG] 标签更新成功: id=' + mediaId);
            if (!skipRender) showToast('ID ' + mediaId + ' 标签已更新', 'success');
            var item = labelsCache.find(function (d) { return d.id === mediaId; });
            if (item) item.labels = data.data.labels;
            if (!skipRender) {
                renderLabelTable();
                renderStatsTable();
            }
        }).catch(function (err) {
            console.error('[MGR-DEBUG] 标签更新失败: id=' + mediaId + ' - ' + err.message);
            showToast(err.message || '更新失败', 'error');
        });
    }

    /* ============================================================
       浮动表头
       ============================================================ */

    var floatingHeaderEl = null;
    var floatingRowEl = null;
    var floatingScrollHandler = null;
    var floatingActive = false;
    var floatingTableEl = null;

    function setupFloatingHeader() {
        floatingHeaderEl = document.getElementById('floatingHeader');
        floatingRowEl = document.getElementById('floatingRow');
    }

    /* 预构建浮动表头副本 */
    function buildFloatingHeader(tableEl) {
        disconnectFloatingHeader();
        if (!floatingRowEl || !tableEl) return;
        floatingTableEl = tableEl;
        var ths = tableEl.querySelectorAll('thead th');
        floatingRowEl.innerHTML = '';
        ths.forEach(function (th) {
            var clone = document.createElement('th');
            clone.textContent = th.textContent;
            clone.style.width = th.offsetWidth + 'px';
            floatingRowEl.appendChild(clone);
        });
        var ft = document.getElementById('floatingTable');
        if (ft) ft.style.width = tableEl.offsetWidth + 'px';

        /* 动态对齐：与表格左右边界一致 */
        function alignFloating() {
            var rect = tableEl.getBoundingClientRect();
            floatingHeaderEl.style.left = rect.left + 'px';
            floatingHeaderEl.style.width = rect.width + 'px';
        }

        floatingScrollHandler = function () {
            var rect = tableEl.getBoundingClientRect();
            if (rect.top <= 0 && !floatingActive) {
                alignFloating();
                floatingHeaderEl.classList.add('visible');
                floatingActive = true;
            } else if (rect.top > 0 && floatingActive) {
                floatingHeaderEl.classList.remove('visible');
                floatingActive = false;
            }
            if (floatingActive) alignFloating();
        };
        window.addEventListener('scroll', floatingScrollHandler, { passive: true });
        window.addEventListener('resize', floatingScrollHandler, { passive: true });
    }

    function disconnectFloatingHeader() {
        if (floatingScrollHandler) {
            window.removeEventListener('scroll', floatingScrollHandler);
            window.removeEventListener('resize', floatingScrollHandler);
            floatingScrollHandler = null;
        }
        floatingActive = false;
        floatingTableEl = null;
        if (floatingHeaderEl) {
            floatingHeaderEl.classList.remove('visible');
            floatingHeaderEl.style.left = '';
            floatingHeaderEl.style.width = '';
        }
    }

    /* ============================================================
       回到顶部按钮
       ============================================================ */

    function setupBackToTop() {
        var btn = document.getElementById('backToTop');
        if (!btn) return;

        window.addEventListener('scroll', function () {
            if (window.scrollY > 300) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }, { passive: true });

        btn.addEventListener('click', function () {
            location.hash = '#top';
            history.replaceState(null, '', location.pathname + location.search);
        });
    }

    /* ============================================================
       事件绑定
       ============================================================ */

    function bindEvents() {
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        document.getElementById('refreshChannelsBtn').addEventListener('click', function () {
            console.log('[MGR-DEBUG] 刷新频道列表');
            loadChannels();
        });
        document.getElementById('backToChannelsBtn').addEventListener('click', function () {
            console.log('[MGR-DEBUG] 返回频道列表');
            clearWorkspace();
            currentChannel = null;
            showChannelPanel();
        });
        document.getElementById('loadRangeBtn').addEventListener('click', function () {
            var min = parseInt(document.getElementById('rangeMin').value) || 1;
            var max = parseInt(document.getElementById('rangeMax').value) || 100;
            if (min < 1) min = 1;
            if (max < min) max = min;
            console.log('[MGR-DEBUG] 加载ID范围: ' + min + '-' + max);
            currentRangeMin = min;
            currentRangeMax = max;
            loadChannelData();
        });

        document.querySelectorAll('.detail-tab').forEach(function (el) {
            el.addEventListener('click', function () {
                switchTab(el.dataset.tab);
            });
        });

        /* 来源切换 */
        document.querySelectorAll('.source-tab').forEach(function (el) {
            el.addEventListener('click', function () {
                sourceType = el.dataset.source;
                console.log('[MGR-DEBUG] 数据来源切换: ' + sourceType);
                localStorage.setItem(CFG.SOURCE_KEY, sourceType);
                initSourceUI();
                loadChannels();
            });
        });

        /* 点击确认按钮之外的区域，立即重置所有确认状态 */
        document.addEventListener('click', function (e) {
            document.querySelectorAll('.confirm-state').forEach(function (el) {
                if (!el.contains(e.target)) {
                    clearTimeout(el._confirmTimer);
                    el._confirmTimer = null;
                    el.classList.remove('confirm-state');
                    if (el.classList.contains('label-action-clear')) {
                        el.textContent = '清空';
                    }
                }
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggleDebugPanel();
            }
        });
    }

    /* ============================================================
       初始化
       ============================================================ */

    function init() {
        console.log('[MGR-DEBUG] ========== 管理端初始化开始 ==========');
        initDebugPanel();
        setupFloatingHeader();
        setupBackToTop();
        dbg('系统初化', '管理端启动', { debug: DEBUG, source: sourceType });
        console.log('[MGR-DEBUG] 配置: debug=' + DEBUG + ' sourceType=' + sourceType);

        var token = localStorage.getItem(CFG.TOKEN_KEY);
        if (token) {
            console.log('[MGR-DEBUG] 发现已保存Token，验证中...');
            loadUserInfo();
        } else {
            console.log('[MGR-DEBUG] 无Token，显示登录面板');
            showPanel('authPanel');
        }
        bindEvents();
        console.log('[MGR-DEBUG] ========== 管理端初始化完成 ==========');
    }

    if (document.readyState === 'loading') {
        console.log('[MGR-DEBUG] DOM尚未加载完成，等待DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', function () {
            console.log('[MGR-DEBUG] DOMContentLoaded触发');
            init();
        });
    } else {
        console.log('[MGR-DEBUG] DOM已就绪，直接初始化');
        init();
    }
})();
