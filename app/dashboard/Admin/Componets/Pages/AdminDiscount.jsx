
// DiscountCodes
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Input, Button, Switch, Table, Popconfirm, message, Select, Tag, Divider, Space, Tooltip } from "antd";
import { v4 as uuidv4 } from "uuid";
import { Eye, EyeClosed } from "lucide-react";
import { filterNullFromArray } from "@/app/myCodes/Util";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getUserSites } from "@/lib/sites";





// SearchDiscountCodes.js
export function SearchDiscountCodes({ codes, onSelect }) {
  const [searchCode, setSearchCode] = useState("");
  const [matchingCodes, setMatchingCodes] = useState([]);

  const handleSearchCode = (value) => {
    setSearchCode(value);
    if (value.trim() === "") {
      setMatchingCodes([]);
    } else {
      const matches = codes.filter((c) => c.code.includes(value));
      setMatchingCodes(matches);
    }
  };

  return (
    <div className="bg-[color:var(--BGColorL)] shadow-md md:w-1/3 p-6 rounded-lg mb-10">
      <h2 className="font-bold mb-4 text-[color:var(--TextColorM)]">Search Discount Codes</h2>
      <Input
        placeholder="Discount Code"
        value={searchCode}
        onChange={(e) => handleSearchCode(e.target.value)}
        className="mb-4"
      />
      {matchingCodes.length > 0 && (
        <div className="space-y-2">
          {matchingCodes.map((item) => (
            <div
              key={item.id}
              className="bg-[color:var(--BGColor)] p-2 rounded-lg cursor-pointer trans hover:bg-[color:var(--AccentColor)]"
              onClick={() => onSelect(item)}
            >
              {item.code} - {item.type} {item.amount}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}





export default function AdminDiscount({ SITEINFO, OWNER }) {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState(0);
  const [isPercent, setIsPercent] = useState(false);
  const [isPirvate, setIsPirvate] = useState(false)
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false)
  const [sites, setSites] = useState([]);
  const [scope, setScope] = useState({ type: 'global', siteId: null });

  // Load user's sites for per-site targeting
  useEffect(() => {
    (async () => {
      try {
        if (!OWNER?.uid) return;
        const list = await getUserSites(OWNER.uid);
        setSites(list || []);
      } catch (e) {
        // Non-fatal
      }
    })();
  }, [OWNER?.uid]);

  // Load codes based on selected scope
  useEffect(() => {
    (async () => {
      if (!OWNER?.uid) return;
      setLoading(true);
      try {
        let snap;
        if (scope.type === 'global') {
          snap = await getDoc(doc(db, 'users', OWNER.uid, 'discounts', 'global'));
        } else if (scope.type === 'site' && scope.siteId) {
          snap = await getDoc(doc(db, 'users', OWNER.uid, 'sites', scope.siteId, 'discounts', 'codes'));
        }
        const data = snap?.exists() ? snap.data() : null;
        setCodes(data?.discountCodes || []);
      } catch (e) {
        // default empty
        setCodes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [OWNER?.uid, scope]);
  

  const handleAddCode = () => {
    if (!code || amount <= 0) {
      message.error("Please enter a valid code and amount.");
      return;
    }

    const newCode = {
      id: uuidv4(),
      code,
      amount,
      isPirvate,
      type: isPercent ? "Percent" : "Amount",
    };
    console.log(newCode)
    setCodes([...codes, newCode]);
    setCode("");
    setAmount(0);
    setIsPercent(false);
    message.success("Code added successfully.");
  };

  const handleDelete = (id) => {
    setCodes(codes.filter((item) => item.id !== id));
    message.success("Code deleted successfully.");
  };

  const handleEdit = (id, updatedCode) => {
    setCodes(
      codes.map((item) => (item.id === id ? { ...item, ...updatedCode } : item))
    );
    message.success("Code updated successfully.");
  };

  const handleSelectCode = (selectedCode) => {
    message.info(`Selected code: ${selectedCode.code}`);
  };

  const toFireBase = async () => {
    if (!OWNER?.uid) return;
    setLoading(true)
    const publicCodes = filterNullFromArray(codes.map((item) => { if (!item.isPirvate) return (item) }))
    const privateCodes = filterNullFromArray(codes.map((item) => { if (item.isPirvate) return (item) }))
    try {
      if (scope.type === 'global') {
        await setDoc(
          doc(db, 'users', OWNER.uid, 'discounts', 'global'),
          { discountCodes: publicCodes, privateCodes },
          { merge: true }
        );
      } else if (scope.type === 'site' && scope.siteId) {
        await setDoc(
          doc(db, 'users', OWNER.uid, 'sites', scope.siteId, 'discounts', 'codes'),
          { discountCodes: publicCodes, privateCodes },
          { merge: true }
        );
      }
      message.success("Codes saved successfully.");
    } catch (error) {
      message.error(error.message);
    }
    setLoading(false)
  }

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (text, record) => (
        <Input
        className="  w-24 md:w-auto"
          defaultValue={text}
          onBlur={(e) => handleEdit(record.id, { code: e.target.value })}
        />
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (text, record) => (
        <Input
          type="number"
          defaultValue={text}
          onBlur={(e) => handleEdit(record.id, { amount: e.target.value })}
        />
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Popconfirm
          title="Are you sure to delete this code?"
          onConfirm={() => handleDelete(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button danger>Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  const scopeTag = useMemo(() => {
    if (scope.type === 'global') return <Tag color="blue">Global</Tag>;
    const site = sites.find(s => s.id === scope.siteId);
    return <Tag color="purple">Site: {site?.name || scope.siteId}</Tag>;
  }, [scope, sites]);

  return (
    <div className="flex flex-col gap-6 overflow-y-auto rounded-xl bg-gray-50 p-3 md:p-4">
      <motion.div
        className="bg-white shadow-md p-6 rounded-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <h1 className="text-2xl font-bold">Discount Codes</h1>
          <Space align="center" className="flex-wrap">
            <span className="text-gray-600">Scope</span>
            <Select
              value={scope.type === 'global' ? 'global' : scope.siteId}
              style={{ minWidth: 180 }}
              onChange={(val) => {
                if (val === 'global') setScope({ type: 'global', siteId: null });
                else setScope({ type: 'site', siteId: val });
              }}
              options={[{ label: 'Global (all sites)', value: 'global' }, ...sites.map(s => ({ label: s.name, value: s.id }))]}
            />
            <Tooltip title="Where these codes should apply">
              {scopeTag}
            </Tooltip>
          </Space>
        </div>
        <Divider className="my-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
          <div className="flex items-center gap-3 flex-wrap bg-gray-50 p-3 rounded-md border">
          <Input
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full md:w-1/3"
          />
          <Input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full md:w-1/4"
          />
          <Switch
            checked={isPercent}
            onChange={setIsPercent}
            checkedChildren="% Off"
            unCheckedChildren="$ Off"
          />
          <Switch
            checked={isPirvate}
            onChange={setIsPirvate}
            checkedChildren={<Eye/>}
            unCheckedChildren={<EyeClosed />}
          />
          <Button type="primary" onClick={handleAddCode}>
            Add Code
          </Button>
          </div>

          <div className="flex items-center justify-end">
            <Button loading={loading} type="primary" onClick={toFireBase}>
              Save {scope.type === 'global' ? 'Global' : 'Site'} Codes
            </Button>
          </div>
        </div>
      </motion.div>


      <motion.div
        className="bg-white shadow-md w-full overflow-x-auto p-6 rounded-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-bold mb-4">All Discount Codes</h2>
        <Table
          className=""
          columns={columns}
          dataSource={codes}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </motion.div>
    </div>
  );
}
