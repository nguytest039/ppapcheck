import { TaskDetailModal, openTaskDetail, initTaskDetailModalBindings } from './task_detail_modal.js';

const PROJECT_TASK_TABLE_LABELS = window.PROJECT_TASK_TABLE_I18N
const DateFormatter = {
    toAPIFormat(dateStr) {
        if (!dateStr || dateStr === '-' || String(dateStr).toUpperCase() === 'N/A') {
            return null;
        }

        const str = String(dateStr).trim().replace('T', ' ');

        if (window.moment) {
            const m = window.moment(
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
        if (tPieces.length === 1) {
            timePart = `${tPieces[0] || '00'}:00:00`;
        } else if (tPieces.length === 2) {
            timePart = `${tPieces[0] || '00'}:${tPieces[1] || '00'}:00`;
        } else {
            timePart = `${tPieces[0] || '00'}:${tPieces[1] || '00'}:${tPieces[2] || '00'}`;
        }

        return `${datePart} ${timePart}`;
    },

    toDisplayFormat(dateStr) {
        return this.toAPIFormat(dateStr) || '-';
    },
};

function formatDateForFilterInput(value) {
    if (!value) return '';
    if (typeof value.format === 'function') return value.format('YYYY/MM/DD');
    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = ('0' + (value.getMonth() + 1)).slice(-2);
        const day = ('0' + value.getDate()).slice(-2);
        return `${year}/${month}/${day}`;
    }
    const str = String(value).trim();
    const normalized = str.split(' ')[0].replace(/-/g, '/');
    return normalized;
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

function highlightMentions(safeText) {
    if (!safeText) return '';
    return safeText.replace(/(^|\s)@([A-Za-z0-9._-]+)/g, (match, prefix, handle) => {
        return `${prefix}<span class="comment-mention">@${handle}</span>`;
    });
}

function formatCommentContent(rawContent) {
    const safe = escapeHtml(rawContent || '');
    return highlightMentions(safe);
}

const MENTION_MAX_RESULTS = 8;

function getMentionContext(text, caretPos) {
    if (!text) return null;
    const pos = typeof caretPos === 'number' ? caretPos : text.length;
    const upto = text.slice(0, pos);
    const atIndex = upto.lastIndexOf('@');
    if (atIndex === -1) return null;
    if (atIndex > 0) {
        const prev = upto.charAt(atIndex - 1);
        if (!/\s/.test(prev)) return null;
    }
    const query = upto.slice(atIndex + 1);
    if (/\s/.test(query)) return null;
    return {start: atIndex, end: pos, query};
}

function getMentionInsertValue(user) {
    if (!user) return '';
    const idCard = String(user.idCard || '').trim();
    if (idCard) return idCard;
    const displayName = String(user.displayName || '').trim();
    if (displayName) return displayName;
    const fullName = String(user.fullName || '').trim();
    return fullName;
}

function initCommentMentionAutocomplete() {
    const input = document.getElementById('input-comment');
    if (!input) return;
    if (input.dataset.mentionBound === '1') return;
    input.dataset.mentionBound = '1';

    const wrapper = input.closest('.comment-input') || input.parentElement;
    if (!wrapper) return;

    if (!USERS_CACHE || USERS_CACHE.length === 0) {
        fetchUsers()
            .then((users) => {
                if (Array.isArray(users)) USERS_CACHE = users;
            })
            .catch(() => {});
    }

    let dropdown = wrapper.querySelector('.mention-suggestions');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'mention-suggestions';
        wrapper.appendChild(dropdown);
    }

    const state = {matches: [], activeIndex: -1, context: null};

    const hide = () => {
        dropdown.classList.remove('active');
        dropdown.innerHTML = '';
        state.matches = [];
        state.activeIndex = -1;
        state.context = null;
    };

    const positionDropdown = () => {
        dropdown.style.left = `${input.offsetLeft}px`;
        dropdown.style.width = `${input.offsetWidth}px`;
    };

    const setActive = (index) => {
        const items = dropdown.querySelectorAll('.mention-suggestion-item');
        items.forEach((el, idx) => {
            el.classList.toggle('is-active', idx === index);
        });
        state.activeIndex = index;
    };

    const selectByIndex = (index) => {
        const user = state.matches[index];
        const mentionValue = getMentionInsertValue(user);
        if (!mentionValue || !state.context) return;
        const value = input.value || '';
        const before = value.slice(0, state.context.start);
        const after = value.slice(state.context.end);
        const insertText = `@${mentionValue} `;
        input.value = `${before}${insertText}${after}`;
        const newPos = before.length + insertText.length;
        input.setSelectionRange(newPos, newPos);
        hide();
        input.focus();
    };

    const renderEmpty = () => {
        positionDropdown();
        dropdown.innerHTML = '<div class="mention-suggestion-empty">No users found</div>';
        dropdown.classList.add('active');
        state.activeIndex = -1;
    };

    const renderList = (matches) => {
        positionDropdown();
        dropdown.innerHTML = matches
            .map((user, idx) => {
                const idCard = String(user.idCard || '').trim();
                const displayName = String(user.displayName || '').trim();
                const fullName = String(user.fullName || '').trim();
                const nameLine = idCard
                    ? `@${escapeHtml(idCard)}${displayName ? ' - ' + escapeHtml(displayName) : ''}`
                    : escapeHtml(displayName || fullName);
                const metaLine =
                    fullName && fullName !== displayName ? `<div class="mention-suggestion-meta">${escapeHtml(fullName)}</div>` : '';
                return `
                    <div class="mention-suggestion-item" data-index="${idx}">
                        <div class="mention-suggestion-name">${nameLine}</div>
                        ${metaLine}
                    </div>`;
            })
            .join('');
        dropdown.classList.add('active');
        setActive(0);

        dropdown.querySelectorAll('.mention-suggestion-item').forEach((item) => {
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const index = Number(item.dataset.index || 0);
                selectByIndex(index);
            });
            item.addEventListener('mouseenter', () => {
                const index = Number(item.dataset.index || 0);
                setActive(index);
            });
        });
    };

    const updateSuggestions = () => {
        const value = input.value || '';
        const caret = typeof input.selectionStart === 'number' ? input.selectionStart : value.length;
        const context = getMentionContext(value, caret);
        if (!context || !context.query || context.query.length < 1) {
            hide();
            return;
        }

        const matches = filterUsers(context.query).slice(0, MENTION_MAX_RESULTS);
        state.matches = matches;
        state.context = context;

        if (!matches.length) {
            renderEmpty();
            return;
        }

        renderList(matches);
    };

    const onKeydown = (e) => {
        if (!dropdown.classList.contains('active')) return;
        if (!state.matches.length) {
            if (e.key === 'Escape') hide();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = (state.activeIndex + 1) % state.matches.length;
            setActive(next);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = (state.activeIndex - 1 + state.matches.length) % state.matches.length;
            setActive(prev);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const index = state.activeIndex >= 0 ? state.activeIndex : 0;
            selectByIndex(index);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hide();
        }
    };

    input.addEventListener('input', updateSuggestions);
    input.addEventListener('click', updateSuggestions);
    input.addEventListener('keydown', onKeydown);
    input.addEventListener('blur', () => {
        setTimeout(hide, 150);
    });

    if (!input._mentionDocHandler) {
        input._mentionDocHandler = function (e) {
            if (!wrapper.contains(e.target)) hide();
        };
        document.addEventListener('click', input._mentionDocHandler);
    }
}

let USERS_CACHE = [];

