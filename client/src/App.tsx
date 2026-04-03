import { useEffect, useState } from "react"
import { Physique57SignUpForm } from "@/components/physique57-sign-up-form"
import { Barre57TrialForm } from "@/components/barre57-trial-form"

const BRAND_LOGO_URL = "https://i.postimg.cc/6Qt8YppB/Photoroom_20251014_101748.png"

const routeMeta = {
  default: {
    title: "Physique57 — Start Your Trial",
    description:
      "Book your Physique 57 India trial class and explore premium boutique fitness experiences across Barre, Strength Lab, and powerCycle.",
  },
  barre: {
    title: "Barre 57 — Book Your Free Trial",
    description:
      "Book your complimentary Barre 57 trial and discover Physique 57 India's signature boutique fitness experience.",
  },
} as const

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null

  if (!element) {
    element = document.createElement("meta")
    const [attrName, attrValue] = selector
      .replace("meta[", "")
      .replace("]", "")
      .split("=")
      .map((part) => part.replace(/['\"]/g, ""))

    if (attrName && attrValue) {
      element.setAttribute(attrName, attrValue)
    }
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value)
  })
}

function upsertLink(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLLinkElement | null

  if (!element) {
    element = document.createElement("link")
    const [attrName, attrValue] = selector
      .replace("link[", "")
      .replace("]", "")
      .split("=")
      .map((part) => part.replace(/['\"]/g, ""))

    if (attrName && attrValue) {
      element.setAttribute(attrName, attrValue)
    }
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value)
  })
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const meta = currentPath === "/barre" || currentPath.startsWith("/barre/")
      ? routeMeta.barre
      : routeMeta.default

    document.title = meta.title

    upsertMeta("meta[name='description']", { name: "description", content: meta.description })
    upsertMeta("meta[property='og:title']", { property: "og:title", content: meta.title })
    upsertMeta("meta[property='og:description']", { property: "og:description", content: meta.description })
    upsertMeta("meta[property='og:image']", { property: "og:image", content: BRAND_LOGO_URL })
    upsertMeta("meta[property='og:image:alt']", { property: "og:image:alt", content: "Physique 57 India logo" })
    upsertMeta("meta[name='twitter:title']", { name: "twitter:title", content: meta.title })
    upsertMeta("meta[name='twitter:description']", { name: "twitter:description", content: meta.description })
    upsertMeta("meta[name='twitter:image']", { name: "twitter:image", content: BRAND_LOGO_URL })
    upsertMeta("meta[name='twitter:image:alt']", { name: "twitter:image:alt", content: "Physique 57 India logo" })
    upsertLink("link[rel='icon']", { rel: "icon", type: "image/png", href: BRAND_LOGO_URL })
    upsertLink("link[rel='shortcut icon']", { rel: "shortcut icon", href: BRAND_LOGO_URL })
    upsertLink("link[rel='apple-touch-icon']", { rel: "apple-touch-icon", href: BRAND_LOGO_URL })
  }, [currentPath])

  // Check if the path is /barre
  if (currentPath === "/barre" || currentPath.startsWith("/barre/")) {
    return <Barre57TrialForm />
  }

  return <Physique57SignUpForm />
}

