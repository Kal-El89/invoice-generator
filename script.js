/* ===================== Проверка файлов ===================== */
// Если какой-то файл не загрузился, показываем понятное сообщение вместо «молчаливой» поломки
function showBanner(text) {
    let box = document.getElementById('depBanner');
    if (!box) {
        box = document.createElement('div');
        box.id = 'depBanner';
        box.style.cssText = 'position:sticky;top:0;z-index:9999;background:#c53030;color:#fff;padding:12px 16px;' +
            'margin:-20px -20px 16px -20px;font:14px/1.5 sans-serif;white-space:pre-line;';
        document.body.insertBefore(box, document.body.firstChild);
    }
    box.textContent = text;
}

(function checkFiles() {
    const missing = [];
    if (typeof InvoicePDF === 'undefined') missing.push('invoice-pdf.js');
    if (typeof pdfMake === 'undefined') missing.push('lib/pdfmake.min.js');
    if (!window.INVOICE_FONTS) missing.push('fonts.js');
    if (!missing.length) return;
    showBanner(
        'ფაილები ვერ ჩაიტვირთა / Не загружены файлы: ' + missing.join(', ') + '\n' +
        'ჩადეთ ისინი index.html-ის გვერდით (lib საქაღალდიანად), შეცვალეთ index.html ახალით და დააჭირეთ Ctrl+F5.\n' +
        'Положите их рядом с index.html (папку lib целиком), замените index.html на новый и нажмите Ctrl+F5.'
    );
})();
if (typeof InvoicePDF === 'undefined') throw new Error('invoice-pdf.js не загружен');

// Любая другая ошибка JS тоже показывается на странице (после проверки файлов, чтобы не затирать её список)
window.addEventListener('error', e => showBanner('JS შეცდომა / Ошибка JS: ' + e.message));

/* ===================== Общие настройки ===================== */
const { I18N, UNITS, round2, fmt, calcTotals, unitLabel, vatLabel, makeFileName, buildDocDefinition, currencySymbol } = InvoicePDF;
const getEl = id => document.getElementById(id);

// Валюта: обновляет символ во всех местах превью/формы вкладки n (элементы с классом cur{n})
function applyCurrency(n) {
    const sym = currencySymbol(getEl('currencySelect' + n).value);
    document.querySelectorAll('.cur' + n).forEach(el => { el.textContent = sym; });
}

// pdfmake: подключаем встроенные шрифты (fonts.js). Благодаря им грузинский, кириллица и ₾
// записываются в PDF как настоящий текст, который можно копировать.
const pdfReady = typeof pdfMake !== 'undefined' && !!window.INVOICE_FONTS;
if (pdfReady) {
    pdfMake.vfs = Object.assign({}, window.INVOICE_FONTS);
    pdfMake.fonts = {
        InvoiceSans: {
            normal: 'InvoiceSans-Regular.ttf',
            bold: 'InvoiceSans-Bold.ttf',
            italics: 'InvoiceSans-Regular.ttf',
            bolditalics: 'InvoiceSans-Bold.ttf'
        }
    };
}

// Постоянные реквизиты «შპს ნეთვორქერ თიმი» (вкладка 3 и массовая генерация)
function networkerSeller(lang) {
    return {
        name: lang === 'ka' ? 'შპს ნეთვორქერ თიმი' : 'Networker Team LLC',
        code: '405813767',
        ibans: [
            { label: 'IBAN 1:', value: 'GE84TB7487536080100009' },
            { label: 'IBAN 2:', value: 'GE84BG0000000610898120' }
        ]
    };
}
const NETWORKER_LOGO_URL = 'logo/last ver log.svg';

function switchTab(index) {
    const tabs = document.querySelectorAll('.tab-content');
    const btns = document.querySelectorAll('.tab-btn');
    tabs.forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
        btns[i].classList.toggle('active', i === index);
    });
}

// ფერის თემის ცვლილების ზოგადი ლოგიკა (превью на странице)
function setupThemeSwitcher(selectorId, targetContainerId) {
    const selectEl = getEl(selectorId);
    const containerEl = getEl(targetContainerId);
    if (selectEl && containerEl) {
        selectEl.addEventListener('change', function () {
            containerEl.className = 'invoice-container ' + this.value;
        });
    }
}

