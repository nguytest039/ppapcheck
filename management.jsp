<%@ page contentType="text/html;charset=UTF-8" language="java" %> <%@ taglib uri="http://www.springframework.org/tags"
prefix="spring" %>
<div class="component-wrapper fit pb-0 mb-0">
<div class="projects-header d-flex">
    <div class="projects-title">
        <span><i class="bi bi-clipboard-check"></i></span>
        <span><spring:message code="ppapTaskManagement" /></span>
    </div>
</div>

<div class="ppap-section">
    <div class="section-header component-title">
        <span><i class="bi bi-search"></i></span>
        <span><spring:message code="advancedFilter" /></span>
    </div>
    <div class="filter-grid">
        <div class="filter-item">
            <label class="filter-label plus ml-1 mb-0">Project Name</label>
            <input type="text" class="filter-select" id="ppapFilterProject" placeholder="Search..." />
        </div>

        <div class="filter-item">
            <label class="filter-label plus ml-1 mb-0"><spring:message code="projectCustomer" /></label>
            <select class="filter-input" id="projectCustomerSelect">
                <option value="">--Select--</option>
                <option value="1">Apollo</option>
                <option value="2">Rhea</option>
                <option value="3">Kronos</option>
            </select>
        </div>

        <div class="filter-item">
            <label class="filter-label plus ml-1 mb-0">Created By</label>
            <select id="filter-created-by" class="filter-input"></select>
        </div>

        <div class="filter-item">
            <label class="filter-label plus ml-1 mb-0">Status</label>
            <select class="filter-input" id="ppapFilterProjectStatus">
                <option value="">--Select--</option>
            </select>
        </div>

        <div class="filter-item">
            <label class="filter-label plus ml-1 mb-0">Created Date</label>
            <input id="filter-created-date" type="text" class="filter-input" />
        </div>
    </div>
    <!-- <div class="filter-grid">
            <div class="filter-item">
                <label class="filter-label"><spring:message code="projectNumber" /></label>
                <select class="filter-select" id="ppapFilterProject">
                    <option value=""><spring:message code="all" /></option>
                    <option value="FTV-001">FTV-001</option>
                    <option value="FTV-002">FTV-002</option>
                    <option value="FTV-003">FTV-003</option>
                    <option value="FTV-004">FTV-004</option>
                    <option value="FTV-005">FTV-005</option>
                </select>
            </div>
            <div class="filter-item">
                <label class="filter-label"><spring:message code="projectCustomer" /></label>
                <select class="filter-select" id="ppapFilterCustomer">
                    <option value=""><spring:message code="all" /></option>
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Google">Google</option>
                    <option value="Microsoft">Microsoft</option>
                    <option value="Dell">Dell</option>
                </select>
            </div>
            <div class="filter-item">
                <label class="filter-label"><spring:message code="projectModel" /></label>
                <select class="filter-select" id="ppapFilterModel">
                    <option value=""><spring:message code="all" /></option>
                    <option value="MacBook Pro">MacBook Pro</option>
                    <option value="Galaxy Tab">Galaxy Tab</option>
                    <option value="Pixel Watch">Pixel Watch</option>
                    <option value="Surface Laptop">Surface Laptop</option>
                    <option value="XPS Desktop">XPS Desktop</option>
                </select>
            </div>
            <div class="filter-item">
                <label class="filter-label"><spring:message code="xvtStage" /></label>
                <select class="filter-select" id="ppapFilterStage">
                    <option value=""><spring:message code="all" /></option>
                    <option value="HVT">HVT</option>
                    <option value="EVT">EVT</option>
                    <option value="DVT">DVT</option>
                    <option value="PVT">PVT</option>
                    <option value="MP">MP</option>
                </select>
            </div>
            <div class="filter-item">
                <label class="filter-label"><spring:message code="taskStatus" /></label>
                <select class="filter-select" id="ppapFilterStatus">
                    <option value=""><spring:message code="all" /></option>
                    <option value="pending"><spring:message code="pending" /></option>
                    <option value="in-progress"><spring:message code="inProgress" /></option>
                    <option value="completed"><spring:message code="completed" /></option>
                </select>
            </div>
            <div class="filter-item">
                <label class="filter-label"><spring:message code="priority" /></label>
                <select class="filter-select" id="ppapFilterPriority">
                    <option value=""><spring:message code="all" /></option>
                    <option value="high"><spring:message code="high" /></option>
                    <option value="medium"><spring:message code="medium" /></option>
                    <option value="low"><spring:message code="low" /></option>
                </select>
            </div>
            <div class="filter-item">
                <label class="filter-label"><spring:message code="department" /></label>
                <select class="filter-select" id="ppapFilterDepartment">
                    <option value=""><spring:message code="all" /></option>
                    <option value="PQE">PQE</option>
                    <option value="TPM">TPM</option>
                    <option value="RD">RD</option>
                    <option value="PE">PE</option>
                    <option value="ME">ME</option>
                    <option value="PQA">PQA</option>
                    <option value="SQE">SQE</option>
                    <option value="IQC">IQC</option>
                </select>
            </div>
            <div class="filter-item">
                <label class="filter-label"><spring:message code="process" /></label>
                <select class="filter-select" id="ppapFilterProcess">
                    <option value=""><spring:message code="all" /></option>
                    <option value="Supplier">Supplier</option>
                    <option value="IQC">IQC</option>
                    <option value="Kitting">Kitting</option>
                    <option value="SMT">SMT</option>
                    <option value="PCBA">PCBA</option>
                    <option value="Assembly">Assembly</option>
                    <option value="Test">Test</option>
                    <option value="Pack">Pack</option>
                    <option value="OBA">OBA</option>
                    <option value="WH">WH</option>
                    <option value="OTH">OTH</option>
                </select>
            </div>
            <div class="filter-item">
                <label class="filter-label"><spring:message code="dri" /></label>
                <select class="filter-select" id="ppapFilterDRI">
                    <option value=""><spring:message code="all" /></option>
                    <option value="張工程師">張工程師</option>
                    <option value="李經理">李經理</option>
                    <option value="王品保">王品保</option>
                    <option value="林製程">林製程</option>
                    <option value="周工程師">周工程師</option>
                </select>
            </div>
            <div class="filter-item">
                <label class="filter-label"><spring:message code="deadline" /></label>
                <input type="date" class="filter-input" id="ppapFilterDeadline" />
            </div>
            <div class="filter-item d-flex">
                <label class="filter-label"><spring:message code="searchKeyword" /></label>
                <input type="text" class="filter-input" id="ppapFilterSearch" placeholder="輸入關鍵字..." />
            </div>
        </div> -->
    <div class="d-flex justify-content-end">
        <button id="clear_filter_button" type="button" class="btn btn-sm secondary-btn mr-4">
            <i class="bi bi-x-circle"></i> Clear
        </button>
        <button id="filter_button" type="button" class="btn btn-sm btn-secondary action-btn ">
            <i class="bi bi-search"></i> Search
        </button>
    </div>
