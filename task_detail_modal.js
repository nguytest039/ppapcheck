    'use strict';

    const g = window;
    const TaskDetailModal = {};
    const config = {
        modalId: 'taskDetailModal',
        statusSelectIds: ['modal-sl-status', 'sl-status'],
        prioritySelectIds: ['modal-sl-priority', 'sl-priority'],
        stageSelectId: 'sl-xvt',
        typeSelectId: 'sl-type',
        driSelectId: 'dri',
        deadlineInputId: 'deadLine',
        uploadButtonId: 'upload',
        commentButtonId: 'comment',
        commentInputId: 'input-comment',
        helpers: {},
        selectCache: null,
        onBeforeOpen: null,
        onAfterOpen: null,
        onTaskUpdated: null,
        onWorkflowUpdated: null,
    };
    let usersCache = [];

    function getHelper(name) {
        const helpers = config.helpers || {};
        const fn = helpers[name];
        return typeof fn === 'function' ? fn : null;
    }

    function getSelectCache() {
        if (config.selectCache) return config.selectCache;
        const helpers = config.helpers || {};
        return helpers.selectCache || null;
    }

    function getModalRoot() {
        return document.getElementById(config.modalId);
    }

    function getDateFormatter() {
        if (g.DateFormatter && typeof g.DateFormatter.toAPIFormat === 'function') {
            return g.DateFormatter;
        }
        return {
            toAPIFormat(dateStr) {
                if (!dateStr || dateStr === '-' || String(dateStr).toUpperCase() === 'N/A') return null;
                const str = String(dateStr).trim();
                if (g.moment) {
                    const m = g.moment(
                        str,
                        [
                            'YYYY/MM/DD',
                            'YYYY-MM-DD',
                            'YYYY/MM/DD HH:mm',
                            'YYYY-MM-DD HH:mm',
                            'YYYY/MM/DD HH:mm:ss',
                            'YYYY-MM-DD HH:mm:ss',
                        ],
                        true
                    );
                    if (m && typeof m.isValid === 'function' && m.isValid()) {
                        return m.format('YYYY/MM/DD HH:mm:ss');
                    }
                }
                const parts = str.split(' ');
                let datePart = parts[0] || '';
                let timePart = parts[1] || '00:00:00';
                datePart = datePart.substring(0, 10).replace(/-/g, '/');
                const tPieces = timePart.split(':');
                if (tPieces.length === 1) timePart = `${tPieces[0] || '00'}:00:00`;
                else if (tPieces.length === 2) timePart = `${tPieces[0] || '00'}:${tPieces[1] || '00'}:00`;
                else timePart = `${tPieces[0] || '00'}:${tPieces[1] || '00'}:${tPieces[2] || '00'}`;
                return `${datePart} ${timePart}`;
            },
            toDisplayFormat(dateStr) {
                return this.toAPIFormat(dateStr) || '-';
            },
        };
    }

    function escapeHtml(input) {
        if (input === null || input === undefined) return '';
        return String(input)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatCommentContent(rawContent) {
        const helper = getHelper('formatCommentContent');
        if (helper) {
            return helper(rawContent);
        }
        const safe = escapeHtml(rawContent || '');
        return safe.replace(/(^|\s)@([A-Za-z0-9._-]+)/g, (match, prefix, handle) => {
            return `${prefix}<span class="comment-mention">@${handle}</span>`;
        });
    }

    async function fetchUsers() {
        try {
            const res = await fetch('/ppap-system/api/users');
            if (!res.ok) {
                throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
            }
            const json = await res.json();
            return json.result || json.data || [];
        } catch (error) {
            return [];
        }
    }

    async function ensureUsersCache() {
        if (usersCache.length > 0) return usersCache;
        usersCache = await fetchUsers();
        return usersCache;
    }

    function getUserLabelById(idCard) {
        const helper = getHelper('getUserLabelById');
        if (helper) {
            return helper(idCard);
        }
        if (!idCard) return '';
        const normalized = String(idCard).trim();
        const found = usersCache.find((user) => String(user.idCard || '').trim() === normalized);
        if (found) {
            const displayName = String(found.displayName || '').trim();
            return displayName ? `${normalized} - ${displayName}` : normalized;
        }
        return normalized;
    }

    function getStatusLabel(status) {
        const helper = getHelper('getStatusLabel');
        return helper ? helper(status) : String(status || 'N/A');
    }
    function getStatusBadgeClass(status) {
        const helper = getHelper('getStatusBadgeClass');
        return helper ? helper(status) : 'status-na';
    }
    function getPriorityLabel(priority) {
        const helper = getHelper('getPriorityLabel');
        return helper ? helper(priority) : String(priority || 'MEDIUM');
    }
    function getPriorityBadgeClass(priority) {
        const helper = getHelper('getPriorityBadgeClass');
        return helper ? helper(priority) : 'priority-medium';
    }

    function getSelectByIds(modalRoot, ids) {
        if (!modalRoot) return null;
        for (let i = 0; i < ids.length; i++) {
            const el = modalRoot.querySelector(`#${ids[i]}`);
            if (el) return el;
        }
        return null;
    }

    function getFollowButton(modalRoot) {
        if (!modalRoot) return null;
        return modalRoot.querySelector('.follow-btn');
    }

    function setFollowButtonState(btn, isFollowing) {
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (icon) icon.className = isFollowing ? 'bi bi-star-fill' : 'bi bi-star';
        btn.classList.toggle('is-following', !!isFollowing);
        btn.dataset.following = isFollowing ? '1' : '0';

        const labelSpan = btn.querySelector('span:last-child');
        if (labelSpan) {
            const followLabel = (btn.dataset.followLabel || labelSpan.textContent || 'Follow').trim();
            if (!btn.dataset.followLabel) btn.dataset.followLabel = followLabel;
            if (!btn.dataset.unfollowLabel) btn.dataset.unfollowLabel = 'Unfollow';
            labelSpan.textContent = isFollowing ? btn.dataset.unfollowLabel : btn.dataset.followLabel;
        }
    }

    async function fetchFollowStatus(taskId) {
        if (!taskId) return null;
        try {
            const res = await fetch(`/ppap-system/api/tasks/${encodeURIComponent(taskId)}/follower`);
            if (!res.ok) return null;
            const json = await res.json();
            const value = json.result !== undefined ? json.result : json.data;
            if (typeof value === 'boolean') return value;
            if (value === 1 || value === '1') return true;
            if (value === 0 || value === '0') return false;
            return Boolean(value);
        } catch (e) {
            console.warn('fetchFollowStatus failed', e);
            return null;
        }
    }

    async function syncFollowButtonState(taskId, modalRoot) {
        const btn = getFollowButton(modalRoot || getModalRoot());
        if (!btn) return;
        const isFollowing = await fetchFollowStatus(taskId);
        if (isFollowing === null) return;
        setFollowButtonState(btn, isFollowing);
    }

    async function toggleFollow() {
        const modalRoot = getModalRoot();
        const taskId = modalRoot ? modalRoot.dataset.taskId : null;
        if (!taskId) return;

        const btn = getFollowButton(modalRoot);
        const isFollowing = btn ? btn.classList.contains('is-following') : false;
        const action = isFollowing ? 'unfollow' : 'follow';

        if (btn) btn.disabled = true;

        try {
            const res = await fetch(`/ppap-system/api/tasks/${encodeURIComponent(taskId)}/${action}`, {method: 'POST'});
            if (!res.ok) {
                const message = await getApiErrorMessage(res, `${action} API returned ${res.status}`);
                showAlertError('Failed', message);
                return;
            }

            setFollowButtonState(btn, !isFollowing);
            showAlertSuccess('Success', isFollowing ? 'Task unfollowed' : 'Task followed');
        } catch (e) {
            console.error('toggleFollow error', e);
            showAlertError('Failed', 'Failed to update follow status');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function showAlertSuccess(title, text) {
        if (g.Swal) {
            Swal.fire({title: title, text: text, icon: 'success', customClass: 'swal-success', buttonsStyling: true});
            return;
        }
        alert(`${title}: ${text}`);
    }

    function showAlertError(title, text) {
        if (g.Swal) {
            Swal.fire({title: title, text: text, icon: 'error', customClass: 'swal-error', buttonsStyling: true});
            return;
        }
        alert(`${title}: ${text}`);
    }

    function showAlertWarning(title, text) {
        if (g.Swal) {
            Swal.fire({title: title, text: text, icon: 'warning', customClass: 'swal-warning', buttonsStyling: true});
            return;
        }
        alert(`${title}: ${text}`);
    }

    function extractApiMessage(payload) {
        if (!payload) return '';
        if (typeof payload === 'string') return payload.trim();

        const pick = (value) => (typeof value === 'string' && value.trim() ? value.trim() : '');
        const direct = pick(payload.message) || pick(payload.error) || pick(payload.errorMessage) || pick(payload.msg) || pick(payload.detail);
        if (direct) return direct;

        if (payload.result && typeof payload.result === 'object') {
            const nested = pick(payload.result.message) || pick(payload.result.error) || pick(payload.result.errorMessage) || pick(payload.result.msg);
            if (nested) return nested;
        }

        if (payload.data && typeof payload.data === 'object') {
            const nested = pick(payload.data.message) || pick(payload.data.error) || pick(payload.data.errorMessage) || pick(payload.data.msg);
            if (nested) return nested;
        }

        if (Array.isArray(payload.errors)) {
            const parts = payload.errors.map((item) => {
                if (typeof item === 'string') return item.trim();
                if (item && typeof item === 'object') return pick(item.message) || pick(item.error) || pick(item.msg);
                return '';
            }).filter(Boolean);
            if (parts.length) return parts.join(', ');
        }

        if (payload.errors && typeof payload.errors === 'object') {
            const parts = Object.values(payload.errors).map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
            if (parts.length) return parts.join(', ');
        }

        return '';
    }

    async function getApiErrorMessage(res, fallback) {
        const fallbackMsg = fallback || (res && res.status ? `Request failed (${res.status})` : 'Request failed');
        if (!res) return fallbackMsg;
        try {
            const contentType = res.headers && res.headers.get ? res.headers.get('content-type') || '' : '';
            if (contentType.includes('application/json')) {
                const json = await res.json();
                const message = extractApiMessage(json);
                return message || fallbackMsg;
            }
            const text = await res.text();
            if (text && text.trim()) return text.trim();
        } catch (e) {}
        return fallbackMsg;
    }

    async function handleTaskFileUpload() {
        const modal = getModalRoot();
        if (!modal) return;

        const taskId = modal.dataset.taskId;
        if (!taskId || taskId === 'null') {
            return;
        }

        const oldInput = modal.querySelector('input[type="file"][data-task-upload]');
        if (oldInput) oldInput.remove();

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        fileInput.dataset.taskUpload = 'true';
        modal.appendChild(fileInput);

        fileInput.onchange = async function () {
            if (!fileInput.files || fileInput.files.length === 0) return;

            const formData = new FormData();
            formData.append('id', taskId);

            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('files', fileInput.files[i]);
            }

            try {
                const res = await fetch('/ppap-system/api/tasks/upload-files', {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) {
                    const message = await getApiErrorMessage(res, `Upload failed (${res.status})`);
                    if (g.Swal) {
                        Swal.fire({
                            title: 'Failed',
                            text: message,
                            icon: 'error',
                            background: 'var(--alert)',
                            color: 'white',
                            confirmButtonColor: '#3949ab',
                            confirmButtonText: 'OK',
                            customClass: {
                                confirmButton: 'text-white',
                            },
                        });
                    } else {
                        showAlertError('Failed', message);
                    }
                    return;
                }

                showAlertSuccess('Success', 'Success!');

                try {
                    await fetchAndRenderAttachments(taskId);
                } catch (e) {}
            } catch (e) {
                showAlertError('Failed', 'Failed to upload file');
            }
        };

        fileInput.click();
    }

    async function handleTaskComment() {
        const modal = getModalRoot();
        if (!modal) return;

        const taskId = modal.dataset.taskId;
        if (!taskId || taskId === 'null') {
            return;
        }

        const input = document.getElementById(config.commentInputId);
        const comment = input ? (input.value || '').trim() : '';
        if (!comment) {
            showAlertWarning('Warning', 'Please enter a comment');
            return;
        }

        try {
            const params = new URLSearchParams();
            params.append('comment', comment);

            const res = await fetch(`/ppap-system/api/tasks/${taskId}/comment`, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: params.toString(),
            });

            if (!res.ok) {
                const message = await getApiErrorMessage(res, `Failed: (${res.status})`);
                showAlertError('Failed', message);
                return;
            }

            showAlertSuccess('Success', 'Comment sent');
            if (input) input.value = '';

            try {
                await getComments(taskId);
            } catch (e) {}
        } catch (e) {
            showAlertError('Error', 'Error sending comment: ' + e.message);
        }
    }

    async function getComments(id) {
        try {
            const container = document.getElementById('comment-container');
            if (!container) return;

            container.innerHTML = '<div class="comment-loading">Loading comments...</div>';

            const res = await fetch(`/ppap-system/api/tasks/${id}/comments`);
            if (!res.ok) {
                container.innerHTML = '<div class="comment-empty">No comments</div>';
                return;
            }

            let json = null;
            try {
                json = await res.json();
            } catch (e) {
                json = null;
            }
            const items = json && Array.isArray(json.data) ? json.data : [];

            if (!items || items.length === 0) {
                container.innerHTML = '<div class="comment-empty">No comments</div>';
                return;
            }

            const html = items
                .map((it) => {
                    const author = it.createdBy || it.author || '-';
                    const date = it.createdAt || it.createAt || it.date || '-';
                    const content = it.content || it.cnContent || it.vnContent || '';
                    const type = it.type || 'COMMENT';
                    const safeAuthor = String(author);
                    const safeDate = String(date);
                    const safeContent = String(content);
                    const renderedContent = formatCommentContent(content);

                    if (type === 'LOG') {
                        return `
                        <div class="log-item m-0" style="display: flex; gap: 12px; margin-bottom:0; margin-left: 1rem;">
                            <div class="log-avatar" style="flex-shrink: 0;">
                                <div class="comment-avatar"><i class="bi bi-person"></i></div>
                            </div>
                            <div class="log-content" style="flex-grow: 1;">
                                <div class="log-line-1" style="font-size: 0.9rem; margin-bottom: 4px;">
                                    <span style="font-weight: 600; color: var(--text-primary);">${escapeHtml(
                                        safeAuthor
                                    )}</span>
                                    <span>${escapeHtml(safeContent)}</span>
                                </div>
                                <div class="log-line-2 comment-text" style="font-size: 0.85rem;">
                                    ${escapeHtml(safeDate)}
                                </div>
                            </div>
                        </div>
                        <hr class="comment-hr" />`;
                    }

                    return `
                <div class="comment-item p-0" style="display: flex; gap: 12px; background: transparent; border: none;">
                    <div class="comment-avatar" style="flex-shrink: 0;">
                        <div class="comment-avatar"><i class="bi bi-person"></i></div>
                    </div>
                    <div class="comment-content" style="flex-grow: 1;">
                        <div class="comment-meta" style="font-size: 0.9rem; margin-bottom: 6px;">
                            <span style="font-weight: 600; color: var(--text-primary);">${escapeHtml(safeAuthor)}</span>
                            <span style="margin: 0 6px; color: var(--text-secondary);">-</span>
                            <span style="color: var(--text-secondary);">${escapeHtml(safeDate)}</span>
                        </div>
                        <div class="comment-item" style="display: inline-block; background: var(--secondary-bg); padding: 0.65rem; border-radius: 8px; white-space: pre-wrap;">${renderedContent}</div>
                    </div>
                </div>
                <hr class="comment-hr" />`;
                })
                .join('');

            container.innerHTML = html;
        } catch (error) {
            console.error('Error getting comments: ' + (error && error.message ? error.message : error));
        }
    }

    function parseTaskUpdates(content) {
        const fieldMatches = content.matchAll(/\[(\w+):/g);
        const fields = Array.from(fieldMatches).map((m) => m[1]);

        const fieldLabels = {
            dri: 'DRI',
            dueDate: 'Deadline',
            status: 'Status',
            priority: 'Priority',
            stageId: 'Stage',
            processId: 'Process',
        };

        const translatedFields = fields.map((f) => fieldLabels[f] || f);
        return translatedFields.join(', ') || 'Task updated';
    }

    async function fetchAndRenderAttachments(taskId) {
        if (!taskId) return;
        try {
            const listEl = document.getElementById('attachments-list');
            if (!listEl) return;
            listEl.innerHTML = '<div class="loading">Loading attachments...</div>';

            const res = await fetch(`/ppap-system/api/tasks/${encodeURIComponent(taskId)}/documents`);
            if (!res.ok) {
                listEl.innerHTML = '<div class="text-muted">No attachments</div>';
                return;
            }

            const json = await res.json();
            const items = json && (json.data || json.result) ? json.data || json.result : [];
            if (!Array.isArray(items) || items.length === 0) {
                listEl.innerHTML = '<div class="text-muted">No attachments</div>';
                return;
            }

            const rows = items
                .map((it) => {
                    const url = it.url || it.downloadUrl || '';
                    const name = it.name || it.fileName || it.filename || String(it.id || '');
                    const safeName = escapeHtml(name);
                    const safeUrl = escapeHtml(url);
                    return `
                <div class="attachment-item">
                    <div class="attachment-info">
                        <span class="attachment-icon"><i class="bi bi-file-earmark"></i></span>
                        <span class="attachment-name">${safeName}</span>
                    </div>
                    <button type="button" class="download-btn" data-url="${safeUrl}" data-filename="${safeName}">
                        <span><i class="bi bi-download"></i> Download</span>
                    </button>
                </div>`;
                })
                .join('');

            listEl.innerHTML = rows;

            listEl.querySelectorAll('.download-btn').forEach((btn) => {
                btn.addEventListener('click', function () {
                    const url = this.dataset.url;
                    const filename = this.dataset.filename;
                    if (!url) return;

                    try {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename || 'download';
                        a.style.display = 'none';
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => {
                            document.body.removeChild(a);
                        }, 100);
                    } catch (e) {
                        try {
                            g.open(url, '_blank');
                        } catch (err) {}
                    }
                });
            });
        } catch (e) {
            console.warn('Failed to load attachments for task', taskId, e);
        }
    }

    async function fetchAndRenderSignFlow(taskId) {
        if (!taskId) return [];
        const tbody = document.getElementById('sign-flow-body');
        if (!tbody) return [];

        const signFlowI18n = g.SIGN_FLOW_I18N || {};
        const noDataText = signFlowI18n.noData || 'No data';
        const loadingText = signFlowI18n.loading || 'Loading...';

        const setMessage = (msg) => {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${msg}</td></tr>`;
        };

        setMessage(loadingText);

        try {
            const items = await fetchSignFlowItems(taskId);
            if (!items.length) {
                setMessage(noDataText);
                return items;
            }

            const statusClassMap = {
                SIGNED: 'text-success',
                WAITING_SIGN: 'text-warning',
                RETURNED: 'text-danger',
            };
            const statusTextMap = {
                SIGNED: signFlowI18n.signed || 'signed',
                WAITING_SIGN: signFlowI18n.waiting || 'waiting',
                RETURNED: signFlowI18n.returned || 'returned',
            };

            tbody.innerHTML = items
                .map((item, idx) => {
                    const statusKey = String(item.status || '').toUpperCase();
                    const statusClass = statusClassMap[statusKey] || 'text-muted';
                    const statusText = statusTextMap[statusKey] || statusKey || '-';
                    const signTimeRaw =
                        item.signedAt || item.signed_at || item.createdAt || item.created_at || '';
                    const signTime = signTimeRaw
                        ? getDateFormatter().toAPIFormat(signTimeRaw) || signTimeRaw
                        : '-';
                    const candidate = escapeHtml(getSignCandidateId(item) || '');
                    const name = escapeHtml(getSignCandidateName(item) || '');
                    const title = escapeHtml(item.title || '');
                    return `<tr>
                    <td>${idx + 1}</td>
                    <td>${candidate || '-'}</td>
                    <td>${name || '-'}</td>
                    <td>${title || '-'}</td>
                    <td>${escapeHtml(signTime || '-')}</td>
                    <td class="${statusClass}">${escapeHtml(statusText)}</td>
                </tr>`;
                })
                .join('');
            return items;
        } catch (e) {
            console.warn('Failed to load sign flow for task', taskId, e);
            setMessage('Failed to load sign flow');
            return [];
        }
    }

    let currentTaskDetailObj = null;
    let CURRENT_USER_IDCARD = null;
    let CURRENT_USER_IDCARD_LOADED = false;

    async function fetchCurrentUserIdCard() {
        if (CURRENT_USER_IDCARD_LOADED) return CURRENT_USER_IDCARD;
        CURRENT_USER_IDCARD_LOADED = true;
        try {
            const res = await fetch('/ppap-system/api/users/get-profile');
            if (!res.ok) return null;
            const json = await res.json();
            const profile = json && (json.data || json.result) ? json.data || json.result : null;
            const idCard =
                profile && profile.idCard !== undefined && profile.idCard !== null ? String(profile.idCard).trim() : '';
            CURRENT_USER_IDCARD = idCard || null;
            return CURRENT_USER_IDCARD;
        } catch (e) {
            return null;
        }
    }

    function setTaskDetailSignPermission(modalRoot, canSign) {
        if (!modalRoot) return;
        modalRoot.dataset.canSign = canSign ? '1' : '0';
    }

    function getSignCandidateId(item) {
        if (!item) return '';
        if (item.candidate && typeof item.candidate === 'object') {
            return String(item.candidate.idCard || item.candidate.id || item.candidate.value || '').trim();
        }
        const raw =
            item.candidate ||
            item.candidateId ||
            item.idCard ||
            item.userId ||
            item.user_id ||
            item.applicant ||
            '';
        return String(raw || '').trim();
    }

    function getSignCandidateName(item) {
        if (!item) return '';
        if (item.candidate && typeof item.candidate === 'object') {
            return String(
                item.candidate.name ||
                    item.candidate.fullName ||
                    item.candidate.displayName ||
                    item.candidate.label ||
                    ''
            ).trim();
        }
        return String(
            item.candidateName || item.name || item.fullName || item.displayName || item.label || ''
        ).trim();
    }

    async function fetchSignFlowItems(taskId) {
        if (!taskId) return [];
        const res = await fetch(`/ppap-system/api/tasks/${encodeURIComponent(taskId)}/sign-flow`);
        if (!res.ok) return [];
        const json = await res.json();
        const list =
            json && (json.data || json.result || json.items || json.list || json)
                ? json.data || json.result || json.items || json.list || json
                : [];
        return Array.isArray(list) ? list : [];
    }

    async function refreshTaskDetailSignPermission(modalRoot, signFlowItems) {
        if (!modalRoot) return false;
        const taskId = modalRoot.dataset.taskId;
        if (!taskId) {
            setTaskDetailSignPermission(modalRoot, false);
            return false;
        }

        const items = Array.isArray(signFlowItems) ? signFlowItems : await fetchSignFlowItems(taskId);
        const idCard = await fetchCurrentUserIdCard();

        let canSign = false;
        if (idCard && Array.isArray(items)) {
            const normalizedId = String(idCard).trim();
                canSign = items.some((item) => {
                    if (!item) return false;
                    const candidate = getSignCandidateId(item);
                    if (!candidate) return false;
                    return String(candidate).trim() === normalizedId;
                });
            }

        setTaskDetailSignPermission(modalRoot, canSign);
        updateTaskDetailFooterButtons(modalRoot, getTaskDetailStatusValue(modalRoot));
        return canSign;
    }

    function getTaskDetailStatusValue(modalRoot) {
        if (!modalRoot) return null;
        const sel = modalRoot.querySelector('#sl-status') || modalRoot.querySelector('#modal-sl-status');
        return sel ? sel.value : null;
    }

    function normalizeStatusValue(statusVal) {
        const normalizeHelper = getHelper('normalizeStatus');
        if (normalizeHelper) return normalizeHelper(statusVal);
        if (statusVal === null || statusVal === undefined) return '';
        return String(statusVal).trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
    }

    function isInProgressStatus(statusVal) {
        const normalized = normalizeStatusValue(statusVal);
        if (!normalized) return false;
        return normalized === 'IN_PROGRESS' || normalized === 'IN_PROCESS' || normalized === 'ON_GOING';
    }

    function isWaitingForApprovalStatus(statusVal) {
        const normalized = normalizeStatusValue(statusVal);
        if (!normalized) return false;
        if (normalized === 'WAITING_FOR_APPROVAL' || normalized === 'WAITING_SIGN' || normalized === 'WAITING')
            return true;
        return normalized.includes('WAITING') && (normalized.includes('APPROVAL') || normalized.includes('SIGN'));
    }

    function isCompletedStatus(statusVal) {
        const normalized = normalizeStatusValue(statusVal);
        return normalized === 'COMPLETED' || normalized === 'CLOSED';
    }

    function updateTaskDetailFooterButtons(modalRoot, statusVal) {
        if (!modalRoot) return;

        const btnSubmit = modalRoot.querySelector('.js-task-submit');
        const btnReject = modalRoot.querySelector('.js-task-reject');
        const btnApprove = modalRoot.querySelector('.js-task-approve');
        const btnSave = modalRoot.querySelector('.js-task-save');

        const waiting = isWaitingForApprovalStatus(statusVal);
        const inProgress = isInProgressStatus(statusVal);
        const completed = isCompletedStatus(statusVal);
        const canSign = modalRoot.dataset.canSign === '1';
        const showSignActions = waiting && canSign;

        if (btnSubmit) btnSubmit.classList.toggle('d-none', !inProgress);
        if (btnSave) btnSave.classList.toggle('d-none', waiting || completed);
        if (btnReject) btnReject.classList.toggle('d-none', !showSignActions);
        if (btnApprove) btnApprove.classList.toggle('d-none', !showSignActions);
    }

    async function fetchTaskById(taskId) {
        const res = await fetch(`/ppap-system/api/tasks/${encodeURIComponent(taskId)}`);
        if (!res.ok) throw new Error(`Failed to fetch task: ${res.status}`);
        const json = await res.json();
        return json.data || json.result || null;
    }

    async function initTaskDetailDriSelect2() {
        const driSelect = document.getElementById(config.driSelectId);
        const modalRoot = getModalRoot();
        if (!driSelect || !g.jQuery || typeof $.fn.select2 !== 'function') return;

        await ensureUsersCache();

        if ($(driSelect).data('select2')) {
            try {
                $(driSelect).select2('destroy');
            } catch (e) {}
        }

        driSelect.innerHTML = '<option value="">-- Select DRI --</option>';
        usersCache.forEach((user) => {
            const idCard = String(user.idCard || '').trim();
            const displayName = String(user.displayName || '').trim();
            const option = document.createElement('option');
            option.value = idCard;
            option.textContent = displayName ? `${idCard} - ${displayName}` : idCard;
            driSelect.appendChild(option);
        });

        const $select = $(driSelect);
        $select.select2({
            placeholder: 'Search DRI...',
            allowClear: true,
            width: '100%',
            language: {
                noResults: function (params) {
                    const term = params && params.term ? String(params.term).trim() : '';
                    if (!term) return 'No results found';
                    return `No results found; Press Enter to add ${term}`;
                },
            },
            dropdownParent: modalRoot ? $(modalRoot) : $select.parent(),
        });

        const updateNoResultsMessage = function (searchValue) {
            const term = searchValue ? String(searchValue).trim() : '';
            const messageEl = document.querySelector('.select2-container--open .select2-results__message');
            if (!messageEl) return;
            messageEl.textContent = term ? `No results found; Press Enter to add ${term}` : 'No results found';
        };

        $select.off('select2:open.taskDetailDri');
        $select.on('select2:open.taskDetailDri', function () {
            const searchField = document.querySelector('.select2-container--open .select2-search__field');
            if (!searchField) return;

            if (searchField._taskDetailDriEnterHandler) {
                searchField.removeEventListener('keydown', searchField._taskDetailDriEnterHandler);
            }
            if (searchField._taskDetailDriInputHandler) {
                searchField.removeEventListener('input', searchField._taskDetailDriInputHandler);
            }

            searchField._taskDetailDriEnterHandler = async function (ev) {
                if (ev.key !== 'Enter') return;
                const term = (searchField.value || '').trim();
                if (!term) return;

                const exists = usersCache.some((user) => String(user.idCard || '').trim() === term);
                if (exists) return;

                ev.preventDefault();

                try {
                    const res = await fetch(`/ppap-system/api/users/get-dri?idCard=${encodeURIComponent(term)}`);
                    if (!res.ok) return;

                    const json = await res.json();
                    const user = json.data || json.result || null;
                    if (!user) return;

                    usersCache.push(user);
                    await initTaskDetailDriSelect2();
                    $select.val(String(user.idCard || term).trim()).trigger('change.select2');
                    $select.select2('close');
                } catch (e) {}
            };

            searchField._taskDetailDriInputHandler = function () {
                updateNoResultsMessage(searchField.value || '');
            };

            searchField.addEventListener('keydown', searchField._taskDetailDriEnterHandler);
            searchField.addEventListener('input', searchField._taskDetailDriInputHandler);
            updateNoResultsMessage(searchField.value || '');
        });
    }

    function applyTaskToDetailModal(modalRoot, task) {
        if (!modalRoot || !task) return;

        try {
            modalRoot.dataset.taskId = String(task.id || modalRoot.dataset.taskId || '');
            if (task.projectId !== undefined && task.projectId !== null) {
                modalRoot.dataset.projectId = String(task.projectId);
            }
        } catch (e) {}
        setTaskDetailSignPermission(modalRoot, false);

        const setText = (selector, value) => {
            const el = modalRoot.querySelector(selector);
            if (el) el.textContent = value || '';
        };

        const normalizeHelper = getHelper('normalizeStatus');
        const normalizedStatus = normalizeHelper
            ? normalizeHelper(task.status)
            : String(task.status || '').toUpperCase();
        const isLocked = normalizedStatus === 'WAITING_FOR_APPROVAL' || normalizedStatus === 'COMPLETED';

        const taskNameEl = modalRoot.querySelector('.task-detail-name');
        if (taskNameEl) {
            taskNameEl.textContent = task.name || '';
            if (isLocked) {
                taskNameEl.style.cursor = '';
                taskNameEl.title = '';
                taskNameEl.onclick = null;
            } else {
                taskNameEl.style.cursor = 'pointer';
                taskNameEl.title = 'Click to edit';
                taskNameEl.onclick = function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    const currentValue = this.textContent;
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = currentValue;
                    input.className = 'task-name-edit-input';
                    input.style.cssText =
                        'width: 100%; font-size: inherit; font-weight: inherit; background: var(--secondary-bg); color: var(--text-primary); border: 1px solid var(--border-color); outline: none; padding: 4px 8px; border-radius: 4px;';

                    const saveEdit = () => {
                        this.textContent = input.value || currentValue;
                        this.style.display = '';
                        input.remove();
                    };

                    input.onblur = saveEdit;
                    input.onkeydown = (e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEdit();
                        }
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            this.textContent = currentValue;
                            this.style.display = '';
                            input.remove();
                        }
                    };

                    this.style.display = 'none';
                    this.parentNode.insertBefore(input, this.nextSibling);
                    input.focus();
                    input.select();
                };
            }
        }

        setText('.task-detail-id', task.taskCode || String(task.id || ''));

        const descEl = modalRoot.querySelector('.section-content');
        if (descEl) {
            descEl.textContent = task.description || '';
            if (isLocked) {
                descEl.style.cursor = '';
                descEl.title = '';
                descEl.onclick = null;
            } else {
                descEl.style.cursor = 'pointer';
                descEl.title = 'Click to edit';
                descEl.onclick = function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    const currentValue = this.textContent;
                    const textarea = document.createElement('textarea');
                    textarea.value = currentValue;
                    textarea.className = 'task-desc-edit-input';
                    textarea.style.cssText =
                        'width: 100%; min-height: 100px; font-size: inherit; background: var(--secondary-bg); color: var(--text-primary); border: 1px solid var(--border-color); outline: none; padding: 8px; border-radius: 4px; resize: vertical;';

                    let isRemoving = false;
                    const saveEdit = () => {
                        if (isRemoving) return;
                        isRemoving = true;
                        this.textContent = textarea.value || currentValue;
                        this.style.display = '';
                        if (textarea.parentNode) textarea.remove();
                    };

                    textarea.onblur = saveEdit;
                    textarea.onkeydown = (e) => {
                        e.stopPropagation();
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            if (!isRemoving) {
                                isRemoving = true;
                                this.textContent = currentValue;
                                this.style.display = '';
                                if (textarea.parentNode) textarea.remove();
                            }
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit();
                        }
                    };

                    this.style.display = 'none';
                    this.parentNode.insertBefore(textarea, this.nextSibling);
                    textarea.focus();
                };
            }
        }

        setText('.date-display', task.dueDate || task.deadline || '-');
        const assigneeEl = modalRoot.querySelector('.assignee-name');
        if (assigneeEl) {
            assigneeEl.textContent = getUserLabelById(task.dri) || task.dri || task.assignee || '-';
            ensureUsersCache()
                .then(() => {
                    const label = getUserLabelById(task.dri) || task.dri || task.assignee || '-';
                    if (assigneeEl.textContent !== label) {
                        assigneeEl.textContent = label;
                    }
                })
                .catch(() => {});
        }

        const statusBadge = modalRoot.querySelector('.task-status-badge');
        if (statusBadge) {
            statusBadge.textContent = getStatusLabel(task.status);
            statusBadge.className = `task-status-badge ${getStatusBadgeClass(task.status)}`;
        }

        const priorityBadge = modalRoot.querySelector('.priority-badge');
        if (priorityBadge) {
            priorityBadge.textContent = getPriorityLabel(task.priority);
            priorityBadge.className = `priority-badge ${getPriorityBadgeClass(task.priority)}`;
        }

        const statusSelect = getSelectByIds(modalRoot, config.statusSelectIds);
        if (statusSelect) {
            const val =
                task.status === null || task.status === undefined || String(task.status).trim() === ''
                    ? 'N/A'
                    : String(task.status);
            const hasOption = Array.from(statusSelect.options).some((o) => String(o.value) === val);
            if (!hasOption) {
                const opt = document.createElement('option');
                opt.value = val;
                opt.text = val;
                if (statusSelect.options.length > 0) statusSelect.add(opt, statusSelect.options[0]);
                else statusSelect.add(opt);
            }
            statusSelect.value = val;
        }

        const prioritySelect = getSelectByIds(modalRoot, config.prioritySelectIds);
        if (prioritySelect) {
            const val =
                task.priority === null || task.priority === undefined || String(task.priority).trim() === ''
                    ? 'N/A'
                    : String(task.priority);
            const hasOption = Array.from(prioritySelect.options).some((o) => String(o.value) === val);
            if (!hasOption) {
                const opt = document.createElement('option');
                opt.value = val;
                opt.text = val;
                if (prioritySelect.options.length > 0) prioritySelect.add(opt, prioritySelect.options[0]);
                else prioritySelect.add(opt);
            }
            prioritySelect.value = val;
        }

        const driSelect = document.getElementById(config.driSelectId);
        if (driSelect) {
            if (g.jQuery && typeof $.fn.select2 === 'function' && !$(driSelect).data('select2')) {
                initTaskDetailDriSelect2();
            }
            driSelect.value = task.dri || '';
            if (g.jQuery && $(driSelect).data('select2')) {
                $(driSelect)
                    .val(task.dri || '')
                    .trigger('change');
            }
        }

        const deadlineInput = document.getElementById(config.deadlineInputId);
        if (deadlineInput) {
            const normalized = task.dueDate
                ? getDateFormatter().toDisplayFormat(task.dueDate)
                : task.deadline
                ? getDateFormatter().toDisplayFormat(task.deadline)
                : '';
            deadlineInput.value = normalized;
            deadlineInput.dataset.initialValue = normalized;
        }

        try {
            currentTaskDetailObj = JSON.parse(JSON.stringify(task));
        } catch (e) {
            currentTaskDetailObj = task;
        }

        if (isLocked) {
            if (statusSelect) statusSelect.disabled = true;
            if (prioritySelect) prioritySelect.disabled = true;
            if (driSelect) {
                driSelect.disabled = true;
                if (g.jQuery && $(driSelect).data('select2')) {
                    $(driSelect).prop('disabled', true).trigger('change');
                }
            }
            if (deadlineInput) deadlineInput.disabled = true;

            const stageSelect = modalRoot.querySelector(`#${config.stageSelectId}`);
            if (stageSelect) stageSelect.disabled = true;

            const typeSelect = modalRoot.querySelector(`#${config.typeSelectId}`);
            if (typeSelect) typeSelect.disabled = true;

            const uploadBtn = document.getElementById(config.uploadButtonId);
            if (uploadBtn) uploadBtn.disabled = true;

            const saveBtn = modalRoot.querySelector('.js-task-save');
            if (saveBtn) saveBtn.disabled = true;
        } else {
            if (statusSelect) statusSelect.disabled = false;
            if (prioritySelect) prioritySelect.disabled = false;
            if (driSelect) {
                driSelect.disabled = false;
                if (g.jQuery && $(driSelect).data('select2')) {
                    $(driSelect).prop('disabled', false).trigger('change');
                }
            }
            if (deadlineInput) deadlineInput.disabled = false;

            const stageSelect = modalRoot.querySelector(`#${config.stageSelectId}`);
            if (stageSelect) stageSelect.disabled = false;

            const typeSelect = modalRoot.querySelector(`#${config.typeSelectId}`);
            if (typeSelect) typeSelect.disabled = false;

            const uploadBtn = document.getElementById(config.uploadButtonId);
            if (uploadBtn) uploadBtn.disabled = false;

            const saveBtn = modalRoot.querySelector('.js-task-save');
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    function wireTaskDetailWorkflowActions(modalRoot) {
        if (!modalRoot) return;
        if (modalRoot.dataset.workflowWired === '1') return;
        modalRoot.dataset.workflowWired = '1';

        const statusSelect = getSelectByIds(modalRoot, config.statusSelectIds);
        if (statusSelect) {
            statusSelect.addEventListener('change', function () {
                updateTaskDetailFooterButtons(modalRoot, this.value);
            });
        }

        const withDisabled = async (btn, fn) => {
            if (!btn) return fn();
            const prev = btn.disabled;
            btn.disabled = true;
            try {
                return await fn();
            } finally {
                btn.disabled = prev;
            }
        };

        const postAction = async (action, payload) => {
            const taskId = modalRoot.dataset.taskId;
            if (!taskId) {
                showAlertError('Error', 'Task ID is required');
                return;
            }

            try {
                if (typeof loader !== 'undefined' && loader && typeof loader.load === 'function') loader.load();
                const endpoint =
                    action === 'reject'
                        ? `/ppap-system/api/tasks/${encodeURIComponent(taskId)}/reject`
                        : `/ppap-system/api/tasks/${encodeURIComponent(taskId)}/${action}`;

                const fetchOptions = {
                    method: 'POST',
                };

                if (payload !== undefined) {
                    fetchOptions.headers = {
                        'Content-Type': 'application/json',
                    };
                    fetchOptions.body = JSON.stringify(payload);
                }

                const res = await fetch(endpoint, fetchOptions);
                if (!res.ok) {
                    const message = await getApiErrorMessage(res, `Failed to ${action} task (${res.status})`);
                    showAlertError('Failed', message);
                    return;
                }

                const updated = await fetchTaskById(taskId);
                if (updated) {
                    applyTaskToDetailModal(modalRoot, updated);
                    updateTaskDetailFooterButtons(modalRoot, updated.status);

                    try {
                        const signItems = await fetchAndRenderSignFlow(taskId);
                        await refreshTaskDetailSignPermission(modalRoot, signItems);
                    } catch (e) {}

                    try {
                        await getComments(taskId);
                    } catch (e) {}

                    const projectId = modalRoot.dataset.projectId;
                    const findProjectById = getHelper('findProjectById');
                    const getCurrentStageId = getHelper('getCurrentStageId');
                    const loadProjectTasksByStage = getHelper('loadProjectTasksByStage');
                    if (projectId && findProjectById && getCurrentStageId && loadProjectTasksByStage) {
                        const project = findProjectById(projectId);
                        if (project) {
                            const activeStageId = getCurrentStageId(projectId);
                            loadProjectTasksByStage(projectId, activeStageId, {skipLoader: true});
                        }
                    }
                }

                if (typeof config.onWorkflowUpdated === 'function') {
                    config.onWorkflowUpdated(updated, {taskId, modalRoot});
                }

                showAlertSuccess('Success', `Task ${action} successfully`);
            } catch (e) {
                console.error(`Task ${action} error`, e);
                showAlertError('Failed', `Failed to ${action} task`);
            } finally {
                if (typeof loader !== 'undefined' && loader && typeof loader.unload === 'function') loader.unload();
            }
        };

        const btnSubmit = modalRoot.querySelector('.js-task-submit');
        const btnReject = modalRoot.querySelector('.js-task-reject');
        const btnApprove = modalRoot.querySelector('.js-task-approve');

        if (btnSubmit) {
            btnSubmit.addEventListener('click', function () {
                return withDisabled(btnSubmit, async () => {
                    if (g.Swal) {
                        const result = await Swal.fire({
                            title: 'Submit task',
                            text: 'Are you sure you want to submit this task?',
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Submit',
                            cancelButtonText: 'Cancel',
                        });
                        if (!result.isConfirmed) return;
                    }
                    await postAction('submit');
                });
            });
        }

        if (btnReject) {
            btnReject.addEventListener('click', function () {
                return withDisabled(btnReject, async () => {
                    let reasonPayload;
                    if (g.Swal) {
                        const modal = document.querySelector('#taskDetailModal');
                        const result = await Swal.fire({
                            target: modal,
                            title: 'Reject task',
                            text: 'Are you sure you want to reject this task?',
                            icon: 'warning',
                            input: 'textarea',
                            inputPlaceholder: 'Enter reject reason',
                            inputAttributes: {
                                'aria-label': 'Rejection reason',
                                maxlength: '1000',
                            },
                            showCancelButton: true,
                            confirmButtonText: 'Reject',
                            cancelButtonText: 'Cancel',
                            focusConfirm: false,
                        });
                        if (!result.isConfirmed) return;
                        const reasonValue = result.value ? String(result.value).trim() : '';
                        if (reasonValue) {
                            reasonPayload = {reason: reasonValue};
                        }
                    }
                    await postAction('reject', reasonPayload);
                });
            });
        }

        if (btnApprove) {
            btnApprove.addEventListener('click', function () {
                return withDisabled(btnApprove, async () => {
                    if (g.Swal) {
                        const result = await Swal.fire({
                            title: 'Approve task',
                            text: 'Are you sure you want to approve this task?',
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Approve',
                            cancelButtonText: 'Cancel',
                        });
                        if (!result.isConfirmed) return;
                    }
                    await postAction('approve');
                });
            });
        }
    }

    async function loadTaskDetailStageOptions(projectId, currentStageId) {
        const modalRoot = getModalRoot();
        const stageSelect = modalRoot ? modalRoot.querySelector(`#${config.stageSelectId}`) : null;
        if (!stageSelect) return;

        let stages = [];
        const fetchStagesForProject = getHelper('fetchStagesForProject');
        const fetchOptions = getHelper('fetchOptions');
        if (projectId && fetchStagesForProject) {
            stages = await fetchStagesForProject(projectId);
        }
        if (!Array.isArray(stages) || stages.length === 0) {
            if (fetchOptions) {
                stages = await fetchOptions('/api/stages');
            }
        }
        if (!Array.isArray(stages) || stages.length === 0) {
            try {
                const url = projectId
                    ? `/ppap-system/api/stages?projectId=${encodeURIComponent(projectId)}`
                    : '/ppap-system/api/stages';
                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    stages = json.data || [];
                }
            } catch (e) {}
        }

        const normalizedStages = (stages || [])
            .map((item) => {
                if (item === null || item === undefined) return null;
                if (typeof item === 'string' || typeof item === 'number') {
                    return {id: item, name: String(item)};
                }
                const id = item.id ?? item.stageId ?? item.code ?? item.value;
                const name =
                    item.name ?? item.stageName ?? item.label ?? item.stage ?? item.code ?? item.value ?? id;
                if (id === null || id === undefined) return null;
                return {id, name: name !== undefined && name !== null ? String(name) : String(id)};
            })
            .filter((item) => item && item.id !== null && item.id !== undefined);

        const selectCache = getSelectCache();
        if (Array.isArray(normalizedStages) && selectCache) {
            selectCache['/api/stages'] = normalizedStages;
        }

        const renderOptions = getHelper('renderOptions');
        if (renderOptions) {
            renderOptions(config.stageSelectId, normalizedStages);
        } else {
            stageSelect.innerHTML = '<option value="">--Select--</option>';
            normalizedStages.forEach((s) => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name;
                stageSelect.appendChild(opt);
            });
        }

        if (currentStageId !== null && currentStageId !== undefined && currentStageId !== '') {
            const val = String(currentStageId);
            const hasOption = Array.from(stageSelect.options).some((o) => String(o.value) === val);
            if (!hasOption) {
                const opt = document.createElement('option');
                opt.value = val;
                const match = normalizedStages.find((s) => String(s.id) === val);
                const label = match ? match.name : null;
                const stageNameHelper = getHelper('getStageName');
                opt.textContent = label || (stageNameHelper ? stageNameHelper(currentStageId) || val : val);
                stageSelect.add(opt, stageSelect.options[0] || null);
            }
            stageSelect.value = val;
        }
    }

    function initDeadlinePicker() {
        try {
            const deadlineInput = document.getElementById(config.deadlineInputId);
            if (deadlineInput && g.jQuery && typeof $.fn.daterangepicker === 'function') {
                const initial = deadlineInput.dataset.initialValue || deadlineInput.value || '';
                const start =
                    initial && g.moment ? g.moment(initial.split(' ')[0], 'YYYY/MM/DD') : g.moment();

                $(deadlineInput).daterangepicker({
                    singleDatePicker: true,
                    startDate: start,
                    autoApply: false,
                    locale: {format: 'YYYY/MM/DD'},
                });
            }
        } catch (e) {
            console.warn('Failed to initialize deadline picker', e);
        }
    }

    async function openTaskDetail(taskId, projectId, options) {
        if (!taskId || taskId === 'null' || taskId === 'undefined') {
            showAlertWarning('Warning', 'Invalid task ID');
            return;
        }

        const modalRoot = getModalRoot();
        if (!modalRoot) {
            showAlertError('Error', 'Modal not found');
            return;
        }
        initTaskDetailModalBindings(modalRoot);

        try {
            if (typeof loader !== 'undefined' && loader && typeof loader.load === 'function') loader.load();

            let task = null;
            try {
                const res = await fetch(`/ppap-system/api/tasks/${taskId}`);
                if (res.ok) {
                    const json = await res.json();
                    task = json.data || json.result || null;
                }
            } catch (fetchErr) {}

            const findProjectById = getHelper('findProjectById');
            if (!task && findProjectById) {
                const project = findProjectById(projectId);
                if (project && Array.isArray(project.tasks)) {
                    task = project.tasks.find((t) => String(t.id) === String(taskId));
                }
            }

            if (!task) {
                showAlertError('Error', 'Task not found');
                return;
            }

            const resolvedProjectId =
                projectId || task.projectId || task.project_id || task.project_id_fk || null;

            try {
                modalRoot.dataset.projectId = String(resolvedProjectId || '');
                modalRoot.dataset.taskId = String(taskId || '');
                currentTaskDetailObj = JSON.parse(JSON.stringify(task));
            } catch (e) {}

            try {
                await syncFollowButtonState(taskId, modalRoot);
            } catch (e) {}

            if (options && typeof options.onBeforeOpen === 'function') {
                options.onBeforeOpen({taskId, projectId: resolvedProjectId, modalRoot, task});
            } else if (typeof config.onBeforeOpen === 'function') {
                config.onBeforeOpen({taskId, projectId: resolvedProjectId, modalRoot, task});
            }

            applyTaskToDetailModal(modalRoot, task);

            try {
                const statusSelect = getSelectByIds(modalRoot, config.statusSelectIds);
                if (statusSelect) {
                    try {
                        const statusRes = await fetch('/ppap-system/api/tasks/status?forUpdate=true');
                        if (statusRes.ok) {
                            const statusJson = await statusRes.json();
                            const statuses = statusJson.data || [];
                            statusSelect.innerHTML = '<option value="">--Select--</option>';
                            statuses.forEach((s) => {
                                const opt = document.createElement('option');
                                if (typeof s === 'string' || typeof s === 'number') {
                                    opt.value = s;
                                    opt.textContent = s;
                                } else if (s && s.id && s.name) {
                                    opt.value = s.id;
                                    opt.textContent = s.name;
                                } else if (s && s.name) {
                                    opt.value = s.name;
                                    opt.textContent = s.name;
                                }
                                statusSelect.appendChild(opt);
                            });
                        }
                    } catch (e) {}
                }

                const prioritySelect = getSelectByIds(modalRoot, config.prioritySelectIds);
                if (prioritySelect) {
                    const selectCache = getSelectCache();
                    let priorities = selectCache ? selectCache['/api/tasks/priorities'] : null;
                    if (!Array.isArray(priorities) || priorities.length === 0) {
                        try {
                            const priRes = await fetch('/ppap-system/api/tasks/priorities');
                            if (priRes.ok) {
                                const priJson = await priRes.json();
                                priorities = priJson.data || priJson.result || [];
                                if (selectCache) selectCache['/api/tasks/priorities'] = priorities;
                            }
                        } catch (e) {}
                    }
                    if (Array.isArray(priorities)) {
                        prioritySelect.innerHTML = '<option value="">--Select--</option>';
                        priorities.forEach((p) => {
                            const opt = document.createElement('option');
                            opt.value = p.id || p;
                            opt.textContent = p.name || p;
                            prioritySelect.appendChild(opt);
                        });
                    }
                }

                const stageId = task.stageId || (task.stage && task.stage.id) || null;
                await loadTaskDetailStageOptions(resolvedProjectId, stageId);

                const typeSelect = modalRoot.querySelector(`#${config.typeSelectId}`);
                if (typeSelect) {
                    const selectCache = getSelectCache();
                    let processes = selectCache ? selectCache['/api/processes'] : null;
                    if (!Array.isArray(processes) || processes.length === 0) {
                        try {
                            const procRes = await fetch('/ppap-system/api/processes');
                            if (procRes.ok) {
                                const procJson = await procRes.json();
                                processes = procJson.data || procJson.result || [];
                                if (selectCache) selectCache['/api/processes'] = processes;
                            }
                        } catch (e) {}
                    }
                    if (Array.isArray(processes)) {
                        typeSelect.innerHTML = '<option value="">--Select--</option>';
                        processes.forEach((proc) => {
                            const opt = document.createElement('option');
                            opt.value = proc.id || proc;
                            opt.textContent = proc.name || proc;
                            typeSelect.appendChild(opt);
                        });
                        const processId = task.processId || (task.process && task.process.id) || null;
                        if (processId) typeSelect.value = String(processId);
                    }
                }
            } catch (e) {}

            try {
                wireTaskDetailWorkflowActions(modalRoot);
                const statusVal = getTaskDetailStatusValue(modalRoot) || task.status;
                updateTaskDetailFooterButtons(modalRoot, statusVal);
            } catch (e) {}

            if (typeof loader !== 'undefined' && loader && typeof loader.unload === 'function') loader.unload();

            try {
                const modal = g.bootstrap ? bootstrap.Modal.getOrCreateInstance(modalRoot) : null;
                if (modal && typeof modal.show === 'function') modal.show();
                else modalRoot.classList.add('active');
            } catch (e) {
                modalRoot.classList.add('active');
            }

            setTimeout(() => {
                try {
                    initDeadlinePicker();
                } catch (err) {}
                try {
                    initTaskDetailDriSelect2();
                    const driSelect = document.getElementById(config.driSelectId);
                    if (driSelect && task.dri) {
                        driSelect.value = task.dri;
                        if (g.jQuery && $(driSelect).data('select2')) {
                            $(driSelect).val(task.dri).trigger('change');
                        }
                    }
                } catch (err) {}
            }, 50);

            try {
                await fetchAndRenderAttachments(taskId);
                const signItems = await fetchAndRenderSignFlow(taskId);
                await refreshTaskDetailSignPermission(modalRoot, signItems);
                await getComments(taskId);
            } catch (err) {
                console.warn('Failed to load comments/attachments for task', taskId, err);
            }

            if (options && typeof options.onAfterOpen === 'function') {
                options.onAfterOpen({taskId, projectId: resolvedProjectId, modalRoot, task});
            } else if (typeof config.onAfterOpen === 'function') {
                config.onAfterOpen({taskId, projectId: resolvedProjectId, modalRoot, task});
            }
        } catch (e) {
            if (typeof loader !== 'undefined' && loader && typeof loader.unload === 'function') loader.unload();
            showAlertError('Error', 'Failed to load task details');
        }
    }

    async function saveTaskDetailChanges() {
        const modalRoot = getModalRoot();
        if (!modalRoot) {
            showAlertError('Error', 'taskDetailModal not found');
            return;
        }

        const projectId = modalRoot.dataset.projectId;
        const taskId = modalRoot.dataset.taskId;

        let taskPayload = null;
        if (currentTaskDetailObj && String(currentTaskDetailObj.id) === String(taskId || currentTaskDetailObj.id)) {
            taskPayload = JSON.parse(JSON.stringify(currentTaskDetailObj));
        } else {
            try {
                const res = await fetch(`/ppap-system/api/tasks/get-by-id?id=${encodeURIComponent(taskId)}`);
                if (res.ok) {
                    const json = await res.json();
                    taskPayload = json.data || json.result || null;
                }
            } catch (e) {}
        }

        if (!taskPayload) {
            showAlertError('Error', 'Task data not available for update');
            return;
        }

        const statusSelect = getSelectByIds(modalRoot, config.statusSelectIds);
        const prioritySelect = getSelectByIds(modalRoot, config.prioritySelectIds);
        const stageSelect = modalRoot.querySelector(`#${config.stageSelectId}`);
        const typeSelect = modalRoot.querySelector(`#${config.typeSelectId}`);
        const newStatus = statusSelect ? statusSelect.value : taskPayload.status;
        const newPriority = prioritySelect ? prioritySelect.value : taskPayload.priority;
        const newStageId = stageSelect ? stageSelect.value : taskPayload.stageId;
        const newProcessId = typeSelect ? typeSelect.value : taskPayload.processId;

        const driInput = document.getElementById(config.driSelectId);
        const deadlineInput = document.getElementById(config.deadlineInputId);

        const taskNameEl = modalRoot.querySelector('.task-detail-name');
        const descEl = modalRoot.querySelector('.section-content');
        const newName = taskNameEl ? taskNameEl.textContent.trim() : taskPayload.name;
        const newDescription = descEl ? descEl.textContent.trim() : taskPayload.description;

        let newDri = driInput ? driInput.value : taskPayload.dri;
        let newDeadline = deadlineInput ? deadlineInput.value : taskPayload.dueDate;
        if (newDri === 'N/A' || newDri === '-' || !newDri || newDri.trim() === '') newDri = null;
        if (newDeadline === 'N/A' || newDeadline === '-' || !newDeadline || newDeadline.trim() === '')
            newDeadline = null;

        if (newDeadline) {
            try {
                newDeadline = getDateFormatter().toAPIFormat(newDeadline);
            } catch (e) {}
        }

        taskPayload.status = newStatus === 'N/A' ? null : newStatus;
        taskPayload.priority = newPriority === 'N/A' ? null : newPriority;
        taskPayload.dri = newDri;
        taskPayload.dueDate = newDeadline;
        taskPayload.name = newName;
        taskPayload.description = newDescription;
        taskPayload.stageId = newStageId === 'N/A' || newStageId === '' ? null : newStageId;
        taskPayload.processId = newProcessId === 'N/A' || newProcessId === '' ? null : newProcessId;

        try {
            if (typeof loader !== 'undefined' && loader && typeof loader.load === 'function') loader.load();
            const res = await fetch('/ppap-system/api/tasks/update', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(taskPayload),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                console.warn('Update API returned', res.status, res.statusText, text);
                if (typeof loader !== 'undefined' && loader && typeof loader.unload === 'function') loader.unload();
                showAlertError('Failed', 'Failed to update task. Server returned ' + res.status);
                return;
            }

            let json = null;
            try {
                json = await res.json();
            } catch (e) {}
            const updatedTask = (json && (json.data || json.result)) || taskPayload;

            if (typeof loader !== 'undefined' && loader && typeof loader.unload === 'function') loader.unload();

            try {
                const statusBadge = modalRoot.querySelector('.task-status-badge');
                const priorityBadge = modalRoot.querySelector('.priority-badge');

                if (statusBadge) {
                    statusBadge.textContent = getStatusLabel(updatedTask.status);
                    statusBadge.className = `task-status-badge ${getStatusBadgeClass(updatedTask.status)}`;
                }

                if (priorityBadge) {
                    priorityBadge.textContent = getPriorityLabel(updatedTask.priority);
                    priorityBadge.className = `priority-badge ${getPriorityBadgeClass(updatedTask.priority)}`;
                }

                const dateDisplay = modalRoot.querySelector('.date-display');
                if (dateDisplay) {
                    dateDisplay.textContent = updatedTask.dueDate || updatedTask.deadline || '-';
                }

                const assigneeDisplay = modalRoot.querySelector('.assignee-name');
                if (assigneeDisplay) {
                    assigneeDisplay.textContent = getUserLabelById(updatedTask.dri) || '-';
                }

                const statusSelect = getSelectByIds(modalRoot, config.statusSelectIds);
                const prioritySelect = getSelectByIds(modalRoot, config.prioritySelectIds);
                const stageSelect = modalRoot.querySelector(`#${config.stageSelectId}`);
                const typeSelect = modalRoot.querySelector(`#${config.typeSelectId}`);

                if (statusSelect) {
                    statusSelect.value = updatedTask.status || (updatedTask.status === null ? 'N/A' : '');
                }

                if (prioritySelect) {
                    prioritySelect.value = updatedTask.priority || (updatedTask.priority === null ? 'N/A' : '');
                }

                if (stageSelect) {
                    const stageVal =
                        updatedTask.stageId !== undefined && updatedTask.stageId !== null
                            ? updatedTask.stageId
                            : taskPayload.stageId;
                    if (stageVal !== undefined && stageVal !== null && stageVal !== '') {
                        const val = String(stageVal);
                        const hasOption = Array.from(stageSelect.options).some((o) => String(o.value) === val);
                        if (!hasOption) {
                            const opt = document.createElement('option');
                            opt.value = val;
                            opt.text = val;
                            stageSelect.add(opt, stageSelect.options[0] || null);
                        }
                        stageSelect.value = val;
                    }
                }

                if (typeSelect) {
                    const procVal =
                        updatedTask.processId !== undefined && updatedTask.processId !== null
                            ? updatedTask.processId
                            : taskPayload.processId;
                    if (procVal !== undefined && procVal !== null && procVal !== '') {
                        const val = String(procVal);
                        const hasOption = Array.from(typeSelect.options).some((o) => String(o.value) === val);
                        if (!hasOption) {
                            const opt = document.createElement('option');
                            opt.value = val;
                            opt.text = val;
                            typeSelect.add(opt, typeSelect.options[0] || null);
                        }
                        typeSelect.value = val;
                    }
                }

                const driSelect = document.getElementById(config.driSelectId);
                if (driSelect && updatedTask.dri) {
                    driSelect.value = updatedTask.dri;
                    if (g.jQuery && $(driSelect).data('select2')) {
                        $(driSelect).val(updatedTask.dri).trigger('change');
                    }
                }

                const deadlineInput = document.getElementById(config.deadlineInputId);
                if (deadlineInput && updatedTask.dueDate) {
                    const normalized = getDateFormatter().toDisplayFormat(updatedTask.dueDate);
                    deadlineInput.value = normalized;
                    deadlineInput.dataset.initialValue = normalized;
                }

                const refreshTaskListRowData = getHelper('refreshTaskListRowData');
                if (refreshTaskListRowData) {
                    refreshTaskListRowData(updatedTask);
                }

                const findProjectById = getHelper('findProjectById');
                const getCurrentStageId = getHelper('getCurrentStageId');
                const loadProjectTasksByStage = getHelper('loadProjectTasksByStage');
                if (projectId && findProjectById && getCurrentStageId && loadProjectTasksByStage) {
                    const project = findProjectById(projectId);
                    if (project) {
                        const activeStageId = getCurrentStageId(projectId);
                        loadProjectTasksByStage(projectId, activeStageId, {skipLoader: true});
                    }
                }

                currentTaskDetailObj = JSON.parse(JSON.stringify(updatedTask));

                try {
                    updateTaskDetailFooterButtons(modalRoot, updatedTask.status);
                } catch (e) {}

                await getComments(taskId);
            } catch (e) {}

            if (typeof config.onTaskUpdated === 'function') {
                config.onTaskUpdated(updatedTask, {taskId, projectId, modalRoot});
            }

            showAlertSuccess('Success', 'Task updated successfully');
        } catch (e) {
            if (typeof loader !== 'undefined' && loader && typeof loader.unload === 'function') loader.unload();
            showAlertError('Failed', 'Failed to update task: ' + e.message);
        }
    }

    function setConfig(opts) {
        if (!opts) return;
        Object.keys(opts).forEach((key) => {
            config[key] = opts[key];
        });
    }

    TaskDetailModal.init = function (opts) {
        setConfig(opts);
    };
    TaskDetailModal.open = openTaskDetail;
    TaskDetailModal.save = saveTaskDetailChanges;
    TaskDetailModal.applyTask = applyTaskToDetailModal;
    TaskDetailModal.syncFollow = syncFollowButtonState;

    function setReminder() {
        alert('Reminder feature not implemented');
    }
    function escalateTask() {
        alert('Escalate feature not implemented');
    }
    function reassignTask() {
        alert('Reassign feature not implemented');
    }

export function initTaskDetailModalBindings(modalRoot = getModalRoot()) {
    if (!modalRoot) return;
    if (modalRoot.dataset.taskDetailBound === '1') return;
    modalRoot.dataset.taskDetailBound = '1';

    const actionHandlers = {
        toggleFollow,
        setReminder,
        escalateTask,
        reassignTask,
    };

    modalRoot.querySelectorAll('[data-action]').forEach((btn) => {
        const action = btn.dataset.action;
        const handler = actionHandlers[action];
        if (!handler) return;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handler();
        });
    });

    const uploadBtn = modalRoot.querySelector(`#${config.uploadButtonId}`);
    if (uploadBtn) uploadBtn.addEventListener('click', handleTaskFileUpload);

    const commentBtn = modalRoot.querySelector(`#${config.commentButtonId}`);
    if (commentBtn) commentBtn.addEventListener('click', handleTaskComment);

    const saveBtn = modalRoot.querySelector('.js-task-save');
    if (saveBtn) saveBtn.addEventListener('click', saveTaskDetailChanges);
}

export {
    TaskDetailModal,
    openTaskDetail,
    saveTaskDetailChanges,
    applyTaskToDetailModal,
    syncFollowButtonState,
    handleTaskFileUpload,
    handleTaskComment,
    initDeadlinePicker,
    loadTaskDetailStageOptions,
    wireTaskDetailWorkflowActions,
    fetchAndRenderAttachments,
    fetchAndRenderSignFlow,
    refreshTaskDetailSignPermission,
    updateTaskDetailFooterButtons,
};


