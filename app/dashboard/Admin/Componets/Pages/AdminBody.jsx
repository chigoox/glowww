// NextUI removed; replace components locally as needed
import { useState } from 'react'
import { menu } from '../Menu/AdminMenu'
import AdminCatCol from './AdminCatCol'
import AdminCustomers from './AdminCustomers'
import AdminDiscount from './AdminDiscount'
import { AdminOrders } from './AdminOrders'
import { AdminProduct } from './AdminProduct'
import AdminShipping from './AdminShipping'

const AdminBody = ({ selectedMenu, owner, ownerData, selectedProductId }) => {
const [WebsiteEditorData, setWebsiteEditorData] = useState({})





    return (
        <div className={`Body md: py-10  px-7 left-4 md:left-0 trans relative h-screen overflow-hidden   w-full bg-white`}>
            <h1 className="font-bold  sm:left-0 lg:left-0 md:left-2 relative font-2xl text-black">{selectedMenu}</h1>
            <div className="w-full max-h-full h-auto p-1 mt-5 min-h-32  rounded">
                {selectedMenu == menu[0].name && <AdminOrders OWNER={ownerData}/>}
                {selectedMenu == menu[1].name && <AdminProduct SITEINFO={ownerData?.siteInfo} productId={selectedProductId} />}
                {selectedMenu == menu[2].name && <AdminCustomers />}
                {selectedMenu == menu[3] && <AdminCatCol SITEINFO={ownerData?.siteInfo} />}
                {selectedMenu == menu[4] && <AdminDiscount SITEINFO={ownerData?.siteInfo} OWNER={ownerData}/>}
                {selectedMenu == menu[5] && <AdminShipping owner={owner} ownerData={ownerData} />}

            </div>
        </div>
    )
}

export default AdminBody