</div>

<div class="ppap-section mb-0" id="projectListSection" style="height: 60vh;">
    <div class="section-header d-flex justify-content-between">
        <div class="component-title">
            <span><i class="bi bi-list-ul"></i></span>
            <span>Project List</span>
        </div>
        <button class="primary-btn" id="createProjectBtn" onclick="showCreateProjectForm()">
            <span><i class="bi bi-plus-square"></i></span>
            <span><spring:message code="createNewProject" /></span>
        </button>
    </div>
    <div id="projectListContainer" class="table-box plus">
        <table class="table">
            <thead>
                <tr>
                    <th><spring:message code="customer" /></th>
                    <th>Project Name</th>
                    <th><spring:message code="status" /></th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th>Approved By</th>
                    <th>Approved At</th>
                    <th><spring:message code="actions" /></th>
                </tr>
            </thead>
            <tbody id="otherProjectsBody"></tbody>
        </table>
    </div>
</div>

<div class="ppap-section" id="operationOptionsSection" style="display: none">
    <div class="section-header">
        <span><i class="bi bi-gear"></i></span>
        <span><spring:message code="operationOptions" /></span>
    </div>
    <div class="action-buttons-row">
        <button class="action-btn" onclick="showStandardPPAP()">
            <span><i class="bi bi-clipboard-check"></i></span>
            <span><span id="size"></span><spring:message code="standard26PPAP" /></span>
        </button>
        <button class="action-btn" onclick="showCustomTask()">
            <span><i class="bi bi-plus-circle"></i></span>
            <span><spring:message code="customTask" /></span>
        </button>
        <button class="action-btn" onclick="showCopyTemplate()">
            <span><i class="bi bi-clipboard-check"></i></span>
            <span><spring:message code="copyProjectTemplate" /></span>
        </button>
    </div>
    <div class="bottom-actions" style="margin-top: 20px">
        <button class="secondary-btn" onclick="cancelProjectCreation()">
            <span><i class="bi bi-x-circle"></i></span>
            <span>Cancel</span>
        </button>
        <button class="secondary-btn" onclick="showRACIMatrix()">
            <span><i class="bi bi-grid-3x3"></i></span>
            <span><spring:message code="viewRACIMatrix" /></span>
        </button>
        <button class="primary-btn" onclick="submitProject()">
            <span><i class="bi bi-check-circle"></i></span>
            <span><spring:message code="submitProject" /></span>
        </button>
    </div>
