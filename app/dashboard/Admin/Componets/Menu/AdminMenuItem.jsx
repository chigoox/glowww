"use client"
import React, { useMemo, useState } from "react"
import {
  Calendar1Icon,
  BookAIcon,
  Edit2Icon,
  Settings,
  Truck,
  BadgePercent,
  UsersRound,
  Boxes,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { AiFillHome, AiOutlineDollar } from "react-icons/ai"

const AdminMenuItem = ({
  showMenu,
  menuItem,
  setSelectedMenu,
  selectedMenu,
  setShowMenu,
  onMobile,
}) => {
  const mainMenuName = menuItem.name || menuItem
  const hasSubmenus = menuItem.menus && Array.isArray(menuItem.menus)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const icon = useMemo(
    () => ({
      Home: <AiFillHome size={20} />,
      Orders: <Calendar1Icon size={20} />,
      Products: <BookAIcon size={20} />,
      Customers: <UsersRound size={20} />,
      "Categories&Collections": <Edit2Icon size={20} />,
      Discount: <BadgePercent size={20} />,
      Shipping: <Truck size={20} />,
      Settings: <Settings size={20} />,
      Inventory: <Boxes size={20} />,
    }),
    []
  )

  const isActive = selectedMenu === mainMenuName
  const isSubActive = hasSubmenus && menuItem.menus.includes(selectedMenu)

  const handleMainClick = () => {
    if (hasSubmenus && showMenu) {
      setIsExpanded(!isExpanded)
    } else {
      setSelectedMenu(mainMenuName)
      if (onMobile && showMenu) setShowMenu(false)
    }
  }

  const handleSubClick = (submenu) => {
    setSelectedMenu(submenu)
    if (onMobile && showMenu) setShowMenu(false)
  }

  // Auto-expand if a submenu is selected
  React.useEffect(() => {
    if (hasSubmenus && menuItem.menus.includes(selectedMenu)) {
      setIsExpanded(true)
    }
  }, [selectedMenu, hasSubmenus, menuItem.menus])

  return (
    <div className="mb-1">
      {/* Main Menu Item */}
      <button
        type="button"
        onClick={handleMainClick}
        aria-current={isActive ? "page" : undefined}
        title={!showMenu ? mainMenuName : undefined}
        className={`group w-full rounded-lg relative overflow-hidden
                    ${showMenu ? "px-3 py-2.5" : "p-2.5"} flex items-center justify-between
                    transition-all duration-200 ease-out
                    ${isActive || isSubActive 
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10 text-neutral-900 dark:text-white border border-blue-200 dark:border-blue-500/20 shadow-sm" 
                      : "text-neutral-600 dark:text-gray-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-gray-300"
                    }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 transition-colors ${isActive || isSubActive ? "text-blue-600 dark:text-blue-400" : ""}`}>
            {icon[mainMenuName] || <AiOutlineDollar size={20} />}
          </span>
          {showMenu && (
            <span className="truncate text-sm font-medium">{mainMenuName}</span>
          )}
        </div>
        
        {/* Chevron for expandable items */}
        {hasSubmenus && showMenu && (
          <span className={`shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""} text-neutral-400 dark:text-neutral-500`}>
            <ChevronRight size={16} />
          </span>
        )}
      </button>

      {/* Submenu Items */}
      {hasSubmenus && showMenu && (
        <div className={`mt-1 ml-4 space-y-1 transition-all duration-300 ease-out overflow-hidden ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          {menuItem.menus.map((submenu, index) => (
            <button
              key={submenu + index}
              type="button"
              onClick={() => handleSubClick(submenu)}
              aria-current={selectedMenu === submenu ? "page" : undefined}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-150 transform hover:scale-[1.02]
                          ${selectedMenu === submenu 
                            ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium border-l-2 border-blue-500 shadow-sm" 
                            : "text-neutral-500 dark:text-gray-500 hover:text-neutral-700 dark:hover:text-gray-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                          }`}
            >
              {submenu}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminMenuItem
