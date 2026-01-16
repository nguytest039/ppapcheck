<%@ page contentType="text/html;charset=UTF-8" language="java" %> <%@ taglib uri="http://www.springframework.org/tags"
prefix="spring" %>

<div class="projects-header" style="margin-top: 3.5rem;">
    <div class="projects-title">
        <span><i class="bi bi-folder2-open"></i></span>
        <span><spring:message code="dashboard" /></span>
    </div>
</div>

<div class="stats-grid">
    <!-- <div class="stat-card clickable" data-action="showDashboardTasks" data-filter="all"> -->
    <div class="stat-card clickable" data-filter="all">
        <div class="stat-header">
            <span class="stat-label"><spring:message code="totalProjects" /></span>
            <span class="stat-icon"><i class="bi bi-folder"></i></span>
        </div>
        <div id="total" class="stat-value"></div>
        <!-- <div id="last_total" class="stat-change">
            <i class="bi bi-arrow-up"></i>  <spring:message code="fromLastMonth" />
        </div> -->
    </div>

    <div class="stat-card clickable" data-action="showDashboardTasks" data-filter="in-progress">
        <div class="stat-header">
            <span class="stat-label"><spring:message code="inProgressTasks" /></span>
            <span class="stat-icon"><i class="bi bi-arrow-repeat"></i></span>
        </div>
        <div id="in_progress" class="stat-value"></div>
        <!-- <div id="last_in_progress" class="stat-change">
            <i class="bi bi-arrow-down"></i>  <spring:message code="fromLastWeek" />
        </div> -->
    </div>

    <div class="stat-card clickable" data-action="showDashboardTasks" data-filter="pending">
        <div class="stat-header">
            <span class="stat-label"><spring:message code="weeklyTodo" /></span>
            <span class="stat-icon"><i class="bi bi-hourglass-split"></i></span>
        </div>
        <div id="pending" class="stat-value"></div>
        <!-- <div id="last_pending" class="stat-change">
            <i class="bi bi-arrow-up"></i>  <spring:message code="fromYesterday" />
        </div> -->
    </div>

    <div class="stat-card clickable" data-action="showDashboardTasks" data-filter="overdue">
        <div class="stat-header">
            <span class="stat-label"><spring:message code="overdueTasks" /></span>
            <span class="stat-icon"><i class="bi bi-exclamation-triangle"></i></span>
        </div>
        <div id="overdue" class="stat-value">0</div>
        <!-- <div id="last_overdue" class="stat-change"> Tasks</div> -->
        <!-- <div id="last_overdue" class="stat-change"><spring:message code="allOnTrack" /></div> -->
    </div>
</div>

<div class="ppap-section">
    <div class="section-header">
        <span><i class="bi bi-search"></i></span>
        <span><spring:message code="advancedFilter" /></span>
    </div>
    <div class="filter-grid">
        <div class="filter-item">
            <label class="filter-label"><spring:message code="projectCustomer" /></label>
            <select class="filter-select" id="sl-customer"></select>
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="projectModel" /></label>
            <select class="filter-select" id="sl-model"></select>
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="product" /></label>
            <input class="filter-select" id="sl-product" placeholder="<spring:message code='placeholder.product' />"></input>
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="projectNumber" /></label>
            <select class="filter-select" id="pjNum"></select>
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="xvtStage" /></label>
            <select class="filter-select" id="sl-stage"></select>
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="taskStatus" /></label>
            <select class="filter-select" id="sl-status"></select>
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="priority" /></label>
            <select class="filter-select" id="sl-priority"></select>
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="department" /></label>
            <select class="filter-select" id="sl-department"></select>
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="process" /></label>
            <select class="filter-select" id="sl-process"></select>
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="dri" /></label>
            <select class="filter-select" id="dashboardFilterDRI"></select>
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="deadline" /></label>
            <input type="text" class="filter-input" id="dashboardFilterDeadline" />
        </div>
        <div class="filter-item">
            <label class="filter-label"><spring:message code="searchKeyword" /></label>
            <input type="text" class="filter-input" id="dashboardFilterSearch" placeholder="<spring:message code='placeholder.search' />" />
        </div>
    </div>
    <div class="action-buttons-row d-flex justify-content-end mt-2 gap-3">
        <button class="secondary-btn" id="reset">
            <span><i class="bi bi-arrow-repeat"></i></span>
            <span><spring:message code="reset" /></span>
        </button>
        <button class="action-btn" id="search">
            <span><i class="bi bi-search"></i></span>
            <span><spring:message code="button.search" /></span>
        </button>
    </div>
</div>

<div class="projects-header">
    <div class="projects-title">
        <span><i class="bi bi-building"></i></span>
        <span><spring:message code="projectList" /></span>
    </div>
</div>

<div class="projects-grid" id="projectsGrid"></div>

<div id="cftTeamModal" class="modal fade" tabindex="-1" aria-labelledby="cftTeamModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl">
        <div class="modal-content modal-content-large">
            <div class="modal-header">
                <div class="modal-title" id="cftTeamModalLabel">
                    <span><i class="bi bi-people"></i></span>
                    <span id="cftTeamTitle"><spring:message code="cftTeamTitle" /></span>
                </div>
                <button type="button" class="btn-close close-btn" data-bs-dismiss="modal" aria-label="Close">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="modal-body" style="overflow: hidden; max-height: 70vh">
                <div style="max-height: calc(70vh - 40px); overflow-y: auto">
                    <table class="cft-table table-fixed">
                        <thead>
                            <tr>
                                <th><spring:message code="department" /></th>
                                <th><spring:message code="label.manager" /></th>
                                <th><spring:message code="role" /></th>
                                <th><spring:message code="responsibility" /></th>
                                <th><spring:message code="label.raci" /></th>
                                <th><spring:message code="actions" /></th>
                            </tr>
                        </thead>
                        <tbody id="cftTeamBody"></tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer bottom-actions justify-content-between mt-0">
                <button type="button" class="action-btn" id="addCftMemberBtn" data-action="addCftMember">
                    <span><i class="bi bi-plus-lg"></i></span>
                    <span><spring:message code="button.add" /></span>
                </button>
                <button type="button" class="secondary-btn" data-bs-dismiss="modal">
                    <span><i class="bi bi-x-lg"></i></span>
                    <span><spring:message code="close" /></span>
                </button>
            </div>
        </div>
    </div>
</div>

<div id="taskListModal" class="modal fade" tabindex="-1" aria-labelledby="taskListModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title" id="taskListModalLabel">Tasks List</div>
                <button type="button" class="btn-close close-btn" data-bs-dismiss="modal" aria-label="Close">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="modal-body" style="overflow: hidden; max-height: 70vh">
                <div style="max-height: calc(70vh - 40px); overflow-y: auto">
                    <table class="table task-list-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th><spring:message code="taskID" /></th>
                                <th><spring:message code="taskName" /></th>
                                <th><spring:message code="stage" /></th>
                                <th><spring:message code="status" /></th>
                                <th><spring:message code="priority" /></th>
                                <th><spring:message code="dri" /></th>
                                <th><spring:message code="deadline" /></th>
                                <th><spring:message code="actions" /></th>
                            </tr>
                        </thead>
                        <tbody id="taskListModalBody"></tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer bottom-actions mt-0" style="justify-content: center">
                <button type="button" class="secondary-btn" data-bs-dismiss="modal">
                    <span><i class="bi bi-x-lg"></i></span>
                    <span><spring:message code="close" /></span>
                </button>
            </div>
        </div>
    </div>
</div>

<%@ include file="task-detail-modal.jsp" %>

<script>
    // Load i18n messages for JavaScript
    window.messages = {
        'project.customer': '<spring:message code="project.customer" />',
        'project.modelName': '<spring:message code="project.modelName" />',
        'project.product': '<spring:message code="project.product" />',
        'project.xvt': '<spring:message code="project.xvt" />',
        'project.inprogress': '<spring:message code="project.inprogress" />',
        'project.pending': '<spring:message code="project.pending" />',
        'project.overdue': '<spring:message code="project.overdue" />'
    };
    window.t = function(key) {
        return window.messages[key] || key;
    };
    window.SIGN_FLOW_I18N = {
        signed: '<spring:message code="signStatus.signed" text="signed" />',
        waiting: '<spring:message code="signStatus.waiting" text="waiting" />',
        returned: '<spring:message code="signStatus.returned" text="returned" />',
        noData: '<spring:message code="signFlow.noData" text="No data" />'
    };
</script>
<script type="module" src="/ppap-system/js/modules/task_detail_modal.js"></script>
<script type="module" src="/ppap-system/js/modules/dashboard.js"></script>



