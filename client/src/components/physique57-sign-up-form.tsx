import { useEffect, useMemo, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { AnimatePresence, motion } from "framer-motion"
import { parsePhoneNumberFromString, type CountryCode as PhoneCountryCode } from "libphonenumber-js/min"
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Dumbbell,
  Heart,
  Info,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  Shield,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
  Users,
  X,
  Zap,
} from "lucide-react"

import {
  clientReviews,
  countryCodes,
  faqs,
  formats,
  heroImages,
  journeySteps,
  keyBenefits,
  membershipOffer,
  studios,
  type Benefit,
  waiverSections,
} from "@/data/physique57"
import { cn } from "@/lib/utils"
import {
  getSubmissionTrackingPayload,
  initializeTracking,
  loadPublicClientConfig,
  trackLeadSubmission,
  type PublicClientConfig,
} from "@/lib/tracking"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export interface Physique57FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  countryCode: string
  studio: string
  format: string
  acceptedTerms: boolean
}

interface Physique57SignUpFormProps {
  onSubmit?: (data: Physique57FormData) => Promise<void> | void
}

type FormErrorKey = keyof Physique57FormData | "payment" | "form"

const STORAGE_KEYS = {
  formState: "physique57-react-checkout-state-v1",
  submitPayload: "physique57-react-submit-payload-v1",
  paymentSession: "physique57-react-payment-session-v1",
  checkoutPending: "physique57-react-checkout-pending-v1",
  draftId: "physique57-react-draft-id-v1",
}

const DEFAULT_REDIRECT_URL = "https://momence.com/u/physique-57-india-fffoSp"

