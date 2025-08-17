"use client"
import AvailabilitySelector from '../Support/AvailabilitySelector';
import CategoryUploader from "../Support/CategoryUploader";
import { generate, green, presetPalettes, red } from "@ant-design/colors";
// Removed NextUI components to avoid extra UI deps
import {
  Button,
  ColorPicker,
  Dropdown,
  Input,
  Menu,
  Modal,
  Upload,
  theme,
  Card,
  Select,
  Divider,
  Empty,
  Table,
  Tabs,
} from "antd";
import ImgCrop from "antd-img-crop";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RWebShare } from "react-web-share";

import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { STORAGE } from "../../../../../Firebase";
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';

import { CollapsibleSection, CollapsibleSectionMain } from "@/app/HomePage/BookingInfo";
import { useUploader } from "@/app/Hooks/useUploader";
import { addToDoc } from "@/app/myCodes/Database";
import { getAuth } from "firebase/auth";
import { Share2, Plus, Trash2, ImagePlus } from "lucide-react";

import dynamic from "next/dynamic";
// Use existing TinyMCE wrapper (no raw-loader) instead of legacy BundledEditor
const TextEditor = dynamic(() => import("@/app/Components/editor/Tinymce"), {
    ssr: false,
});

import {
  Bebas_Neue,
  Inter,
  Josefin_Sans,
  Lato,
  Merriweather,
  Montserrat,
  Open_Sans,
  Oswald,
  PT_Sans,
  Poppins,
  Quicksand,
  Raleway,
  Roboto,
  Rubik,
  Slabo_27px,
  Source_Code_Pro,
  Space_Mono,
  Syne_Mono,
} from "next/font/google";

import { message } from 'antd';
import PaymentProvidersSettings from "../Componets/Sections/PaymentProvidersSettings";
import { useCart } from '@/contexts/CartContext';



//FONTS
const syne_Mono = Syne_Mono({
  weight: "400",
  subsets: ["latin"],
});
const space_Mono = Space_Mono({
  weight: "400",
  subsets: ["latin"],
});
const bebas_Neue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
});
const josefin_Sans = Josefin_Sans({
  weight: "400",
  subsets: ["latin"],
});
const roboto = Roboto({
  weight: "400",
  subsets: ["latin"],
});
const open_Sans = Open_Sans({
  weight: "400",
  subsets: ["latin"],
});
const lato = Lato({
  weight: "400",
  subsets: ["latin"],
});
const montserrat = Montserrat({
  weight: "400",
  subsets: ["latin"],
});
const oswald = Oswald({
  weight: "400",
  subsets: ["latin"],
});
const source_Code_Pro = Source_Code_Pro({
  weight: "400",
  subsets: ["latin"],
});
const slabo_27px = Slabo_27px({
  weight: "400",
  subsets: ["latin"],
});
const raleway = Raleway({
  weight: "400",
  subsets: ["latin"],
});
const pt_Sans = PT_Sans({
  weight: "400",
  subsets: ["latin"],
});
const merriweather = Merriweather({
  weight: "400",
  subsets: ["latin"],
});
const poppins = Poppins({
  weight: "400",
  subsets: ["latin"],
});
const inter = Inter({
  weight: "400",
  subsets: ["latin"],
});
const quicksand = Quicksand({
  weight: "400",
  subsets: ["latin"],
});
const rubik = Rubik({
  weight: "400",
  subsets: ["latin"],
});
//END FONTS

const genPresets = (presets = presetPalettes) =>
  Object.entries(presets).map(([label, colors]) => ({
    label,
    colors,
  }));

const pageFonts = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Source Sans Pro",
  "Slabo 27px",
  "Raleway",
  "PT Sans",
  "Merriweather",
  "Poppins",
  "Inter",
  "Quicksand",
  "Rubik",
  "Josefin Sans",
  "Bebas Neue",
  "Space Mono",
  "Syne Mono",
];

const user = getAuth();

