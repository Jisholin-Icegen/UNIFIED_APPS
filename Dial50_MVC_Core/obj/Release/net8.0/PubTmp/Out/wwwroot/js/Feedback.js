let answers = {};
let remarks = {};
let departmentRatings = {};
let feedbackId = 0;
let _bedInfoEncrypt = '';
let _patientName = '';
let _roomBed = '';
let departments = [];
let totalQuestions = 0;
let questionMapping = {};

const staticQuestions = [
    { id: 1, text: 'Overall hospital experience', type: 'rating', required: true },
    { id: 2, text: 'Doctor communication — condition & treatment clearly explained', type: 'rating', required: true },
    { id: 3, text: 'Nursing care & responsiveness', type: 'rating', required: true },
    { id: 6, text: 'Would you recommend us to family or friends?', type: 'yesno', required: true },
    { id: 7, text: 'What did we do well? (Optional)', type: 'text', required: false },
    { id: 8, text: 'What could we improve? (Optional)', type: 'text', required: false }
];

const ratingOptions = ['Satisfied', 'Neutral', 'Unsatisfied'];

function getLiveBedInfo() {
    return BedContext.get().bedInfo || '';
}

function getLiveRoomBed() {
    return BedContext.get().roomBed
        || BedContext.get().roomNumber
        || BedContext.get().bedInfo
        || '';
}

function getLivePatientName() {
    return BedContext.get().patientName || '';
}

function initFeedback() {
    _bedInfoEncrypt = getLiveBedInfo();
    _patientName = getLivePatientName();
    _roomBed = getLiveRoomBed();
    return loadDepartments();
}

function loadDepartments() {
    var requestData = {};
    var roomBed = getLiveRoomBed();

    if (roomBed) {
        requestData.roomNo = roomBed;
        requestData.bedNo = roomBed;
    }

    return $.ajax({
        url: '/api/Feedback/GetActiveDepartments',
        type: 'GET',
        data: requestData,
        contentType: 'application/json',
        success: function (response) {
            var departmentsData = [];
            if (response && typeof response === 'object') {
                if (response.status && response.data) {
                    departmentsData = response.data;
                } else if (Array.isArray(response)) {
                    departmentsData = response;
                } else if (response.data) {
                    departmentsData = response.data;
                }
            }
            if (departmentsData && departmentsData.length > 0) {
                departments = departmentsData;
                departments = departments.filter(d => d.isActive !== false);
                departments.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                buildQuestions();
            } else {
                departments = [];
                buildQuestions();
            }
        },
        error: function () {
            departments = [];
            buildQuestions();
            showToast('Could not load departments. Please try again.', 'warning');
        }
    });
}

function buildQuestions() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    container.innerHTML = '';

    let questionCounter = 0;
    let requiredCount = 0;
    questionMapping = {};

    const firstThree = staticQuestions.slice(0, 3);
    firstThree.forEach(function (q) {
        questionCounter++;
        var div = createQuestionElement(questionCounter, q.id, q.text, q.type, q.required);
        container.appendChild(div);
        if (q.required) requiredCount++;
        questionMapping[questionCounter] = { type: 'static', id: q.id };
    });

    departments.forEach(function (dept) {
        questionCounter++;
        var deptName = dept.departmentName || dept.DepartmentName || 'Unknown';
        var deptKey = dept.description || dept.Description || dept.departmentKey || dept.DepartmentKey || '';
        var deptId = dept.departmentId || dept.DepartmentId;
        var questionText = deptName + ' — ' + deptKey;
        var div = createDepartmentQuestionElement(questionCounter, deptId, questionText, deptName, deptKey);
        container.appendChild(div);
        requiredCount++;
        questionMapping[questionCounter] = { type: 'department', id: deptId };
    });

    const remainingStatic = staticQuestions.slice(3);
    remainingStatic.forEach(function (q) {
        questionCounter++;
        var div = createQuestionElementWithoutNumber(questionCounter, q.id, q.text, q.type, q.required);
        container.appendChild(div);
        if (q.required) requiredCount++;
        questionMapping[questionCounter] = { type: 'static', id: q.id };
    });

    questionCounter++;
    var div = createAdditionalCommentsElement(questionCounter);
    container.appendChild(div);
    questionMapping[questionCounter] = { type: 'comments', id: 0 };

    totalQuestions = questionCounter;
    document.getElementById('totalQuestions').textContent = totalQuestions;
    updateProgress();
}