async function fetchUsers() {
    try {
        const res = await fetch('/ppap-system/api/users');
        if (!res.ok) {
            throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
        }
        const json = await res.json();
        return json.result || [];
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

function filterUsers(keyword) {
    if (!keyword || keyword.length === 0) {
        return USERS_CACHE;
    }

    const lowerKeyword = keyword.toLowerCase();
    return USERS_CACHE.filter((user) => {
        const idCard = (user.idCard || '').toLowerCase();
        const fullName = (user.fullName || '').toLowerCase();
        const displayName = (user.displayName || '').toLowerCase();

        return idCard.includes(lowerKeyword) || fullName.includes(lowerKeyword) || displayName.includes(lowerKeyword);
    });
}

function formatUserLabel(user) {
    if (!user) return '';
    const idCard = (user.idCard || '').trim();
    const displayName = (user.displayName || '').trim();
    if (!idCard && !displayName) return '';
    return displayName ? `${idCard} - ${displayName}` : idCard;
}

function getUserLabelById(idCard) {
    if (!idCard) return '';
    const normalized = String(idCard).trim();
    const found = USERS_CACHE.find((user) => (user.idCard || '').toString() === normalized);
    if (found) return formatUserLabel(found);
    return normalized;
}

function normalizeStatus(status) {
    if (!status) return '';
    return String(status).trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function getStatusBadgeClass(status) {
    const normalized = normalizeStatus(status);
    const statusMap = {
        OPEN: 'status-pending',
        PENDING: 'status-gray',
        IN_PROGRESS: 'status-in-progress',
        WAITING_FOR_APPROVAL: 'status-waiting',
        COMPLETED: 'status-completed',
        OVERDUE: 'status-overdue',
        IN_PROCESS: 'status-in-progress',
        OVER_DUE: 'status-overdue',
        CREATED: 'status-na',
        RETURNED: 'status-overdue',
        ON_GOING: 'status-pending',
        CLOSED: 'status-completed',
    };
    return statusMap[normalized] || 'status-na';
}

function getStatusLabel(status) {
    const normalized = normalizeStatus(status);
    if (!normalized) return 'N/A';
    return normalized.replace(/_/g, ' ');
}

function getPriorityBadgeClass(priority) {
    if (!priority) return 'priority-medium';
    const p = priority.toLowerCase();
    return `priority-${p}`;
}

function getPriorityLabel(priority) {
    if (!priority) return 'MEDIUM';
    return priority.replace(/_/g, ' ');
}

function populateDriSelectOptions(selectEl, selectedValue) {
    if (!selectEl) return;

    selectEl.innerHTML = '<option value="">-- Select DRI --</option>';

    USERS_CACHE.forEach((user) => {
        const idCard = user.idCard || '';
        const fullName = user.fullName || '';
        const displayName = user.displayName || '';
        const option = document.createElement('option');
        option.value = idCard;
        option.textContent = formatUserLabel(user);
        if (selectedValue && idCard === selectedValue) {
            option.selected = true;
        }
        selectEl.appendChild(option);
    });
}

function initDriSelect2(selectEl, dropdownParent) {
    if (!selectEl || !window.jQuery || typeof $.fn.select2 !== 'function') {
        return;
    }

    let targetEl = selectEl;
    if (selectEl.tagName === 'INPUT') {
        const currentVal = selectEl.value || '';
        const newSelect = document.createElement('select');
        newSelect.id = selectEl.id;
        newSelect.className = selectEl.className;
        newSelect.name = selectEl.name || selectEl.id;

        if (selectEl.dataset) {
            Object.keys(selectEl.dataset).forEach((key) => {
                newSelect.dataset[key] = selectEl.dataset[key];
            });
        }

        selectEl.parentNode.replaceChild(newSelect, selectEl);
        targetEl = newSelect;

        populateDriSelectOptions(targetEl, currentVal);
    } else {
        const currentVal = selectEl.value || '';
        populateDriSelectOptions(targetEl, currentVal);
    }

    const $select = $(targetEl);

    if ($select.data('select2')) {
        try {
            $select.select2('destroy');
        } catch (e) {}
    }

    $select.select2({
        placeholder: 'Search user...',
        allowClear: true,
        width: '100%',
        language: {
            noResults: function (params) {
                const term = params && params.term ? String(params.term).trim() : '';
                if (!term) return 'No results found';
                return `No results found; Press Enter to add ${term}`;
            },
        },
        dropdownParent: dropdownParent ? $(dropdownParent) : $select.parent(),
    });

    const savedVal = targetEl.value || (selectEl !== targetEl ? selectEl.value : '') || '';
    if (savedVal) {
        $select.val(savedVal).trigger('change.select2');
    }

    const updateNoResultsMessage = function (searchValue) {
        const term = searchValue ? String(searchValue).trim() : '';
        const messageEl = document.querySelector('.select2-container--open .select2-results__message');
        if (!messageEl) return;
        if (!term) {
            messageEl.textContent = 'No results found';
            return;
        }
        messageEl.textContent = `No results found; Press Enter to add ${term}`;
    };

    $select.off('select2:open.ppapDri');
    $select.on('select2:open.ppapDri', function () {
        const searchField = document.querySelector('.select2-container--open .select2-search__field');
        if (!searchField) return;

        if (searchField._ppapDriEnterHandler) {
            searchField.removeEventListener('keydown', searchField._ppapDriEnterHandler);
        }
        if (searchField._ppapDriInputHandler) {
            searchField.removeEventListener('input', searchField._ppapDriInputHandler);
        }

        searchField._ppapDriEnterHandler = async function (ev) {
            if (ev.key !== 'Enter') return;
            const term = (searchField.value || '').trim();
            if (!term) return;

            const exists = USERS_CACHE.some((user) => String(user.idCard || '').trim() === term);
            if (exists) return;

            ev.preventDefault();

            try {
                const res = await fetch(
                    `/ppap-system/api/users/get-dri?idCard=${encodeURIComponent(term)}`
                );
                if (!res.ok) {
                    console.error('get-dri failed:', res.status, res.statusText);
                    return;
                }

                const json = await res.json();
                const user = json.data || json.result || null;
                if (!user) return;

                const idCard = String(user.idCard || term).trim();
                const found = USERS_CACHE.some((u) => String(u.idCard || '').trim() === idCard);
                if (!found) USERS_CACHE.push(user);

                populateDriSelectOptions(targetEl, idCard);
                $select.val(idCard).trigger('change.select2');
                $select.select2('close');
            } catch (e) {
                console.error('get-dri error:', e);
            }
        };

        searchField._ppapDriInputHandler = function () {
            updateNoResultsMessage(searchField.value || '');
        };

        searchField.addEventListener('keydown', searchField._ppapDriEnterHandler);
        searchField.addEventListener('input', searchField._ppapDriInputHandler);
        updateNoResultsMessage(searchField.value || '');
    });
}

async function loadUsersAndInitDriSelects() {
    if (USERS_CACHE.length === 0) {
        USERS_CACHE = await fetchUsers();
    }

    const filterCreatedBy = document.getElementById('filter-created-by');
    if (filterCreatedBy) {
        initDriSelect2(filterCreatedBy, null);
    }
}

function initCustomDriSelect2() {
    const customDri = document.getElementById('custom-dri');
    const modal = document.getElementById('customTaskModal');
    if (customDri && modal) {
        initDriSelect2(customDri, modal);
    }
}

function initTaskDetailDriSelect2() {
    const driInput = document.getElementById('dri');
    const modal = document.getElementById('taskDetailModal');
    if (driInput && modal) {
        initDriSelect2(driInput, modal);
    }
}

function safeCompareIds(id1, id2) {
    if (id1 == null || id2 == null) {
        return id1 === id2;
    }

    const str1 = String(id1);
    const str2 = String(id2);
    if (str1 === 'null' || str1 === 'undefined' || str2 === 'null' || str2 === 'undefined') {
        return false;
    }

    return str1 === str2;
}

function findProjectById(projectId) {
    if (!projectId) return null;
    return projectList.find((p) => safeCompareIds(p.id, projectId)) || null;
}

const Validators = {
    required(value, fieldName) {
        const val = value ? String(value).trim() : '';
        if (!val) {
            throw new Error(`${fieldName} is required`);
        }
        return val;
    },

    maxLength(value, max, fieldName) {
        if (String(value).length > max) {
            throw new Error(`${fieldName} must be less than ${max} characters`);
        }
        return value;
    },
};

function openModal(modalId) {
    const modalEl = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (!modalEl) {
        return null;
    }

    try {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        return modal;
    } catch (e) {
        modalEl.classList.add('active');
        return null;
    }
}

function safeHideModal(modalEl) {
    if (!modalEl) return;
    try {
        if (window.bootstrap && bootstrap.Modal) {
            const inst = bootstrap.Modal.getInstance(modalEl);
            if (inst && typeof inst.hide === 'function') {
                inst.hide();
            } else {
                try {
                    new bootstrap.Modal(modalEl).hide();
                } catch (e) {
                    modalEl.classList.remove('show', 'active');
                }
            }
        } else {
            modalEl.classList.remove('show', 'active');
        }
    } catch (e) {
        try {
            modalEl.classList.remove('show', 'active');
        } catch (e2) {}
    }
    setTimeout(() => {
        try {
            const openModals = document.querySelectorAll('.modal.show');
            const backdrops = document.querySelectorAll('.modal-backdrop');

            if (backdrops.length > openModals.length) {
                for (let i = openModals.length; i < backdrops.length; i++) {
                    if (backdrops[i] && backdrops[i].parentNode) {
                        backdrops[i].parentNode.removeChild(backdrops[i]);
                    }
                }
            }

            if (openModals.length === 0) {
                document.body.classList.remove('modal-open');
                document.body.style.paddingRight = '';
                document.body.style.overflow = '';
            }
        } catch (e) {}
    }, 150);
}

function cleanUpModal() {
    try {
        const openModals = document.querySelectorAll('.modal.show');
        const anyOpen = openModals.length > 0;

        if (!anyOpen) {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach((b) => {
                try {
                    if (b && b.parentNode) {
                        b.parentNode.removeChild(b);
                    }
                } catch (e) {}
            });
            try {
                document.body.classList.remove('modal-open');
                document.body.style.paddingRight = '';
                document.body.style.overflow = '';
            } catch (e) {}
        } else {
            try {
                const backdrops = Array.from(document.querySelectorAll('.modal-backdrop'));
                const openCount = openModals.length;

                if (backdrops.length > openCount) {
                    for (let i = openCount; i < backdrops.length; i++) {
                        try {
                            if (backdrops[i] && backdrops[i].parentNode) {
                                backdrops[i].parentNode.removeChild(backdrops[i]);
                            }
                        } catch (e) {}
                    }
                }
            } catch (e) {}
        }
    } catch (e) {}
}

document.addEventListener('hidden.bs.modal', function (ev) {
    setTimeout(() => {
        cleanUpModal();
    }, 10);
});
function showAlertSuccess(title, text) {
    Swal.fire({
        title: title,
        text: text,
        icon: 'success',
        customClass: 'swal-success',
        buttonsStyling: true,
    });
}

function showAlertError(title, text) {
    Swal.fire({
        title: title,
        text: text,
        icon: 'error',
        customClass: 'swal-error',
        buttonsStyling: true,
    });
}

function showAlertWarning(title, text) {
    Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        customClass: 'swal-warning',
        buttonsStyling: true,
    });
}

function extractApiMessage(payload) {
    if (!payload) return '';
    if (typeof payload === 'string') return payload.trim();

    const pick = (value) => (typeof value === 'string' && value.trim() ? value.trim() : '');
    const direct =
        pick(payload.message) ||
        pick(payload.error) ||
        pick(payload.errorMessage) ||
        pick(payload.msg) ||
        pick(payload.detail);
    if (direct) return direct;

    if (payload.result && typeof payload.result === 'object') {
        const nested =
            pick(payload.result.message) ||
            pick(payload.result.error) ||
            pick(payload.result.errorMessage) ||
            pick(payload.result.msg);
        if (nested) return nested;
    }

    if (payload.data && typeof payload.data === 'object') {
        const nested =
            pick(payload.data.message) ||
            pick(payload.data.error) ||
            pick(payload.data.errorMessage) ||
            pick(payload.data.msg);
        if (nested) return nested;
    }

    if (Array.isArray(payload.errors)) {
        const parts = payload.errors
            .map((item) => {
                if (typeof item === 'string') return item.trim();
                if (item && typeof item === 'object') {
                    return pick(item.message) || pick(item.error) || pick(item.msg);
                }
                return '';
            })
            .filter(Boolean);
        if (parts.length) return parts.join(', ');
    }

    if (payload.errors && typeof payload.errors === 'object') {
        const parts = Object.values(payload.errors)
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
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

async function handleAddCustomTask() {
    try {
        const getVal = (id) => {
            const el = document.getElementById(id);
            if (!el) return null;
            const v = (el.value || '').trim();
            return v === '' ? null : v;
        };

        const name = Validators.required(getVal('custom-task-name'), 'Task name');
        const taskCode = getVal('custom-task-id') || null;

        Validators.maxLength(name, 200, 'Task name');
        if (taskCode !== null) {
            Validators.maxLength(taskCode, 50, 'Task code');
        }

        const processId = getVal('custom-sl-process') ? Number(getVal('custom-sl-process')) : null;
        const departmentId = getVal('custom-sl-department') ? Number(getVal('custom-sl-department')) : null;
        const typeId = getVal('custom-sl-xvt') ? Number(getVal('custom-sl-xvt')) : null;
        const priorityRaw = getVal('custom-sl-priority');
        const priority = priorityRaw ? priorityRaw.toUpperCase() : null;
        const dri = getVal('custom-dri');
        const dueDateRaw = getVal('custom-deadline');
        const description = getVal('custom-task-description');

        let dueDate = null;
        if (dueDateRaw) {
            dueDate = DateFormatter.toAPIFormat(dueDateRaw);
        }

        let projectId = null;
        if (currentProject && currentProject.id) {
            projectId = currentProject.id;

            if (String(projectId).startsWith('TEMP-')) {
                const persistedId = await ensureProjectPersisted(currentProject);
                if (!persistedId) {
                    showAlertError('Failed', 'Unable to save project. Please try again.');
                    return;
                }
                projectId = persistedId;
                currentProject.id = persistedId;
            }
        } else {
            const pidEl = document.getElementById('pt_detail_projectId');
            if (pidEl && pidEl.value) {
                projectId = pidEl.value;
            }
        }

        if (projectId !== null && projectId !== undefined && projectId !== '') {
            projectId = Number(projectId);
            if (isNaN(projectId) || projectId <= 0) {
                showAlertError('Failed', 'Invalid project ID');
                return;
            }
        } else {
            showAlertError('Failed', 'Please select a project before adding a task');
            return;
        }

        const payload = {
            name,
            taskCode,
            processId,
            departmentId,
            typeId,
            priority,
            dri,
            dueDate,
            description,
            isTemplate: false,
            projectId,
            step: null,
            flag: true,
            status: null,
            stageId: typeId,
        };

        console.log('Creating custom task with payload:', payload);

        const res = await fetch('/ppap-system/api/tasks/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const message = await getApiErrorMessage(res, `Failed to create task: (${res.status})`);
            console.error('Create task failed:', res.status, message);
            showAlertError('Failed', message);
            return;
        }

        let newTask = null;
        try {
            const json = await res.json();
            newTask = json.data || json.result || json;
        } catch (e) {}
        showAlertSuccess('Success', 'Task created successfully!');
        try {
            bootstrap.Modal.getInstance(document.getElementById('customTaskModal')).hide();
        } catch (e) {
            const customModal = document.getElementById('customTaskModal');
            if (customModal) {
                customModal.classList.remove('show', 'active');
            }
        }

        if (newTask && newTask.id) {
            const taskToAdd = {
                id: newTask.id,
                taskCode: newTask.taskCode || taskCode,
                name: newTask.name || name,
                description: newTask.description || description,
                status: newTask.status || 'NEW',
                priority: newTask.priority || priority,
                dri: newTask.dri || dri,
                dueDate: newTask.dueDate || dueDate,
                deadline: newTask.dueDate || dueDate,
                processId: newTask.processId || processId,
                departmentId: newTask.departmentId || departmentId,
                stageId: newTask.stageId || typeId,
                step: 0,
            };

            selectedPPAPItems.push(taskToAdd);

            const project = findProjectById(projectId);
            if (project) {
                project.tasks = project.tasks || [];
                project.tasks.push(taskToAdd);
                project.taskCount = project.tasks.length;

                project.tasks.forEach((t, idx) => {
                    if (t) t.step = idx + 1;
                });

                const projectModal = document.getElementById('projectTasksModal');
                if (projectModal && projectModal.classList.contains('show')) {
                    const activeStageId = getCurrentStageId(projectId);
                    if (!activeStageId || String(activeStageId) === String(taskToAdd.stageId)) {
                        loadProjectTasksByStage(projectId, activeStageId, {skipLoader: true});
                    }
                }
            }

            if (currentProject && String(currentProject.id) === String(projectId)) {
                currentProject.tasks = currentProject.tasks || [];
                currentProject.tasks.push(taskToAdd);
                currentProject.taskCount = currentProject.tasks.length;
                currentProject.tasks.forEach((t, idx) => {
                    if (t) t.step = idx + 1;
                });
            }

            try {
                const createModal = document.getElementById('createProjectModal');
                if (createModal && createModal.classList.contains('show')) {
                    renderSelectedTasksInModal();
                }
            } catch (e) {}
        }

        try {
            document.getElementById('custom-task-name').value = '';
            document.getElementById('custom-task-id').value = '';
            document.getElementById('custom-task-description').value = '';
            document.getElementById('custom-sl-process').value = '';
            document.getElementById('custom-sl-department').value = '';
            document.getElementById('custom-sl-priority').value = '';
            document.getElementById('custom-sl-xvt').value = '';
            document.getElementById('custom-dri').value = '';
            document.getElementById('custom-deadline').value = '';
        } catch (e) {}

        try {
            await loadProjectList();
        } catch (e) {}
    } catch (e) {
        console.error('handleAddCustomTask error:', e);
        showAlertError('Error', e.message || 'An error occurred while creating the task');
    }
}

const SELECT_CONFIGS = [
    {id: 'ppapFilterStatus', endpoint: '/api/tasks/status'},
    {id: 'ppapFilterPriority', endpoint: '/api/tasks/priorities'},
    {id: 'ppapFilterCustomer', endpoint: '/api/customers'},
    {id: 'ppapFilterModel', endpoint: '/api/models'},
    {id: 'ppapFilterStage', endpoint: '/api/stages'},
    {id: 'ppapFilterDepartment', endpoint: '/api/departments'},
    {id: 'ppapFilterProcess', endpoint: '/api/processes'},
    {id: 'ppapFilterProjectStatus', endpoint: '/api/projects/status'},
];

const SELECT_CACHE = {};

function getCustomersCache() {
    const list = SELECT_CACHE['/api/customers'];
    return Array.isArray(list) ? list : [];
}

function findCustomerFromCache(value) {
    if (value === null || value === undefined) return null;
    const list = getCustomersCache();
    if (!list.length) return null;

    const normalized = String(value).trim();
    const normalizedLower = normalized.toLowerCase();

    return (
        list.find((c) => c && String(c.id).trim() === normalized) ||
        list.find((c) => c && String(c.name || '').trim().toLowerCase() === normalizedLower)
    );
}

function getSelectNameById(cacheKey, id) {
    if (id === null || id === undefined || id === '') return '';
    const list = SELECT_CACHE[cacheKey] || [];
    const normalized = String(id).trim();
    const match = list.find((item) => {
        if (!item || item.id === null || item.id === undefined) return false;
        return String(item.id).trim() === normalized;
    });
    if (match) {
        return match.name || match.label || '';
    }
    return '';
}

const CFT_NAME_MAP_BY_CUSTOMER = {};
async function ensureCftNameMapForCustomer(customerId) {
    const cid = customerId !== undefined && customerId !== null ? String(customerId).trim() : '';
    if (!cid) return null;
    if (CFT_NAME_MAP_BY_CUSTOMER[cid]) return CFT_NAME_MAP_BY_CUSTOMER[cid];

    try {
        const res = await fetch(`/ppap-system/api/cft?customerId=${encodeURIComponent(cid)}`);
        if (!res.ok) {
            throw new Error(`Error: ${res.status} ${res.statusText}`);
        }
        const json = await res.json();
        const items = json.data || [];
        const map = items.reduce((acc, item) => {
            if (!item || item.id === null || item.id === undefined) return acc;
            acc[String(item.id).trim()] = item.name || item.label || String(item.id);
            return acc;
        }, {});
        CFT_NAME_MAP_BY_CUSTOMER[cid] = map;
        return map;
    } catch (e) {
        console.error('ensureCftNameMapForCustomer failed:', e);
        CFT_NAME_MAP_BY_CUSTOMER[cid] = {};
        return CFT_NAME_MAP_BY_CUSTOMER[cid];
    }
}

function getStageName(stageId) {
    return getSelectNameById('/api/stages', stageId);
}

function getProcessName(processId) {
    return getSelectNameById('/api/processes', processId);
}

let currentStageProjectId = null;
let currentStageId = null;
let currentStageTasks = [];
const PROJECT_STAGE_TABS = {};
let currentStandardPpapStageId = null;
let currentStandardPpapProjectId = null;
const STANDARD_PPAP_STAGE_BY_PROJECT = {};

function isTaskInStage(task, stageId) {
    if (!task) return false;
    if (stageId === null || stageId === undefined || stageId === '') return true;
    return String(task.stageId) === String(stageId);
}

function getStageTasksFromList(tasks, stageId) {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter((t) => isTaskInStage(t, stageId));
}

function getTemplateIdFromTask(task) {
    if (!task) return null;
    if (task.parentId != null) return String(task.parentId);
    if (task.isTemplate) return String(task.id);
    if (allTemplateIds && allTemplateIds.has(String(task.id))) return String(task.id);
    return null;
}

function sortStagesByName(stages) {
    if (!Array.isArray(stages)) return [];
    return stages
        .filter((s) => s && s.id !== null && s.id !== undefined)
        .slice()
        .sort((a, b) => {
            const nameA = String(a.name || '').trim().toLowerCase();
            const nameB = String(b.name || '').trim().toLowerCase();
            return nameA.localeCompare(nameB);
        });
}

async function fetchStagesForProject(projectId) {
    if (!projectId) return [];
    try {
        const res = await fetch(`/ppap-system/api/stages?projectId=${encodeURIComponent(projectId)}`);
        if (!res.ok) throw new Error(`Error: ${res.status} ${res.statusText}`);
        const json = await res.json();
        return json.data || [];
    } catch (e) {
        console.error('fetchStagesForProject failed:', e);
        return [];
    }
}

function resolveActiveStageId(projectId, stages, preferredStageId) {
    const pid = String(projectId);
    const hasStage = (id) => stages.some((s) => String(s.id) === String(id));
    if (preferredStageId && hasStage(preferredStageId)) return preferredStageId;
    const cached = PROJECT_STAGE_TABS[pid] ? PROJECT_STAGE_TABS[pid].activeStageId : null;
    if (cached && hasStage(cached)) return cached;
    return stages.length ? stages[0].id : null;
}

function renderProjectStageTabs(projectId, stages, activeStageId) {
    const container = document.getElementById('projectStageTabs');
    if (!container) return;

    if (!stages || stages.length === 0) {
        setProjectTasksActionButtonsState(false);
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    setProjectTasksActionButtonsState(true);
    container.style.display = 'flex';
    const labelText =
        (container.dataset && container.dataset.label ? String(container.dataset.label).trim() : '') || 'Stage';
    const buttonsHtml = stages
        .map((stage) => {
            const isActive = String(stage.id) === String(activeStageId);
            return `
                <button type="button"
                    class="stage-tab${isActive ? ' active' : ''}"
                    data-stage-id="${stage.id}">
                    ${escapeHtml(stage.name || '')}
                </button>
            `;
        })
        .join('');

    container.innerHTML = `<span class="stage-tabs-label">${escapeHtml(labelText)}</span>${buttonsHtml}`;
}

function setProjectTasksActionButtonsState(hasStage) {
    const ids = ['project-standard-ppap', 'project-custom-task', 'project-copy-template'];
    ids.forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.disabled = !hasStage;
        btn.style.opacity = hasStage ? '' : '0.55';
    });
}

function setActiveStageTab(projectId, stageId) {
    const pid = String(projectId);
    if (!PROJECT_STAGE_TABS[pid]) PROJECT_STAGE_TABS[pid] = {};
    PROJECT_STAGE_TABS[pid].activeStageId = stageId;
    const container = document.getElementById('projectStageTabs');
    if (!container) return;
    container.querySelectorAll('.stage-tab').forEach((btn) => {
        const isActive = String(btn.dataset.stageId) === String(stageId);
        btn.classList.toggle('active', isActive);
    });
}

function setCurrentStageState(projectId, stageId, tasks) {
    currentStageProjectId = projectId ? String(projectId) : null;
    currentStageId = stageId !== null && stageId !== undefined ? String(stageId) : null;
    currentStageTasks = Array.isArray(tasks) ? tasks.slice() : [];
}

function getCurrentStageId(projectId) {
    if (!projectId || !currentStageProjectId) return null;
    return String(currentStageProjectId) === String(projectId) ? currentStageId : null;
}

function getCurrentStageTasks(projectId) {
    if (!projectId || !currentStageProjectId) return [];
    return String(currentStageProjectId) === String(projectId) ? currentStageTasks.slice() : [];
}

function syncProjectTasksForStage(project, stageId, stageTasks) {
    if (!project) return;
    const tasks = Array.isArray(stageTasks) ? stageTasks : [];
    if (!stageId) {
        project.tasks = tasks.slice();
        project.taskCount = project.tasks.length;
        return;
    }

    const stageIdStr = String(stageId);
    const stageMap = {};
    const stageIds = new Set();
    tasks.forEach((t) => {
        if (!t || t.id === null || t.id === undefined) return;
        const idStr = String(t.id);
        stageMap[idStr] = t;
        stageIds.add(idStr);
    });

    const existing = Array.isArray(project.tasks) ? project.tasks : [];
    const replaced = existing.map((t) => {
        if (t && String(t.stageId) === stageIdStr) {
            const updated = stageMap[String(t.id)];
            return updated || t;
        }
        return t;
    });

    const cleaned = replaced.filter((t) => {
        if (!t) return false;
        if (String(t.stageId) !== stageIdStr) return true;
        return stageIds.has(String(t.id));
    });

    const existingIds = new Set(cleaned.map((t) => String(t.id)));
    tasks.forEach((t) => {
        const idStr = String(t.id);
        if (!existingIds.has(idStr)) cleaned.push(t);
    });

    project.tasks = cleaned;
    project.taskCount = project.tasks.length;
}

async function loadProjectTasksByStage(projectId, stageId, options) {
    if (!projectId) return;
    const pid = parseInt(projectId, 10);
    if (isNaN(pid)) return;
    const opts = options || {};

    const qs = stageId ? `?stageId=${encodeURIComponent(stageId)}` : '';
    const url = `/ppap-system/api/project/${pid}/tasks${qs}`;

    const container = document.getElementById('projectTasksContent');
    if (container) {
        container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary)"><i class="bi bi-hourglass-split"></i> Loading tasks...</div>`;
    }

    try {
        if (!opts.skipLoader) loader.load();
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status} ${res.statusText}`);
        const json = await res.json();
        const tasks = Array.isArray(json.data) ? json.data : [];

        setCurrentStageState(pid, stageId, tasks);
        setActiveStageTab(pid, stageId);

        const project = findProjectById(pid);
        if (project) syncProjectTasksForStage(project, stageId, tasks);

        renderProjectTasksContent(tasks, pid);
    } catch (e) {
        console.error('Failed to load tasks:', e);
        if (container) {
            container.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px"><i class="bi bi-exclamation-triangle"></i> Failed to load tasks. Please try again.</div>`;
        }
    } finally {
        if (!opts.skipLoader) loader.unload();
    }
}

async function loadProjectStagesAndTasks(projectId, preferredStageId, options) {
    const opts = options || {};
    const stagesRaw = await fetchStagesForProject(projectId);
    const stages = sortStagesByName(stagesRaw);
    if (stages.length) {
        const existing = SELECT_CACHE['/api/stages'] || [];
        const map = {};
        existing.forEach((s) => {
            if (s && s.id !== null && s.id !== undefined) map[String(s.id)] = s;
        });
        stages.forEach((s) => {
            if (s && s.id !== null && s.id !== undefined) map[String(s.id)] = s;
        });
        SELECT_CACHE['/api/stages'] = Object.values(map);
    }
    const activeStageId = resolveActiveStageId(projectId, stages, preferredStageId);
    renderProjectStageTabs(projectId, stages, activeStageId);
    if (opts.skipTasks) return;
    await loadProjectTasksByStage(projectId, activeStageId, {skipLoader: opts.skipLoader});
}

async function fetchOptions(endpoint) {
    try {
        const res = await fetch(`/ppap-system${endpoint}`);
        if (!res.ok) {
            throw new Error(`Error: ${res.status} ${res.statusText}`);
        }
        const json = await res.json();
        return json.data || [];
    } catch (error) {
        console.error(`Error calling API ${endpoint}:`, error);
        return [];
    }
}

function renderOptions(selectId, items) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentValue = select.value;

    let optionsHtml = '';
    optionsHtml += `<option value="">--Select--</option>`;
    optionsHtml += items
        .map((item) => {
            if (typeof item === 'string' || typeof item === 'number') {
                return `<option value="${item}">${item}</option>`;
            } else if (item && typeof item === 'object' && item.id && item.name) {
                return `<option value="${item.id}">${item.name}</option>`;
            }
            return '';
        })
        .join('');

    select.innerHTML = optionsHtml;
    if (currentValue) {
        select.value = currentValue;
    }
}

