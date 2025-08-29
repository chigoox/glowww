"use client"
import React, { useEffect, useState } from "react"
import AdminMenuItem from "./AdminMenuItem"
import { HomeIcon, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import useIsMobile from "../../../../Hooks/useIsMobile"
import { websiteName } from "@/app/GLOBALVARIABLES"

export const menu = [
  "Home",
  { name: "Orders", menus: ["All Orders", "Abandoned", "Refunds"] },
  { name: "Products", menus: ["All Products", "Collections", "Inventory"] },
  { name: "Customers", menus: ["All Customers", "Segments"] },
  "Categories&Collections",
  "Discount",
  "Shipping",
  "Settings",
]

const STORAGE_KEY = "admin-nav-open"

export const AdminMenu = ({ setSelectedMenu, selectedMenu, ownerData, showMobileMenu, setShowMobileMenu }) => {
  const onMobile = useIsMobile()
  const [showMenu, setShowMenu] = useState(true)
  const { push } = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    setShowMenu(saved ? saved === "1" : !onMobile)
  }, [onMobile])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, showMenu ? "1" : "0")
  }, [showMenu])

  // Handle mobile menu visibility
  const isMenuVisible = onMobile ? showMobileMenu : showMenu

  return (
    <aside
      className={`Navigator bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800
                  ${isMenuVisible ? "w-full lg:w-64" : "w-full lg:w-16"} 
                  ${onMobile ? 'fixed inset-0 z-50 lg:relative lg:inset-auto' : 'lg:relative'} 
                  transition-[width] duration-300 ease-out px-3 py-4`}
      aria-label="Primary"
      style={{ display: onMobile && !showMobileMenu ? 'none' : 'block' }}
    >
      {/* Mobile overlay */}
      {onMobile && showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/50 lg:hidden" 
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      
      {/* Sidebar content */}
      <div className={`${onMobile && showMobileMenu ? 'relative z-10 bg-white dark:bg-neutral-900 h-full' : ''}`}>
        {/* Header pill */}
        <div className="mb-6">
          <div className="mx-1 h-12 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-600/20 dark:to-purple-600/20 border border-blue-100 dark:border-blue-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-blue-500/10" />
            <div className="relative flex items-center gap-3 px-3 h-full">
              <div className="size-7 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-500 shadow-sm" />
              {isMenuVisible && (
                <div className="truncate">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">{websiteName}</p>
                  <p className="text-xs text-neutral-600 dark:text-gray-400">E-commerce</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="overflow-y-auto overscroll-contain pb-4 flex flex-col lg:h-[calc(100dvh-10.5rem)] pr-1 lg:pb-24 mt-4">
          <div className="space-y-1">
            {menu.map((item, i) => (
              <AdminMenuItem
                key={(typeof item === "string" ? item : item.name) + i}
                onMobile={onMobile}
                showMenu={isMenuVisible}
                setShowMenu={onMobile ? setShowMobileMenu : setShowMenu}
                setSelectedMenu={setSelectedMenu}
                selectedMenu={selectedMenu}
                menuItem={item}
              />
            ))}
          </div>
        </nav>

        {/* Footer actions */}
        <div className="lg:absolute lg:bottom-3 left-0 right-0 px-2 space-y-2">
          {!useIsMobile() && (
            <div className={`h-0 lg:h-auto space-y-2`}>
              <button
                type="button"
                onClick={() => setShowMenu((v) => !v)}
                title={isMenuVisible ? "Collapse" : "Expand"}
                className="w-full h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/50 text-neutral-600 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Menu className="size-4" />
                {isMenuVisible && <span className="text-sm font-medium">Collapse</span>}
              </button>

              <button
                onClick={() => push("/")}
                className="w-full h-10 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-600/20 dark:to-purple-600/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-200 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-600/30 dark:hover:to-purple-600/30 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <HomeIcon className="size-4" />
                {isMenuVisible && <span className="text-sm font-semibold">{websiteName}</span>}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