/* ===================== Логотипы ===================== */
// Любое изображение (PNG, JPG, SVG, WebP...) -> PNG dataURL, который понимает pdfmake
function imageToPngDataUrl(src, maxWidth = 800) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                let w = img.naturalWidth || img.width || 300;
                let h = img.naturalHeight || img.height || 100;
                const k = Math.min(1, maxWidth / w);
                w = Math.round(w * k); h = Math.round(h * k);
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/png'));
            } catch (err) { reject(err); }
        };
        img.onerror = () => reject(new Error('Не удалось загрузить изображение: ' + src));
        img.src = src;
    });
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

let networkerLogoPromise = null;
function getNetworkerLogo() {
    if (!networkerLogoPromise) {
        networkerLogoPromise = imageToPngDataUrl(encodeURI(NETWORKER_LOGO_URL)).catch(err => {
            console.warn('Логотип не загружен, PDF будет без логотипа. Откройте страницу через http(s)/localhost, а не file://', err);
            return null;
        });
    }
    return networkerLogoPromise;
}

// Загрузка собственного логотипа (вкладки 2 и 4)
const uploadedLogos = {};
function setupLogoInput(n) {
    getEl('logoInput' + n).addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) { uploadedLogos[n] = null; getEl('previewLogo' + n).src = ''; return; }
        try {
            const dataUrl = await fileToDataUrl(file);
            getEl('previewLogo' + n).src = dataUrl;
            uploadedLogos[n] = await imageToPngDataUrl(dataUrl);
        } catch (err) {
            uploadedLogos[n] = null;
            alert('ლოგოს ჩატვირთვა ვერ მოხერხდა / Logo could not be loaded');
        }
    });
}

/* ===================== Создание PDF ===================== */
function createPdfBlob(docDefinition) {
    return new Promise((resolve, reject) => {
        try { pdfMake.createPdf(docDefinition).getBlob(resolve); } catch (err) { reject(err); }
    });
}

async function downloadInvoice(btn, data) {
    if (!pdfReady) { alert('PDF ბიბლიოთეკა ვერ ჩაიტვირთა (lib/pdfmake.min.js, fonts.js) / PDF-библиотека не загружена'); return; }
    const original = btn.textContent;
    btn.disabled = true;
    try {
        const tot = calcTotals(data.rows.reduce((s, r) => s + r.amount, 0), data.vatRate);
        const fileName = makeFileName(data.client.name, fmt(tot.total), data.currency) + '.pdf';
        pdfMake.createPdf(buildDocDefinition(data)).download(fileName);
    } catch (err) {
        console.error(err);
        alert('PDF-ის შექმნა ვერ მოხერხდა / PDF generation failed: ' + err.message);
    } finally {
        setTimeout(() => { btn.disabled = false; btn.textContent = original; }, 400);
    }
}

/* ===================== Превью: общие функции ===================== */
function applyLabels(n, lang, kind) {
    const t = I18N[lang];
    const set = (id, value) => { const el = getEl(id + n); if (el) el.textContent = value; };
    set('invTitle', t.invTitle);
    set('tNum', t.num);
    set('tDate', t.date);
    set('tSellerTitle', t.seller);
    set('tClientTitle', t.client);
    set('tSellerCodeLabel', t.codeLabel);
    set('tClientCodeLabel', t.codeLabel);
    set('thDesc', kind === 'product' ? t.productDesc : t.serviceDesc);
    set('thPrice', t.amount);
    set('thUnit', t.unit);
    set('thUnitPrice', t.unitPrice);
    set('thQty', t.qty);
    set('tSubtotalLabel', (kind === 'product' ? t.subtotalProduct : t.subtotalService) + ':');
    set('tTotalLabel', t.total + ':');
    set('downloadBtn', t.download);
}

// Связывает поле формы с элементом превью (textContent — безопасно, без HTML-инъекций)
function mirror(inputId, previewId, fallback) {
    getEl(inputId).addEventListener('input', e => {
        getEl(previewId).textContent = e.target.value || (fallback === undefined ? '' : fallback);
    });
}

