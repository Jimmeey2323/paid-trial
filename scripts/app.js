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
    const formatModalImage = document.getElementById('format-modal-image');
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
    const checkoutStateStorageKey = 'trial_form_checkout_state_v1';
    const paymentSessionStorageKey = 'trial_form_payment_session_id';
    const paymentSubmitPayloadKey = 'trial_form_submit_payload';

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
            window.sessionStorage.removeItem(paymentSubmitPayloadKey);
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
        if (centerSelect && state.center) {
            centerSelect.value = state.center;
            filterClassOptionsByCenter(state.center);
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

    function buildLeadPayloadFromForm({ skipValidation = false } = {}) {
        if (!skipValidation && !validateLeadForm()) {
            return null;
        }

        const selectedType = form.querySelector('input[name="type"]:checked');

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

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
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
        const faqDataset = String.raw`What is Physique 57?	Physique 57 is a renowned global fitness brand, celebrated for its innovative approach to barrebased workouts. In India, Physique 57 offers a unique fitness experience that combines elements of cardio, strength training, and stretching.
What are the benefits of Physique 57?	Physique 57 offers numerous benefits, including muscle strength and tone, improved posture, enhanced flexibility, increased endurance, and stress reduction.
Is Physique 57 suitable for all fitness levels?	Yes, Physique 57 is suitable for individuals of all fitness levels, from beginners to advanced. The workouts are designed to be modified to accommodate different fitness levels, and the lowimpact nature of the exercises makes it a welcoming format for those starting their fitness journey.
Can men take Physique 57 classes?	Absolutely! Physique 57 India welcomes men to participate in all classes. The workouts are designed to benefit anyone looking to improve their fitness, regardless of gender.
Is Physique 57 safe during or after pregnancy?	Yes, Physique 57 India offers prenatal and postnatal modifications, making it safe for pregnant women, provided they have clearance from their healthcare provider.
What is the typical class size at Physique 57?	The typical class size at Physique 57 India varies, but most classes have between 10-20 participants.
How often should I take Physique 57 classes to see results?	For optimal results, it is recommended to participate in Physique 57 India classes 3-4 times per week.
Can I crosstrain with Physique 57?	Yes, Physique 57 India can be effectively combined with other fitness routines. It complements various types of workouts by building core strength, flexibility, and endurance, which can enhance performance in other sports or physical activities.
What is the cost of Physique 57 classes?	The cost of Physique 57 India classes varies depending on the location and package options. Please visit our website or contact your local studio for more information.
Can I purchase Physique 57 classes online?	Yes, you can purchase Physique 57 India classes online through our website or mobile app.
Where are Physique 57 studios located?	Physique 57 India studios are located at the following addresses: 1. Kwality House, August Kranti Rd, below Kemps Corner, Kemps Corner, Grant Road, Mumbai, Maharashtra 400036 [https://www.google.com/maps/place/Kwality+House,+August+Kranti+Rd,+below+Kemps+Corner,+Kemps+Corner,+Grant+Road,+Mumbai,+Maharashtra+400036](https://www.google.com/maps/place/Kwality+House,+August+Kranti+Rd,+below+Kemps+Corner,+Kemps+Corner,+Grant+Road,+Mumbai,+Maharashtra+400036) Phone: 097696 65757 2. 203, Supreme Headquarters, Junction of 14th, &, 33rd Rd, opposite Monkey Bar, Bandra West, Mumbai, Maharashtra 400050 [https://www.google.com/maps/place/203,+Supreme+Headquarters,+Junction+of+14th,+%26+33rd+Rd,+opposite+Monkey+Bar,+Bandra+West,+Mumbai,+Maharashtra+400050](https://www.google.com/maps/place/203,+Supreme+Headquarters,+Junction+of+14th,+%26+33rd+Rd,+opposite+Monkey+Bar,+Bandra+West,+Mumbai,+Maharashtra+400050) Phone: 097696 65757 3. 1st Floor, Kenkere House, Vittal Mallya Rd, above Raymonds, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560001 [https://www.google.com/maps/place/1st+Floor,+Kenkere+House,+Vittal+Mallya+Rd,+above+Raymonds,+Shanthala+Nagar,+Ashok+Nagar,+Bengaluru,+Karnataka+560001](https://www.google.com/maps/place/1st+Floor,+Kenkere+House,+Vittal+Mallya+Rd,+above+Raymonds,+Shanthala+Nagar,+Ashok+Nagar,+Bengaluru,+Karnataka+560001) Phone: 070220 43667
What amenities do Physique 57 studios offer?	Physique 57 India studios offer a variety of amenities to enhance your experience, including: Locker Rooms: Secure storage for your belongings. Showers: Clean and private facilities for postworkout refreshment. Towel Service: Complimentary towels for your convenience. Boutique: A selection of fitness apparel and accessories for purchase.
Are Physique 57 studios clean and wellmaintained?	Yes, Physique 57 India studios are committed to maintaining a clean and hygienic environment. Regular Cleaning: Studios are cleaned and disinfected frequently to ensure safety. Attention to Detail: Staff members are trained to uphold high cleanliness standards throughout the facility.
Do Physique 57 studios offer parking?	Yes. Vallet services are available at each of our studio locations.
Can I store my belongings at Physique 57 studios?	Yes, Physique 57 India studios provide storage options for clients, including: Lockers: Secure storage for personal items during classes. Cubbies: Available for smaller belongings. Please note that Physique 57 India is not responsible for lost or stolen items.
Are Physique 57 studios accessible for people with disabilities?	Yes, Physique 57 India studios are designed to be accessible for individuals with disabilities. Wheelchair Access: Facilities are equipped to accommodate wheelchair users. Supportive Environment: Staff are trained to assist clients with special needs.
Can I bring a guest to Physique 57 studios?	Yes, you can bring a guest to Physique 57 India studios. However, guests must: Sign a Waiver: Complete a waiver form before participating. Provide Identification: Show valid ID for verification.
Do Physique 57 studios offer childcare services?	No, Physique 57 India studios do not offer childcare services. AdultFocused Environment: The studios are designed for adult clients and are not suitable for children.
Can I purchase food and drinks at Physique 57 studios?	Yes, Physique 57 India studios offer a selection of healthy snacks and beverages for purchase. Healthy Options: The menu typically includes nutritious snacks and drinks to support your fitness journey.
Do Physique 57 studios offer showers and towel service?	Yes, Physique 57 India studios provide both showers and towel service for clients. Convenience: Fresh towels are available for use before and after classes. Clean Facilities: Showers are maintained to ensure a pleasant experience.
What is the Physique 57 method?	The Physique 57 method is a unique fitness approach that combines: Isometric Exercises: Targeting specific muscle groups to build strength. Ballet Barre: Providing support and resistance during workouts. Interval Overload: Muscles are worked to fatigue and then immediately stretched, promoting lean muscle development and boosting metabolism. This method is designed to create long, lean muscles while enhancing overall fitness.
What is the history of Physique 57?	Physique 57 India was founded by Mallika Parekh, an accomplished entrepreneur with a passion for health and wellness. Inspired by the Global Brand: The Indian franchise was established to bring the Physique 57 method to the Indian market. Rapid Growth: Since its inception, Physique 57 India has expanded to multiple locations across the country.
What is the science behind Physique 57?	The Physique 57 methodology is based on scientific research and principles of exercise physiology. Effective Workouts: The combination of isometric exercises and interval overload is designed to challenge the body safely and effectively. ResearchBacked: Studies have shown that this approach leads to significant improvements in strength, flexibility, and overall fitness.
How does Physique 57 compare to other fitness methods?	Physique 57 India stands out due to its unique blend of: Ballet, Pilates, and Strength Training: This combination creates a dynamic and effective workout. Focus on Interval Overload: This technique leads to quicker results compared to traditional workouts. Personalized Instruction: Instructors provide tailored guidance to help clients achieve their fitness goals.
What is the role of the ballet barre in Physique 57?	The ballet barre is a fundamental tool in the Physique 57 method, serving several purposes: Support: It provides stability during exercises, allowing clients to focus on form and technique. Resistance: The barre is used to enhance muscle engagement and challenge strength. Alignment: It helps clients maintain proper posture and alignment throughout the workout.
How does Physique 57 incorporate stretching?	Stretching is a vital component of the Physique 57 workout, integrated throughout the sessions: Fluid Transitions: Stretching is incorporated between intense muscle work to aid recovery. Muscle Elongation: It helps in elongating and shaping the muscles, enhancing flexibility. Injury Prevention: Regular stretching reduces the risk of injury and promotes overall mobility.
What is the significance of interval overload in Physique 57?	Interval overload is a cornerstone of the Physique 57 method, characterized by: Muscle Fatigue: Muscles are worked to the point of fatigue, promoting strength and endurance. Immediate Stretching: Following muscle fatigue, immediate stretching helps in recovery and muscle elongation. Metabolism Boost: This technique effectively boosts metabolism, leading to quicker results.
How does Physique 57 incorporate cardio?	Physique 57 India incorporates cardio through highintensity interval training (HIIT), which includes: Dynamic Movements: Exercises that elevate the heart rate and improve cardiovascular health. Interval Training: Alternating between intense bursts of activity and recovery periods to maximize calorie burn. FullBody Engagement: Cardio elements are integrated into strength training for a comprehensive workout.
What is the role of the instructor in Physique 57?	Instructors play a crucial role in the Physique 57 experience by: Providing Expert Guidance: They offer personalized instruction to help clients achieve their fitness goals. Creating a Supportive Environment: Instructors foster a welcoming atmosphere that encourages participation and motivation. Monitoring Form and Technique: They ensure clients maintain proper form to maximize effectiveness and minimize injury risk.
How does Physique 57 support client goals and progress?	Physique 57 India supports client goals and progress through various means: GoalSetting: Clients are encouraged to set personal fitness goals, which instructors help track and adjust as needed. Progress Tracking: Regular assessments and feedback help clients monitor their improvements. Personalized Instruction: Instructors provide tailored recommendations based on individual progress and goals.
What is powerCycle?	powerCycle is an indoor cycling program that combines rhythmdriven rides with meaningful resistance. It focuses on syncing pedal strokes to the beat of the music, creating an engaging and effective workout experience. Our classes are designed to accommodate all fitness levels, ensuring a personalized experience within a group setting.
How long are the powerCycle classes?	Our powerCycle classes are available in 30minute and 45minute formats. This flexibility allows clients to choose a class duration that fits their schedule and fitness goals.
Do I need special shoes for powerCycle?	While you can use your own sneakers, we recommend using specialty indoor cycling shoes provided by us for the best experience. These shoes enhance your performance by providing better grip and support during the ride.
How do I track my progress in powerCycle?	During powerCycle classes, you can track your progress using wattage, distance covered in kilometers, and RPM (pedal speed) displayed on our stateoftheart bikes. This data allows you to monitor your performance and see improvements over time.
Can beginners join powerCycle classes?	Absolutely! Our powerCycle classes are designed to be inclusive for all fitness levels, including beginners. Instructors provide modifications and guidance to ensure everyone can participate and benefit from the workout.
What should I wear to a powerCycle class?	We recommend wearing a sports bra, a comfortable tank top or tshirt, and leggings or shorts. It's important to wear breathable clothing that allows for movement. If you prefer, you can also wear a cycling kit that you find comfortable.
How often should I attend powerCycle classes for results?	For significant fitness results, we recommend attending two to three powerCycle classes per week. This frequency allows for effective crosstraining and helps achieve your fitness goals while ensuring adequate recovery time.
What is the cancellation policy for powerCycle classes?	Cancellations must be made at least 12 hours before the scheduled class start time. If you cancel within this timeframe, the class will be credited back to your account for future use.
What is the bike fit process for new clients?	New clients are encouraged to arrive 15 minutes early for bike fitting. Our staff will assist you in adjusting the saddle height, handlebar height, and other settings to ensure a comfortable and safe riding experience. Proper bike fit is crucial for maximizing performance and preventing injuries.
What if I have injuries or specific fitness concerns?	Yes! Our instructors screen for injuries or limitations before class. You can privately discuss any concerns with your instructor, who will provide modifications to ensure a safe and effective workout tailored to your needs.
What are the health benefits of powerCycle?	powerCycle offers numerous health benefits, including improved cardiovascular fitness, enhanced muscle endurance, and increased caloric burn. The lowimpact nature of cycling makes it suitable for various fitness levels, promoting joint health while providing an effective workout.
How does powerCycle differ from traditional spinning classes?	Unlike traditional spinning classes, powerCycle emphasizes rhythmdriven rides that sync with music, incorporating meaningful resistance for a more engaging experience. Our classes focus on proper form and technique, ensuring a safe and effective workout.
Can powerCycle help with weight loss?	Yes, powerCycle can be an effective component of a weight loss program. The combination of highintensity intervals and resistance training helps burn calories and build lean muscle, contributing to overall weight management.
What is the unique selling proposition (USP) of powerCycle?	The USP of powerCycle lies in its sciencebased training combined with musicdriven rides. Our instructors are extensively trained to provide a fun and effective workout that focuses on longterm movement and health benefits, making it a standout choice for fitness enthusiasts.
How does powerCycle improve mental health?	Yes, powerCycle can significantly improve mental health. The combination of physical activity, music, and the endorphin release during cycling can lead to reduced stress levels and improved mood. Many clients report feeling more energized and positive after classes.
What kind of music is played during powerCycle classes?	Our powerCycle classes feature a diverse range of music genres, including pop, rock, Bollywood, and hiphop. The carefully curated playlists are designed to motivate and energize riders, enhancing the overall workout experience by syncing movements to the beat.
How does powerCycle support joint health?	powerCycle is a lowimpact workout, making it suitable for individuals with joint concerns. The cycling motion is gentle on the joints while still providing an effective cardiovascular workout, promoting joint health and mobility.
What can I expect in a typical powerCycle class?	In a typical powerCycle class, you can expect a dynamic warmup, followed by rhythmbased cycling intervals, resistance training, and a cooldown. Each session is designed to be engaging and effective, ensuring participants have fun while achieving their fitness goals.
How does Physique 57 differ from traditional gym workouts?	Physique 57 combines elements of barre, strength training, and indoor cycling to create a holistic fitness experience. Unlike traditional gym workouts that may focus solely on strength or cardio, our classes emphasize a balanced approach to fitness, promoting overall wellbeing and functional movement.
Can I combine Physique 57 with other fitness routines?	Yes, combining Physique 57 with other fitness routines, such as powerCycle or strength training, can enhance overall fitness. This crosstraining approach helps improve strength, endurance, and flexibility, leading to better results and reduced risk of injury.
How does Physique 57 support muscle building compared to other workouts?	Physique 57 incorporates strength training principles in both barre and cycling classes, promoting lean muscle development. Our focus on proper form and resistance ensures effective muscle engagement, making it a valuable addition to any strength training program.
How does the community aspect of Physique 57 compare to other gyms?	Physique 57 fosters a strong sense of community among participants. Our classes are designed to be inclusive and supportive, encouraging camaraderie and motivation among clients. This community aspect enhances the overall workout experience, making it more enjoyable and effective.
How does Physique 57 address individual fitness levels?	Physique 57 classes are designed to accommodate all fitness levels. Instructors provide modifications and personalized guidance, ensuring that everyone can participate and benefit from the workout, regardless of their starting point.
What is the instructor training process at Physique 57?	Our instructors undergo extensive training that combines sciencebased principles and musicdriven techniques. This ensures they are wellequipped to provide effective coaching and support, enhancing the overall class experience for participants.
How does Physique 57 promote longterm fitness success?	Physique 57 emphasizes sustainable fitness through a balanced approach that combines strength, cardio, and flexibility. Our classes are designed to be enjoyable and effective, encouraging longterm adherence to a healthy lifestyle and fitness routine.
How does Physique 57 incorporate feedback from clients?	We value client feedback and regularly incorporate it into our class design and programming. This ensures that our offerings remain relevant and effective, meeting the evolving needs and preferences of our community.
What class levels does Physique 57 offer?	Physique 57 offers several class levels, including Foundations, Barre 57, SWEAT in 30, FIT, and Cardio Barre. Each level is designed to cater to different fitness abilities and goals, ensuring inclusivity for all participants.
How are the class levels structured at Physique 57?	The class levels are structured to progress from Foundations, which is beginnerfriendly, to more advanced classes like Barre 57 and FIT. This structure allows clients to build their skills and confidence gradually.
What is the difference between the Barre 57 and Foundations classes?	Barre 57 is a dynamic, highintensity class focusing on sculpting and toning, while Foundations offers a slowerpaced introduction to barre techniques, emphasizing alignment and technique.
Are the classes suitable for beginners?	Yes, all classes at Physique 57 are designed to be inclusive, with modifications available for beginners. The Foundations class is particularly recommended for those new to barre fitness.
What is the intensity level of the Barre 57 class?	The Barre 57 class is considered moderate to high intensity, incorporating high repetitions and isometric holds to challenge participants while ensuring safety and effectiveness.
How does the Foundations class differ from other classes?	The Foundations class focuses on a slower pace, allowing participants to master basic movements and proper alignment, which is essential for progressing to more intense classes.
What can I expect in a typical Barre 57 class?	In a typical Barre 57 class, you can expect a warmup, followed by a series of targeted exercises focusing on arms, thighs, glutes, and core, concluding with a cooldown. The class is set to energizing music to enhance motivation.
Is there a specific class format for advanced practitioners?	Yes, advanced practitioners can benefit from classes like Barre 57, FIT, and Amped Up!, which offer more challenging movements and higher intensity to push their limits.
How often should I attend classes at different levels for optimal results?	For optimal results, attending 24 classes per week across different levels is recommended. This frequency allows for muscle recovery while promoting consistent progress.
What is the duration of each class format offered?	Class durations vary, with most classes lasting between 30 to 60 minutes. This flexibility allows participants to choose classes that fit their schedules and fitness goals.
Are there any prerequisites for attending the FIT class?	While there are no strict prerequisites, it is recommended that participants have a basic understanding of fitness principles and some experience with strength training to fully benefit from the FIT class.
How does the SWEAT in 30 class differ from traditional barre classes?	SWEAT in 30 is a highintensity interval training (HIIT) class that focuses on cardio and bodyweight exercises, contrasting with traditional barre classes that emphasize strength and toning through isometric movements.
What is the focus of the Cardio Barre class?	The Cardio Barre class combines traditional barre exercises with cardiovascular training, incorporating dynamic movements to elevate heart rates while toning muscles.
Can I participate in multiple class formats in one day?	Yes, participants can attend multiple classes in one day. However, it is essential to listen to your body and ensure adequate recovery between sessions to prevent fatigue or injury.
What is the purpose of the Recovery class?	The Recovery class is designed to promote relaxation, flexibility, and muscle recovery through gentle stretching and restorative movements, helping to alleviate soreness and improve overall mobility.
How does the Mat 57 class format work?	Mat 57 focuses on Pilates-inspired movements that enhance core strength, flexibility, and posture. The class includes a series of floor exercises designed to tone and sculpt the body effectively.
Are there modifications available for different fitness levels in classes?	Yes, instructors provide modifications for all exercises to accommodate different fitness levels, ensuring that everyone can participate safely and effectively.
What type of equipment is used in the various class formats?	Classes typically use light weights, resistance bands, and mats. Participants are encouraged to bring their own mats if preferred, but all necessary equipment is usually provided at the studio.
How do I know which class format is right for me?	Consider your fitness goals, current fitness level, and preferences. If you're new to fitness, starting with Barre 57 or powerCycle is recommended, while more experienced individuals may prefer FIT or Mat 57 for a challenge.
How does Physique 57 ensure class variety?	Physique 57 regularly updates class formats and incorporates new exercises to keep workouts fresh and engaging. Instructors also vary routines within classes to prevent plateaus and maintain participant interest.
Can I switch between class levels as I progress?	Yes, participants are encouraged to switch between class levels as they progress in their fitness journey. This flexibility allows for continuous growth and adaptation to changing fitness goals.
What is the class size for each format?	Class sizes vary, but most classes are designed to accommodate 1020 participants to ensure personalized attention from instructors while maintaining a supportive group environment.
Are there any special classes or formats offered seasonally?	Yes, Physique 57 occasionally offers seasonal classes or special events that focus on specific themes or fitness goals, providing variety and excitement throughout the year.
How does the class schedule accommodate different lifestyles?	Physique 57 offers a variety of class times throughout the day, including early morning, lunchtime, and evening sessions, to accommodate different schedules and lifestyles.
What is the maximum class size for each format?	The maximum class size typically ranges from 15 to 25 participants, depending on the format, to ensure a quality experience with adequate instructor attention.
How do I sign up for different class formats?	Participants can sign up for classes through the Physique 57 app or website. It is recommended to book in advance, especially for popular classes, to secure a spot.
Are there any class formats that focus specifically on strength training?	Yes, classes like Strength Lab! and FIT incorporate strength training elements, focusing on building muscle and enhancing overall strength through targeted exercises.
How does Physique 57 incorporate feedback into class formats?	Client feedback is highly valued at Physique 57 and is regularly used to refine and improve class formats, ensuring they meet the needs and preferences of participants.
What’s the difference between Mat 57 and Cardio Barre?	Mat 57 focuses on Pilates-inspired movements to enhance core strength and flexibility, while Cardio Barre combines traditional barre exercises with high-intensity cardio to boost endurance and calorie burn.
How does Barre 57 differ from Foundations?	Barre 57 is a dynamic, high-intensity class designed for those with some experience, while Foundations is a slower-paced class that emphasizes basic movements and proper technique for beginners.
What sets HIIT apart from Amped Up?	HIIT (High-Intensity Interval Training) focuses on short bursts of intense activity followed by rest, while Amped Up incorporates fast-paced barre movements with a focus on endurance and muscle engagement.
How is Cardio Barre different from HIIT?	Cardio Barre combines barre exercises with cardiovascular training to elevate heart rate, while HIIT alternates between intense cardio and strength exercises, maximizing calorie burn and improving overall fitness.
What distinguishes Recovery from other formats?	Recovery classes focus on stretching, relaxation, and muscle recovery, contrasting with more intense formats like HIIT or Cardio Barre, which emphasize strength and endurance.
How does Foundations compare to Mat 57?	Foundations is designed for beginners, focusing on basic movements and alignment, while Mat 57 is more advanced, incorporating Pilates techniques to strengthen and tone the core.
What sets Cardio Barre apart from Cardio Barre Plus?	Cardio Barre Plus includes additional strength training elements and higher intensity intervals compared to the standard Cardio Barre, making it a more challenging workout for those looking to push their limits.
How does Fit differ from HIIT?	Fit combines strength-based interval training with core conditioning, while HIIT focuses on high-intensity bursts of cardio and strength exercises. Both formats are intense but target different aspects of fitness.
How is Cardio Barre Express different from regular Cardio Barre?	Cardio Barre Express is a condensed version of the traditional Cardio Barre class, focusing on the most effective movements in a shorter time frame, making it ideal for those with limited time.
What distinguishes HIIT from Fit?	HIIT focuses on high-intensity intervals for cardiovascular fitness, while Fit combines strength training with endurance work, targeting major muscle groups and core stability.
What is the difference between Spinning and Indoor Cycling?	"Spinning" is a trademarked brand created by Johnny G. "Indoor Cycling" is the general term for the fitness category used by other brands like Physique 57.
What kind of bikes are used at the studio?	The studio uses Schwinn indoor cycling bikes, which were co-developed with fitness industry leaders.
Why do I need to arrive early for my first class?	New clients (fewer than 10 classes) must arrive 15 minutes early to ensure they receive a proper bike fitting 10 minutes before the class starts.
What is the late entry policy for new clients?	New clients arriving less than 5 minutes before the scheduled start time will not be admitted to the room.
Is there a grace period for experienced riders?	Yes, clients who have attended more than 10 classes are permitted to enter up to 5 minutes after the class has started.
What happens if I miss the admission window?	You can be rescheduled to an alternate or parallel class within 24 hours of your original start time.
What is the cancellation policy?	Reservations must be cancelled at least 12 hours before the class start time to receive a credit back to your account.
Are class packages refundable?	No. Single classes, class packages, unlimited packages, promotions, workshops, and memberships are non-refundable.
Can I share my class package with a friend?	No. Unlimited packages and class packages cannot be shared among different clients.
Do I need special shoes for PowerCycle?	Yes, the bikes require cycling shoes. The studio handles shoe disbursement as part of the standard operating procedures.
How is the bike seat height determined?	The "Hip Bone" method is the primary standard; the saddle should be level with the rider's hip bone when standing next to the bike.
How should the handlebars be positioned?	For beginners, handlebars should be slightly higher than the saddle to reduce back strain. Experienced riders may prefer them level with the saddle.
What is the "Fore/Aft" adjustment?	This adjusts the horizontal distance of the saddle. When the pedals are level (3 o'clock and 9 o'clock), the front knee should be directly over the center of the pedal.
How do I know if my seat is too high?	If your hips rock back and forth or your toes point down at the bottom of the stroke, your seat is likely too high.
How do I know if my seat is too low?	If you feel discomfort in the front of the knee or find it difficult to pedal smoothly at high speeds, your seat is likely too low.
What is the "Knee Over Pedal Spindle" (KOPS) rule?	This is a check for the Fore/Aft position where a plumb line dropped from the bony part of the knee should fall through the center of the pedal.
Are there safety warnings for bike adjustments?	Yes. Never adjust the seat or handlebars while on the bike. Ensure all pop-pins are fully engaged and tightened before mounting.
What should I do after my class ends?	Clients should follow post-class procedures, which include wiping down the bike and returning borrowed equipment or shoes according to housekeeping guidelines.
What happens if I cancel a class less than 12 hours in advance?	If cancelled late or if you no-show, the client will be charged for that class or workshop.
Who developed the Schwinn certification used by the studio?	Fitness leader Jay Blahnik, who later moved on to help develop the Apple Watch and Apple Fitness+.
Can I adjust my own bike?	While clients learn to adjust their bikes, instructors provide a comprehensive guide and reference sheets to ensure best practices for safety and efficiency.
Is PowerCycle just for professional athletes?	No. While it originated as a way for pro cyclists to train safely, it is now a worldwide fitness program suitable for various fitness levels.
What is the "Welcome Message" protocol?	Instructors are required to welcome every client, introduce themselves, and ensure new clients are identified for setup assistance.
How is shoe disbursement handled?	It is a standard operational procedure where staff ensure clients receive the correct size and type of cycling shoes upon arrival.
Are there specific housekeeping rules for the studio?	Yes, the SOP includes detailed housekeeping guidelines to maintain cleanliness and equipment longevity between sessions.`;

        const faqEntries = faqDataset
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const [question, ...answerParts] = line.split('\t');
                return {
                    question: question?.trim(),
                    answer: answerParts.join('\t').trim()
                };
            })
            .filter((item) => item.question && item.answer);

        const faqAnswerOverrides = {
            'Where are Physique 57 studios located?': `
                <p>Physique 57 India studios are located at the following addresses:</p>
                <ol>
                    <li>
                        <strong>Kemps Corner, Mumbai</strong><br>
                        Kwality House, August Kranti Rd, below Kemps Corner, Grant Road, Mumbai, Maharashtra 400036<br>
                        <a href="https://www.google.com/maps/place/Kwality+House,+August+Kranti+Rd,+below+Kemps+Corner,+Kemps+Corner,+Grant+Road,+Mumbai,+Maharashtra+400036" target="_blank" rel="noopener noreferrer">Open in Google Maps</a><br>
                        Phone: 097696 65757
                    </li>
                    <li>
                        <strong>Bandra West, Mumbai</strong><br>
                        203, Supreme Headquarters, Junction of 14th &amp; 33rd Rd, opposite Monkey Bar, Bandra West, Mumbai, Maharashtra 400050<br>
                        <a href="https://www.google.com/maps/place/203,+Supreme+Headquarters,+Junction+of+14th,+%26+33rd+Rd,+opposite+Monkey+Bar,+Bandra+West,+Mumbai,+Maharashtra+400050" target="_blank" rel="noopener noreferrer">Open in Google Maps</a><br>
                        Phone: 097696 65757
                    </li>
                    <li>
                        <strong>Bengaluru</strong><br>
                        1st Floor, Kenkere House, Vittal Mallya Rd, above Raymonds, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560001<br>
                        <a href="https://www.google.com/maps/place/1st+Floor,+Kenkere+House,+Vittal+Mallya+Rd,+above+Raymonds,+Shanthala+Nagar,+Ashok+Nagar,+Bengaluru,+Karnataka+560001" target="_blank" rel="noopener noreferrer">Open in Google Maps</a><br>
                        Phone: 070220 43667
                    </li>
                </ol>
            `,
            'What amenities do Physique 57 studios offer?': `
                <p>Physique 57 India studios offer a variety of amenities to enhance your experience, including:</p>
                <ul>
                    <li><strong>Locker rooms:</strong> Secure storage for your belongings.</li>
                    <li><strong>Showers:</strong> Clean and private facilities for a post-workout refresh.</li>
                    <li><strong>Towel service:</strong> Complimentary towels for your convenience.</li>
                    <li><strong>Boutique:</strong> A curated selection of fitness apparel and accessories.</li>
                </ul>
            `,
            'Are Physique 57 studios clean and wellmaintained?': `
                <p>Yes, Physique 57 India studios are committed to maintaining a clean and hygienic environment.</p>
                <ul>
                    <li><strong>Regular cleaning:</strong> Studios are cleaned and disinfected frequently.</li>
                    <li><strong>Attention to detail:</strong> Staff members are trained to uphold high cleanliness standards throughout the facility.</li>
                </ul>
            `,
            'Can I store my belongings at Physique 57 studios?': `
                <p>Yes, Physique 57 India studios provide storage options for clients, including:</p>
                <ul>
                    <li><strong>Lockers:</strong> Secure storage for personal items during class.</li>
                    <li><strong>Cubbies:</strong> Available for smaller belongings.</li>
                </ul>
                <p>Please note that Physique 57 India is not responsible for lost or stolen items.</p>
            `,
            'Are Physique 57 studios accessible for people with disabilities?': `
                <p>Yes, Physique 57 India studios are designed to be accessible for individuals with disabilities.</p>
                <ul>
                    <li><strong>Wheelchair access:</strong> Facilities are equipped to accommodate wheelchair users.</li>
                    <li><strong>Supportive environment:</strong> Staff are trained to assist clients with special needs.</li>
                </ul>
            `,
            'Can I bring a guest to Physique 57 studios?': `
                <p>Yes, you can bring a guest to Physique 57 India studios. Guests must:</p>
                <ul>
                    <li><strong>Sign a waiver</strong> before participating.</li>
                    <li><strong>Provide identification</strong> for verification.</li>
                </ul>
            `,
            'Do Physique 57 studios offer childcare services?': `<p>No. Physique 57 India studios do not offer childcare services, and the studio environment is designed for adult clients.</p>`,
            'Can I purchase food and drinks at Physique 57 studios?': `
                <p>Yes, Physique 57 India studios offer a selection of healthy snacks and beverages for purchase.</p>
                <ul>
                    <li><strong>Healthy options:</strong> Nutritious snacks and drinks that support your fitness journey.</li>
                </ul>
            `,
            'Do Physique 57 studios offer showers and towel service?': `
                <p>Yes, Physique 57 India studios provide both showers and towel service for clients.</p>
                <ul>
                    <li><strong>Convenience:</strong> Fresh towels are available before and after class.</li>
                    <li><strong>Clean facilities:</strong> Showers are maintained to ensure a pleasant experience.</li>
                </ul>
            `
        };

        function normalizeFaqAnswer(answer) {
            return answer
                .replace(/barrebased/gi, 'barre-based')
                .replace(/lowimpact/gi, 'low-impact')
                .replace(/postworkout/gi, 'post-workout')
                .replace(/wellmaintained/gi, 'well-maintained')
                .replace(/AdultFocused/gi, 'Adult-focused')
                .replace(/GoalSetting/gi, 'Goal-setting')
                .replace(/ResearchBacked/gi, 'Research-backed')
                .replace(/highintensity/gi, 'high-intensity')
                .replace(/FullBody/gi, 'Full-body')
                .replace(/fullBody/gi, 'full-body')
                .replace(/rhythmdriven/gi, 'rhythm-driven')
                .replace(/rhythmbased/gi, 'rhythm-based')
                .replace(/musicdriven/gi, 'music-driven')
                .replace(/stateoftheart/gi, 'state-of-the-art')
                .replace(/sciencebased/gi, 'science-based')
                .replace(/longterm/gi, 'long-term')
                .replace(/wellbeing/gi, 'well-being')
                .replace(/wellequipped/gi, 'well-equipped')
                .replace(/beginnerfriendly/gi, 'beginner-friendly')
                .replace(/slowerpaced/gi, 'slower-paced')
                .replace(/30minute/gi, '30-minute')
                .replace(/45minute/gi, '45-minute')
                .replace(/tshirt/gi, 't-shirt')
                .replace(/hiphop/gi, 'hip-hop')
                .replace(/crosstraining/gi, 'cross-training')
                .replace(/crosstrain/gi, 'cross-train')
                .replace(/1020 participants/gi, '10-20 participants')
                .replace(/24 classes per week/gi, '2-4 classes per week')
                .replace(/Vallet/gi, 'Valet')
                .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        }

        const faqLookup = new Map(
            faqEntries.map(({ question, answer }) => {
                const htmlAnswer = faqAnswerOverrides[question] || `<p>${normalizeFaqAnswer(answer)}</p>`;
                return [question, htmlAnswer];
            })
        );

        const buildFaqItems = (questions) => questions
            .map((question) => ({
                question,
                answer: faqLookup.get(question)
            }))
            .filter((item) => item.answer);

        const previewQuestions = [
            'What is Physique 57?',
            'What are the benefits of Physique 57?',
            'Is Physique 57 suitable for all fitness levels?',
            'Can men take Physique 57 classes?',
            'Is Physique 57 safe during or after pregnancy?',
            'What is the typical class size at Physique 57?',
            'How often should I take Physique 57 classes to see results?',
            'What is the Physique 57 method?',
            'What is powerCycle?',
            'What is the cancellation policy?'
        ];

        const preparationFaqs = buildFaqItems([
            'What is Physique 57?',
            'What are the benefits of Physique 57?',
            'Is Physique 57 suitable for all fitness levels?',
            'Can men take Physique 57 classes?',
            'Is Physique 57 safe during or after pregnancy?',
            'What is the typical class size at Physique 57?',
            'How often should I take Physique 57 classes to see results?',
            'Can I crosstrain with Physique 57?',
            'What is the Physique 57 method?'
        ]);

        const bookingFaqs = buildFaqItems([
            'What is the cost of Physique 57 classes?',
            'Can I purchase Physique 57 classes online?',
            'Where are Physique 57 studios located?',
            'What amenities do Physique 57 studios offer?',
            'Are Physique 57 studios clean and wellmaintained?',
            'Do Physique 57 studios offer parking?',
            'Can I store my belongings at Physique 57 studios?',
            'Are Physique 57 studios accessible for people with disabilities?',
            'Can I bring a guest to Physique 57 studios?',
            'Do Physique 57 studios offer childcare services?',
            'Can I purchase food and drinks at Physique 57 studios?',
            'Do Physique 57 studios offer showers and towel service?'
        ]);

        const generalFaqs = buildFaqItems([
            'What is the history of Physique 57?',
            'What is the science behind Physique 57?',
            'How does Physique 57 compare to other fitness methods?',
            'What is the role of the ballet barre in Physique 57?',
            'How does Physique 57 incorporate stretching?',
            'What is the significance of interval overload in Physique 57?',
            'How does Physique 57 incorporate cardio?',
            'What is the role of the instructor in Physique 57?',
            'How does Physique 57 support client goals and progress?',
            'How does Physique 57 differ from traditional gym workouts?',
            'Can I combine Physique 57 with other fitness routines?',
            'How does Physique 57 support muscle building compared to other workouts?',
            'How does the community aspect of Physique 57 compare to other gyms?',
            'How does Physique 57 address individual fitness levels?',
            'What is the instructor training process at Physique 57?',
            'How does Physique 57 promote longterm fitness success?',
            'How does Physique 57 incorporate feedback from clients?'
        ]);

        const methodFaqs = buildFaqItems([
            'What is powerCycle?',
            'How long are the powerCycle classes?',
            'Do I need special shoes for powerCycle?',
            'How do I track my progress in powerCycle?',
            'Can beginners join powerCycle classes?',
            'What should I wear to a powerCycle class?',
            'How often should I attend powerCycle classes for results?',
            'What is the cancellation policy for powerCycle classes?',
            'What is the bike fit process for new clients?',
            'What if I have injuries or specific fitness concerns?',
            'What are the health benefits of powerCycle?',
            'How does powerCycle differ from traditional spinning classes?',
            'Can powerCycle help with weight loss?',
            'What is the unique selling proposition (USP) of powerCycle?',
            'How does powerCycle improve mental health?',
            'What kind of music is played during powerCycle classes?',
            'How does powerCycle support joint health?',
            'What can I expect in a typical powerCycle class?'
        ]);

        const membershipFaqs = buildFaqItems([
            'What class levels does Physique 57 offer?',
            'How are the class levels structured at Physique 57?',
            'What is the difference between the Barre 57 and Foundations classes?',
            'Are the classes suitable for beginners?',
            'What is the intensity level of the Barre 57 class?',
            'How does the Foundations class differ from other classes?',
            'What can I expect in a typical Barre 57 class?',
            'Is there a specific class format for advanced practitioners?',
            'How often should I attend classes at different levels for optimal results?',
            'What is the duration of each class format offered?',
            'Are there any prerequisites for attending the FIT class?',
            'How does the SWEAT in 30 class differ from traditional barre classes?',
            'What is the focus of the Cardio Barre class?',
            'Can I participate in multiple class formats in one day?',
            'What is the purpose of the Recovery class?',
            'How does the Mat 57 class format work?',
            'Are there modifications available for different fitness levels in classes?',
            'What type of equipment is used in the various class formats?',
            'How do I know which class format is right for me?',
            'How does Physique 57 ensure class variety?',
            'Can I switch between class levels as I progress?',
            'What is the class size for each format?',
            'Are there any special classes or formats offered seasonally?',
            'How does the class schedule accommodate different lifestyles?',
            'What is the maximum class size for each format?',
            'How do I sign up for different class formats?',
            'Are there any class formats that focus specifically on strength training?',
            'How does Physique 57 incorporate feedback into class formats?'
        ]);

        const policiesFaqs = buildFaqItems([
            'What’s the difference between Mat 57 and Cardio Barre?',
            'How does Barre 57 differ from Foundations?',
            'What sets HIIT apart from Amped Up?',
            'How is Cardio Barre different from HIIT?',
            'What distinguishes Recovery from other formats?',
            'How does Foundations compare to Mat 57?',
            'What sets Cardio Barre apart from Cardio Barre Plus?',
            'How does Fit differ from HIIT?',
            'How is Cardio Barre Express different from regular Cardio Barre?',
            'What distinguishes HIIT from Fit?'
        ]);

        const technicalFaqs = buildFaqItems([
            'What is the difference between Spinning and Indoor Cycling?',
            'What kind of bikes are used at the studio?',
            'Why do I need to arrive early for my first class?',
            'What is the late entry policy for new clients?',
            'Is there a grace period for experienced riders?',
            'What happens if I miss the admission window?',
            'What is the cancellation policy?',
            'Are class packages refundable?',
            'Can I share my class package with a friend?',
            'Do I need special shoes for PowerCycle?',
            'How is the bike seat height determined?',
            'How should the handlebars be positioned?',
            'What is the "Fore/Aft" adjustment?',
            'How do I know if my seat is too high?',
            'How do I know if my seat is too low?',
            'What is the "Knee Over Pedal Spindle" (KOPS) rule?',
            'Are there safety warnings for bike adjustments?',
            'What should I do after my class ends?',
            'What happens if I cancel a class less than 12 hours in advance?',
            'Who developed the Schwinn certification used by the studio?',
            'Can I adjust my own bike?',
            'Is PowerCycle just for professional athletes?',
            'What is the "Welcome Message" protocol?',
            'How is shoe disbursement handled?',
            'Are there specific housekeeping rules for the studio?'
        ]);

        const previewFaqs = buildFaqItems(previewQuestions);

        faqList.innerHTML = renderFaqCollection(previewFaqs, 0);
        setupFaqAccordion(faqList);

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
            detailedPoliciesSection.innerHTML = renderFaqCollection(policiesFaqs, 0);
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

        const heroOption = filteredGroups[0]?.[1]?.[0] || null;

        if (formatModalImage) {
            formatModalImage.src = heroOption?.image || 'https://i.postimg.cc/GtJNPK7P/hp-Img-1774213193.png';
            formatModalImage.alt = heroOption?.imageAlt || heroOption?.title || 'Physique 57 class format';
        }

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
                            <div class="format-meta-tabs" role="list" aria-label="${option.title} quick details">
                                <div class="format-meta-tab" role="listitem">
                                    <span class="format-meta-label">Intensity</span>
                                    <strong class="format-meta-value">${option.intensity}</strong>
                                </div>
                                <div class="format-meta-tab" role="listitem">
                                    <span class="format-meta-label">Best for</span>
                                    <strong class="format-meta-value">${option.bestFor}</strong>
                                </div>
                                <div class="format-meta-tab" role="listitem">
                                    <span class="format-meta-label">Length</span>
                                    <strong class="format-meta-value">${option.duration || 'Varies'}</strong>
                                </div>
                                <div class="format-meta-tab" role="listitem">
                                    <span class="format-meta-label">Style</span>
                                    <strong class="format-meta-value">${option.trainingStyle || 'Studio format'}</strong>
                                </div>
                            </div>
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
        // Determine which options to show based on selected center
        let options = [];
        let optionsCenter;
        
        if (!center || center === 'Supreme Headquarters, Bandra') {
            // If no center selected or Supreme selected, show only PowerCycle from Supreme
            options = content.classOptionsByStudio['Supreme Headquarters, Bandra'] || [];
            optionsCenter = 'Supreme Headquarters, Bandra';
        } else if (center === 'Kwality House, Kemps Corner') {
            // If Kwality House selected, show both options
            options = content.classOptionsByStudio['Kwality House, Kemps Corner'] || [];
            optionsCenter = 'Kwality House, Kemps Corner';
        } else {
            // Fallback for any other center
            options = content.classOptionsByStudio[center] || [];
            optionsCenter = center;
        }

        classOptionsSection.hidden = false;
        renderHeroSignals(true);
        renderFormatModal(center || optionsCenter);
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
        classOptionGrid.setAttribute('data-center', center || optionsCenter);

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

        // Apply center filter if a center is already selected
        if (center) {
            filterClassOptionsByCenter(center);
        }

        // Ensure function updates properly
        setTimeout(updateSelectedClassState, 50);
    }

    function filterClassOptionsByCenter(center) {
        // Re-render the options based on the selected center
        // This ensures the correct options are shown for each studio
        renderClassOptions(center);
        
        // Clear any previously selected option since the available options may have changed
        const selectedInput = classOptionGrid.querySelector('input[name="type"]:checked');
        if (selectedInput) {
            const optionValue = selectedInput.value;
            const isOptionAvailable = classOptionGrid.querySelector(`input[name="type"][value="${optionValue}"]`);
            
            if (!isOptionAvailable) {
                // If the previously selected option is no longer available, clear the selection
                updateSelectedClassState();
            }
        }
    }

    function getFieldErrorConfig(fieldName) {
        const configs = {
            firstName: {
                field: () => document.getElementById('firstName'),
                container: () => document.getElementById('firstName')?.closest('.field-group')
            },
            lastName: {
                field: () => document.getElementById('lastName'),
                container: () => document.getElementById('lastName')?.closest('.field-group')
            },
            email: {
                field: () => document.getElementById('email'),
                container: () => document.getElementById('email')?.closest('.field-group')
            },
            phoneNumber: {
                field: () => document.getElementById('phoneNumber'),
                container: () => document.getElementById('phoneNumber')?.closest('.field-group')
            },
            center: {
                field: () => document.getElementById('center'),
                container: () => document.getElementById('center')?.closest('.field-group')
            },
            type: {
                field: () => classOptionGrid.querySelector('input[name="type"]'),
                container: () => classOptionsSection
            },
            stage: {
                field: () => form.querySelector('input[name="stage"]'),
                container: () => paymentStageFieldset
            },
            waiverAccepted: {
                field: () => document.getElementById('waiverAccepted'),
                container: () => form.querySelector('.consent-card')
            }
        };

        return configs[fieldName] || null;
    }

    function ensureFieldErrorElement(fieldName) {
        const config = getFieldErrorConfig(fieldName);
        const container = config?.container?.();

        if (!container) {
            return null;
        }

        let errorElement = container.querySelector(`[data-field-error="${fieldName}"]`);
        if (!errorElement) {
            errorElement = document.createElement('p');
            errorElement.className = 'field-error-message';
            errorElement.dataset.fieldError = fieldName;
            errorElement.id = `${fieldName}-error`;
            errorElement.hidden = true;
            container.appendChild(errorElement);
        }

        return errorElement;
    }

    function setFieldError(fieldName, message) {
        const config = getFieldErrorConfig(fieldName);
        const field = config?.field?.();
        const container = config?.container?.();
        const errorElement = ensureFieldErrorElement(fieldName);

        if (!container || !errorElement) {
            return;
        }

        container.classList.add('has-error');
        errorElement.hidden = false;
        errorElement.textContent = message;

        if (field) {
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', errorElement.id);
        }
    }

    function clearFieldError(fieldName) {
        const config = getFieldErrorConfig(fieldName);
        const field = config?.field?.();
        const container = config?.container?.();
        const errorElement = container?.querySelector(`[data-field-error="${fieldName}"]`);

        container?.classList.remove('has-error');

        if (errorElement) {
            errorElement.hidden = true;
            errorElement.textContent = '';
        }

        if (field) {
            field.removeAttribute('aria-invalid');
            const describedBy = (field.getAttribute('aria-describedby') || '')
                .split(' ')
                .filter((value) => value && value !== `${fieldName}-error`)
                .join(' ');

            if (describedBy) {
                field.setAttribute('aria-describedby', describedBy);
            } else {
                field.removeAttribute('aria-describedby');
            }
        }
    }

    function clearFieldErrors() {
        ['firstName', 'lastName', 'email', 'phoneNumber', 'center', 'type', 'stage', 'waiverAccepted'].forEach(clearFieldError);

        if (phoneNumberInput) {
            phoneNumberInput.setCustomValidity('');
        }
    }

    function applyFieldErrors(fieldErrors = {}, { focusFirst = true } = {}) {
        const entries = Object.entries(fieldErrors).filter(([, message]) => Boolean(message));

        if (!entries.length) {
            return;
        }

        entries.forEach(([fieldName, message]) => {
            setFieldError(fieldName, message);
        });

        if (focusFirst) {
            const [firstFieldName] = entries[0];
            const firstField = getFieldErrorConfig(firstFieldName)?.field?.();
            firstField?.focus();
        }
    }

    function validateLeadForm() {
        const errors = {};
        const firstNameField = document.getElementById('firstName');
        const lastNameField = document.getElementById('lastName');
        const emailField = document.getElementById('email');
        const centerField = document.getElementById('center');
        const waiverField = document.getElementById('waiverAccepted');
        const selectedType = form.querySelector('input[name="type"]:checked');
        const selectedStage = form.querySelector('input[name="stage"]:checked');

        if (!firstNameField?.value.trim()) {
            errors.firstName = 'Enter your first name.';
        }

        if (!lastNameField?.value.trim()) {
            errors.lastName = 'Enter your last name.';
        }

        if (!emailField?.value.trim()) {
            errors.email = 'Enter your email address.';
        } else if (!emailField.checkValidity()) {
            errors.email = 'Enter a valid email address.';
        }

        if (!phoneNumberInput?.value.trim()) {
            errors.phoneNumber = 'Enter your phone number.';
        } else if (!validatePhoneField()) {
            errors.phoneNumber = 'Enter a valid phone number for the selected country.';
        }

        if (!centerField?.value) {
            errors.center = 'Select your preferred studio.';
        }

        if (!selectedType) {
            errors.type = 'Choose your first format.';
        }

        if (!selectedStage) {
            errors.stage = 'Choose a checkout stage.';
        }

        if (!waiverField?.checked) {
            errors.waiverAccepted = 'Accept the waiver and booking terms to continue.';
        }

        if (Object.keys(errors).length) {
            applyFieldErrors(errors);
            return false;
        }

        return true;
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

            return false;
        }

        if (showMessage) {
            clearFieldError('phoneNumber');
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

    async function submitLeadToApi(payload) {
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

    async function handleSubmit(event) {
        event.preventDefault();
        clearStatus();
        clearFieldErrors();

        if (!validateLeadForm()) {
            return;
        }

        if (!paymentConfirmed || !paymentSessionId) {
            showStatus(`Please complete the payment of ${getPaymentStageConfig().amountDisplay || tracking.appConfig?.paymentAmountDisplay || '₹1,838'} before submitting your request.`, 'error');
            return;
        }

        const payload = buildLeadPayloadFromForm({ skipValidation: true });
        if (!payload) {
            return;
        }

        payload.payment_session_id = paymentSessionId;

        await submitLeadToApi(payload);
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
        const whatsappUrl = `https://wa.me/919769076411?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    }

    applyTheme('light');

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

    // Render all class options on page load (always visible)
    renderClassOptions(null);

    centerSelect.addEventListener('change', () => {
        filterClassOptionsByCenter(centerSelect.value);
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

    form.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const fieldName = target.getAttribute('name');
        if (fieldName && getFieldErrorConfig(fieldName)) {
            clearFieldError(fieldName);
        }

        if (target === phoneNumberInput && phoneNumberInput.value.trim()) {
            validatePhoneField({ showMessage: true });
        }
    });

    form.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const fieldName = target.getAttribute('name');
        if (fieldName && getFieldErrorConfig(fieldName)) {
            clearFieldError(fieldName);
        }

        if (fieldName === 'type') {
            clearFieldError('type');
        }

        if (fieldName === 'stage') {
            clearFieldError('stage');
        }
    });

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

        // Cache the validated payload so auto-submit can use it on return from Stripe
        try {
            window.sessionStorage.setItem(paymentSubmitPayloadKey, JSON.stringify(payload));
        } catch (e) { /* storage may be unavailable */ }

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

                // Auto-submit using the payload cached before the Stripe redirect
                try {
                    const stored = window.sessionStorage.getItem(paymentSubmitPayloadKey);
                    const cachedPayload = stored ? JSON.parse(stored) : null;

                    if (cachedPayload) {
                        cachedPayload.payment_session_id = data.paymentSessionId || sessionId;
                        showStatus('Payment confirmed! Submitting your request now…', 'success');
                        await submitLeadToApi(cachedPayload);
                    } else {
                        // Fallback: try to build from the restored form state
                        const livePayload = buildLeadPayloadFromForm({ skipValidation: true });
                        if (livePayload) {
                            livePayload.payment_session_id = data.paymentSessionId || sessionId;
                            showStatus('Payment confirmed! Submitting your request now…', 'success');
                            await submitLeadToApi(livePayload);
                        } else {
                            showStatus('Payment confirmed! Please click "Reserve my trial" to complete your booking.', 'success');
                        }
                    }
                } catch (autoSubmitErr) {
                    console.error('Auto-submit failed:', autoSubmitErr);
                    showStatus('Payment confirmed! Please click "Reserve my trial" to complete your booking.', 'success');
                }

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
        payButton.addEventListener('click', function() {
            const paymentSuccess = true; // Replace with actual payment logic

            if (paymentSuccess) {
                form.submit();
            }
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