function createQuestionElement(qNum, questionId, questionText, type, required) {
    var div = document.createElement('div');
    div.className = 'feedback-question';
    div.dataset.question = qNum;
    div.dataset.questionId = questionId;
    div.dataset.type = type;

    var html = '<div class="question-text"><span class="question-number">' + qNum + '.</span> <span>' + questionText + '</span></div>';

    if (type === 'rating') {
        html += buildRatingOptions(qNum);
        html += buildRemarksContainer(qNum);
    } else if (type === 'yesno') {
        html += buildYesNoOptions(qNum);
    } else if (type === 'text') {
        html += buildTextArea(qNum);
    }

    div.innerHTML = html;
    return div;
}

function createQuestionElementWithoutNumber(qNum, questionId, questionText, type, required) {
    var div = document.createElement('div');
    div.className = 'feedback-question';
    div.dataset.question = qNum;
    div.dataset.questionId = questionId;
    div.dataset.type = type;

    var html = '<div class="question-text"><span>' + questionText + '</span></div>';

    if (type === 'yesno') {
        html += buildYesNoOptions(qNum);
    } else if (type === 'text') {
        html += buildTextArea(qNum);
    }

    div.innerHTML = html;
    return div;
}

function createDepartmentQuestionElement(qNum, departmentId, questionText, deptName, deptKey) {
    var div = document.createElement('div');
    div.className = 'feedback-question department-question';
    div.dataset.question = qNum;
    div.dataset.departmentId = departmentId;
    div.dataset.departmentName = deptName;
    div.dataset.departmentKey = deptKey;
    div.dataset.type = 'department';

    var html = '<div class="question-text"><span class="question-number">' + qNum + '.</span> <span>' + questionText + '</span></div>';
    html += buildRatingOptions(qNum);
    html += buildRemarksContainer(qNum);

    div.innerHTML = html;
    return div;
}

function createAdditionalCommentsElement(qNum) {
    var div = document.createElement('div');
    div.className = 'feedback-question';
    div.dataset.question = qNum;
    div.dataset.type = 'comments';

    var html = '<div class="question-text"><span>Any additional comments? (Optional)</span></div>';
    html += '<div style="margin-top:8px;">';
    html += '<textarea class="comments-textarea" id="additionalComments" placeholder="Share any additional thoughts..." style="width:100%;min-height:50px;padding:8px 10px;border-radius:6px;border:1px solid #e2e8f0;resize:none;font-family:inherit;font-size:13px;background:#f8fafc;box-sizing:border-box;"></textarea>';
    html += '</div>';

    div.innerHTML = html;
    return div;
}

function buildRatingOptions(qNum) {
    var html = '<div class="rating-options" style="display:flex;gap:8px;width:100%;flex-wrap:wrap;">';
    ratingOptions.forEach(function (val) {
        var valLower = val.toLowerCase();
        var imgName = '';
        if (valLower === 'satisfied') imgName = 'happy-face';
        else if (valLower === 'neutral') imgName = 'neutral-face';
        else if (valLower === 'unsatisfied') imgName = 'sad-face';

        html += '<div class="rating-option" data-value="' + valLower + '" onclick="selectRating(this, ' + qNum + ', \'' + valLower + '\')" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;padding:6px 8px;border-radius:8px;border:2px solid #e2e8f0;transition:all 0.2s;background:white;min-height:44px;box-sizing:border-box;flex:1;max-width:33.33%;">';
        html += '<img src="/images/Feedback/' + imgName + '.png" alt="' + val + '" class="emoji-icon" style="width:24px;height:24px;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';" />';
        html += '<span class="emoji-fallback" style="display:none;font-size:20px;">' + (valLower === 'satisfied' ? '😊' : valLower === 'neutral' ? '😐' : '😞') + '</span>';
        html += '<span style="font-size:11px;font-weight:600;color:#475569;">' + val + '</span>';
        html += '</div>';
    });
    html += '</div>';
    return html;
}