</div>

<!-- Standard PPAP Modal -->
<div
    id="standardPPAPModal"
    class="modal fade"
    tabindex="-1"
    aria-labelledby="standardPPAPModalLabel"
    aria-hidden="true"
>
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title" id="standardPPAPModalLabel">
                    <span><i class="bi bi-clipboard-check"></i></span>
                    <span><spring:message code="standardPPAPTitle" /></span>
                </div>
                <button type="button" class="btn-close close-btn" data-bs-dismiss="modal" aria-label="Close">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="modal-body" style="min-height: 400px; max-height: 60vh;">
                <p style="color: var(--text-secondary); margin-bottom: 20px">
                    <span>Select task to add to the project:</span>
                </p>
                <div class="ppap-actions d-flex justify-content-between mb-2 ml-3 mr-3">
                    <div class="">
                        <button class="select-all-btn" onclick="selectAllPPAP()">
                            <span><i class="bi bi-check-square"></i> Select All</span>
                        </button>
                        <button class="deselect-all-btn" onclick="deselectAllPPAP()">
                            <span><i class="bi bi-square"></i> Deselect All</span>
                        </button>
                    </div>
                    <div class="">
                        <input id="filter-standard-ppap" class="filter-input" type="text" placeholder="Search tasks...">
                    </div>
                </div>
                <div class="ppap-tasks-grid" id="ppapTasksGrid" style="overflow-y: auto; max-height: calc(60vh - 120px);">
                    <!-- PPAP tasks will be populated here -->
                </div>
            </div>
            <div class="modal-footer bottom-actions mt-0">
                <button type="button" class="secondary-btn" data-bs-dismiss="modal">
                    <span><i class="bi bi-x-lg"></i></span>
                    <span>Cancel</span>
                </button>
                <button type="button" class="primary-btn" onclick="confirmPPAPSelection()">
                    <span><i class="bi bi-check-lg"></i></span>
                    <span>Confirm</span>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Project Tasks Modal-->
<div
    id="projectTasksModal"
    class="modal fade"
    tabindex="-1"
    aria-labelledby="projectTasksModalLabel"
    aria-hidden="true"
