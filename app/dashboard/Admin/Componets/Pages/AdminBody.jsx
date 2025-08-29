// NextUI removed; replace components locally as needed - Updated
import { useState } from 'react'
import { menu } from '../Menu/AdminMenu'
import AdminCatCol from './AdminCatCol'
import AdminCustomers from './AdminCustomers'
import AdminDiscount from './AdminDiscount'
import { AdminOrders } from './AdminOrders'
import { AdminProduct } from './AdminProduct'
import AdminShipping from './AdminShipping'
import { Menu } from 'lucide-react'
import useIsMobile from '../../../../Hooks/useIsMobile'
import { Card, Row, Col, Statistic } from 'antd'
import { ShoppingOutlined, DollarOutlined, UserOutlined, AppstoreOutlined } from '@ant-design/icons'

const AdminBody = ({ selectedMenu, owner, ownerData, selectedProductId, onMenuToggle }) => {
  const [WebsiteEditorData, setWebsiteEditorData] = useState({})
  const onMobile = useIsMobile()

  return (
    <div className="flex-1 min-h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-neutral-950 dark:to-neutral-900">
      {/* Mobile Header with Menu Toggle */}
      {onMobile && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 lg:hidden">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <Menu size={20} />
          </button>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">{selectedMenu}</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="w-full">
          {/* Page Header - Desktop Only */}
          {!onMobile && (
            <div className="p-6 lg:p-8 pb-0">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">{selectedMenu}</h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                {selectedMenu === "Home" ? "Overview of your e-commerce operations" :
                 selectedMenu === "Orders" ? "Manage and track customer orders" :
                 selectedMenu === "Products" ? "Manage your product catalog" :
                 selectedMenu === "Customers" ? "View and manage customer information" :
                 `Manage your ${selectedMenu.toLowerCase()}`}
              </p>
            </div>
          )}

          {/* Content */}
          <div className="p-6 lg:p-8 pt-6">
            {selectedMenu === "Home" && (
              <div className="space-y-8">
                {/* Quick Stats */}
                <Row gutter={[24, 24]} className="max-w-7xl mx-auto">
                  <Col xs={24} sm={12} lg={6}>
                    <Card 
                      className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                      style={{ borderRadius: 16 }}
                    >
                      <Statistic
                        title={<span className="text-neutral-600 dark:text-neutral-400">Total Orders</span>}
                        value={156}
                        prefix={<ShoppingOutlined className="text-blue-500" />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card 
                      className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                      style={{ borderRadius: 16 }}
                    >
                      <Statistic
                        title={<span className="text-neutral-600 dark:text-neutral-400">Revenue</span>}
                        value={12580}
                        precision={2}
                        prefix={<DollarOutlined className="text-green-500" />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card 
                      className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                      style={{ borderRadius: 16 }}
                    >
                      <Statistic
                        title={<span className="text-neutral-600 dark:text-neutral-400">Customers</span>}
                        value={89}
                        prefix={<UserOutlined className="text-purple-500" />}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card 
                      className="hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                      style={{ borderRadius: 16 }}
                    >
                      <Statistic
                        title={<span className="text-neutral-600 dark:text-neutral-400">Products</span>}
                        value={24}
                        prefix={<AppstoreOutlined className="text-orange-500" />}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Quick Actions */}
                <div className="max-w-7xl mx-auto">
                  <Card 
                    title={<span className="text-neutral-900 dark:text-white text-lg font-semibold">Quick Actions</span>}
                    className="shadow-lg bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                    style={{ borderRadius: 16 }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Card 
                          className="text-center hover:shadow-md transition-all cursor-pointer bg-neutral-50 dark:bg-neutral-700 border-blue-100 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          style={{ borderRadius: 12 }}
                        >
                          <ShoppingOutlined className="text-2xl text-blue-500 mb-3" />
                          <h3 className="font-semibold mb-2 text-neutral-800 dark:text-neutral-200">View Orders</h3>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">Check recent orders and their status</p>
                        </Card>
                      </Col>
                      <Col xs={24} md={8}>
                        <Card 
                          className="text-center hover:shadow-md transition-all cursor-pointer bg-neutral-50 dark:bg-neutral-700 border-green-100 dark:border-green-800 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                          style={{ borderRadius: 12 }}
                        >
                          <AppstoreOutlined className="text-2xl text-green-500 mb-3" />
                          <h3 className="font-semibold mb-2 text-neutral-800 dark:text-neutral-200">Add Product</h3>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">Add new products to your catalog</p>
                        </Card>
                      </Col>
                      <Col xs={24} md={8}>
                        <Card 
                          className="text-center hover:shadow-md transition-all cursor-pointer bg-neutral-50 dark:bg-neutral-700 border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          style={{ borderRadius: 12 }}
                        >
                          <UserOutlined className="text-2xl text-purple-500 mb-3" />
                          <h3 className="font-semibold mb-2 text-neutral-800 dark:text-neutral-200">Customer Insights</h3>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">View customer analytics and data</p>
                        </Card>
                      </Col>
                    </Row>
                  </Card>
                </div>
              </div>
            )}
            
            <div className="max-w-7xl mx-auto">
              {(selectedMenu === "Orders" || selectedMenu === "All Orders" || selectedMenu === "Abandoned" || selectedMenu === "Refunds") && (
                <Card 
                  className="shadow-lg bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  style={{ borderRadius: 16 }}
                >
                  <AdminOrders OWNER={ownerData} />
                </Card>
              )}
              
              {(selectedMenu === "Products" || selectedMenu === "All Products" || selectedMenu === "Collections" || selectedMenu === "Inventory") && (
                <Card 
                  className="shadow-lg bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  style={{ borderRadius: 16 }}
                >
                  <AdminProduct SITEINFO={ownerData?.siteInfo} productId={selectedProductId} />
                </Card>
              )}
              
              {(selectedMenu === "Customers" || selectedMenu === "All Customers" || selectedMenu === "Segments") && (
                <Card 
                  className="shadow-lg bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  style={{ borderRadius: 16 }}
                >
                  <AdminCustomers />
                </Card>
              )}
              
              {selectedMenu === "Categories&Collections" && (
                <Card 
                  className="shadow-lg bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  style={{ borderRadius: 16 }}
                >
                  <AdminCatCol SITEINFO={ownerData?.siteInfo} />
                </Card>
              )}
              
              {selectedMenu === "Discount" && (
                <Card 
                  className="shadow-lg bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  style={{ borderRadius: 16 }}
                >
                  <AdminDiscount SITEINFO={ownerData?.siteInfo} OWNER={ownerData} />
                </Card>
              )}
              
              {selectedMenu === "Shipping" && (
                <Card 
                  className="shadow-lg bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  style={{ borderRadius: 16 }}
                >
                  <AdminShipping owner={owner} ownerData={ownerData} />
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminBody