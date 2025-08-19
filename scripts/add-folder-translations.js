const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, '../src/renderer/src/i18n/locales');

// Define translations for each language
const translations = {
  'en-us': 'New Folder',
  'zh-cn': '新建文件夹',
  'zh-tw': '新建資料夾',
  'ja-jp': '新しいフォルダ',
  'ru-ru': 'Новая папка',
  'es-es': 'Nueva carpeta',
  'fr-fr': 'Nouveau dossier',
  'pt-pt': 'Nova pasta',
  'el-gr': 'Νέος φάκελος'
};

// Process each language file
fs.readdirSync(localesPath).forEach(file => {
  if (file.endsWith('.json')) {
    const filePath = path.join(localesPath, file);
    const langCode = path.basename(file, '.json');
    
    // Read the existing content
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Add the new translation
    if (!content.chat) content.chat = {};
    if (!content.chat.folder) content.chat.folder = {};
    
    // Use the translation if available, otherwise fall back to English
    content.chat.folder.new = translations[langCode] || translations['en-us'];
    
    // Write back to file with proper formatting
    fs.writeFileSync(
      filePath,
      JSON.stringify(content, null, 2) + '\n',
      'utf-8'
    );
    
    console.log(`Updated ${file}`);
  }
});

console.log('All translation files have been updated.');