>
    <div class="modal-dialog modal-xl">
        <div class="modal-content" style="max-height: 95vh;">
            <div class="modal-header">
                <div class="modal-title" id="projectTasksModalLabel">
                    <span><i class="bi bi-list-task"></i></span>
                    <span>Project Tasks</span>
                </div>
                <button type="button" class="btn-close close-btn" data-bs-dismiss="modal" aria-label="Close">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="modal-body" style="overflow: hidden;">
                <div class="detail-operation-list" style="display: flex; gap: 16px; align-items: flex-start">
                    <div
                        class="detail-block"
                        style="
                            flex: 1;
                            min-width: 220px;
                        "
                    >
                        <div class="component-title">
                            <span class="d-inline-flex mb-3" style="gap: 0.3rem;"><i class="bi bi-info-circle"></i> Details</span>
                        </div>
                        <input type="hidden" id="pt_detail_projectId" />

                        <div class="filter-grid">
                            <div class="filter-item">
                                <label class="filter-label mb-0 ml-1" for="pt_detail_customer">Customer</label>
                                <input type="text" class="filter-input" id="pt_detail_customer" placeholder="" />
                            </div>

                            <div class="filter-item">
                                <label class="filter-label mb-0 ml-1" for="pt_detail_projectName">Project</label>
                                <input type="text" class="filter-input" id="pt_detail_projectName" placeholder="" />
                            </div>

                            <div class="filter-item">
                                <label class="filter-label mb-0 ml-1" for="pt_detail_createdDate">Created</label>
                                <input type="text" class="filter-input" id="pt_detail_createdDate" />
                            </div>

                            <div class="filter-item">
                                <label class="filter-label mb-0 ml-1">Status</label>
                                <input type="text" class="filter-input" id="pt_detail_status" />
                            </div>
                        </div>
                        <div class="d-flex justify-content-end"></div>
                    </div>
                </div>
                <div
                    id="operation-add"
                    class="operation-block"
                >
                    <div class="component-title mb-3">
                        <div class="d-inline-flex" style="gap: 0.3rem;"><i class="bi bi-file-earmark-plus"></i> Operation Options</div>
                    </div>
                    <div class="action-buttons-row" style="display: flex; gap: 8px; flex-wrap: wrap">
                        <button class="action-btn" onclick="showStandardPPAP()">
                            <span><i class="bi bi-clipboard-check"></i></span>
                            <span><span id="size-ppap"></span> Standard PPAP</span>
                        </button>
                        <button class="action-btn" onclick="showCustomTask()">
                            <span><i class="bi bi-plus-circle"></i></span>
                            <span>Custom Task</span>
                        </button>
                        <button id="copy-template" class="action-btn" onclick="showCopyTemplate()">
                            <span><i class="bi bi-clipboard-check"></i></span>
                            <span>Copy From Template</span>
                        </button>
                    </div>
                </div>
                <div class="component-title mt-3 d-flex justify-content-between align-items-center">
                    <span class="d-inline-flex" style="gap: 0.3rem;"><i class="bi bi-list-task"></i> Tasks List </span>
                    <input id="search-task" class="filter-input" type="text" placeholder="Search...">
                </div>
                <div
                    id="projectTasksContent"
                    style="
                        margin-top: 12px;
                        max-height: 60vh;
                        overflow-y: auto;
                    "
                ></div>
            </div>
            <div class="modal-footer bottom-actions mt-0">
                <button type="button" class="secondary-btn" data-bs-dismiss="modal">
                    <span><i class="bi bi-x-lg"></i></span>
                    <span>Close</span>
                </button>
                <button class="btn action-btn btn-secondary" onclick="saveProjectTaskQuantity()">
                    <i class="bi bi-floppy"></i> Save
                </button>
                <button class="btn btn-secondary action-btn" onclick="projectTasksSubmit()">
                    <i class="bi bi-check-circle"></i> Submit
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Custom Task Modal -->
<div id="customTaskModal" class="modal fade" tabindex="-1" aria-labelledby="customTaskModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl">
        <div class="modal-content modal-content-wide">
            <div class="modal-header">
                <div class="modal-title" id="customTaskModalLabel">
                    <span><i class="bi bi-plus-circle"></i></span>
                    <span>Add custom task</span>
                </div>
                <button type="button" class="btn-close close-btn" data-bs-dismiss="modal" aria-label="Close">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="project-form-grid">
                    <div class="form-group">
                        <label class="form-label">Task Name <span class="required">*</span></label>
                        <input id="custom-task-name" type="text" class="form-input" placeholder="" />
                    </div>
                    <!-- <div class="form-group d-none">
                        <label class="form-label">Department ID<span class="required">*</span></label>
                        <input id="custom-task-id" type="text" class="form-input" placeholder="" />
                    </div> -->
                    <div class="form-group">
                        <label class="form-label">xVT <span class="required">*</span></label>
                        <select id="custom-sl-xvt" class="form-select"></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Department <span class="required">*</span></label>
                        <select id="custom-sl-department" class="form-select"></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Process <span class="required">*</span></label>
                        <select id="custom-sl-process" class="form-select"></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Priority <span class="required">*</span></label>
                        <select id="custom-sl-priority" class="form-select"></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">DRI <span class="required">*</span></label>
                        <select id="custom-dri" class="form-select"></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Deadline <span class="required">*</span></label>
                        <input id="custom-deadline" type="date" class="form-input" />
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1">
                        <label class="form-label">Task Description</label>
                        <textarea
                            id="custom-task-description"
                            class="form-input"
                            style="min-height: 80px; resize: vertical"
                            placeholder="Enter task description..."
                        ></textarea>
                    </div>
                </div>
            </div>
            <div class="modal-footer bottom-actions mt-0">
                <button type="button" class="secondary-btn" data-bs-dismiss="modal">
                    <span><i class="bi bi-x-lg"></i></span>
                    <span>Cancel</span>
                </button>
                <button id="add-custom" type="button" class="primary-btn">
                    <span><i class="bi bi-check-lg"></i></span>
                    <span>Add Task</span>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Copy Template Modal -->