/* ===================== Вкладки 2 и 3: услуги ===================== */
function setupServiceTab(n) {
    const fixedSeller = n === '3'; // вкладка 3 = «ნეთვორქერ თიმი» с постоянными реквизитами
    setupThemeSwitcher('themeSelect' + n, 'invoice' + n);

    function updateCalc() {
        const price = parseFloat(getEl('itemPrice' + n).value) || 0;
        const vatRate = parseFloat(getEl('vatRate' + n).value) || 0;
        const tot = calcTotals(price, vatRate);
        getEl('previewPrice' + n).textContent = fmt(tot.subtotal);
        getEl('previewSubtotal' + n).textContent = fmt(tot.subtotal);
        getEl('previewVat' + n).textContent = fmt(tot.vat);
        getEl('previewTotal' + n).textContent = fmt(tot.total);
        getEl('tVatLabel' + n).textContent = vatLabel(getEl('langSelect' + n).value, vatRate);
    }

    getEl('langSelect' + n).addEventListener('change', function () {
        const lang = this.value;
        applyLabels(n, lang, 'service');
        if (fixedSeller) getEl('previewSellerName3').textContent = networkerSeller(lang).name;
        updateCalc();
    });

    mirror('invNum' + n, 'previewNum' + n, '-');
    mirror('invDate' + n, 'previewDate' + n, '-');
    mirror('clientName' + n, 'previewClient' + n, '-');
    mirror('clientCode' + n, 'previewClientCode' + n, '-');
    mirror('itemDesc' + n, 'previewDesc' + n);
    if (!fixedSeller) {
        mirror('sellerName' + n, 'previewSeller' + n);
        mirror('sellerCode' + n, 'previewSellerCode' + n);
        mirror('sellerBank' + n, 'previewBank' + n);
        setupLogoInput(n);
    }
    getEl('itemPrice' + n).addEventListener('input', updateCalc);
    getEl('vatRate' + n).addEventListener('change', updateCalc);
    getEl('currencySelect' + n).addEventListener('change', () => applyCurrency(n));

    getEl('downloadBtn' + n).addEventListener('click', async function () {
        const lang = getEl('langSelect' + n).value;
        const data = {
            lang: lang,
            theme: getEl('themeSelect' + n).value,
            kind: 'service',
            currency: getEl('currencySelect' + n).value,
            number: getEl('invNum' + n).value.trim(),
            date: getEl('invDate' + n).value,
            vatRate: parseFloat(getEl('vatRate' + n).value) || 0,
            client: { name: getEl('clientName' + n).value.trim(), code: getEl('clientCode' + n).value.trim() },
            rows: [{ desc: getEl('itemDesc' + n).value, amount: parseFloat(getEl('itemPrice' + n).value) || 0 }],
            seller: fixedSeller ? networkerSeller(lang) : {
                name: getEl('sellerName' + n).value.trim(),
                code: getEl('sellerCode' + n).value.trim(),
                ibans: [{ label: 'IBAN:', value: getEl('sellerBank' + n).value.trim() }]
            },
            logo: fixedSeller ? await getNetworkerLogo() : (uploadedLogos[n] || null)
        };
        downloadInvoice(this, data);
    });

    updateCalc();
}
setupServiceTab('2');
setupServiceTab('3');

/* ===================== Вкладка 4: продукция ===================== */
setupThemeSwitcher('themeSelect4', 'invoice4');
setupLogoInput('4');

let productRowsData = [
    { desc: 'სამშენებლო მასალა', unit: 'ცალი', unitPrice: 50, qty: 10 }
];

function renderProductsForm() {
    const container = getEl('productsContainer');
    container.innerHTML = '';
    const unitOptions = Object.keys(UNITS).map(u => `<option value="${u}">${u}</option>`).join('');

    productRowsData.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'product-item-row';
        // В шаблон не подставляем пользовательский текст — значения выставляются ниже через .value
        div.innerHTML = `
            <div class="form-group" style="margin-bottom: 8px;">
                <label>პროდუქციის დასახელება #${index + 1}:</label>
                <input type="text" class="p-desc">
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <div style="flex: 1;">
                    <label>ერთეული:</label>
                    <select class="p-unit">${unitOptions}</select>
                </div>
                <div style="flex: 1;">
                    <label>ერთ. ფასი (<span class="cur4">${currencySymbol(getEl('currencySelect4').value)}</span>):</label>
                    <input type="number" class="p-price" step="any">
                </div>
                <div style="flex: 1;">
                    <label>რაოდენობა:</label>
                    <input type="number" class="p-qty" min="0" step="any">
                </div>
            </div>`;

        const descEl = div.querySelector('.p-desc');
        const unitEl = div.querySelector('.p-unit');
        const priceEl = div.querySelector('.p-price');
        const qtyEl = div.querySelector('.p-qty');
        descEl.value = item.desc;
        unitEl.value = item.unit;
        priceEl.value = item.unitPrice;
        qtyEl.value = item.qty;

        descEl.addEventListener('input', e => { item.desc = e.target.value; updateCalc4(); });
        unitEl.addEventListener('change', e => { item.unit = e.target.value; updateCalc4(); });
        priceEl.addEventListener('input', e => { item.unitPrice = parseFloat(e.target.value) || 0; updateCalc4(); });
        qtyEl.addEventListener('input', e => { item.qty = parseFloat(e.target.value) || 0; updateCalc4(); });

        if (productRowsData.length > 1) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-remove-item';
            btn.textContent = 'წაშლა';
            btn.addEventListener('click', () => {
                productRowsData.splice(index, 1);
                renderProductsForm();
                updateCalc4();
            });
            div.appendChild(btn);
        }
        container.appendChild(div);
    });
}

