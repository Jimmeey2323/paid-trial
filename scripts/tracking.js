(function initializeTrackingLayer() {
    const configScript = document.getElementById('app-config-data');
    const appConfig = (() => {
        try {
            return JSON.parse(configScript?.textContent || '{}');
        } catch (error) {
            console.warn('Could not parse app config JSON.', error);
            return window.APP_CONFIG || {};
        }
    })();

    const storageKey = 'trial_form_tracking_v2';
    const storageTimestampKey = 'trial_form_tracking_v2_timestamp';

    window.APP_CONFIG = appConfig;

    function loadExternalScript(src) {
        if (!src) {
            return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.src = src;
        document.head.appendChild(script);
    }

    function getApiBaseUrl() {
        if (appConfig.apiBaseUrl) {
            try {
                const configuredUrl = new URL(appConfig.apiBaseUrl, window.location.origin);
                const configuredHostname = configuredUrl.hostname.toLowerCase();
                const currentHostname = window.location.hostname.toLowerCase();
                const configuredIsLocalhost = ['localhost', '127.0.0.1', '::1'].includes(configuredHostname);
                const currentIsLocalhost = ['localhost', '127.0.0.1', '::1'].includes(currentHostname);

                if (configuredIsLocalhost && !currentIsLocalhost) {
                    return window.location.origin;
                }

                return configuredUrl.toString().replace(/\/$/, '');
            } catch (error) {
                console.warn('Invalid API base URL configured. Falling back to current origin.', error);
            }
        }

        return window.location.origin;
    }

    function buildApiUrl(path) {
        return new URL(path, `${getApiBaseUrl()}/`).toString();
    }

    function getCookieValue(name) {
        const escapedName = name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&');
        const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
        return cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
    }

    function buildFbcValue(fbclid) {
        if (!fbclid) {
            return '';
        }

        return `fb.1.${Date.now()}.${fbclid}`;
    }

    function createEventId(prefix = 'lead') {
        if (window.crypto?.randomUUID) {
            return `${prefix}_${window.crypto.randomUUID()}`;
        }

        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    function getTrackingParams() {
        const params = new URLSearchParams(window.location.search);
        const currentParams = {
            utm_source: params.get('utm_source') || '',
            utm_medium: params.get('utm_medium') || '',
            utm_campaign: params.get('utm_campaign') || '',
            utm_content: params.get('utm_content') || '',
            utm_id: params.get('utm_id') || '',
            utm_term: params.get('utm_term') || '',
            gclid: params.get('gclid') || '',
            fbclid: params.get('fbclid') || '',
            msclkid: params.get('msclkid') || '',
            ttclid: params.get('ttclid') || '',
            gbraid: params.get('gbraid') || '',
            wbraid: params.get('wbraid') || '',
            fbp: getCookieValue('_fbp') || '',
            fbc: getCookieValue('_fbc') || buildFbcValue(params.get('fbclid') || '')
        };

        const hasFreshParams = Object.values(currentParams).some((value) => value !== '');

        if (hasFreshParams) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(currentParams));
                localStorage.setItem(storageTimestampKey, new Date().toISOString());
            } catch (error) {
                console.warn('Could not store tracking params.', error);
            }

            return currentParams;
        }

        try {
            const storedParams = localStorage.getItem(storageKey);
            const storedTimestamp = localStorage.getItem(storageTimestampKey);

            if (!storedParams || !storedTimestamp) {
                return currentParams;
            }

            const daysSinceStored = (Date.now() - new Date(storedTimestamp).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceStored > 30) {
                localStorage.removeItem(storageKey);
                localStorage.removeItem(storageTimestampKey);
                return currentParams;
            }

            return JSON.parse(storedParams);
        } catch (error) {
            console.warn('Could not recover tracking params.', error);
            return currentParams;
        }
    }

    function initializePixels() {
        const gaMeasurementId = appConfig.gaMeasurementId || '';
        const googleAdsId = appConfig.googleAdsId || '';
        const metaPixelId = appConfig.metaPixelId || '';
        const snapPixelId = appConfig.snapPixelId || '';

        if (gaMeasurementId || googleAdsId) {
            loadExternalScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId || googleAdsId)}`);
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function gtagProxy() {
                window.dataLayer.push(arguments);
            };
            window.gtag('js', new Date());

            if (gaMeasurementId) {
                window.gtag('config', gaMeasurementId);
            }

            if (googleAdsId) {
                window.gtag('config', googleAdsId);
            }
        }

        window.googleAdsConfig = {
            id: googleAdsId,
            conversionLabel: appConfig.googleAdsConversionLabel || '',
            conversionValue: Number(appConfig.googleAdsConversionValue || 0) || 0,
            conversionCurrency: appConfig.googleAdsConversionCurrency || 'INR'
        };

        if (snapPixelId) {
            (function loadSnapPixel(windowObject, documentObject, scriptSource) {
                if (windowObject.snaptr) {
                    return;
                }

                const snapFunction = windowObject.snaptr = function snapProxy() {
                    snapFunction.handleRequest ? snapFunction.handleRequest.apply(snapFunction, arguments) : snapFunction.queue.push(arguments);
                };
                snapFunction.queue = [];
                const script = documentObject.createElement('script');
                script.async = true;
                script.src = scriptSource;
                const firstScript = documentObject.getElementsByTagName('script')[0];
                firstScript.parentNode.insertBefore(script, firstScript);
            })(window, document, 'https://sc-static.net/scevent.min.js');

            window.snaptr('init', snapPixelId);
            window.snaptr('track', 'PAGE_VIEW');
        }

        if (metaPixelId) {
            !function loadMetaPixel(windowObject, documentObject, tagName, scriptSource, pixelFunction, firstScript, scriptTag) {
                if (windowObject.fbq) {
                    return;
                }

                pixelFunction = windowObject.fbq = function fbqProxy() {
                    pixelFunction.callMethod ? pixelFunction.callMethod.apply(pixelFunction, arguments) : pixelFunction.queue.push(arguments);
                };
                if (!windowObject._fbq) {
                    windowObject._fbq = pixelFunction;
                }
                pixelFunction.push = pixelFunction;
                pixelFunction.loaded = true;
                pixelFunction.version = '2.0';
                pixelFunction.queue = [];
                scriptTag = documentObject.createElement(tagName);
                scriptTag.async = true;
                scriptTag.src = scriptSource;
                firstScript = documentObject.getElementsByTagName(tagName)[0];
                firstScript.parentNode.insertBefore(scriptTag, firstScript);
            }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

            window.fbq('init', metaPixelId);
            window.fbq('track', 'PageView');
        }
    }

    const utmParams = getTrackingParams();
    initializePixels();

    function getSubmissionTrackingPayload() {
        return {
            ...utmParams,
            landing_page: window.location.href,
            referrer: document.referrer || ''
        };
    }

    function trackLeadSubmission(leadPayload) {
        if (typeof window.fbq === 'function') {
            window.fbq('track', 'Lead', {
                content_name: utmParams.utm_campaign || 'trial_signup',
                content_category: utmParams.utm_source || 'direct'
            }, {
                eventID: leadPayload.event_id
            });
        }

        if (typeof window.gtag === 'function' && window.googleAdsConfig?.id && window.googleAdsConfig?.conversionLabel) {
            window.gtag('event', 'conversion', {
                send_to: `${window.googleAdsConfig.id}/${window.googleAdsConfig.conversionLabel}`,
                value: window.googleAdsConfig.conversionValue,
                currency: window.googleAdsConfig.conversionCurrency,
                transaction_id: leadPayload.event_id
            });
        }

        if (typeof window.snaptr === 'function') {
            window.snaptr('track', 'SIGN_UP', {
                sign_up_method: 'trial_form'
            });
        }
    }

    window.trialTracking = {
        appConfig,
        buildApiUrl,
        createEventId,
        getSubmissionTrackingPayload,
        getScheduleUrl() {
            return appConfig.scheduleUrl || appConfig.redirectUrl || window.location.href;
        },
        getRedirectUrl() {
            return appConfig.redirectUrl || window.location.href;
        },
        trackLeadSubmission
    };
})();
