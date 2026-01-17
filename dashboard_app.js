import { TaskDetailModal, openTaskDetail, initTaskDetailModalBindings } from '../task_detail_modal.js';
import { captureOriginalUrl, getQueryParam, restoreOriginalUrl, setQueryParam } from '../shared/url_sync.js';
import {
    formatUserLabel,
    normalizeStatus,
    getStatusBadgeClass,
    getStatusLabel,
    getPriorityBadgeClass,
    getPriorityLabel,
} from '../shared/helper.js';
import { DateFormatter, fixNull } from '../shared/utils.js';
import * as api from './api.js';
import * as ui from './ui.js';

const t = window.t || ((key) => key);
let USERS_CACHE = [];
const STAGE_CACHE_BY_PROJECT = {};

function getUserLabelById(idCard) {
    if (!idCard) return '';
    const normalized = String(idCard).trim();
    const found = USERS_CACHE.find((user) => fixNull(user.idCard).toString() === normalized);
    if (found) return formatUserLabel(found);
    return normalized;
}

function getStageIdByName(stageName, projectId) {
    if (!stageName) return null;
    const stages = getStageList(projectId);
    const found = stages.find((s) => s.name === stageName);
    return found ? found.id : null;
}

function getStageNameById(stageId, projectId) {
    if (!stageId) return null;
    const stages = getStageList(projectId);
    const found = stages.find((s) => s.id === stageId || String(s.id) === String(stageId));
    return found ? found.name : null;
}

function getProjectNameById(projectId) {
    if (!projectId) return null;
    const projects = SELECT_CACHE['/api/projects'] || [];
    const found = projects.find((p) => p.id === projectId || String(p.id) === String(projectId));
    return found ? found.name : null;
}

function getStageList(projectId) {
    const cached = projectId && STAGE_CACHE_BY_PROJECT[projectId] ? STAGE_CACHE_BY_PROJECT[projectId] : [];
    const shared = SELECT_CACHE['/api/stages'] || [];
    return [...cached, ...shared];
}

function getProjectNameFromDom(projectId) {
    const btn = document.querySelector(`[data-action="showCFTTeam"][data-id="${projectId}"]`);
    if (!btn) return null;
    const card = btn.closest('.project-card');
    const nameEl = card ? card.querySelector('.project-name') : null;
    const name = nameEl && nameEl.textContent ? nameEl.textContent.trim() : '';
    return name || null;
}

async function resolveProjectName(projectId) {
    let projectName = getProjectNameById(projectId);
    if (!projectName || String(projectName) === String(projectId)) {
        const domName = getProjectNameFromDom(projectId);
        if (domName) projectName = domName;
    }
    if (!projectName || String(projectName) === String(projectId)) {
        try {
            const pr = await api.fetchProjectById(projectId);
            if (pr && (pr.projectName || pr.name)) projectName = pr.projectName || pr.name;
            else if (pr && pr.id && pr.id === projectId && pr.name) projectName = pr.name;
        } catch (e) {}
    }
    return projectName || projectId;
}

async function renderProjects(searchParams) {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    loader.load();
    try {
        grid.innerHTML = '';
        let projectsData = await api.fetchProjects(searchParams);
        const keyword = document.getElementById('dashboardFilterSearch')?.value?.trim().toLowerCase();
        if (keyword) {
            projectsData = projectsData.filter((project) =>
                fixNull(project.projectName).toLowerCase().includes(keyword)
            );
        }

        ui.renderProjectsGrid(grid, projectsData);
    } catch (error) {
    } finally {
        loader.unload();
    }
}

