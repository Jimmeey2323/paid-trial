import { useEffect, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { AnimatePresence, motion } from "framer-motion"
import { parsePhoneNumberFromString, type CountryCode as PhoneCountryCode } from "libphonenumber-js/min"
import {
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  Loader2,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  X,
} from "lucide-react"

import {
  countryCodes,
  heroImages,
  studios,
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

interface Barre57TrialFormProps {
  onSubmit?: (data: any) => void
}

export function Barre57TrialForm({ onSubmit }: Barre57TrialFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+91",
    phone: "",
    studio: "",
    acceptedTerms: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null)
  const [showWaiverModal, setShowWaiverModal] = useState(false)
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const confettiInstanceRef = useRef<ReturnType<typeof confetti.create> | null>(null)
  const [currentHeroImage, setCurrentHeroImage] = useState(0)
  const [publicConfig, setPublicConfig] = useState<PublicClientConfig | null>(null)

  useEffect(() => {
    const imageRotationInterval = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length)
    }, 8000)

    return () => clearInterval(imageRotationInterval)
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

  const selectedStudio = studios.find((studio) => studio.name === formData.studio)

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    }
    if (!formData.studio) {
      newErrors.studio = "Please select a studio"
    }
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = "You must accept the waiver and terms"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getCountryOption = (code: string) => {
    return countryCodes.find((item) => item.country === code)
  }

  const getPhoneNumber = () => {
    const countryCode = getCountryOption(formData.countryCode)?.code || "+91"
    return countryCode + formData.phone.replace(/\s+/g, "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const phoneNumber = getPhoneNumber()
      const parsedPhone = parsePhoneNumberFromString(phoneNumber)

      if (!parsedPhone?.isValid()) {
        setErrors({ phone: "Invalid phone number" })
        setIsSubmitting(false)
        return
      }

      // Get tracking payload
      const trackingPayload = getSubmissionTrackingPayload()

      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: parsedPhone.formatInternational(),
        phoneCountry: getCountryOption(formData.countryCode)?.country || "IN",
        center: selectedStudio?.backendName ?? formData.studio,
        type: "Barre 57",
        waiverAccepted: formData.acceptedTerms ? "accepted" : "",
        source_form: "barre-trial-form",
        ...trackingPayload,
      }

      const response = await fetch("/api/submit-barre-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        setStatusMessage({
          text: result.error || "Submission failed. Please try again.",
          tone: "error",
        })
        setIsSubmitting(false)
        return
      }

      // Track successful submission
      trackLeadSubmission(publicConfig, payload as { event_id?: string; utm_campaign?: string; utm_source?: string })

      // Show success celebration
      celebrateSuccess()

      setShowSuccessModal(true)
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        countryCode: "+91",
        phone: "",
        studio: "",
        acceptedTerms: false,
      })

      if (onSubmit) {
        onSubmit(result)
      }
    } catch (error) {
      console.error("Submission error:", error)
      setStatusMessage({
        text: "An error occurred. Please try again.",
        tone: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const celebrateSuccess = () => {
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

  const isFormValid = formData.firstName.trim() && formData.lastName.trim() && formData.email.trim() && formData.phone.trim() && formData.studio && formData.acceptedTerms

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <canvas ref={confettiCanvasRef} className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { top: "10%", left: "10%" },
          { top: "60%", left: "80%" },
          { top: "80%", left: "20%" },
        ].map(({ top, left }, index) => (
          <motion.div
            key={index}
            className="absolute text-slate-200/20"
            initial={{ opacity: 0.2, scale: 0.9 }}
            animate={{ opacity: [0.15, 0.3, 0.15], y: [0, -16, 0], rotate: [0, 10, -8, 0] }}
            transition={{ duration: 12 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            style={{ top, left }}
          >
            <Heart className="h-14 w-14" />
          </motion.div>
        ))}
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[40%_60%]">
        <div
          className="relative hidden h-screen overflow-hidden bg-black lg:block"
          onClick={() => window.location.href = "https://www.physique57.in"}
          role="link"
          tabIndex={0}
          aria-label="Open Physique 57 website"
        >
          <AnimatePresence>
            <motion.div
              key={currentHeroImage}
              className="absolute inset-0 overflow-hidden bg-black"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 1.3 }}
            >
              <motion.img
                src={heroImages[currentHeroImage]}
                alt="Physique 57 Barre"
                className="h-full w-full object-cover object-top"
                initial={{ scale: 1.12, x: 18, y: 8 }}
                animate={{ scale: 1.03, x: -8, y: -10 }}
                exit={{ scale: 1.08, x: -18, y: 6 }}
                transition={{ duration: 8.5 }}
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-x-0 bottom-0 p-12 text-white">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-blue-200" />
              <span className="text-sm font-medium">Barre 57 Trial</span>
            </div>
            <h1 className="mb-4 max-w-md text-5xl font-bold">Experience Barre 57</h1>
            <p className="max-w-lg text-lg text-white/88">Join us for a complimentary Barre 57 class and discover the power of this proven method.</p>
          </div>
        </div>

        <div className="relative min-h-screen bg-background/95 backdrop-blur-sm lg:h-screen lg:overflow-y-auto">
          <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10 xl:px-14 xl:pt-12">
            {showSuccessModal ? (
              <div className="flex min-h-[78vh] items-center justify-center">
                <div className="w-full max-w-2xl rounded-[32px] border border-slate-200/80 bg-white/85 px-8 py-16 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:px-12">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg">
                    <CheckCircle2 className="h-12 w-12 text-white" />
                  </div>
                  <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-900/70">Trial booked</p>
                  <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">Your Barre 57 Trial is Confirmed!</h2>
                  <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                    Check your email for class details and arrival instructions. Our team will contact you shortly.
                  </p>
                  <Button
                    className="mt-8 w-full bg-gradient-to-r from-emerald-600 to-blue-600 py-6 text-lg text-white hover:from-emerald-700 hover:to-blue-700"
                    onClick={() => window.location.href = "https://www.physique57.in"}
                  >
                    Return to Physique 57
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_48px_140px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/50 backdrop-blur-xl sm:p-6 lg:p-8">
                <div className="mb-8">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/30 bg-gradient-to-r from-blue-900/20 to-slate-300/30 px-4 py-2 backdrop-blur-sm">
                    <Sparkles className="h-4 w-4 text-blue-900" />
                    <span className="text-sm font-semibold text-blue-900">Book Your Barre Trial</span>
                  </div>
                  <h2 className="mb-2 text-3xl font-bold text-foreground">Claim Your Free Trial</h2>
                  <p className="text-muted-foreground">Sign up for your complimentary Barre 57 class.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="relative space-y-6 rounded-2xl border border-slate-300/90 bg-white/55 p-5 pt-8 shadow-sm sm:p-6 sm:pt-9">
                    <div className="absolute -top-3 left-4 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/15 to-slate-200/70 px-4 py-1.5 shadow-sm backdrop-blur-md">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-900">1. Your details</span>
                      <span className="text-destructive">*</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="font-semibold">
                          First name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(event) => handleInputChange("firstName", event.target.value)}
                          className={cn(
                            "h-12 border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                            errors.firstName && "border-destructive"
                          )}
                        />
                        {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="font-semibold">
                          Last name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(event) => handleInputChange("lastName", event.target.value)}
                          className={cn(
                            "h-12 border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                            errors.lastName && "border-destructive"
                          )}
                        />
                        {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-semibold">
                          Email <span className="text-destructive">*</span>
                        </Label>
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
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="font-semibold">
                          Phone number <span className="text-destructive">*</span>
                        </Label>
                        <div className="grid grid-cols-[56px_minmax(0,1fr)] items-stretch gap-2">
                          <Select value={formData.countryCode} onValueChange={(value) => handleInputChange("countryCode", value)}>
                            <SelectTrigger size="lg" className="h-12 w-[56px] min-w-[56px] shrink-0 justify-center border-slate-300/95 bg-white/70 px-2 backdrop-blur-sm">
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
                        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="relative space-y-5 rounded-2xl border border-slate-300/90 bg-white/55 p-5 pt-8 shadow-sm sm:p-6 sm:pt-9">
                    <div className="absolute -top-3 left-4 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/15 to-slate-200/70 px-4 py-1.5 shadow-sm backdrop-blur-md">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-900">2. Studio choice</span>
                      <span className="text-destructive">*</span>
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="studio" className="font-semibold">
                        Preferred studio <span className="text-destructive">*</span>
                      </Label>
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
                      {errors.studio && <p className="text-sm text-destructive">{errors.studio}</p>}
                    </div>
                  </div>

                  <div className="relative space-y-3 rounded-2xl border border-slate-300/90 bg-white/55 p-5 pt-9 shadow-sm sm:p-6 sm:pt-10">
                    <div className="absolute -top-3 left-4 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/15 to-slate-200/70 px-4 py-1.5 shadow-sm backdrop-blur-md">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-900">3. Confirmation</span>
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
                            I have read and accept the waiver. <span className="text-destructive">*</span>
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-full border-slate-300 bg-white px-4 text-xs font-semibold tracking-[0.08em] text-slate-800 hover:border-slate-900 hover:bg-slate-900 hover:text-white sm:self-auto"
                            onClick={() => setShowWaiverModal(true)}
                          >
                            View waiver
                          </Button>
                        </div>
                      </div>
                    </div>
                    {errors.acceptedTerms && <p className="text-sm text-destructive">{errors.acceptedTerms}</p>}
                  </div>

                  {statusMessage && (
                    <div
                      className={cn(
                        "rounded-xl border px-4 py-3 text-sm",
                        statusMessage.tone === "error"
                          ? "border-red-300 bg-red-50 text-red-800"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800"
                      )}
                    >
                      {statusMessage.text}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="h-14 w-full bg-gradient-to-r from-blue-950 to-blue-900 text-lg shadow-lg transition-all duration-300 hover:from-slate-950 hover:to-blue-950 hover:shadow-xl"
                    disabled={isSubmitting || !isFormValid}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Booking your trial...
                      </>
                    ) : (
                      "Book Your Free Trial"
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalShell open={showWaiverModal} onClose={() => setShowWaiverModal(false)} className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold">Waiver & Terms</h3>
          <button onClick={() => setShowWaiverModal(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          {waiverSections.map((section, sectionIndex) => (
            <div key={section.title ?? `section-${sectionIndex}`} className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              {section.title && <h4 className="text-base font-bold text-slate-950">{section.title}</h4>}
              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <p key={`paragraph-${sectionIndex}-${paragraphIndex}`}>{paragraph}</p>
              ))}
            </div>
          ))}
        </div>
        <Button onClick={() => setShowWaiverModal(false)} className="mt-6 w-full bg-blue-900 hover:bg-blue-950">
          I Understand
        </Button>
      </ModalShell>
    </div>
  )
}

interface ModalShellProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

function ModalShell({ open, onClose, children, className }: ModalShellProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={cn("max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-xl", className)}>
        {children}
      </div>
    </div>
  )
}