async function loadCftTeamsForSelect(selectId, customerId) {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    const cid = customerId ? String(customerId).trim() : '';
    if (!cid) {
        renderOptions(selectId, []);
        return;
    }

    try {
        const res = await fetch(`/ppap-system/api/cft?customerId=${encodeURIComponent(cid)}`);
        if (!res.ok) {
            throw new Error(`Error: ${res.status} ${res.statusText}`);
        }
        const json = await res.json();
        const items = json.data || [];
        renderOptions(selectId, items);
        SELECT_CACHE['/api/cft'] = items;
    } catch (error) {
        console.error('Error calling API /api/cft:', error);
        renderOptions(selectId, []);
    }
}

async function loadAllSelects() {
    const endpoints = Array.from(new Set(SELECT_CONFIGS.map((cfg) => cfg.endpoint)));
    const results = await Promise.all(endpoints.map((endpoint) => fetchOptions(endpoint)));
    const endpointResultMap = endpoints.reduce((acc, endpoint, idx) => {
        acc[endpoint] = results[idx] || [];
        return acc;
    }, {});

    SELECT_CONFIGS.forEach((cfg) => {
        const items = endpointResultMap[cfg.endpoint] || [];
        renderOptions(cfg.id, items);
        SELECT_CACHE[cfg.endpoint] = items;
    });

    const customers = endpointResultMap['/api/customers'] || [];
    SELECT_CACHE['/api/customers'] = customers;
    renderOptions('projectCustomerSelect', customers);
    renderOptions('newProjectCustomer', customers);

    try {
        const customerEl = document.getElementById('newProjectCustomer');
        const customerId = customerEl ? customerEl.value : '';
        await loadCftTeamsForSelect('newProjectCft', customerId);
    } catch (e) {}

    try {
        const filterCustomerEl = document.getElementById('projectCustomerSelect');
        const filterCustomerId = filterCustomerEl ? filterCustomerEl.value : '';
        await loadCftTeamsForSelect('sl-cft', filterCustomerId);
    } catch (e) {}

    try {
        const stages = endpointResultMap['/api/stages'] || (await fetchOptions('/api/stages'));
        renderOptions('sl-xvt', stages);
        SELECT_CACHE['/api/stages'] = stages;
    } catch (e) {}

    try {
        const statuses = endpointResultMap['/api/tasks/status'] || (await fetchOptions('/api/tasks/status'));
        renderOptions('modal-sl-status', statuses);
        SELECT_CACHE['/api/tasks/status'] = statuses;

        try {
            const projStatuses =
                endpointResultMap['/api/projects/status'] || (await fetchOptions('/api/projects/status'));
            renderOptions('ppapFilterProjectStatus', projStatuses);
            SELECT_CACHE['/api/projects/status'] = projStatuses;
        } catch (e) {}

        const priorities =
            endpointResultMap['/api/tasks/priorities'] || (await fetchOptions('/api/tasks/priorities'));
        renderOptions('modal-sl-priority', priorities);
        SELECT_CACHE['/api/tasks/priorities'] = priorities;

        try {
            const processes = endpointResultMap['/api/processes'] || (await fetchOptions('/api/processes'));
            renderOptions('sl-type', processes);
            SELECT_CACHE['/api/processes'] = processes;
        } catch (e) {}
    } catch (e) {}
}

async function createProject(customerId, name, product, model, cftId) {
    const c =
        customerId ||
        (document.getElementById('newProjectCustomer') && document.getElementById('newProjectCustomer').value);
    const n = name || (document.getElementById('newProjectName') && document.getElementById('newProjectName').value);
    const fallbackProduct =
        product !== undefined && product !== null
            ? product
            : document.getElementById('newProjectProduct') && document.getElementById('newProjectProduct').value;
    const normalizedProduct = fallbackProduct ? String(fallbackProduct).trim() : '';
    const fallbackModel =
        model !== undefined && model !== null
            ? model
            : document.getElementById('newProjectModel') && document.getElementById('newProjectModel').value;
    const normalizedModel = fallbackModel ? String(fallbackModel).trim() : '';
    const fallbackCftId =
        cftId !== undefined && cftId !== null
            ? cftId
            : document.getElementById('newProjectCft') && document.getElementById('newProjectCft').value;
    const normalizedCftId = fallbackCftId !== undefined && fallbackCftId !== null ? String(fallbackCftId).trim() : '';

    if (!c || !n) return null;

    const now = new Date();
    const _pad = (v) => String(v).padStart(2, '0');
    const nowStr = `${now.getFullYear()}/${_pad(now.getMonth() + 1)}/${_pad(now.getDate())} ${_pad(
        now.getHours()
    )}:${_pad(now.getMinutes())}:${_pad(now.getSeconds())}`;

    const payload = {customerId: mapCustomerToId(c), name: n, createdAt: nowStr};
    if (normalizedCftId) {
        const cftAsNumber = Number(normalizedCftId);
        payload.cftId = Number.isNaN(cftAsNumber) ? normalizedCftId : cftAsNumber;
    }
    if (normalizedProduct) {
        payload.product = normalizedProduct;
    }
    if (normalizedModel) {
        payload.model = normalizedModel;
    }

    try {
        const res = await fetch('/ppap-system/api/projects/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(res.statusText || 'API error');

        try {
            const json = await res.json();
            const returned = json.result || json.data || json;
            if (!returned || !returned.id) {
                console.error('createProject: No ID in response', json);
                return null;
            }

            const returnedCftId = returned.cftId || normalizedCftId || null;
            const returnedProduct = returned.product || normalizedProduct || null;
            const returnedModel = returned.model || normalizedModel || null;
            return {
                id: returned.id,
                customer: returned.customerId || c,
                name: returned.name || n,
                cftId: returnedCftId,
                product: returnedProduct,
                model: returnedModel,
                createdDate: returned.createdAt || nowStr,
                status: returned.status || 'CREATED',
                taskCount: 0,
                tasks: [],
            };
        } catch (parseErr) {
            console.error('createProject: Failed to parse response', parseErr);
            return null;
        }
    } catch (e) {
        console.error('createProject failed:', e);
        return null;
    }
}

async function saveTasksForProject(taskIds, customerId, name, projectId, stageId) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return true;
    }
    if (!projectId || projectId === null || projectId === undefined || String(projectId).trim() === '') {
        console.error('saveTasksForProject: projectId is required');
        return false;
    }

    const projectIdInt = parseInt(projectId, 10);
    if (isNaN(projectIdInt)) {
        console.error('saveTasksForProject: projectId must be a valid integer, got:', projectId);
        return false;
    }

    try {
        try {
            if (typeof loader !== 'undefined' && loader && typeof loader.load === 'function') loader.load();
        } catch (e) {}
        const qs = stageId ? `?stageId=${encodeURIComponent(stageId)}` : '';
        const url = `/ppap-system/api/projects/${projectIdInt}/update${qs}`;
        const taskIdsPayload = taskIds.map((id) => Number(id));
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(taskIdsPayload),
        });
        if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            console.error('saveTasksForProject: server returned', res.status, res.statusText, errorText);
            return false;
        }
        const result = await res.json().catch(() => null);
        console.log('saveTasksForProject: Success response:', result);
        return true;
    } catch (e) {
        console.error('saveTasksForProject failed', e);
        return false;
    } finally {
        try {
            if (typeof loader !== 'undefined' && loader && typeof loader.unload === 'function') loader.unload();
        } catch (e) {}
    }
}

async function ensureProjectPersisted(project) {
    if (!project) return null;
    const pid = project.id || project.projectId || null;
    if (pid && String(pid).trim() !== '' && !String(pid).startsWith('TEMP-')) {
        return pid;
    }

    try {
        const created = await createProject(project.customer, project.name, project.product, project.model, project.cftId);
        if (created && created.id && !String(created.id).startsWith('TEMP-')) {
            project.id = created.id;
            return project.id;
        }
    } catch (e) {}

    try {
        const params = new URLSearchParams();
        if (project.name) params.append('projectName', project.name);
        if (project.customer) params.append('customerId', mapCustomerToId(project.customer));

        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const res = await fetch(
                    '/ppap-system/api/projects' + (params.toString() ? '?' + params.toString() : '')
                );
                if (res.ok) {
                    const json = await res.json();
                    const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
                    if (list && list.length) {
                        const found = list.find(
                            (p) =>
                                String(p.name) === String(project.name) &&
                                String(p.customerId || p.customer || '') === String(mapCustomerToId(project.customer))
                        );
                        if (found && found.id && !String(found.id).startsWith('TEMP-')) {
                            project.id = found.id;
                            return project.id;
                        }
                    }
                }
            } catch (e) {}
            await new Promise((r) => setTimeout(r, 500));
        }
    } catch (e) {}

    return null;
}

let currentProject = null;
let projectList = [];
let projectListCurrentPage = 1;
let projectListPageSize = 10;
let projectListTotalItems = 0;
let projectListPaginationInstance = null;
let selectedPPAPItems = [];
let allTemplateIds = new Set();
let createModalOriginalTitleHTML = null;
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