function buildYesNoOptions(qNum) {
    var html = '<div class="rating-options" style="display:flex;gap:8px;width:100%;flex-wrap:wrap;">';
    html += '<div class="rating-option" data-value="yes" onclick="selectRating(this, ' + qNum + ', \'yes\')" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;padding:6px 8px;border-radius:8px;border:2px solid #e2e8f0;transition:all 0.2s;background:white;min-height:44px;box-sizing:border-box;flex:1;max-width:50%;">';
    html += '<img src="/images/Feedback/thumbs-up.png" alt="Yes" class="emoji-icon" style="width:24px;height:24px;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';" />';
    html += '<span class="emoji-fallback" style="display:none;font-size:20px;">👍</span>';
    html += '<span style="font-size:11px;font-weight:600;color:#475569;">Yes</span>';
    html += '</div>';
    html += '<div class="rating-option" data-value="no" onclick="selectRating(this, ' + qNum + ', \'no\')" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;padding:6px 8px;border-radius:8px;border:2px solid #e2e8f0;transition:all 0.2s;background:white;min-height:44px;box-sizing:border-box;flex:1;max-width:50%;">';
    html += '<img src="/images/Feedback/thumbs-down.png" alt="No" class="emoji-icon" style="width:24px;height:24px;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';" />';
    html += '<span class="emoji-fallback" style="display:none;font-size:20px;">👎</span>';
    html += '<span style="font-size:11px;font-weight:600;color:#475569;">No</span>';
    html += '</div>';
    html += '</div>';
    return html;
}

function buildRemarksContainer(qNum) {
    var html = '<div class="remarks-container" id="remarks' + qNum + '">';
    html += '<span class="remarks-label">Could you tell us what went wrong?</span>';
    html += '<textarea class="remarks-textarea remarks-unsatisfied" id="remarksText' + qNum + '" placeholder="Share the specifics so we can fix this for the next patient."></textarea>';
    html += '</div>';
    return html;
}

function buildTextArea(qNum) {
    var html = '<div style="margin-top:6px;">';
    html += '<textarea class="feedback-textarea" id="remarksText' + qNum + '" placeholder="Share your thoughts..."></textarea>';
    html += '</div>';
    return html;
}

function selectRating(element, questionId, value) {
    var parent = element.closest('.rating-options');
    parent.querySelectorAll('.rating-option').forEach(function (opt) {
        opt.classList.remove('active', 'active-neutral', 'active-unsatisfied', 'active-yes', 'active-no');
        opt.style.borderColor = '#e2e8f0';
        opt.style.backgroundColor = 'transparent';

        var icon = opt.querySelector('.emoji-icon');
        var fallback = opt.querySelector('.emoji-fallback');
        var label = opt.querySelector('span:last-child');
        if (icon) icon.style.filter = 'none';
        if (fallback) fallback.style.filter = 'none';
        if (label) label.style.color = '#475569';
    });

    element.classList.add('active');
    element.style.borderColor = '#10b981';
    element.style.backgroundColor = '#10b981';

    if (value === 'neutral') {
        element.classList.add('active-neutral');
        element.style.borderColor = '#64748b';
        element.style.backgroundColor = '#64748b';
    } else if (value === 'unsatisfied') {
        element.classList.add('active-unsatisfied');
        element.style.borderColor = '#ef4444';
        element.style.backgroundColor = '#ef4444';
    } else if (value === 'yes') {
        element.classList.add('active-yes');
        element.style.borderColor = '#10b981';
        element.style.backgroundColor = '#10b981';
    } else if (value === 'no') {
        element.classList.add('active-no');
        element.style.borderColor = '#ef4444';
        element.style.backgroundColor = '#ef4444';
    }

    var icon = element.querySelector('.emoji-icon');
    var fallback = element.querySelector('.emoji-fallback');
    var label = element.querySelector('span:last-child');
    if (icon) icon.style.filter = 'brightness(0) invert(1)';
    if (fallback) fallback.style.filter = 'brightness(0) invert(1)';
    if (label) label.style.color = 'white';

    var questionElement = element.closest('.feedback-question');
    var departmentId = questionElement.dataset.departmentId;
    var questionIdFromData = questionElement.dataset.questionId;

    if (departmentId) {
        if (!departmentRatings[departmentId]) {
            departmentRatings[departmentId] = {};
        }
        departmentRatings[departmentId].rating = value;
        if (value !== 'unsatisfied') {
            departmentRatings[departmentId].remarks = '';
        }
    } else {
        answers[questionIdFromData] = value;
    }

    var qNum = questionElement.dataset.question;
    var remarksContainer = document.getElementById('remarks' + qNum);

    if (remarksContainer) {
        if (value === 'unsatisfied') {
            remarksContainer.classList.add('open');
            setTimeout(function () {
                var textarea = document.getElementById('remarksText' + qNum);
                if (textarea) textarea.focus();
            }, 350);
        } else {
            remarksContainer.classList.remove('open');
            var textarea = document.getElementById('remarksText' + qNum);
            if (textarea && departmentId) {
                textarea.value = '';
            }
            if (departmentId) {
                departmentRatings[departmentId].remarks = '';
            }
        }
    }

    updateProgress();
}

