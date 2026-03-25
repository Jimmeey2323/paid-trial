(function initializeTrialForm() {
    const content = window.APP_CONTENT;
    const tracking = window.trialTracking;

    if (!content || !tracking) {
        return;
    }

    const form = document.getElementById('lead-form');
    const heroCopy = document.querySelector('.hero-copy');
    const heroTitle = document.getElementById('hero-title');
    const heroDescription = document.getElementById('hero-description');
    const heroSignals = document.getElementById('hero-signals');
    const centerSelect = document.getElementById('center');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const phoneCountryInput = document.getElementById('phoneCountry');
    const classOptionsSection = document.getElementById('class-options');
    const classOptionGrid = document.getElementById('class-option-grid');
    const paymentStageFieldset = document.getElementById('payment-stage-fieldset');
    const paymentStageNote = document.getElementById('payment-stage-note');
    const submitButton = document.getElementById('submit-button');
    const payButton = document.getElementById('pay-button');
    const formStatus = document.getElementById('form-status');
    const proofGrid = document.getElementById('proof-grid');
    const journeySteps = document.getElementById('journey-steps');
    const studioGrid = document.getElementById('studio-grid');
    const faqList = document.getElementById('faq-list');
    const faqModalList = document.getElementById('faq-modal-list');
    const policyList = document.getElementById('policy-list');
    const formatModalBody = document.getElementById('format-modal-body');
    const formatModalTitle = document.getElementById('format-modal-title');
    const formatModalCopy = document.getElementById('format-modal-copy');
    const scheduleMount = document.getElementById('ribbon-schedule');
    const scheduleNote = document.getElementById('schedule-note');
    const scheduleExternalLink = document.getElementById('schedule-open-external');
    const themeToggle = document.getElementById('theme-toggle');
    const waiverModal = document.getElementById('waiver-modal');
    const formatModal = document.getElementById('format-modal');
    const faqModal = document.getElementById('faq-modal');
    const scheduleModal = document.getElementById('schedule-modal');
    const signalModal = document.getElementById('signal-modal');
    const signalModalTitle = document.getElementById('signal-modal-title');
    const signalModalImage = document.getElementById('signal-modal-image');
    const signalModalDescription = document.getElementById('signal-modal-description');
    const signalModalHighlights = document.getElementById('signal-modal-highlights');
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const heroHeadlineStorageKey = 'trial_form_last_headline_index';
    const themeStorageKey = 'trial_form_theme_preference';
    const checkoutStateStorageKey = 'trial_form_checkout_state_v1';
    const paymentSessionStorageKey = 'trial_form_payment_session_id';

    const modalOpeners = [
        { button: document.getElementById('waiver-link'), modal: waiverModal },
        { button: document.getElementById('waiver-link-footer'), modal: waiverModal },
        { button: document.getElementById('format-modal-open'), modal: formatModal },
        { button: document.getElementById('faq-modal-open'), modal: faqModal },
        { button: document.getElementById('schedule-modal-open'), modal: scheduleModal }
    ].filter((entry) => entry.button && entry.modal);

    const modalCloseButtons = [
        { button: document.getElementById('waiver-modal-close'), modal: waiverModal },
        { button: document.getElementById('format-modal-close'), modal: formatModal },
        { button: document.getElementById('faq-modal-close'), modal: faqModal },
        { button: document.getElementById('schedule-modal-close'), modal: scheduleModal },
        { button: document.getElementById('signal-modal-close'), modal: signalModal }
    ].filter((entry) => entry.button && entry.modal);

    let activeModal = null;
    let lastFocusedElement = null;
    let phoneInputController = null;
    let scheduleEmbedLoaded = false;
    let scheduleObserver = null;
    let paymentConfirmed = false;
    let paymentSessionId = '';
    let currentEventId = '';

    const scheduleActionButtons = Array.from(document.querySelectorAll('[data-schedule-action]'));
    const scheduleStudioButtons = Array.from(document.querySelectorAll('[data-center-target]'));
    const paymentStageInputs = Array.from(form.querySelectorAll('input[name="stage"]'));
    const paymentStageLabelTargets = Array.from(document.querySelectorAll('[data-stage-label]'));
    const paymentStageAmountTargets = Array.from(document.querySelectorAll('[data-stage-amount]'));

    function getPaymentStageConfigs() {
        return tracking.appConfig?.paymentStages || {};
    }

    function getDefaultPaymentStage() {
        const configuredDefault = String(tracking.appConfig?.defaultPaymentStage || 'production').trim().toLowerCase();
        return configuredDefault === 'testing' ? 'testing' : 'production';
    }

    function getSelectedPaymentStage() {
        const selectedInput = paymentStageInputs.find((input) => input.checked);
        return selectedInput?.value === 'testing' ? 'testing' : getDefaultPaymentStage();
    }

    function getPaymentStageConfig(stage = getSelectedPaymentStage()) {
        const normalizedStage = stage === 'testing' ? 'testing' : 'production';
        const configuredStages = getPaymentStageConfigs();
        return configuredStages[normalizedStage] || configuredStages[getDefaultPaymentStage()] || {
            label: normalizedStage === 'testing' ? 'Testing' : 'Production',
            amountDisplay: normalizedStage === 'testing' ? '₹1' : '₹1,838',
            buttonLabel: normalizedStage === 'testing' ? 'Pay ₹1' : 'Pay ₹1,838',
            description: normalizedStage === 'testing'
                ? 'Testing mode charges ₹1 and uses the Momence test membership purchase.'
                : 'Production mode charges ₹1,838 and uses the live Momence membership purchase.'
        };
    }

    function clearStoredPaymentSession() {
        try {
            window.sessionStorage.removeItem(paymentSessionStorageKey);
        } catch (error) {
            // Storage can be unavailable.
        }
    }

    function updatePaymentStageUi(stage = getSelectedPaymentStage()) {
        const activeStage = stage === 'testing' ? 'testing' : 'production';

        paymentStageLabelTargets.forEach((element) => {
            const targetStage = element.getAttribute('data-stage-label');
            const stageConfig = getPaymentStageConfig(targetStage);
            element.textContent = stageConfig.label || (targetStage === 'testing' ? 'Testing' : 'Production');
        });

        paymentStageAmountTargets.forEach((element) => {
            const targetStage = element.getAttribute('data-stage-amount');
            const stageConfig = getPaymentStageConfig(targetStage);
            element.textContent = stageConfig.amountDisplay || (targetStage === 'testing' ? '₹1' : '₹1,838');
        });

        paymentStageInputs.forEach((input) => {
            input.closest('.payment-stage-chip')?.classList.toggle('is-selected', input.value === activeStage);
        });

        if (paymentStageFieldset) {
            paymentStageFieldset.setAttribute('data-selected-stage', activeStage);
        }

        if (paymentStageNote) {
            paymentStageNote.textContent = getPaymentStageConfig(activeStage).description || '';
        }

        if (payButton && !paymentConfirmed) {
            payButton.textContent = getPaymentStageConfig(activeStage).buttonLabel || 'Pay now';
        }
    }

    function applyPaymentStage(stage, { resetPayment = false, persist = true } = {}) {
        const normalizedStage = stage === 'testing' ? 'testing' : 'production';
        const targetInput = paymentStageInputs.find((input) => input.value === normalizedStage);

        if (targetInput) {
            targetInput.checked = true;
        }

        if (resetPayment && paymentConfirmed) {
            setPaymentState(false);
            showStatus(`Checkout stage switched to ${getPaymentStageConfig(normalizedStage).label}. Please complete the matching ${getPaymentStageConfig(normalizedStage).amountDisplay} payment before submitting.`, 'success');
        }

        updatePaymentStageUi(normalizedStage);

        if (persist) {
            persistCheckoutState({
                ...getSerializableFormState(),
                eventId: currentEventId || tracking.createEventId()
            });
        }
    }

    function getPreferredTheme() {
        try {
            const storedTheme = window.localStorage.getItem(themeStorageKey);
            if (storedTheme === 'light' || storedTheme === 'dark') {
                return storedTheme;
            }
        } catch (error) {
            // Storage can be unavailable.
        }

        return 'dark';
    }

    function getStoredCheckoutState() {
        try {
            return JSON.parse(window.sessionStorage.getItem(checkoutStateStorageKey) || '{}');
        } catch (error) {
            return {};
        }
    }

    function persistCheckoutState(state) {
        try {
            window.sessionStorage.setItem(checkoutStateStorageKey, JSON.stringify(state));
        } catch (error) {
            // Session storage can be unavailable.
        }
    }

    function clearCheckoutState() {
        try {
            window.sessionStorage.removeItem(checkoutStateStorageKey);
            clearStoredPaymentSession();
        } catch (error) {
            // Storage can be unavailable.
        }
    }

    function setPaymentState(isConfirmed, sessionId = '') {
        paymentConfirmed = Boolean(isConfirmed);
        paymentSessionId = isConfirmed ? String(sessionId || paymentSessionId || '') : '';

        if (submitButton) {
            submitButton.disabled = !paymentConfirmed;
        }

        if (payButton) {
            payButton.disabled = paymentConfirmed;
            payButton.textContent = paymentConfirmed
                ? 'Payment confirmed'
                : (getPaymentStageConfig().buttonLabel || tracking.appConfig?.paymentButtonLabel || 'Pay ₹1,838');
        }

        if (paymentConfirmed && paymentSessionId) {
            try {
                window.sessionStorage.setItem(paymentSessionStorageKey, paymentSessionId);
            } catch (error) {
                // Storage can be unavailable.
            }
        } else {
            clearStoredPaymentSession();
        }
    }

    function getSerializableFormState() {
        const selectedType = form.querySelector('input[name="type"]:checked');
        return {
            firstName: document.getElementById('firstName')?.value || '',
            lastName: document.getElementById('lastName')?.value || '',
            email: document.getElementById('email')?.value || '',
            phoneNumber: phoneNumberInput?.value || '',
            phoneCountry: phoneCountryInput?.value || 'IN',
            time: document.getElementById('time')?.value || '',
            center: centerSelect?.value || '',
            type: selectedType?.value || '',
            stage: getSelectedPaymentStage(),
            waiverAccepted: Boolean(document.getElementById('waiverAccepted')?.checked),
            eventId: currentEventId || tracking.createEventId()
        };
    }

    function restoreCheckoutState() {
        const state = getStoredCheckoutState();
        if (!state || !Object.keys(state).length) {
            return;
        }

        const firstNameField = document.getElementById('firstName');
        const lastNameField = document.getElementById('lastName');
        const emailField = document.getElementById('email');
        const timeField = document.getElementById('time');
        const waiverField = document.getElementById('waiverAccepted');

        if (firstNameField) {
            firstNameField.value = state.firstName || '';
        }
        if (lastNameField) {
            lastNameField.value = state.lastName || '';
        }
        if (emailField) {
            emailField.value = state.email || '';
        }
        if (phoneNumberInput) {
            phoneNumberInput.value = state.phoneNumber || '';
        }
        if (phoneCountryInput) {
            phoneCountryInput.value = state.phoneCountry || 'IN';
        }
        if (phoneInputController && state.phoneCountry) {
            phoneInputController.setCountry(String(state.phoneCountry).toLowerCase());
        }
        if (timeField) {
            timeField.value = state.time || '';
        }
        if (centerSelect && state.center) {
            centerSelect.value = state.center;
            renderClassOptions(state.center);
        }
        if (state.type) {
            const optionInput = form.querySelector(`input[name="type"][value="${CSS.escape(state.type)}"]`);
            if (optionInput) {
                optionInput.checked = true;
                updateSelectedClassState();
            }
        }
        applyPaymentStage(state.stage || getDefaultPaymentStage(), { resetPayment: false, persist: false });
        if (waiverField) {
            waiverField.checked = Boolean(state.waiverAccepted);
        }

        currentEventId = state.eventId || currentEventId;
    }

    function buildLeadPayloadFromForm() {
        if (!form.reportValidity()) {
            return null;
        }

        if (!validatePhoneField({ showMessage: true })) {
            phoneNumberInput?.reportValidity();
            phoneNumberInput?.focus();
            return null;
        }

        const selectedType = form.querySelector('input[name="type"]:checked');
        if (!selectedType) {
            showStatus('Choose a class format before continuing.', 'error');
            classOptionGrid.querySelector('input[name="type"]')?.focus();
            return null;
        }

        const formData = new FormData(form);
        formData.set('phoneNumber', getNormalizedPhoneNumber());
        if (phoneCountryInput?.value) {
            formData.set('phoneCountry', phoneCountryInput.value);
        }

        currentEventId = currentEventId || getStoredCheckoutState().eventId || tracking.createEventId();

        const payload = {
            ...Object.fromEntries(formData.entries()),
            event_id: currentEventId,
            ...tracking.getSubmissionTrackingPayload()
        };

        persistCheckoutState({
            ...getSerializableFormState(),
            eventId: currentEventId
        });

        return payload;
    }

    function updateThemeToggle(theme) {
        if (!themeToggle) {
            return;
        }

        const isLight = theme === 'light';
        themeToggle.setAttribute('aria-pressed', String(isLight));
        themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
        themeToggle.querySelector('.theme-toggle-label').textContent = isLight ? 'Dark mode' : 'Light mode';
        themeToggle.querySelector('.theme-toggle-icon').textContent = isLight ? '☾' : '☀︎';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeToggle(theme);

        try {
            window.localStorage.setItem(themeStorageKey, theme);
        } catch (error) {
            // Storage can be unavailable.
        }
    }

    function getRandomHeadlineIndex(headlines) {
        if (!headlines.length) {
            return 0;
        }

        if (headlines.length === 1) {
            return 0;
        }

        let previousIndex = -1;

        try {
            previousIndex = Number(window.sessionStorage.getItem(heroHeadlineStorageKey));
        } catch (error) {
            previousIndex = -1;
        }

        const eligibleIndexes = headlines.map((_, index) => index).filter((index) => index !== previousIndex);
        const nextIndex = eligibleIndexes[Math.floor(Math.random() * eligibleIndexes.length)] ?? 0;

        try {
            window.sessionStorage.setItem(heroHeadlineStorageKey, String(nextIndex));
        } catch (error) {
            // Session storage may be unavailable in privacy-restricted contexts.
        }

        return nextIndex;
    }

    function renderHeroHeadline() {
        const headlines = Array.isArray(content.heroHeadlines)
            ? content.heroHeadlines.filter((headline) => typeof headline === 'string' && headline.trim())
            : [];

        if (!heroTitle || !headlines.length) {
            return;
        }

        const selectedHeadline = headlines[getRandomHeadlineIndex(headlines)];
        heroTitle.textContent = selectedHeadline;

        if (heroDescription && content.heroHeadlineDescriptions && content.heroHeadlineDescriptions[selectedHeadline]) {
            heroDescription.textContent = content.heroHeadlineDescriptions[selectedHeadline];
        }
    }

    function renderFormatIcon(option) {
        if (!option?.icon) {
            return '';
        }

        return `<span class="choice-card-icon" aria-hidden="true">${option.icon}</span>`;
    }

    function getHeroSignalWidthClasses(total) {
        const classes = [];
        let index = 0;
        let useWideRow = total > 4;

        while (index < total) {
            const remaining = total - index;

            if (remaining === 1) {
                classes.push('signal-chip--wide');
                index += 1;
                continue;
            }

            if (remaining === 2) {
                classes.push('signal-chip--half', 'signal-chip--half');
                break;
            }

            if (useWideRow) {
                classes.push('signal-chip--wide');
                index += 1;
                useWideRow = false;
                continue;
            }

            classes.push('signal-chip--half', 'signal-chip--half');
            index += 2;
            useWideRow = true;
        }

        return classes;
    }

    function renderHeroSignals(isExpanded = false) {
        const MAX_DEFAULT_VISIBLE = 4;
        const MAX_EXPANDED_VISIBLE = 6;
        const visibleCount = isExpanded ? MAX_EXPANDED_VISIBLE : MAX_DEFAULT_VISIBLE;
        const signalsToShow = content.heroSignals.slice(0, Math.min(visibleCount, content.heroSignals.length));

        const widthClasses = getHeroSignalWidthClasses(signalsToShow.length);

        heroSignals.innerHTML = signalsToShow.map((item, index) => {
            const signalIndex = content.heroSignals.indexOf(item);
            const widthClass = widthClasses[index] || 'signal-chip--half';
            const isWide = widthClass === 'signal-chip--wide';
            const detailMarkup = isWide && item.detail
                ? `<span class="signal-chip-detail">${item.detail}</span>`
                : '';
            const highlightsMarkup = isWide && Array.isArray(item.highlights) && item.highlights.length
                ? `
                    <span class="signal-chip-points" aria-hidden="true">
                        ${item.highlights.slice(0, 2).map((highlight) => `<span>${highlight}</span>`).join('')}
                    </span>
                `
                : '';

            return `
            <button type="button" class="signal-chip ${widthClass}" data-signal-index="${signalIndex}">
                <span class="signal-chip-icon" aria-hidden="true">${item.icon || '✦'}</span>
                <strong>${item.title}</strong>
                <span>${item.copy}</span>
                ${detailMarkup}
                ${highlightsMarkup}
                <span class="signal-chip-footer">Tap for more</span>
            </button>
        `;
        }).join('');

        heroSignals.querySelectorAll('[data-signal-index]').forEach((card) => {
            card.addEventListener('click', () => {
                const index = Number(card.getAttribute('data-signal-index'));
                openSignalModal(index);
            });
        });

        heroCopy.classList.toggle('is-expanded', isExpanded);
    }

    function openSignalModal(signalIndex) {
        const signal = content.heroSignals[signalIndex];

        if (!signal || !signalModalTitle || !signalModalImage || !signalModalDescription || !signalModalHighlights || !signalModal) {
            return;
        }

        signalModalTitle.textContent = signal.title;
        signalModalImage.src = signal.image;
        signalModalImage.alt = signal.imageAlt || signal.title;
        signalModalDescription.textContent = signal.description;
        signalModalHighlights.innerHTML = (signal.highlights || []).map((highlight) => `<li>${highlight}</li>`).join('');

        openModal(signalModal);
    }

    function renderProofCards() {
        proofGrid.innerHTML = content.proofCards.map((item) => `
            <article class="proof-card">
                <strong>${item.title}</strong>
                <p>${item.copy}</p>
            </article>
        `).join('');
    }

    function renderJourneySteps() {
        journeySteps.innerHTML = content.journeySteps.map((item) => `
            <li class="journey-step">
                <strong>${item.title}</strong>
                <span>${item.copy}</span>
            </li>
        `).join('');
    }

    function renderFaqCollection(items, defaultOpenIndex = -1) {
        return items.map((item, index) => `
            <details class="faq-item"${index === defaultOpenIndex ? ' open' : ''}>
                <summary>${item.question}</summary>
                <div class="faq-answer">${item.answer}</div>
            </details>
        `).join('');
    }

    function setupFaqAccordion(container) {
        if (!container) {
            return;
        }

        container.querySelectorAll('.faq-item').forEach((toggledItem) => {
            toggledItem.addEventListener('toggle', () => {
                if (!toggledItem.open) {
                    return;
                }

                container.querySelectorAll('.faq-item[open]').forEach((item) => {
                    if (item !== toggledItem) {
                        item.open = false;
                    }
                });
            });
        });
    }

    function renderStudios() {
        studioGrid.innerHTML = content.studios.map((studio) => `
            <article class="studio-card">
                <div class="studio-map-shell">
                    <iframe
                        class="studio-map-frame"
                        src="${studio.mapEmbedUrl || ''}"
                        title="Map preview for ${studio.name}"
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade"
                        allowfullscreen
                    ></iframe>
                    <div class="studio-map-overlay">
                        <span class="studio-map-badge">Live map preview</span>
                        <a class="studio-link studio-link-map studio-link-card" href="${studio.mapUrl}" target="_blank" rel="noopener noreferrer">
                            <span class="studio-link-icon" aria-hidden="true">📍</span>
                            <span>Open in Maps</span>
                        </a>
                    </div>
                </div>
                <div class="studio-copy">
                    <h3>${studio.name}</h3>
                    <p>${studio.bestFor}</p>
                    <div class="studio-meta">
                        <div>
                            <strong>Neighborhood</strong>
                            <span>${studio.neighborhood}</span>
                        </div>
                        <div>
                            <strong>Address</strong>
                            <span>${studio.address}</span>
                        </div>
                        <div>
                            <strong>Phone</strong>
                            <span>${studio.phone}</span>
                        </div>
                    </div>
                    <div class="studio-actions">
                        <a class="studio-link studio-link-card" href="${studio.mapUrl}" target="_blank" rel="noopener noreferrer">
                            <span class="studio-link-icon" aria-hidden="true">↗</span>
                            <span>Open in Maps</span>
                        </a>
                    </div>
                </div>
            </article>
        `).join('');
    }

    function renderFaqs() {
        const inlineFaqs = content.faqs.slice(0, 6);

        faqList.innerHTML = renderFaqCollection(inlineFaqs, 0);
        faqModalList.innerHTML = renderFaqCollection(content.faqs, 0);
    }

    function renderPolicyHighlights() {
        policyList.innerHTML = content.policyHighlights.map((item) => `<li>${item}</li>`).join('');
    }

    function getFormatGroups(center) {
        if (center && content.classOptionsByStudio[center]) {
            return [[center, content.classOptionsByStudio[center]]];
        }

        return Object.entries(content.classOptionsByStudio);
    }

    function renderFormatModal(center, optionValue = null) {
        const filteredGroups = getFormatGroups(center).map(([studioName, options]) => {
            const scopedOptions = optionValue
                ? options.filter((option) => option.value === optionValue)
                : options;

            return [studioName, scopedOptions];
        }).filter(([, options]) => options.length > 0);

        if (formatModalTitle && formatModalCopy) {
            if (optionValue && filteredGroups.length === 1 && filteredGroups[0][1].length === 1) {
                const [studioName, [option]] = filteredGroups;
                formatModalTitle.textContent = `${option.title} at ${studioName}`;
                formatModalCopy.textContent = 'A closer look at the format, intensity, training style, and what makes it a strong first-class choice.';
            } else {
                formatModalTitle.textContent = 'Find the format that fits your first visit.';
                formatModalCopy.textContent = 'Explore the signature experiences available at each studio before making your selection.';
            }
        }

        formatModalBody.innerHTML = filteredGroups.map(([studioName, options]) => `
            <section class="modal-format-group">
                <h3>${studioName}</h3>
                <div class="modal-format-grid">
                    ${options.map((option) => `
                        <article class="modal-format-card">
                            <div class="choice-card-topline choice-card-topline-modal">
                                ${renderFormatIcon(option)}
                                <span class="choice-card-badge">${option.badge}</span>
                            </div>
                            <div class="choice-card-header">
                                <div class="choice-card-heading-stack">
                                    <h4 class="choice-card-title">${option.title}</h4>
                                    <p class="choice-card-subtitle">${option.tagline || ''}</p>
                                </div>
                            </div>
                            <p class="choice-card-summary">${option.description}</p>
                            <dl class="choice-card-meta">
                                <div>
                                    <dt>Intensity</dt>
                                    <dd>${option.intensity}</dd>
                                </div>
                                <div>
                                    <dt>Best for</dt>
                                    <dd>${option.bestFor}</dd>
                                </div>
                                <div>
                                    <dt>Length</dt>
                                    <dd>${option.duration || 'Varies'}</dd>
                                </div>
                                <div>
                                    <dt>Style</dt>
                                    <dd>${option.trainingStyle || 'Studio format'}</dd>
                                </div>
                            </dl>
                            <ul class="modal-format-points">
                                ${option.highlights.map((highlight) => `<li>${highlight}</li>`).join('')}
                            </ul>
                        </article>
                    `).join('')}
                </div>
            </section>
        `).join('');
    }

    function openFormatDetails(center, optionValue) {
        renderFormatModal(center, optionValue);
        openModal(formatModal);
    }

    function showStatus(message, kind) {
        formStatus.hidden = false;
        formStatus.textContent = message;
        formStatus.className = `form-status is-${kind}`;
    }

    function clearStatus() {
        formStatus.hidden = true;
        formStatus.textContent = '';
        formStatus.className = 'form-status';
    }

    function setSubmitting(isSubmitting) {
        submitButton.disabled = isSubmitting || !paymentConfirmed;
        submitButton.textContent = isSubmitting ? 'Submitting your request...' : 'Reserve my trial';
    }

    function setPaymentProcessing(isProcessing) {
        if (!payButton) {
            return;
        }

        payButton.disabled = isProcessing || paymentConfirmed;
        payButton.textContent = isProcessing
            ? 'Starting secure checkout...'
            : (paymentConfirmed ? 'Payment confirmed' : (getPaymentStageConfig().buttonLabel || tracking.appConfig?.paymentButtonLabel || 'Pay ₹1,838'));
    }

    function updateSelectedClassState() {
        const cards = Array.from(classOptionGrid.querySelectorAll('.choice-card'));
        const selectedIndex = cards.findIndex((card) => Boolean(card.querySelector('input[type="radio"]')?.checked));

        cards.forEach((card, index) => {
            const input = card.querySelector('input[type="radio"]');
            const isSelected = Boolean(input?.checked);
            card.classList.toggle('is-selected', isSelected);
            card.classList.toggle('is-muted', selectedIndex !== -1 && !isSelected);
            card.setAttribute('aria-checked', String(isSelected));
            card.tabIndex = isSelected || (selectedIndex === -1 && index === 0) ? 0 : -1;
        });
    }

    function renderClassOptions(center) {
        const options = content.classOptionsByStudio[center] || [];
        const hasOptions = options.length > 0;

        if (!hasOptions) {
            classOptionsSection.hidden = true;
            classOptionGrid.innerHTML = '';
            renderHeroSignals(false);
            renderFormatModal();
            return;
        }

        classOptionsSection.hidden = false;
        renderHeroSignals(true);
        renderFormatModal(center);
        classOptionGrid.innerHTML = options.map((option) => `
            <article class="choice-card" data-option-value="${option.value}" role="radio" aria-checked="false">
                <input type="radio" name="type" value="${option.value}" required>
                <div class="choice-card-topline">
                    ${renderFormatIcon(option)}
                    <span class="choice-card-badge">${option.badge}</span>
                    <span class="choice-card-selected-pill">Selected</span>
                </div>
                <div class="choice-card-header">
                    <div class="choice-card-heading-stack">
                        <h3 class="choice-card-title">${option.title}</h3>
                        <p class="choice-card-subtitle">${option.tagline || ''}</p>
                    </div>
                </div>
                <div class="choice-card-actions">
                    <button type="button" class="secondary-button secondary-button-small choice-card-more" data-option-value="${option.value}">Know more</button>
                </div>
            </article>
        `).join('');

        classOptionGrid.setAttribute('role', 'radiogroup');

        classOptionGrid.querySelectorAll('.choice-card').forEach((card) => {
            const input = card.querySelector('input[name="type"]');

            const selectCard = () => {
                if (!input) {
                    return;
                }

                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            };

            card.addEventListener('click', (event) => {
                if (event.target instanceof HTMLElement && event.target.closest('.choice-card-more')) {
                    return;
                }

                selectCard();
            });

            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectCard();
                }
            });
        });

        classOptionGrid.querySelectorAll('input[name="type"]').forEach((input) => {
            input.addEventListener('change', updateSelectedClassState);
        });

        classOptionGrid.querySelectorAll('.choice-card-more').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                openFormatDetails(center, button.getAttribute('data-option-value'));
            });
        });

        updateSelectedClassState();
    }

    function clearFieldErrors() {
        form.querySelectorAll('[aria-invalid="true"]').forEach((element) => {
            element.removeAttribute('aria-invalid');
        });

        if (phoneNumberInput) {
            phoneNumberInput.setCustomValidity('');
        }
    }

    function applyFieldErrors(fieldErrors = {}) {
        const entries = Object.entries(fieldErrors);

        if (!entries.length) {
            return;
        }

        const [firstFieldName, firstMessage] = entries[0];
        const firstField = form.querySelector(`[name="${firstFieldName}"]`);

        entries.forEach(([fieldName]) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.setAttribute('aria-invalid', 'true');
            }
        });

        showStatus(firstMessage, 'error');
        firstField?.focus();
    }

    function getFocusableElements(container) {
        return Array.from(container.querySelectorAll(focusableSelector)).filter((element) => !element.hasAttribute('disabled'));
    }

    function updateScheduleExternalLink() {
        if (scheduleExternalLink) {
            scheduleExternalLink.href = tracking.getScheduleUrl();
        }
    }

    function setScheduleLoadedState(isLoaded) {
        if (!scheduleMount) {
            return;
        }

        scheduleMount.classList.toggle('is-loading', !isLoaded);
        scheduleMount.classList.toggle('is-loaded', isLoaded);
    }

    function hasRenderedScheduleContent() {
        if (!scheduleMount) {
            return false;
        }

        return Array.from(scheduleMount.children).some((element) => element.tagName !== 'SCRIPT' && !element.classList.contains('schedule-loading-state'));
    }

    function bindScheduleObserver() {
        if (!scheduleMount || scheduleObserver) {
            return;
        }

        scheduleObserver = new MutationObserver(() => {
            if (!hasRenderedScheduleContent()) {
                return;
            }

            const loadingState = scheduleMount.querySelector('.schedule-loading-state');
            loadingState?.remove();
            setScheduleLoadedState(true);

            if (scheduleNote) {
                scheduleNote.textContent = 'Use the quick controls above or the widget filters below to compare live classes.';
            }
        });

        scheduleObserver.observe(scheduleMount, {
            childList: true,
            subtree: true
        });
    }

    function findScheduleControl(matcher) {
        if (!scheduleMount) {
            return null;
        }

        const candidates = scheduleMount.querySelectorAll('button, [role="button"], a, summary, label');

        return Array.from(candidates).find((element) => {
            const label = (element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            return label && matcher(label, element);
        }) || null;
    }

    function triggerScheduleAction(action) {
        const normalizedAction = String(action || '').toLowerCase();
        const actionMatcherMap = {
            today: (label) => label === 'today',
            week: (label) => label.includes('week'),
            month: (label) => label.includes('month')
        };

        const matcher = actionMatcherMap[normalizedAction];
        if (!matcher) {
            return;
        }

        const control = findScheduleControl(matcher);

        if (control instanceof HTMLElement) {
            control.click();
            scheduleActionButtons.forEach((button) => {
                button.classList.toggle('is-active', button.getAttribute('data-schedule-action') === normalizedAction);
            });
            if (scheduleNote) {
                scheduleNote.textContent = `Showing the ${normalizedAction} view.`;
            }
            return;
        }

        if (scheduleNote) {
            scheduleNote.textContent = `The ${normalizedAction} control will become available as soon as the schedule finishes loading.`;
        }
    }

    function applyStudioShortcut(centerName) {
        if (!centerSelect || !centerName) {
            return;
        }

        centerSelect.value = centerName;
        centerSelect.dispatchEvent(new Event('change', { bubbles: true }));
        closeModal(scheduleModal);
        centerSelect.focus();
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (scheduleNote) {
            scheduleNote.textContent = `Studio preference updated to ${centerName}.`;
        }
    }

    function ensureScheduleEmbed() {
        if (scheduleEmbedLoaded || !scheduleMount) {
            return;
        }

        scheduleEmbedLoaded = true;
        bindScheduleObserver();
        setScheduleLoadedState(false);

        if (scheduleNote) {
            scheduleNote.textContent = 'Loading the live schedule…';
        }

        const script = document.createElement('script');
        script.async = true;
        script.type = 'module';
        script.src = 'https://momence.com/plugin/host-schedule/host-schedule.js';
        script.setAttribute('host_id', '13752');
        script.setAttribute('teacher_ids', '[]');
        script.setAttribute('location_ids', '[]');
        script.setAttribute('tag_ids', '[]');
        script.setAttribute('session_type', 'class');
        script.setAttribute('hide_tags', 'true');
        script.setAttribute('default_filter', 'show-all');
        script.setAttribute('locale', 'en');
        script.addEventListener('load', () => {
            if (scheduleNote) {
                scheduleNote.textContent = 'Live availability is powered directly by Momence.';
            }
        });
        script.addEventListener('error', () => {
            if (scheduleNote) {
                scheduleNote.textContent = 'The live schedule could not be loaded right now. Please try again in a moment.';
            }
            scheduleEmbedLoaded = false;
            setScheduleLoadedState(false);
        });

        scheduleMount.innerHTML = '<div class="schedule-loading-state" aria-hidden="true"><div class="schedule-loading-glow"></div><div class="schedule-loading-lines"><span></span><span></span><span></span></div></div>';
        scheduleMount.appendChild(script);
    }

    function openModal(modal) {
        if (modal === scheduleModal) {
            ensureScheduleEmbed();
        }

        lastFocusedElement = document.activeElement;
        activeModal = modal;
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        const focusableElements = getFocusableElements(modal);
        focusableElements[0]?.focus();
    }

    function closeModal(modal) {
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        if (activeModal === modal) {
            activeModal = null;
        }
        document.body.classList.remove('modal-open');
        if (lastFocusedElement instanceof HTMLElement) {
            lastFocusedElement.focus();
        }
    }

    function handleModalKeyboard(event) {
        if (!activeModal) {
            return;
        }

        if (event.key === 'Escape') {
            closeModal(activeModal);
            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const focusableElements = getFocusableElements(activeModal);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) {
            return;
        }

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }

    function syncPhoneCountry() {
        if (!phoneInputController || !phoneCountryInput) {
            return;
        }

        const countryCode = phoneInputController.getSelectedCountryData()?.iso2 || 'in';
        phoneCountryInput.value = countryCode.toUpperCase();
    }

    function initializePhoneInput() {
        if (!phoneNumberInput || typeof window.intlTelInput !== 'function') {
            return;
        }

        phoneInputController = window.intlTelInput(phoneNumberInput, {
            initialCountry: 'in',
            preferredCountries: ['in', 'ae', 'gb', 'us', 'sg'],
            separateDialCode: true,
            nationalMode: true,
            autoPlaceholder: 'aggressive',
            formatOnDisplay: true,
            utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@25.12.1/build/js/utils.js'
        });

        syncPhoneCountry();

        phoneNumberInput.addEventListener('countrychange', () => {
            syncPhoneCountry();
            validatePhoneField();
        });

        phoneNumberInput.addEventListener('input', () => {
            validatePhoneField();
        });

        phoneNumberInput.addEventListener('blur', () => {
            validatePhoneField({ showMessage: true });
        });
    }

    function validatePhoneField({ showMessage = false } = {}) {
        if (!phoneNumberInput) {
            return true;
        }

        const rawValue = phoneNumberInput.value.trim();
        phoneNumberInput.setCustomValidity('');

        if (!rawValue) {
            return false;
        }

        syncPhoneCountry();

        let isValid = false;

        try {
            if (phoneInputController && window.intlTelInputUtils) {
                isValid = phoneInputController.isValidNumber();
            }
        } catch (error) {
            isValid = false;
        }

        if (!isValid) {
            const digitsOnly = rawValue.replace(/\D/g, '');
            isValid = digitsOnly.length >= 6 && digitsOnly.length <= 15;
        }

        if (!isValid) {
            const message = 'Enter a valid phone number for the selected country.';
            phoneNumberInput.setCustomValidity(message);

            if (showMessage) {
                showStatus(message, 'error');
            }

            return false;
        }

        return true;
    }

    function getNormalizedPhoneNumber() {
        if (!phoneNumberInput) {
            return '';
        }

        if (phoneInputController) {
            try {
                const formattedNumber = phoneInputController.getNumber();
                if (formattedNumber) {
                    return formattedNumber;
                }
            } catch (error) {
                // Fall back to a simple normalization below.
            }
        }

        return phoneNumberInput.value.trim();
    }

    function launchSuccessConfetti() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        if (typeof window.confetti === 'function') {
            const colors = ['#7c5cff', '#2dd4bf', '#f472b6', '#facc15', '#f8fafc'];
            const fireBurst = (originX, angle, spread, startVelocity, particleCount, delay = 0, drift = 0) => {
                window.setTimeout(() => {
                    window.confetti({
                        particleCount,
                        angle,
                        spread,
                        startVelocity,
                        gravity: 0.88,
                        ticks: 280,
                        scalar: 1.05,
                        drift,
                        colors,
                        origin: { x: originX, y: 0.72 },
                        zIndex: 1500,
                        disableForReducedMotion: true
                    });
                }, delay);
            };

            fireBurst(0, 42, 58, 52, 72, 0, 0.2);
            fireBurst(1, 138, 58, 52, 72, 0, -0.2);
            fireBurst(0, 28, 78, 42, 54, 140, 0.35);
            fireBurst(1, 152, 78, 42, 54, 140, -0.35);
            fireBurst(0.02, 18, 92, 34, 38, 300, 0.45);
            fireBurst(0.98, 162, 92, 34, 38, 300, -0.45);
            return;
        }

        const colors = ['#7c5cff', '#2dd4bf', '#f472b6', '#facc15', '#f8fafc'];
        const confettiLayer = document.createElement('div');
        confettiLayer.className = 'confetti-layer';

        Array.from({ length: 48 }).forEach((_, index) => {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            const isLeft = index % 2 === 0;
            piece.style.setProperty('--confetti-origin-x', isLeft ? '-4vw' : '104vw');
            piece.style.setProperty('--confetti-origin-y', `${52 + Math.random() * 28}vh`);
            piece.style.setProperty('--confetti-travel-x', `${isLeft ? 34 + Math.random() * 26 : -(34 + Math.random() * 26)}vw`);
            piece.style.setProperty('--confetti-travel-y', `${-(16 + Math.random() * 44)}vh`);
            piece.style.setProperty('--confetti-delay', `${Math.random() * 0.45}s`);
            piece.style.setProperty('--confetti-duration', `${2.6 + Math.random() * 1.6}s`);
            piece.style.setProperty('--confetti-rotate', `${-180 + Math.random() * 360}deg`);
            piece.style.setProperty('--confetti-color', colors[index % colors.length]);
            piece.style.setProperty('--confetti-size', `${8 + Math.random() * 10}px`);
            confettiLayer.appendChild(piece);
        });

        document.body.appendChild(confettiLayer);
        window.setTimeout(() => confettiLayer.remove(), 4200);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        clearStatus();
        clearFieldErrors();

        if (!paymentConfirmed || !paymentSessionId) {
            showStatus(`Please complete the payment of ${getPaymentStageConfig().amountDisplay || tracking.appConfig?.paymentAmountDisplay || '₹1,838'} before submitting your request.`, 'error');
            return;
        }

        const payload = buildLeadPayloadFromForm();
        if (!payload) {
            return;
        }

        payload.payment_session_id = paymentSessionId;

        setSubmitting(true);
        showStatus('Submitting your request and securing the next step.', 'success');

        try {
            const response = await fetch(tracking.buildApiUrl('/api/submit-lead'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok || !result.success) {
                if (response.status === 400 && result.fieldErrors) {
                    applyFieldErrors(result.fieldErrors);
                } else {
                    showStatus(result.error || 'The request could not be submitted. Please try again.', 'error');
                }
                setSubmitting(false);
                return;
            }

            tracking.trackLeadSubmission(payload);
            launchSuccessConfetti();
            showStatus('Request received. Redirecting you to the next step now.', 'success');
            clearCheckoutState();
            Array.from(form.elements).forEach((element) => {
                if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLButtonElement) {
                    element.disabled = true;
                }
            });

            window.setTimeout(() => {
                window.location.assign(result.redirectUrl || tracking.getRedirectUrl());
            }, 1800);
        } catch (error) {
            console.error('Lead submission failed.', error);
            showStatus('We could not complete the request right now. Please try again in a moment.', 'error');
            setSubmitting(false);
        }
    }

    renderHeroHeadline();
    applyTheme(getPreferredTheme());
    renderHeroSignals(false);
    renderProofCards();
    renderJourneySteps();
    renderStudios();
    renderFaqs();
    renderPolicyHighlights();
    renderFormatModal();
    initializePhoneInput();
    updateScheduleExternalLink();
    setupFaqAccordion(faqList);
    setupFaqAccordion(faqModalList);
    applyPaymentStage(getDefaultPaymentStage(), { resetPayment: false, persist: false });
    restoreCheckoutState();
    setPaymentState(false);

    centerSelect.addEventListener('change', () => {
        renderClassOptions(centerSelect.value);
        clearStatus();
    });

    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    });

    scheduleActionButtons.forEach((button) => {
        button.addEventListener('click', () => {
            ensureScheduleEmbed();
            triggerScheduleAction(button.getAttribute('data-schedule-action'));
        });
    });

    scheduleStudioButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const centerName = button.getAttribute('data-center-target');
            applyStudioShortcut(centerName);
        });
    });

    paymentStageInputs.forEach((input) => {
        input.addEventListener('change', () => {
            if (input.checked) {
                applyPaymentStage(input.value, { resetPayment: true, persist: true });
            }
        });
    });

    form.addEventListener('submit', handleSubmit);

    // Payment flow: create a Checkout session and verify on return
    async function createCheckoutSession() {
        clearStatus();
        clearFieldErrors();

        const payload = buildLeadPayloadFromForm();
        if (!payload) {
            return;
        }

        try {
            setPaymentProcessing(true);
            const resp = await fetch(tracking.buildApiUrl('/api/create-checkout-session'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await resp.json().catch(() => ({}));
            setPaymentProcessing(false);

            if (!resp.ok || !data.url) {
                if (resp.status === 400 && data.fieldErrors) {
                    applyFieldErrors(data.fieldErrors);
                }
                showStatus(data.error || 'Unable to start payment. Please try again later.', 'error');
                return;
            }

            // Redirect user to Stripe Checkout
            window.location.assign(data.url);
        } catch (err) {
            console.error('createCheckoutSession error', err);
            setPaymentProcessing(false);
            showStatus('Unable to start payment. Please try again in a moment.', 'error');
        }
    }

    async function verifyPaymentSession(sessionId) {
        try {
            const resp = await fetch(tracking.buildApiUrl(`/api/verify-payment?session_id=${encodeURIComponent(sessionId)}`));
            const data = await resp.json().catch(() => ({}));

            if (resp.ok && data.paid && data.fulfilled) {
                applyPaymentStage(data.stage || getSelectedPaymentStage(), { resetPayment: false, persist: true });
                setPaymentState(true, data.paymentSessionId || sessionId);
                showStatus('Payment confirmed and your Momence package has been prepared — you can now submit your request.', 'success');
                return true;
            }

            setPaymentState(false);
            showStatus(data.error || 'Payment not confirmed yet. If you completed payment, please wait a moment and try again.', 'error');
            return false;
        } catch (err) {
            console.error('verifyPaymentSession error', err);
            setPaymentState(false);
            showStatus('Unable to verify payment at the moment.', 'error');
            return false;
        }
    }

    if (payButton) {
        payButton.addEventListener('click', (e) => {
            e.preventDefault();
            createCheckoutSession();
        });
    }

    // If the page was loaded after a Checkout success, verify the session
    (function checkForCheckoutReturn() {
        try {
            const params = new URLSearchParams(window.location.search);
            const sessionId = params.get('session_id') || window.sessionStorage.getItem(paymentSessionStorageKey);
            if (sessionId) {
                // verify and then remove query params from URL
                verifyPaymentSession(sessionId).finally(() => {
                    try {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } catch (e) {
                        // ignore
                    }
                });
            }
        } catch (error) {
            // ignore
        }
    })();

    modalOpeners.forEach(({ button, modal }) => {
        button.addEventListener('click', () => openModal(modal));
    });

    modalCloseButtons.forEach(({ button, modal }) => {
        button.addEventListener('click', () => closeModal(modal));
    });

    [waiverModal, formatModal, faqModal, scheduleModal, signalModal].filter(Boolean).forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target instanceof HTMLElement && event.target.hasAttribute('data-modal-close')) {
                closeModal(modal);
            }
        });
    });

    document.addEventListener('keydown', handleModalKeyboard);
})();