const WebsiteEditor = ({ SITEINFO }) => {
  const { setSiteScope, setSellerUserId } = useCart?.() || {};
  const [loading, setLoading] = useState(false);
  const [siteInfo, setSiteInfo] = useState(
    SITEINFO || {
      name: "",
      heading: "",
      subHeading: "",
      portfolio: [],
      colors: {
        background: "#ffffff",
        accent: "#000000",
        text: "#333333",
        text2: "#333333",
        text3: "#333333",
      },
      terms: [{ title: "", body: [""] }],
    categories: [{ name: "", image: null }],
    collections: [{ name: "", image: null, productIds: [] }],
      logo: null,
      depositFee: 25,
      apointmentInterveral: 30,
      availability: [],
    }
  );
  const [products, setProducts] = useState([]);
  // Table filters/search
  const [catSearch, setCatSearch] = useState('');
  const [colSearch, setColSearch] = useState('');
  const [colHas, setColHas] = useState('all'); // all | has | empty

const [showTextEditor, setShowTextEditor] = useState(false)
  const [providerState, setProviderState] = useState({ stripe:true, paypal:true });
  const [savingProviders, setSavingProviders] = useState(false);
  const pageFont =
    siteInfo?.font == "Roboto"
      ? roboto
      : siteInfo?.font == "Open Sans"
        ? open_Sans
        : siteInfo?.font == "Lato"
          ? lato
          : siteInfo?.font == "Montserrat"
            ? montserrat
            : siteInfo?.font == "Oswald"
              ? oswald
              : siteInfo?.font == "Source Code Pro"
                ? source_Code_Pro
                : siteInfo?.font == "Slabo 27px"
                  ? slabo_27px
                  : siteInfo?.font == "Raleway"
                    ? raleway
                    : siteInfo?.font == "PT Sans"
                      ? pt_Sans
                      : siteInfo?.font == "Merriweather"
                        ? merriweather
                        : siteInfo?.font == "Poppins"
                          ? poppins
                          : siteInfo?.font == "Inter"
                            ? inter
                            : siteInfo?.font == "Quicksand"
                              ? quicksand
                              : siteInfo?.font == "Rubik"
                                ? rubik
                                : siteInfo?.font == "Josefin Sans"
                                  ? josefin_Sans
                                  : siteInfo?.font == "Bebas Neue"
                                    ? bebas_Neue
                                    : siteInfo?.font == "Space Mono"
                                      ? space_Mono
                                      : siteInfo?.font == "Syne Mono"
                                        ? syne_Mono
                                        : roboto;

  //check for changes and set saved to false if a change is made
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(false);
  }, [siteInfo]);

  useEffect(() => {
    if (!SITEINFO) return;
    setSiteInfo(prev => ({
      ...prev,
      ...SITEINFO,
      categories: Array.isArray(SITEINFO.categories) ? SITEINFO.categories : (prev?.categories || []),
      collections: Array.isArray(SITEINFO.collections) ? SITEINFO.collections : (prev?.collections || []),
    }));
    // Initialize cart multi-tenant scoping early when site info arrives
    try {
      if (SITEINFO?.id && typeof setSiteScope === 'function') setSiteScope(SITEINFO.id);
      if (SITEINFO?.userId && typeof setSellerUserId === 'function') setSellerUserId(SITEINFO.userId);
    } catch {}
  }, [SITEINFO]);

  // Load payment providers (default both on)
  useEffect(()=>{
    if(!SITEINFO?.userId || !SITEINFO?.id) return;
    getDoc(doc(db, 'users', SITEINFO.userId, 'sites', SITEINFO.id)).then(snap => {
      if(snap.exists()) {
        const data = snap.data();
        if(data.paymentProviders && typeof data.paymentProviders==='object') {
          setProviderState({ stripe: data.paymentProviders.stripe !== false, paypal: data.paymentProviders.paypal !== false });
        }
      }
    }).catch(()=>{});
  }, [SITEINFO?.userId, SITEINFO?.id]);

  // Load this user's products for collection picker
  useEffect(() => {
    const auth = getAuth();
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, 'products'),
      where('userId', '==', uid),
      orderBy('created', 'desc')
    );
    const off = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(rows);
    });
    return () => off();
  }, []);

  const [messageApi, contextHolder] = message.useMessage();