async function fetchSignFlowItems(taskId) {
    if (!taskId) return [];
    const res = await fetch(`/ppap-system/api/tasks/${encodeURIComponent(taskId)}/sign-flow`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
}



function rangePicker($input, fromDate, toDate) {
    let start = null;
    let end = null;
    if (window.moment) {
        try {
            const mStart = window.moment((fromDate || '').split(' ')[0], 'YYYY/MM/DD', true);
            if (mStart && typeof mStart.isValid === 'function' && mStart.isValid()) start = mStart;
        } catch (e) {
            start = null;
        }

        try {
            const mEnd = window.moment((toDate || '').split(' ')[0], 'YYYY/MM/DD', true);
            if (mEnd && typeof mEnd.isValid === 'function' && mEnd.isValid()) end = mEnd;
        } catch (e) {
            end = null;
        }
    }

    const fallbackStart = window.moment
        ? window.moment().subtract(3, 'months')
        : new Date(new Date().setMonth(new Date().getMonth() - 3));

    $input.daterangepicker({
        startDate: start || fallbackStart,
        endDate: end || (window.moment ? window.moment() : new Date()),
        autoApply: false,
        locale: {format: 'YYYY/MM/DD'},
    });

    const startValue = formatDateForFilterInput(start || fallbackStart);
    const endValue = formatDateForFilterInput(end || (window.moment ? window.moment() : new Date()));
    if (typeof $input.val === 'function' && startValue && endValue) {
        $input.val(`${startValue} - ${endValue}`);
    }
}

function singlePicker($input, workDate, withTime) {
    const raw = String(workDate || '').trim();
    let start = null;
    if (window.moment) {
        try {
            const formats = withTime
                ? ['YYYY/MM/DD HH:mm:ss', 'YYYY/MM/DD HH:mm', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm']
                : ['YYYY/MM/DD', 'YYYY-MM-DD'];
            const m = window.moment(raw, formats, true);
            if (m && typeof m.isValid === 'function' && m.isValid()) start = m;
        } catch (e) {
            start = null;
        }
    }

    $input.daterangepicker({
        singleDatePicker: true,
        startDate: start || new Date(),
        autoApply: false,
        timePicker: !!withTime,
        timePicker24Hour: !!withTime,
        timePickerSeconds: !!withTime,
        locale: {format: withTime ? 'YYYY/MM/DD HH:mm:ss' : 'YYYY/MM/DD'},
    });
}

function mapCustomerToId(cust) {
    if (cust === null || cust === undefined) return '';

    const cached = findCustomerFromCache(cust);
    if (cached && cached.id !== undefined && cached.id !== null) return cached.id;

    const s = String(cust).trim().toLowerCase();
    if (s === '1' || s === 'apollo') return 1;
    if (s === '2' || s === 'rhea') return 2;
    if (s === '3' || s === 'kronos') return 3;
    const num = Number(s);
    if (!isNaN(num) && num > 0) return num;
    return cust;
}

function getEl(id) {
    return document.getElementById(id);
}
function safeSetDisplay(id, value) {
    const e = getEl(id);
    if (e && e.style) e.style.display = value;
}
function safeSetText(id, text) {
    const e = getEl(id);
    if (e) e.textContent = text;
}

function getElValue(el) {
    if (!el) return '';
    const t = el.tagName ? el.tagName.toLowerCase() : '';
    if (t === 'input' || t === 'select' || t === 'textarea') return el.value || '';
    return el.textContent || '';
}

function setElValue(el, value) {
    if (!el) return;
    const t = el.tagName ? el.tagName.toLowerCase() : '';
    if (t === 'input' || t === 'select' || t === 'textarea') el.value = value || '';
    else el.textContent = value || '';
}

async function loadProjectList(page = projectListCurrentPage, size = projectListPageSize) {
    const waitingBody =
        getEl('waitingApprovalBody') ||
        (getEl('waitingApprovalSection') && getEl('waitingApprovalSection').querySelector('tbody')) ||
        null;
    const otherBody =
        getEl('otherProjectsBody') ||
        (getEl('otherProjectsSection') && getEl('otherProjectsSection').querySelector('tbody')) ||
        null;

    if (!waitingBody && !otherBody) {
        return;
    }

    const targetPage = Number(page) || 1;
    const targetSize = Number(size) || projectListPageSize;

    projectListCurrentPage = Math.max(1, targetPage);
    projectListPageSize = Math.max(1, targetSize);

    let fetchSucceeded = false;
    let fetchedProjects = [];
    let fetchedTotal = projectListTotalItems;

    try {
        loader.load();
        const params = buildProjectFilterParams();
        params.set('page', projectListCurrentPage);
        params.set('size', projectListPageSize);

        const base = '/ppap-system/api/projects';
        const url = params.toString() ? `${base}?${params.toString()}` : base;
        const res = await fetch(url);

        if (!res.ok) {
            const message = await getApiErrorMessage(res, `Failed to load projects (${res.status})`);
            showAlertError('Failed', message);
        } else {
            const json = await res.json();
            const payload =
                (json && Array.isArray(json.data) && json.data) ||
                (json && Array.isArray(json.result) && json.result) ||
                (Array.isArray(json) && json) ||
                [];

            fetchedTotal =
                typeof json?.size === 'number'
                    ? json.size
                    : typeof json?.total === 'number'
                    ? json.total
                    : Array.isArray(payload)
                    ? payload.length
                    : 0;

            if (Array.isArray(payload)) {
                fetchedProjects = payload.map((p) => ({
                    id: p.id,
                    customer: p.customerId || 'N/A',
                    name: p.name,
                    cftId: p.cftId || '',
                    model: p.model || '',
                    product: p.product || '',
                    createdBy: p.createdBy || '',
                    createdDate: p.createdAt || '',
                    updatedAt: p.lastUpdatedAt || '',
                    status: p.status || 'N/A',
                    approvedBy: p.approvedBy || '',
                    approvedAt: p.approvedAt || '',
                    taskCount: p.taskCount || 0,
                    tasks: [],
                }));
            } else {
                fetchedProjects = [];
            }

            fetchSucceeded = true;
        }
    } catch (error) {
        console.error('loadProjectList failed', error);
        showAlertError('Error', 'Failed to load project list. Please try again.');
    } finally {
        loader.unload();
    }

    if (fetchSucceeded) {
        projectList = fetchedProjects;
        projectListTotalItems = fetchedTotal;
    }

    renderProjectListUI();
}

function buildProjectFilterParams() {
    const params = new URLSearchParams();

    try {
        const projectName =
            document.getElementById('ppapFilterProject') && document.getElementById('ppapFilterProject').value
                ? document.getElementById('ppapFilterProject').value.trim()
                : '';
        if (projectName) params.append('projectName', projectName);

        const customerId =
            document.getElementById('projectCustomerSelect') && document.getElementById('projectCustomerSelect').value
                ? document.getElementById('projectCustomerSelect').value.trim()
                : '';
        if (customerId) params.append('customerId', customerId);

        const cftIdRaw =
            document.getElementById('sl-cft') && document.getElementById('sl-cft').value
                ? document.getElementById('sl-cft').value.trim()
                : '';
        if (cftIdRaw) {
            const cftIdNum = Number(cftIdRaw);
            params.append('cftId', Number.isNaN(cftIdNum) ? cftIdRaw : String(cftIdNum));
        }

        const product =
            document.getElementById('sl-product') && document.getElementById('sl-product').value
                ? document.getElementById('sl-product').value.trim()
                : '';
        if (product) params.append('product', product);

        const model =
            document.getElementById('filter-model') && document.getElementById('filter-model').value
                ? document.getElementById('filter-model').value.trim()
                : '';
        if (model) params.append('model', model);

        const createBy =
            document.getElementById('filter-created-by') && document.getElementById('filter-created-by').value
                ? document.getElementById('filter-created-by').value.trim()
                : '';
        if (createBy) params.append('createBy', createBy);

        const createdDate =
            document.getElementById('filter-created-date') && document.getElementById('filter-created-date').value
                ? document.getElementById('filter-created-date').value.trim()
                : '';
        if (createdDate) {
            const parts = createdDate
                .split('-')
                .map((s) => s.trim())
                .filter(Boolean);
            if (parts.length === 2) {
                let start = parts[0];
                let end = parts[1];
                try {
                    if (window.moment) {
                        const ms = window.moment(start, 'YYYY/MM/DD', true);
                        const me = window.moment(end, 'YYYY/MM/DD', true);
                        if (ms && ms.isValid && ms.isValid()) start = ms.format('YYYY/MM/DD');
                        if (me && me.isValid && me.isValid()) end = me.format('YYYY/MM/DD');
                    }
                } catch (e) {}

                const startFull = DateFormatter.toAPIFormat(start + ' 00:00:00');
                const endFull = DateFormatter.toAPIFormat(end + ' 23:59:59');

                params.append('startTime', startFull);
                params.append('endTime', endFull);
            }
        }

        try {
            const projectStatusEl = document.getElementById('ppapFilterProjectStatus');
            const projectStatus = projectStatusEl && projectStatusEl.value ? projectStatusEl.value.trim() : '';
            if (projectStatus) params.append('status', projectStatus);
        } catch (e) {}
    } catch (e) {}

    return params;
}

async function filterProjects() {
    try {
        await loadProjectList(1);
    } catch (e) {
        console.error('filterProjects failed', e);
        showAlertError('Error', 'Filtering failed');
    }
}

async function clearAdvancedFilters() {
    try {
        const clearBtn = document.getElementById('clear_filter_button');
        const section = clearBtn ? clearBtn.closest('.ppap-section') : null;

        if (section) {
            const inputs = section.querySelectorAll('input, select, textarea');
            inputs.forEach((el) => {
                try {
                    if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
                    else el.value = '';
                    el.dispatchEvent(new Event('change', {bubbles: true}));
                } catch (e) {}
            });
        }

        const extraIds = [
            'ppapFilterProject',
            'projectCustomerSelect',
            'filter-model',
            'filter-created-by',
            'filter-created-date',
        ];

        extraIds.forEach((id) => {
            try {
                const el = document.getElementById(id);
                if (!el) return;
                if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
                else el.value = '';
                el.dispatchEvent(new Event('change', {bubbles: true}));
            } catch (e) {}
        });

        try {
            const createdDate = document.getElementById('filter-created-date');
            if (createdDate && window.jQuery && $(createdDate).data('daterangepicker')) {
                $(createdDate).val('');
                $(createdDate).trigger('change');
            }
        } catch (e) {}

        try {
            await loadProjectList(1);
        } catch (e) {
            console.error('clearAdvancedFilters load error', e);
        }
    } catch (e) {}
}

function renderProjectListUI() {
    const waitingBody =
        getEl('waitingApprovalBody') ||
        (getEl('waitingApprovalSection') && getEl('waitingApprovalSection').querySelector('tbody')) ||
        null;
    const otherBody =
        getEl('otherProjectsBody') ||
        (getEl('otherProjectsSection') && getEl('otherProjectsSection').querySelector('tbody')) ||
        null;

    const waitingProjects = projectList.filter((p) => p.status === 'waiting');
    const otherProjects = projectList.slice();

    if (waitingBody) {
        if (waitingProjects.length === 0) {
            waitingBody.innerHTML = `
                <tr><td colspan="11" style="text-align: center; color: var(--text-secondary); padding: 20px;">
                    ??e?S??????f????M??
                </td></tr>
            `;
        } else {
            waitingBody.innerHTML = waitingProjects
                .map((project, index) => {
                    const custName = getCustomerDisplay(project.customer);
                    const statusBadge = getStatusBadge(project.status);
                    return `
                <tr data-project-id="${project.id}" data-section="waiting" data-action="showProjectTasksModal" style="cursor:pointer">
                    <td>${index + 1}</td>
                    <td>${custName}</td>
                    <td>${project.name}</td>
                    <td>${project.model || 'N/A'}</td>
                    <td>
                        <div class="project-status-cell">${statusBadge}</div>
                    </td>
                    <td>${getUserLabelById(project.createdBy)}</td>
                    <td>${
                        project.createdDate && typeof DateFormatter !== 'undefined'
                            ? DateFormatter.toDisplayFormat(project.createdDate)
                            : project.createdDate || ''
                    }</td>
                    <td>${
                        project.updatedAt && typeof DateFormatter !== 'undefined'
                            ? DateFormatter.toDisplayFormat(project.updatedAt)
                            : project.updatedAt || ''
                    }</td>
                    <td>${getUserLabelById(project.approvedBy)}</td>
                    <td>${
                        project.approvedAt && typeof DateFormatter !== 'undefined'
                            ? DateFormatter.toDisplayFormat(project.approvedAt)
                            : project.approvedAt || ''
                    }</td>
                    <td>
                        <button class="action-btn-sm btn-success" data-action="approveProject" data-project-id="${project.id}" data-stop-prop="1">
                            <i class="bi bi-check-circle"></i> Approve
                        </button>
                        <button class="action-btn-sm btn-danger" data-action="rejectProject" data-project-id="${project.id}" data-stop-prop="1">
                            <i class="bi bi-x-circle"></i> Reject
                        </button>
                        <button class="action-btn-sm" data-action="showProjectTasksModal" data-project-id="${project.id}" data-stop-prop="1">
                            <i class="bi bi-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
                })
                .join('');
        }
    }

    if (otherBody) {
        if (otherProjects.length === 0) {
            otherBody.innerHTML = `
                <tr><td colspan="11" style="text-align: center; color: var(--text-secondary); padding: 20px;">
                    No Data!
                </td></tr>
            `;
        } else {
            otherBody.innerHTML = otherProjects
                .map((project, index) => {
                    const statusBadge = getStatusBadge(project.status);
                    const custName = getCustomerDisplay(project.customer);
                    return `
                    <tr data-project-id="${project.id}" data-section="other" data-action="showProjectTasksModal" style="cursor:pointer">
                        <td>${index + 1}</td>
                        <td>${custName}</td>
                        <td>${project.name}</td>
                        <td>${project.model || 'N/A'}</td>
                        <td>
                            <div class="project-status-cell">${statusBadge}</div>
                        </td>
                        <td>${getUserLabelById(project.createdBy)}</td>
                        <td>${
                            project.createdDate && typeof DateFormatter !== 'undefined'
                                ? DateFormatter.toDisplayFormat(project.createdDate)
                                : project.createdDate || ''
                        }</td>
                        <td>${
                            project.updatedAt && typeof DateFormatter !== 'undefined'
                                ? DateFormatter.toDisplayFormat(project.updatedAt)
                                : project.updatedAt || ''
                        }</td>
                        <td>${getUserLabelById(project.approvedBy)}</td>
                        <td>${
                            project.approvedAt && typeof DateFormatter !== 'undefined'
                                ? DateFormatter.toDisplayFormat(project.approvedAt)
                                : project.approvedAt || ''
                        }</td>
                        <td>
                            <button class="action-btn-sm" data-action="showRACIMatrix" data-project-id="${project.id}" data-stop-prop="1" title="View RACI Matrix">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="action-btn-sm btn-danger" data-action="deleteProject" data-project-id="${project.id}" data-stop-prop="1" title="Delete project">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                })
                .join('');
        }
    }

    initDragAndDrop();
    updateProjectListPagination();
}

function updateProjectListPagination() {
    const wrapper = getEl('projectListPaginationWrapper');
    const container = getEl('projectListPagination');
    if (!wrapper || !container) {
        return;
    }

    wrapper.style.display = 'flex';

    if (typeof Pagination !== 'function') {
        return;
    }

    if (!projectListPaginationInstance) {
        projectListPaginationInstance = new Pagination({
            container: container,
            totalItems: projectListTotalItems,
            itemsPerPage: projectListPageSize,
            currentPage: projectListCurrentPage,
            maxVisiblePages: 2,
            edgePageCount: 2,
            showInfo: false,
            showPerPageSelector: false,
            showGoToPage: true,
            showFirstLast: false,
            labels: {
                prev: 'Previous',
                next: 'Next',
            },
            onPageChange: async (page, itemsPerPage) => {
                await loadProjectList(page, itemsPerPage);
            },
        });
        return;
    }

    projectListPaginationInstance.update({
        totalItems: projectListTotalItems,
        currentPage: projectListCurrentPage,
        itemsPerPage: projectListPageSize,
        disabled: projectListTotalItems <= projectListPageSize,
    });
}

function getStatusBadge(status) {
    const statusClass = getStatusBadgeClass(status);
    const label = getStatusLabel(status);
    return `<span class="task-status-badge ${statusClass}">${escapeHtml(label)}</span>`;
}

function getCustomerDisplay(cust) {
    if (cust === null || cust === undefined || cust === '' || String(cust).toLowerCase() === 'n/a') return 'N/A';

    const cached = findCustomerFromCache(cust);
    if (cached && cached.name) return cached.name;

    const s = String(cust).trim();
    if (s === '1' || s.toLowerCase() === 'apollo') return 'Apollo';
    if (s === '2' || s.toLowerCase() === 'rhea') return 'Rhea';
    if (s === '3' || s.toLowerCase() === 'kronos') return 'Kronos';
    return s;
}
let draggedElement = null;

function initDragAndDrop() {
    const rows = document.querySelectorAll('tr[draggable="true"]');

    rows.forEach((row) => {
        row.removeEventListener('dragstart', handleDragStart);
        row.removeEventListener('dragover', handleDragOver);
        row.removeEventListener('drop', handleDrop);
        row.removeEventListener('dragend', handleDragEnd);

        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedElement = this;
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();

    const draggedSection = draggedElement.dataset.section;
    const targetSection = this.dataset.section;

    if (draggedSection === targetSection) {
        e.dataTransfer.dropEffect = 'move';

        const rect = this.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        if (e.clientY < midpoint) {
            this.style.borderTop = '2px solid #2196F3';
            this.style.borderBottom = '';
        } else {
            this.style.borderBottom = '2px solid #2196F3';
            this.style.borderTop = '';
        }
    }

    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    const draggedSection = draggedElement.dataset.section;
    const targetSection = this.dataset.section;

    if (draggedSection === targetSection && draggedElement !== this) {
        const rect = this.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        if (e.clientY < midpoint) {
            this.parentNode.insertBefore(draggedElement, this);
        } else {
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
        }

        updateProjectOrder(draggedSection);
    }

    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';

    document.querySelectorAll('tr[draggable="true"]').forEach((row) => {
        row.style.borderTop = '';
        row.style.borderBottom = '';
    });
}

function updateProjectOrder(section) {
    const tbody =
        section === 'waiting'
            ? document.getElementById('waitingApprovalBody')
            : document.getElementById('otherProjectsBody');

    if (!tbody) return;

    const newOrder = Array.from(tbody.querySelectorAll('tr')).map((tr) => tr.dataset.projectId);
}

function viewProjectDetails(projectId) {
    showProjectTasksModal(projectId);
}





async function deleteTaskDocument(documentId, taskId) {
    if (!documentId) return;
    const confirmRes = await Swal.fire({
        title: 'Delete',
        text: 'Do you want to delete this file?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
    });
    if (!confirmRes.isConfirmed) return;

    const currentTaskId =
        taskId ||
        (function () {
            const modal = document.getElementById('taskDetailModal');
            return modal ? modal.dataset.taskId : null;
        })();

    try {
        loader.load();
        const url = `/ppap-system/api/documents/${encodeURIComponent(documentId)}/delete?delOrigin=false`;
        const res = await fetch(url, {method: 'POST'});

        if (!res.ok) {
            const message = await getApiErrorMessage(res, `Failed to delete document (${res.status})`);
            throw new Error(message);
        }

        let json = null;
        try {
            json = await res.json();
        } catch (e) {}

        const serverOk = json ? json.status === 'OK' || json.success === true || json.result === 'OK' : true;
        if (!serverOk) {
            const message = extractApiMessage(json) || 'Server reported failure when deleting document.';
            throw new Error(message);
        }

        showAlertSuccess('Deleted', 'Document deleted successfully');
        if (currentTaskId) {
            await fetchAndRenderAttachments(currentTaskId);
        }
    } catch (e) {
        console.error('deleteTaskDocument error', e);
        showAlertError('Failed', e && e.message ? e.message : 'Failed to delete document.');
    } finally {
        loader.unload();
    }
}

async function showProjectTasksModal(projectId) {
    if (!projectId || projectId === 'null' || projectId === 'undefined') {
        showAlertWarning('Warning', 'Invalid project ID');
        return;
    }

    const parsedId = parseInt(projectId, 10);
    if (isNaN(parsedId)) {
        showAlertWarning('Warning', 'Invalid project ID');
        return;
    }

    const project = findProjectById(projectId);

    try {
        const pidEl = document.getElementById('pt_detail_projectId');
        const setAndDisable = (id, val) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = val || '';
                el.disabled = true;
            }
        };

        if (project) {
            const customerName = getCustomerDisplay(project.customer);
            const customerIdForCft = mapCustomerToId(project.customer);
            const cftMap = project.cftId ? await ensureCftNameMapForCustomer(customerIdForCft) : null;
            const cftName =
                project.cftId && cftMap ? cftMap[String(project.cftId).trim()] || '' : '';

            if (pidEl) pidEl.value = project.id;
            setAndDisable('pt_detail_customer', customerName);
            setAndDisable('pt_detail_cft', cftName || project.cftId || '');
            setAndDisable('pt_detail_projectName', project.name || '');
            setAndDisable('pt_detail_product', project.product || '');
            setAndDisable('pt_detail_createdDate', project.createdDate || '');
            setAndDisable('pt_detail_status', project.status || '');
            setAndDisable('pt_detail_model', project.model || 'N/A');
        } else {
            const ids = [
                'pt_detail_projectId',
                'pt_detail_customer',
                'pt_detail_cft',
                'pt_detail_projectName',
                'pt_detail_product',
                'pt_detail_createdDate',
                'pt_detail_status',
            ];
            ids.forEach((id) => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = '';
                    el.disabled = true;
                }
            });
        }
    } catch (e) {}

    try {
        const modalEl = document.getElementById('projectTasksModal');
        if (modalEl) {
            const footer = modalEl.querySelector('.modal-footer');
            const statusVal = project && project.status ? String(project.status).toUpperCase() : '';
            const waiting =
                statusVal === 'WAITING_FOR_APPROVAL' ||
                statusVal === 'WAITING' ||
                (statusVal.indexOf('WAIT') !== -1 && statusVal.indexOf('APPROVAL') !== -1);
            const onGoing = statusVal === 'ON_GOING';

            const saveBtn = footer ? footer.querySelector('button[data-action="saveProjectTaskQuantity"]') : null;
            const submitBtn = footer ? footer.querySelector('button[data-action="projectTasksSubmit"]') : null;

            let approveBtn = footer ? footer.querySelector('#pt_approve_btn') : null;
            let rejectBtn = footer ? footer.querySelector('#pt_reject_btn') : null;
            if (footer && !rejectBtn) {
                rejectBtn = document.createElement('button');
                rejectBtn.id = 'pt_reject_btn';
                rejectBtn.className = 'btn action-btn';
                rejectBtn.type = 'button';
                rejectBtn.innerHTML = '<i class="bi bi-x-circle"></i> Reject';
                rejectBtn.style.backgroundColor = '#dc3545';
                rejectBtn.style.color = 'white';
                rejectBtn.style.display = 'none';
                rejectBtn.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    if (project && project.id) rejectProject(project.id);
                });
                footer.appendChild(rejectBtn);
            }

            if (footer && !approveBtn) {
                approveBtn = document.createElement('button');
                approveBtn.id = 'pt_approve_btn';
                approveBtn.className = 'btn action-btn';
                approveBtn.type = 'button';
                approveBtn.innerHTML = '<i class="bi bi-check-circle"></i> Approve';
                approveBtn.style.display = 'none';
                approveBtn.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    if (project && project.id) approveProject(project.id);
                });
                footer.appendChild(approveBtn);
            }

            if (waiting) {
                if (saveBtn) saveBtn.style.display = 'none';
                if (submitBtn) submitBtn.style.display = 'none';
                if (approveBtn) approveBtn.style.display = 'inline-flex';
                if (rejectBtn) rejectBtn.style.display = 'inline-flex';
            } else {
                if (saveBtn) saveBtn.style.display = '';
                if (submitBtn) submitBtn.style.display = onGoing ? 'none' : '';
                if (approveBtn) approveBtn.style.display = 'none';
                if (rejectBtn) rejectBtn.style.display = 'none';
            }
        }
    } catch (e) {}

    openProjectTasksModal();

    try {
        const url = new URL(window.location.href);
        url.searchParams.set('projectId', String(projectId));
        window.history.pushState({projectId: projectId}, '', url.toString());
    } catch (e) {}

    try {
        loader.load();
        const res = await fetch(`/ppap-system/api/project/${projectId}/tasks`);

        if (!res.ok) throw new Error(`Status ${res.status} ${res.statusText}`);

        const json = await res.json();
        const tasks = Array.isArray(json.data) ? json.data : [];

        if (project) {
            project.tasks = tasks.slice();
            project.taskCount = tasks.length;
        }

        if (currentProject && String(currentProject.id) === String(projectId)) {
            selectedPPAPItems = tasks.slice();
        }
    } catch (e) {
        console.error('Failed to load tasks:', e);
        const container = document.getElementById('projectTasksContent');
        if (container) {
            container.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px"><i class="bi bi-exclamation-triangle"></i> Failed to load tasks. Please try again.</div>`;
        }
    } finally {
        loader.unload();
    }

    try {
        await loadProjectStagesAndTasks(projectId, null, {skipLoader: true});
    } catch (e) {}
}

