import { TaskDetailModal, openTaskDetail, initTaskDetailModalBindings } from './task_detail_modal.js';

const t = window.t || ((key) => key);
const fixNull = (v) => v ?? '';
let USERS_CACHE = [];
const STAGE_CACHE_BY_PROJECT = {};

async function fetchUsers() {
    try {
        const res = await fetch('/ppap-system/api/users');
        if (!res.ok) {
            throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
        }
        const json = await res.json();
        return json.result || [];
    } catch (error) {
        return [];
    }
}

function filterUsers(keyword) {
    if (!keyword || keyword.length === 0) {
        return USERS_CACHE;
    }

    const lowerKeyword = keyword.toLowerCase();
    return USERS_CACHE.filter((user) => {
        const idCard = fixNull(user.idCard).toLowerCase();
        const fullName = fixNull(user.fullName).toLowerCase();
        const displayName = fixNull(user.displayName).toLowerCase();

        return idCard.includes(lowerKeyword) || fullName.includes(lowerKeyword) || displayName.includes(lowerKeyword);
    });
}

function formatUserLabel(user) {
    if (!user) return '';
    const idCard = fixNull(user.idCard).trim();
    const displayName = fixNull(user.displayName).trim();
    if (!idCard && !displayName) return '';
    return displayName ? `${idCard} - ${displayName}` : idCard;
}

function getUserLabelById(idCard) {
    if (!idCard) return '';
    const normalized = String(idCard).trim();
    const found = USERS_CACHE.find((user) => fixNull(user.idCard).toString() === normalized);
    if (found) return formatUserLabel(found);
    return normalized;
}

function normalizeStatus(status) {
    if (!status) return '';
    return String(status).trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function getStageIdByName(stageName, projectId) {
    if (!stageName) return null;
    const stages = [
        ...(projectId && STAGE_CACHE_BY_PROJECT[projectId] ? STAGE_CACHE_BY_PROJECT[projectId] : []),
        ...(SELECT_CACHE['/api/stages'] || []),
    ];
    const found = stages.find((s) => s.name === stageName);
    return found ? found.id : null;
}

function getStageNameById(stageId, projectId) {
    if (!stageId) return null;
    const stages = [
        ...(projectId && STAGE_CACHE_BY_PROJECT[projectId] ? STAGE_CACHE_BY_PROJECT[projectId] : []),
        ...(SELECT_CACHE['/api/stages'] || []),
    ];
    const found = stages.find((s) => s.id === stageId || String(s.id) === String(stageId));
    return found ? found.name : null;
}

function getProjectNameById(projectId) {
    if (!projectId) return null;
    const projects = SELECT_CACHE['/api/projects'] || [];
    const found = projects.find((p) => p.id === projectId || String(p.id) === String(projectId));
    return found ? found.name : null;
}

function getStatusBadgeClass(status) {
    const statusMap = {
        OPEN: 'status-pending',
        PENDING: 'status-gray',
        IN_PROGRESS: 'status-in-progress',
        WAITING_FOR_APPROVAL: 'status-waiting',
        COMPLETED: 'status-completed',
        OVERDUE: 'status-overdue',
        // Legacy mappings
        IN_PROCESS: 'status-in-progress',
        OVER_DUE: 'status-overdue',
    };
    return statusMap[status] || 'status-pending';
}

function getStatusLabel(status) {
    if (!status) return 'N/A';
    // Replace underscores with spaces, keep uppercase
    return status.replace(/_/g, ' ');
}

function getPriorityBadgeClass(priority) {
    if (!priority) return 'priority-medium';
    const p = priority.toLowerCase();
    return `priority-${p}`;
}

function getPriorityLabel(priority) {
    if (!priority) return 'MEDIUM';
    // Keep uppercase, replace underscores with spaces
    return priority.replace(/_/g, ' ');
}

async function fetchProjectTasks(projectId, stageId) {
    try {
        let url = `/ppap-system/api/project/${projectId}/tasks`;
        if (stageId) {
            url += `?stageId=${stageId}`;
        }
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to fetch tasks: ${res.status} ${res.statusText}`);
        }
        const json = await res.json();
        return json.data || [];
    } catch (error) {
        return [];
    }
}

function updateDRISelect() {
    const select = document.querySelector('#dashboardFilterDRI');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select DRI --</option>';

    USERS_CACHE.forEach((user) => {
        const idCard = fixNull(user.idCard);
        const fullName = fixNull(user.fullName);
        const displayName = fixNull(user.displayName);
        const option = document.createElement('option');
        option.value = idCard;
        option.textContent = formatUserLabel(user);
        select.appendChild(option);
    });

    $(select).select2({
        placeholder: 'Search DRI...',
        allowClear: true,
        width: '100%',
    });
}

async function fetchProjects(params) {
    try {
        let url = '/ppap-system/api/dashboard/projects';
        if (params && Array.from(params.entries()).length > 0) {
            url += '?' + params.toString();
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const json = await response.json();
        return json.data || [];
    } catch (error) {
        return [];
    }
}

async function renderProjects(searchParams) {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    try {
        loader.load();
        grid.innerHTML = '';
        let projectsData = await fetchProjects(searchParams);
        const keyword = document.getElementById('dashboardFilterSearch')?.value?.trim().toLowerCase();
        if (keyword) {
            projectsData = projectsData.filter((project) =>
                fixNull(project.projectName).toLowerCase().includes(keyword)
            );
        }

        projectsData.forEach((project) => {
            const xvtCompletionNumber = Number(project.xvtCompletion);
            const xvtCompletionDisplay = Number.isFinite(xvtCompletionNumber)
                ? `${xvtCompletionNumber}%`
                : '-';
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
            <div class="project-header">
                <div class="project-name">${fixNull(project.projectName)}</div>
                <button class="cft-team-btn" data-id="${project.id}" data-action="showCFTTeam">
                    <i class="bi bi-people"></i> <span>?d?? CFT Team</span>
                </button>
            </div>
            <div class="project-meta">
                <div class="meta-item">
                    <div class="meta-label">${t('project.customer')}</div>
                    <div class="meta-value">${fixNull(project.customerName) || '-'}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">${t('project.modelName')}</div>
                    <div class="meta-value">${fixNull(project.modelName)}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">${t('project.product')}</div>
                    <div class="meta-value">${fixNull(project.productName)}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">${t('project.xvt')}</div>
                    <div class="meta-value" style="color: var(--accent-cyan);">${xvtCompletionDisplay}</div>
                </div>
                <div class="meta-item clickable" data-id="${
                    project.id
                }" data-filter="in-progress" data-action="showTaskListByFilter">
                    <div class="meta-label">${t('project.inprogress')}</div>
                    <div class="meta-value" style="color: var(--accent-orange);">${fixNull(project.inProcess)}</div>
                </div>
                <div class="meta-item clickable" data-id="${
                    project.id
                }" data-filter="pending" data-action="showTaskListByFilter">
                    <div class="meta-label">${t('project.pending')}</div>
                    <div class="meta-value" style="color: var(--accent-blue);">${fixNull(project.weeklyPending)}</div>
                </div>
                <div class="meta-item clickable" data-id="${
                    project.id
                }" data-filter="overdue" data-action="showTaskListByFilter">
                    <div class="meta-label">${t('project.overdue')}</div>
                    <div class="meta-value" style="color: var(--accent-red);">${fixNull(project.overDueTask)}</div>
                </div>
            </div>
            <div class="xvt-stages-grid">
                ${renderStages(project)}
            </div>
        `;
            grid.appendChild(card);
        });
        loader.unload();
    } catch (error) {
        loader.unload();
    }
}

