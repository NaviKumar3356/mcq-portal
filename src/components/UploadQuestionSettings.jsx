import React, { useState } from 'react';
import { uploadQuestionResource } from '../lib/api.js';

const TEMPLATE_TYPES = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.xcf,.psd';

export default function UploadQuestionSettings({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const settings = value || { submission_mode: 'image' };
  const mode = settings.submission_mode || 'image';

  function update(patch) {
    onChange({ ...settings, ...patch });
  }

  async function uploadTemplate(file) {
    setUploading(true);
    try {
      const resource = await uploadQuestionResource({ file });
      update({ resource });
    } catch (error) {
      window.alert(`Could not upload the task file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card" style={{ background: 'var(--paper)', marginTop: 12 }}>
      <label>Student submission type</label>
      <select value={mode} onChange={(event) => update({ submission_mode: event.target.value })}>
        <option value="image">Image upload (drawing, design, photo task)</option>
        <option value="file">Editable file upload (Word, Excel, photo-editing file)</option>
      </select>
      <p className="meta">
        {mode === 'image'
          ? 'Students submit an image such as a drawing, screenshot, poster, or edited photo.'
          : 'Students download the optional starter file, edit it in the required application, then upload their completed file.'}
      </p>

      <label>Starter image or editable file (optional)</label>
      <input
        type="file"
        accept={TEMPLATE_TYPES}
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) uploadTemplate(file);
          event.target.value = '';
        }}
      />
      {uploading && <p className="meta">Uploading task file?</p>}
      {settings.resource && (
        <div className="notice-strip" style={{ display: 'block', marginTop: 10 }}>
          <strong>Attached template:</strong> {settings.resource.name || 'Task file'}{' '}
          <button type="button" className="secondary small" onClick={() => update({ resource: null })}>
            Remove
          </button>
        </div>
      )}
    </div>
