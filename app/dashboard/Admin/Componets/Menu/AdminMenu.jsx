"use client"
import React, { useEffect, useState } from "react"
import AdminMenuItem from "./AdminMenuItem"
import { HomeIcon, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import useIsMobile from "../../../../Hooks/useIsMobile"
import { websiteName } from "@/app/GLOBALVARIABLES"

export const menu = [
  { name: "Orders", menus: ["All Orders", "Abandoned", "Refunds"] },
  { name: "Products", menus: ["All Products", "Collections", "Inventory"] },
  { name: "Customers", menus: ["All Customers", "Segments"] },
  "Categories&Collections",
  "Discount",
  "Shipping",
  "Settings",
]

const STORAGE_KEY = "admin-nav-open"

export const AdminMenu = ({ setSelectedMenu, selectedMenu, ownerData }) => {
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

  return (
    <aside
      className={`Navigator ${showMenu ? "w-72 lg:w-64" : "w-16"} 
                  fixed lg:relative top-0 left-0 h-[100dvh] z-50
                   border-neutral-800
                  transition-[width] duration-300 ease-out px-2`}
      aria-label="Primary"
    >
      {/* Header pill */}
      <div className="mt-4 mb-4">
        <div className="mx-1 h-12 rounded-2xl bg-black border border-neutral-700 relative overflow-hidden">
          <div className="absolute inset-0 opacity-70 pointer-events-none bg-gradient-to-r from-indigo-500/30 via-fuchsia-500/30 to-indigo-500/30" />
          <div className="relative flex items-center gap-3 px-3 h-full">
            <div className="size-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500" />
            {showMenu && (
              <div className="truncate">
                <p className="text-sm font-semibold text-neutral-100">{websiteName}</p>
                <p className="text-[11px] text-neutral-400">Admin Console</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="overflow-y-auto overscroll-contain h-[calc(100dvh-10.5rem)] pr-1 pb-24 custom-scroll">
        {menu.map((item, i) => (
          <AdminMenuItem
            key={(typeof item === "string" ? item : item.name) + i}
            onMobile={onMobile}
            showMenu={showMenu}
            setShowMenu={setShowMenu}
            setSelectedMenu={setSelectedMenu}
            selectedMenu={selectedMenu}
            menuItem={item}
          />
        ))}
      </nav>

      {/* Footer actions */}
      <div className="absolute bottom-3 left-0 right-0 px-2 space-y-2">
        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          title={showMenu ? "Collapse" : "Expand"}
          className="w-full h-10 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-200 hover:bg-neutral-750/80 transition-colors flex items-center justify-center gap-2"
        >
          <Menu className="size-5" />
          {showMenu && <span className="text-sm font-medium">Collapse</span>}
        </button>

        <button
          onClick={() => push("/")}
          className="w-full h-10 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-100 hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
        >
          <HomeIcon className="size-5" />
          {showMenu && <span className="text-sm font-semibold">{websiteName}</span>}
        </button>
      </div>
    </aside>
  )
}
