import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);

  useEffect(() => {
    // Load settings from localStorage or default
    const savedLang = localStorage.getItem('language') || 'en';
    const savedHwAccel = localStorage.getItem('hardwareAcceleration') !== 'false'; // default true
    setLanguage(savedLang);
    setHardwareAcceleration(savedHwAccel);
  }, []);

  const handleSave = () => {
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