function updateProgress() {
    var answered = 0;
    var requiredCount = 0;

    staticQuestions.forEach(function (q) {
        if (q.required) {
            requiredCount++;
            if (answers[q.id]) {
                answered++;
            }
        } else if (q.type === 'text') {
            var textarea = document.getElementById('remarksText' + q.id);
            if (textarea && textarea.value.trim() !== '') {
                answered++;
                requiredCount++;
            }
        }
    });

    departments.forEach(function (dept) {
        var deptId = dept.departmentId || dept.DepartmentId;
        requiredCount++;
        if (departmentRatings[deptId] && departmentRatings[deptId].rating) {
            answered++;
        }
    });

    var percentage = requiredCount > 0 ? Math.round((answered / requiredCount) * 100) : 0;

    document.getElementById('answeredCount').textContent = answered;
    document.getElementById('totalQuestions').textContent = requiredCount;
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressPercent').textContent = percentage + '% complete';
    document.getElementById('submitFeedback').disabled = (answered < requiredCount);
}

function showToast(message) {
    var toast = document.getElementById('toastMessage');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function () {
        toast.classList.remove('show');
    }, 3000);
}

function submitFeedback() {
    var requiredIds = [1, 2, 3, 6];

    for (var i = 0; i < requiredIds.length; i++) {
        var id = requiredIds[i];
        if (!answers[id]) {
            showToast('Please answer all questions before submitting.');
            return false;
        }
    }

    for (var deptId in departmentRatings) {
        if (!departmentRatings[deptId].rating) {
            showToast('Please rate all departments before submitting.');
            return false;
        }
    }

    for (var i = 0; i < requiredIds.length; i++) {
        var id = requiredIds[i];
        if (answers[id] === 'unsatisfied') {
            var questionEl = document.querySelector('.feedback-question[data-question-id="' + id + '"]');
            if (questionEl) {
                var qNum = questionEl.dataset.question;
                var textarea = document.getElementById('remarksText' + qNum);
                if (!textarea || textarea.value.trim() === '') {
                    showToast('Please provide remarks for unsatisfied answers.');
                    return false;
                }
            }
        }
    }

    for (var deptId in departmentRatings) {
        if (departmentRatings[deptId].rating === 'unsatisfied') {
            var questionEl = document.querySelector('.feedback-question.department-question[data-department-id="' + deptId + '"]');
            if (questionEl) {
                var qNum = questionEl.dataset.question;
                var textarea = document.getElementById('remarksText' + qNum);
                if (!textarea || textarea.value.trim() === '') {
                    showToast('Please provide remarks for unsatisfied departments.');
                    return false;
                }
            }
        }
    }

    for (var i = 1; i <= 50; i++) {
        var textarea = document.getElementById('remarksText' + i);
        if (textarea) {
            var questionEl = document.querySelector('.feedback-question[data-question="' + i + '"]');
            if (questionEl && questionEl.dataset.questionId) {
                var staticId = parseInt(questionEl.dataset.questionId);
                remarks[staticId] = textarea.value;
            }
        }
    }

    for (var deptId in departmentRatings) {
        var questionEl = document.querySelector('.feedback-question.department-question[data-department-id="' + deptId + '"]');
        if (questionEl) {
            var qNum = questionEl.dataset.question;
            var textarea = document.getElementById('remarksText' + qNum);
            if (textarea) {
                departmentRatings[deptId].remarks = textarea.value;
            }
        }
    }

    var additionalComments = document.getElementById('additionalComments') ? document.getElementById('additionalComments').value : '';

    feedbackId = Math.floor(100 + Math.random() * 900);
    var referenceNo = 'FB-' + feedbackId;
    document.getElementById('referenceNumber').textContent = 'Reference: ' + referenceNo;

    var feedbackQuestions = [];
    var displayNumber = 1;

    staticQuestions.forEach(function (q) {
        if (q.id <= 3) {
            var questionObj = {
                questionNo: displayNumber,
                type: 'static',
                question: q.text,
                answer: answers[q.id] || '',
                remarks: remarks[q.id] || ''
            };
            questionObj.DepartmentId = null;
            questionObj.DepartmentName = null;
            questionObj.DepartmentKey = null;
            feedbackQuestions.push(questionObj);
            displayNumber++;
        }
    });

    departments.forEach(function (dept) {
        var deptId = dept.departmentId || dept.DepartmentId;
        var deptName = dept.departmentName || dept.DepartmentName || 'Unknown';
        var deptKey = dept.description || dept.Description || dept.departmentKey || dept.DepartmentKey || '';
        var deptRating = departmentRatings[deptId] || {};
        var questionObj = {
            questionNo: displayNumber,
            type: 'department',
            question: deptName,
            answer: deptRating.rating || '',
            remarks: deptRating.remarks || '',
            DepartmentId: deptId,
            DepartmentName: deptName,
            DepartmentKey: deptKey
        };
        feedbackQuestions.push(questionObj);
        displayNumber++;
    });

    var remainingStatic = staticQuestions.filter(function (q) { return q.id >= 6; });
    remainingStatic.forEach(function (q) {
        var questionObj = {
            questionNo: displayNumber,
            type: 'static',
            question: q.text,
            answer: answers[q.id] || '',
            remarks: remarks[q.id] || ''
        };
        questionObj.DepartmentId = null;
        questionObj.DepartmentName = null;
        questionObj.DepartmentKey = null;
        feedbackQuestions.push(questionObj);
        displayNumber++;
    });

    var commentsObj = {
        questionNo: displayNumber,
        type: 'comments',
        question: 'Any additional comments? (Optional)',
        answer: '',
        remarks: additionalComments,
        DepartmentId: null,
        DepartmentName: null,
        DepartmentKey: null
    };
    feedbackQuestions.push(commentsObj);

    var liveBedInfo = getLiveBedInfo();
    var liveRoomBed = getLiveRoomBed();
    var livePatientName = getLivePatientName();

    if (!liveBedInfo || !liveRoomBed) {
        showToast('Session data missing. Please rescan your QR code.');
        return false;
    }

    var feedbackData = {
        BedInfo: liveBedInfo,
        PatientName: livePatientName || _patientName,
        RoomNo: liveRoomBed,
        ReferenceNo: referenceNo,
        FeedbackData: {
            questions: feedbackQuestions,
            additionalComments: additionalComments,
            submittedAt: new Date().toISOString()
        }
    };

    $.ajax({
        url: '/api/Feedback/SubmitDischargeFeedback',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(feedbackData),
        success: function (response) {
            if (response.success) {
                document.getElementById('thankyouModal').classList.add('show');
                document.body.style.overflow = 'hidden';
                finishUnifiedFeedback(true, { referenceNo: referenceNo });
            } else {
                showToast('Error submitting feedback. Please try again.');
                finishUnifiedFeedback(false, null, 'Feedback submission failed.');
            }
        },
        error: function () {
            showToast('Error submitting feedback. Please try again.');
            finishUnifiedFeedback(false, null, 'Feedback submission failed.');
        }
    });
    return true;
}