const showError = (errorMessage) => {
    messageApi.error({
      content: errorMessage,
      duration: 5,
      style: { marginTop: '20vh' },
    });
  };
  const showSuccess = (successMessage) => {
    messageApi.success({
      content: successMessage,
      duration: 3,
      style: { marginTop: '20vh' },
    });
  };


  const pathname = usePathname();
  const pageOwnerUserName = pathname.replace("/Admin", "").replace("/", "");

  const menu = (
    <Menu
      onClick={(e) => {
        setSiteInfo({ ...siteInfo, font: e.key });
      }}
    >
      {pageFonts.map((font) => (
        <Menu.Item key={font}>{font}</Menu.Item>
      ))}
    </Menu>
  );

  // Derived table rows
  const filteredCategories = useMemo(() => {
    const rows = Array.isArray(siteInfo?.categories) ? siteInfo.categories : [];
    const q = catSearch.trim().toLowerCase();
    return q ? rows.filter(c => (c?.name || '').toLowerCase().includes(q)) : rows;
  }, [siteInfo?.categories, catSearch]);

  const filteredCollections = useMemo(() => {
    let rows = Array.isArray(siteInfo?.collections) ? siteInfo.collections : [];
    const q = colSearch.trim().toLowerCase();
    if (q) rows = rows.filter(c => (c?.name || '').toLowerCase().includes(q));
    if (colHas === 'has') rows = rows.filter(c => (Array.isArray(c?.productIds) ? c.productIds.length : 0) > 0);
    if (colHas === 'empty') rows = rows.filter(c => !Array.isArray(c?.productIds) || c.productIds.length === 0);
    return rows;
  }, [siteInfo?.collections, colSearch, colHas]);

  // Build expanded content for each collection row
  const buildCollectionExpanded = (idx) => {
    const collectionItem = siteInfo?.collections?.[idx] || {};
    return (
      <div className="p-3 bg-gray-50 rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-start">
          <div className="md:col-span-2">
            <div className="text-xs text-gray-600 mb-1">Products</div>
            <Select
              mode="multiple"
              showSearch
              allowClear
              placeholder="Search and select products"
              value={collectionItem.productIds || []}
              onChange={(ids)=> handleCollectionChange(idx, 'productIds', ids)}
              optionFilterProp="label"
              className="w-full"
              options={products.map(p => ({ label: p.name || 'Untitled', value: p.id }))}
              tagRender={({ value, label, closable, onClose }) => {
                const prod = products.find(x => x.id === value)
                const img = Array.isArray(prod?.images) && prod.images[0]
                return (
                  <div className="ant-tag ant-tag-blue ant-tag-has-color inline-flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ marginRight: 4 }}>
                    {img ? <img src={img} alt="" className="w-4 h-4 rounded object-cover" /> : null}
                    <span className="text-xs">{label}</span>
                    <span onClick={onClose} className="cursor-pointer ml-1">×</span>
                  </div>
                )
              }}
              filterOption={(input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase())}
            />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Selected</div>
            <div className="text-xs text-gray-700 min-h-[1.5rem]">
              {Array.isArray(collectionItem.productIds) && collectionItem.productIds.length > 0 ? (
                collectionItem.productIds.map(id => (products.find(p => p.id === id)?.name || id)).join(' • ')
              ) : (
                <span className="text-gray-400">None</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Table columns
  const catColumns = [
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      width: 20,
      render: (val, record) => (
        <ImgCrop aspect={16/9} rotate>
          <Upload
            listType="picture"
            defaultFileList={val ? [{ uid: `cat-${record.index}`, name: 'image', status: 'done', url: val }] : []}
            maxCount={1}
            beforeUpload={(file) => { handleCategoryChange(record.index, 'image', file); return false; }}
          >
            <Button icon={<ImagePlus size={14} />}>Upload</Button>
          </Upload>
        </ImgCrop>
      )
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (val, record) => (
        <Input
          maxLength={48}
          placeholder="Category name"
          value={val}
          onChange={(e)=> handleCategoryChange(record.index, 'name', e.target.value)}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Button danger type="text" icon={<Trash2 size={14} />} onClick={()=> removeCategory(record.index)}>Remove</Button>
      )
    }
  ];

  const colColumns = [
    {
      title: 'Banner',
      dataIndex: 'image',
      key: 'image',
      width: 160,
      render: (val, record) => (
        <ImgCrop aspect={16/9} rotate>
          <Upload
            listType="picture"
            defaultFileList={val ? [{ uid: `col-${record.index}`, name: 'image', status: 'done', url: val }] : []}
            maxCount={1}
            beforeUpload={(file) => { handleCollectionChange(record.index, 'image', file); return false; }}
          >
            <Button icon={<ImagePlus size={14} />}>Upload</Button>
          </Upload>
        </ImgCrop>
      )
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (val, record) => (
        <Input
          maxLength={64}
          placeholder="Collection name"
          value={val}
          onChange={(e)=> handleCollectionChange(record.index, 'name', e.target.value)}
        />
      )
    },
    {
      title: 'Products',
      key: 'count',
      width: 140,
      render: (_, record) => {
        const ids = Array.isArray(siteInfo?.collections?.[record.index]?.productIds) ? siteInfo.collections[record.index].productIds : []
        return <span className="text-gray-700 text-sm">{ids.length} selected</span>
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Button danger type="text" icon={<Trash2 size={14} />} onClick={()=> removeCollection(record.index)}>Remove</Button>
      )
    }
  ];

  // Upload a single file to Storage and return its download URL
  const uploadOne = async (file, pathPrefix) => {
    if (!file) return null;
    if (typeof file === 'string') return file;
    if (file?.url && typeof file.url === 'string') return file.url;
    const auth = getAuth();
    const uid = auth?.currentUser?.uid || 'anon';
    const storageRef = ref(STORAGE, `${pathPrefix}/${uid}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file.originFileObj || file);
    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed', null, reject, () => resolve());
    });
    return getDownloadURL(storageRef);
  };

  //submitt button
  const submit = async () => {
    try {
      const portfolioUrl = await handleUploadToFirebase(
        siteInfo.portfolio,
        setLoading
      );
      const imageLogo = await uploadOne(siteInfo?.logo, 'logos');
      let imageCategories = [];
      for (let index = 0; index < siteInfo.categories.length; index++) {
        const file = siteInfo.categories[index].image;
        const url = await uploadOne(file, 'categories');
        imageCategories.push({
          name: siteInfo.categories[index].name,
          image: url,
        });
      }
      // Collections: upload images and persist productIds
      const imageCollections = [];
      const srcCollections = Array.isArray(siteInfo.collections) ? siteInfo.collections : [];
      for (let i = 0; i < srcCollections.length; i++) {
        const col = srcCollections[i] || {};
        const url = await uploadOne(col.image, 'collections');
        imageCollections.push({
          name: col.name || '',
          image: url || null,
          productIds: Array.isArray(col.productIds) ? col.productIds.filter(Boolean) : [],
        });
      }

      // Auto-sync: include products that are tagged with collection names in their metadata.collections
      const byName = new Map(imageCollections.map(c => [c.name, new Set(Array.isArray(c.productIds) ? c.productIds : [])]));
      products.forEach(p => {
        const tagged = Array.isArray(p?.metadata?.collections) ? p.metadata.collections : [];
        tagged.forEach((name) => {
          if (byName.has(name)) {
            byName.get(name).add(p.id);
          }
        });
      });
      const finalCollections = imageCollections.map(c => ({
        ...c,
        productIds: Array.from(byName.get(c.name) || [])
      }));
  
      setSiteInfo(() => {
        return { ...siteInfo, categories: imageCategories, collections: finalCollections, logo: imageLogo };
      });
      // Save to users/{uid}.siteInfo
      const auth = getAuth();
      const uid = auth?.currentUser?.uid;
      if (!uid) throw new Error('You must be signed in.');
      await setDoc(doc(db, 'users', uid), {
        siteInfo: {
          ...siteInfo,
          categories: imageCategories,
          collections: finalCollections,
          logo: imageLogo,
          portfolio: portfolioUrl,
        },
      }, { merge: true });

      // Mirror back to products: set each product's metadata.collections to the set of collections it belongs to
      try {
        // Build productId -> Set(collectionName)
        const productToCollections = new Map();
        finalCollections.forEach(c => {
          const set = new Set(Array.isArray(c.productIds) ? c.productIds : []);
          set.forEach(pid => {
            if (!productToCollections.has(pid)) productToCollections.set(pid, new Set());
            productToCollections.get(pid).add(c.name);
          });
        });
        // Update every loaded product with exact collection membership (empty array if none)
        await Promise.all(products.map(async (p) => {
          const names = Array.from(productToCollections.get(p.id) || []);
          const ref = doc(db, 'products', p.id);
          await updateDoc(ref, { 'metadata.collections': names });
        }));
      } catch (e) {
        // Non-fatal: continue even if some product updates fail
        console.warn('Collection sync to products failed:', e);
      }
      setSaved(true);
      showSuccess('Saved!')
    } catch (error) {
      showError(error.message)
    }
  };

  //generate colors for colorPicker
  const { token } = theme.useToken();
  const presets = genPresets({
    primary: generate(token.colorPrimary),
    red,
    green,
  });

  const handleInputChange = (field, value) => {
    setSiteInfo({ ...siteInfo, [field]: value });
  };

  const handleColorChange = (colorField, color) => {
    setSiteInfo({
      ...siteInfo,
      colors: { ...siteInfo?.colors, [colorField]: color.toHexString() },
    });
  };

  const handleTermChange = (termIndex, bodyIndex, value) => {
    const updatedTerms = [...siteInfo.terms];
    updatedTerms[termIndex].body[bodyIndex] = value;
    setSiteInfo({ ...siteInfo, terms: updatedTerms });
  };

  const handleTitleChange = (termIndex, value) => {
    const updatedTerms = [...siteInfo.terms];
    updatedTerms[termIndex].title = value;
    setSiteInfo({ ...siteInfo, terms: updatedTerms });
  };

  const addBodyToTerm = (termIndex) => {
    const updatedTerms = [...siteInfo.terms];
    updatedTerms[termIndex].body.push("");
    setSiteInfo({ ...siteInfo, terms: updatedTerms });
  };

  const removeBodyFromTerm = (termIndex, bodyIndex) => {
    const updatedTerms = [...siteInfo.terms];
    if (updatedTerms[termIndex].body.length > 1) {
      updatedTerms[termIndex].body.splice(bodyIndex, 1);
      setSiteInfo({ ...siteInfo, terms: updatedTerms });
    }
  };

  const addTerm = () => {
    setSiteInfo({
      ...siteInfo,
      terms: [...siteInfo.terms, { title: "", body: [""] }],
    });
  };

  const removeTerm = (termIndex) => {
    const updatedTerms = [...siteInfo.terms];
    updatedTerms.splice(termIndex, 1);
    setSiteInfo({ ...siteInfo, terms: updatedTerms });
  };

  const handleCategoryChange = (index, field, value) => {
    const updatedCategories = [...siteInfo.categories];
    updatedCategories[index][field] = value;
    setSiteInfo({ ...siteInfo, categories: updatedCategories });
  };

  const handleCollectionChange = (index, field, value) => {
    const updated = Array.isArray(siteInfo.collections) ? [...siteInfo.collections] : [];
    updated[index] = { ...updated[index], [field]: value };
    setSiteInfo({ ...siteInfo, collections: updated });
  };

  const handleLogoUpload = async ({ file }) => {
    setSiteInfo({ ...siteInfo, logo: file });
  };

  const addCategory = () => {
    setSiteInfo({
      ...siteInfo,
      categories: [...siteInfo.categories, { name: "", image: null }],
    });
  };

  const removeCategory = (index) => {
    const updatedCategories = siteInfo.categories.filter((_, i) => i !== index);
    setSiteInfo({ ...siteInfo, categories: updatedCategories });
  };

  const addCollection = () => {
    const current = Array.isArray(siteInfo.collections) ? siteInfo.collections : [];
    setSiteInfo({
      ...siteInfo,
      collections: [...current, { name: "", image: null, productIds: [] }],
    });
  };

  const removeCollection = (index) => {
    const current = Array.isArray(siteInfo.collections) ? siteInfo.collections : [];
    const updated = current.filter((_, i) => i !== index);
    setSiteInfo({ ...siteInfo, collections: updated });
  };

  const handleUploadToFirebase = async (portfolio, setLoading) => {
    setLoading(true);
    const portUrl = [];
    try {
      const uploadPromises = portfolio.map(async (category) => {
        const imageUrls = await Promise.all(
          category.images.map(async (file) => {
            if (typeof file == "string") return file;
            if (typeof file.url == 'string') return file.url
            const storageRef = ref(STORAGE, `categories/${file.name}`);
            const uploadTask = uploadBytesResumable(
              storageRef,
              file.originFileObj
            );
            await new Promise((resolve, reject) => {
              uploadTask.on("state_changed", null, reject, async () => {
                resolve();
              });
            });
            return getDownloadURL(storageRef);
          })
        );

        const categoryData = {
          name: category.name,
          images: imageUrls,
        };
        portUrl.push(categoryData);
        // await addDoc(collection(DATABASE, 'categories'), categoryData);
      });

      await Promise.all(uploadPromises);
      setSiteInfo({ ...siteInfo, portfolio: portUrl });
    } catch (error) {
      console.error("Error uploading categories:", error);
    } finally {
      setLoading(false);
    }

    return portUrl;
  };

  const previewStyle = {
    backgroundColor: siteInfo?.colors.background,
    color: siteInfo?.colors.text,
    borderColor: siteInfo?.colors.accent,
  };

  return (
    <div className="h-full w-full max-w-5xl rounded-xl m-auto p-4 md:p-6 overflow-hidden overflow-y-auto hidescroll ">
      {contextHolder}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Website Settings</h1>
        <p className="text-gray-500 mt-1">Manage your storefront categories, collections, and product groupings.</p>
      </div>

      {/* Payment Providers moved to reusable component */}
      <div className="mb-10">
        <PaymentProvidersSettings
          userId={SITEINFO?.userId}
            siteId={SITEINFO?.id}
            initial={providerState}
            onSaved={(st)=> setProviderState(st)}
        />
      </div>

      {/* Tabs: Categories and Collections */}
      <div className="mb-24">
        <Tabs
          defaultActiveKey="categories"
          items={[
            {
              key: 'categories',
              label: 'Categories',
              children: (
                <Card
                  title={<div className="font-medium">Categories</div>}
                  bordered
                  className="shadow-sm"
                  extra={<Button type="primary" icon={<Plus size={14} />} onClick={addCategory}>New category</Button>}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 justify-between">
                    <Input
                      placeholder="Search categories"
                      allowClear
                      className="w-64"
                      onChange={(e)=> setCatSearch(e.target.value)}
                    />
                  </div>
                  <Table
                    className='h-64 overflow-y-scroll'
                    dataSource={filteredCategories.map((c, i) => ({ key: i, index: i, ...c }))}
                    pagination={{ pageSize: 10 }}
                    size="middle"
                    columns={catColumns}
                  />
                  {filteredCategories.length === 0 && (
                    <Empty description="No categories" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Card>
              )
            },
            {
              key: 'collections',
              label: 'Collections',
              children: (
                <Card
                  title={<div className="font-medium">Collections</div>}
                  className="shadow-sm "
                  extra={<Button type="primary" icon={<Plus size={14} />} onClick={addCollection}>New collection</Button>}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search collections"
                        allowClear
                        className="w-64"
                        onChange={(e)=> setColSearch(e.target.value)}
                      />
                      <Select
                        value={colHas}
                        onChange={setColHas}
                        className="w-40"
                        options={[{label:'All', value:'all'},{label:'Has products', value:'has'},{label:'Empty', value:'empty'}]}
                      />
                    </div>
                  </div>
                  <Table
                    dataSource={filteredCollections.map((c, i) => ({ key: i, index: i, _expanded: buildCollectionExpanded(i), ...c }))}
                    pagination={{ pageSize: 10 }}
                    size="middle"
                    columns={colColumns}
                    expandable={{ expandedRowRender: (record) => record._expanded }}
                  />
                  {filteredCollections.length === 0 && (
                    <Empty description="No collections" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Card>
              )
            }
          ]}
        />
      </div>

      <div className="sticky bottom-0 inset-x-0 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 border-t py-3">
        <div className="max-w-5xl mx-auto px-4 flex justify-end">
          <Button type="primary" size="large" loading={loading} onClick={submit}>Save changes</Button>
        </div>
      </div>
    </div>
  );
};

export default WebsiteEditor;
