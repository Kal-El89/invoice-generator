function switchTab(index) {
    const tabs = document.querySelectorAll('.tab-content');
    const btns = document.querySelectorAll('.tab-btn');
    tabs.forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
        btns[i].classList.toggle('active', i === index);
    });
}

const texts = {
    ka: { invTitle: "ინვოისი", tNum: "ნომერი", tDate: "თარიღი", tSellerTitle: "გამყიდველი", tClientTitle: "მყიდველი", thDesc: "მომსახურების დასახელება", thPrice: "თანხა", tSubtotalLabel: "მომსახურების თანხა (დღგ-ს გარეშე)", tVatLabel: "დღგ", tTotalLabel: "სულ გადასახდელი (Total)", downloadBtn: "PDF-ის გადმოწერა" },
    en: { invTitle: "INVOICE", tNum: "Number", tDate: "Date", tSellerTitle: "Seller", tClientTitle: "Client", thDesc: "Description", thPrice: "Amount", tSubtotalLabel: "Subtotal (Excl. VAT)", tVatLabel: "VAT", tTotalLabel: "Total Amount Due", downloadBtn: "Download PDF" },
    ru: { invTitle: "СЧЕТ-ФАКТУРА", tNum: "Номер", tDate: "Дата", tSellerTitle: "Продавец", tClientTitle: "Покупатель", thDesc: "Описание услуг", thPrice: "Сумма", tSubtotalLabel: "Сумма услуг (без НДС)", tVatLabel: "НДС", tTotalLabel: "Всего к оплате (Total)", downloadBtn: "Скачать PDF" }
};

const textsProduct = {
    ka: { invTitle: "ინვოისი", tNum: "ნომერი", tDate: "თარიღი", tSellerTitle: "გამყიდველი", tClientTitle: "მყიდველი", thDesc: "პროდუქციის დასახელება", thPrice: "თანხა", tSubtotalLabel: "პროდუქციის თანხა (დღგ-ს გარეშე)", tVatLabel: "დღგ", tTotalLabel: "სულ გადასახდელი (Total)", downloadBtn: "PDF-ის გადმოწერა" },
    en: { invTitle: "INVOICE", tNum: "Number", tDate: "Date", tSellerTitle: "Seller", tClientTitle: "Client", thDesc: "Product Description", thPrice: "Amount", tSubtotalLabel: "Subtotal (Excl. VAT)", tVatLabel: "VAT", tTotalLabel: "Total Amount Due", downloadBtn: "Download PDF" },
    ru: { invTitle: "СЧЕТ-ФАКТУРА", tNum: "Номер", tDate: "Дата", tSellerTitle: "Продавец", tClientTitle: "Покупатель", thDesc: "Наименование продукции", thPrice: "Сумма", tSubtotalLabel: "Сумма продукции (без НДС)", tVatLabel: "НДС", tTotalLabel: "Всего к оплате (Total)", downloadBtn: "Скачать PDF" }
};

const getEl = id => document.getElementById(id);

// --- ტაბი 2 ლოგიკა (ინდივიდუალური) ---
function updateCalc2() {
    let price = parseFloat(getEl('itemPrice2').value) || 0;
    let vatRate = parseFloat(getEl('vatRate2').value) || 0;
    let vatAmount = (price * vatRate) / 100;
    let total = price + vatAmount;

    getEl('previewPrice2').innerText = price.toFixed(2);
    getEl('previewSubtotal2').innerText = price.toFixed(2);
    getEl('previewVat2').innerText = vatAmount.toFixed(2);
    getEl('previewTotal2').innerText = total.toFixed(2);
    
    let lang = getEl('langSelect2').value;
    getEl('tVatLabel2').innerText = (lang == 'en' ? `VAT (${vatRate}%):` : (lang == 'ru' ? `НДС (${vatRate}%):` : `დღგ (${vatRate}%):`));
}

getEl('langSelect2').addEventListener('change', function() {
    let t = texts[this.value];
    getEl('invTitle2').innerText = t.invTitle;
    getEl('tNum2').innerText = t.tNum;
    getEl('tDate2').innerText = t.tDate;
    getEl('tSellerTitle2').innerText = t.tSellerTitle;
    getEl('tClientTitle2').innerText = t.tClientTitle;
    getEl('thDesc2').innerText = t.thDesc;
    getEl('thPrice2').innerText = t.thPrice;
    getEl('tSubtotalLabel2').innerText = t.tSubtotalLabel + ":";
    getEl('tTotalLabel2').innerText = t.tTotalLabel + ":";
    getEl('downloadBtn2').innerText = t.downloadBtn;
    updateCalc2();
});