function createEventId() {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function buildWhatsAppMessage(formData: Physique57FormData, selectedFormat?: { backendValue?: string; subtitle: string } | null) {
  const lines = ["Hi! I'd like to book a trial class at Physique 57.", ""]

  const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(" ").trim()

  if (fullName) {
    lines.push(`Name: ${fullName}`)
  }
  if (formData.email) {
    lines.push(`Email: ${formData.email}`)
  }
  if (formData.phone) {
    lines.push(`Phone: ${normalizePhoneNumber(formData.countryCode, formData.phone) || formData.phone}`)
  }
  if (formData.studio) {
    lines.push(`Preferred Studio: ${formData.studio}`)
  }
  if (selectedFormat) {
    lines.push(`Preferred Format: ${selectedFormat.backendValue ?? selectedFormat.subtitle}`)
  }

  lines.push("", "Please help me complete my booking. Thank you!")
  return lines.join("\n")
}

function getCountryOption(countrySelection: string) {
  return (
    countryCodes.find((item) => item.country === countrySelection)
    ?? countryCodes.find((item) => item.code === countrySelection)
    ?? countryCodes.find((item) => item.country === "IN")
    ?? countryCodes[0]
  )
}

function normalizePhoneNumber(countrySelection: string, phone: string) {
  const normalizedPhone = phone.trim()
  if (!normalizedPhone) {
    return ""
  }

  const country = getCountryOption(countrySelection)
  const parsed = parsePhoneNumberFromString(normalizedPhone, country.country as PhoneCountryCode)
  return parsed?.isValid() ? parsed.number : ""
}

function getCountryIsoFromCode(countrySelection: string) {
  return getCountryOption(countrySelection)?.country || "IN"
}

function getPhoneValidationMessage(countrySelection: string, phone: string) {
  if (!phone.trim()) {
    return "Phone number is required"
  }

  const country = getCountryOption(countrySelection)
  const parsed = parsePhoneNumberFromString(phone.trim(), country.country as PhoneCountryCode)

  if (!parsed || !parsed.isValid()) {
    return `Enter a valid phone number for ${country.name}`
  }

  return null
}

const benefitIcons: Record<Benefit["icon"], LucideIcon> = {
  sparkles: Sparkles,
  trophy: Trophy,
  shield: Shield,
  heart: Heart,
  award: Award,
  users: Users,
  target: Target,
  zap: Zap,
}

const colorClasses = {
  blue: {
    border: "border-l-blue-600",
    iconBg: "from-blue-500 to-blue-700",
    hoverText: "group-hover:text-blue-600",
  },
  amber: {
    border: "border-l-amber-500",
    iconBg: "from-amber-400 to-amber-600",
    hoverText: "group-hover:text-amber-600",
  },
  emerald: {
    border: "border-l-emerald-500",
    iconBg: "from-emerald-400 to-emerald-600",
    hoverText: "group-hover:text-emerald-600",
  },
  rose: {
    border: "border-l-rose-500",
    iconBg: "from-rose-400 to-rose-600",
    hoverText: "group-hover:text-rose-600",
  },
  violet: {
    border: "border-l-violet-500",
    iconBg: "from-violet-400 to-violet-600",
    hoverText: "group-hover:text-violet-600",
  },
  cyan: {
    border: "border-l-cyan-500",
    iconBg: "from-cyan-400 to-cyan-600",
    hoverText: "group-hover:text-cyan-600",
  },
  orange: {
    border: "border-l-orange-500",
    iconBg: "from-orange-400 to-orange-600",
    hoverText: "group-hover:text-orange-600",
  },
  indigo: {
    border: "border-l-indigo-500",
    iconBg: "from-indigo-400 to-indigo-600",
    hoverText: "group-hover:text-indigo-600",
  },
} as const

const floatingDecor = [
  { top: "8%", left: "8%", icon: Dumbbell },
  { top: "18%", left: "82%", icon: Heart },
  { top: "32%", left: "14%", icon: Sparkles },
  { top: "44%", left: "88%", icon: Award },
  { top: "58%", left: "10%", icon: Dumbbell },
  { top: "68%", left: "78%", icon: Heart },
  { top: "82%", left: "18%", icon: Sparkles },
  { top: "88%", left: "86%", icon: Award },
]

const featuredFaqs = faqs.slice(0, 8)

const studioThemes = {
  "Supreme HQ, Bandra": {
    accentText: "text-rose-950",
    accentMuted: "text-rose-900/80",
    pillBorder: "border-rose-900/30",
    pillBg: "from-rose-950/10 to-rose-800/10",
    cardBorder: "border-rose-950/20 hover:border-rose-900/50",
    cardBg: "from-white/95 to-rose-50/55",
    iconBg: "from-rose-900 via-rose-800 to-red-700",
    itemIconBg: "from-rose-100 to-rose-200",
    itemIconText: "text-rose-900",
    buttonBg: "from-rose-900 to-red-700 hover:from-rose-950 hover:to-red-800",
    hoverTitle: "group-hover:text-rose-900",
    mapRing: "border-rose-200",
  },
  "Kwality House, Kemps Corner": {
    accentText: "text-emerald-950",
    accentMuted: "text-emerald-900/80",
    pillBorder: "border-emerald-900/30",
    pillBg: "from-emerald-950/10 to-emerald-800/10",
    cardBorder: "border-emerald-950/20 hover:border-emerald-900/50",
    cardBg: "from-white/95 to-emerald-50/55",
    iconBg: "from-emerald-950 via-emerald-800 to-green-700",
    itemIconBg: "from-emerald-100 to-emerald-200",
    itemIconText: "text-emerald-900",
    buttonBg: "from-emerald-900 to-green-700 hover:from-emerald-950 hover:to-green-800",
    hoverTitle: "group-hover:text-emerald-900",
    mapRing: "border-emerald-200",
  },
} as const

function ModalShell({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "w-full rounded-3xl border border-white/10 bg-card p-6 shadow-2xl",
              className
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function Physique57SignUpForm({ onSubmit }: Physique57SignUpFormProps) {
  const scheduleHostRef = useRef<HTMLDivElement | null>(null)
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const confettiInstanceRef = useRef<ReturnType<typeof confetti.create> | null>(null)
  const redirectTimeoutRef = useRef<number | null>(null)
  const partialSaveTimeoutRef = useRef<number | null>(null)
  const draftIdRef = useRef<string>(createEventId())
  const lastPartialPayloadRef = useRef("")
  const eventIdRef = useRef<string>(createEventId())
  const hasRestoredStateRef = useRef(false)
  const hasProcessedCheckoutReturnRef = useRef(false)
  const isAutoSubmittingRef = useRef(false)
  const [formData, setFormData] = useState<Physique57FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    countryCode: "IN",
    studio: "",
    format: "powercycle",
    acceptedTerms: false,
  })
  const [errors, setErrors] = useState<Partial<Record<FormErrorKey, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false)
  const [paymentSessionId, setPaymentSessionId] = useState("")
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [isPostPaymentProcessing, setIsPostPaymentProcessing] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }

    const params = new URLSearchParams(window.location.search)
    return params.get("payment") === "success" && Boolean(params.get("session_id"))
  })
  const [statusMessage, setStatusMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showFormatInfo, setShowFormatInfo] = useState<string | null>(null)
  const [showMembershipModal, setShowMembershipModal] = useState(false)
  const [showWaiverModal, setShowWaiverModal] = useState(false)
  const [showAllFaqsModal, setShowAllFaqsModal] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [currentHeroImage, setCurrentHeroImage] = useState(0)
  const [loadedHeroImages, setLoadedHeroImages] = useState<Set<number>>(new Set())
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [currentReview, setCurrentReview] = useState(0)
  const [publicConfig, setPublicConfig] = useState<PublicClientConfig | null>(null)

  const selectedStudio = useMemo(
    () => studios.find((studio) => studio.name === formData.studio),
    [formData.studio]
  )

  const selectedFormat = useMemo(
    () => formats.find((format) => format.id === formData.format),
    [formData.format]
  )

  const activeFormat = showFormatInfo ? formats.find((item) => item.id === showFormatInfo) ?? null : null

  const availableFormats = useMemo(() => {
    if (!selectedStudio) {
      return formats
    }

    return formats.filter((format) => selectedStudio.formats.includes(format.id))
  }, [selectedStudio])

  const isFormValid =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.email.trim() !== "" &&
    /\S+@\S+\.\S+/.test(formData.email) &&
    getPhoneValidationMessage(formData.countryCode, formData.phone) === null &&
    formData.studio !== "" &&
    formData.acceptedTerms

  const activePaymentStage = publicConfig?.defaultPaymentStage ?? "production"

  const primaryButtonLabel = paymentVerified && paymentSessionId
    ? "Complete booking"
    : publicConfig?.paymentButtonLabel || "Pay ₹1,838.00"

  const shouldHideFormForProcessing = isPostPaymentProcessing && !showSuccessModal
  const redirectUrl = publicConfig?.redirectUrl || DEFAULT_REDIRECT_URL

  function redirectToMomence() {
    if (typeof window === "undefined") {
      return
    }

    window.location.assign(redirectUrl)
  }

  function scheduleRedirectToMomence(delay = 1400) {
    if (typeof window === "undefined") {
      return
    }

    if (redirectTimeoutRef.current) {
      window.clearTimeout(redirectTimeoutRef.current)
    }

    redirectTimeoutRef.current = window.setTimeout(() => {
      redirectToMomence()
    }, delay)
  }

  function buildPartialLeadPayload(): Record<string, string> {
    const trackingPayload = getSubmissionTrackingPayload() as Record<string, string>

    return {
      draft_id: draftIdRef.current,
      event_id: eventIdRef.current,
      session_id: paymentSessionId,
      status: paymentVerified && paymentSessionId ? "payment_verified" : "in_progress",
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phoneNumber: formData.phone.trim(),
      phoneCountry: getCountryIsoFromCode(formData.countryCode),
      center: selectedStudio?.backendName ?? formData.studio,
      time: "Flexible / Needs Recommendation",
      type: selectedFormat?.backendValue ?? formData.format,
      waiverAccepted: formData.acceptedTerms ? "accepted" : "",
      ...trackingPayload,
    }
  }

  useEffect(() => {
    const imageNodes = heroImages.map((src, index) => {
      const image = new window.Image()

      image.onload = () => {
        setLoadedHeroImages((prev) => {
          if (prev.has(index)) {
            return prev
          }

          const next = new Set(prev)
          next.add(index)
          return next
        })
      }

      image.src = src
      return image
    })

    return () => {
      imageNodes.forEach((image) => {
        image.onload = null
      })
    }
  }, [])

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!loadedHeroImages.has(currentHeroImage)) {
      return
    }

    const heroInterval = window.setInterval(() => {
      setCurrentHeroImage((prev) => {
        const next = (prev + 1) % heroImages.length
        return loadedHeroImages.has(next) ? next : prev
      })
    }, 6500)

    return () => {
      window.clearInterval(heroInterval)
    }
  }, [currentHeroImage, loadedHeroImages])

  useEffect(() => {
    const reviewTimeout = window.setTimeout(() => {
      setCurrentReview((prev) => (prev + 1) % clientReviews.length)
    }, 3000)

    return () => {
      window.clearTimeout(reviewTimeout)
    }
  }, [currentReview])

  useEffect(() => {
    const style = document.createElement("style")
    style.innerHTML = `
      :root {
        --momenceColorBackground: #FBFBFB;
        --momenceColorPrimary: 0, 100, 250;
        --momenceColorBlack: 3, 1, 13;
      }
    `
    document.head.appendChild(style)

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const config = await loadPublicClientConfig()
        if (!cancelled) {
          setPublicConfig(config)
          initializeTracking(config)
        }
      } catch {
        // Tracking config is optional for the booking flow itself.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const storedState = window.sessionStorage.getItem(STORAGE_KEYS.formState)
      const storedSessionId = window.sessionStorage.getItem(STORAGE_KEYS.paymentSession)
      const storedDraftId = window.sessionStorage.getItem(STORAGE_KEYS.draftId)

      if (storedState) {
        const parsed = JSON.parse(storedState) as {
          formData?: Partial<Physique57FormData>
          eventId?: string
        }

        if (parsed.formData) {
          const restoredCountry = typeof parsed.formData.countryCode === "string"
            ? getCountryIsoFromCode(parsed.formData.countryCode)
            : undefined

          setFormData((prev) => ({
            ...prev,
            ...parsed.formData,
            ...(restoredCountry ? { countryCode: restoredCountry } : {}),
          }))
        }

        if (parsed.eventId) {
          eventIdRef.current = parsed.eventId
        }
      }

      if (storedSessionId) {
        setPaymentSessionId(storedSessionId)
      }

      if (storedDraftId) {
        draftIdRef.current = storedDraftId
      }
    } catch {
      // Ignore storage restoration failures.
    } finally {
      hasRestoredStateRef.current = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !hasRestoredStateRef.current) {
      return
    }

    try {
      window.sessionStorage.setItem(
        STORAGE_KEYS.formState,
        JSON.stringify({ formData, eventId: eventIdRef.current })
      )
      window.sessionStorage.setItem(STORAGE_KEYS.draftId, draftIdRef.current)

      if (paymentSessionId) {
        window.sessionStorage.setItem(STORAGE_KEYS.paymentSession, paymentSessionId)
      } else {
        window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
      }
    } catch {
      // Ignore persistence failures.
    }
  }, [formData, paymentSessionId])

  useEffect(() => {
    if (typeof window === "undefined" || !hasRestoredStateRef.current || showSuccessModal) {
      return
    }

    const partialPayload = buildPartialLeadPayload()
    const hasMeaningfulDraftData = Boolean(
      partialPayload.firstName ||
      partialPayload.lastName ||
      partialPayload.email ||
      partialPayload.phoneNumber ||
      partialPayload.center ||
      partialPayload.type ||
      partialPayload.waiverAccepted ||
      partialPayload.utm_source ||
      partialPayload.utm_medium ||
      partialPayload.utm_campaign ||
      partialPayload.gclid ||
      partialPayload.fbclid
    )

    if (!hasMeaningfulDraftData) {
      return
    }

    const payloadSignature = JSON.stringify(partialPayload)
    if (lastPartialPayloadRef.current === payloadSignature) {
      return
    }

    if (partialSaveTimeoutRef.current) {
      window.clearTimeout(partialSaveTimeoutRef.current)
    }

    partialSaveTimeoutRef.current = window.setTimeout(() => {
      void fetch("/api/partial-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payloadSignature,
      }).then((response) => {
        if (response.ok) {
          lastPartialPayloadRef.current = payloadSignature
        }
      }).catch(() => {
        // Ignore draft persistence issues; they should never block conversion.
      })
    }, 700)

    return () => {
      if (partialSaveTimeoutRef.current) {
        window.clearTimeout(partialSaveTimeoutRef.current)
      }
    }
  }, [formData, paymentSessionId, paymentVerified, selectedFormat, selectedStudio, showSuccessModal])

  useEffect(() => {
    if (!confettiCanvasRef.current) {
      return
    }

    confettiInstanceRef.current = confetti.create(confettiCanvasRef.current, {
      resize: true,
      useWorker: true,
    })

    return () => {
      confettiInstanceRef.current?.reset()
      confettiInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!showSchedule || !scheduleHostRef.current) {
      return
    }

    const host = scheduleHostRef.current
    host.innerHTML = ""

    const ribbonContainer = document.createElement("div")
    ribbonContainer.id = "ribbon-schedule"
    host.appendChild(ribbonContainer)

    const script = document.createElement("script")
    script.async = true
    script.type = "module"
    script.setAttribute("host_id", "13752")
    script.setAttribute("teacher_ids", "[]")
    script.setAttribute("location_ids", `[${selectedStudio?.scheduleLocationId ?? "9030"}]`)
    script.setAttribute("tag_ids", "[284832]")
    script.setAttribute("session_type", "class")
    script.setAttribute("hide_tags", "true")
    script.setAttribute("default_filter", "show-all")
    script.setAttribute("locale", "en")
    script.setAttribute("lock_timezone", "Asia/Kolkata")
    script.src = "https://momence.com/plugin/host-schedule/host-schedule.js"
    host.appendChild(script)

    return () => {
      host.innerHTML = ""
    }
  }, [selectedStudio, showSchedule])

  useEffect(() => {
    if (!availableFormats.some((format) => format.id === formData.format)) {
      setFormData((prev) => ({ ...prev, format: availableFormats[0]?.id ?? "powercycle" }))
    }
  }, [availableFormats, formData.format])

  useEffect(() => {
    if (typeof window === "undefined" || !hasRestoredStateRef.current || hasProcessedCheckoutReturnRef.current) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get("payment")
    const returnedSessionId = params.get("session_id")
    const hasPendingCheckout = window.sessionStorage.getItem(STORAGE_KEYS.checkoutPending) === "true"

    if (paymentStatus === "cancelled") {
      setIsPostPaymentProcessing(false)
      try {
        window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
        window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
      } catch {
        // Ignore storage cleanup failures.
      }

      setPaymentVerified(false)
      setPaymentSessionId("")
      setStatusMessage({ tone: "error", text: "Checkout was cancelled. You can try again whenever you're ready." })
      hasProcessedCheckoutReturnRef.current = true

      try {
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch {
        // Ignore history replacement failures.
      }

      return
    }

    if (!returnedSessionId || !hasPendingCheckout || paymentStatus !== "success") {
      setIsPostPaymentProcessing(false)
      return
    }

    setIsPostPaymentProcessing(true)
    hasProcessedCheckoutReturnRef.current = true

    void (async () => {
      try {
        setStatusMessage({ tone: "success", text: "Verifying your payment and finishing the booking..." })
        const response = await fetch(`/api/verify-payment?session_id=${encodeURIComponent(returnedSessionId)}`)
        const result = await response.json().catch(() => ({}))

        if (!response.ok || !result.paid) {
          setPaymentVerified(false)
          setPaymentSessionId("")
          setIsPostPaymentProcessing(false)
          if (response.status === 404) {
            try {
              window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
              window.sessionStorage.removeItem(STORAGE_KEYS.submitPayload)
              window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
            } catch {
              // Ignore storage cleanup failures.
            }
          }
          setStatusMessage({ tone: "error", text: result.error || "Payment could not be verified yet." })
          return
        }

        setPaymentVerified(true)
        setPaymentSessionId(result.paymentSessionId || returnedSessionId)
        try {
          window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
        } catch {
          // Ignore storage cleanup failures.
        }
        setStatusMessage({
          tone: result.fulfilled === false ? "success" : "success",
          text: result.fulfilled === false
            ? (result.fulfillmentError || "Payment confirmed. We’re completing your booking details now.")
            : "Payment confirmed. Finalising your booking now...",
        })

        const cachedPayloadRaw = window.sessionStorage.getItem(STORAGE_KEYS.submitPayload)
        const cachedPayload = cachedPayloadRaw ? JSON.parse(cachedPayloadRaw) : null

        if (cachedPayload && !isAutoSubmittingRef.current) {
          isAutoSubmittingRef.current = true
          await submitLeadToApi({
            ...cachedPayload,
            payment_session_id: result.paymentSessionId || returnedSessionId,
          })
        } else {
          setIsPostPaymentProcessing(false)
          setStatusMessage({ tone: "success", text: "Payment confirmed. You can complete your booking now." })
        }
      } catch {
        setPaymentVerified(false)
        setPaymentSessionId("")
        setIsPostPaymentProcessing(false)
        setStatusMessage({ tone: "error", text: "Unable to verify payment right now. Please try again." })
      } finally {
        try {
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch {
          // Ignore history replacement failures.
        }
      }
    })()
  }, [paymentSessionId])

  function handleInputChange<K extends keyof Physique57FormData>(field: K, value: Physique57FormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    if (errors.form || errors.payment) {
      setErrors((prev) => ({ ...prev, form: undefined, payment: undefined }))
    }
    if (statusMessage) {
      setStatusMessage(null)
    }
  }

  function validateForm() {
    const nextErrors: Partial<Record<FormErrorKey, string>> = {}

    if (!formData.firstName.trim()) nextErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) nextErrors.lastName = "Last name is required"
    if (!formData.email.trim()) nextErrors.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) nextErrors.email = "Enter a valid email"
    const phoneValidationMessage = getPhoneValidationMessage(formData.countryCode, formData.phone)
    if (phoneValidationMessage) nextErrors.phone = phoneValidationMessage
    if (!formData.studio) nextErrors.studio = "Please select a studio"
    if (!selectedFormat) nextErrors.format = "Please choose a valid format"
    if (!formData.acceptedTerms) nextErrors.acceptedTerms = "You must accept the terms"

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function buildLeadPayload() {
    const normalizedPhone = normalizePhoneNumber(formData.countryCode, formData.phone)
    const trackingPayload = getSubmissionTrackingPayload()

    return {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phoneNumber: normalizedPhone,
      phoneCountry: getCountryIsoFromCode(formData.countryCode),
      center: selectedStudio?.backendName ?? formData.studio,
      time: "Flexible / Needs Recommendation",
      type: selectedFormat?.backendValue ?? formData.format,
      waiverAccepted: "accepted",
      stage: activePaymentStage,
      event_id: eventIdRef.current,
      ...trackingPayload,
    }
  }

  async function submitLeadToApi(payload: Record<string, unknown>) {
    setIsSubmitting(true)
    setIsPostPaymentProcessing(true)
    setStatusMessage({ tone: "success", text: "Submitting your request and syncing the booking workflow..." })

    try {
      const response = await fetch("/api/submit-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.success) {
        if (result.stored) {
          try {
            window.sessionStorage.removeItem(STORAGE_KEYS.formState)
            window.sessionStorage.removeItem(STORAGE_KEYS.submitPayload)
            window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
            window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
            window.sessionStorage.removeItem(STORAGE_KEYS.draftId)
          } catch {
            // Ignore storage cleanup failures.
          }

          eventIdRef.current = createEventId()
          draftIdRef.current = createEventId()
          lastPartialPayloadRef.current = ""
          setPaymentVerified(false)
          setPaymentSessionId("")
          trackLeadSubmission(publicConfig, payload as { event_id?: string; utm_campaign?: string; utm_source?: string })
          await celebrateSuccess()

          if (onSubmit) {
            await onSubmit(formData)
          }

          setStatusMessage({
            tone: "success",
            text: result.error || "Your payment was verified and your details were saved. Our team will complete the booking follow-up shortly.",
          })
          setShowSuccessModal(true)
          setIsPostPaymentProcessing(false)
          scheduleRedirectToMomence()
          return
        }

        if (response.status === 400 && result.fieldErrors) {
          const fieldErrors = result.fieldErrors as Record<string, string>
          setErrors({
            firstName: fieldErrors.firstName,
            lastName: fieldErrors.lastName,
            email: fieldErrors.email,
            phone: fieldErrors.phoneNumber,
            studio: fieldErrors.center,
            format: fieldErrors.type,
            acceptedTerms: fieldErrors.waiverAccepted,
            payment: fieldErrors.payment,
            form: fieldErrors.form,
          })
        }

        setStatusMessage({ tone: "error", text: result.error || "The request could not be completed. Please try again." })
        return
      }

      trackLeadSubmission(publicConfig, payload as { event_id?: string; utm_campaign?: string; utm_source?: string })

      try {
        window.sessionStorage.removeItem(STORAGE_KEYS.formState)
        window.sessionStorage.removeItem(STORAGE_KEYS.submitPayload)
        window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
        window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
        window.sessionStorage.removeItem(STORAGE_KEYS.draftId)
      } catch {
        // Ignore storage cleanup failures.
      }

      draftIdRef.current = createEventId()
      lastPartialPayloadRef.current = ""

      await celebrateSuccess()

      if (onSubmit) {
        await onSubmit(formData)
      }

      setStatusMessage({ tone: "success", text: "Payment verified and booking completed successfully." })
      setShowSuccessModal(true)
      setIsPostPaymentProcessing(false)
      scheduleRedirectToMomence()
    } catch {
      setIsPostPaymentProcessing(false)
      setStatusMessage({ tone: "error", text: "We could not complete the request right now. Please try again in a moment." })
    } finally {
      setIsSubmitting(false)
      isAutoSubmittingRef.current = false
    }
  }

  async function createCheckoutSession(payload: Record<string, unknown>) {
    setIsCreatingCheckout(true)
    setStatusMessage({ tone: "success", text: "Starting secure checkout..." })

    try {
      window.sessionStorage.setItem(STORAGE_KEYS.submitPayload, JSON.stringify(payload))
      window.sessionStorage.setItem(STORAGE_KEYS.checkoutPending, "true")
      setIsPostPaymentProcessing(true)
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.url) {
        setIsPostPaymentProcessing(false)
        try {
          window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
        } catch {
          // Ignore storage cleanup failures.
        }

        if (response.status === 400 && result.fieldErrors) {
          const fieldErrors = result.fieldErrors as Record<string, string>
          setErrors({
            firstName: fieldErrors.firstName,
            lastName: fieldErrors.lastName,
            email: fieldErrors.email,
            phone: fieldErrors.phoneNumber,
            studio: fieldErrors.center,
            format: fieldErrors.type,
            acceptedTerms: fieldErrors.waiverAccepted,
            payment: fieldErrors.payment,
            form: fieldErrors.form,
          })
        }

        setStatusMessage({ tone: "error", text: result.error || "Unable to start checkout. Please try again." })
        return
      }

      window.location.assign(result.url)
    } catch {
      setIsPostPaymentProcessing(false)
      try {
        window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
      } catch {
        // Ignore storage cleanup failures.
      }
      setStatusMessage({ tone: "error", text: "Unable to start checkout right now. Please try again." })
    } finally {
      setIsCreatingCheckout(false)
    }
  }

  async function celebrateSuccess() {
    const shoot = confettiInstanceRef.current ?? confetti
    const bursts = [0, 180, 420, 720, 1080]

    for (const delay of bursts) {
      window.setTimeout(() => {
        shoot({
          particleCount: 90,
          startVelocity: 48,
          spread: 82,
          ticks: 250,
          gravity: 0.9,
          scalar: 1.05,
          origin: { x: 0, y: 0.78 },
          angle: 42,
          colors: ["#7f1d1d", "#be123c", "#1d4ed8", "#059669", "#f59e0b", "#ffffff"],
        })
        shoot({
          particleCount: 90,
          startVelocity: 48,
          spread: 82,
          ticks: 250,
          gravity: 0.9,
          scalar: 1.05,
          origin: { x: 1, y: 0.78 },
          angle: 138,
          colors: ["#7f1d1d", "#be123c", "#1d4ed8", "#059669", "#f59e0b", "#ffffff"],
        })
      }, delay)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusMessage(null)

    if (!validateForm()) {
      return
    }

    const payload = buildLeadPayload()

    if (!paymentVerified || !paymentSessionId) {
      await createCheckoutSession(payload)
      return
    }

    await submitLeadToApi({
      ...payload,
      payment_session_id: paymentSessionId,
    })
  }

  function handleOpenWhatsApp() {
    const message = buildWhatsAppMessage(formData, selectedFormat)
    const whatsappUrl = `https://wa.me/919769076411?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <canvas ref={confettiCanvasRef} className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floatingDecor.map(({ top, left, icon: Icon }, index) => (
          <motion.div
            key={index}
            className="absolute text-slate-200/20"
            initial={{ opacity: 0.2, scale: 0.9 }}
            animate={{ opacity: [0.15, 0.3, 0.15], y: [0, -16, 0], rotate: [0, 10, -8, 0] }}
            transition={{ duration: 12 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            style={{ top, left }}
          >
            <Icon className="h-14 w-14" />
          </motion.div>
        ))}
      </div>

        <div className="relative grid min-h-screen lg:grid-cols-[40%_60%]">
        <div
          className="relative hidden h-screen cursor-pointer overflow-hidden bg-black lg:block"
          onClick={redirectToMomence}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              redirectToMomence()
            }
          }}
          role="link"
          tabIndex={0}
          aria-label="Open Physique 57 schedule page"
        >
          <AnimatePresence mode="sync">
            <motion.div
              key={currentHeroImage}
              className="absolute inset-0 overflow-hidden bg-black"
              initial={{ opacity: 0, scale: 1.04, filter: "blur(6px)", rotate: -0.35 }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)", rotate: 0 }}
              exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)", rotate: 0.25 }}
              transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.img
                src={heroImages[currentHeroImage]}
                alt="Physique 57 studio"
                className="h-full w-full object-cover object-top"
                initial={{ scale: 1.12, x: 18, y: 8 }}
                animate={{ scale: 1.03, x: -8, y: -10 }}
                exit={{ scale: 1.08, x: -18, y: 6 }}
                transition={{ duration: 8.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-black/20" />
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_38%),radial-gradient(circle_at_80%_18%,rgba(59,130,246,0.18),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.34)_100%)]"
            animate={{ opacity: [0.8, 1, 0.82], scale: [1, 1.03, 1] }}
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-y-0 -left-1/3 w-2/3 bg-gradient-to-r from-white/0 via-white/12 to-white/0 mix-blend-screen"
            animate={{ x: ["-20%", "120%"] }}
            transition={{ duration: 7.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", repeatDelay: 1.2 }}
          />
          <div className="absolute inset-x-0 bottom-0 p-12 text-white">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-blue-200" />
              <span className="text-sm font-medium">Premium Fitness Experience</span>
            </div>
            <h1 className="mb-4 max-w-md bg-gradient-to-r from-white to-blue-100 bg-clip-text text-5xl font-bold text-transparent xl:text-6xl">
              Transform Your Body
            </h1>
            <p className="max-w-lg text-lg text-white/88 xl:text-xl">
              Join Physique 57 and experience expert-led workouts in boutique studios designed to make your first class feel polished and exciting.
            </p>
          </div>
        </div>

        <div className="relative min-h-screen bg-background/95 backdrop-blur-sm lg:h-screen lg:overflow-y-auto">
          <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10 xl:px-14 xl:pt-12">
              {shouldHideFormForProcessing ? (
                <div className="flex min-h-[78vh] items-center justify-center">
                  <div className="w-full max-w-2xl rounded-[32px] border border-slate-200/80 bg-white/85 px-8 py-16 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:px-12">
                    <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-gradient-to-br from-blue-900 to-blue-700 text-white shadow-lg">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                    <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-blue-900/70">Booking in progress</p>
                    <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">Confirming your payment and finalising your booking</h2>
                    <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                      Please stay on this page while we capture your successful payment, submit your details, and finish the studio booking workflow.
                    </p>
                    <div className="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-2xl border border-blue-900/10 bg-blue-50/80 px-4 py-3 text-left text-sm text-blue-900 shadow-sm">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                      <span>{statusMessage?.text || "Secure checkout completed. We’re submitting your form automatically."}</span>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_32px_100px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/40 backdrop-blur-xl sm:p-6 lg:p-8">
              <div className="mb-8">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/30 bg-gradient-to-r from-blue-900/20 to-slate-300/30 px-4 py-2 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-blue-900" />
                  <span className="text-sm font-semibold text-blue-900">Book Your First Class</span>
                </div>
                <h2 className="mb-2 text-3xl font-bold text-foreground">Get Started</h2>
                <p className="text-muted-foreground">Sign up for your first class at Physique 57.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
              <div className="relative space-y-6 rounded-2xl border border-slate-300/90 bg-white/55 p-5 pt-6 shadow-sm sm:p-6 sm:pt-7">
                <div className="absolute -top-3 left-4 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/15 to-slate-200/70 px-4 py-1.5 shadow-sm backdrop-blur-md">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-900">Personal details</span>
                  <span className="text-destructive">*</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-semibold">First name <span className="text-destructive">*</span></Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(event) => handleInputChange("firstName", event.target.value)}
                      className={cn(
                        "h-12 border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                        errors.firstName && "border-destructive"
                      )}
                    />
                    {errors.firstName ? <p className="text-sm text-destructive">{errors.firstName}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-semibold">Last name <span className="text-destructive">*</span></Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(event) => handleInputChange("lastName", event.target.value)}
                      className={cn(
                        "h-12 border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                        errors.lastName && "border-destructive"
                      )}
                    />
                    {errors.lastName ? <p className="text-sm text-destructive">{errors.lastName}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold">Email <span className="text-destructive">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleInputChange("email", event.target.value)}
                      className={cn(
                        "h-12 border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                        errors.email && "border-destructive"
                      )}
                    />
                    {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-semibold">Phone number <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-[56px_minmax(0,1fr)] items-stretch gap-2">
                      <Select value={formData.countryCode} onValueChange={(value) => handleInputChange("countryCode", value)}>
                        <SelectTrigger size="lg" className="h-12 w-[56px] min-w-[56px] shrink-0 justify-center border-slate-300/95 bg-white/70 px-2 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15">
                          <SelectValue placeholder="Code">
                            <span className="text-base leading-none">{getCountryOption(formData.countryCode)?.flag}</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="border-slate-300 bg-white/95">
                          {countryCodes.map((item, index) => (
                            <SelectItem key={`${item.code}-${item.country}-${index}`} value={item.country}>
                              <div className="flex items-center gap-2">
                                <span>{item.flag}</span>
                                <span className="font-medium">{item.code}</span>
                                <span className="text-xs text-muted-foreground">{item.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        placeholder="98765 43210"
                        value={formData.phone}
                        onChange={(event) => handleInputChange("phone", event.target.value)}
                        className={cn(
                          "h-12 flex-1 border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                          errors.phone && "border-destructive"
                        )}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Choose your country code, then enter your number.</p>
                    {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
                  </div>
                </div>
              </div>

              <div className="relative space-y-5 rounded-2xl border border-slate-300/90 bg-white/55 p-5 pt-6 shadow-sm sm:p-6 sm:pt-7">
                <div className="absolute -top-3 left-4 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/15 to-slate-200/70 px-4 py-1.5 shadow-sm backdrop-blur-md">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-900">Studio & format</span>
                  <span className="text-destructive">*</span>
                </div>
                <div className="space-y-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="studio" className="font-semibold">Preferred studio <span className="text-destructive">*</span></Label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Select value={formData.studio} onValueChange={(value) => handleInputChange("studio", value)}>
                        <SelectTrigger
                          size="lg"
                          className={cn(
                            "w-full border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                            errors.studio && "border-destructive"
                          )}
                        >
                          <SelectValue placeholder="Select a studio" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-300 bg-white/95">
                          {studios.map((studio) => (
                            <SelectItem key={studio.name} value={studio.name}>
                              <div>
                                <div className="font-medium">{studio.name}</div>
                                <div className="text-xs text-muted-foreground">{studio.location}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 w-full border-slate-300 text-slate-800 hover:border-slate-800 hover:bg-slate-100 sm:w-auto sm:min-w-[170px]"
                        onClick={() => setShowSchedule(true)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        View schedule
                      </Button>
                    </div>
                    {errors.studio ? <p className="text-sm text-destructive">{errors.studio}</p> : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-300/90 bg-white/60 p-4 pt-5 shadow-sm sm:p-5 sm:pt-6">
                    <Label className="block text-sm font-semibold text-slate-950">Select a preferred format</Label>
                    <p className="text-sm text-muted-foreground">Choose the format that feels right for your first visit.</p>
                    <div role="radiogroup" aria-label="Choose your first format" className="space-y-2.5">
                      {availableFormats.map((format) => (
                        <div
                          key={format.id}
                          className={cn(
                            "relative cursor-pointer rounded-xl border-2 p-3.5 transition-all backdrop-blur-sm sm:p-4",
                            formData.format === format.id
                              ? "border-blue-900 bg-gradient-to-br from-blue-900/10 to-slate-200/30 shadow-lg shadow-blue-900/10"
                              : "border-border/50 bg-white/60 hover:border-blue-900/30 hover:shadow-md"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              role="radio"
                              aria-checked={formData.format === format.id}
                              aria-label={`Select ${format.subtitle}`}
                              onClick={() => handleInputChange("format", format.id)}
                              className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-slate-400 text-blue-900 outline-none transition-[color,box-shadow,border-color] focus-visible:border-blue-900 focus-visible:ring-2 focus-visible:ring-blue-900/20"
                            >
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full bg-blue-900 transition-opacity",
                                  formData.format === format.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInputChange("format", format.id)}
                              className="flex flex-1 items-start gap-2.5 text-left"
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="text-2xl leading-none sm:text-[1.65rem]">{format.icon}</span>
                                <div className="flex-1">
                                  <div className="text-[15px] font-semibold leading-snug text-slate-950">{format.title}</div>
                                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-900">{format.subtitle}</div>
                                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">{format.description}</p>
                                </div>
                              </div>
                            </button>
                            <div className="flex shrink-0 flex-col items-end gap-2 self-start pl-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-full px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 sm:h-8 sm:px-3"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setShowFormatInfo(format.id)
                                }}
                              >
                                Know more
                              </Button>
                              {formData.format === format.id ? (
                                <div className="flex items-center gap-1 rounded-full border border-blue-900/15 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-900 shadow-sm">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Selected</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.format ? <p className="text-sm text-destructive">{errors.format}</p> : null}
                  </div>
                </div>
              </div>

              <div className="relative space-y-4 rounded-2xl border border-slate-300/90 bg-white/55 p-5 pt-6 shadow-sm sm:p-6 sm:pt-7">
                <div className="absolute -top-3 left-4 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/15 to-slate-200/70 px-4 py-1.5 shadow-sm backdrop-blur-md">
                  <CreditCard className="h-3.5 w-3.5 text-blue-900" />
                  <span className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-900">Membership included</span>
                </div>
                <p className="text-sm text-muted-foreground">Your checkout secures the introductory package tied to this first-class experience.</p>
                <div className="overflow-hidden rounded-[26px] border border-blue-900/15 bg-gradient-to-br from-blue-900/10 to-slate-200/30 text-slate-950 shadow-[0_22px_55px_rgba(15,23,42,0.10)]">
                  <div className="relative border-b border-blue-900/10 px-5 py-4 sm:px-6 sm:pr-[11.5rem]">
                    <div className="flex flex-col gap-4 sm:items-start">
                      <div className="max-w-2xl pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-900/70">Membership</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950 sm:text-[1.4rem]">{membershipOffer.name}</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
                          A premium introductory package curated to guide your first Physique 57 sessions with structure, value, and flexibility.
                        </p>
                      </div>
                      <motion.div
                        className="rounded-2xl border border-slate-950/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-3.5 py-2.5 text-center text-white shadow-[0_18px_38px_rgba(15,23,42,0.22)] sm:absolute sm:right-5 sm:top-5 sm:min-w-[170px]"
                        animate={{ y: [0, -2, 0], scale: [1, 1.01, 1] }}
                        transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">Package price</p>
                        <p className="mt-1.5 text-[1.45rem] font-bold leading-none text-white">{membershipOffer.price}</p>
                      </motion.div>
                    </div>
                  </div>

                  <div className="grid gap-3 px-5 py-5 sm:grid-cols-3 sm:px-6">
                    <div className="rounded-2xl border border-blue-900/10 bg-white/70 px-4 py-4 backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-900/70">Sessions</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">{membershipOffer.sessions}</p>
                    </div>
                    <div className="rounded-2xl border border-blue-900/10 bg-white/70 px-4 py-4 backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-900/70">Validity</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">{membershipOffer.validFor}</p>
                    </div>
                    <div className="rounded-2xl border border-blue-900/10 bg-white/70 px-4 py-4 backdrop-blur-sm shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-900/70">Included</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">First-class access package</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-blue-900/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-sm leading-relaxed text-slate-700">
                      Includes a guided onboarding flow, secure checkout, and the studio follow-up needed to complete your booking.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-blue-900/15 bg-white/70 text-slate-950 hover:border-blue-900/25 hover:bg-white/90 hover:text-slate-950"
                      onClick={() => setShowMembershipModal(true)}
                    >
                      Know more
                    </Button>
                  </div>
                </div>
              </div>

                <div className="relative space-y-3 rounded-2xl border border-slate-300/90 bg-white/55 p-5 pt-7 shadow-sm sm:p-6 sm:pt-8">
                <div className="absolute -top-3 left-4 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/15 to-slate-200/70 px-4 py-1.5 shadow-sm backdrop-blur-md">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-900">Before you confirm</span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 sm:items-center sm:gap-4">
                  <Checkbox
                    id="terms"
                    checked={formData.acceptedTerms}
                    onCheckedChange={(checked) => handleInputChange("acceptedTerms", Boolean(checked))}
                    className={cn("mt-0.5 h-5 w-5 rounded-md border-slate-400 data-[state=checked]:border-blue-900 data-[state=checked]:bg-blue-900 sm:mt-0", errors.acceptedTerms && "border-destructive")}
                  />
                  <div className="flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label htmlFor="terms" className="cursor-pointer text-sm font-semibold leading-relaxed text-slate-900 sm:flex-1">
                        I have read and accept the waiver and booking terms. <span className="text-destructive">*</span>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-full border-slate-300 bg-white px-4 text-xs font-semibold tracking-[0.08em] text-slate-800 hover:border-slate-900 hover:bg-slate-900 hover:text-white sm:self-auto"
                        onClick={(event) => {
                          event.preventDefault()
                          setShowWaiverModal(true)
                        }}
                      >
                        View terms & conditions
                      </Button>
                    </div>
                  </div>
                </div>
                {errors.acceptedTerms ? <p className="text-sm text-destructive">{errors.acceptedTerms}</p> : null}
              </div>

              {statusMessage ? (
                <div className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  statusMessage.tone === "error"
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-emerald-300 bg-emerald-50 text-emerald-800"
                )}>
                  {statusMessage.text}
                </div>
              ) : null}

              {(errors.payment || errors.form) ? (
                <p className="text-sm text-destructive">{errors.payment || errors.form}</p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="h-14 w-full bg-gradient-to-r from-blue-900 to-blue-800 text-lg shadow-lg transition-all duration-300 hover:from-blue-950 hover:to-blue-900 hover:shadow-xl"
                disabled={isSubmitting || isCreatingCheckout || !isFormValid}
              >
                {isSubmitting || isCreatingCheckout ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isCreatingCheckout ? "Starting secure checkout..." : "Submitting your booking..."}
                  </>
                ) : (
                  primaryButtonLabel
                )}
              </Button>
              </form>
            </div>
            )}

            <section className="mt-20 space-y-12">
              <div className="mx-auto max-w-5xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/10 to-slate-200/50 px-4 py-2 backdrop-blur-sm">
                  <Award className="h-4 w-4 text-blue-900" />
                  <span className="text-sm font-semibold text-blue-900">What Sets Us Apart</span>
                </div>
                <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Key Benefits</h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  Discover the proven advantages that make Physique 57 India the preferred choice for fast, visible results and sustainable transformation.
                </p>
              </div>

              <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2">
                {keyBenefits.map((benefit, index) => {
                  const Icon = benefitIcons[benefit.icon]
                  const colors = colorClasses[benefit.color]

                  return (
                    <motion.div
                      key={benefit.title}
                      initial={{ opacity: 0, y: 26 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.5, delay: index * 0.06 }}
                      className={cn(
                        "group relative h-full rounded-2xl border-r-2 border-y-2 border-r-slate-200 border-y-slate-200 bg-gradient-to-br from-white/95 to-slate-50/60 p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
                        colors.border
                      )}
                    >
                      <div className="flex items-start gap-6">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn("flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110", colors.iconBg)}>
                              <Icon className="h-7 w-7" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="border-slate-700 bg-slate-900 text-white">
                            <p className="font-medium">{benefit.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex-1">
                          <h3 className={cn("mb-3 text-xl font-bold text-foreground transition-colors", colors.hoverText)}>
                            {benefit.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </section>

            <section className="mt-20 space-y-12">
              <div className="mx-auto max-w-4xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/10 to-slate-200/50 px-4 py-2 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-blue-900" />
                  <span className="text-sm font-semibold text-blue-900">Your First Visit</span>
                </div>
                <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">What Happens Next</h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  From your first click to your first shake, every step is designed to feel curated, clear, and high-touch.
                </p>
              </div>

              <div className="relative mx-auto mt-12 max-w-4xl">
                <div className="absolute bottom-12 left-[27px] top-12 hidden w-0.5 bg-gradient-to-b from-slate-300 via-blue-900 to-slate-300 md:block" />
                <div className="space-y-8">
                  {journeySteps.map((step, index) => (
                    <motion.div
                      key={step.number}
                      initial={{ opacity: 0, x: -40 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.5, delay: index * 0.08 }}
                    >
                      <div className="group flex items-start gap-6">
                        <div className="relative z-10 flex-shrink-0">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-900 to-blue-700 text-lg font-bold text-white shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl">
                            {step.number}
                          </div>
                        </div>
                        <div className="flex-1 rounded-2xl border border-border/50 bg-gradient-to-br from-white/90 via-white/75 to-slate-100/30 p-6 backdrop-blur-sm transition-all duration-300 group-hover:translate-x-2 group-hover:border-blue-900/30 group-hover:shadow-xl">
                          <h3 className="mb-2 text-lg font-bold text-foreground transition-colors group-hover:text-blue-900">{step.title}</h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-20 space-y-12">
              <div className="mx-auto max-w-4xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-200/50 px-4 py-2 backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-amber-700" />
                  <span className="text-sm font-semibold text-amber-900">Studio Locations</span>
                </div>
                <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Choose Your Studio</h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  Each location carries the same Physique 57 method, with its own neighborhood energy and format mix.
                </p>
              </div>

              <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
                <div className="space-y-6">
                  {studios.map((studio, index) => (
                    (() => {
                      const theme = studioThemes[studio.name as keyof typeof studioThemes]
                      return (
                    <motion.div
                      key={studio.name}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.5, delay: index * 0.12 }}
                      className={cn(
                        "group overflow-hidden rounded-2xl border-2 bg-gradient-to-br shadow-sm transition-all duration-300 hover:shadow-2xl",
                        theme.cardBorder,
                        theme.cardBg
                      )}
                    >
                      <div className="space-y-6 p-8">
                        <div className="flex items-start gap-6">
                          <div className={cn("relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6", theme.iconBg)}>
                            <Building2 className="relative z-10 h-8 w-8 text-white" />
                            <div className="absolute inset-0 rounded-2xl bg-white/20" />
                          </div>
                          <div className="flex-1">
                            <h3 className={cn("mb-2 text-2xl font-bold text-foreground transition-colors", theme.hoverTitle)}>{studio.name}</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">{studio.description}</p>
                          </div>
                        </div>

                        <div className={cn("space-y-3 rounded-2xl border-2 bg-white/80 p-6 text-sm shadow-sm backdrop-blur-sm", theme.pillBorder)}>
                          {[
                            { icon: MapPin, title: "Location", value: studio.neighborhood },
                            { icon: Phone, title: "Phone", value: studio.phone },
                            { icon: Clock, title: "Hours", value: studio.hours },
                            { icon: Building2, title: "Address", value: studio.address },
                          ].map((item) => {
                            const ItemIcon = item.icon
                            return (
                              <div key={item.title} className="flex items-start gap-3">
                                <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm", theme.itemIconBg)}>
                                  <ItemIcon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <p className={cn("mb-1 font-bold", theme.accentText)}>{item.title}</p>
                                  <p className="leading-snug text-muted-foreground">{item.value}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${studio.lat},${studio.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn("inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl", theme.buttonBg)}
                        >
                          <MapPin className="h-4 w-4" />
                          Get Directions
                        </a>
                      </div>
                    </motion.div>
                      )
                    })()
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="h-[700px] overflow-hidden rounded-2xl border-2 border-slate-200 shadow-2xl lg:sticky lg:top-8"
                >
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.14571262895!2d72.71637!3d19.082502!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1234567890"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-full w-full"
                    title="Physique 57 studio map"
                  />
                </motion.div>
              </div>
            </section>

            <section className="mt-20 space-y-12 pb-2">
              <div className="mx-auto max-w-5xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-600/20 bg-gradient-to-r from-rose-600/10 to-rose-200/50 px-4 py-2 backdrop-blur-sm">
                  <Heart className="h-4 w-4 text-rose-700" />
                  <span className="text-sm font-semibold text-rose-900">Member Stories</span>
                </div>
                <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">What Our Members Say</h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">Real transformations, real results, real people.</p>
              </div>

              <div className="relative mt-12">
                <div className="mx-auto max-w-4xl">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentReview}
                      initial={{ opacity: 0, scale: 0.96, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -20 }}
                      transition={{ duration: 0.45, ease: "easeInOut" }}
                      className="rounded-3xl border-2 border-rose-200 bg-gradient-to-br from-white/95 via-rose-50/30 to-white/90 p-10 shadow-2xl backdrop-blur-md"
                    >
                      <div className="flex items-start gap-6">
                        <div className="flex-shrink-0">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-2xl font-bold text-white shadow-lg">
                            {clientReviews[currentReview]?.name.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="mb-3 flex items-center gap-3">
                            <h4 className="text-xl font-bold text-foreground">{clientReviews[currentReview]?.name}</h4>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Heart key={index} className="h-4 w-4 fill-rose-500 text-rose-500" />
                              ))}
                            </div>
                          </div>
                          <p className="mb-3 text-sm font-semibold text-rose-600">{clientReviews[currentReview]?.class}</p>
                          <p className="mb-4 text-lg italic leading-relaxed text-foreground">“{clientReviews[currentReview]?.review}”</p>
                          <p className="text-sm text-muted-foreground">{clientReviews[currentReview]?.date}</p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <div className="mt-8 flex flex-wrap justify-center gap-2">
                    {clientReviews.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentReview(index)}
                        className={cn(
                          "transition-all duration-300",
                          currentReview === index
                            ? "h-2 w-8 rounded-full bg-gradient-to-r from-rose-500 to-rose-600"
                            : "h-2 w-2 rounded-full bg-slate-300 hover:bg-slate-400"
                        )}
                        aria-label={`View review ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-20 space-y-12 pb-2">
              <div className="mx-auto max-w-5xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/10 to-slate-200/50 px-4 py-2 backdrop-blur-sm">
                  <Info className="h-4 w-4 text-blue-900" />
                  <span className="text-sm font-semibold text-blue-900">Questions</span>
                </div>
                <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Helpful Answers Before You Book</h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  Everything you need before your first class, without losing the premium feel of the page.
                </p>
              </div>

              <div className="mt-12 space-y-4">
                {featuredFaqs.map((faq, index) => (
                  <motion.div
                    key={faq.question}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.35, delay: index * 0.04 }}
                    className="overflow-hidden rounded-2xl border border-slate-900/15 bg-card shadow-sm transition-all duration-300 hover:border-slate-900/30 hover:shadow-xl"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className={cn(
                        "group flex w-full items-center justify-between px-8 py-6 text-left transition-colors",
                        openFaq === index
                          ? "bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800"
                          : "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 hover:from-slate-950 hover:to-slate-900"
                      )}
                    >
                      <span className="pr-4 text-lg font-bold text-white transition-colors group-hover:text-slate-100">{faq.question}</span>
                      <motion.div
                        animate={{ rotate: openFaq === index ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300", openFaq === index ? "border-white/25 bg-white/10" : "border-white/15 bg-white/5 group-hover:bg-white/10")}>
                          {openFaq === index ? <Minus className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                        </div>
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {openFaq === index ? (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                          <div className="border-t border-slate-900/10 bg-gradient-to-br from-zinc-50 via-white to-stone-50 px-8 pb-6 pt-6">
                            <div className="space-y-3 border-l-4 border-slate-900/80 pl-5 text-[15px] leading-7 text-slate-700">
                              {faq.answer.map((paragraph, paragraphIndex) => (
                                <p key={`${faq.question}-${paragraphIndex}`}>{paragraph}</p>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              <div className="mt-12 rounded-2xl border border-blue-900/20 bg-gradient-to-br from-blue-900/10 to-slate-200/30 p-8">
                <div className="space-y-4 text-center">
                  <h3 className="text-2xl font-bold text-blue-900">Need More Information?</h3>
                  <p className="text-blue-900/80">Explore the full FAQ guide or read the complete waiver for more details.</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-4">
                    <Button variant="outline" size="lg" className="border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white" onClick={() => setShowAllFaqsModal(true)}>
                      View all FAQs
                    </Button>
                    <Button variant="outline" size="lg" className="border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white" onClick={() => setShowWaiverModal(true)}>
                      Read full waiver
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <ModalShell open={showSchedule} onClose={() => setShowSchedule(false)} className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Class Schedule</h3>
            <p className="mt-1 text-sm text-muted-foreground">{formData.studio || "Select a studio to view schedule"}</p>
          </div>
          <button onClick={() => setShowSchedule(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
          <div ref={scheduleHostRef} className="min-h-[420px]" />
        </div>
      </ModalShell>

      <ModalShell open={showSuccessModal} onClose={() => setShowSuccessModal(false)} className="max-w-md border-2 border-white bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 shadow-xl">
          <CheckCircle2 className="h-12 w-12 text-white" />
        </div>
        <h3 className="mb-3 text-3xl font-bold text-foreground">Payment Successful!</h3>
        <p className="mb-8 leading-relaxed text-muted-foreground">
          Your booking is confirmed. Check your email for class details and arrival instructions.
        </p>
        <Button className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 py-6 text-lg text-white hover:from-blue-700 hover:to-emerald-700" onClick={redirectToMomence}>
          Continue to Momence
        </Button>
      </ModalShell>

      <ModalShell open={showWaiverModal} onClose={() => setShowWaiverModal(false)} className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold">Terms & Waiver</h3>
          <button onClick={() => setShowWaiverModal(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          {waiverSections.map((section, sectionIndex) => (
            <div key={section.title ?? `section-${sectionIndex}`} className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              {section.title ? <h4 className="text-base font-bold text-slate-950">{section.title}</h4> : null}
              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <p key={`paragraph-${sectionIndex}-${paragraphIndex}`}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-6">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={`bullet-${sectionIndex}-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
        <Button onClick={() => setShowWaiverModal(false)} className="mt-6 w-full bg-blue-900 hover:bg-blue-950">
          I Understand
        </Button>
      </ModalShell>

      <ModalShell open={Boolean(showFormatInfo)} onClose={() => setShowFormatInfo(null)} className="max-w-5xl overflow-hidden p-0">
        {activeFormat ? (
          <>
            <div className="grid max-h-[85vh] min-h-[640px] lg:grid-cols-[42%_58%]">
              <div className="relative min-h-[260px] overflow-hidden bg-slate-100 lg:min-h-full">
                <img src={activeFormat.image} alt={activeFormat.imageAlt} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/90">Class formats</p>
                  <h3 className="text-3xl font-semibold sm:text-4xl">{activeFormat.subtitle}</h3>
                  <p className="mt-2 max-w-md text-sm text-white/85 sm:text-base">{activeFormat.title}</p>
                </div>
              </div>

              <div className="flex min-h-0 flex-col bg-white">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-900/70">Format details</p>
                    <p className="mt-1 text-sm text-muted-foreground">A closer look at what this first-class experience feels like.</p>
                  </div>
                  <button onClick={() => setShowFormatInfo(null)} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Intensity</p>
                      <p className="mt-1 font-semibold text-slate-900">{activeFormat.intensity}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Duration</p>
                      <p className="mt-1 font-semibold text-slate-900">{activeFormat.duration}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Best for</p>
                      <p className="mt-1 font-semibold text-slate-900">{activeFormat.bestFor}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Training style</p>
                      <p className="mt-1 font-semibold text-slate-900">{activeFormat.trainingStyle}</p>
                    </div>
                  </div>

                  <p className="mt-5 leading-relaxed text-muted-foreground">{activeFormat.fullDescription}</p>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-5">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Why it stands out</h4>
                    <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
                      {activeFormat.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-blue-900" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-slate-200 px-6 py-5 sm:px-8">
                  <Button onClick={() => setShowFormatInfo(null)} className="w-full sm:w-auto">
                    Got it
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </ModalShell>

      <ModalShell open={showMembershipModal} onClose={() => setShowMembershipModal(false)} className="max-w-3xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-900/70">Membership details</p>
            <h3 className="text-2xl font-semibold text-slate-950">{membershipOffer.name}</h3>
            <p className="text-sm text-muted-foreground">Complete package information and what’s included.</p>
          </div>
          <button onClick={() => setShowMembershipModal(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Price</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{membershipOffer.price}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sessions</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{membershipOffer.sessions}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Valid for</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{membershipOffer.validFor}</p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Package description</h4>
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            {membershipOffer.description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Important terms</h4>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
            {membershipOffer.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-blue-900" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      </ModalShell>

      <ModalShell open={showAllFaqsModal} onClose={() => setShowAllFaqsModal(false)} className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Complete FAQ Guide</h3>
            <p className="mt-1 text-sm text-muted-foreground">Everything you might want to know before your first class.</p>
          </div>
          <button onClick={() => setShowAllFaqsModal(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-slate-900/10 bg-card p-6 shadow-sm">
              <h4 className="mb-3 text-lg font-semibold text-foreground">{faq.question}</h4>
              <div className="space-y-3 leading-relaxed text-muted-foreground">
                {faq.answer.map((paragraph, paragraphIndex) => (
                  <p key={`${faq.question}-modal-${paragraphIndex}`}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ModalShell>

      <div className="fixed bottom-6 right-6 z-[80]">
        <button
          type="button"
          onClick={handleOpenWhatsApp}
          className="flex h-15 w-15 items-center justify-center rounded-full bg-[linear-gradient(135deg,#25d366,#128c7e)] text-white shadow-[0_4px_16px_rgba(37,211,102,0.3)] transition-transform duration-200 hover:scale-105 hover:shadow-[0_6px_20px_rgba(37,211,102,0.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60"
          aria-label="Chat with Physique 57 team on WhatsApp"
          title="Chat with Physique 57 team"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
            <path
              fill="currentColor"
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.085"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
