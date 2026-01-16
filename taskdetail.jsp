<%@ page contentType="text/html;charset=UTF-8" language="java" %> <%@ taglib uri="http://www.springframework.org/tags"
prefix="spring" %>
<div id="taskDetailModal" class="modal fade" tabindex="-1" aria-labelledby="taskDetailModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content modal-content-large">
            <!-- Modal Header -->
            <div class="modal-header task-detail-header mb-0">
                <div class="task-detail-title-section">
                    <div class="task-detail-id"></div>
                    <div class="task-detail-name"></div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px">
                    <div class="task-action-buttons">
                        <button
                            class="task-action-btn follow-btn"
                            data-action="toggleFollow"
                            data-follow-label="<spring:message code='follow' />"
                            data-unfollow-label="<spring:message code='unfollow' />">
                            <span><i class="bi bi-star"></i></span>
                            <span><spring:message code="follow" /></span>
                        </button>
                        <button class="task-action-btn reminder-btn" data-action="setReminder">
                            <span><i class="bi bi-alarm"></i></span>
                            <span><spring:message code="reminder" /></span>
                        </button>
                        <button class="task-action-btn escalation-btn" data-action="escalateTask">
                            <span><i class="bi bi-bell-fill"></i></span>
                            <span><spring:message code="escalation" /></span>
                        </button>
                        <button class="task-action-btn reassign-btn" data-action="reassignTask">
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
                        <div class="section-content"></div>
                    </div>

                    <div class="info-section">
                        <div class="section-title">
                            <span><i class="bi bi-paperclip"></i></span>
                            <span><spring:message code="attachments" /></span>
                        </div>
                        <div id="attachments-list" class="attachments-list"></div>
                        <div class="d-flex mt-3 justify-content-end">
                            <button id="upload" class="add-attachment-btn">
                                <span><i class="bi bi-paperclip"></i></span>
                                <span><spring:message code="addAttachment" /></span>
                            </button>
                        </div>
                    </div>

                    <div class="info-section">
                        <div class="section-title">
                            <span><i class="bi bi-pen"></i></span>
                            <span><spring:message code="signFlow" text="Sign Flow" /></span>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped mb-0">
                                <thead>
                                    <tr>
                                        <th style="width: 40px">#</th>
                                        <th><spring:message code="idCard" text="ID Card" /></th>
                                        <th><spring:message code="label.name" text="Name" /></th>
                                        <th><spring:message code="label.title" text="Title" /></th>
                                        <th><spring:message code="signTime" text="Sign Time" /></th>
                                        <th><spring:message code="status" /></th>
                                    </tr>
                                </thead>
                                <tbody id="sign-flow-body">
                                    <tr>
                                        <td colspan="6" class="text-muted text-center">
                                            <spring:message code="loading" text="Loading..." />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="info-section">
                        <div class="section-title">
                            <span><i class="bi bi-chat"></i></span>
                            <span><spring:message code="actions" /></span>
                        </div>
                        <div class="comment-input mb-3">
                            <textarea
                                id="input-comment"
                                class="comment-textarea"
                                placeholder="<spring:message code='placeholder.enterComment' />"></textarea>
                            <div class="comment-actions">
                                <button id="comment" class="submit-comment-btn">
                                    <spring:message code="button.sendComment" />
                                </button>
                            </div>
                        </div>
                        <div id="comment-container" class="comments-section"></div>
                    </div>
                </div>

                <div class="task-sidebar">
                    <div class="sidebar-section d-flex flex-column">
                        <span class="sidebar-label"><spring:message code="status" /></span>
                        <select id="modal-sl-status" class="filter-input"></select>
                    </div>

                    <div class="sidebar-section d-flex flex-column">
                        <span class="sidebar-label"><spring:message code="dri" /></span>
                        <select id="dri" class="filter-input"></select>
                    </div>

                    <div class="sidebar-section d-flex flex-column">
                        <span class="sidebar-label"><spring:message code="priority" /></span>
                        <select id="modal-sl-priority" class="filter-input"></select>
                    </div>

                    <div class="sidebar-section d-flex flex-column">
                        <span class="sidebar-label"><spring:message code="deadline" /></span>
                        <input id="deadLine" type="text" class="filter-input" />
                    </div>

                    <div class="sidebar-section d-flex flex-column">
                        <span class="sidebar-label"><spring:message code="xvtStage" /></span>
                        <select id="sl-xvt" class="filter-input"></select>
                    </div>

                    <div class="sidebar-section d-flex flex-column">
                        <span class="sidebar-label"><spring:message code="label.type" /></span>
                        <select id="sl-type" class="filter-input"></select>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer bottom-actions mt-0">
                <button type="button" class="secondary-btn" data-bs-dismiss="modal">
                    <span><i class="bi bi-door-open"></i></span>
                    <span><spring:message code="close" /></span>
                </button>
                <button type="button" class="secondary-btn js-task-reject d-none">
                    <span><i class="bi bi-x-circle"></i></span>
                    <span><spring:message code="reject" /></span>
                </button>
                <button type="button" class="action-btn js-task-approve d-none">
                    <span><i class="bi bi-check-circle"></i></span>
                    <span><spring:message code="approve" /></span>
                </button>
                <button type="button" class="action-btn js-task-save">
                    <span><i class="bi bi-floppy"></i></span>
                    <span><spring:message code="saveChanges" /></span>
                </button>
                <button type="button" class="action-btn js-task-submit d-none">
                    <span><i class="bi bi-send"></i></span>
                    <span><spring:message code="submit" /></span>
                </button>
            </div>
        </div>
    </div>
</div>