<div
    id="copyTemplateModal"
    class="modal fade"
    tabindex="-1"
    aria-labelledby="copyTemplateModalLabel"
    aria-hidden="true"
>
    <div class="modal-dialog modal-xl">
        <div class="modal-content modal-content-wide">
            <div class="modal-header">
                <div class="modal-title">
                    <span><i class="bi bi-clipboard-check"></i></span>
                    <span>Copy project template</span>
                </div>
                <button type="button" class="btn-close close-btn" data-bs-dismiss="modal" aria-label="Close">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="modal-body">
                <p style="color: var(--text-secondary); margin-bottom: 20px">
                    Select an existing project as a template and copy its task list to the new project:
                </p>
                <div class="info-section" style="margin-bottom: 20px">
                    <div class="section-title">
                        <span><i class="bi bi-box-arrow-up"></i></span>
                        <span>Source Project</span>
                    </div>
                    <div class="project-form-grid">
                        <div class="form-group">
                            <label class="form-label"><span>Source Customer</span> <span class="required">*</span></label>
                            <select class="form-select">
                                <option value="">Please select</option>
                                <option value="Apollo">Apollo</option>
                                <option value="Rhea">Rhea</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label"><span>Source Project Number</span> <span class="required">*</span></label>
                            <select class="form-select">
                                <option value="">Please select</option>
                                <option value="FTV-001">FTV-001</option>
                                <option value="FTV-002">FTV-002</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label"><span>Source xVT Stage</span> <span class="required">*</span></label>
                            <select class="form-select">
                                <option value="">Please select</option>
                                <option value="HVT">HVT</option>
                                <option value="EVT">EVT</option>
                                <option value="DVT">DVT</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label"><span>Source Process</span> <span class="required">*</span></label>
                            <select class="form-select">
                                <option value="">Please select</option>
                                <option value="Design">Design</option>
                                <option value="Engineering">Engineering</option>
                                <option value="Verification">Verification</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="info-section">
                    <div class="section-title">
                        <span><i class="bi bi-box-arrow-in-down"></i></span>
                        <span>Target Project</span>
                    </div>
                    <div class="project-form-grid">
                        <div class="form-group">
                            <label class="form-label"><span>Target Customer</span> <span class="required">*</span></label>
                            <select class="form-select">
                                <option value="">Please select</option>
                                <option value="Apollo">Apollo</option>
                                <option value="Rhea">Rhea</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label"><span>Target Project Number</span> <span class="required">*</span></label>
                            <input type="text" class="form-input" placeholder="e.g., FTV-004" />
                        </div>
                        <div class="form-group">
                            <label class="form-label"><span>Target xVT stage</span> <span class="required">*</span></label>
                            <select class="form-select">
                                <option value="">Please select</option>
                                <option value="HVT">HVT</option>
                                <option value="EVT">EVT</option>
                                <option value="DVT">DVT</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label"><span>Target Process</span> <span class="required">*</span></label>
                            <select class="form-select">
                                <option value="">Please select</option>
                                <option value="Design">Design</option>
                                <option value="Engineering">Engineering</option>
                                <option value="Verification">Verification</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer bottom-actions mt-0">
                <button type="button" class="secondary-btn" data-bs-dismiss="modal">
                    <span><i class="bi bi-x-lg"></i></span>
                    <span>Cancel</span>
                </button>
                <button type="button" class="primary-btn">
                    <span><i class="bi bi-check-lg"></i></span>
                    <span>Confirm Copy</span>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- RACI Matrix Modal -->