function renderStages(project) {
    if (!project.process || !Array.isArray(project.process) || project.process.length === 0) return '';

    const stagesPerPage = 5;
    const totalPages = Math.ceil(project.process.length / stagesPerPage);
    
    let pagesHTML = '';
    for (let page = 0; page < totalPages; page++) {
        const start = page * stagesPerPage;
        const end = Math.min(start + stagesPerPage, project.process.length);
        const pageStages = project.process.slice(start, end);
        
        const stagesHTML = pageStages.map((process) => {
            const percentage = Math.round(process.doneRate * 100);
            const circumference = 2 * Math.PI * 54;
            const offset = circumference - (percentage / 100) * circumference;
            let strokeColor = '#4CAF50';
            if (percentage < 50) strokeColor = '#f44336';
            else if (percentage < 80) strokeColor = '#FF9800';

            return `
            <div class="stage-gauge" data-id="${project.id}" data-stage="${process.id}" data-action="showTaskListByStage">
                <div class="stage-label">${process.processName}</div>
                <div class="gauge-circle">
                    <svg width="120" height="120">
                        <circle class="gauge-bg" cx="60" cy="60" r="54"></circle>
                        <circle class="gauge-progress" cx="60" cy="60" r="54"
                            stroke="${strokeColor}"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${offset}">
                        </circle>
                    </svg>
                    <div class="gauge-text">
                        <div class="gauge-percentage">${percentage}%</div>
                        <div class="gauge-fraction">${process.taskDone}/${process.taskTotal}</div>
                    </div>
                </div>
                <div class="gauge-date">${process.taskDone}/${process.taskTotal}</div>
            </div>`;
        }).join('');

        pagesHTML += `<div class="stages-page" style="display: ${page === 0 ? 'grid' : 'none'}">${stagesHTML}</div>`;
    }

    const navHTML = totalPages > 1 ? `
        <div class="stages-pagination">
            <button class="stages-nav stages-prev" disabled>
                <i class="bi bi-chevron-left"></i>
            </button>
            <span class="stages-page-info">
                <span class="stages-current">1</span> / <span class="stages-total">${totalPages}</span>
            </span>
            <button class="stages-nav stages-next" ${totalPages === 1 ? 'disabled' : ''}>
                <i class="bi bi-chevron-right"></i>
            </button>
        </div>
    ` : '';

    return `
        <div class="xvt-stages-wrapper" data-page="0" data-total="${totalPages}">
            <div class="xvt-stages-grid">${pagesHTML}</div>
            ${navHTML}
        </div>
    `;
}