function renderProjectTasksContent(tasks, projectId) {
    const container = document.getElementById('projectTasksContent');
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `<div class="text-center" style="color:var(--text-secondary)">This project has no tasks.</div>`;
    } else {
        const rows = tasks
            .map((t, index) => {
                if (t) t.step = index + 1;

                const statusClass = getStatusBadgeClass(t.status);
                const statusLabel = getStatusLabel(t.status);
                const statusBadge = `<span class="task-status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>`;

                const priorityClass = getPriorityBadgeClass(t.priority);
                const priorityLabel = getPriorityLabel(t.priority);
                const priorityBadge = `<span class="priority-badge ${priorityClass}">${escapeHtml(
                    priorityLabel
                )}</span>`;

                const stageName = escapeHtml(getStageName(t.stageId) || '');
                const processName = escapeHtml(getProcessName(t.processId) || '');
                const driDisplay = escapeHtml(getUserLabelById(t.dri) || t.dri || '');

                return `
            <tr draggable="true" 
                data-task-id="${t.id}" 
                data-task-index="${index}"
                data-action="showTaskDetailModal"
                data-project-id="${projectId}">
                <td class="drag-handle" style="width:36px;text-align:center;cursor:grab" data-action="stopPropagation" data-stop-prop="1">
                    <i class="bi bi-grip-vertical" title="Drag" aria-hidden="true"></i>
                </td>
                <td style="width:48px">${t.step || index + 1}</td>
                <td>${escapeHtml(t.taskCode || '')}</td>
                <td>${escapeHtml(t.name || '')}</td>
                <td>${stageName}</td>
                <td>${processName}</td>
                <td>${statusBadge}</td>
                <td>${priorityBadge}</td>
                <td>${driDisplay}</td>
                <td>${escapeHtml(t.dueDate || '')}</td>
                <td style="text-align:center">
                    <button class="action-btn-sm btn-danger" data-action="removeTaskFromProject" data-project-id="${projectId}" data-task-id="${t.id}" data-stop-prop="1" title="Remove">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
            })
            .join('');

        container.innerHTML = `
            <table id="projectTasksTable" class="table mt-0">
                <thead>
                    <tr>
                        <th></th>
                        <th>#</th>
                        <th>${PROJECT_TASK_TABLE_LABELS.taskNum}</th>
                        <th>${PROJECT_TASK_TABLE_LABELS.taskName}</th>
                        <th>${PROJECT_TASK_TABLE_LABELS.stage}</th>
                        <th>${PROJECT_TASK_TABLE_LABELS.process}</th>
                        <th>${PROJECT_TASK_TABLE_LABELS.status}</th>
                        <th>${PROJECT_TASK_TABLE_LABELS.priority}</th>
                        <th>${PROJECT_TASK_TABLE_LABELS.dri}</th>
                        <th>${PROJECT_TASK_TABLE_LABELS.deadline}</th>
                        <th>${PROJECT_TASK_TABLE_LABELS.actions}</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;

        try {
            if (!document.getElementById('ppap-drag-handle-style')) {
                const style = document.createElement('style');
                style.id = 'ppap-drag-handle-style';
                style.innerHTML = `.drag-handle { cursor: grab; } .drag-handle:active { cursor: grabbing; }`;
                document.head.appendChild(style);
            }
        } catch (e) {}

        initProjectTasksDragAndDrop(projectId);
    }
}

async function refreshStageOptions(projectId) {
    const stages = await fetchOptions('/api/stages');
    let mergedStages = stages;

    if (projectId) {
        const projectStages = await fetchStagesForProject(projectId);
        const map = {};
        stages.forEach((s) => {
            if (s && s.id !== null && s.id !== undefined) map[String(s.id)] = s;
        });
        projectStages.forEach((s) => {
            if (s && s.id !== null && s.id !== undefined) map[String(s.id)] = s;
        });
        mergedStages = Object.values(map);
    }

    SELECT_CACHE['/api/stages'] = mergedStages;
    renderOptions('sl-xvt', mergedStages);
    renderOptions('custom-sl-xvt', mergedStages);
    renderOptions('ppapFilterStage', mergedStages);
}



async function handleCreateStageConfirm() {
    const modalEl = document.getElementById('createStageModal');
    const input = modalEl ? modalEl.querySelector('#new-stage-name') : null;
    const name = input ? String(input.value || '').trim() : '';

    if (!name) {
        showAlertWarning('Warning', 'Stage name is required');
        if (input && typeof input.focus === 'function') input.focus();
        return;
    }

    const projectId = document.getElementById('pt_detail_projectId')?.value;
    const parsedProjectId = projectId ? parseInt(projectId, 10) : null;
    if (!parsedProjectId || Number.isNaN(parsedProjectId)) {
        showAlertWarning('Warning', 'Project ID not found');
        return;
    }

    try {
        loader.load();
        const res = await fetch('/ppap-system/api/stages/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({name: name, projectId: parsedProjectId}),
        });

        if (!res.ok) {
            const message = await getApiErrorMessage(res, `Create stage failed (${res.status})`);
            showAlertError('Failed', message);
            return;
        }

        let json = null;
        try {
            json = await res.json();
        } catch (e) {}

        if (json && (json.status === 'ERROR' || json.success === false)) {
            const message = extractApiMessage(json) || 'Failed to create stage';
            showAlertError('Failed', message);
            return;
        }

        showAlertSuccess('Success', 'Stage created successfully');
        safeHideModal(modalEl);
        const createdStage = json ? json.data || json.result || null : null;
        const createdStageId = createdStage && createdStage.id ? createdStage.id : null;
        await refreshStageOptions(parsedProjectId);
        await loadProjectStagesAndTasks(parsedProjectId, createdStageId, {skipLoader: true});
    } catch (e) {
        console.error('Create stage error:', e);
        showAlertError('Failed', e && e.message ? e.message : 'Failed to create stage');
    } finally {
        loader.unload();
    }
}

let draggedProjectTask = null;

function initProjectTasksDragAndDrop(projectId) {
    const table = document.getElementById('projectTasksTable');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr[draggable="true"]');

    rows.forEach((row) => {
        row.removeEventListener('dragstart', handleProjectTaskDragStart);
        row.removeEventListener('dragover', handleProjectTaskDragOver);
        row.removeEventListener('drop', handleProjectTaskDrop);
        row.removeEventListener('dragend', handleProjectTaskDragEnd);

        row.addEventListener('dragstart', handleProjectTaskDragStart);
        row.addEventListener('dragover', handleProjectTaskDragOver);
        row.addEventListener('drop', function (e) {
            return handleProjectTaskDrop.call(this, e, projectId);
        });
        row.addEventListener('dragend', handleProjectTaskDragEnd);
    });
}

function handleProjectTaskDragStart(e) {
    draggedProjectTask = this;
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function handleProjectTaskDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    if (!draggedProjectTask) return false;

    const rect = this.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (e.clientY < midpoint) {
        this.style.borderTop = '2px solid #2196F3';
        this.style.borderBottom = '';
    } else {
        this.style.borderBottom = '2px solid #2196F3';
        this.style.borderTop = '';
    }

    return false;
}

function handleProjectTaskDrop(e, projectId) {
    if (e.stopPropagation) e.stopPropagation();
    if (!draggedProjectTask || draggedProjectTask === this) return false;

    const rect = this.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (e.clientY < midpoint) {
        this.parentNode.insertBefore(draggedProjectTask, this);
    } else {
        this.parentNode.insertBefore(draggedProjectTask, this.nextSibling);
    }

    updateProjectTaskOrder(projectId);

    try {
        const tasks = getCurrentStageTasks(projectId);
        renderProjectTasksContent(tasks, projectId);
    } catch (e) {}

    document.querySelectorAll('#projectTasksTable tbody tr').forEach((r) => {
        r.style.borderTop = '';
        r.style.borderBottom = '';
    });

    return false;
}

function handleProjectTaskDragEnd(e) {
    this.style.opacity = '1';
    document.querySelectorAll('#projectTasksTable tbody tr').forEach((r) => {
        r.style.borderTop = '';
        r.style.borderBottom = '';
    });
    draggedProjectTask = null;
}

function updateProjectTaskOrder(projectId) {
    const project = findProjectById(projectId);
    if (!project || !project.tasks) return;

    const tbody = document.querySelector('#projectTasksTable tbody');
    if (!tbody) return;

    const newOrder = Array.from(tbody.querySelectorAll('tr')).map((tr) => tr.dataset.taskId);

    const taskMap = {};
    project.tasks.forEach((t) => {
        taskMap[String(t.id)] = t;
    });

    const orderedStageTasks = newOrder.map((id) => taskMap[String(id)]).filter(Boolean);
    const stageId = getCurrentStageId(projectId);
    setCurrentStageState(projectId, stageId, orderedStageTasks);
    if (stageId && projectId) {
        STANDARD_PPAP_STAGE_BY_PROJECT[String(projectId)] = stageId;
    }

    if (!stageId) {
        project.tasks = orderedStageTasks;
    } else {
        const stageIdStr = String(stageId);
        let stageIndex = 0;
        project.tasks = project.tasks.map((t) => {
            if (t && String(t.stageId) === stageIdStr) {
                const replacement = orderedStageTasks[stageIndex++];
                return replacement || t;
            }
            return t;
        });
    }

    orderedStageTasks.forEach((t, idx) => {
        try {
            t.step = idx + 1;
        } catch (e) {}
    });
}

function openProjectTasksModal() {
    try {
        const modal = new bootstrap.Modal(document.getElementById('projectTasksModal'));
        modal.show();
    } catch (e) {
        const el = document.getElementById('projectTasksModal');
        if (el) el.classList.add('active');
    }
}

function showEditTaskModal(projectId, taskId) {
    const project = projectList.find((p) => String(p.id) === String(projectId));
    if (!project) {
        showAlertError('Error', 'Project not found');
        return;
    }
    const task = (project.tasks || []).find((t) => String(t.id) === String(taskId));
    if (!task) {
        showAlertError('Error', 'Task not found');
        return;
    }

    getEl('editTaskProjectId').value = projectId;
    getEl('editTaskId').value = taskId;
    getEl('editTaskCode').value = task.taskCode || '';
    getEl('editTaskName').value = task.name || '';
    getEl('editTaskDesc').value = task.description || '';
    getEl('editTaskStatus').value = task.status || '';
    getEl('editTaskPriority').value = task.priority || '';

    try {
        new bootstrap.Modal(document.getElementById('editTaskModal')).show();
    } catch (e) {
        const el = document.getElementById('editTaskModal');
        if (el) el.classList.add('active');
    }
}
function showTaskDetailModal(projectId, taskId) {
    if (typeof openTaskDetail !== 'function') {
        return;
    }

    return openTaskDetail(taskId, projectId, {
        onBeforeOpen: ({taskId, projectId}) => {
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('taskId', String(taskId));
                window.history.pushState({taskId, projectId: projectId || null}, '', url.toString());
            } catch (e) {}
        },
    });
}



function saveEditedTask() {
    const projectId = getEl('editTaskProjectId').value;
    const taskId = getEl('editTaskId').value;
    const project = projectList.find((p) => String(p.id) === String(projectId));
    if (!project) {
        showAlertError('Error', 'Project not found');
        return;
    }

    const code = getEl('editTaskCode').value;
    const name = getEl('editTaskName').value;
    const desc = getEl('editTaskDesc').value;
    const status = getEl('editTaskStatus').value;
    const priority = getEl('editTaskPriority').value;

    if (!taskId) {
        const newId = 'T-' + Date.now();
        const newTask = {
            id: newId,
            taskCode: code,
            name: name,
            description: desc,
            status: status,
            priority: priority,
        };
        project.tasks = project.tasks || [];
        project.tasks.push(newTask);
        project.taskCount = project.tasks.length;

        try {
            bootstrap.Modal.getInstance(getEl('editTaskModal')).hide();
        } catch (e) {
            getEl('editTaskModal').classList.remove('active');
        }
        showProjectTasksModal(projectId);
        showAlertSuccess('Success', 'Task added successfully');
        return;
    }

    const taskIndex = (project.tasks || []).findIndex((t) => String(t.id) === String(taskId));
    if (taskIndex === -1) {
        showAlertError('Error', 'Task not found');
        return;
    }

    const updated = {
        ...project.tasks[taskIndex],
        taskCode: code,
        name: name,
        description: desc,
        status: status,
        priority: priority,
    };

    project.tasks[taskIndex] = updated;

    try {
        bootstrap.Modal.getInstance(getEl('editTaskModal')).hide();
    } catch (e) {
        getEl('editTaskModal').classList.remove('active');
    }
    showProjectTasksModal(projectId);
    showAlertSuccess('Success', 'Task saved');
}



// window.saveTaskDetailChanges = saveTaskDetailChanges;



function isInProgressStatus(statusVal) {
    if (statusVal === null || statusVal === undefined) return false;
    const s = String(statusVal).trim().toLowerCase();
    if (!s) return false;
    return s === 'in_progress' || s === 'in-progress' || s.includes('progress');
}

function isWaitingForApprovalStatus(statusVal) {
    if (statusVal === null || statusVal === undefined) return false;
    const s = String(statusVal).trim().toLowerCase();
    if (!s) return false;
    if (s === 'waiting_for_approval' || s === 'waiting-for-approval') return true;
    if (s === 'waiting') return true;
    return s.includes('waiting') && s.includes('approval');
}

function isCompletedStatus(statusVal) {
    const normalized = normalizeStatus(statusVal);
    return normalized === 'COMPLETED';
}









async function saveProjectTaskQuantity() {
    const pidEl = getEl('pt_detail_projectId');
    let project = null;
    if (pidEl && pidEl.value) project = projectList.find((p) => String(p.id) === String(pidEl.value));
    if (!project) {
        const projName = getEl('pt_detail_projectName') ? getElValue(getEl('pt_detail_projectName')) : null;
        if (!projName) {
            showAlertError('Error', 'Project not found');
            return;
        }
        project = projectList.find((p) => p.name === projName);
    }
    if (!project) {
        showAlertError('Error', 'Project not found');
        return;
    }

    const dCustomer = getEl('pt_detail_customer');
    const dProject = getEl('pt_detail_projectName');
    const dCreated = getEl('pt_detail_createdDate');
    const qtyEl = getEl('pt_detail_taskQty');

    const custVal = getElValue(dCustomer).trim();
    const projVal = getElValue(dProject).trim();
    const createdVal = getElValue(dCreated).trim();

    if (custVal) project.customer = custVal;
    if (projVal) project.name = projVal;
    if (createdVal) project.createdDate = createdVal;

    const v = qtyEl ? Number(qtyEl.value) : null;
    if (v !== null && !isNaN(v) && v >= 0) project.taskCount = v;

    try {
        const projectIdValue = project && project.id ? project.id : pidEl ? pidEl.value : null;
        const stageId =
            (projectIdValue && STANDARD_PPAP_STAGE_BY_PROJECT[String(projectIdValue)]) ||
            (projectIdValue ? getCurrentStageId(projectIdValue) : null);
        const sourceTasks = Array.isArray(project.tasks) ? project.tasks : [];
        const scopedTasks = stageId ? getStageTasksFromList(sourceTasks, stageId) : sourceTasks;
        const taskIds = scopedTasks.map((item) => String(item.id)).filter((id) => id && String(id).trim() !== '');

        if (taskIds.length > 0) {
            const resolvedId = await ensureProjectPersisted(project);
            if (!resolvedId) {
                showAlertError('Failed', 'Unable to save tasks for project: project id not found on server');
            } else {
                const customerIdForSave = mapCustomerToId(project.customer);
                const saveOk = await saveTasksForProject(
                    taskIds,
                    customerIdForSave,
                    project.name,
                    resolvedId,
                    stageId
                );
                if (saveOk) {
                    showAlertSuccess('Success', 'Project details and tasks updated successfully');
                    if (stageId) delete STANDARD_PPAP_STAGE_BY_PROJECT[String(resolvedId)];
                    await loadProjectList();
                    try {
                        if (project && project.id) {
                            await showProjectTasksModal(project.id);
                        }
                    } catch (e) {}
                }
            }
        } else {
            showAlertSuccess('Success', 'Project details updated successfully');
            await loadProjectList();
            try {
                if (project && project.id) {
                    await showProjectTasksModal(project.id);
                } else {
                    renderProjectTasksContent(project.tasks || [], project.id || '');
                }
            } catch (e) {}
        }
    } catch (e) {
        console.error('Error while saving project tasks:', e);
        showAlertError('Error', 'Project details updated locally but saving tasks failed. See console for details.');
    }
}

function showAddTaskModal(projectId) {
    let pid = projectId;
    if (!pid) {
        const pidEl = getEl('pt_detail_projectId');
        if (pidEl && pidEl.value) pid = pidEl.value;
        else {
            const projName = getEl('pt_detail_projectName') ? getElValue(getEl('pt_detail_projectName')) : null;
            const p = projectList.find((pp) => pp.name === projName);
            pid = p ? p.id : null;
        }
    }
    if (!pid) {
        showAlertError('Error', 'Project not found');
        return;
    }

    getEl('editTaskProjectId').value = pid;
    getEl('editTaskId').value = '';
    getEl('editTaskCode').value = '';
    getEl('editTaskName').value = '';
    getEl('editTaskDesc').value = '';
    getEl('editTaskStatus').value = '';
    getEl('editTaskPriority').value = '';

    try {
        new bootstrap.Modal(document.getElementById('editTaskModal')).show();
    } catch (e) {
        const el = document.getElementById('editTaskModal');
        if (el) el.classList.add('active');
    }
}

async function removeTaskFromProject(projectId, taskId) {
    const project = projectList.find((p) => String(p.id) === String(projectId));
    if (!project) return;

    if (!confirm('Do you want to delete ?')) return;

    try {
        const res = await fetch(`/ppap-system/api/tasks/delete?id=${encodeURIComponent(taskId)}`, {
            method: 'POST',
        });

        if (!res.ok) {
            const message = await getApiErrorMessage(res, `Failed to delete task (${res.status})`);
            showAlertError('Failed', message);
            return;
        }

        let json = null;
        try {
            json = await res.json();
        } catch (e) {}

        const serverOk = json ? json.status === 'OK' || json.success === true || json.result === 'OK' : true;
        if (!serverOk) {
            const message = extractApiMessage(json) || 'Server reported failure when deleting task.';
            showAlertError('Failed', message);
            return;
        }

        project.tasks = (project.tasks || []).filter((t) => String(t.id) !== String(taskId));
        project.taskCount = project.tasks.length;

        const activeStageId = getCurrentStageId(projectId);
        loadProjectTasksByStage(projectId, activeStageId, {skipLoader: true});
    } catch (e) {
        console.error('Error', e);
        showAlertError('Error', 'Error while deleting task. See console for details.');
    }
}