async function showCFT(projectId) {
    loader.load();
    try {
        const cftTeamData = await api.fetchProjectRaci(projectId);

        // Get department cache for mapping
        const departments = SELECT_CACHE['/api/departments'] || [];
        const deptMap = {};
        departments.forEach((dept) => {
            deptMap[dept.id] = dept.name;
        });

        const modal = document.getElementById('cftTeamModal');
        const title = document.getElementById('cftTeamTitle');
        const tbody = document.getElementById('cftTeamBody');

        const projectName = await resolveProjectName(projectId);
        title.textContent = `${projectName} - CFT TEAM`;

        tbody.innerHTML = cftTeamData
            .map((member) => {
                const deptName = deptMap[member.departmentId] || fixNull(member.departmentId);
                const managerLabel = getUserLabelById(member.manager);
                return `
                <tr>
                    <td>${deptName}</td>
                    <td>${managerLabel}</td>
                    <td>${fixNull(member.role)}</td>
                    <td>${fixNull(member.responsibility)}</td>
                    <td><span class="raci-badge raci-${fixNull(member.raci).toLowerCase()}">${
                    fixNull(member.raci)
                }</span></td>
                    <td>
                        <button class="action-icon-btn cft-delete-btn" data-raci-id="${member.id}" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            })
            .join('');

        // Store projectId for later use when adding new members
        modal.dataset.currentProjectId = projectId;

        var bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } catch (error) {
        ui.showAlertError('L?i', 'Khong th? t?i thong tin CFT Team');
    } finally {
        loader.unload();
    }
}

function closeCFTTeam() {
    document.getElementById('cftTeamModal').classList.remove('active');
}

function addCftMember() {
    const modal = document.getElementById('cftTeamModal');
    const tbody = document.getElementById('cftTeamBody');
    const projectId = modal.dataset.currentProjectId;

    if (!projectId) {
        ui.showAlertError('Error', 'Project ID not found');
        return;
    }

    const departments = SELECT_CACHE['/api/departments'] || [];
    const deptOptions = departments.map((dept) => `<option value="${dept.id}">${dept.name}</option>`).join('');

    const newRow = document.createElement('tr');
    newRow.classList.add('cft-new-row');
    newRow.innerHTML = `
        <td>
            <select class="filter-select cft-dept-select" required>
                <option value="">-- Select Department --</option>
                ${deptOptions}
            </select>
        </td>
        <td>
            <select class="filter-select cft-manager-select" required>
                <option value="">-- Select Manager --</option>
            </select>
        </td>
        <td><input type="text" class="filter-input cft-role-input" placeholder="Role" required /></td>
        <td><input type="text" class="filter-input cft-responsibility-input" placeholder="Responsibility" required /></td>
        <td>
            <button class="raci-cycle-btn raci-badge raci-r" data-raci="R">R</button>
        </td>
        <td>
            <button class="action-icon-btn cft-save-btn" title="Save">
                <i class="bi bi-check-lg"></i>
            </button>
            <button class="action-icon-btn cft-cancel-btn" title="Cancel">
                <i class="bi bi-x-lg"></i>
            </button>
        </td>
    `;

    tbody.appendChild(newRow);

    const managerSelect = newRow.querySelector('.cft-manager-select');
    USERS_CACHE.forEach((user) => {
        const option = document.createElement('option');
        option.value = fixNull(user.idCard);
        option.textContent = formatUserLabel(user);
        managerSelect.appendChild(option);
    });

    $(managerSelect).select2({
        placeholder: 'Search Manager...',
        allowClear: true,
        width: '100%',
        dropdownParent: $(modal),
    });

    const raciBtn = newRow.querySelector('.raci-cycle-btn');
    raciBtn.addEventListener('click', cycleRaci);

    const saveBtn = newRow.querySelector('.cft-save-btn');
    saveBtn.addEventListener('click', () => saveCftMember(newRow, projectId));

    const cancelBtn = newRow.querySelector('.cft-cancel-btn');
    cancelBtn.addEventListener('click', () => {
        $(managerSelect).select2('destroy');
        newRow.remove();
    });
}

function cycleRaci(e) {
    const btn = e.currentTarget;
    const raciStates = ['R', 'A', 'C', 'I'];
    const currentRaci = btn.dataset.raci || 'R';
    const currentIndex = raciStates.indexOf(currentRaci);
    const nextIndex = (currentIndex + 1) % raciStates.length;
    const nextRaci = raciStates[nextIndex];

    btn.dataset.raci = nextRaci;
    btn.setAttribute('data-raci', nextRaci);
    btn.textContent = nextRaci;
    btn.className = `raci-cycle-btn raci-badge raci-${nextRaci.toLowerCase()}`;
}

async function deleteCftMember(raciId, row) {
    try {
        const confirmation = await Swal.fire({
            title: 'Confirm Delete',
            text: 'Are you sure you want to delete this CFT member?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel',
        });

        if (!confirmation.isConfirmed) return;

        loader.load();
        const result = await api.deleteCftMember(raciId);
        if (result === null) {
            throw new Error('Failed to delete RACI');
        }

        loader.unload();
        ui.showAlertSuccess('Success', 'CFT member deleted successfully');

        if (row) {
            row.remove();
        }
    } catch (error) {
        loader.unload();
        ui.showAlertError('Error', 'Failed to delete CFT member');
    }
}

async function saveCftMember(row, projectId) {
    const deptId = row.querySelector('.cft-dept-select').value;
    const manager = row.querySelector('.cft-manager-select').value.trim();
    const role = row.querySelector('.cft-role-input').value.trim();
    const responsibility = row.querySelector('.cft-responsibility-input').value.trim();
    const raciBtn = row.querySelector('.raci-cycle-btn');
    const raci = (raciBtn && raciBtn.getAttribute('data-raci')) || 'R';

    if (!deptId) {
        ui.showAlertWarning('Validation', 'Please select a department');
        return;
    }

    if (!manager) {
        ui.showAlertWarning('Validation', 'Please select a manager');
        return;
    }

    const raciData = {
        departmentId: parseInt(deptId),
        projectId: parseInt(projectId),
        manager: manager,
        role: role || '',
        responsibility: responsibility || '',
        raci: raci,
    };

    try {
        loader.load();
        const result = await api.createCftMember(raciData);
        if (!result) {
            throw new Error('Failed to create RACI');
        }
        loader.unload();

        ui.showAlertSuccess('Success', 'CFT member added successfully');

        const managerSelect = row.querySelector('.cft-manager-select');
        if (managerSelect) {
            $(managerSelect).select2('destroy');
        }

        const departments = SELECT_CACHE['/api/departments'] || [];
        const deptName = departments.find((d) => d.id == deptId)?.name || deptId;
        const managerLabel = getUserLabelById(manager);

        row.innerHTML = `
            <td>${deptName}</td>
            <td>${managerLabel}</td>
            <td>${role}</td>
            <td>${responsibility}</td>
            <td><span class="raci-badge raci-${raci.toLowerCase()}">${raci}</span></td>
            <td>
                <button class="action-icon-btn cft-delete-btn" data-raci-id="${result.id || result.data?.id || ''}" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        row.classList.remove('cft-new-row');
    } catch (error) {
        loader.unload();
        ui.showAlertError('Error', 'Failed to add CFT member');
    }
}

async function showTaskByStage(projectId, stage) {
    const modal = document.getElementById('taskListModal');
    const title = document.getElementById('taskListModalLabel');
    const tbody = document.getElementById('taskListModalBody');

    try {
        loader.load();
        await ensureProjectStages(projectId);

        if (title) {
            // title.textContent = `${projectId} - ${stage} Stage Tasks`;
            title.textContent = `Tasks List`
        }

        const stageId = getStageIdByName(stage, projectId) || stage || null;
        const taskParams = stageId ? {stageId} : {};
        const tasks = await api.fetchProjectTasks(projectId, taskParams);

        if (tbody) {
            if (tasks.length === 0) {
                tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        No tasks found for this stage
                    </td>
                </tr>
            `;
            } else {
                tbody.innerHTML = tasks
                    .map((task, index) => {
                        const statusClass = getStatusBadgeClass(task.status);
                        const statusLabel = getStatusLabel(task.status);
                        const priorityClass = getPriorityBadgeClass(task.priority);
                        const priorityLabel = getPriorityLabel(task.priority);
                        const driDisplay = getUserLabelById(task.dri) || '-';
                        const dueDate = task.dueDate || '-';
                        const stageName =
                            task.stageName ||
                            (task.stage && task.stage.name) ||
                            getStageNameById(task.stageId || stage, projectId) ||
                            '-';

                        return `
                    <tr data-id="${task.id}" data-project-id="${projectId}" data-action="showTaskDetail" style="cursor: pointer;">
                        <td>${index + 1}</td>
                        <td class="task-id-cell">${task.taskCode || task.id}</td>
                        <td>${task.name || '-'}</td>
                        <td>${stageName}</td>
                        <td><span class="task-status-badge ${statusClass}">${statusLabel}</span></td>
                        <td><span class="priority-badge ${priorityClass}">${priorityLabel}</span></td>
                        <td>${driDisplay}</td>
                        <td>${dueDate}</td>
                        <td class="action-icons">
                            <button class="action-icon-btn" data-id="${
                                task.id
                            }" data-project-id="${projectId}" data-action="editTaskDetail"><i class="bi bi-pencil"></i></button>
                            <button class="action-icon-btn" data-id="${
                                task.id
                            }" data-action="deleteTask"><i class="bi bi-trash"></i></button>
                        </td>
                    </tr>
                `;
                    })
                    .join('');
            }
        }

        loader.unload();
        var bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } catch (error) {
        loader.unload();
    }
}

async function showTaskByFilter(filterType, projectId = null) {
    const modal = document.getElementById('taskListModal');
    const title = document.getElementById('taskListModalLabel');
    const tbody = document.getElementById('taskListModalBody');

    // Map filter type to API status param
    const statusMap = {
        'in-progress': 'IN_PROGRESS',
        'pending': 'WEEKLY_PENDING',
        'overdue': 'OVERDUE',
        'all': null
    };
    const status = statusMap[filterType] || null;

    let titleText = '';
    if (filterType === 'all') {
        titleText = projectId ? `${projectId} - ${t('all')} ${t('taskName')}` : `${t('all')} ${t('taskName')}`;
    } else if (filterType === 'in-progress') {
        titleText = projectId
            ? `${projectId} - ${t('inProgress')} ${t('taskName')}`
            : `${t('inProgress')} ${t('taskName')}`;
    } else if (filterType === 'pending') {
        titleText = projectId ? `${projectId} - ${t('pending')} ${t('taskName')}` : `${t('pending')} ${t('taskName')}`;
    } else if (filterType === 'overdue') {
        titleText = projectId ? `${projectId} - ${t('overdue')} ${t('taskName')}` : `${t('overdue')} ${t('taskName')}`;
    }

    if (title) {
        // title.textContent = titleText;
        title.textContent = `Tasks List`;
    }

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-secondary);padding:2rem">Loading...</td></tr>';
    }

    if (modal) {
        var bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    try {
        await ensureProjectStages(projectId);
        let tasks = [];
        if (projectId) {
            const params = {};
            if (status) {
                params.status = status;
            }
            params.id = projectId;

            tasks = await api.fetchProjectTasks(projectId, params);

            const projectIds = [...new Set(tasks.map((t) => t.projectId).filter(Boolean))];
            await Promise.all(projectIds.map((pid) => ensureProjectStages(pid)));
        }

        if (!tasks || tasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);padding:2rem">No tasks found</td></tr>';
            return;
        }

        tbody.innerHTML = tasks.map((task, index) => {
            const statusClass = getStatusBadgeClass(task.status);
            const statusLabel = getStatusLabel(task.status);
            const priorityClass = getPriorityBadgeClass(task.priority);
            const priorityLabel = getPriorityLabel(task.priority);
            const driDisplay = getUserLabelById(task.dri) || '-';
            const dueDate = task.dueDate || '-';
            const stageName =
                task.stageName ||
                (task.stage && task.stage.name) ||
                getStageNameById(task.stageId || task.stage, projectId || task.projectId) ||
                '-';

            return `
                <tr data-id="${task.id}" data-project-id="${projectId || task.projectId}" data-action="showTaskDetail" style="cursor: pointer;">
                    <td>${index + 1}</td>
                    <td class="task-id-cell">${task.taskCode || task.id}</td>
                    <td>${task.name || '-'}</td>
                    <td>${stageName}</td>
                    <td><span class="task-status-badge ${statusClass}">${statusLabel}</span></td>
                    <td><span class="priority-badge ${priorityClass}">${priorityLabel}</span></td>
                    <td>${driDisplay}</td>
                    <td>${dueDate}</td>
                    <td class="action-icons">
                        <button class="action-icon-btn" data-id="${task.id}" data-project-id="${projectId}" data-action="editTaskDetail"><i class="bi bi-pencil"></i></button>
                        <button class="action-icon-btn" data-id="${task.id}" data-action="deleteTask"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-secondary);padding:2rem">Failed to load tasks</td></tr>';
    }
}

async function showDashboardTasks(filterType) {
    const modal = document.getElementById('taskListModal');
    const title = document.getElementById('taskListModalLabel');
    const tbody = document.getElementById('taskListModalBody');

    // Map filter type to API status param
    const statusMap = {
        'in-progress': 'IN_PROGRESS',
        'pending': 'WEEKLY_PENDING',
        'overdue': 'OVERDUE',
        'all': null
    };
    const status = statusMap[filterType] || null;

    let titleText = '';
    if (filterType === 'all') {
        titleText = `${t('all')} ${t('taskName')}`;
    } else if (filterType === 'in-progress') {
        titleText = `${t('inProgress')} ${t('taskName')}`;
    } else if (filterType === 'pending') {
        titleText = `${t('pending')} ${t('taskName')}`;
    } else if (filterType === 'overdue') {
        titleText = `${t('overdue')} ${t('taskName')}`;
    }

    if (title) {
        // title.textContent = titleText;
        title.textContent = `Tasks List`;
    }

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-secondary);padding:2rem">Loading...</td></tr>';
    }

    if (modal) {
        var bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    try {
        // Calculate date range
        const now = new Date();

        function formatDate(d, isEndDate = false) {
            const y = d.getFullYear();
            const m = ('0' + (d.getMonth() + 1)).slice(-2);
            const day = ('0' + d.getDate()).slice(-2);
            const time = isEndDate ? '23:59:59' : '00:00:00';
            return `${y}/${m}/${day} ${time}`;
        }

        let startTime;
        let endTime;

        if (filterType === 'pending') {
            // For 'pending' filter, use current week: Monday 00:00 to Sunday 23:59
            const day = now.getDay();
            const daysSinceMonday = (day + 6) % 7;
            const monday = new Date(now);
            monday.setHours(0, 0, 0, 0);
            monday.setDate(now.getDate() - daysSinceMonday);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 0);

            startTime = formatDate(monday);
            endTime = formatDate(sunday, true);
        } else {
            // Default: first day of current month to now
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            startTime = formatDate(startOfMonth);
            endTime = formatDate(now, true);
        }

        const params = {startTime, endTime};
        if (status) params.status = status;

        let tasks = await api.fetchDashboardTasks(params);

        // ? THEM: Load stages cho t?t c? projects trong task list
        const projectIds = [...new Set(tasks.map((t) => t.projectId).filter(Boolean))];
        await Promise.all(projectIds.map((pid) => ensureProjectStages(pid)));

        if (!tasks || tasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-secondary);padding:2rem">No tasks found</td></tr>';
            return;
        }

        tbody.innerHTML = tasks.map((task, index) => {
            const statusClass = getStatusBadgeClass(task.status);
            const statusLabel = getStatusLabel(task.status);
            const priorityClass = getPriorityBadgeClass(task.priority);
            const priorityLabel = getPriorityLabel(task.priority);
            const driDisplay = getUserLabelById(task.dri) || '-';
            const dueDate = task.dueDate || '-';
            const stageName = task.stageName || getStageNameById(task.stageId, task.projectId) || task.stageId || '-';
            const projectId = task.projectId || '-';

            return `
                <tr data-id="${task.id}" data-project-id="${projectId}" data-action="showTaskDetail" style="cursor: pointer;">
                    <td>${index + 1}</td>
                    <td class="task-id-cell">${task.taskCode || task.id}</td>
                    <td>${task.name || '-'}</td>
                    <td>${stageName}</td>
                    <td><span class="task-status-badge ${statusClass}">${statusLabel}</span></td>
                    <td><span class="priority-badge ${priorityClass}">${priorityLabel}</span></td>
                    <td>${driDisplay}</td>
                    <td>${dueDate}</td>
                    <td class="action-icons">
                        <button class="action-icon-btn" data-id="${task.id}" data-project-id="${projectId}" data-action="editTaskDetail"><i class="bi bi-pencil"></i></button>
                        <button class="action-icon-btn" data-id="${task.id}" data-action="deleteTask"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-secondary);padding:2rem">Failed to load tasks</td></tr>';
    }
}



async function deleteTask(taskId) {
    if (!taskId) {
        ui.showAlertError('Error', 'Task ID is required');
        return;
    }

    try {
        const confirmation = await Swal.fire({
            title: 'Confirm Delete',
            text: 'Are you sure you want to delete this task?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel',
        });

        if (!confirmation.isConfirmed) return;

        loader.load();
        const result = await api.deleteTask(taskId);
        if (result === null) {
            throw new Error('Failed to delete task');
        }

        loader.unload();
        ui.showAlertSuccess('Success', 'Task deleted successfully');

        const row = document.querySelector(`tr[data-id="${taskId}"]`);
        if (row) {
            row.remove();
        }

        const tbody = document.getElementById('taskListModalBody');
        if (tbody && tbody.querySelectorAll('tr').length === 0) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('taskListModal'));
            if (modal) modal.hide();
        }
    } catch (error) {
        loader.unload();
        ui.showAlertError('Error', 'Failed to delete task');
    }
}

function closeTaskDetail() {
    const modal = document.getElementById('taskDetailModal');
    const bsModal = bootstrap.Modal.getInstance(modal);
    if (bsModal) bsModal.hide();

    restoreOriginalUrl(modal);
}

// function openTaskPermission(projectId, taskId, userName) {
//     const modal = document.getElementById('taskDetailModal');
//     if (!modal) return;
//     const taskIdElement = modal.querySelector('.task-detail-id');
//     if (taskIdElement) taskIdElement.textContent = taskId;
//     const taskNameElement = modal.querySelector('.task-detail-name');
//     const taskNames = {'PPAP-001': '?]?p?O??', 'PPAP-007': '?????p??', 'PPAP-015': '??~???~'};
//     if (taskNameElement) taskNameElement.textContent = taskNames[taskId] || '??????';
//     const descriptionElement = modal.querySelector('.section-content');
//     if (descriptionElement) {
//         descriptionElement.textContent = `?M?? ${projectId} - ???? ${taskId} ?? ${userName} ?t?d?B?z`;
//     }
//     var bsModal = new bootstrap.Modal(modal);
//     bsModal.show();
// }

async function applyDashboardFilters() {
    try {
        const params = buildDashboardProjectParams();
        await renderProjects(params);
    } catch (error) {
    }
}

function initDashboardFilters() {
    const changeTargets = ['sl-customer', 'sl-model', 'pjNum', 'dashboardFilterDRI'];
    changeTargets.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyDashboardFilters);
        }
    });

    const deadlineInput = document.getElementById('dashboardFilterDeadline');
    if (deadlineInput) {
        deadlineInput.addEventListener('change', applyDashboardFilters);
    }

    const searchBtn = document.getElementById('search');
    if (searchBtn) {
        searchBtn.addEventListener('click', applyDashboardFilters);
    }

    const searchInput = document.getElementById('dashboardFilterSearch');
    if (searchInput) {
        searchInput.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                applyDashboardFilters();
            }
        });
    }

    const resetBtn = document.getElementById('reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetDashboardFilters);
    }

    ui.showDatePicker('dashboardFilterDeadline');
}

async function resetDashboardFilters() {
    ['sl-customer', 'sl-model', 'pjNum'].forEach((id) => {
        const select = document.getElementById(id);
        if (select) {
            select.value = '';
        }
    });

    const driSelect = document.getElementById('dashboardFilterDRI');
    if (driSelect) {
        driSelect.value = '';
        if ($(driSelect).data('select2')) {
            $(driSelect).val(null).trigger('change');
        }
    }

    const deadlineInput = document.getElementById('dashboardFilterDeadline');
    if (deadlineInput) {
        deadlineInput.value = '';
    }

    const searchInput = document.getElementById('dashboardFilterSearch');
    if (searchInput) {
        searchInput.value = '';
    }

    await applyDashboardFilters();
}

const SELECT_CACHE = {};
const SELECT_CONFIGS = [
    {id: 'sl-customer', endpoint: '/api/customers'},
    {id: 'sl-model', endpoint: '/api/models'},
    {id: 'pjNum', endpoint: '/api/projects', params: ['customerId', 'modelId']},
    {id: 'sl-stage', endpoint: '/api/stages'},
    {id: 'sl-status', endpoint: '/api/projects/status'},
    {id: 'sl-priority', endpoint: '/api/tasks/priorities'},
    {id: 'sl-doc-type', endpoint: '/api/documents/types'},
    {id: 'sl-department', endpoint: '/api/departments'},
    {id: 'sl-process', endpoint: '/api/processes'},
    {id: 'modal-sl-status', endpoint: '/api/tasks/status'},
    {id: 'modal-sl-priority', endpoint: '/api/tasks/priorities'},
];

async function ensureProjectStages(projectId) {
    if (!projectId) return [];
    if (STAGE_CACHE_BY_PROJECT[projectId]) return STAGE_CACHE_BY_PROJECT[projectId];

    const stages = await api.fetchOptions('/api/stages', {projectId});
    if (Array.isArray(stages)) {
        STAGE_CACHE_BY_PROJECT[projectId] = stages;
        return stages;
    }
    return [];
}



async function loadAllSelects() {
    const simpleConfigs = SELECT_CONFIGS.filter((cfg) => !cfg.params);
    const res = await Promise.all(simpleConfigs.map((cfg) => api.fetchOptions(cfg.endpoint)));

    simpleConfigs.forEach((cfg, i) => {
        const items = res[i] || [];
        ui.renderOptions(cfg.id, items);
        SELECT_CACHE[cfg.endpoint] = items;
    });

    const pjNumSelect = document.querySelector('#pjNum');
    if (pjNumSelect) {
        pjNumSelect.innerHTML = '<option value="">-- Select Project --</option>';
    }
}

async function loadSummary() {
    try {
        function fmtDate(d) {
            const y = d.getFullYear();
            const m = ('0' + (d.getMonth() + 1)).slice(-2);
            const day = ('0' + d.getDate()).slice(-2);
            const h = ('0' + d.getHours()).slice(-2);
            const min = ('0' + d.getMinutes()).slice(-2);
            const sec = ('0' + d.getSeconds()).slice(-2);
            return `${y}/${m}/${day} ${h}:${min}:${sec}`;
        }

        function getMonday(d) {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            const monday = new Date(date.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            return monday;
        }

        function getSunday(d) {
            const monday = getMonday(d);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            return sunday;
        }

        const now = new Date();
        
        // For Total Projects - this month vs last month
        const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endThisMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endThisMonth.setHours(23, 59, 59, 999);

        const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        endPrevMonth.setHours(23, 59, 59, 999);

        // For Pending - current week vs last week
        const startThisWeekForPending = getMonday(now);
        const endThisWeekForPending = getSunday(now);

        const lastWeekDateForPending = new Date(now);
        lastWeekDateForPending.setDate(now.getDate() - 7);
        const startLastWeekForPending = getMonday(lastWeekDateForPending);
        const endLastWeekForPending = getSunday(lastWeekDateForPending);

        const [j1, j2, j5, j6] = await Promise.all([
            api.fetchSummary({startTime: fmtDate(startThisMonth), endTime: fmtDate(endThisMonth)}),
            api.fetchSummary({startTime: fmtDate(startPrevMonth), endTime: fmtDate(endPrevMonth)}),
            api.fetchSummary({startTime: fmtDate(startThisWeekForPending), endTime: fmtDate(endThisWeekForPending)}),
            api.fetchSummary({startTime: fmtDate(startLastWeekForPending), endTime: fmtDate(endLastWeekForPending)}),
        ]);

        function metricsFromResponse(res) {
            if (!res) return {totalProject: 0, processTask: 0, overDueTask: 0, weekly: 0};

            // Support multiple response shapes: direct fields, { data: ... }, { result: ... }
            let payload = res;
            if (res.result && typeof res.result === 'object') payload = res.result;
            else if (res.data && typeof res.data === 'object') payload = res.data;

            if (Array.isArray(payload)) {
                return {totalProject: payload.length, processTask: 0, overDueTask: 0, weekly: 0};
            }

            const totalProject =
                typeof payload.totalProject !== 'undefined'
                    ? Number(payload.totalProject)
                    : typeof payload.size !== 'undefined'
                    ? Number(payload.size)
                    : 0;
            const processTask = Number(payload.processTask || 0);
            const overDueTask = Number(payload.overDueTask || 0);
            const weekly = Number(payload.weekly || 0);

            return {totalProject, processTask, overDueTask, weekly};
        }

        const cur = metricsFromResponse(j1);
        const prev = metricsFromResponse(j2);
        const curPendingWeek = metricsFromResponse(j5);
        const prevPendingWeek = metricsFromResponse(j6);

        const elTotal = document.getElementById('total');
        const elInProgress = document.getElementById('in_progress');
        const elOverdue = document.getElementById('overdue');
        const elPending = document.getElementById('pending');

        if (elTotal) elTotal.textContent = cur.totalProject;
        if (elInProgress) elInProgress.textContent = cur.processTask;
        if (elOverdue) elOverdue.textContent = cur.overDueTask;
        if (elPending) elPending.textContent = curPendingWeek.weekly;

        const diffs = {
            total: cur.totalProject - prev.totalProject,
            in_progress: cur.processTask - prev.processTask,
            overdue: cur.overDueTask - prev.overDueTask,
            pending: curPendingWeek.weekly - prevPendingWeek.weekly,
        };

        function renderDiff(elementId, diff) {
            const el = document.getElementById(elementId);
            if (!el) return;
            const arrow =
                diff > 0
                    ? '<i class="bi bi-arrow-up"></i>'
                    : diff < 0
                    ? '<i class="bi bi-arrow-down"></i>'
                    : '<i class="bi bi-dash-lg"></i>';
            const signedNum = diff > 0 ? `+${diff}` : `${diff}`;
            let suffix = '';
            try {
                const orig = el.innerHTML || '';
                const m = orig.match(/<\/i>\s*[-+]?\d+\s*(.*)/);
                if (m && m[1]) suffix = ' ' + m[1].trim();
                else {
                    const txt = el.textContent || '';
                    const tail = txt.replace(/^\s*[\u2191\u2193\-\d\s]+/, '').trim();
                    if (tail) suffix = ' ' + tail;
                }
            } catch (e) {
                /* ignore */
            }

            el.innerHTML = `${arrow} ${signedNum}${suffix}`;
        }

        renderDiff('last_total', diffs.total);
        renderDiff('last_in_progress', diffs.in_progress);
        renderDiff('last_overdue', diffs.overdue);
        renderDiff('last_pending', diffs.pending);
    } catch (error) {
    }
}

async function loadProjectNumbers() {
    const customerId = document.querySelector('#sl-customer')?.value;
    const model = document.querySelector('#sl-model')?.value;

    if (!customerId || !model) {
        ui.renderOptions('pjNum', []);
        return;
    }

    const items = await api.fetchOptions('/api/projects', {customerId, model});
    ui.renderOptions('pjNum', items);
    SELECT_CACHE['/api/projects'] = items;
}

function loadEvent() {
    const slCustomer = document.querySelector('#sl-customer');
    const slModel = document.querySelector('#sl-model');

    if (slCustomer) {
        slCustomer.addEventListener('change', loadProjectNumbers);
    }

    if (slModel) {
        slModel.addEventListener('change', loadProjectNumbers);
    }
}

function initEventListeners() {
    document.addEventListener('click', function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const projectId = target.dataset.id;
        const filterType = target.dataset.filter;
        const stage = target.dataset.stage;

        switch (action) {
            case 'showCFTTeam':
                showCFT(projectId);
                break;
            case 'showTaskListByFilter':
                showTaskByFilter(filterType, projectId);
                break;
            case 'showTaskListByStage':
                showTaskByStage(projectId, stage);
                break;
            case 'showTaskDetail':
                const taskId = target.dataset.id;
                const taskProjectId = target.dataset.projectId;
                if (taskId && taskProjectId) {
                    editTaskDetail(taskId, taskProjectId);
                }
                break;
            case 'editTaskDetail':
                editTaskDetail(target.dataset.id, target.dataset.projectId);
                break;
            case 'deleteTask':
                deleteTask(target.dataset.id);
                break;
            case 'showAttachments':
                alert('\u9644\u4ef6');
                break;
            case 'addCftMember':
                addCftMember();
                break;
            case 'showDashboardTasks':
                showDashboardTasks(filterType);
                break;
        }
    });

    document.addEventListener('click', function (e) {
        const deleteBtn = e.target.closest('.cft-delete-btn');
        if (!deleteBtn) return;

        const raciId = deleteBtn.dataset.raciId;
        if (raciId) {
            deleteCftMember(raciId, deleteBtn.closest('tr'));
        }
    });

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.stages-nav');
        if (!btn) return;

        const wrapper = btn.closest('.xvt-stages-wrapper');
        if (!wrapper) return;

        let page = parseInt(wrapper.dataset.page) || 0;
        const total = parseInt(wrapper.dataset.total) || 1;
        const isPrev = btn.classList.contains('stages-prev');

        page = isPrev ? Math.max(0, page - 1) : Math.min(total - 1, page + 1);
        wrapper.dataset.page = page;

        const pages = wrapper.querySelectorAll('.stages-page');
        pages.forEach((p, i) => {
            p.style.display = i === page ? 'grid' : 'none';
        });

        const prevBtn = wrapper.querySelector('.stages-prev');
        const nextBtn = wrapper.querySelector('.stages-next');
        const currentSpan = wrapper.querySelector('.stages-current');

        if (prevBtn) prevBtn.disabled = page === 0;
        if (nextBtn) nextBtn.disabled = page === total - 1;
        if (currentSpan) currentSpan.textContent = page + 1;
    });
}

async function loadData() {
    await loadAllSelects();
    await loadUsersData();
}

async function loadUsersData() {
    USERS_CACHE = await api.fetchUsers();
    ui.updateDRISelect(USERS_CACHE);
}

async function initializeDashboardPage() {
    loadEvent();
    await loadData();
    initTaskDetailModalBindings();
    initDashboardFilters();
    initEventListeners();
    if (typeof loadSummary === 'function') loadSummary();
    await applyDashboardFilters();

    const taskDetailModal = document.getElementById('taskDetailModal');
    if (taskDetailModal) {
        taskDetailModal.addEventListener('hidden.bs.modal', function () {
            restoreOriginalUrl(this);
        });
    }

    await openTaskFromUrl();
}

async function openTaskFromUrl() {
    const taskId = getQueryParam('taskId');
    if (!taskId) return;

    const modalRoot = document.getElementById('taskDetailModal');
    if (modalRoot && modalRoot.dataset.taskId === taskId) {
        return;
    }

    const projectIdFromUrl = getQueryParam('projectId');

    try {
        const task = await api.fetchTaskById(taskId);
        if (!task) {
            await editTaskDetail(taskId, projectIdFromUrl);
            return;
        }

        const projectId = task?.projectId || task?.project_id || projectIdFromUrl || null;
        await editTaskDetail(taskId, projectId);
    } catch (e) {
        await editTaskDetail(taskId, projectIdFromUrl);
    }
}
function editTaskDetail(taskId, projectId) {
    if (typeof openTaskDetail !== 'function') {
        return;
    }

    return openTaskDetail(taskId, projectId, {
        onBeforeOpen: ({taskId, projectId, modalRoot}) => {
            try {
                const originalUrl = captureOriginalUrl(modalRoot, {stripParams: ['taskId']});
                setQueryParam('taskId', taskId, {
                    state: {
                        taskId: taskId,
                        projectId: projectId || null,
                        originalUrl: originalUrl || null,
                    },
                });
            } catch (e) {}
        },
    });
}

function buildDashboardProjectParams() {
    const params = new URLSearchParams();
    const customerId = document.getElementById('sl-customer')?.value?.trim();
    const model = document.getElementById('sl-model')?.value?.trim();
    const projectId = document.getElementById('pjNum')?.value?.trim();
    const dri = document.getElementById('dashboardFilterDRI')?.value?.trim();
    const deadlineValue = document.getElementById('dashboardFilterDeadline')?.value?.trim();
    const keyword = document.getElementById('dashboardFilterSearch')?.value?.trim();

    if (customerId) params.append('customerId', customerId);
    if (model) params.append('model', model);
    if (projectId) params.append('projectId', projectId);
    if (dri) params.append('dri', dri);

    if (deadlineValue) {
        const dueDate = DateFormatter.toAPIFormat(deadlineValue);
        if (dueDate) {
            params.append('dueDate', dueDate);
        }
    }

    if (keyword) {
        params.append('projectName', keyword);
    }

    return params;
}

function refreshTaskListRowData(task) {
    if (!task || !task.id) return;
    const tbody = document.getElementById('taskListModalBody');
    if (!tbody) return;
    const row = tbody.querySelector(`tr[data-id="${task.id}"]`);
    if (!row) return;

    const cells = row.querySelectorAll('td');
    if (!cells || cells.length < 8) return;

    const nameCell = cells[2];
    const stageCell = cells[3];
    const statusCell = cells[4];
    const priorityCell = cells[5];
    const driCell = cells[6];
    const dueDateCell = cells[7];

    if (nameCell) {
        nameCell.textContent = task.name || '-';
    }

    if (stageCell) {
        const stageName =
            task.stageName ||
            (task.stage && task.stage.name) ||
            getStageNameById(task.stageId, task.projectId) ||
            '-';
        stageCell.textContent = stageName;
    }

    if (statusCell) {
        const statusBadge = statusCell.querySelector('.task-status-badge');
        if (statusBadge) {
            statusBadge.textContent = getStatusLabel(task.status);
            statusBadge.className = `task-status-badge ${getStatusBadgeClass(task.status)}`;
        }
    }

    if (priorityCell) {
        const priorityBadge = priorityCell.querySelector('.priority-badge');
        if (priorityBadge) {
            priorityBadge.textContent = getPriorityLabel(task.priority);
            priorityBadge.className = `priority-badge ${getPriorityBadgeClass(task.priority)}`;
        }
    }

    if (driCell) {
        driCell.textContent = getUserLabelById(task.dri) || '-';
    }

    if (dueDateCell) {
        dueDateCell.textContent = task.dueDate || task.deadline || '-';
    }
}

export function initDashboardApp() {
    TaskDetailModal.init({
        helpers: {
            getStatusLabel,
            getStatusBadgeClass,
            getPriorityLabel,
            getPriorityBadgeClass,
            normalizeStatus,
            getStageName: getStageNameById,
            getUserLabelById,
            fetchStagesForProject: ensureProjectStages,
            fetchOptions: api.fetchOptions,
            renderOptions: ui.renderOptions,
            refreshTaskListRowData,
        },
        selectCache: SELECT_CACHE,
    });

    const startApp = () => {
        ui.moveModalsToBody();
        ui.initModalRobustness();
        initializeDashboardPage();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApp);
    } else {
        startApp();
    }

    window.addEventListener('popstate', async function () {
        const taskId = getQueryParam('taskId');
        if (taskId) {
            await openTaskFromUrl();
        } else {
            closeTaskDetail();
        }
    });
}

if (typeof window !== 'undefined') {
    if (!window.__ppapDashboardInit) {
        window.__ppapDashboardInit = true;
        initDashboardApp();
    }
}