async function showCFT(projectId) {
    try {
        loader.load();
        const response = await fetch(`/ppap-system/api/project/${projectId}/raci`);
        if (!response.ok) {
            throw new Error(`Failed to fetch CFT Team: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const cftTeamData = result.data || [];

        // Get department cache for mapping
        const departments = SELECT_CACHE['/api/departments'] || [];
        const deptMap = {};
        departments.forEach((dept) => {
            deptMap[dept.id] = dept.name;
        });

        const modal = document.getElementById('cftTeamModal');
        const title = document.getElementById('cftTeamTitle');
        const tbody = document.getElementById('cftTeamBody');

        // Resolve project name from multiple sources: cache, DOM, or API fallback
        let projectName = getProjectNameById(projectId);
        try {
            if (!projectName || String(projectName) === String(projectId)) {
                // Try to find project card in DOM
                try {
                    const btn = document.querySelector(`[data-action="showCFTTeam"][data-id="${projectId}"]`);
                    if (btn) {
                        const card = btn.closest('.project-card');
                        const nameEl = card ? card.querySelector('.project-name') : null;
                        if (nameEl && nameEl.textContent && nameEl.textContent.trim()) {
                            projectName = nameEl.textContent.trim();
                        }
                    }
                } catch (e) {
                    // ignore DOM lookup errors
                }
            }

            // If still not found, try API to fetch project details
            if (!projectName || String(projectName) === String(projectId)) {
                try {
                    const prRes = await fetch(`/ppap-system/api/project/${encodeURIComponent(projectId)}`);
                    if (prRes.ok) {
                        const prJson = await prRes.json();
                        const pr = prJson.data || prJson.result || null;
                        if (pr && (pr.projectName || pr.name)) projectName = pr.projectName || pr.name;
                        else if (pr && pr.id && pr.id === projectId && pr.name) projectName = pr.name;
                    }
                } catch (e) {
                    // ignore fetch errors
                }
            }
        } catch (e) {
            console.warn('Failed to resolve project name for CFT modal', e);
        }

        if (!projectName) projectName = projectId;
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

        loader.unload();
        var bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } catch (error) {
        loader.unload();
        showAlertError('L?i', 'Khong th? t?i thong tin CFT Team');
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
        showAlertError('Error', 'Project ID not found');
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
        const result = await Swal.fire({
            title: 'Confirm Delete',
            text: 'Are you sure you want to delete this CFT member?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel',
        });

        if (!result.isConfirmed) return;

        loader.load();
        const response = await fetch('/ppap-system/api/raci/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `id=${raciId}`,
        });

        if (!response.ok) {
            throw new Error(`Failed to delete RACI: ${response.status}`);
        }

        loader.unload();
        showAlertSuccess('Success', 'CFT member deleted successfully');

        if (row) {
            row.remove();
        }
    } catch (error) {
        loader.unload();
        showAlertError('Error', 'Failed to delete CFT member');
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
        showAlertWarning('Validation', 'Please select a department');
        return;
    }

    if (!manager) {
        showAlertWarning('Validation', 'Please select a manager');
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
        const response = await fetch('/ppap-system/api/raci/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(raciData),
        });

        if (!response.ok) {
            throw new Error(`Failed to create RACI: ${response.status}`);
        }

        const result = await response.json();
        loader.unload();

        showAlertSuccess('Success', 'CFT member added successfully');

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
                <button class="action-icon-btn cft-delete-btn" data-raci-id="${result.data?.id || ''}" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        row.classList.remove('cft-new-row');
    } catch (error) {
        loader.unload();
        showAlertError('Error', 'Failed to add CFT member');
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

        const tasks = await fetchProjectTasks(projectId, stageId);

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
            // Fetch tasks for specific project with status filter
            const params = new URLSearchParams();
            if (status) {
                params.append('status', status);
            }
            params.append('id', projectId);
            const encodedProjectId = encodeURIComponent(projectId);
            const baseUrl = `/ppap-system/api/project/${encodedProjectId}/tasks`;
            const query = params.toString();
            const res = await fetch(query ? `${baseUrl}?${query}` : baseUrl);
            if (res.ok) {
                const json = await res.json();
                tasks = json.data || [];
                
                const projectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean))];
                await Promise.all(projectIds.map(pid => ensureProjectStages(pid)));
            }
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

        // Build API URL
        let url = `/ppap-system/api/dashboard/tasks?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
        if (status) {
            url += `&status=${encodeURIComponent(status)}`;
        }

        const res = await fetch(url);
        let tasks = [];
        if (res.ok) {
            const json = await res.json();
            tasks = json.data || [];
            
            // ? THEM: Load stages cho t?t c? projects trong task list
            const projectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean))];
            await Promise.all(projectIds.map(pid => ensureProjectStages(pid)));
        }

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
        showAlertError('Error', 'Task ID is required');
        return;
    }

    try {
        const result = await Swal.fire({
            title: 'Confirm Delete',
            text: 'Are you sure you want to delete this task?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel',
        });

        if (!result.isConfirmed) return;

        loader.load();
        const res = await fetch(`/ppap-system/api/tasks/delete?id=${encodeURIComponent(taskId)}`, {
            method: 'POST',
        });

        if (!res.ok) {
            throw new Error(`Failed to delete task: ${res.status}`);
        }

        const json = await res.json();
        const serverOk = json.status === 'OK' || json.success === true || json.result === 'OK';

        if (!serverOk) {
            throw new Error('Server reported failure when deleting task');
        }

        loader.unload();
        showAlertSuccess('Success', 'Task deleted successfully');

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
        showAlertError('Error', 'Failed to delete task');
    }
}

function closeTaskDetail() {
    const modal = document.getElementById('taskDetailModal');
    const bsModal = bootstrap.Modal.getInstance(modal);
    if (bsModal) bsModal.hide();

    restoreOriginalUrl(modal);
}

function restoreOriginalUrl(modal) {
    if (!modal) return;

    try {
        const originalUrl = modal.dataset.originalUrl;
        if (originalUrl) {
            window.history.replaceState(null, '', originalUrl);
            delete modal.dataset.originalUrl;
        }
    } catch (e) {
        console.warn('Failed to restore original URL', e);
    }
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

    const searchInput = document.getElementById('dashboardFilterSearch');
    if (searchInput) {
        searchInput.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                applyDashboardFilters();
            }
        });
    }

    const searchBtn = document.getElementById('search');
    if (searchBtn) {
        searchBtn.addEventListener('click', applyDashboardFilters);
    }

    const resetBtn = document.getElementById('reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetDashboardFilters);
    }

    showDatePicker('dashboardFilterDeadline');
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