getEl('addProductBtn').addEventListener('click', function () {
    if (productRowsData.length >= 10) {
        alert('მაქსიმუმ შესაძლებელია 10 პუნქტის დამატება!');
        return;
    }
    productRowsData.push({ desc: 'ახალი პროდუქტი', unit: 'ცალი', unitPrice: 10, qty: 1 });
    renderProductsForm();
    updateCalc4();
});

function productRowsForPdf() {
    return productRowsData.map(r => ({
        desc: r.desc, unit: r.unit, unitPrice: r.unitPrice, qty: r.qty,
        amount: round2(r.qty * r.unitPrice)
    }));
}

function updateCalc4() {
    const lang = getEl('langSelect4').value;
    const tbody = getEl('previewTableBody4');
    tbody.innerHTML = '';

    const sym = currencySymbol(getEl('currencySelect4').value);
    const rows = productRowsForPdf();
    rows.forEach(r => {
        const tr = document.createElement('tr');
        const cells = [
            [r.desc, ''],
            [unitLabel(r.unit, lang), 'text-align: center;'],
            [fmt(r.unitPrice) + ' ' + sym, 'text-align: right;'],
            [String(r.qty), 'text-align: center;'],
            [fmt(r.amount) + ' ' + sym, 'text-align: right;']
        ];
        cells.forEach(([text, style]) => {
            const td = document.createElement('td');
            td.textContent = text;          // textContent — безопасно для любых символов
            if (style) td.style.cssText = style;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    const vatRate = parseFloat(getEl('vatRate4').value) || 0;
    const tot = calcTotals(rows.reduce((s, r) => s + r.amount, 0), vatRate);
    getEl('previewSubtotal4').textContent = fmt(tot.subtotal);
    getEl('previewVat4').textContent = fmt(tot.vat);
    getEl('previewTotal4').textContent = fmt(tot.total);
    getEl('tVatLabel4').textContent = vatLabel(lang, vatRate);
}

getEl('langSelect4').addEventListener('change', function () {
    applyLabels('4', this.value, 'product');
    updateCalc4();
});

mirror('invNum4', 'previewNum4', '-');
mirror('invDate4', 'previewDate4', '-');
mirror('clientName4', 'previewClient4', '-');
mirror('clientCode4', 'previewClientCode4', '-');
mirror('sellerName4', 'previewSeller4');
mirror('sellerCode4', 'previewSellerCode4');
mirror('sellerBank4', 'previewBank4');
getEl('vatRate4').addEventListener('change', updateCalc4);
getEl('currencySelect4').addEventListener('change', () => { applyCurrency('4'); updateCalc4(); });

getEl('downloadBtn4').addEventListener('click', function () {
    downloadInvoice(this, {
        lang: getEl('langSelect4').value,
        theme: getEl('themeSelect4').value,
        kind: 'product',
        currency: getEl('currencySelect4').value,
        number: getEl('invNum4').value.trim(),
        date: getEl('invDate4').value,
        vatRate: parseFloat(getEl('vatRate4').value) || 0,
        client: { name: getEl('clientName4').value.trim(), code: getEl('clientCode4').value.trim() },
        seller: {
            name: getEl('sellerName4').value.trim(),
            code: getEl('sellerCode4').value.trim(),
            ibans: [{ label: 'IBAN:', value: getEl('sellerBank4').value.trim() }]
        },
        rows: productRowsForPdf(),
        logo: uploadedLogos['4'] || null
    });
});

renderProductsForm();
updateCalc4();

/* ===================== Tab 1: массовая генерация ===================== */

// Нормальный CSV-парсер: кавычки, запятые внутри названий, разделитель , или ;, BOM, \r\n
function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
    const rows = [];
    let row = [], cell = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
            } else cell += ch;
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === delim) {
            row.push(cell); cell = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); cell = '';
            rows.push(row); row = [];
        } else cell += ch;
    }
    row.push(cell);
    rows.push(row);
    return rows
        .map(r => r.map(c => c.trim()))
        .filter(r => r.some(c => c !== ''));
}

