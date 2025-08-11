// Required imports
import React, { useEffect, useState } from 'react';
import { Input, Button, Upload } from 'antd';
import ImgCrop from 'antd-img-crop';
import { motion } from 'framer-motion';




const CategoryUploader = ({siteInfo,setSiteInfo,SITEINFO, handleUploadToFirebase}) => {
  const [portfolio, setPortfolio] = useState(SITEINFO?.portfolio || [{ name: '', images: [] }]);
  const [loading, setLoading] = useState(false);


useEffect(() => {
  setSiteInfo((old)=>({...old, portfolio:portfolio}))

}, [portfolio])     


  const handleCategoryChange = (index, field, value) => {
    const newCategories = [...portfolio];
    newCategories[index][field] = value;
    setPortfolio(newCategories);
  };

  const handleImageUpload = (index, fileList) => {
    const newCategories = [...portfolio];
    newCategories[index].images = fileList;
    setPortfolio(newCategories);
  };

  const addCategory = () => {
    setPortfolio([...portfolio, { name: '', images: [] }]);
  };

  const removeCategory = (index) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
  };



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 border-dashed border-2 rounded-lg"
    >
      <h3 className="font-bold text-lg">Portfolio</h3>
      <h3 className="font-light mb-4">Examles of your work</h3>
      {(siteInfo?.portfolio || portfolio).map((category, index) => (
        <div key={index} className="mb-6">
          <Input
            placeholder="Category Name ex.Lashes" 
            value={category.name}
            onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
            className="mb-2"
          />
          <ImgCrop aspect={16/9} rotate>
            <Upload
              listType="picture-card"
              defaultFileList={category?.images.map((img, index)=>{
                return({
                    uid: `${index}`,
                    name: "image",
                    status: "done",
                    url: img || '',
                  })
              })}
              onChange={({ fileList }) => handleImageUpload(index, fileList)}
              beforeUpload={() => false}
              maxCount={5}
             
            >
              {category.images.length < 5 && <Button>Upload Image</Button>}
            </Upload>
          </ImgCrop>
          <Button
            onClick={() => removeCategory(index)}
            danger
            className="mt-2"
          >
            Remove Category
          </Button>
        </div>
      ))}
      <Button onClick={addCategory} type="dashed" className="mb-4">
        Add Category
      </Button>
      
    </motion.div>
  );
};

export default CategoryUploader;