async function projectTasksSubmit() {
    const pidEl = getEl('pt_detail_projectId');
    if (!pidEl || !pidEl.value) {
        showAlertWarning('Warning', 'Project ID not found');
        return;
    }

    const projectId = parseInt(pidEl.value, 10);
    if (isNaN(projectId)) {
        showAlertWarning('Warning', 'Invalid project ID');
        return;
    }

    const result = await Swal.fire({
        title: 'Submit Project',
        text: 'Are you sure you want to submit this project?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Submit',
        cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
        return;
    }

    try {
        const res = await fetch(`/ppap-system/api/projects/submit?id=${projectId}`, {
            method: 'POST',
        });

        if (!res.ok) {
            const message = await getApiErrorMessage(res, `Submit failed (${res.status})`);
            throw new Error(message);
        }

        let json = null;
        try {
            json = await res.json();
        } catch (e) {}

        const success = json ? json.status === 'OK' || json.success === true : true;

        if (!success) {
            const message = extractApiMessage(json) || 'Server reported failure when submitting project';
            showAlertError('Failed', message);
            return;
        }

        const project = projectList.find((p) => String(p.id) === String(projectId));
        if (project) {
            project.status = 'submitted';
            loadProjectList();
        }

        try {
            bootstrap.Modal.getInstance(getEl('projectTasksModal')).hide();
        } catch (e) {
            const el = getEl('projectTasksModal');
            if (el) el.classList.remove('active');
        }

        showAlertSuccess('Success', 'Project submitted successfully');
    } catch (e) {
        console.error('Failed to submit project:', e);
        showAlertError('Failed', e && e.message ? e.message : 'Failed to submit project. Please try again.');
    }
}

function openTaskDetailFromProject(taskId) {
    const modalEl = document.getElementById('taskDetailModal');
    if (!modalEl) {
        showAlertError('Error', 'Modal not found');
        return;
    }

    if (modalEl.parentElement !== document.body) document.body.appendChild(modalEl);

    const elems = Array.from(document.querySelectorAll('.modal, .modal-backdrop'));
    let highest = 1040;
    elems.forEach((el) => {
        const z = window.getComputedStyle(el).zIndex;
        const zi = parseInt(z, 10);
        if (!isNaN(zi) && zi > highest) highest = zi;
    });

    const backdropZ = highest + 1;
    const modalZ = highest + 2;

    function onShown() {
        try {
            modalEl.style.zIndex = modalZ;
            const backdrops = document.querySelectorAll('.modal-backdrop');
            if (backdrops && backdrops.length) {
                const lastBackdrop = backdrops[backdrops.length - 1];
                lastBackdrop.style.zIndex = backdropZ;
            }
        } catch (e) {}
        modalEl.removeEventListener('shown.bs.modal', onShown);
    }
    modalEl.addEventListener('shown.bs.modal', onShown);

    if (typeof window.showTaskDetail === 'function') {
        try {
            window.showTaskDetail(taskId);
        } catch (e) {}
    } else if (typeof window.openPermissionTask === 'function') {
        try {
            window.openPermissionTask('', taskId, '');
        } catch (e) {}
    } else {
        try {
            new bootstrap.Modal(modalEl).show();
        } catch (e) {
            modalEl.classList.add('active');
        }
    }
}

function showCreateProjectForm() {
    const modalEl = getEl('createProjectModal');
    if (!modalEl) {
        safeSetDisplay('projectListSection', 'none');
        safeSetDisplay('createProjectSection', 'block');
        safeSetDisplay('operationOptionsSection', 'none');
        return;
    }

    const customerEl = document.getElementById('newProjectCustomer');
    const nameEl = document.getElementById('newProjectName');
    if (customerEl) customerEl.value = '';
    if (nameEl) nameEl.value = '';
    currentProject = null;
    selectedPPAPItems = [];
    const metaEl = getEl('createProjectModalMeta');
    if (metaEl) {
        metaEl.textContent = '';
        if (metaEl.style) metaEl.style.display = 'none';
    }
    renderSelectedTasksInModal();

    safeSetDisplay('createProjectStep1', 'block');
    safeSetDisplay('createProjectStep2', 'none');
    safeSetDisplay('createBackBtn', 'none');
    safeSetDisplay('createNextBtn', 'inline-flex');
    safeSetDisplay('createSaveBtn', 'none');

    try {
        var bs = new bootstrap.Modal(modalEl);
        bs.show();
    } catch (e) {
        modalEl.classList.add('active');
    }
    try {
        const labelEl = getEl('createProjectModalLabel');
        if (labelEl && !createModalOriginalTitleHTML) createModalOriginalTitleHTML = labelEl.innerHTML;
    } catch (e) {}
}

function cancelCreateProject() {
    if (confirm('Cancel ?')) {
        resetToProjectList();
    }
}

function resetToProjectList() {
    safeSetDisplay('projectListSection', 'block');
    safeSetDisplay('createProjectSection', 'none');
    safeSetDisplay('operationOptionsSection', 'none');

    currentProject = null;
    selectedPPAPItems = [];
}

function closeCreateProjectModal() {
    try {
        const modalEl = document.getElementById('createProjectModal');
        const inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
        else modalEl.classList.remove('active');
    } catch (e) {
        console.error('Failed to close create project modal', e);
    }
    const metaEl = getEl('createProjectModalMeta');
    if (metaEl) {
        metaEl.textContent = '';
        if (metaEl.style) metaEl.style.display = 'none';
    }
    resetToProjectList();
}

async function saveProjectBasicInfoModal() {
    const customer = document.getElementById('newProjectCustomer').value;
    const name = document.getElementById('newProjectName').value;
    const cftId = document.getElementById('newProjectCft').value;
    const product = document.getElementById('newProjectProduct').value.trim();
    const model = document.getElementById('newProjectModel').value.trim();

    if (!customer || !name || !product || !model || !cftId) {
        showAlertWarning(
            'Warning',
            'Please fill all required fields (Customer, Project Name, CFT Team, Product, Model)'
        );
        return;
    }

    const created = await createProject(customer, name, product, model, cftId);

    if (!created) {
        showAlertError('Failed', 'Please try again.');
        return;
    }

    currentProject = {
        id: created.id || created.projectId,
        customer: created.customerId || customer,
        name: created.name || name,
        createdDate: created.createdAt ? created.createdAt.split(' ')[0] : new Date().toISOString().split('T')[0],
        status: created.status || 'draft',
        taskCount: 0,
        tasks: [],
        cftId: created.cftId || cftId,
        product: created.product || product,
        model: created.model || model,
    };

    const existingIndex = projectList.findIndex((p) => String(p.id) === String(currentProject.id));
    if (existingIndex !== -1) {
        projectList[existingIndex] = currentProject;
    } else {
        projectList.push(currentProject);
    }

    const projectId = currentProject.id;

    await loadProjectList();

    showAlertSuccess('Success', 'Project created successfully!');
    closeCreateProjectModal();
    await showProjectTasksModal(projectId);
}

function createModalBackToStep1() {
    safeSetDisplay('createProjectStep1', 'block');
    safeSetDisplay('createProjectStep2', 'none');
    safeSetDisplay('createBackBtn', 'none');
    safeSetDisplay('createNextBtn', 'inline-flex');
    safeSetDisplay('createSaveBtn', 'none');
    const metaEl = getEl('createProjectModalMeta');
    if (metaEl) {
        metaEl.textContent = '';
        if (metaEl.style) metaEl.style.display = 'none';
    }
    const labelEl = getEl('createProjectModalLabel');
    if (labelEl && createModalOriginalTitleHTML) labelEl.innerHTML = createModalOriginalTitleHTML;
}

async function submitProjectFromModal() {
    if (!currentProject || !currentProject.id) {
        return;
    }

    if (!selectedPPAPItems || selectedPPAPItems.length === 0) {
        showAlertWarning('Warning', 'Please select at least one task');
        return;
    }

    const taskIds = selectedPPAPItems.map((item) => String(item.id)).filter((id) => id && String(id).trim() !== '');

    try {
        const resolvedId = await ensureProjectPersisted(currentProject);
        if (!resolvedId) {
            showAlertError('Failed', 'Please try again');
            return;
        }

        const customerIdForSave = mapCustomerToId(currentProject.customer);
        const saveOk = await saveTasksForProject(taskIds, customerIdForSave, currentProject.name, resolvedId, null);
        if (!saveOk) {
            showAlertError('Failed', 'Failed to add tasks. Please try again.');
            return;
        }

        currentProject.tasks = selectedPPAPItems.slice();
        currentProject.taskCount = selectedPPAPItems.length;

        const existingIndex = projectList.findIndex((p) => String(p.id) === String(currentProject.id));
        if (existingIndex !== -1) {
            projectList[existingIndex] = currentProject;
        } else {
            projectList.push(currentProject);
        }

        showAlertSuccess(
            'Success',
            `Project "${currentProject.name}" saved successfully with ${selectedPPAPItems.length} tasks.`
        );

        closeCreateProjectModal();
        await loadProjectList();
    } catch (e) {
        console.error('Failed to submit project:', e);
        showAlertError('Failed', 'Failed to submit project. Please try again.');
    }
}

function renderSelectedTasksInModal() {
    const container = document.getElementById('selectedTasksList');
    if (!container) return;
    if (!selectedPPAPItems || selectedPPAPItems.length === 0) {
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Project</th>
                        <th>Stage</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>DRI</th>
                        <th>Deadline</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="9" style="text-align:center;color:var(--text-secondary);padding:18px">No tasks selected. Please add tasks from the Operation Options.</td></tr>
                </tbody>
            </table>
        `;
        return;
    }

    const header = `
        <h5 style="margin-bottom: 12px; color: var(--text-primary);">
            <i class="bi bi-list-task"></i> List Tasks
        </h5>
        <table id="selectedTasksTable" class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Project</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>DRI</th>
                    <th>Deadline</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    const rows = selectedPPAPItems
        .map((item) => {
            const projectText = currentProject ? currentProject.customer || '' : '';
            const stage = getStageName(item.stageId) || item.stage || item.stageName || '';
            const dri = item.dri || '';
            const deadline = item.deadline || '';
            return `
            <tr draggable="true" data-task-id="${item.id}">
                <td class="task-id-cell">${item.id}</td>
                <td>${item.name || ''}</td>
                <td>${projectText}</td>
                <td>${stage}</td>
                <td>${item.status || ''}</td>
                <td>${item.priority || ''}</td>
                <td>${dri}</td>
                <td>${deadline}</td>
                <td style="text-align:center"><button class="action-btn-sm" data-action="removeSelectedTask" data-task-id="${item.id}" title="Remove"><i class="bi bi-trash"></i></button></td>
            </tr>
        `;
        })
        .join('');

    const footer = `
            </tbody>
        </table>
    `;

    container.innerHTML = header + rows + footer;
    initSelectedTasksDragAndDrop();
}

function removeSelectedTask(taskId) {
    selectedPPAPItems = selectedPPAPItems.filter((t) => String(t.id) !== String(taskId));
    renderSelectedTasksInModal();
}

function initSelectedTasksDragAndDrop() {
    const rows = document.querySelectorAll('#selectedTasksTable tbody tr');
    rows.forEach((row) => {
        row.removeEventListener('dragstart', handleTaskDragStart);
        row.removeEventListener('dragover', handleTaskDragOver);
        row.removeEventListener('drop', handleTaskDrop);
        row.removeEventListener('dragend', handleTaskDragEnd);

        row.addEventListener('dragstart', handleTaskDragStart);
        row.addEventListener('dragover', handleTaskDragOver);
        row.addEventListener('drop', handleTaskDrop);
        row.addEventListener('dragend', handleTaskDragEnd);
    });
}

function handleTaskDragStart(e) {
    draggedTaskRow = this;
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function handleTaskDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    if (!draggedTaskRow) return;

    const rect = this.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (e.clientY < midpoint) {
        this.style.borderTop = '2px solid #2196F3';
        this.style.borderBottom = '';
    } else {
        this.style.borderBottom = '2px solid #2196F3';
        this.style.borderTop = '';
    }
    return false;
}

function handleTaskDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (!draggedTaskRow || draggedTaskRow === this) return false;

    const rect = this.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (e.clientY < midpoint) {
        this.parentNode.insertBefore(draggedTaskRow, this);
    } else {
        this.parentNode.insertBefore(draggedTaskRow, this.nextSibling);
    }

    const tbody = document.querySelector('#selectedTasksTable tbody');
    const newOrder = Array.from(tbody.querySelectorAll('tr')).map((tr) => tr.dataset.taskId);
    const map = {};
    selectedPPAPItems.forEach((item) => {
        if (item && item.id) map[String(item.id)] = item;
    });
    selectedPPAPItems = newOrder.map((id) => map[String(id)]).filter(Boolean);

    document.querySelectorAll('#selectedTasksTable tbody tr').forEach((r) => {
        r.style.borderTop = '';
        r.style.borderBottom = '';
    });

    return false;
}

function handleTaskDragEnd(e) {
    this.style.opacity = '1';
    document.querySelectorAll('#selectedTasksTable tbody tr').forEach((r) => {
        r.style.borderTop = '';
        r.style.borderBottom = '';
    });
    draggedTaskRow = null;
}

function saveProjectBasicInfo() {
    const customer = document.getElementById('newProjectCustomer').value;
    const name = document.getElementById('newProjectName').value;
    const cftId = document.getElementById('newProjectCft').value;
    const product = document.getElementById('newProjectProduct').value.trim();
    const model = document.getElementById('newProjectModel').value.trim();

    if (!customer || !name || !product || !model || !cftId) {
        showAlertWarning(
            'Warning',
            'Please fill all required fields (Customer, Project Name, CFT Team, Product, Model)'
        );
        return;
    }

    currentProject = {
        id: generateProjectId(),
        customer: customer,
        name: name,
        createdDate: new Date().toISOString().split('T')[0],
        status: 'draft',
        taskCount: 0,
        cftId: cftId,
        product: product,
        model: model,
    };

    safeSetDisplay('createProjectSection', 'none');
    safeSetDisplay('operationOptionsSection', 'block');
}

function generateProjectId() {
    return 'TEMP-' + Date.now();
}

function cancelProjectCreation() {
    if (confirm('Are you sure you want to cancel project creation? All selected tasks will be cleared.')) {
        resetToProjectList();
    }
}

async function submitProject() {
    if (!currentProject) {
        showAlertWarning('Warning', 'Please save basic project info first');
        return;
    }
    if (selectedPPAPItems.length === 0) {
        showAlertWarning('Warning', 'Please select at least one PPAP item or add a custom task');
        return;
    }

    currentProject.taskCount = selectedPPAPItems.length;
    currentProject.status = 'waiting';
    const taskIds = selectedPPAPItems.map((item) => String(item.id)).filter((id) => id && String(id).trim() !== '');

    let resolvedId = null;
    if (currentProject.id && !String(currentProject.id).startsWith('TEMP-')) {
        resolvedId = currentProject.id;
    } else {
        const created = await createProject(
            currentProject.customer,
            currentProject.name,
            currentProject.product,
            currentProject.model,
            currentProject.cftId
        );
        if (created && created.id) {
            currentProject.id = created.id;
            resolvedId = created.id;
        } else {
            showAlertError('Failed', 'Failed to create project on server. Please try again.');
            return;
        }
    }

    const customerIdForSave = mapCustomerToId(currentProject.customer);
    const saveOk = await saveTasksForProject(taskIds, customerIdForSave, currentProject.name, resolvedId, null);
    if (!saveOk) {
        showAlertError('Failed', 'Saving tasks to project failed. Please try again.');
        return;
    }

    const existingIndex = projectList.findIndex((p) => String(p.id) === String(currentProject.id));
    if (existingIndex !== -1) {
        projectList[existingIndex] = currentProject;
    } else {
        projectList.push(currentProject);
    }

    showAlertSuccess(
        'Success',
        `Project "${currentProject.name}" saved successfully, containing ${currentProject.taskCount} tasks`
    );
    resetToProjectList();
    await loadProjectList();
}

async function showStandardPPAP() {
    const modal = document.getElementById('standardPPAPModal');
    const grid = document.getElementById('ppapTasksGrid');

    if (grid) grid.innerHTML = '<div class="ppap-loading">???J??..</div>';

    const pidEl = getEl('pt_detail_projectId');
    const projectId = pidEl && pidEl.value ? String(pidEl.value) : null;
    const activeStageId = projectId ? getCurrentStageId(projectId) : null;
    currentStandardPpapStageId = activeStageId;
    currentStandardPpapProjectId = projectId;

    if (pidEl && pidEl.value) {
        const project = projectList.find((p) => String(p.id) === String(pidEl.value));
        if (project && Array.isArray(project.tasks) && project.tasks.length > 0) {
            selectedPPAPItems = getStageTasksFromList(project.tasks, activeStageId);
        }
    } else if (currentProject && Array.isArray(currentProject.tasks) && currentProject.tasks.length > 0) {
        selectedPPAPItems = currentProject.tasks.slice();
    }

    const preservedIds = new Set();
    try {
        (selectedPPAPItems || []).forEach((i) => {
            if (!i) return;
            const templateId = getTemplateIdFromTask(i);
            if (templateId) preservedIds.add(String(templateId));
        });

        if (currentProject && Array.isArray(currentProject.tasks))
            currentProject.tasks.forEach((i) => {
                if (!i) return;
                const templateId = getTemplateIdFromTask(i);
                if (templateId) preservedIds.add(String(templateId));
            });

        if (pidEl && pidEl.value) {
            const project = projectList.find((p) => String(p.id) === String(pidEl.value));
            if (project && Array.isArray(project.tasks))
                project.tasks.forEach((i) => {
                    if (!i) return;
                    if (!isTaskInStage(i, activeStageId)) return;
                    const templateId = getTemplateIdFromTask(i);
                    if (templateId) preservedIds.add(String(templateId));
                });
        }
    } catch (e) {}

    let tasks = [];
    try {
        const res = await fetch('/ppap-system/api/tasks/templates');
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        tasks = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        tasks = tasks.map((item) => ({
            id: item.id,
            taskCode: item.taskCode || '',
            name: item.name || '',
            description: item.description || '',
            status: item.status || '',
            priority: item.priority || '',
        }));
        allTemplateIds = new Set(tasks.map((t) => String(t.id)));
    } catch (e) {
        tasks = standardPPAPTasks;
    }

    if (grid) {
        const originalTasks = Array.isArray(tasks) ? tasks.slice() : [];

        function renderTaskList(list) {
            grid.innerHTML = (Array.isArray(list) ? list : [])
                .map((task) => {
                    const isChecked = preservedIds.has(String(task.id)) ? 'checked' : '';
                    const status = task.status || '';
                    const priority = task.priority || '';
                    return `
                    <div class="ppap-task-card">
                        <label>
                            <input type="checkbox" class="ppap-checkbox" value="${task.id}" data-status="${status}" data-priority="${priority}" ${isChecked}>
                            <div class="ppap-task-info">
                                <div class="ppap-task-id">${task.taskCode}</div>
                                <div class="ppap-task-name">${task.name}</div>
                                <div class="ppap-task-desc">${task.description}</div>
                            </div>
                        </label>
                    </div>
                `;
                })
                .join('');

            try {
                const boxes = grid.querySelectorAll('.ppap-checkbox');
                boxes.forEach((cb) => cb.addEventListener('change', handlePPAPCheckboxChange));
            } catch (e) {}
        }

        renderTaskList(originalTasks);

        try {
            const input = document.getElementById('filter-standard-ppap');
            if (input) {
                if (input._ppapFilterListener) {
                    input.removeEventListener('input', input._ppapFilterListener);
                }

                input.value = '';

                const listener = function (ev) {
                    const q = ev && ev.target && ev.target.value ? String(ev.target.value).trim().toLowerCase() : '';
                    if (!q) {
                        renderTaskList(originalTasks);
                        return;
                    }

                    const filtered = originalTasks.filter((t) => {
                        const n = (t.name || '').toString().toLowerCase();
                        const d = (t.description || '').toString().toLowerCase();
                        return n.indexOf(q) !== -1 || d.indexOf(q) !== -1;
                    });
                    renderTaskList(filtered);
                };

                input._ppapFilterListener = listener;
                input.addEventListener('input', listener);
            }
        } catch (e) {}
    }

    try {
        openModalAbove(modal);
    } catch (e) {
        console.error('Bootstrap Modal show error:', e);
        if (modal) modal.classList.add('active');
    }
}

function closeStandardPPAP() {
    var modalEl = document.getElementById('standardPPAPModal');
    var bsModal = bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();
}

function openModalAbove(modalRef) {
    const modalEl = typeof modalRef === 'string' ? document.getElementById(modalRef) : modalRef;
    if (!modalEl) return null;

    const shown = Array.from(document.querySelectorAll('.modal.show'));
    let topZ = 1040;
    shown.forEach((m) => {
        const z = parseInt(window.getComputedStyle(m).zIndex, 10);
        if (!isNaN(z) && z > topZ) topZ = z;
    });

    const modalZ = topZ + 20;
    modalEl.style.zIndex = modalZ;

    const bsModal = new bootstrap.Modal(modalEl);

    modalEl.addEventListener('hidden.bs.modal', function cleanupBackdrop() {
        setTimeout(() => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            const openModals = document.querySelectorAll('.modal.show');

            if (backdrops.length > openModals.length) {
                for (let i = openModals.length; i < backdrops.length; i++) {
                    if (backdrops[i] && backdrops[i].parentNode) {
                        backdrops[i].parentNode.removeChild(backdrops[i]);
                    }
                }
            }

            if (openModals.length === 0) {
                document.body.classList.remove('modal-open');
                document.body.style.paddingRight = '';
                document.body.style.overflow = '';
            }
        }, 100);

        modalEl.removeEventListener('hidden.bs.modal', cleanupBackdrop);
    });

    bsModal.show();

    setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length) {
            const last = backdrops[backdrops.length - 1];
            last.style.zIndex = modalZ - 10;
        }
    }, 10);

    return bsModal;
}

