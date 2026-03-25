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
    const membershipSummary = document.getElementById('membership-summary');
    const membershipName = document.getElementById('membership-name');
    const membershipPrice = document.getElementById('membership-price');
    const membershipSessions = document.getElementById('membership-sessions');
    const membershipDetailsButton = document.getElementById('membership-details-button');
    const membershipDetailsModal = document.getElementById('membership-details-modal');
    const checkoutMembershipSummary = document.getElementById('checkout-membership-summary');
    const checkoutMembershipName = document.getElementById('checkout-membership-name');
    const checkoutMembershipPrice = document.getElementById('checkout-membership-price');
    const checkoutMembershipSessions = document.getElementById('checkout-membership-sessions');
    const checkoutMembershipDetailsButton = document.getElementById('checkout-membership-details-button');
    const proofGrid = document.getElementById('proof-grid');
    const journeySteps = document.getElementById('journey-steps');
    const studioGrid = document.getElementById('studio-grid');
    const faqList = document.getElementById('faq-list');
    const policyList = document.getElementById('policy-list');
    const formatModalBody = document.getElementById('format-modal-body');
    const formatModalTitle = document.getElementById('format-modal-title');
    const formatModalCopy = document.getElementById('format-modal-copy');
    const scheduleMount = document.getElementById('ribbon-schedule');
    const scheduleNote = document.getElementById('schedule-note');
    const scheduleExternalLink = document.getElementById('schedule-open-external');
    const whatsappButton = document.getElementById('whatsapp-button');
    const waiverModal = document.getElementById('waiver-modal');
    const formatModal = document.getElementById('format-modal');
    const faqModal = document.getElementById('faq-modal');
    const detailedFaqModal = document.getElementById('detailed-faq-modal');
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
        { button: document.getElementById('detailed-faq-modal-open'), modal: detailedFaqModal },
        { button: document.getElementById('open-detailed-faq-from-modal'), modal: detailedFaqModal },
        { button: document.getElementById('schedule-modal-open'), modal: scheduleModal },
        { button: membershipDetailsButton, modal: membershipDetailsModal }
    ].filter((entry) => entry.button && entry.modal);

    const modalCloseButtons = [
        { button: document.getElementById('waiver-modal-close'), modal: waiverModal },
        { button: document.getElementById('format-modal-close'), modal: formatModal },
        { button: document.getElementById('faq-modal-close'), modal: faqModal },
        { button: document.getElementById('detailed-faq-modal-close'), modal: detailedFaqModal },
        { button: document.getElementById('schedule-modal-close'), modal: scheduleModal },
        { button: document.getElementById('signal-modal-close'), modal: signalModal },
        { button: document.getElementById('membership-details-modal-close'), modal: membershipDetailsModal }
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
        return configuredStages[normalizedStage] || {
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

        // Update membership price display when payment stage changes
        updateSelectedClassState();

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

        return 'light';
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
        // Theme toggle removed - function kept for compatibility
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
        const usps = [
            {
                title: "Proven, Visible Results in Weeks",
                copy: "Physique 57 is known for delivering fast, visible transformation—leaner arms, lifted glutes, stronger core, and improved posture—within just a few weeks. Members don't just feel stronger, they see real changes, which drives consistency and long-term commitment."
            },
            {
                title: "Proprietary, Globally Proven Method (NY-Origin)",
                copy: "This is a signature, proprietary workout method developed in New York and refined over years—not a generic class format. With a global presence and consistent standards, members trust they're following a system that's been perfected and proven internationally."
            },
            {
                title: "High-Intensity Yet Low-Impact (Safe & Sustainable)",
                copy: "The workout deeply fatigues muscles without putting stress on joints, making it ideal for long-term consistency. It's intense enough to deliver results, yet safe enough to practise regularly without burnout or injury—perfect for sustainable fitness."
            },
            {
                title: "Celebrity-Endorsed & Globally Loved",
                copy: "Physique 57 has been associated with Hollywood celebrities like Kelly Ripa, Sarah Jessica Parker, and Chrissy Teigen, adding strong aspirational value. It's positioned as a premium, results-driven workout trusted by those who prioritise both fitness and physique."
            },
            {
                title: "Award-Winning Fitness Method",
                copy: "The brand has received multiple global recognitions, including Best Overall Barre Workout – Good Housekeeping, 5-Star Studio Rating – The Fit Guide (global recognition), and Best Fitness Studio – Vogue Beauty Awards (India). These reinforce credibility, quality, and premium positioning."
            },
            {
                title: "Expert-Led, Hands-On Coaching",
                copy: "Highly trained instructors actively correct form, guide alignment, and ensure every movement is effective. This level of personal attention significantly improves results while reducing the risk of injury."
            },
            {
                title: "Structured, Progressive Programming (Not Random Workouts)",
                copy: "Each class follows a carefully designed structure that builds strength, endurance, and control over time. Members are part of a system—not just attending isolated sessions—leading to consistent progress."
            },
            {
                title: "Strong Community & Accountability Culture",
                copy: "Physique 57 fosters a loyal, supportive community that keeps members motivated and consistent. This emotional connection is a key driver of long-term retention and results."
            },
            {
                title: "Efficient 57-Minute Format (High ROI on Time)",
                copy: "Every class is designed to deliver maximum effectiveness within 57 minutes—making it ideal for busy professionals who want results without spending hours working out."
            }
        ];

        // Show only the top 8 USPs
        const displayedUsps = usps.slice(0, 8);

        proofGrid.innerHTML = displayedUsps.map((usp, index) => `
            <article class="usp-card" data-usp-index="${index + 1}">
                <div class="usp-number">${index + 1}</div>
                <div class="usp-content">
                    <h3 class="usp-title">${usp.title}</h3>
                    <p class="usp-description">${usp.copy}</p>
                </div>
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
                <summary><span class="faq-question">${item.question}</span></summary>
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
                        <div class="studio-map-location">
                            <span class="studio-map-badge">${studio.neighborhood}</span>
                            <p class="studio-map-address">${studio.address}</p>
                        </div>
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
        // Show at least 15 FAQs as preview on main page (increased from 6)
        const previewFaqs = [
            {
                question: "What should I bring to my first class?",
                answer: "We provide all equipment including grippy socks, yoga mats, and light weights. Just bring water, a towel, and comfortable workout clothes that allow for movement."
            },
            {
                question: "How early should I arrive?",
                answer: "Please arrive 15 minutes early for your first class to complete check-in, get oriented with the studio, and meet your instructor."
            },
            {
                question: "What happens if I need to cancel?",
                answer: "Cancellations should be made at least 12 hours before class time through the Momence app or by calling the studio directly."
            },
            {
                question: "Are classes suitable for beginners?",
                answer: "Absolutely! Our instructors provide modifications for all fitness levels. Let them know it's your first class and they'll guide you through everything."
            },
            {
                question: "Is parking available at the studios?",
                answer: "Both locations offer nearby parking options. Bandra has valet parking, while Kemps Corner has street parking and nearby lots."
            },
            {
                question: "What should I wear to class?",
                answer: "Wear form-fitting, comfortable workout clothes that allow for full range of motion. Avoid loose clothing that might get in the way during exercises."
            },
            {
                question: "Can I bring my own water bottle?",
                answer: "Yes, please bring a water bottle to stay hydrated during class. We also have water available for purchase at the studio."
            },
            {
                question: "Is there a locker room with showers?",
                answer: "Yes, both studios have well-equipped changing rooms with lockers. Shower facilities are available for your convenience after class."
            },
            {
                question: "Can I reschedule my trial class?",
                answer: "Yes, you can reschedule your trial class up to 12 hours before the scheduled time, subject to availability."
            },
            {
                question: "How do I book my subsequent classes?",
                answer: "After your trial, download the Physique 57 India app or use the Momence platform to book your regular classes and manage your membership."
            },
            {
                question: "What is the Physique 57 method?",
                answer: "Physique 57 is a proprietary barre workout method developed in New York that combines isometric exercises, orthopedic stretches, and muscle-defining movements to create long, lean, and sculpted muscles."
            },
            {
                question: "How is Physique 57 different from other barre classes?",
                answer: "Our method uses a unique combination of small, targeted movements and interval training that creates the signature 'shake' - the point where muscles fatigue and transformation happens."
            },
            {
                question: "What results can I expect and how quickly?",
                answer: "Most clients see visible results within 3-4 weeks with consistent practice. You'll notice improved posture, increased strength, and muscle definition, especially in arms, core, and glutes."
            },
            {
                question: "Can I modify movements if needed?",
                answer: "Absolutely! Our instructors provide modifications for all fitness levels and any physical limitations. Just let them know before class starts."
            },
            {
                question: "What is the class size and instructor ratio?",
                answer: "We keep class sizes small (typically 8-12 people) to ensure personalized attention from our certified instructors who can provide individual guidance and corrections."
            },
            {
                question: "What membership packages are available?",
                answer: "We offer various packages including single classes, class packs, unlimited monthly memberships, and special introductory offers for new clients."
            },
            {
                question: "How does the trial membership work?",
                answer: "The trial membership gives you access to 2 classes within 14 days, allowing you to experience our method and find your preferred class times and formats."
            },
            {
                question: "What is the late cancellation policy?",
                answer: "Classes must be cancelled at least 12 hours in advance. Late cancellations and no-shows will result in loss of class credit."
            }
        ];

        faqList.innerHTML = renderFaqCollection(previewFaqs, 0);

        // Main FAQ Modal - comprehensive FAQs organized by category (full width)
        const preparationFaqs = [
            {
                question: "What should I bring to my first class?",
                answer: "We provide all equipment including grippy socks, yoga mats, and light weights. Just bring water, a towel, and comfortable workout clothes that allow for movement."
            },
            {
                question: "How early should I arrive?",
                answer: "Please arrive 15 minutes early for your first class to complete check-in, get oriented with the studio, and meet your instructor."
            },
            {
                question: "What should I wear to class?",
                answer: "Wear form-fitting, comfortable workout clothes that allow for full range of motion. Avoid loose clothing that might get in the way during exercises."
            },
            {
                question: "Can I bring my own water bottle?",
                answer: "Yes, please bring a water bottle to stay hydrated during class. We also have water available for purchase at the studio."
            },
            {
                question: "Is there a locker room with showers?",
                answer: "Yes, both studios have well-equipped changing rooms with lockers. Shower facilities are available for your convenience after class."
            },
            {
                question: "What happens if I'm running late?",
                answer: "Please try to arrive on time as late entry may not be permitted once the class has started for safety reasons. Call the studio if you're running behind."
            },
            {
                question: "Do you provide yoga mats?",
                answer: "Yes, we provide all necessary equipment including yoga mats, light weights, and resistance bands. Everything is sanitized between uses."
            }
        ];

        const bookingFaqs = [
            {
                question: "What happens if I need to cancel?",
                answer: "Cancellations should be made at least 12 hours before class time through the Momence app or by calling the studio directly."
            },
            {
                question: "Can I reschedule my trial class?",
                answer: "Yes, you can reschedule your trial class up to 12 hours before the scheduled time, subject to availability."
            },
            {
                question: "How do I book my subsequent classes?",
                answer: "After your trial, download the Physique 57 India app or use the Momence platform to book your regular classes and manage your membership."
            },
            {
                question: "Is parking available at the studios?",
                answer: "Both locations offer nearby parking options. Bandra has valet parking, while Kemps Corner has street parking and nearby lots. Details will be sent with your booking confirmation."
            },
            {
                question: "Are classes suitable for beginners?",
                answer: "Absolutely! Our instructors provide modifications for all fitness levels. Let them know it's your first class and they'll guide you through everything."
            },
            {
                question: "What is the late cancellation policy?",
                answer: "Classes must be cancelled at least 12 hours in advance. Late cancellations and no-shows will result in loss of class credit."
            },
            {
                question: "Can I bring a friend to class?",
                answer: "Friends are welcome to book their own trial or regular class. We don't allow observers in the studio for safety and privacy reasons."
            }
        ];

        const generalFaqs = [
            {
                question: "What is the Physique 57 method?",
                answer: "Physique 57 is a proprietary barre workout method developed in New York that combines isometric exercises, orthopedic stretches, and muscle-defining movements to create long, lean, and sculpted muscles."
            },
            {
                question: "How is Physique 57 different from other barre classes?",
                answer: "Our method uses a unique combination of small, targeted movements and interval training that creates the signature 'shake' - the point where muscles fatigue and transformation happens."
            },
            {
                question: "What results can I expect and how quickly?",
                answer: "Most clients see visible results within 3-4 weeks with consistent practice. You'll notice improved posture, increased strength, and muscle definition, especially in arms, core, and glutes."
            },
            {
                question: "Can I modify movements if needed?",
                answer: "Absolutely! Our instructors provide modifications for all fitness levels and any physical limitations. Just let them know before class starts."
            },
            {
                question: "What is the class size and instructor ratio?",
                answer: "We keep class sizes small (typically 8-12 people) to ensure personalized attention from our certified instructors who can provide individual guidance and corrections."
            },
            {
                question: "What membership packages are available?",
                answer: "We offer various packages including single classes, class packs, unlimited monthly memberships, and special introductory offers for new clients."
            },
            {
                question: "How does the trial membership work?",
                answer: "The trial membership gives you access to 2 classes within 14 days, allowing you to experience our method and find your preferred class times and formats."
            }
        ];

        // Populate main modal sections (21 FAQs total across 3 sections)
        const faqModalPreparation = document.getElementById('faq-modal-preparation');
        const faqModalBooking = document.getElementById('faq-modal-booking');
        const faqModalGeneral = document.getElementById('faq-modal-general');

        if (faqModalPreparation) {
            faqModalPreparation.innerHTML = renderFaqCollection(preparationFaqs, 0);
            setupFaqAccordion(faqModalPreparation);
        }

        if (faqModalBooking) {
            faqModalBooking.innerHTML = renderFaqCollection(bookingFaqs, 0);
            setupFaqAccordion(faqModalBooking);
        }

        if (faqModalGeneral) {
            faqModalGeneral.innerHTML = renderFaqCollection(generalFaqs, 0);
            setupFaqAccordion(faqModalGeneral);
        }

        // Detailed FAQ Modal - comprehensive content (20+ additional FAQs)
        const methodFaqs = [
            {
                question: "What makes Physique 57 unique?",
                answer: "Physique 57 combines cardio, strength training, and stretching in a low-impact, high-intensity format that targets specific muscle groups to create long, lean lines."
            },
            {
                question: "How often should I attend classes?",
                answer: "For best results, we recommend 3-4 classes per week. This allows your body to adapt while maintaining consistency for visible transformation."
            },
            {
                question: "Is Physique 57 suitable for all fitness levels?",
                answer: "Yes! Our instructors provide modifications for every exercise, making it accessible for beginners while challenging for advanced practitioners."
            },
            {
                question: "What is the signature 'shake' in Physique 57?",
                answer: "The 'shake' is when your muscles reach fatigue through small, targeted movements. This is where the magic happens - your muscles are working to their maximum capacity for optimal results."
            },
            {
                question: "Can I practice Physique 57 if I'm pregnant?",
                answer: "We offer prenatal modifications, but please consult your doctor first and inform your instructor about your pregnancy so they can provide appropriate modifications."
            }
        ];

        const membershipFaqs = [
            {
                question: "What is the cancellation policy for memberships?",
                answer: "Membership cancellations must be submitted in writing at least 30 days before the next billing cycle. Trial packages are non-refundable."
            },
            {
                question: "Can I freeze my membership?",
                answer: "Yes, monthly memberships can be frozen for up to 2 months per year for medical reasons or extended travel with proper documentation."
            },
            {
                question: "Are there corporate or group rates available?",
                answer: "Yes, we offer corporate packages and group rates for 5 or more people. Contact us at info@physique57india.com for custom pricing."
            },
            {
                question: "How do I upgrade or downgrade my membership?",
                answer: "Membership changes can be made through the app or by speaking with studio staff. Changes take effect at the next billing cycle."
            },
            {
                question: "Do unused classes expire?",
                answer: "Class packages have expiration dates which vary by package type. Trial packages must be used within 14 days of purchase."
            }
        ];

        const policyFaqs = [
            {
                question: "What safety protocols are in place?",
                answer: "We maintain rigorous cleaning protocols, ensure proper ventilation, and limit class sizes. All instructors are certified and trained in injury prevention."
            },
            {
                question: "Is there an age restriction for classes?",
                answer: "Classes are designed for adults 16 years and older. Participants under 18 require parental consent and may need modified exercises."
            },
            {
                question: "What happens if I'm injured during class?",
                answer: "Stop immediately and inform the instructor. While we carry liability insurance, participants are responsible for disclosing any pre-existing conditions or limitations."
            },
            {
                question: "Can I take photos or videos during class?",
                answer: "Photography and videography are not permitted during class to protect the privacy of all participants and maintain focus on the workout."
            },
            {
                question: "What is your refund policy?",
                answer: "Trial packages and memberships are non-refundable. However, we offer makeup classes for medical emergencies with proper documentation."
            }
        ];

        const technicalFaqs = [
            {
                question: "How do I download and use the Physique 57 app?",
                answer: "Search 'Physique 57 India' in your app store, or use the Momence platform to book classes, manage your account, and track your progress."
            },
            {
                question: "I'm having trouble booking online. What should I do?",
                answer: "Contact our support team at info@physique57india.com or call the studio directly. We can help with booking issues or technical problems."
            },
            {
                question: "How do I update my payment information?",
                answer: "Log into your account on the app or Momence platform, go to 'Account Settings' and update your payment method in the billing section."
            },
            {
                question: "Can I book classes for someone else?",
                answer: "Each person needs their own account for liability and tracking purposes. You can purchase gift certificates that others can use to create their own account."
            },
            {
                question: "What if I forget to check in for my class?",
                answer: "Always check in at the front desk when you arrive. If you forget, let us know after class so we can manually adjust your account."
            }
        ];

        // Populate detailed modal sections
        const detailedMethodSection = document.getElementById('detailed-faq-method');
        const detailedMembershipSection = document.getElementById('detailed-faq-membership');
        const detailedPoliciesSection = document.getElementById('detailed-faq-policies');
        const detailedTechnicalSection = document.getElementById('detailed-faq-technical');

        if (detailedMethodSection) {
            detailedMethodSection.innerHTML = renderFaqCollection(methodFaqs, 0);
            setupFaqAccordion(detailedMethodSection);
        }

        if (detailedMembershipSection) {
            detailedMembershipSection.innerHTML = renderFaqCollection(membershipFaqs, 0);
            setupFaqAccordion(detailedMembershipSection);
        }

        if (detailedPoliciesSection) {
            detailedPoliciesSection.innerHTML = renderFaqCollection(policyFaqs, 0);
            setupFaqAccordion(detailedPoliciesSection);
        }

        if (detailedTechnicalSection) {
            detailedTechnicalSection.innerHTML = renderFaqCollection(technicalFaqs, 0);
            setupFaqAccordion(detailedTechnicalSection);
        }
    }

    function renderPolicyHighlights() {
        policyList.innerHTML = content.policyHighlights.map((item) => `<li>${item}</li>`).join('');
    }

    function getFormatGroups(center) {
        if (!content.classOptionsByStudio) {
            return [];
        }
        
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
                const [studioName, options] = filteredGroups[0];
                const [option] = options;
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
                                <div class="choice-card-icon-with-badge choice-card-icon-with-badge-modal">
                                    ${renderFormatIcon(option)}
                                    <span class="choice-card-badge">${option.badge}</span>
                                </div>
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

        payButton.disabled = isProcessing || paymentConfirmed || !isFormValidForPayment();
        payButton.textContent = isProcessing
            ? 'Starting secure checkout...'
            : (paymentConfirmed ? 'Payment confirmed' : (getPaymentStageConfig().buttonLabel || tracking.appConfig?.paymentButtonLabel || 'Pay ₹1,838'));
    }

    function isFormValidForPayment() {
        const requiredFields = [
            'firstName', 'lastName', 'email', 'phoneNumber', 'time', 'center'
        ];

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                return false;
            }
        }

        // Check if a class option is selected
        const selectedType = form.querySelector('input[name="type"]:checked');
        if (!selectedType) {
            return false;
        }

        // Check if payment stage is selected
        const selectedStage = form.querySelector('input[name="stage"]:checked');
        if (!selectedStage) {
            return false;
        }

        // Check waiver
        const waiverAccepted = document.getElementById('waiverAccepted');
        if (!waiverAccepted || !waiverAccepted.checked) {
            return false;
        }

        return true;
    }

    function updatePayButtonState() {
        if (payButton) {
            payButton.disabled = paymentConfirmed || !isFormValidForPayment();
        }
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

        // Update membership summary
        if (selectedIndex !== -1 && membershipSummary && checkoutMembershipSummary) {
            const selectedCard = cards[selectedIndex];
            const selectedInput = selectedCard.querySelector('input[type="radio"]');
            const selectedType = selectedInput?.value;

            // Find the class option data
            const center = form.querySelector('#center')?.value;
            const options = content.classOptionsByStudio?.[center] || [];
            const selectedOption = options.find(option => option.value === selectedType || option.type === selectedType);

            if (selectedOption) {
                // Determine price based on current payment stage
                const currentStage = getSelectedPaymentStage();
                const stagePrice = currentStage === 'testing' ? '₹1' : '₹1,838';

                // Create more detailed membership data for modal
                const membershipData = {
                    ...selectedOption,
                    name: selectedOption.name || selectedOption.title,
                    price: stagePrice,
                    sessions: selectedOption.sessions || '1 Trial Class'
                };

                // Update original membership summary
                if (membershipName) membershipName.textContent = membershipData.name;
                if (membershipPrice) membershipPrice.textContent = membershipData.price;
                if (membershipSessions) membershipSessions.textContent = membershipData.sessions;
                membershipSummary.hidden = false;

                // Update checkout membership summary
                if (checkoutMembershipName) checkoutMembershipName.textContent = membershipData.name;
                if (checkoutMembershipPrice) checkoutMembershipPrice.textContent = membershipData.price;
                if (checkoutMembershipSessions) checkoutMembershipSessions.textContent = membershipData.sessions;
                checkoutMembershipSummary.hidden = false;

                // Store the selected option for details modal
                membershipSummary.setAttribute('data-selected-option', JSON.stringify(membershipData));
            }
        } else if (membershipSummary && checkoutMembershipSummary) {
            membershipSummary.hidden = true;
            checkoutMembershipSummary.hidden = true;
        }

        // Add event listener for membership details button
        if (membershipDetailsButton && membershipDetailsModal) {
            membershipDetailsButton.onclick = () => {
                console.log('Membership details button clicked');
                const selectedOptionData = membershipSummary.getAttribute('data-selected-option');
                console.log('Selected option data:', selectedOptionData);
                if (selectedOptionData) {
                    try {
                        const option = JSON.parse(selectedOptionData);
                        console.log('Parsed option:', option);
                        populateMembershipDetailsModal(option);
                        openModal(membershipDetailsModal);
                    } catch (e) {
                        console.error('Error parsing selected option data:', e);
                    }
                } else {
                    console.warn('No selected option data found');
                }
            };
        }

        // Add event listener for checkout membership details button
        if (checkoutMembershipDetailsButton && membershipDetailsModal) {
            checkoutMembershipDetailsButton.onclick = () => {
                console.log('Checkout membership details button clicked');
                const selectedOptionData = membershipSummary.getAttribute('data-selected-option');
                if (selectedOptionData) {
                    try {
                        const option = JSON.parse(selectedOptionData);
                        populateMembershipDetailsModal(option);
                        openModal(membershipDetailsModal);
                    } catch (e) {
                        console.error('Error parsing checkout selected option data:', e);
                    }
                }
            };
        }
    }

    function populateMembershipDetailsModal(option) {
        const modalContent = document.getElementById('membership-details-modal-content');
        const modalTitle = document.getElementById('membership-details-modal-title');

        // For testing/production, get membership data based on payment stage
        const paymentStage = getSelectedPaymentStage();
        let membershipData = null;

        // Sample membership data based on stage (production gets Newcomers, testing gets Test)
        if (paymentStage === 'testing') {
            membershipData = {
                id: 675444,
                name: "Test",
                price: 1,
                numberOfEvents: 2,
                duration: 1,
                durationUnit: "months",
                description: "Test package for development and debugging purposes.",
                isIntroOffer: false,
                activateOnFirstUse: true,
                taxBracket: { name: "GST 5%", vatRateInPercent: 5 },
                host: { name: "Physique 57 Mumbai" }
            };
        } else {
            membershipData = {
                id: 240932,
                name: "Newcomers 2 For 1",
                price: 1750,
                numberOfEvents: 2,
                duration: 14,
                durationUnit: "days",
                description: "Whether you're a fitness enthusiast or just starting out, Physique 57's Newcomers 2 for 1 is the perfect way to achieve the results you've been dreaming of! With our expert instructors and supportive community, you'll have the guidance and accountability you need to stay motivated and committed to your fitness goals.\n\nLATE CANCELLATION: Canceling your class within 12 hours of your class start time results in loss of your credit. No shows are considered late cancellations and results in loss of your credit.\n\nThis membership can be purchased ONLY once, is non refundable & cannot be shared between members.",
                isIntroOffer: true,
                activateOnFirstUse: true,
                taxBracket: { name: "GST 5%", vatRateInPercent: 5 },
                host: { name: "Physique 57 Mumbai" }
            };
        }

        if (modalTitle) {
            modalTitle.textContent = `${membershipData.name} - Complete Package Details`;
        }

        if (modalContent) {
            const formattedPrice = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(membershipData.price);

            const durationText = `${membershipData.duration} ${membershipData.durationUnit}`;
            const sessionsText = `${membershipData.numberOfEvents} ${membershipData.numberOfEvents === 1 ? 'Class' : 'Classes'}`;

            modalContent.innerHTML = `
                <div class="membership-detail-grid">
                    <div class="membership-detail-card">
                        <h3>Package Information</h3>
                        <dl class="membership-detail-list">
                            <div>
                                <dt>Package Name</dt>
                                <dd>${membershipData.name}</dd>
                            </div>
                            <div>
                                <dt>Studio</dt>
                                <dd>${membershipData.host.name}</dd>
                            </div>
                            <div>
                                <dt>Package Type</dt>
                                <dd>${membershipData.isIntroOffer ? 'Introductory Offer' : 'Regular Package'}</dd>
                            </div>
                            <div>
                                <dt>Activation</dt>
                                <dd>${membershipData.activateOnFirstUse ? 'On First Use' : 'Immediately'}</dd>
                            </div>
                        </dl>
                    </div>

                    <div class="membership-detail-card">
                        <h3>Pricing & Usage</h3>
                        <dl class="membership-detail-list">
                            <div>
                                <dt>Package Price</dt>
                                <dd class="price-highlight">${formattedPrice}</dd>
                            </div>
                            <div>
                                <dt>Sessions Included</dt>
                                <dd>${sessionsText}</dd>
                            </div>
                            <div>
                                <dt>Valid For</dt>
                                <dd>${durationText}</dd>
                            </div>
                            <div>
                                <dt>Tax</dt>
                                <dd>${membershipData.taxBracket.name} (${membershipData.taxBracket.vatRateInPercent}%)</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                ${membershipData.description ? `
                <div class="membership-detail-card membership-detail-description">
                    <h3>Package Description</h3>
                    <div style="white-space: pre-line;">${membershipData.description}</div>
                </div>
                ` : ''}

                <div class="membership-detail-card">
                    <h3>Important Terms</h3>
                    <ul class="membership-highlights-list">
                        <li>Package activates on first class attended</li>
                        <li>Late cancellations (within 12 hours) result in loss of credit</li>
                        <li>No-shows are considered late cancellations</li>
                        <li>Classes must be attended within the validity period</li>
                        ${membershipData.isIntroOffer ? '<li>This introductory offer can only be purchased once per customer</li>' : ''}
                        <li>Package is non-refundable and non-transferable</li>
                        <li>Subject to studio availability and booking policies</li>
                    </ul>
                </div>

                <div class="membership-detail-card">
                    <h3>Next Steps</h3>
                    <ul class="membership-highlights-list">
                        <li>Complete your payment to secure the package</li>
                        <li>Receive booking confirmation via email</li>
                        <li>Download the Physique 57 India app for easy class booking</li>
                        <li>Book your first class at your preferred studio</li>
                        <li>Arrive 15 minutes early for your first visit</li>
                    </ul>
                </div>
            `;
        }
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
                    <div class="choice-card-icon-with-badge">
                        ${renderFormatIcon(option)}
                        <span class="choice-card-badge">${option.badge}</span>
                    </div>
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
        classOptionGrid.setAttribute('data-center', center);

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

        // Ensure function updates properly
        setTimeout(updateSelectedClassState, 50);
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
    function openWhatsAppChat() {
        const formData = getSerializableFormState();
        let message = "Hi! I'd like to book a trial class at Physique 57.\n\n";
        
        if (formData.firstName || formData.lastName) {
            message += `Name: ${formData.firstName} ${formData.lastName}\n`;
        }
        if (formData.email) {
            message += `Email: ${formData.email}\n`;
        }
        if (formData.phoneNumber) {
            message += `Phone: ${formData.phoneNumber}\n`;
        }
        if (formData.center) {
            message += `Preferred Studio: ${formData.center}\n`;
        }
        if (formData.time) {
            message += `Preferred Time: ${formData.time}\n`;
        }
        if (formData.type) {
            message += `Preferred Format: ${formData.type}\n`;
        }
        
        message += "\nPlease help me complete my booking. Thank you!";
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/919769570178?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    }

    applyTheme(getPreferredTheme());

    renderHeroSignals(false);
    renderProofCards();
    renderJourneySteps();
    renderStudios();
    renderFaqs();
    renderFormatModal();
    initializePhoneInput();
    updateScheduleExternalLink();
    setupFaqAccordion(faqList);
    applyPaymentStage(getDefaultPaymentStage(), { resetPayment: false, persist: false });
    restoreCheckoutState();
    setPaymentState(false);

    centerSelect.addEventListener('change', () => {
        renderClassOptions(centerSelect.value);
        clearStatus();
        updatePayButtonState();
    });

    classOptionGrid.addEventListener('click', (event) => {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }

        const btn = event.target.closest('.choice-card-more');

        if (!btn) {
            return;
        }

        event.stopPropagation();
        const center = classOptionGrid.getAttribute('data-center');
        const optionValue = btn.getAttribute('data-option-value');

        if (center && optionValue) {
            openFormatDetails(center, optionValue);
        }
    });

    whatsappButton?.addEventListener('click', openWhatsAppChat);

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

    // Update pay button state on form changes
    form.addEventListener('input', updatePayButtonState);
    form.addEventListener('change', updatePayButtonState);

    // Persist checkout state on any form change to prevent data loss during payment
    function persistFormStateOnChange() {
        persistCheckoutState({
            ...getSerializableFormState(),
            eventId: currentEventId || tracking.createEventId()
        });
    }

    // Add persistent state saving on form changes
    form.addEventListener('input', persistFormStateOnChange);
    form.addEventListener('change', persistFormStateOnChange);

    // Initial state
    updatePayButtonState();

    // Payment flow: create a Checkout session and verify on return
    async function createCheckoutSession() {
        clearStatus();
        clearFieldErrors();

        const payload = buildLeadPayloadFromForm();
        if (!payload) {
            return;
        }

        // Ensure form state is persisted before going to checkout
        persistCheckoutState({
            ...getSerializableFormState(),
            eventId: currentEventId || tracking.createEventId()
        });

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

                // Auto-submit the form if all validations pass
                setTimeout(() => {
                    try {
                        // Check if form is valid using the same logic as handleSubmit
                        const payload = buildLeadPayloadFromForm();
                        if (payload && paymentConfirmed && paymentSessionId) {
                            showStatus('Payment confirmed! Submitting your request now...', 'success');
                            handleSubmit(new Event('submit')); // Automatically submit the form
                        } else {
                            showStatus('Payment confirmed! Please complete the form and click submit.', 'success');
                        }
                    } catch (error) {
                        console.error('Auto-submit failed:', error);
                        showStatus('Payment confirmed! Please click submit to complete your request.', 'success');
                    }
                }, 500);

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
        button.addEventListener('click', () => {
            // Special handling for detailed FAQ modal opened from main FAQ modal
            if (button.id === 'open-detailed-faq-from-modal' && activeModal === faqModal) {
                closeModal(faqModal);
                setTimeout(() => openModal(modal), 100);
            } else {
                openModal(modal);
            }
        });
    });

    modalCloseButtons.forEach(({ button, modal }) => {
        button.addEventListener('click', () => closeModal(modal));
    });

    [waiverModal, formatModal, faqModal, detailedFaqModal, scheduleModal, signalModal, membershipDetailsModal].filter(Boolean).forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target instanceof HTMLElement && event.target.hasAttribute('data-modal-close')) {
                closeModal(modal);
            }
        });
    });

    document.addEventListener('keydown', handleModalKeyboard);

    whatsappButton?.addEventListener('click', openWhatsAppChat);
})();
