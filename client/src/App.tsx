import { useEffect, useState } from "react"
import { Physique57SignUpForm } from "@/components/physique57-sign-up-form"
import { Barre57TrialForm } from "@/components/barre57-trial-form"

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Check if the path is /barre
  if (currentPath === "/barre" || currentPath.startsWith("/barre/")) {
    return <Barre57TrialForm />
  }

  return <Physique57SignUpForm />
}

