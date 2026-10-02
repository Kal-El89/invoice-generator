/*
 * invoice-pdf.js
 * Строит описание PDF-инвойса для pdfmake. В отличие от html2pdf.js (который «фотографирует»
 * страницу), здесь весь текст пишется в PDF как настоящий текст, поэтому его можно
 * выделять и копировать (в том числе в WhatsApp, Adobe Reader, браузерах).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.InvoicePDF = factory();
})(typeof self !== 'undefined' ? self : this, function () {

    const THEMES = {
        'theme-blue':    { primary: '#2b6cb0' },
        'theme-emerald': { primary: '#2f855a' },
        'theme-dark':    { primary: '#1a202c' },
        'theme-purple':  { primary: '#6b46c1' }
    };

    // Все тексты в одном месте: используются и для превью на странице, и для PDF
    const I18N = {
        ka: {
            invTitle: 'ინვოისი / INVOICE', num: 'ნომერი', date: 'თარიღი',
            seller: 'გამყიდველი', client: 'მყიდველი', codeLabel: 'ს/კ',
            serviceDesc: 'მომსახურების დასახელება', productDesc: 'პროდუქციის დასახელება',
            amount: 'თანხა', unit: 'ერთეული', unitPrice: 'ერთ. ფასი', qty: 'რაოდენობა',
            subtotalService: 'მომსახურების თანხა (დღგ-ს გარეშე)', subtotalProduct: 'პროდუქციის თანხა (დღგ-ს გარეშე)',
            vat: 'დღგ', total: 'სულ გადასახდელი (Total)', download: 'PDF-ის გადმოწერა'
        },
        en: {
            invTitle: 'INVOICE', num: 'Number', date: 'Date',
            seller: 'Seller', client: 'Client', codeLabel: 'ID',
            serviceDesc: 'Description', productDesc: 'Product Description',
            amount: 'Amount', unit: 'Unit', unitPrice: 'Unit price', qty: 'Qty',
            subtotalService: 'Subtotal (Excl. VAT)', subtotalProduct: 'Subtotal (Excl. VAT)',
            vat: 'VAT', total: 'Total Amount Due', download: 'Download PDF'
        },
        ru: {
            invTitle: 'СЧЕТ-ФАКТУРА', num: 'Номер', date: 'Дата',
            seller: 'Продавец', client: 'Покупатель', codeLabel: 'ИД',
            serviceDesc: 'Описание услуг', productDesc: 'Наименование продукции',
            amount: 'Сумма', unit: 'Ед. изм.', unitPrice: 'Цена за ед.', qty: 'Кол-во',
            subtotalService: 'Сумма услуг (без НДС)', subtotalProduct: 'Сумма продукции (без НДС)',
            vat: 'НДС', total: 'Всего к оплате (Total)', download: 'Скачать PDF'
        }
    };

    // Единицы измерения: ключ = значение в <select> (по-грузински), далее перевод
    const UNITS = {
        'ცალი':   { ka: 'ცალი',   en: 'pcs',  ru: 'шт.' },
        'შეკვრა': { ka: 'შეკვრა', en: 'pack', ru: 'упак.' },
        'კუბი':   { ka: 'კუბი',   en: 'm³',   ru: 'м³' },
        'კგ':     { ka: 'კგ',     en: 'kg',   ru: 'кг' },
        'მეტრი':  { ka: 'მეტრი',  en: 'm',    ru: 'м' }
    };

    const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
    const fmt = n => round2(n).toFixed(2);

    function calcTotals(subtotal, vatRate) {
        const sub = round2(subtotal);
        const vat = round2(sub * vatRate / 100);
        return { subtotal: sub, vat: vat, total: round2(sub + vat) };
    }

    function unitLabel(unit, lang) {
        return (UNITS[unit] && UNITS[unit][lang]) || unit;
    }

    function vatLabel(lang, rate) {
        return `${(I18N[lang] || I18N.ka).vat} (${rate}%):`;
    }

    // Безопасное имя файла: оставляем буквы (в т.ч. грузинские и кириллицу) и цифры
    function makeFileName(clientName, total) {
        const raw = `${clientName || 'client'}_${total} ლარი`;
        return raw.replace(/[^\p{L}\p{N}]/gu, '_');
    }

    /*
     * data = {
     *   lang, theme, number, date, logo (PNG/JPEG dataURL | null), vatRate,
     *   seller: { name, code, ibans: [{label, value}] },
     *   client: { name, code },
     *   kind: 'service' | 'product',
     *   rows: service: [{desc, amount}] | product: [{desc, unit, unitPrice, qty, amount}]
     * }
     */
    function buildDocDefinition(data) {
        const lang = I18N[data.lang] ? data.lang : 'ka';
        const t = I18N[lang];
        const P = (THEMES[data.theme] || THEMES['theme-blue']).primary;
        const TEXT = '#2d3748';
        const BORDER = '#e2e8f0';
        const PAGE_W = 595.28, MARGIN = 36;
        const W = PAGE_W - MARGIN * 2;
        const isProduct = data.kind === 'product';

        const subtotal = data.rows.reduce((s, r) => s + (r.amount || 0), 0);
        const tot = calcTotals(subtotal, data.vatRate);

        // Строка «Подпись: значение». Одна строка текста => легко выделяется и копируется целиком.
        const line = (label, value, boldLabel) => ({
            text: [{ text: label + ' ', bold: boldLabel !== false }, { text: String(value) }],
            margin: [0, 1.5, 0, 0]
        });

        // ---- Шапка: заголовок, номер, дата + логотип ----
        const header = {
            columns: [
                {
                    width: '*',
                    stack: [
                        { text: t.invTitle, fontSize: 17, bold: true, color: P, margin: [0, 0, 0, 8] },
                        line(t.num + ':', data.number || '-'),
                        line(t.date + ':', data.date || '-')
                    ]
                },
                data.logo
                    ? { width: 140, image: data.logo, fit: [140, 56], alignment: 'right' }
                    : { width: 140, text: '' }
            ]
        };

        const headerRule = {
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: W, y2: 0, lineWidth: 2.25, lineColor: P }],
            margin: [0, 10, 0, 0]
        };

        // ---- Продавец / Покупатель ----
        const sellerStack = [
            { text: t.seller + ':', bold: true },
            { text: data.seller.name, margin: [0, 1.5, 0, 0] },
            line(t.codeLabel + ':', data.seller.code)
        ].concat((data.seller.ibans || []).map(i => line(i.label, i.value)));

        const clientStack = [
            { text: t.client + ':', bold: true },
            { text: data.client.name || '-', bold: true, fontSize: 11, margin: [0, 1.5, 0, 0] },
            line(t.codeLabel + ':', data.client.code || '-', false)
        ];

        const parties = {
            columns: [
                { width: '*', stack: sellerStack },
                { width: '*', stack: clientStack, alignment: 'right' }
            ],
            columnGap: 20,
            margin: [0, 16, 0, 0]
        };

        // ---- Таблица ----
        const th = (text, align) => ({ text, bold: true, color: '#ffffff', fillColor: P, alignment: align });
        let widths, body;
        if (isProduct) {
            widths = ['*', 58, 72, 56, 80];
            body = [[
                th(t.productDesc, 'left'), th(t.unit, 'center'), th(t.unitPrice, 'right'),
                th(t.qty, 'center'), th(t.amount, 'right')
            ]].concat(data.rows.map(r => [
                { text: r.desc },
                { text: unitLabel(r.unit, lang), alignment: 'center' },
                { text: fmt(r.unitPrice) + ' ₾', alignment: 'right' },
                { text: String(r.qty), alignment: 'center' },
                { text: fmt(r.amount) + ' ₾', alignment: 'right' }
            ]));
        } else {
            widths = ['*', 110];
            body = [[th(t.serviceDesc, 'left'), th(t.amount, 'right')]].concat(
                data.rows.map(r => [{ text: r.desc }, { text: fmt(r.amount) + ' ₾', alignment: 'right' }])
            );
        }

        const table = {
            table: { headerRows: 1, widths: widths, body: body, dontBreakRows: true },
            layout: {
                hLineWidth: () => 0.75, vLineWidth: () => 0.75,
                hLineColor: () => BORDER, vLineColor: () => BORDER,
                paddingLeft: () => 7, paddingRight: () => 7, paddingTop: () => 6, paddingBottom: () => 6
            },
            margin: [0, 18, 0, 0]
        };

        // ---- Итоги ----
        const subLabel = isProduct ? t.subtotalProduct : t.subtotalService;
        const val = txt => ({ text: txt + ' ₾', alignment: 'right', bold: true });
        const totals = {
            unbreakable: true,
            margin: [0, 16, 0, 0],
            columns: [
                { width: '*', text: '' },
                {
                    width: 340,
                    table: {
                        widths: ['*', 90],
                        body: [
                            [{ text: subLabel + ':', alignment: 'right' }, val(fmt(tot.subtotal))],
                            [{ text: vatLabel(lang, data.vatRate), alignment: 'right' }, val(fmt(tot.vat))],
                            [
                                { text: t.total + ':', alignment: 'right', bold: true, fontSize: 12.5, color: P },
                                { text: fmt(tot.total) + ' ₾', alignment: 'right', bold: true, fontSize: 12.5, color: P }
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: i => (i === 2 ? 1.5 : 0), vLineWidth: () => 0,
                        hLineColor: () => P,
                        paddingLeft: () => 0, paddingRight: () => 0,
                        paddingTop: i => (i === 2 ? 6 : 2), paddingBottom: () => 2
                    }
                }
            ]
        };

        return {
            pageSize: 'A4',
            pageMargins: [MARGIN, MARGIN, MARGIN, MARGIN],
            defaultStyle: { font: 'InvoiceSans', fontSize: 10, color: TEXT, lineHeight: 1.25 },
            info: {
                title: `${t.invTitle} ${data.number || ''}`.trim(),
                author: data.seller.name,
                subject: data.client.name || ''
            },
            content: [header, headerRule, parties, table, totals]
        };
    }

    return { THEMES, I18N, UNITS, round2, fmt, calcTotals, unitLabel, vatLabel, makeFileName, buildDocDefinition };
});