function selectAllPPAP() {
    document.querySelectorAll('.ppap-checkbox').forEach((cb) => {
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));
    });
}

function deselectAllPPAP() {
    document.querySelectorAll('.ppap-checkbox').forEach((cb) => {
        cb.checked = false;
        cb.dispatchEvent(new Event('change'));
    });
}

function handlePPAPCheckboxChange(e) {
    const cb = e && e.target ? e.target : null;
    if (!cb) return;

    const card = cb.closest('.ppap-task-card');
    const info = card ? card.querySelector('.ppap-task-info') : null;
    const nameEl = info ? info.querySelector('.ppap-task-name') : null;
    const codeEl = info ? info.querySelector('.ppap-task-id') : null;
    const descEl = info ? info.querySelector('.ppap-task-desc') : null;
    const status = cb.dataset.status || '';
    const priority = cb.dataset.priority || '';

    const map = {};
    (selectedPPAPItems || []).forEach((i) => {
        if (i && i.id) map[String(i.id)] = i;
    });

    const item = {
        id: String(cb.value),
        taskCode: codeEl ? codeEl.textContent.trim() : '',
        name: nameEl ? nameEl.textContent.trim() : String(cb.value),
        description: descEl ? descEl.textContent.trim() : '',
        status: status,
        priority: priority,
        step: Object.keys(map).length + 1,
    };
    if (currentStandardPpapStageId) {
        const stageIdInt = parseInt(currentStandardPpapStageId, 10);
        item.stageId = Number.isNaN(stageIdInt) ? currentStandardPpapStageId : stageIdInt;
    }

    if (cb.checked) {
        map[String(item.id)] = item;
    } else {
        delete map[String(item.id)];
    }

    selectedPPAPItems = Object.values(map);

    selectedPPAPItems.forEach((task, idx) => {
        if (task) task.step = idx + 1;
    });

    try {
        renderSelectedTasksInModal();
    } catch (err) {}
}

function confirmPPAPSelection() {
    const checked = Array.from(document.querySelectorAll('.ppap-checkbox:checked'));

    if (checked.length === 0) {
        showAlertWarning('Warning', 'Please select at least one PPAP item');
        return;
    }

    const stageIdRaw = currentStandardPpapStageId;
    const stageIdInt = stageIdRaw ? parseInt(stageIdRaw, 10) : null;
    const stageId = !Number.isNaN(stageIdInt) ? stageIdInt : stageIdRaw;

    const selectedTemplateTasks = checked.map((cb) => {
        const card = cb.closest('.ppap-task-card');
        const info = card ? card.querySelector('.ppap-task-info') : null;
        const nameEl = info ? info.querySelector('.ppap-task-name') : null;
        const codeEl = info ? info.querySelector('.ppap-task-id') : null;
        const descEl = info ? info.querySelector('.ppap-task-desc') : null;
        const status = cb.dataset.status || '';
        const priority = cb.dataset.priority || '';
        return {
            id: String(cb.value),
            taskCode: codeEl ? codeEl.textContent.trim() : '',
            name: nameEl ? nameEl.textContent.trim() : cb.value,
            description: descEl ? descEl.textContent.trim() : '',
            status: status,
            priority: priority,
            isTemplate: true,
            parentId: String(cb.value),
            stageId: stageId || null,
        };
    });

    let existingTasks = [];
    const pidEl = getEl('pt_detail_projectId');
    if (pidEl && pidEl.value) {
        const project = projectList.find((p) => String(p.id) === String(pidEl.value));
        if (project && Array.isArray(project.tasks)) {
            existingTasks = project.tasks.slice();
        }
    } else if (currentProject && Array.isArray(currentProject.tasks)) {
        existingTasks = currentProject.tasks.slice();
    }

    const stageTasks = getStageTasksFromList(existingTasks, stageId);
    const otherStageTasks = stageId ? existingTasks.filter((t) => !isTaskInStage(t, stageId)) : [];

    const existingTemplateIds = new Set();
    stageTasks.forEach((t) => {
        if (!t) return;
        const templateId = getTemplateIdFromTask(t);
        if (templateId) existingTemplateIds.add(String(templateId));
    });

    const newTemplates = selectedTemplateTasks.filter((t) => {
        const templateId = String(t.id);
        return !existingTemplateIds.has(templateId);
    });

    const selectedTemplateIds = new Set(selectedTemplateTasks.map((t) => String(t.id)));
    const keptStageTasks = stageTasks.filter((t) => {
        if (!t) return false;
        const templateId = getTemplateIdFromTask(t);
        if (templateId) return selectedTemplateIds.has(String(templateId));
        return true;
    });

    const mergedStageTasks = [...keptStageTasks, ...newTemplates];

    mergedStageTasks.forEach((task, idx) => {
        if (task) task.step = idx + 1;
    });

    const mergedTasks = stageId ? [...otherStageTasks, ...mergedStageTasks] : mergedStageTasks;

    selectedPPAPItems = mergedTasks;

    const addedCount = newTemplates.length;
    const message =
        addedCount > 0
            ? `Added ${addedCount} new PPAP items (total: ${mergedTasks.length} tasks)`
            : `No new items added (total: ${mergedTasks.length} tasks)`;
    showAlertSuccess('Success', message);

    renderSelectedTasksInModal();

    const projectTasksModal = document.getElementById('projectTasksModal');
    if (projectTasksModal && projectTasksModal.classList.contains('show')) {
        if (pidEl && pidEl.value) {
            const project = projectList.find((p) => String(p.id) === String(pidEl.value));
            if (project) {
                project.tasks = mergedTasks.slice();
                project.taskCount = mergedTasks.length;
                setCurrentStageState(project.id, stageId, mergedStageTasks);
                renderProjectTasksContent(mergedStageTasks, project.id);
                if (stageId) {
                    STANDARD_PPAP_STAGE_BY_PROJECT[String(project.id)] = stageId;
                } else {
                    delete STANDARD_PPAP_STAGE_BY_PROJECT[String(project.id)];
                }
            }
        }
    }

    closeStandardPPAP();

    if (currentProject) {
        currentProject.tasks = mergedTasks.slice();
        currentProject.taskCount = mergedTasks.length;
    }
}

async function showCustomTask() {
    var modal = document.getElementById('customTaskModal');
    try {
        await loadCustomTaskSelects();
        const bs = openModalAbove(modal);
        try {
            setTimeout(() => {
                initDeadlinePicker();
                initCustomDriSelect2();
            }, 60);
        } catch (e) {}
    } catch (e) {
        console.error(e);
        try {
            if (modal) {
                var mm = new bootstrap.Modal(modal);
                mm.show();
            }
        } catch (err) {}
    }
}

async function loadCustomTaskSelects() {
    try {
        const departments = SELECT_CACHE['/api/departments'] || (await fetchOptions('/api/departments'));
        const processes = SELECT_CACHE['/api/processes'] || (await fetchOptions('/api/processes'));
        const priorities = SELECT_CACHE['/api/tasks/priorities'] || (await fetchOptions('/api/tasks/priorities'));
        let stages = SELECT_CACHE['/api/stages'] || (await fetchOptions('/api/stages'));

        SELECT_CACHE['/api/departments'] = departments;
        SELECT_CACHE['/api/processes'] = processes;
        SELECT_CACHE['/api/tasks/priorities'] = priorities;
        SELECT_CACHE['/api/stages'] = stages;

        renderOptions('custom-sl-department', departments);
        renderOptions('custom-sl-process', processes);
        renderOptions('custom-sl-priority', priorities);
        renderOptions('custom-sl-xvt', stages);
    } catch (e) {}
}

function closeCustomTask() {
    var modalEl = document.getElementById('customTaskModal');
    var bsModal = bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();
}

function showCopyTemplate() {
    var modal = document.getElementById('copyTemplateModal');
    loadCopyTemplateSelects();
    try {
        openModalAbove(modal);
    } catch (e) {
        console.error(e);
        if (modal) {
            var mm = new bootstrap.Modal(modal);
            mm.show();
        }
    }
}

async function loadCopyTemplateSelects() {
    try {
        const customers = await fetchOptions('/api/customers');

        const sourceCustomerSelect = document.getElementById('source-customer');
        const targetCustomerSelect = document.getElementById('target-customer');

        if (sourceCustomerSelect && targetCustomerSelect) {
            const customerOptions =
                '<option value="">Please select</option>' +
                customers.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
            sourceCustomerSelect.innerHTML = customerOptions;
            targetCustomerSelect.innerHTML = customerOptions;
        }

        const projects = await fetchOptions('/api/projects');

        const sourceProjectSelect = document.getElementById('source-project-number');
        const targetProjectSelect = document.getElementById('target-project-number');

        if (sourceProjectSelect && targetProjectSelect) {
            const projectOptions =
                '<option value="">Please select</option>' +
                projects.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
            sourceProjectSelect.innerHTML = projectOptions;
            targetProjectSelect.innerHTML = projectOptions;
        }

        const stages = await fetchOptions('/api/stages');

        const sourceStageSelect = document.getElementById('source-xvt-stage');
        const targetStageSelect = document.getElementById('target-xvt-stage');

        if (sourceStageSelect && targetStageSelect) {
            const stageOptions =
                '<option value="">Please select</option>' +
                stages.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
            sourceStageSelect.innerHTML = stageOptions;
            targetStageSelect.innerHTML = stageOptions;
        }

        const processes = await fetchOptions('/api/processes');

        const sourceProcessSelect = document.getElementById('source-process');
        const targetProcessSelect = document.getElementById('target-process');

        if (sourceProcessSelect && targetProcessSelect) {
            const processOptions =
                '<option value="">Please select</option>' +
                processes.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
            sourceProcessSelect.innerHTML = processOptions;
            targetProcessSelect.innerHTML = processOptions;
        }
    } catch (error) {
        console.error('Error loading copy template selects:', error);
        showAlertError('Error', 'Failed to load data for copy template');
    }
}

function closeCopyTemplate() {
    var modalEl = document.getElementById('copyTemplateModal');
    var bsModal = bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();
}

async function confirmCopyProject() {
    const sourceProjectId = document.getElementById('source-project-number')?.value;
    const sourceStageId = document.getElementById('source-xvt-stage')?.value;
    const sourceProcessId = document.getElementById('source-process')?.value;

    const targetProjectId = document.getElementById('target-project-number')?.value;
    const targetStageId = document.getElementById('target-xvt-stage')?.value;
    const targetProcessId = document.getElementById('target-process')?.value;

    if (
        !sourceProjectId ||
        !sourceStageId ||
        !sourceProcessId ||
        !targetProjectId ||
        !targetStageId ||
        !targetProcessId
    ) {
        showAlertWarning('Warning', 'Please fill in all required fields');
        return;
    }

    try {
        const params = new URLSearchParams({
            sourceId: sourceProjectId,
            sourceProcessId: sourceStageId,
            sourceStageId: sourceProcessId,
            targetId: targetProjectId,
            targetProcessId: targetStageId,
            targetStageId: targetProcessId,
        });

        const response = await fetch(`/ppap-system/api/projects/copy?${params.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const message = await getApiErrorMessage(response, `Failed to copy project (${response.status})`);
            throw new Error(message);
        }

        const result = await response.json();

        showAlertSuccess('Success', 'Project copied successfully');
        closeCopyTemplate();

        await loadProjectList();
    } catch (error) {
        console.error('Error copying project:', error);
        showAlertError('Error', error && error.message ? error.message : 'Failed to copy project');
    }
}

function showRACIMatrix(projectId) {
    showRACIMatrixForProject(projectId);
}

function showRACIMatrixFromProject() {
    const projectIdEl = document.getElementById('pt_detail_projectId');
    if (!projectIdEl || !projectIdEl.value) {
        showAlertError('Error', 'Project ID not found');
        return;
    }
    showRACIMatrixForProject(projectIdEl.value);
}

let currentRACIData = {};
let currentRACIProjectId = null;
let currentRACISelection = '';
const RACI_EMPTY_PLACEHOLDER = '<span class="raci-cell raci-empty"></span>';

function initRaciSelection(defaultValue = '') {
    const select = document.getElementById('raci-selection');
    if (!select) return;

    currentRACISelection = defaultValue || select.value || '';

    if (select._raciChangeHandler) {
        select.removeEventListener('change', select._raciChangeHandler);
    }

    const handler = (ev) => {
        currentRACISelection = ev.target.value || '';
    };

    select._raciChangeHandler = handler;
    select.value = currentRACISelection;
    select.addEventListener('change', handler);
}

async function loadRACIMatrixData(projectId) {
    const modal = document.getElementById('raciMatrixModal');
    const theadRow = modal.querySelector('thead tr');
    const tbody = document.getElementById('raciMatrixBody');

    currentRACIProjectId = projectId;

    const project = findProjectById(projectId);
    const projectName = project ? project.name : '';

    const modalTitle = modal.querySelector('#raciMatrixModalLabel span:last-child');
    if (modalTitle) {
        const originalText = modalTitle.textContent.split(' - ')[0];
        if (projectName) {
            modalTitle.textContent = `${originalText} - ${projectName}`;
        } else {
            modalTitle.textContent = originalText;
        }
    }

    const departments = SELECT_CACHE['/api/departments'] || [];
    if (departments.length === 0) {
        const deptRes = await fetch('/ppap-system/api/departments');
        if (deptRes.ok) {
            const deptJson = await deptRes.json();
            SELECT_CACHE['/api/departments'] = deptJson.data || [];
            departments.push(...SELECT_CACHE['/api/departments']);
        }
    }

    const tasksRes = await fetch(`/ppap-system/api/project/${projectId}/tasks`);
    if (!tasksRes.ok) {
        throw new Error(`Failed to fetch tasks: ${tasksRes.status}`);
    }
    const tasksJson = await tasksRes.json();
    const tasks = tasksJson.data || [];

    const raciRes = await fetch(`/ppap-system/api/project/${projectId}/task-raci`);
    if (!raciRes.ok) {
        throw new Error(`Failed to fetch RACI data: ${raciRes.status}`);
    }
    const raciJson = await raciRes.json();
    const raciData = raciJson.data || [];

    currentRACIData = {};
    raciData.forEach((raci) => {
        const key = `${raci.taskId}_${raci.departmentId}`;
        currentRACIData[key] = {
            id: raci.id,
            raci: raci.raci || '',
            taskId: raci.taskId,
            departmentId: raci.departmentId,
        };
    });

    if (theadRow) {
        theadRow.innerHTML = `
            <th style="min-width: 150px;position:sticky">Task</th>
            ${departments.map((dept) => `<th style="max-width: 80px">${dept.name || dept.id}</th>`).join('')}
        `;
    }

    tbody.innerHTML = tasks
        .map((task) => {
            return `
            <tr>
                <td>${task.name || task.id}</td>
                ${departments
                    .map((dept) => {
                        const key = `${task.id}_${dept.id}`;
                        const raciObj = currentRACIData[key];
                        const raciValue = raciObj ? raciObj.raci : '';

                        return `<td class="raci-editable-cell" data-task-id="${task.id}" data-dept-id="${
                            dept.id
                        }" style="cursor: pointer; min-height: 40px; vertical-align: middle;">
                            ${
                                raciValue
                                    ? `<span class="raci-cell raci-badge raci-${raciValue.toLowerCase()}">${raciValue}</span>`
                                    : RACI_EMPTY_PLACEHOLDER
                            }
                        </td>`;
                    })
                    .join('')}
            </tr>
        `;
        })
        .join('');

    tbody.querySelectorAll('.raci-editable-cell').forEach((cell) => {
        cell.addEventListener('click', handleRACICellClick);
    });
}

async function showRACIMatrixForProject(projectId) {
    if (!projectId || projectId === 'null' || projectId === 'undefined') {
        showAlertWarning('Warning', 'Invalid project ID');
        return;
    }

    const modal = document.getElementById('raciMatrixModal');

    try {
        loader.load();

        await loadRACIMatrixData(projectId);

        loader.unload();

        const existingModals = document.querySelectorAll('.modal.show');
        let maxZ = 1040;

        existingModals.forEach((m) => {
            const z = parseInt(window.getComputedStyle(m).zIndex || '1040', 10);
            if (z > maxZ) maxZ = z;
        });

        const newModalZ = maxZ + 20;
        const newBackdropZ = maxZ + 10;

        modal.style.zIndex = newModalZ;

        const bsModal = new bootstrap.Modal(modal, {
            backdrop: 'static',
            keyboard: true,
        });

        bsModal.show();
        currentRACISelection = '';
        initRaciSelection('');

        setTimeout(() => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            if (backdrops.length > 0) {
                const lastBackdrop = backdrops[backdrops.length - 1];
                lastBackdrop.style.zIndex = newBackdropZ;
            }
        }, 50);
    } catch (e) {
        loader.unload();
        console.error('Error showing RACI Matrix:', e);
        showAlertError('Error', 'Failed to load RACI Matrix: ' + (e.message || e));
    }
}

function handleRACICellClick(e) {
    const cell = e.currentTarget;
    const taskId = cell.dataset.taskId;
    const deptId = cell.dataset.deptId;
    const key = `${taskId}_${deptId}`;

    const selectEl = document.getElementById('raci-selection');
    const selectedRaci = selectEl ? selectEl.value : currentRACISelection;

    if (selectedRaci === undefined || selectedRaci === null) {
        return;
    }

    const nextRaci = selectedRaci;

    if (!currentRACIData[key]) {
        currentRACIData[key] = {
            taskId: parseInt(taskId),
            departmentId: parseInt(deptId),
            raci: nextRaci,
        };
    } else {
        currentRACIData[key].raci = nextRaci;
    }

    if (nextRaci) {
        cell.innerHTML = `<span class="raci-cell raci-badge raci-${nextRaci.toLowerCase()}">${nextRaci}</span>`;
    } else {
        cell.innerHTML = RACI_EMPTY_PLACEHOLDER;
    }
}

function closeRACIMatrix() {
    try {
        var modalEl = document.getElementById('raciMatrixModal');
        var instance = bootstrap.Modal.getInstance(modalEl);
        if (instance) instance.hide();
        else modalEl.classList.remove('active');
    } catch (e) {
        console.error('Bootstrap Modal hide error:', e);
        document.getElementById('raciMatrixModal').classList.remove('active');
    }
}

function saveRACIMatrix() {
    if (!currentRACIProjectId) {
        showAlertError('Error', 'Project ID not found');
        return;
    }

    try {
        loader.load();
        const raciItems = [];
        Object.values(currentRACIData).forEach((item) => {
            if (!item) return;

            const v = (item.raci ?? '').trim();

            if (v !== '') {
                const raciItem = {
                departmentId: item.departmentId,
                taskId: item.taskId,
                raci: v,
                flag: null,
                };
            if (item.id) raciItem.id = item.id;
            raciItems.push(raciItem);
            return;
            }

            if (item.id) {
                raciItems.push({
                id: item.id,
                departmentId: item.departmentId,
                taskId: item.taskId,
                raci: '',
                flag: null,
                });
            }
        });

        fetch('/ppap-system/api/task-raci/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(raciItems),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to save RACI: ${response.status}`);
                }
                return response.json();
            })
            .then(async (result) => {
                showAlertSuccess('Success', 'RACI Matrix saved successfully');
                await loadRACIMatrixData(currentRACIProjectId);
                loader.unload();
            })
            .catch((error) => {
                loader.unload();
                console.error('Error saving RACI Matrix:', error);
                showAlertError('Error', 'Failed to save RACI Matrix: ' + (error.message || error));
            });
    } catch (e) {
        loader.unload();
        console.error('Error in saveRACIMatrix:', e);
        showAlertError('Error', 'Failed to save RACI Matrix');
    }
}

