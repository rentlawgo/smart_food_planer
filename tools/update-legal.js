// Обновляет assets/legal-data.js из текстов приложения.
// Запуск:  node tools/update-legal.js "C:\путь\к\smart-food-planner\renderer\js\legal.js"
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = process.argv[2];
if (!src) { console.error('Укажите путь к legal.js приложения.'); process.exit(1); }
const ctx = { UI: { modal() {} } }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(src, 'utf8') + ';this.T=TERMS_HTML;this.P=PRIVACY_HTML;this.V=TERMS_VERSION;this.D=TERMS_DATE;', ctx);
const out = '// Сгенерировано из текстов приложения (версия ' + ctx.V + ' от ' + ctx.D + ').\nwindow.LEGAL = ' + JSON.stringify({ terms: ctx.T.trim(), privacy: ctx.P.trim() }) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'legal-data.js'), out);
console.log('Готово: документы версии', ctx.V, 'обновлены.');