<div id="raciMatrixModal" class="modal fade" tabindex="-1" aria-labelledby="raciMatrixModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl">
        <div class="modal-content modal-content-large">
            <div class="modal-header">
                <h5 class="modal-title" id="raciMatrixModalLabel">
                    <span><i class="bi bi-bar-chart-line"></i></span>
                    <span><spring:message code="raciMatrixTitle" /></span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 20px">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px">
                        <div
                            style="
                                background: rgba(76, 175, 80, 0.1);
                                padding: 15px;
                                border-radius: 8px;
                                border: 1px solid var(--accent-green);
                            "
                        >
                            <h3 style="color: var(--accent-green); margin-bottom: 8px">R - Responsible (執行者)</h3>
                            <p style="font-size: 13px; color: var(--text-secondary)">負責執行任務的人員</p>
                        </div>
                        <div
                            style="
                                background: rgba(33, 150, 243, 0.1);
                                padding: 15px;
                                border-radius: 8px;
                                border: 1px solid var(--accent-blue);
                            "
                        >
                            <h3 style="color: var(--accent-blue); margin-bottom: 8px">A - Accountable (負責者)</h3>
                            <p style="font-size: 13px; color: var(--text-secondary)">最終負責並有決策權的人</p>
                        </div>
                        <div
                            style="
                                background: rgba(255, 152, 0, 0.1);
                                padding: 15px;
                                border-radius: 8px;
                                border: 1px solid var(--accent-orange);
                            "
                        >
                            <h3 style="color: var(--accent-orange); margin-bottom: 8px">C - Consulted (諮詢者)</h3>
                            <p style="font-size: 13px; color: var(--text-secondary)">需要被諮詢意見的人</p>
                        </div>
                        <div
                            style="
                                background: rgba(33, 150, 243, 0.1);
                                padding: 15px;
                                border-radius: 8px;
                                border: 1px solid var(--accent-blue);
                            "
                        >
                            <h3 style="color: var(--accent-blue); margin-bottom: 8px">I - Informed (告知者)</h3>
                            <p style="font-size: 13px; color: var(--text-secondary)">需要被告知進度的人</p>
                        </div>
                    </div>
                </div>

                <div style="overflow-x: auto">
                    <table class="raci-matrix-table">
                        <thead>
                            <tr>
                                <th style="min-width: 150px">任務</th>
                                <th>PQE</th>
                                <th>TPM</th>
                                <th>OPM</th>
                                <th>MPM</th>
                                <th>RD</th>
                                <th>SW</th>
                                <th>PE</th>
                                <th>ME</th>
                                <th>TE</th>
                                <th>IE</th>
                                <th>IT</th>
                                <th>SMT</th>
                                <th>SI</th>
                                <th>WH</th>
                                <th>Kitting</th>
                                <th>IQC</th>
                                <th>SQE</th>
                                <th>PQA</th>
                            </tr>
                        </thead>
                        <tbody id="raciMatrixBody"></tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer bottom-actions mt-0" style="justify-content: center">
                <button type="button" class="secondary-btn" data-bs-dismiss="modal">
                    <span><i class="bi bi-x-lg"></i></span>
                    <span>Close</span>
                </button>
            </div>
        </div>
    </div>
