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
        
        // Import plugins - all available open source TinyMCE 7 plugins
        await import('tinymce/plugins/accordion');
        await import('tinymce/plugins/anchor');
        await import('tinymce/plugins/autolink');
        await import('tinymce/plugins/autoresize');
        await import('tinymce/plugins/autosave');
        await import('tinymce/plugins/charmap');
        await import('tinymce/plugins/code');
        await import('tinymce/plugins/codesample');
        await import('tinymce/plugins/directionality');
        await import('tinymce/plugins/emoticons');
        await import('tinymce/plugins/fullscreen');
        await import('tinymce/plugins/help');
        await import('tinymce/plugins/image');
        await import('tinymce/plugins/importcss');
        await import('tinymce/plugins/insertdatetime');
        await import('tinymce/plugins/link');
        await import('tinymce/plugins/lists');
        await import('tinymce/plugins/advlist'); // Enhanced list formatting
        await import('tinymce/plugins/media');
        await import('tinymce/plugins/nonbreaking');
        await import('tinymce/plugins/pagebreak');
        await import('tinymce/plugins/preview');
        await import('tinymce/plugins/quickbars');
        await import('tinymce/plugins/save');
        await import('tinymce/plugins/searchreplace');
        await import('tinymce/plugins/table');
        await import('tinymce/plugins/visualblocks');
        await import('tinymce/plugins/visualchars');
        await import('tinymce/plugins/wordcount');
        
        // Import essential CSS for proper rendering
        try {
          await import('tinymce/skins/ui/oxide/skin.min.css');
        } catch (e) {
          console.warn('Could not load TinyMCE skin CSS:', e);
        }
        
        // Import React component
        const { Editor: TinyEditor } = await import('@tinymce/tinymce-react');
        console.log('TinyMCE modules loaded successfully');
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
        background: '#f9f9f9',
        fontSize: '14px',
        color: '#666'
      }}>
        {!isLoaded ? 'Loading TinyMCE editor...' : 'Initializing editor...'}
      </div>
    );
  }

  return (
    <Editor
      value={value}
      onInit={(evt, editor) => {
        console.log('TinyMCE editor initialized');
        if (onInit) onInit(evt, editor);
      }}
      init={{
        height: height || 300,
        menubar: 'file edit view insert format tools table help',
        plugins: [
          'accordion', 'anchor', 'autolink', 'autoresize', 'autosave', 'charmap', 'code', 'codesample',
          'directionality', 'emoticons', 'fullscreen', 'help', 'image', 'importcss', 'insertdatetime',
          'link', 'lists', 'advlist', 'media', 'nonbreaking', 'pagebreak', 'preview', 'quickbars',
          'save', 'searchreplace', 'table', 'visualblocks', 'visualchars', 'wordcount'
        ],
        toolbar: [
          'undo redo | formatselect fontfamily fontsize | save preview help',
          'bold italic underline strikethrough subscript superscript | forecolor backcolor',
          'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent',
          'blockquote accordion | link image media table charmap emoticons insertdatetime',
          'anchor nonbreaking pagebreak | searchreplace visualblocks visualchars',
          'ltr rtl | removeformat code codesample | fullscreen'
        ],
        toolbar_mode: 'wrap',
        block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre; Blockquote=blockquote; Div=div',
        font_formats: 'Arial=arial,helvetica,sans-serif; Times New Roman=times new roman,times,serif; Courier New=courier new,courier,monospace; Helvetica=helvetica,arial,sans-serif; Georgia=georgia,serif; Verdana=verdana,arial,sans-serif; Tahoma=tahoma,arial,sans-serif; Trebuchet MS=trebuchet ms,arial,sans-serif; Comic Sans MS=comic sans ms,arial,sans-serif; Impact=impact,arial,sans-serif',
        fontsize_formats: '8pt 10pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt 48pt 60pt 72pt 96pt',
        // Enable font controls
        font_size_style_values: '8px,10px,12px,14px,16px,18px,20px,24px,28px,32px,36px,48px,60px,72px,96px',
        font_size_legacy_values: '1,2,3,4,5,6,7',
        // Enable default color picker
        color_cols: 8,
        custom_colors: true,
        // Autoresize configuration
        autoresize_max_height: 800,
        autoresize_min_height: 200,
        // Emoticons configuration
        emoticons_database: 'emojiimages',
        // Save configuration
        save_onsavecallback: function () {
          console.log('Save triggered');
          // You can add custom save logic here
        },
        // Media configuration
        media_live_embeds: true,
        // Visual blocks configuration
        visualblocks_default_state: false,
        branding: false,
        license_key: 'gpl',
        // Use CDN for reliable skin and content CSS loading
        skin_url: 'https://cdn.tiny.cloud/1/no-api-key/tinymce/7/skins/ui/oxide',
        content_css: 'https://cdn.tiny.cloud/1/no-api-key/tinymce/7/skins/content/default/content.min.css',
        // Inline all styles needed for proper rendering
        content_style: `
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            font-size: 14px; 
            line-height: 1.6;
            margin: 8px;
            background: white;
            color: #333;
          }
          p { margin: 0 0 10px 0; }
          h1, h2, h3, h4, h5, h6 { margin: 15px 0 10px 0; font-weight: bold; }
          h1 { font-size: 2em; }
          h2 { font-size: 1.5em; }
          h3 { font-size: 1.17em; }
          h4 { font-size: 1em; }
          h5 { font-size: 0.83em; }
          h6 { font-size: 0.67em; }
          ul, ol { margin: 10px 0 10px 40px; }
          li { margin: 5px 0; }
          a { color: #1976d2; text-decoration: underline; }
          strong, b { font-weight: bold; }
          em, i { font-style: italic; }
          code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
        `,
        contextmenu: 'link image media table | cut copy paste | bold italic underline | alignleft aligncenter alignright | accordion anchor',
        quickbars_selection_toolbar: 'bold italic underline | formatselect | forecolor backcolor | h2 h3 blockquote | link anchor',
        quickbars_insert_toolbar: 'table image media accordion | bullist numlist | charmap emoticons insertdatetime',
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