function moveModalsToBody() {
    try {
        document.querySelectorAll('.modal').forEach(function (modal) {
            if (modal && modal.parentElement && modal.parentElement !== document.body) {
                document.body.appendChild(modal);
            }
        });
    } catch (e) {
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', moveModalsToBody);
} else {
    moveModalsToBody();
}

function initModalRobustness() {
    try {
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                m.addedNodes &&
                    m.addedNodes.forEach(function (node) {
                        if (!(node instanceof HTMLElement)) return;
                        if (node.classList && node.classList.contains('modal')) {
                            if (node.parentElement !== document.body) document.body.appendChild(node);
                        }
                    });
            });
        });
        observer.observe(document.documentElement || document.body, {childList: true, subtree: true});
    } catch (e) {
    }

    document.addEventListener('show.bs.modal', function (ev) {
        try {
            var modalEl = ev.target;
            if (modalEl && modalEl.parentElement !== document.body) document.body.appendChild(modalEl);

            var loader = document.getElementById('loader');
            if (loader && !loader.classList.contains('d-none')) loader.classList.add('d-none');
        } catch (e) {
        }
    });

    document.addEventListener('shown.bs.modal', function (ev) {
        try {
            var modalEl = ev.target;
            var allModals = document.querySelectorAll('.modal.show');
            var backdrops = document.querySelectorAll('.modal-backdrop');
            
            // Ensure each modal and backdrop has proper z-index for stacking
            if (allModals.length > 0) {
                allModals.forEach(function (modal, idx) {
                    var baseZIndex = 1050 + (idx * 20);
                    modal.style.zIndex = (baseZIndex + 10).toString();
                });
            }
            
            if (backdrops.length > 0) {
                backdrops.forEach(function (backdrop, idx) {
                    var baseZIndex = 1050 + (idx * 20);
                    backdrop.style.zIndex = baseZIndex.toString();
                });
            }
        } catch (e) {
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalRobustness);
} else {
    initModalRobustness();
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

async function fetchOptions(endpoint, params = {}) {
    try {
        const query = new URLSearchParams(params).toString();
        const url = `/ppap-system${endpoint}${query ? `?${query}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response was not ok');
        const json = await res.json();
        return json.data || [];
    } catch (error) {
        return [];
    }
}

async function ensureProjectStages(projectId) {
    if (!projectId) return [];
    if (STAGE_CACHE_BY_PROJECT[projectId]) return STAGE_CACHE_BY_PROJECT[projectId];

    const stages = await fetchOptions('/api/stages', {projectId});
    if (Array.isArray(stages)) {
        STAGE_CACHE_BY_PROJECT[projectId] = stages;
        return stages;
    }
    return [];
}

function renderOptions(selectId, items) {
    const sl = document.querySelector(`#${selectId}`);
    if (!sl) return;

    let html = '<option value="">-- Select --</option>';

    if (Array.isArray(items)) {
        let otp = items
            .map((i) => {
                if (typeof i === 'string' || typeof i === 'number') {
                    return `<option value="${i}">${i}</option>`;
                } else if (i && typeof i === 'object' && i.id && i.name) {
                    return `<option value="${i.id}">${i.name}</option>`;
                } else if (i && typeof i === 'object' && i.id) {
                    return `<option value="${i.id}">${i.name || i.id}</option>`;
                } else return '';
            })
            .join('');
        html += otp;
    }

    sl.innerHTML = html;
}



async function loadAllSelects() {
    const simpleConfigs = SELECT_CONFIGS.filter((cfg) => !cfg.params);
    const res = await Promise.all(simpleConfigs.map((cfg) => fetchOptions(cfg.endpoint)));

    simpleConfigs.forEach((cfg, i) => {
        const items = res[i] || [];
        renderOptions(cfg.id, items);
        SELECT_CACHE[cfg.endpoint] = items;
    });

    const pjNumSelect = document.querySelector('#pjNum');
    if (pjNumSelect) {
        pjNumSelect.innerHTML = '<option value="">-- Select Project --</option>';
    }
}

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

function rangePicker($input, fromDate, toDate) {
    const start = fromDate && window.moment ? window.moment(fromDate.split(' ')[0], 'YYYY/MM/DD') : null;
    const end = toDate && window.moment ? window.moment(toDate.split(' ')[0], 'YYYY/MM/DD') : null;

    $input.daterangepicker({
        startDate: start || window.moment().subtract(3, 'months'),
        endDate: end || window.moment(),
        autoApply: false,
        locale: {format: 'YYYY/MM/DD'},
    });
}

function singlePicker($input, workDate) {
    const start = workDate && window.moment ? window.moment(workDate.split(' ')[0], 'YYYY/MM/DD') : null;

    $input.daterangepicker({
        singleDatePicker: true,
        startDate: start || window.moment(),
        autoApply: false,
        locale: {format: 'YYYY/MM/DD'},
    });
}

function showDatePicker(id) {
    const $input = $(`#${id}`);
    if (!$input || $input.length === 0) return;

    singlePicker($input);

    if (!$input.val()) {
        let todayStr = '';
        if (window.moment) {
            todayStr = window.moment().format('YYYY/MM/DD');
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = ('0' + (now.getMonth() + 1)).slice(-2);
            const day = ('0' + now.getDate()).slice(-2);
            todayStr = `${year}/${month}/${day}`;
        }
        $input.val(todayStr);
    }
}

async function loadSummary() {
    try {
        const endpoint = '/ppap-system/api/dashboard/summary';

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

        const q1 = `?startTime=${encodeURIComponent(fmtDate(startThisMonth))}&endTime=${encodeURIComponent(
            fmtDate(endThisMonth)
        )}`;
        const q2 = `?startTime=${encodeURIComponent(fmtDate(startPrevMonth))}&endTime=${encodeURIComponent(
            fmtDate(endPrevMonth)
        )}`;
        
        const q5 = `?startTime=${encodeURIComponent(fmtDate(startThisWeekForPending))}&endTime=${encodeURIComponent(
            fmtDate(endThisWeekForPending)
        )}`;
        const q6 = `?startTime=${encodeURIComponent(fmtDate(startLastWeekForPending))}&endTime=${encodeURIComponent(
            fmtDate(endLastWeekForPending)
        )}`;

        const [r1, r2, r5, r6] = await Promise.all([
            fetch(endpoint + q1), 
            fetch(endpoint + q2),
            fetch(endpoint + q5),
            fetch(endpoint + q6)
        ]);
        if (!r1.ok || !r2.ok || !r5.ok || !r6.ok) throw new Error('Error fetching summary');

        const j1 = await r1.json();
        const j2 = await r2.json();
        const j5 = await r5.json();
        const j6 = await r6.json();

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
        renderOptions('pjNum', []);
        return;
    }

    const items = await fetchOptions('/api/projects', {customerId, model});
    renderOptions('pjNum', items);
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
                alert('????');
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
    USERS_CACHE = await fetchUsers();
    updateDRISelect();
}

async function initializeDashboardPage() {
    loadEvent();
    await loadData();
    initCommentMentionAutocomplete();
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

TaskDetailModal.init({
    helpers: {
        getStatusLabel,
        getStatusBadgeClass,
        getPriorityLabel,
        getPriorityBadgeClass,
        normalizeStatus,
        getStageName: getStageNameById,
        getUserLabelById,
        formatCommentContent,
        fetchOptions,
        renderOptions,
        refreshTaskListRowData,
    },
    selectCache: SELECT_CACHE,
});

document.addEventListener('DOMContentLoaded', function () {
    initializeDashboardPage();
});

function getTaskIdFromLocation() {
    try {
        const params = new URLSearchParams(window.location.search || '');
        const qTaskId = params.get('taskId');
        if (qTaskId) return qTaskId;
        return null;
    } catch (e) {
        console.warn('getTaskIdFromLocation error', e);
        return null;
    }
}

function getProjectIdFromLocation() {
    try {
        const params = new URLSearchParams(window.location.search || '');
        const qProjectId = params.get('projectId');
        if (qProjectId) return qProjectId;
        return null;
    } catch (e) {
        console.warn('getProjectIdFromLocation error', e);
        return null;
    }
}

async function openTaskFromUrl() {
    const taskId = getTaskIdFromLocation();
    if (!taskId) return;

    const modalRoot = document.getElementById('taskDetailModal');
    if (modalRoot && modalRoot.dataset.taskId === taskId) {
        return;
    }

    const projectIdFromUrl = getProjectIdFromLocation();

    try {
        const res = await fetch(`/ppap-system/api/tasks/${encodeURIComponent(taskId)}`);
        if (!res.ok) {
            console.warn('openTaskFromUrl: task API returned', res.status, res.statusText);
            await editTaskDetail(taskId, projectIdFromUrl);
            return;
        }

        const json = await res.json();
        const task = json.data || json.result || null;
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
                if (!modalRoot.dataset.originalUrl) {
                    modalRoot.dataset.originalUrl = window.location.href;
                }

                const url = new URL(window.location.href);
                url.searchParams.set('taskId', String(taskId));
                window.history.pushState(
                    {
                        taskId: taskId,
                        projectId: projectId || null,
                        originalUrl: modalRoot.dataset.originalUrl,
                    },
                    '',
                    url.toString()
                );
            } catch (e) {}
        },
    });
}