</div>

    <div
        id="taskDetailModal"
        class="modal fade"
        tabindex="-1"
        aria-labelledby="taskDetailModalLabel"
        aria-hidden="true"
    >
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
            <div class="modal-content modal-content-large">
                <!-- Modal Header -->
                <div class="modal-header task-detail-header mb-0">
                    <div class="task-detail-title-section">
                        <div class="task-detail-id">PPAP-001</div>
                        <div class="task-detail-name">設計記錄</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px">
                        <div class="task-action-buttons">
                            <button class="task-action-btn follow-btn" onclick="toggleFollow()">
                                <span><i class="bi bi-star"></i></span>
                                <span><spring:message code="follow" /></span>
                            </button>
                            <button class="task-action-btn reminder-btn" onclick="setReminder()">
                                <span><i class="bi bi-alarm"></i></span>
                                <span><spring:message code="reminder" /></span>
                            </button>
                            <button class="task-action-btn escalation-btn" onclick="escalateTask()">
                                <span><i class="bi bi-bell-fill"></i></span>
                                <span><spring:message code="escalation" /></span>
                            </button>
                            <button class="task-action-btn reassign-btn" onclick="reassignTask()">
                                <span><i class="bi bi-person"></i></span>
                                <span><spring:message code="reassignTask" /></span>
                            </button>
                        </div>
                        <button type="button" class="btn-close close-btn" data-bs-dismiss="modal" aria-label="Close">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                <!-- Modal Body -->
                <div class="modal-body task-detail-body">
                    <div class="task-main-info">
                        <div class="info-section">
                            <div class="section-title">
                                <span><i class="bi bi-pencil-square"></i></span>
                                <span><spring:message code="taskDescriptionTitle" /></span>
                            </div>
                            <div class="section-content">此任務需要完成相關PPAP文件準備及品質標準</div>
                        </div>

                        <div class="info-section">
                            <div class="section-title">
                                <span><i class="bi bi-paperclip"></i></span>
                                <span><spring:message code="attachments" /></span>
                            </div>
                            <div id="attachments-list" class="attachments-list">
                                <div class="attachment-item">
                                    <div class="attachment-info">
                                        <span class="attachment-icon"><i class="bi bi-file-earmark"></i></span>
                                        <span class="attachment-name">設計規格書_v1.2.pdf</span>
                                    </div>
                                    <button class="download-btn">
                                        <span><i class="bi bi-download"></i> <spring:message code="download" /></span>
                                    </button>
                                </div>
                                <div class="attachment-item">
                                    <div class="attachment-info">
                                        <span class="attachment-icon"><i class="bi bi-bar-chart-line"></i></span>
                                        <span class="attachment-name">FMEA分析表.xlsx</span>
                                    </div>
                                    <button class="download-btn">
                                        <span><i class="bi bi-download"></i> <spring:message code="download" /></span>
                                    </button>
                                </div>
                            </div>
                            <div class="d-flex mt-3 justify-content-end">
                                <button id="upload" class="add-attachment-btn">
                                    <span><i class="bi bi-paperclip"></i></span>
                                    <span><spring:message code="addAttachment" /></span>
                                </button>
                            </div>
                        </div>

                        <div class="info-section">
                            <div class="section-title">
                                <span><i class="bi bi-chat"></i></span>
                                <span><spring:message code="discussion" /></span>
                            </div>
                            <div id="comment-container" class="comments-section"></div>
                            <div class="comment-input">
                                <textarea id="input-comment" class="comment-textarea" placeholder="Enter your comment..."></textarea>
                                <div class="comment-actions">
                                    <button id="comment" class="submit-comment-btn">Send comment</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="task-sidebar">
                        <div class="sidebar-section d-flex flex-column">
                            <span class="sidebar-label">Status</span>
                            <select id="sl-status" class="filter-input "></select>
                        </div>

                        <div class="sidebar-section d-flex flex-column">
                            <span class="sidebar-label">DRI</span>
                            <select id="dri" class="filter-input"></select>
                        </div>

                        <div class="sidebar-section d-flex flex-column">
                            <span class="sidebar-label">Priority</span>
                            <select id="sl-priority" class="filter-input "></select>
                        </div>

                        <div class="sidebar-section d-flex flex-column">
                            <span class="sidebar-label"><spring:message code="deadline" /></span>
                            <input id="deadLine" type="text" class="filter-input" />
                        </div>

                        <div class="sidebar-section d-flex flex-column">
                            <span class="sidebar-label"><spring:message code="xvtStage" /></span>
                            <select id="sl-xvt" class="filter-input "></select>
                        </div>

                        <div class="sidebar-section d-flex flex-column">
                            <span class="sidebar-label">Type</span>
                            <select id="sl-type" class="filter-input "></select>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="modal-footer bottom-actions mt-0">
                    <button type="button" class="secondary-btn" data-bs-dismiss="modal">
                        <span><i class="bi bi-door-open"></i></span>
                        <span><spring:message code="close" /></span>
                    </button>
                    <button type="button" class="primary-btn" onclick="saveTaskDetailChanges()">
                        <span><i class="bi bi-floppy"></i></span>
                        <span><spring:message code="saveChanges" /></span>
                    </button>
                </div>
            </div>
        </div>
    </div>

