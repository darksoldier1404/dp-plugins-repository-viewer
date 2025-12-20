import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_BSTATS_MAPPING } from '../services/bstatsService';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);
  const [bstatsMappingText, setBstatsMappingText] = useState('');
  const [bstatsError, setBstatsError] = useState<string | null>(null);

  useEffect(() => {
    // Load settings from localStorage or default
    const savedLang = localStorage.getItem('language') || 'en';
    const savedHwAccel = localStorage.getItem('hardwareAcceleration') !== 'false'; // default true
    setLanguage(savedLang);
    setHardwareAcceleration(savedHwAccel);

    const savedMapping = localStorage.getItem('bstats-mapping');
    if (!savedMapping) {
      const pretty = JSON.stringify(DEFAULT_BSTATS_MAPPING, null, 2);
      setBstatsMappingText(pretty);
    } else {
      try {
        const pretty = JSON.stringify(JSON.parse(savedMapping), null, 2);
        setBstatsMappingText(pretty);
      } catch (e) {
        setBstatsMappingText(savedMapping);
      }
    }
  }, []);

  const handleSave = () => {
    // Validate bstats JSON
    try {
      const parsed = JSON.parse(bstatsMappingText || '{}');
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setBstatsError('Mapping must be a JSON object with repo names as keys and numeric plugin IDs as values.');
        return;
      }
      // ensure values are numbers
      for (const key of Object.keys(parsed)) {
        if (typeof parsed[key] !== 'number') {
          setBstatsError(`Plugin ID for "${key}" must be a number.`);
          return;
        }
      }
      localStorage.setItem('bstats-mapping', JSON.stringify(parsed));
    // notify other components
    try { window.dispatchEvent(new Event('bstats-mapping-changed')); } catch (e) {}
    } catch (e) {
      setBstatsError('Invalid JSON. Please fix formatting.');
      return;
    }

    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
    localStorage.setItem('hardwareAcceleration', hardwareAcceleration.toString());
    // Notify main process about hardware acceleration change
    if (window.electronAPI) {
      window.electronAPI.setHardwareAcceleration(hardwareAcceleration);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-100">{t('settings.title')}</h2>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2">{t('settings.language')}</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-gray-300 mb-2">{t('settings.hardwareAcceleration')}</label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="hwAccel"
                value="on"
                checked={hardwareAcceleration}
                onChange={() => setHardwareAcceleration(true)}
                className="mr-2"
              />
              {t('settings.on')}
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="hwAccel"
                value="off"
                checked={!hardwareAcceleration}
                onChange={() => setHardwareAcceleration(false)}
                className="mr-2"
              />
              {t('settings.off')}
            </label>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-300 mb-2">{t('settings.bstatsMappingLabel')}</label>
          <div className="text-sm text-gray-400 mb-2">{t('settings.bstatsMappingHelp')}</div>
          <textarea
            value={bstatsMappingText}
            onChange={(e) => { setBstatsMappingText(e.target.value); setBstatsError(null); }}
            rows={6}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
          />
          {bstatsError && <div className="text-red-400 mt-2 text-sm">{bstatsError}</div>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setBstatsMappingText('{}');
                setBstatsError(null);
              }}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
            >Reset</button>
            <button
              onClick={() => { setBstatsMappingText(JSON.stringify(DEFAULT_BSTATS_MAPPING, null, 2)); setBstatsError(null); }}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
            >{t('settings.bstatsLoadExample') || 'Load Example'}</button>
            <button
              onClick={() => { navigator.clipboard.writeText(bstatsMappingText); }}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
            >Copy</button>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors text-gray-100"
          >
            {t('settings.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg transition-colors text-white"
          >
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;