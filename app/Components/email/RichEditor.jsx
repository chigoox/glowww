'use client';
// Lightweight bundled TinyMCE editor wrapper for email composing (no CDN script / API key required)
import React from 'react';
import { Editor } from '@tinymce/tinymce-react';
// Core + theme + icons
// eslint-disable-next-line no-unused-vars
import tinymce from 'tinymce/tinymce';
import 'tinymce/models/dom/model';
import 'tinymce/themes/silver';
import 'tinymce/icons/default';
// UI skin
import 'tinymce/skins/ui/oxide/skin.min.css';
// Common plugins (keep list short for bundle size)
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/code';
import 'tinymce/plugins/table';
import 'tinymce/plugins/autoresize';

export default function RichEditor({ value, onChange, height = 320 }) {
  return (
    <Editor
      value={value}
      onEditorChange={(c)=> onChange?.(c)}
      init={{
        height,
        menubar: false,
        branding: false,
        license_key: 'gpl',
        plugins: 'link lists code table autoresize',
        toolbar: [
          'undo redo | formatselect fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor |',
          'alignleft aligncenter alignright alignjustify | bullist numlist | link table | removeformat code'
        ].join(' '),
        font_family_formats: [
          'System=system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          'Arial=arial,helvetica,sans-serif',
          'Georgia=georgia,serif',
          'Tahoma=tahoma,arial,helvetica,sans-serif',
          'Times New Roman="Times New Roman",Times,serif',
          'Courier New="Courier New",Courier,monospace'
        ].join(';'),
        fontsize_formats: '12px 13px 14px 15px 16px 18px 20px 24px 28px 32px',
        autoresize_bottom_margin: 20,
        content_style: 'body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size:14px; }'
      }}
    />
  );
}
