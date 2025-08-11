"use client"
import React, { useMemo } from "react"
import {
  Calendar1Icon,
  BookAIcon,
  Edit2Icon,
  Settings,
  Truck,
  BadgePercent,
  UsersRound,
  Boxes,
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
  console.log(mainMenuName)
  const icon = useMemo(
    () => ({
      Home: <AiFillHome size={22} />,
      Orders: <Calendar1Icon size={22} />,
      Products: <BookAIcon size={22} />,
      Customers: <UsersRound size={22} />,
      AdminCatCol: <Edit2Icon size={22} />,
      Discount: <BadgePercent size={22} />,
      Shipping: <Truck size={22} />,
      Settings: <Settings size={22} />,
      Inventory: <Boxes size={22} />,
    }),
    []
  )

  const isActive = selectedMenu === mainMenuName

  const handleClick = () => {
    setSelectedMenu(mainMenuName)
    if (onMobile && showMenu) setShowMenu(false)
  }

  return (
    <div className="px-1">
      <button
        type="button"
        onClick={handleClick}
        aria-current={isActive ? "page" : undefined}
        title={!showMenu ? mainMenuName : undefined}
        className={`group w-full mt-2 rounded-xl relative overflow-hidden
                    ${showMenu ? "p-3" : "p-2"} flex items-center gap-3
                     border-neutral-700 text-gray-400
                    hover:bg-neutral-500 transition-colors`}
      >
        {/* active accent strip */}
        <span
          className={`absolute inset-y-0 left-0 w-full  transition-all ${
            isActive ? "bg-gradient-to-b from-black  to-gray-900" : "bg-neutral-700"
          }`}
        />
        <span className="shrink-0  opacity-90">
          {icon[mainMenuName] || <AiOutlineDollar size={22} />}
        </span>
        {showMenu && (
          <span className="truncate text-sm text-white font-semibold">{mainMenuName}</span>
        )}
      </button>
    </div>
  )
}

export default AdminMenuItem
