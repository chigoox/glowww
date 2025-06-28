'use client'

import { useEffect, useState } from 'react';

const TinyMCEEditor = ({ value, onInit, height, onChange, ...props }) => {
  const [Editor, setEditor] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import TinyMCE only on client side
    const loadTinyMCE = async () => {
      try {
        // Import TinyMCE modules
        await import('tinymce/tinymce');
        await import('tinymce/models/dom/model');
        await import('tinymce/themes/silver');
        await import('tinymce/icons/default');
        
        // Import plugins
        await import('tinymce/plugins/advlist');
        await import('tinymce/plugins/anchor');
        await import('tinymce/plugins/autolink');
        await import('tinymce/plugins/help');
        await import('tinymce/plugins/image');
        await import('tinymce/plugins/link');
        await import('tinymce/plugins/lists');
        await import('tinymce/plugins/searchreplace');
        await import('tinymce/plugins/table');
        await import('tinymce/plugins/wordcount');
        await import('tinymce/plugins/code');
        await import('tinymce/plugins/media');
        await import('tinymce/plugins/preview');
        await import('tinymce/plugins/fullscreen');
        
        // Import CSS
        await import('tinymce/skins/ui/oxide/skin.min.css');
        
        // Import React component
        const { Editor: TinyEditor } = await import('@tinymce/tinymce-react');
        setEditor(() => TinyEditor);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load TinyMCE:', error);
      }
    };

    loadTinyMCE();
  }, []);

  if (!isLoaded || !Editor) {
    return (
      <div style={{
        height: height || 300,
        border: '1px solid #ddd',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9f9f9'
      }}>
        Loading editor...
      </div>
    );
  }

  return (
    <Editor
      value={value}
      onInit={onInit}
      init={{
        height: height || 300,
        menubar: false,
        plugins: [
          'advlist', 'anchor', 'autolink', 'help', 'image', 'link', 'lists',
          'searchreplace', 'table', 'wordcount', 'code', 'media', 'preview', 'fullscreen'
        ],
        toolbar: 'undo redo | blocks | ' +
          'bold italic forecolor backcolor | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | help | code | table | link image media | ' +
          'preview fullscreen',
        toolbar_mode: 'sliding',
        branding: false,
        license_key: 'gpl',
        skin: 'oxide',
        content_css: 'default',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:16px }',
        contextmenu: 'link image table',
        quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
        image_advtab: true,
        image_caption: true,
        file_picker_types: 'image',
        file_picker_callback: function (cb, value, meta) {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          
          input.onchange = function () {
            const file = this.files[0];
            const reader = new FileReader();
            
            reader.onload = function () {
              const id = 'blobid' + (new Date()).getTime();
              const blobCache = window.tinymce.activeEditor.editorUpload.blobCache;
              const base64 = reader.result.split(',')[1];
              const blobInfo = blobCache.create(id, file, base64);
              blobCache.add(blobInfo);
              
              cb(blobInfo.blobUri(), { title: file.name });
            };
            reader.readAsDataURL(file);
          };
          
          input.click();
        },
      }}
      onEditorChange={onChange}
      {...props}
    />
  );
};

export default TinyMCEEditor;