async function approveProject(projectId) {
    const result = await Swal.fire({
        title: 'Approve Project',
        text: 'Are you sure you want to approve this project?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Approve',
        cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch('/ppap-system/api/projects/approve?id=' + encodeURIComponent(projectId), {
            method: 'POST',
        });

        if (!res.ok) {
            const message = await getApiErrorMessage(res, `Approve API returned ${res.status}`);
            showAlertError('Failed', message);
            return;
        }

        showAlertSuccess('Approved', 'Project approved successfully');
        const project = projectList.find((p) => String(p.id) === String(projectId));
        if (project) project.status = 'approved';
        await loadProjectList();
        try {
            if (
                document.getElementById('projectTasksModal') &&
                bootstrap.Modal.getInstance(document.getElementById('projectTasksModal'))
            )
                bootstrap.Modal.getInstance(document.getElementById('projectTasksModal')).hide();
        } catch (e) {}
    } catch (e) {
        console.error('Approve API error', e);
        showAlertError('Failed', 'Failed to call approve API: ' + (e && e.message ? e.message : e));
    }
}

async function rejectProject(projectId) {
    const result = await Swal.fire({
        title: 'Reject Project',
        text: 'Are you sure you want to reject this project?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Reject',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc3545',
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch('/ppap-system/api/projects/return?id=' + encodeURIComponent(projectId), {
            method: 'POST',
        });

        if (!res.ok) {
            const message = await getApiErrorMessage(res, `Return API returned ${res.status}`);
            showAlertError('Failed', message);
            return;
        }

        showAlertWarning('Rejected', 'Project has been returned/rejected');
        const project = projectList.find((p) => String(p.id) === String(projectId));
        if (project) project.status = 'rejected';
        await loadProjectList();
        try {
            if (
                document.getElementById('projectTasksModal') &&
                bootstrap.Modal.getInstance(document.getElementById('projectTasksModal'))
            )
                bootstrap.Modal.getInstance(document.getElementById('projectTasksModal')).hide();
        } catch (e) {}
    } catch (e) {
        console.error('Return API error', e);
        showAlertError('Failed', 'Failed to call return API: ' + (e && e.message ? e.message : e));
    }
}

async function deleteProject(projectId) {
    const project = projectList.find((p) => String(p.id) === String(projectId));
    if (!project) {
        return;
    }

    const confirmation = await Swal.fire({
        title: 'Delete Project',
        text: `Delete project "${project.name}"? This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc3545',
    });

    if (!confirmation.isConfirmed) return;

    try {
        const bodyId = parseInt(projectId, 10);
        if (isNaN(bodyId)) {
            return;
        }

        const url = `/ppap-system/api/projects/delete?id=${encodeURIComponent(bodyId)}`;
        const res = await fetch(url, {method: 'POST'});

        console.debug('deleteProject: response status', res.status, res.statusText);

        if (!res.ok) {
            const message = await getApiErrorMessage(res, `Delete failed (${res.status})`);
            throw new Error(message);
        }

        let ok = true;
        let json = null;
        try {
            json = await res.json();
            console.debug('deleteProject: response json', json);
            if (json && (json.status === 'ERROR' || json.success === false)) ok = false;
        } catch (e) {}

        if (!ok) {
            const message = extractApiMessage(json) || 'Server reported failure when deleting project.';
            showAlertError('Failed', message);
            return;
        }

        projectList = projectList.filter((p) => String(p.id) !== String(projectId));
        showAlertSuccess('Success', `Project "${project.name}" has been deleted`);
        await loadProjectList();
    } catch (e) {
        console.error('Failed to delete project:', e);
        showAlertError('Failed', e && e.message ? e.message : 'Failed to delete project. Please try again.');
    }
}

function initDeadlinePicker() {
    const ids = ['deadLine', 'custom-deadline'];

    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const withTime = id === 'deadLine';

        try {
            const raw = String(el.value || '').trim();
            if (raw === '-' || raw.toUpperCase() === 'N/A') el.value = '';
        } catch (e) {}

        try {
            if (window.jQuery && $(el).data('daterangepicker')) {
                try {
                    $(el).data('daterangepicker').remove();
                } catch (err) {}
                try {
                    $(el).off('apply.daterangepicker cancel.daterangepicker');
                } catch (err) {}
            }
        } catch (e) {}

        try {
            if (el._flatpickr) {
                try {
                    el._flatpickr.destroy();
                } catch (err) {}
            }
        } catch (e) {}

        if (window.jQuery && typeof window.jQuery.fn.daterangepicker === 'function') {
            try {
                el.type = 'text';
            } catch (e) {}

            const currentValue = el.value || '';
            singlePicker($(el), currentValue, withTime);

            $(el).on('apply.daterangepicker', function (ev, picker) {
                try {
                    $(this).val(picker.startDate.format(withTime ? 'YYYY/MM/DD HH:mm:ss' : 'YYYY/MM/DD'));
                } catch (err) {
                    $(this).val('');
                }
            });

            $(el).on('cancel.daterangepicker', function () {
                try {
                    $(this).val('');
                } catch (err) {}
            });

            return;
        }

        try {
            el.type = withTime ? 'datetime-local' : 'date';
        } catch (e) {}
    });
}

function getProjectIdFromLocation() {
    try {
        const params = new URLSearchParams(window.location.search || '');
        const qProjectId = params.get('projectId');
        if (qProjectId) return qProjectId;
        return null;
    } catch (e) {
        return null;
    }
}

function getTaskIdFromLocation() {
    try {
        const params = new URLSearchParams(window.location.search || '');
        const qTaskId = params.get('taskId');
        if (qTaskId) return qTaskId;

        return null;
    } catch (e) {
        return null;
    }
}

async function urlProject() {
    const projectId = getProjectIdFromLocation();
    if (!projectId) return;

    try {
        let retries = 0;
        const maxRetries = 20;

        while ((!projectList || projectList.length === 0) && retries < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            retries++;
        }

        const project = findProjectById(projectId);
        if (!project) {
            return;
        }

        await showProjectTasksModal(projectId);
    } catch (e) {
        console.error('urlProject error:', e);
    }
}

async function urlTask() {
    const taskId = getTaskIdFromLocation();
    if (!taskId) return;

    try {
        let retries = 0;
        const maxRetries = 20;

        while ((!projectList || projectList.length === 0) && retries < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            retries++;
        }

        const res = await fetch(`/ppap-system/api/tasks/${encodeURIComponent(taskId)}`);
        if (!res.ok) {
            await showTaskDetailModal(null, taskId);
            return;
        }

        const json = await res.json();
        const task = json.data || json.result || null;

        if (!task) {
            await showTaskDetailModal(null, taskId);
            return;
        }

        const projectId = task.projectId || task.project_id || task.project_id_fk || null;

        await showTaskDetailModal(projectId, taskId);
    } catch (e) {
        console.error('urlTask error:', e);
        try {
            await showTaskDetailModal(null, taskId);
        } catch (err) {
            console.error('Fallback showTaskDetailModal failed', err);
        }
    }
}

function debounce(fn, wait) {
    let timeout = null;
    return function () {
        const args = arguments;
        const later = () => {
            timeout = null;
            fn.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function filterProjectTasksByName(query) {
    try {
        const table = document.getElementById('projectTasksTable');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const q = (query || '').trim().toLowerCase();
        const rows = Array.from(tbody.querySelectorAll('tr'));

        if (!q) {
            rows.forEach((r) => {
                r.style.display = '';
            });
            return;
        }

        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            const taskNumberCell = cells && cells.length >= 3 ? cells[2] : null;
            const taskNameCell = cells && cells.length >= 4 ? cells[3] : null;
            const numberText = taskNumberCell
                ? (taskNumberCell.textContent || taskNumberCell.innerText || '').trim().toLowerCase()
                : '';
            const nameText = taskNameCell
                ? (taskNameCell.textContent || taskNameCell.innerText || '').trim().toLowerCase()
                : '';
            if (numberText.indexOf(q) === -1 && nameText.indexOf(q) === -1) {
                row.style.display = 'none';
            } else {
                row.style.display = '';
            }
        });
    } catch (e) {}
}

const ACTION_HANDLERS = {
    showCreateProjectForm: () => showCreateProjectForm(),
    showStandardPPAP: () => showStandardPPAP(),
    showCustomTask: () => showCustomTask(),
    showCopyTemplate: () => showCopyTemplate(),
    cancelProjectCreation: () => cancelProjectCreation(),
    showRACIMatrix: (el) => showRACIMatrix(el.dataset.projectId),
    submitProject: () => submitProject(),
    selectAllPPAP: () => selectAllPPAP(),
    deselectAllPPAP: () => deselectAllPPAP(),
    confirmPPAPSelection: () => confirmPPAPSelection(),
    showRACIMatrixFromProject: () => showRACIMatrixFromProject(),
    saveProjectTaskQuantity: () => saveProjectTaskQuantity(),
    projectTasksSubmit: () => projectTasksSubmit(),
    confirmCopyProject: () => confirmCopyProject(),
    saveRACIMatrix: () => saveRACIMatrix(),
    closeCreateProjectModal: () => closeCreateProjectModal(),
    createModalBackToStep1: () => createModalBackToStep1(),
    saveProjectBasicInfoModal: () => saveProjectBasicInfoModal(),
    submitProjectFromModal: () => submitProjectFromModal(),
    showProjectTasksModal: (el) => showProjectTasksModal(el.dataset.projectId),
    approveProject: (el) => approveProject(el.dataset.projectId),
    rejectProject: (el) => rejectProject(el.dataset.projectId),
    deleteProject: (el) => deleteProject(el.dataset.projectId),
    showTaskDetailModal: (el) => showTaskDetailModal(el.dataset.projectId, el.dataset.taskId),
    removeTaskFromProject: (el) => removeTaskFromProject(el.dataset.projectId, el.dataset.taskId),
    removeSelectedTask: (el) => removeSelectedTask(el.dataset.taskId),
    stopPropagation: (el, ev) => {
        if (ev) ev.stopPropagation();
    },
};

function handleActionClick(ev) {
    const target = ev.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const handler = ACTION_HANDLERS[action];
    if (!handler) return;
    if (target.dataset.stopProp === '1') {
        ev.stopPropagation();
    }
    handler(target, ev);
}

document.addEventListener('click', handleActionClick);

TaskDetailModal.init({
    helpers: {
        getStatusLabel,
        getStatusBadgeClass,
        getPriorityLabel,
        getPriorityBadgeClass,
        normalizeStatus,
        getStageName,
        getUserLabelById,
        formatCommentContent,
        fetchStagesForProject,
        fetchOptions,
        renderOptions,
        findProjectById,
        getCurrentStageId,
        loadProjectTasksByStage,
    },
    selectCache: SELECT_CACHE,
});

document.addEventListener('DOMContentLoaded', async () => {
    const SELECTORS = {
        upload: '#upload',
        comment: '#comment',
        addCustom: '#add-custom',
        searchTask: '#search-task',
        filterDate: '#filter-created-date',
        newProjectCustomer: '#newProjectCustomer',
        filterCustomer: '#projectCustomerSelect',
        addStageBtn: '#add-stage-btn',
        confirmCreateStage: '#confirm-create-stage',
        newStageName: '#new-stage-name',
        stageTabs: '#projectStageTabs',
        taskDetailModal: '#taskDetailModal',
        projectTasksModal: '#projectTasksModal',
        filterButton: '#filter_button',
        clearFilterButton: '#clear_filter_button',
        projectFilter: '#ppapFilterProject',
        modelFilter: '#filter-model',
        createStageModal: '#createStageModal',
        projectIdField: '#pt_detail_projectId'
    };

    const bindEvent = (selector, event, handler, options = {}) => {
        const el = document.querySelector(selector);
        if (!el) return null;

        const handlerKey = `_${event}Handler`;
        if (el[handlerKey]) {
            el.removeEventListener(event, el[handlerKey]);
        }

        el[handlerKey] = handler;
        el.addEventListener(event, handler, options);
        return el;
    };

    const bindEnterKey = (selector, callback) => {
        bindEvent(selector, 'keydown', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                callback();
            }
        });
    };

    const safeAsync = async (fn, fallback = null) => {
        try {
            return await fn();
        } catch (error) {
            console.error('[Init Error]', error);
            return fallback;
        }
    };

    const setupDateRangePicker = () => {
        if (!window.jQuery?.fn?.daterangepicker) return;

        const input = document.querySelector(SELECTORS.filterDate);
        if (!input) return;

        const $input = $(input);
        
        // Cleanup existing picker
        const existing = $input.data('daterangepicker');
        if (existing) {
            existing.remove();
            $input.off('apply.daterangepicker cancel.daterangepicker');
        }

        rangePicker($input, null, null);

        $input.on('apply.daterangepicker', (ev, picker) => {
            const start = picker.startDate.format('YYYY/MM/DD');
            const end = picker.endDate.format('YYYY/MM/DD');
            $input.val(`${start} - ${end}`).trigger('change');
        });

        $input.on('cancel.daterangepicker', () => {
            $input.val('').trigger('change');
        });
    };

    const loadCftTeams = (targetSelectId, customerId) => {
        if (!customerId) return;
        loadCftTeamsForSelect(targetSelectId, customerId);
    };

    const setupCustomerSelects = () => {
        bindEvent(SELECTORS.newProjectCustomer, 'change', (ev) => {
            loadCftTeams('newProjectCft', ev.target.value);
        });

        bindEvent(SELECTORS.filterCustomer, 'change', (ev) => {
            loadCftTeams('sl-cft', ev.target.value);
        });
    };

    const setupSearchInput = () => {
        const input = document.querySelector(SELECTORS.searchTask);
        if (!input) return;

        if (input._searchHandler) {
            input.removeEventListener('input', input._searchHandler);
        }

        input._searchHandler = debounce((ev) => {
            filterProjectTasksByName(ev.target.value);
        }, 200);

        input.addEventListener('input', input._searchHandler);
    };

    const setupStageManagement = () => {
        bindEvent(SELECTORS.addStageBtn, 'click', () => {
            const modal = document.querySelector(SELECTORS.createStageModal);
            if (!modal) return;

            const input = modal.querySelector(SELECTORS.newStageName);
            if (input) input.value = '';
            
            openModalAbove(modal);
        });

        bindEvent(SELECTORS.confirmCreateStage, 'click', handleCreateStageConfirm);
        bindEnterKey(SELECTORS.newStageName, handleCreateStageConfirm);

        bindEvent(SELECTORS.stageTabs, 'click', (ev) => {
            const btn = ev.target.closest('.stage-tab');
            if (!btn) return;

            const stageId = btn.dataset.stageId;
            const projectId = document.querySelector(SELECTORS.projectIdField)?.value;
            
            if (projectId) {
                loadProjectTasksByStage(projectId, stageId);
            }
        });
    };

    const setupModalCleanup = () => {
        const cleanupUrl = (paramName) => {
            const url = new URL(window.location.href);
            url.searchParams.delete(paramName);
            window.history.pushState({}, '', url.toString());
        };

        bindEvent(SELECTORS.taskDetailModal, 'hidden.bs.modal', () => {
            cleanupUrl('taskId');
        });

        bindEvent(SELECTORS.projectTasksModal, 'hidden.bs.modal', () => {
            cleanupUrl('projectId');
        });
    };

    const setupFilters = () => {
        bindEvent(SELECTORS.filterButton, 'click', filterProjects);
        bindEvent(SELECTORS.clearFilterButton, 'click', clearAdvancedFilters);
        bindEnterKey(SELECTORS.projectFilter, filterProjects);
        bindEnterKey(SELECTORS.modelFilter, filterProjects);
    };

    const setupEventHandlers = () => {
        bindEvent(SELECTORS.addCustom, 'click', handleAddCustomTask);
    };

    const handleUrlParams = async () => {
        const taskId = getTaskIdFromLocation();
        
        if (taskId) {
            await urlTask();
        } else {
            await urlProject();
        }
    };

    // Main initialization
    setupEventHandlers();
    setupDateRangePicker();
    setupCustomerSelects();
    setupSearchInput();
    setupStageManagement();
    setupModalCleanup();
    setupFilters();

    await safeAsync(loadAllSelects);
    await safeAsync(loadUsersAndInitDriSelects);
    await safeAsync(initCommentMentionAutocomplete);
    await safeAsync(loadProjectList);
    await safeAsync(initDeadlinePicker);
    await safeAsync(handleUrlParams);
});
