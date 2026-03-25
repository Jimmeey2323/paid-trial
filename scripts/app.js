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
    const submitButton = document.getElementById('submit-button');
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

    const scheduleActionButtons = Array.from(document.querySelectorAll('[data-schedule-action]'));
    const scheduleStudioButtons = Array.from(document.querySelectorAll('[data-center-target]'));

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
        submitButton.disabled = isSubmitting;
        submitButton.textContent = isSubmitting ? 'Submitting your request...' : 'Reserve my trial';
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

        if (!form.reportValidity()) {
            return;
        }

        if (!validatePhoneField({ showMessage: true })) {
            phoneNumberInput?.reportValidity();
            phoneNumberInput?.focus();
            return;
        }

        const selectedType = form.querySelector('input[name="type"]:checked');
        if (!selectedType) {
            showStatus('Choose a class format before submitting.', 'error');
            classOptionGrid.querySelector('input[name="type"]')?.focus();
            return;
        }

        const formData = new FormData(form);
        formData.set('phoneNumber', getNormalizedPhoneNumber());
        if (phoneCountryInput?.value) {
            formData.set('phoneCountry', phoneCountryInput.value);
        }

        const payload = {
            ...Object.fromEntries(formData.entries()),
            event_id: tracking.createEventId(),
            ...tracking.getSubmissionTrackingPayload()
        };

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

    form.addEventListener('submit', handleSubmit);

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