function getQuestionNumberByDepartment(departmentId) {
    var questionEl = document.querySelector('.feedback-question.department-question[data-department-id="' + departmentId + '"]');
    if (questionEl) {
        return parseInt(questionEl.dataset.question);
    }
    return null;
}

function closeThankYou() {
    document.getElementById('thankyouModal').classList.remove('show');
    document.body.style.overflow = '';
    BedContext.go('Home');
}

function goBack() {
    BedContext.go('Home');
}

function finishUnifiedFeedback(success, result, error) {
    var action = window.__unifiedAIFeedbackSubmitAction;
    if (!action || !window.UnifiedAIChild) return;
    window.__unifiedAIFeedbackSubmitAction = null;
    window.UnifiedAIChild.respond(action, success, result, error);
}

window.addEventListener('unified-ai:action', function (event) {
    var action = event.detail;
    if (!action || typeof action.action !== 'string' || action.action.indexOf('feedback.') !== 0) return;

    function respond(success, result, error) {
        if (window.UnifiedAIChild) window.UnifiedAIChild.respond(action, success, result, error);
    }

    function getQuestions() {
        return Array.from(document.querySelectorAll('.feedback-question')).map(function (element) {
            var questionId = element.dataset.questionId || null;
            var departmentId = element.dataset.departmentId || null;
            return {
                questionId: questionId,
                departmentId: departmentId,
                question: element.querySelector('.question-text')?.textContent.trim() || '',
                type: element.dataset.type || '',
                required: departmentId !== null || ['1', '2', '3', '6'].includes(String(questionId)),
                choices: Array.from(element.querySelectorAll('.rating-option')).map(function (option) {
                    return option.dataset.value;
                })
            };
        });
    }

    if (action.action === 'feedback.start') {
        Promise.resolve(window.__feedbackInitPromise).then(function () {
            respond(true, { questions: getQuestions() });
        }).catch(function () {
            respond(false, null, 'Could not load feedback questions.');
        });
        return;
    }

    if (action.action === 'feedback.answer') {
        var questionId = action.questionId == null ? '' : String(action.questionId);
        var departmentId = action.departmentId == null ? '' : String(action.departmentId);
        var questionText = String(action.question || '').trim().toLowerCase();
        var questionElement = Array.from(document.querySelectorAll('.feedback-question')).find(function (element) {
            if (departmentId && element.dataset.departmentId === departmentId) return true;
            if (questionId && element.dataset.questionId === questionId) return true;
            return !departmentId && !questionId
                && questionText
                && element.querySelector('.question-text')?.textContent.trim().toLowerCase() === questionText;
        });

        if (!questionElement) {
            respond(false, null, 'Feedback question was not found.');
            return;
        }

        questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var value = String(action.value == null ? '' : action.value).trim().toLowerCase();
        var answerOption = Array.from(questionElement.querySelectorAll('.rating-option')).find(function (option) {
            return option.dataset.value === value;
        });
        if (answerOption) {
            answerOption.click();
        } else if (questionElement.dataset.type === 'text' || questionElement.dataset.type === 'comments') {
            var textArea = questionElement.querySelector('textarea');
            if (!textArea) {
                respond(false, null, 'Feedback text field was not found.');
                return;
            }
            textArea.value = String(action.value || '').slice(0, 2000);
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
            textArea.focus({ preventScroll: true });
        } else {
            respond(false, null, 'Unsupported feedback answer.');
            return;
        }

        var remarksInput = questionElement.querySelector('.remarks-textarea');
        if (remarksInput && action.remarks != null) {
            remarksInput.value = String(action.remarks).slice(0, 2000);
            remarksInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        respond(true, { questionId: questionId || null, departmentId: departmentId || null });
        return;
    }

    if (action.action === 'feedback.submit') {
        window.__unifiedAIFeedbackSubmitAction = action;
        if (!submitFeedback()) {
            finishUnifiedFeedback(false, null, 'Feedback form is incomplete or invalid.');
        }
    }
});


$(document).ready(function () {
    $(document).on('input', '.remarks-textarea, .feedback-textarea, .comments-textarea', function () {
        var questionId = this.id.replace('remarksText', '');
        var questionElement = this.closest('.feedback-question');
        var departmentId = questionElement ? questionElement.dataset.departmentId : null;

        if (departmentId) {
            if (!departmentRatings[departmentId]) {
                departmentRatings[departmentId] = {};
            }
            departmentRatings[departmentId].remarks = this.value;
        } else if (questionId && !isNaN(questionId)) {
            var questionEl = document.querySelector('.feedback-question[data-question="' + questionId + '"]');
            if (questionEl && questionEl.dataset.questionId) {
                var staticId = parseInt(questionEl.dataset.questionId);
                remarks[staticId] = this.value;
            }
        }
        updateProgress();
    });
});

window.initFeedback = initFeedback;
window.submitFeedback = submitFeedback;
window.closeThankYou = closeThankYou;
window.goBack = goBack;
window.selectRating = selectRating;