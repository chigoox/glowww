'use client'
import React, { useEffect, useState } from 'react'
import { AdminMenu } from "./Componets/Menu/AdminMenu"
import AdminBody from "./Componets/Pages/AdminBody"
import AuthWrapper from '@/app/General/AuthWrapper'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore';
import { AUTH, DATABASE } from '@/Firebase'
export const Admin = () => {
    const {push} = useRouter()
    const [selectedMenu, setSelectedMenu] = useState('Home')
    const [owner, setOwner] = useState(null);
    const [ownerData, setOwnerData] = useState(null);
    const [loading, setLoading] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(null)
  
   const router = useRouter()
  
  useEffect(() => {
      const unsubscribe = onAuthStateChanged(AUTH, async (currentUser) => {
        setOwner(currentUser);
        console.log(currentUser)
        try {
          // Fetch user-specific data from Firestore
          const userDocRef = doc(DATABASE, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
  
          if (userDoc.exists()) {
              setOwnerData(userDoc.data());
          } else {
            console.error('No user data found!');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      });
  
      return () => unsubscribe();
    }, [router, selectedMenu]);

  // Initialize admin menu and deep link from URL (?adminMenu=Products&productId=xyz)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const menu = sp.get('adminMenu');
      const pid = sp.get('productId');
      if (menu) setSelectedMenu(menu);
      if (pid) setSelectedProductId(pid);
    } catch {}
  }, [])
    return (
        <AuthWrapper>
        <main className="lg:flex" >
            <AdminMenu ownerData={ownerData}  selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} />
            <AdminBody owner={owner} ownerData={ownerData} selectedMenu={selectedMenu} selectedProductId={selectedProductId} />
        </main>
    </AuthWrapper>

    )
}