<div
    id="createProjectModal"
    class="modal fade"
    tabindex="-1"
    aria-labelledby="createProjectModalLabel"
    aria-hidden="true"
>
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content modal-content-large">
            <div class="modal-header">
                <h5 class="modal-title" id="createProjectModalLabel">
                    <span><i class="bi bi-plus-square"></i></span>
                    <span><spring:message code="createNewProject" /></span>
                    <span
                        id="createProjectModalMeta"
                        style="
                            margin-left: 12px;
                            color: inherit;
                            font-size: inherit;
                            font-weight: inherit;
                            display: none;
                        "
                    ></span>
                </h5>
                <button type="button" class="btn-close close-btn" data-bs-dismiss="modal" aria-label="Close">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="modal-body">
                <!-- Step 1: Basic Create Form -->
                <div id="createProjectStep1">
                    <div class="project-form-grid">
                        <div class="form-group">
                            <label class="form-label">
                                <spring:message code="customer" /> <span class="required">*</span>
                            </label>
                            <select class="form-select" id="newProjectCustomer">
                                <option value=""><spring:message code="pleaseSelect" /></option>
                                <option value="1">Apollo</option>
                                <option value="2">Rhea</option>
                                <option value="3">Kronos</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <spring:message code="projectName" /> <span class="required">*</span>
                            </label>
                            <input type="text" class="form-input" id="newProjectName" placeholder="例: FTV-004" />
                        </div>
                    </div>
                </div>

                <!-- Step 2: Operation Options + Selected Tasks -->
                <div id="createProjectStep2" style="display: none">
                    <div class="ppap-section" style="margin-bottom: 10px">
                        <div class="section-header">
                            <span><i class="bi bi-gear"></i></span>
                            <span><spring:message code="operationOptions" /></span>
                        </div>
                        <div class="action-buttons-row">
                            <button id="standard-ppap" class="action-btn" onclick="showStandardPPAP()">
                                <span><i class="bi bi-clipboard-check"></i></span>
                                <span><spring:message code="standard26PPAP" /></span>
                            </button>
                            <button class="action-btn" onclick="showCustomTask()">
                                <span><i class="bi bi-plus-circle"></i></span>
                                <span><spring:message code="customTask" /></span>
                            </button>
                            <button class="action-btn" onclick="showCopyTemplate()">
                                <span><i class="bi bi-clipboard-check"></i></span>
                                <span><spring:message code="copyProjectTemplate" /></span>
                            </button>
                        </div>
                    </div>

                    <div class="ppap-section">
                        <div class="section-header">
                            <span><i class="bi bi-list-ul"></i></span>
                            <span>Selected task</span>
                        </div>
                        <div
                            id="selectedTasksList"
                            class="table"
                            style="
                                width: 100%;
                                min-height: 120px;
                                border: 1px solid var(--border);
                                padding: 12px;
                                border-radius: 6px;
                            "
                        >
                            <div style="color: var(--text-secondary)">No tasks selected.</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer bottom-actions mt-0">
                <button type="button" class="secondary-btn" data-bs-dismiss="modal" onclick="closeCreateProjectModal()">
                    <span><i class="bi bi-x-lg"></i></span>
                    <span>Cancel</span>
                </button>
                <button
                    type="button"
                    class="secondary-btn"
                    id="createBackBtn"
                    style="display: none"
                    onclick="createModalBackToStep1()"
                >
                    <span><i class="bi bi-arrow-left"></i></span>
                    <span>Cancel</span>
                </button>
                <button type="button" class="primary-btn" id="createNextBtn" onclick="saveProjectBasicInfoModal()">
                    <span><i class="bi bi-floppy"></i></span>
                    <span id="save-info">Save</span>
                </button>
                <button
                    type="button"
                    class="primary-btn"
                    id="createSaveBtn"
                    style="display: none"
                    onclick="submitProjectFromModal()"
                >
                    <span><i class="bi bi-check-circle"></i></span>
                    <span>Save</span>
                </button>
            </div>
        </div>
    </div>
</div>
</div>
<script src="/sample-system/js/modules/ppap_management.js"></script>
