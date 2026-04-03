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
  Award,
  Trophy,
  Target,
  Zap,
  Users,
  Dumbbell,
  ChevronDown,
  Plus,
  Minus,
  Info,
  Building2,
  Star,
  type LucideIcon,
} from "lucide-react"

import {
  countryCodes,
  faqs,
  keyBenefits,
  studios,
  waiverSections,
  clientReviews,
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

interface Barre57TrialFormProps {
  onSubmit?: (data: any) => void
}

// Barre 57 specific hero images
const BARRE_HERO_IMAGES = [
  "https://i.postimg.cc/CKKVdJSK/images_(10).jpg",
  "https://i.postimg.cc/PqqkNKTC/10210_Physique_57_by_Atelier_Birjis_3.webp",
  "https://i.postimg.cc/FKKQ1GN0/40d320_4ed6cb4eb34a4fd29ba8bd26aa62cb5a_mv2.jpg",
  "https://i.postimg.cc/255f3TrB/9.jpg",
  "https://i.postimg.cc/VvZTF5Sj/hp_Img_1770172692.png",
]

// All FAQs for Barre - combines Barre-specific with general Physique 57 FAQs
const ALL_FAQS = [
  {
    question: "Is Barre 57 suitable for beginners?",
    answer: [
      "Absolutely! Barre is designed to be accessible for all fitness levels. Our instructors provide modifications for every movement, so you can progress at your own pace.",
      "You'll use the barre for balance, not for pulling yourself up, so it's completely safe and effective whether you're a beginner or advanced."
    ]
  },
  {
    question: "What should I wear to Barre class?",
    answer: [
      "Wear comfortable, fitted clothing that lets you move freely. Many people wear leggings, shorts, or athletic wear.",
      "Bring grip socks or non-slip shoes to use during class for safety and stability."
    ]
  },
  {
    question: "Do I need to be flexible to do Barre?",
    answer: [
      "No! Flexibility is not a prerequisite. Barre actually helps you build flexibility over time as part of the workout.",
      "Our instructors will help you find your range of motion and work safely within it."
    ]
  },
  ...faqs,
]

// Barre 57 Workout Structure with exercises
const BARRE_WORKOUT_SECTIONS = [
  {
    title: "Warm Up",
    exercises: [
      {
        name: "Bicep Curls in Wide Second",
        gif: "https://physique57.com/wp-content/uploads/2022/07/bicep-curls-wide-second.gif",
        steps: [
          "Step your feet wide, slightly turned out.",
          "Bend knees deeply and lower your hips.",
          "Lift heavy weights up towards your shoulders and down towards the thighs"
        ],
        tips: "Try to keep hips around knee level. Keep elbows tight to ribcage and shoulders down to target the biceps and work with proper posture.",
        targets: ["Thighs", "Biceps"]
      },
      {
        name: "Tricep Kickbacks",
        gif: "https://physique57.com/wp-content/uploads/2022/07/tricep-kickbacks.gif",
        steps: [
          "Hinge forward at the hips with a slight bend in your knees.",
          "Keep weights at shoulder level and extend arms back.",
          "Return to starting position in a controlled manner."
        ],
        tips: "Keep your core engaged and avoid arching your back. Focus on the tricep contraction.",
        targets: ["Triceps", "Core"]
      },
      {
        name: "Push-ups",
        gif: "https://physique57.com/wp-content/uploads/2022/07/pushups.gif",
        steps: [
          "Start in a plank position with hands shoulder-width apart.",
          "Lower your body by bending elbows until chest nearly touches the ground.",
          "Push back up to starting position."
        ],
        tips: "Modify on knees if needed. Keep core tight and body in a straight line.",
        targets: ["Chest", "Triceps", "Core"]
      },
      {
        name: "Rows",
        gif: "https://physique57.com/wp-content/uploads/2022/07/rows.gif",
        steps: [
          "Hinge forward with a slight knee bend, weights in hand.",
          "Pull weights up to hip level, squeezing shoulder blades together.",
          "Lower weights back down with control."
        ],
        tips: "Keep your back straight and engage your lats. Avoid letting shoulders shrug.",
        targets: ["Back", "Biceps"]
      }
    ]
  },
  {
    title: "Thighs",
    exercises: [
      {
        name: "Curtsy",
        gif: "https://physique57.com/wp-content/uploads/2022/07/curtsy.gif",
        steps: [
          "Stand with feet hip-width apart at the barre.",
          "Step right leg back and across your body, bending both knees.",
          "Return to center and repeat."
        ],
        tips: "Keep your upper body upright and engage your core. Focus on the inner and outer thigh.",
        targets: ["Inner Thighs", "Outer Thighs"]
      },
      {
        name: "Upright V",
        gif: "https://physique57.com/wp-content/uploads/2022/07/upright-v.gif",
        steps: [
          "Stand at the barre with feet in a V position, heels together.",
          "Pulse up and down, keeping legs engaged.",
          "Complete high-intensity pulses for maximum burn."
        ],
        tips: "Turn out from the hips, not the knees. Squeeze your glutes and thighs throughout.",
        targets: ["Thighs", "Glutes"]
      },
      {
        name: "Wide Incline",
        gif: "https://physique57.com/wp-content/uploads/2022/07/wide-incline.gif",
        steps: [
          "Stand with feet very wide, toes slightly turned out.",
          "Bend knees and lower into a wide squat position.",
          "Pulse up and down, staying low."
        ],
        tips: "Keep knees behind your toes. Engage your entire lower body.",
        targets: ["Thighs", "Inner Thighs", "Glutes"]
      },
      {
        name: "Thigh Dance",
        gif: "https://physique57.com/wp-content/uploads/2022/07/thigh-dance.gif",
        steps: [
          "Stand at the barre with a small bend in your knees.",
          "Pulse the working leg up and down in quick rhythmic motions.",
          "Maintain turn-out and control throughout."
        ],
        tips: "Keep your hips level and core engaged. This targets deep thigh muscles.",
        targets: ["Thighs"]
      }
    ]
  },
  {
    title: "Glutes",
    exercises: [
      {
        name: "Pretzel",
        gif: "https://physique57.com/wp-content/uploads/2022/07/pretzel.gif",
        steps: [
          "Lie on your side with legs bent, top leg crossed over.",
          "Lift top leg up, squeezing your glute.",
          "Lower with control and repeat."
        ],
        tips: "Keep your core engaged and avoid rolling backward. Focus on glute activation.",
        targets: ["Glutes", "Hips"]
      },
      {
        name: "Mermaid",
        gif: "https://physique57.com/wp-content/uploads/2022/07/mermaid.gif",
        steps: [
          "Lie on your side with both legs bent together.",
          "Press top hip forward and lift top leg slightly.",
          "Pulse leg up and down in small, controlled movements."
        ],
        tips: "This exercise deeply targets the glute and hip area. Keep movements small and controlled.",
        targets: ["Glutes", "Hip Flexors"]
      },
      {
        name: "Side Forearm Glutes",
        gif: "https://physique57.com/wp-content/uploads/2022/07/standing-hairpin.gif",
        steps: [
          "Stand at the barre, holding it with one hand.",
          "Lift working leg straight behind you and pulse.",
          "Keep torso upright and core engaged."
        ],
        tips: "Squeeze your glute at the top of each pulse. Avoid arching your back.",
        targets: ["Glutes"]
      },
      {
        name: "Fold Over",
        gif: "https://physique57.com/wp-content/uploads/2022/07/fold-over.gif",
        steps: [
          "Bend forward and hold the barre, creating a 90-degree angle.",
          "Pulse one leg up and down behind you.",
          "Alternate legs and maintain posture."
        ],
        tips: "This intense position maximizes glute engagement. Breathe steadily throughout.",
        targets: ["Glutes", "Lower Back"]
      }
    ]
  },
  {
    title: "Abs",
    exercises: [
      {
        name: "Scissors",
        gif: "https://physique57.com/wp-content/uploads/2022/07/scissors.gif",
        steps: [
          "Lie on your back with legs extended upward.",
          "Cross legs in a scissor motion while keeping lower back planted.",
          "Continuous crossing motion for high-intensity core work."
        ],
        tips: "Keep your lower back flat on the ground. Use controlled movements.",
        targets: ["Abs", "Core"]
      },
      {
        name: "Roundback Abs on Forearms",
        gif: "https://physique57.com/wp-content/uploads/2022/07/roundback.gif",
        steps: [
          "Sit on your forearms with legs extended.",
          "Round your back and crunch forward, engaging your core.",
          "Release and repeat with control."
        ],
        tips: "Focus on deep core engagement. This targets lower abdominal muscles.",
        targets: ["Abs", "Core"]
      },
      {
        name: "Curl on the Ball",
        gif: "https://physique57.com/wp-content/uploads/2022/07/curl-ball.gif",
        steps: [
          "Lie back on a stability ball with knees bent.",
          "Crunch up, lifting shoulders off the ball.",
          "Lower back down with control."
        ],
        tips: "The ball allows for greater range of motion. Keep movements controlled.",
        targets: ["Upper Abs", "Core"]
      },
      {
        name: "Forearm Plank",
        gif: "https://physique57.com/wp-content/uploads/2022/07/forearm-plank.gif",
        steps: [
          "Start in a forearm plank position with elbows under shoulders.",
          "Hold position, engaging core, glutes, and legs.",
          "Breathe steadily and maintain alignment."
        ],
        tips: "Keep your body in a straight line from head to heels. This builds core endurance.",
        targets: ["Core", "Abs", "Shoulders"]
      }
    ]
  }
]

const benefitIcons: Record<string, LucideIcon> = {
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
    border: "border-l-blue-500",
    iconBg: "from-blue-400 to-blue-600",
    hoverText: "group-hover:text-blue-600",
  },
  rose: {
    border: "border-l-rose-500",
    iconBg: "from-rose-400 to-rose-600",
    hoverText: "group-hover:text-rose-600",
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
  const [loadedHeroImages, setLoadedHeroImages] = useState<Set<number>>(new Set())
  const [publicConfig, setPublicConfig] = useState<PublicClientConfig | null>(null)
  const [showAllFaqsModal, setShowAllFaqsModal] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [selectedWorkoutSection, setSelectedWorkoutSection] = useState<number>(0)
  const [selectedExercise, setSelectedExercise] = useState<number>(0)
  const [currentReview, setCurrentReview] = useState<number>(0)

  const selectedStudio = studios.find((studio) => studio.name === formData.studio)

  useEffect(() => {
    const imageNodes = BARRE_HERO_IMAGES.map((src, index) => {
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
    if (!loadedHeroImages.has(currentHeroImage)) {
      return
    }

    const heroInterval = window.setInterval(() => {
      setCurrentHeroImage((prev) => {
        const next = (prev + 1) % BARRE_HERO_IMAGES.length
        return loadedHeroImages.has(next) ? next : prev
      })
    }, 6500)

    return () => {
      window.clearInterval(heroInterval)
    }
  }, [currentHeroImage, loadedHeroImages])

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

  useEffect(() => {
    const reviewTimeout = window.setTimeout(() => {
      setCurrentReview((prev) => (prev + 1) % clientReviews.length)
    }, 3000)

    return () => {
      window.clearTimeout(reviewTimeout)
    }
  }, [currentReview])

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
                src={BARRE_HERO_IMAGES[currentHeroImage]}
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
              <>
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

                {/* KEY BENEFITS SECTION */}
                <section className="mt-20 space-y-12">
                  <div className="mx-auto max-w-5xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/10 to-slate-200/50 px-4 py-2 backdrop-blur-sm">
                      <Award className="h-4 w-4 text-blue-900" />
                      <span className="text-sm font-semibold text-blue-900">What Sets Us Apart</span>
                    </div>
                    <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Key Benefits</h2>
                    <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                      Discover the proven advantages that make Barre 57 India the preferred choice for fast, visible results and sustainable transformation.
                    </p>
                  </div>

                  <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2">
                    {keyBenefits.map((benefit, index) => {
                      const Icon = benefitIcons[benefit.icon]
                      const colors = colorClasses[benefit.color as keyof typeof colorClasses]

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

                {/* LOCATIONS SECTION */}
                <section className="mt-20 space-y-12">
                  <div className="mx-auto max-w-4xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-200/50 px-4 py-2 backdrop-blur-sm">
                      <MapPin className="h-4 w-4 text-amber-700" />
                      <span className="text-sm font-semibold text-amber-900">Studio Locations</span>
                    </div>
                    <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Choose Your Studio</h2>
                    <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                      Each location carries the Barre 57 method, with its own neighborhood energy and format offerings.
                    </p>
                  </div>

                  <div className="mt-12 grid gap-8 md:grid-cols-2">
                    {studios.map((studio, index) => (
                      <motion.div
                        key={studio.name}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.5, delay: index * 0.12 }}
                        className="group overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white/95 to-slate-50/60 shadow-sm transition-all duration-300 hover:shadow-2xl"
                      >
                        <div className="space-y-6 p-8">
                          <div className="flex items-start gap-6">
                            <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                              <Building2 className="relative z-10 h-8 w-8 text-white" />
                              <div className="absolute inset-0 rounded-2xl bg-white/20" />
                            </div>
                            <div className="flex-1">
                              <h3 className="mb-2 text-2xl font-bold text-foreground transition-colors group-hover:text-blue-900">{studio.name}</h3>
                              <p className="text-sm leading-relaxed text-muted-foreground">{studio.description}</p>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-white/80 p-6 text-sm shadow-sm backdrop-blur-sm">
                            {[
                              { icon: MapPin, title: "Location", value: studio.neighborhood },
                              { icon: Phone, title: "Phone", value: studio.phone },
                              { icon: Clock, title: "Hours", value: studio.hours },
                              { icon: Building2, title: "Address", value: studio.address },
                            ].map((item) => {
                              const ItemIcon = item.icon
                              return (
                                <div key={item.title} className="flex items-start gap-3">
                                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 shadow-sm">
                                    <ItemIcon className="h-5 w-5 text-blue-900" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="mb-1 font-bold text-blue-900">{item.title}</p>
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
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl"
                          >
                            <MapPin className="h-4 w-4" />
                            Get Directions
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* BARRE WORKOUT SECTION */}
                <section className="mt-20 space-y-12 pb-2">
                  <div className="mx-auto max-w-5xl">
                    <h2 className="mb-8 text-4xl font-bold text-foreground md:text-5xl">Our Barre Workout</h2>
                  </div>

                  <div className="mx-auto max-w-6xl">
                    {/* Workout Section Tabs */}
                    <div className="mb-8 flex flex-wrap gap-3 border-b border-slate-200">
                      {BARRE_WORKOUT_SECTIONS.map((section, sectionIndex) => (
                        <button
                          key={section.title}
                          onClick={() => {
                            setSelectedWorkoutSection(sectionIndex)
                            setSelectedExercise(0)
                          }}
                          className={cn(
                            "px-6 py-3 text-lg font-semibold transition-all duration-300",
                            selectedWorkoutSection === sectionIndex
                              ? "border-b-2 border-rose-500 text-rose-600"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {section.title}
                        </button>
                      ))}
                    </div>

                    {/* Exercises Accordion and Display */}
                    <div className="grid gap-8 md:grid-cols-3">
                      {/* Exercises Accordion */}
                      <div className="md:col-span-1 space-y-2">
                        {BARRE_WORKOUT_SECTIONS[selectedWorkoutSection].exercises.map((exercise, exerciseIndex) => (
                          <button
                            key={exercise.name}
                            onClick={() => setSelectedExercise(exerciseIndex)}
                            className={cn(
                              "w-full rounded-xl border-2 p-4 text-left transition-all duration-300",
                              selectedExercise === exerciseIndex
                                ? "border-rose-400 bg-gradient-to-r from-rose-50 to-slate-50"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            )}
                          >
                            <p className={cn(
                              "font-semibold",
                              selectedExercise === exerciseIndex ? "text-rose-600" : "text-slate-900"
                            )}>
                              {exercise.name}
                            </p>
                          </button>
                        ))}
                      </div>

                      {/* Exercise Details */}
                      <div className="md:col-span-2">
                        {(() => {
                          const exercise = BARRE_WORKOUT_SECTIONS[selectedWorkoutSection].exercises[selectedExercise]
                          return (
                            <motion.div
                              key={exercise.name}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-white/95 to-slate-50/60 p-6 shadow-sm"
                            >
                              {/* Exercise GIF */}
                              <div className="overflow-hidden rounded-xl bg-slate-900">
                                <img
                                  src={exercise.gif}
                                  alt={exercise.name}
                                  className="w-full"
                                  onError={(e) => {
                                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23e2e8f0' width='400' height='400'/%3E%3C/svg%3E"
                                  }}
                                />
                              </div>

                              {/* Exercise Title */}
                              <div>
                                <h3 className="text-2xl font-bold text-foreground">{exercise.name}</h3>
                              </div>

                              {/* Steps */}
                              <div>
                                <h4 className="mb-3 font-semibold text-foreground">Steps:</h4>
                                <ol className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                                  {exercise.steps.map((step, stepIndex) => (
                                    <li key={stepIndex} className="ml-5 list-decimal">
                                      {step}
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              {/* Barre Tips */}
                              <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
                                <p className="text-sm font-semibold text-rose-900 mb-1">Barre Tips:</p>
                                <p className="text-sm text-rose-800">{exercise.tips}</p>
                              </div>

                              {/* Targets */}
                              <div>
                                <p className="mb-2 text-sm font-semibold text-foreground">Targets:</p>
                                <div className="flex flex-wrap gap-2">
                                  {exercise.targets.map((target) => (
                                    <span
                                      key={target}
                                      className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700"
                                    >
                                      {target}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </section>

                {/* MEMBER REVIEWS SECTION */}
                <section className="mt-20 space-y-12 pb-2">
                  <div className="mx-auto max-w-5xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-600/20 bg-gradient-to-r from-rose-600/10 to-rose-200/50 px-4 py-2 backdrop-blur-sm">
                      <Heart className="h-4 w-4 text-rose-700" />
                      <span className="text-sm font-semibold text-rose-900">Member Stories</span>
                    </div>
                    <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">What Our Members Say</h2>
                    <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">Real transformations, real results, real people.</p>
                  </div>

                  <div className="relative mt-12 overflow-hidden">
                    <div className="mx-auto max-w-7xl px-4">
                      <div className="relative h-96 md:h-80">
                        {/* Fixed position for left card */}
                        <motion.div
                          layoutId={`review-left`}
                          key={`left-${(currentReview - 1 + clientReviews.length) % clientReviews.length}`}
                          initial={{ opacity: 0, x: 100 }}
                          animate={{ opacity: 0.4, x: 0, scale: 0.85 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ duration: 0.7, ease: "easeInOut" }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block w-72"
                        >
                          <div className="rounded-2xl border border-slate-200 bg-white/60 p-6 shadow-lg backdrop-blur-sm h-64 flex flex-col justify-between pointer-events-none">
                            <div>
                              <p className="mb-3 text-sm italic leading-relaxed text-muted-foreground line-clamp-4">
                                "{clientReviews[(currentReview - 1 + clientReviews.length) % clientReviews.length]?.review}"
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-foreground">{clientReviews[(currentReview - 1 + clientReviews.length) % clientReviews.length]?.name}</p>
                              <p className="text-xs text-muted-foreground">{clientReviews[(currentReview - 1 + clientReviews.length) % clientReviews.length]?.class}</p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Fixed position for center card (highlighted) */}
                        <motion.div
                          layoutId={`review-center`}
                          key={`center-${currentReview}`}
                          initial={{ opacity: 0, x: 100, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -100, scale: 0.9 }}
                          transition={{ duration: 0.7, ease: "easeInOut" }}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-md"
                        >
                          <div className="rounded-3xl border-2 border-rose-200 bg-gradient-to-br from-white/95 via-rose-50/30 to-white/90 p-8 shadow-2xl backdrop-blur-md h-80 flex flex-col justify-between">
                            <div>
                              <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-lg font-bold text-white shadow-lg">
                                  {clientReviews[currentReview]?.name.charAt(0)}
                                </div>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <Heart key={index} className="h-4 w-4 fill-rose-500 text-rose-500" />
                                  ))}
                                </div>
                              </div>
                              <p className="mb-3 text-base italic leading-relaxed text-foreground">"{clientReviews[currentReview]?.review}"</p>
                            </div>
                            <div>
                              <p className="text-base font-bold text-foreground">{clientReviews[currentReview]?.name}</p>
                              <p className="text-sm font-semibold text-rose-600">{clientReviews[currentReview]?.class}</p>
                              <p className="text-xs text-muted-foreground">{clientReviews[currentReview]?.date}</p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Fixed position for right card */}
                        <motion.div
                          layoutId={`review-right`}
                          key={`right-${(currentReview + 1) % clientReviews.length}`}
                          initial={{ opacity: 0, x: 100 }}
                          animate={{ opacity: 0.4, x: 0, scale: 0.85 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ duration: 0.7, ease: "easeInOut" }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:block w-72"
                        >
                          <div className="rounded-2xl border border-slate-200 bg-white/60 p-6 shadow-lg backdrop-blur-sm h-64 flex flex-col justify-between pointer-events-none">
                            <div>
                              <p className="mb-3 text-sm italic leading-relaxed text-muted-foreground line-clamp-4">
                                "{clientReviews[(currentReview + 1) % clientReviews.length]?.review}"
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-foreground">{clientReviews[(currentReview + 1) % clientReviews.length]?.name}</p>
                              <p className="text-xs text-muted-foreground">{clientReviews[(currentReview + 1) % clientReviews.length]?.class}</p>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Navigation Dots */}
                      <div className="mt-12 flex flex-wrap justify-center gap-2">
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

                {/* FAQs SECTION */}
                <section className="mt-20 space-y-12 pb-2">
                  <div className="mx-auto max-w-5xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/10 to-slate-200/50 px-4 py-2 backdrop-blur-sm">
                      <Info className="h-4 w-4 text-blue-900" />
                      <span className="text-sm font-semibold text-blue-900">Questions</span>
                    </div>
                    <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Helpful Answers Before You Book</h2>
                    <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                      Everything you need before your first class.
                    </p>
                  </div>

                  <div className="mt-12 space-y-4">
                    {ALL_FAQS.map((faq, index) => (
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
                          Read fullwaiver
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      {/* All FAQs Modal */}
      <ModalShell open={showAllFaqsModal} onClose={() => setShowAllFaqsModal(false)} className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold">All FAQs</h3>
          <button onClick={() => setShowAllFaqsModal(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-3">
          {ALL_FAQS.map((faq, index) => (
            <div key={index} className="rounded-xl border border-slate-200/50 bg-white/40 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-white/20"
              >
                <h4 className="font-semibold text-foreground pr-4">{faq.question}</h4>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-300 text-muted-foreground",
                    openFaq === index && "rotate-180"
                  )}
                />
              </button>
              {openFaq === index && (
                <div className="border-t border-slate-200/30 px-4 py-3 space-y-2">
                  {faq.answer.map((answer, ansIndex) => (
                    <p key={ansIndex} className="text-sm text-muted-foreground leading-relaxed">
                      {answer}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <Button onClick={() => setShowAllFaqsModal(false)} className="mt-6 w-full bg-blue-900 hover:bg-blue-950">
          Close
        </Button>
      </ModalShell>

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