window.addEventListener('popstate', async function () {
    const taskId = getTaskIdFromLocation();
    if (taskId) {
        await openTaskFromUrl();
    } else {
        closeTaskDetail();
    }
});

const DateFormatter = {
    toAPIFormat(dateStr) {
        if (!dateStr || dateStr === '-' || String(dateStr).toUpperCase() === 'N/A') {
            return null;
        }

        const str = String(dateStr).trim();

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
    const idCard = fixNull(user.idCard).trim();
    if (idCard) return idCard;
    const displayName = fixNull(user.displayName).trim();
    if (displayName) return displayName;
    const fullName = fixNull(user.fullName).trim();
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
                const idCard = fixNull(user.idCard).trim();
                const displayName = fixNull(user.displayName).trim();
                const fullName = fixNull(user.fullName).trim();
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
















function initTaskDetailDriSelect2() {
    try {
        const driSelect = document.getElementById('dri');
        if (driSelect && window.jQuery && typeof $.fn.select2 === 'function') {
            const modalRoot = document.getElementById('taskDetailModal');

            if ($(driSelect).data('select2')) {
                $(driSelect).select2('destroy');
            }

            // Populate options first
            driSelect.innerHTML = '<option value="">-- Select DRI --</option>';
            if (USERS_CACHE && USERS_CACHE.length > 0) {
                USERS_CACHE.forEach((user) => {
                    const option = document.createElement('option');
                    option.value = user.idCard || '';
                    option.textContent = formatUserLabel(user);
                    driSelect.appendChild(option);
                });
            }

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
                dropdownParent: $(modalRoot),
            });

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

            $select.off('select2:open.dashboardDri');
            $select.on('select2:open.dashboardDri', function () {
                const searchField = document.querySelector('.select2-container--open .select2-search__field');
                if (!searchField) return;

                if (searchField._dashboardDriEnterHandler) {
                    searchField.removeEventListener('keydown', searchField._dashboardDriEnterHandler);
                }
                if (searchField._dashboardDriInputHandler) {
                    searchField.removeEventListener('input', searchField._dashboardDriInputHandler);
                }

                searchField._dashboardDriEnterHandler = async function (ev) {
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
                            return;
                        }

                        const json = await res.json();
                        const user = json.data || json.result || null;
                        if (!user) return;

                        const idCard = String(user.idCard || term).trim();
                        const found = USERS_CACHE.some((u) => String(u.idCard || '').trim() === idCard);
                        if (!found) USERS_CACHE.push(user);

                        driSelect.innerHTML = '<option value="">-- Select DRI --</option>';
                        if (USERS_CACHE && USERS_CACHE.length > 0) {
                            USERS_CACHE.forEach((u) => {
                                const option = document.createElement('option');
                                option.value = u.idCard || '';
                                option.textContent = formatUserLabel(u);
                                driSelect.appendChild(option);
                            });
                        }

                        $select.val(idCard).trigger('change.select2');
                        $select.select2('close');
                    } catch (e) {
                    }
                };

                searchField._dashboardDriInputHandler = function () {
                    updateNoResultsMessage(searchField.value || '');
                };

                searchField.addEventListener('keydown', searchField._dashboardDriEnterHandler);
                searchField.addEventListener('input', searchField._dashboardDriInputHandler);
                updateNoResultsMessage(searchField.value || '');
            });
        }
    } catch (e) {
        console.warn('Failed to initialize DRI select2', e);
    }
}

function refreshTaskListRowData(task) {
    if (!task || !task.id) return;
    const tbody = document.getElementById('taskListModalBody');
    if (!tbody) return;
    const row = tbody.querySelector(`tr[data-id="${task.id}"]`);
    if (!row) return;

    const cells = row.querySelectorAll('td');
    if (!cells || cells.length < 8) return;

    const statusCell = cells[4];
    const priorityCell = cells[5];
    const driCell = cells[6];
    const dueDateCell = cells[7];

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