// "1 500,50" / "1500.50" -> 1500.5
function parseAmount(str) {
    return parseFloat(String(str).replace(/\s/g, '').replace(',', '.')) || 0;
}

getEl('bulkDownloadBtn').addEventListener('click', async function () {
    const fileInput = getEl('csvInput');
    if (!fileInput.files.length) {
        alert('გთხოვთ ატვირთოთ CSV ფაილი!');
        return;
    }

    if (!pdfReady) { alert('PDF ბიბლიოთეკა ვერ ჩაიტვირთა (lib/pdfmake.min.js, fonts.js) / PDF-библиотека не загружена'); return; }
    if (typeof JSZip === 'undefined') { alert('JSZip ვერ ჩაიტვირთა (საჭიროა ინტერნეტი ან standalone ვერსია) / JSZip не загружен (нужен интернет или standalone-версия)'); return; }

    const btn = this;
    const progress = getEl('progressText');
    btn.disabled = true;

    try {
        const rows = parseCSV(await fileInput.files[0].text());
        if (!rows.length) { alert('CSV ფაილი ცარიელია!'); return; }

        const zip = new JSZip();
        const folder = zip.folder('invoices');
        const usedNames = new Set();
        const theme = getEl('themeSelect0').value;
        const currency = getEl('currencySelect0').value;
        const logo = await getNetworkerLogo();
        const seller = networkerSeller('ka');
        const year = new Date().getFullYear();

        const startIndex = rows[0].join(',').toLowerCase().includes('client') ? 1 : 0;
        const totalClients = rows.length - startIndex;
        let done = 0, failed = 0;

        for (let i = startIndex; i < rows.length; i++) {
            const parts = rows[i];
            if (parts.length < 2) continue;

            const clientName = parts[0];
            const clientCode = parts[1] || '';
            const amount = parts[2] ? parseAmount(parts[2]) : parseAmount(parts[1]);
            const seq = i - startIndex + 1;
            const invNumStr = parts[3] || `№ ${year}-${String(seq).padStart(3, '0')}`;
            const invDateStr = parts[4] || new Date().toISOString().split('T')[0];

            progress.textContent = `გენერირდება: ${seq} / ${totalClients} (${clientName})`;
            await new Promise(r => setTimeout(r, 0)); // даём браузеру обновить текст прогресса

            try {
                const data = {
                    lang: 'ka', theme: theme, currency: currency, kind: 'service',
                    number: invNumStr, date: invDateStr, vatRate: 18,
                    seller: seller,
                    client: { name: clientName, code: clientCode },
                    rows: [{ desc: 'ყოველთვიური მომსახურება', amount: amount }],
                    logo: logo
                };
                const total = calcTotals(amount, 18).total;
                const blob = await createPdfBlob(buildDocDefinition(data));

                // Одинаковые имена не должны перезаписывать друг друга внутри архива
                let base = makeFileName(clientName, fmt(total), currency), name = base, k = 2;
                while (usedNames.has(name)) name = `${base}_${k++}`;
                usedNames.add(name);

                folder.file(`${name}.pdf`, blob);
                done++;
            } catch (err) {
                console.error('Ошибка строки', i + 1, err);
                failed++;
            }
        }

        progress.textContent = 'მიმდინარეობს ZIP არქივის შექმნა...';
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'invoices_archive.zip';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        progress.textContent = failed
            ? `ჩამოიტვირთა: ${done}, შეცდომა: ${failed} (იხილეთ კონსოლი)`
            : 'ყველა ინვოისი წარმატებით ჩამოიტვირთა!';
    } catch (err) {
        console.error(err);
        progress.textContent = '';
        alert('შეცდომა / Error: ' + err.message);
    } finally {
        btn.disabled = false;
    }
});