getEl('invNum2').addEventListener('input', e => getEl('previewNum2').innerText = e.target.value);
getEl('invDate2').addEventListener('input', e => getEl('previewDate2').innerText = e.target.value);
getEl('clientName2').addEventListener('input', e => getEl('previewClient2').innerText = e.target.value);
getEl('clientCode2').addEventListener('input', e => getEl('previewClientCode2').innerText = e.target.value);
getEl('sellerName2').addEventListener('input', e => getEl('previewSeller2').innerText = e.target.value);
getEl('sellerCode2').addEventListener('input', e => getEl('previewSellerCode2').innerText = e.target.value);
getEl('sellerBank2').addEventListener('input', e => getEl('previewBank2').innerText = e.target.value);
getEl('itemDesc2').addEventListener('input', e => getEl('previewDesc2').innerText = e.target.value);
getEl('itemPrice2').addEventListener('input', updateCalc2);
getEl('vatRate2').addEventListener('change', updateCalc2);

getEl('logoInput2').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = ev => getEl('previewLogo2').src = ev.target.result;
        reader.readAsDataURL(file);
    }
});

getEl('downloadBtn2').addEventListener('click', function() {
    html2pdf().from(getEl('invoice2')).set({
        margin: 10, filename: `invoice_${getEl('invNum2').value.trim() || 'invoice'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
});


// --- ტაბი 3 ლოგიკა (ნეთვორქერ თიმი) ---
function updateCalc3() {
    let price = parseFloat(getEl('itemPrice3').value) || 0;
    let vatRate = parseFloat(getEl('vatRate3').value) || 0;
    let vatAmount = (price * vatRate) / 100;
    let total = price + vatAmount;

    getEl('previewPrice3').innerText = price.toFixed(2);
    getEl('previewSubtotal3').innerText = price.toFixed(2);
    getEl('previewVat3').innerText = vatAmount.toFixed(2);
    getEl('previewTotal3').innerText = total.toFixed(2);
    
    let lang = getEl('langSelect3').value;
    getEl('tVatLabel3').innerText = (lang == 'en' ? `VAT (${vatRate}%):` : (lang == 'ru' ? `НДС (${vatRate}%):` : `დღგ (${vatRate}%):`));
}

getEl('langSelect3').addEventListener('change', function() {
    let t = texts[this.value];
    getEl('invTitle3').innerText = t.invTitle;
    getEl('tNum3').innerText = t.tNum;
    getEl('tDate3').innerText = t.tDate;
    getEl('tSellerTitle3').innerText = t.tSellerTitle;
    getEl('tClientTitle3').innerText = t.tClientTitle;
    getEl('thDesc3').innerText = t.thDesc;
    getEl('thPrice3').innerText = t.thPrice;
    getEl('tSubtotalLabel3').innerText = t.tSubtotalLabel + ":";
    getEl('tTotalLabel3').innerText = t.tTotalLabel + ":";
    getEl('downloadBtn3').innerText = t.downloadBtn;
    updateCalc3();
});

getEl('invNum3').addEventListener('input', e => getEl('previewNum3').innerText = e.target.value);
getEl('invDate3').addEventListener('input', e => getEl('previewDate3').innerText = e.target.value);
getEl('clientName3').addEventListener('input', e => getEl('previewClient3').innerText = e.target.value);
getEl('clientCode3').addEventListener('input', e => getEl('previewClientCode3').innerText = e.target.value);
getEl('itemDesc3').addEventListener('input', e => getEl('previewDesc3').innerText = e.target.value);
getEl('itemPrice3').addEventListener('input', updateCalc3);
getEl('vatRate3').addEventListener('change', updateCalc3);

getEl('downloadBtn3').addEventListener('click', function() {
    html2pdf().from(getEl('invoice3')).set({
        margin: 10, filename: `invoice_${getEl('invNum3').value.trim() || 'invoice'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
});


// --- ტაბი 4 ლოგიკა (პროდუქციის ინვოისი დინამიური პუნქტებით) ---
let productRowsData = [
    { desc: "სამშენებლო მასალა", unit: "ცალი", unitPrice: 50, qty: 10 }
];

function renderProductsForm() {
    const container = getEl('productsContainer');
    container.innerHTML = '';
    productRowsData.forEach((item, index) => {
        let div = document.createElement('div');
        div.className = 'product-item-row';
        div.innerHTML = `
            <div class="form-group" style="margin-bottom: 8px;">
                <label>პროდუქციის დასახელება #${index + 1}:</label>
                <input type="text" class="p-desc" data-index="${index}" value="${item.desc}">
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <div style="flex: 1;">
                    <label>ერთეული:</label>
                    <select class="p-unit" data-index="${index}">
                        <option value="ცალი" ${item.unit === 'ცალი' ? 'selected' : ''}>ცალი</option>
                        <option value="შეკვრა" ${item.unit === 'შეკვრა' ? 'selected' : ''}>შეკვრა</option>
                        <option value="კუბი" ${item.unit === 'კუბი' ? 'selected' : ''}>კუბი</option>
                        <option value="კგ" ${item.unit === 'კგ' ? 'selected' : ''}>კგ</option>
                        <option value="მეტრი" ${item.unit === 'მეტრი' ? 'selected' : ''}>მეტრი</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label>ერთ. ფასი (₾):</label>
                    <input type="number" class="p-price" data-index="${index}" value="${item.unitPrice}" step="any">
                </div>
                <div style="flex: 1;">
                    <label>რაოდენობა:</label>
                    <input type="number" class="p-qty" data-index="${index}" value="${item.qty}" min="0" step="any">
                </div>
            </div>
            ${productRowsData.length > 1 ? `<button type="button" class="btn-remove-item" onclick="removeProductRow(${index})">წაშლა</button>` : ''}
        `;
        container.appendChild(div);
    });

    container.querySelectorAll('.p-desc').forEach(el => el.addEventListener('input', e => {
        productRowsData[e.target.dataset.index].desc = e.target.value;
        updateCalc4();
    }));
    container.querySelectorAll('.p-unit').forEach(el => el.addEventListener('change', e => {
        productRowsData[e.target.dataset.index].unit = e.target.value;
        updateCalc4();
    }));
    container.querySelectorAll('.p-price').forEach(el => el.addEventListener('input', e => {
        productRowsData[e.target.dataset.index].unitPrice = parseFloat(e.target.value) || 0;
        updateCalc4();
    }));
    container.querySelectorAll('.p-qty').forEach(el => el.addEventListener('input', e => {
        productRowsData[e.target.dataset.index].qty = parseFloat(e.target.value) || 0;
        updateCalc4();
    }));
}

window.removeProductRow = function(index) {
    productRowsData.splice(index, 1);
    renderProductsForm();
    updateCalc4();
}

getEl('addProductBtn').addEventListener('click', function() {
    if (productRowsData.length >= 10) {
        alert("მაქსიმუმ შესაძლებელია 10 პუნქტის დამატება!");
        return;
    }
    productRowsData.push({ desc: "ახალი პროდუქტი", unit: "ცალი", unitPrice: 10, qty: 1 });
    renderProductsForm();
    updateCalc4();
});

function updateCalc4() {
    let subtotal = 0;
    let tbody = getEl('previewTableBody4');
    tbody.innerHTML = '';

    productRowsData.forEach(item => {
        let lineTotal = item.qty * item.unitPrice;
        subtotal += lineTotal;

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.desc}</td>
            <td style="text-align: center;">${item.unit}</td>
            <td style="text-align: right;">${item.unitPrice.toFixed(2)} ₾</td>
            <td style="text-align: center;">${item.qty}</td>
            <td style="text-align: right;">${lineTotal.toFixed(2)} ₾</td>
        `;
        tbody.appendChild(tr);
    });

    let vatRate = parseFloat(getEl('vatRate4').value) || 0;
    let vatAmount = (subtotal * vatRate) / 100;
    let total = subtotal + vatAmount;

    getEl('previewSubtotal4').innerText = subtotal.toFixed(2);
    getEl('previewVat4').innerText = vatAmount.toFixed(2);
    getEl('previewTotal4').innerText = total.toFixed(2);
    
    let lang = getEl('langSelect4').value;
    getEl('tVatLabel4').innerText = (lang == 'en' ? `VAT (${vatRate}%):` : (lang == 'ru' ? `НДС (${vatRate}%):` : `დღგ (${vatRate}%):`));
}

getEl('langSelect4').addEventListener('change', function() {
    let t = textsProduct[this.value];
    getEl('invTitle4').innerText = t.invTitle;
    getEl('tNum4').innerText = t.tNum;
    getEl('tDate4').innerText = t.tDate;
    getEl('tSellerTitle4').innerText = t.tSellerTitle;
    getEl('tClientTitle4').innerText = t.tClientTitle;
    getEl('thDesc4').innerText = t.thDesc;
    getEl('thPrice4').innerText = t.thPrice;
    getEl('tSubtotalLabel4').innerText = t.tSubtotalLabel + ":";
    getEl('tTotalLabel4').innerText = t.tTotalLabel + ":";
    getEl('downloadBtn4').innerText = t.downloadBtn;
    updateCalc4();
});

getEl('invNum4').addEventListener('input', e => getEl('previewNum4').innerText = e.target.value);
getEl('invDate4').addEventListener('input', e => getEl('previewDate4').innerText = e.target.value);
getEl('clientName4').addEventListener('input', e => getEl('previewClient4').innerText = e.target.value);
getEl('clientCode4').addEventListener('input', e => getEl('previewClientCode4').innerText = e.target.value);
getEl('sellerName4').addEventListener('input', e => getEl('previewSeller4').innerText = e.target.value);
getEl('sellerCode4').addEventListener('input', e => getEl('previewSellerCode4').innerText = e.target.value);
getEl('sellerBank4').addEventListener('input', e => getEl('previewBank4').innerText = e.target.value);
getEl('vatRate4').addEventListener('change', updateCalc4);

getEl('logoInput4').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = ev => getEl('previewLogo4').src = ev.target.result;
        reader.readAsDataURL(file);
    }
});

getEl('downloadBtn4').addEventListener('click', function() {
    html2pdf().from(getEl('invoice4')).set({
        margin: 10, filename: `product_invoice_${getEl('invNum4').value.trim() || 'invoice'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
});

renderProductsForm();
updateCalc4();


// --- მასობრივი გენერაცია (ტაბი 1) ---
getEl('bulkDownloadBtn').addEventListener('click', async function() {
    const fileInput = getEl('csvInput');
    if (!fileInput.files.length) {
        alert("გთხოვთ ატვირთოთ CSV ფაილი!");
        return;
    }

    const text = await fileInput.files[0].text();
    const rows = text.split('\n').map(r => r.trim()).filter(r => r);
    const zip = new JSZip();
    const folder = zip.folder("invoices");
    const progress = getEl('progressText');

    let startIndex = rows[0].toLowerCase().includes('client') ? 1 : 0;
    let totalClients = rows.length - startIndex;

    for (let i = startIndex; i < rows.length; i++) {
        let parts = rows[i].split(',');
        if (parts.length < 2) continue;
        
        let clientName = parts[0].trim();
        let clientCode = parts[1] ? parts[1].trim() : "";
        let amount = parts[2] ? parseFloat(parts[2].trim()) || 0 : (parseFloat(parts[1].trim()) || 0);
        let invNumStr = parts[3] ? parts[3].trim() : `№ 2026-${(i - startIndex + 1).toString().padStart(3, '0')}`;
        let invDateStr = parts[4] ? parts[4].trim() : new Date().toISOString().split('T')[0];

        let vatAmount = (amount * 18) / 100;
        let total = amount + vatAmount;

        getEl('bPreviewClient').innerText = clientName;
        getEl('bPreviewClientCode').innerText = clientCode;
        getEl('bPreviewNum').innerText = invNumStr;
        getEl('bPreviewDate').innerText = invDateStr;
        getEl('bPreviewPrice').innerText = amount.toFixed(2);
        getEl('bPreviewSubtotal').innerText = amount.toFixed(2);
        getEl('bPreviewVat').innerText = vatAmount.toFixed(2);
        getEl('bPreviewTotal').innerText = total.toFixed(2);

        progress.innerText = `გენერირდება: ${i - startIndex + 1} / ${totalClients} (${clientName})`;
        await new Promise(r => setTimeout(r, 60));

        let pdfBlob = await html2pdf().from(getEl('bulkInvoice')).set({
            margin: 10,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 1.5, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).output('blob');

        folder.file(`invoice_${clientName.replace(/[^a-zA-Z0-9ა-ჰ]/g, "_")}.pdf`, pdfBlob);
    }

    progress.innerText = "მიმდინარეობს ZIP არქივის შექმნა...";
    zip.generateAsync({ type: "blob" }).then(function(content) {
        let link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "invoices_archive.zip";
        link.click();
        progress.innerText = "ყველა ინვოისი წარმატებით ჩამოიტვირთა!";
    });
});