let frame = document.querySelector('#preview');
const results = document.querySelector('#results');
let passed = 0;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (ok, name) => {
    if (!ok) throw new Error(name);
    const li = document.createElement('li'); li.className = 'test-result'; li.textContent = 'PASS: ' + name;
    results.append(li); passed++;
};
const load = async (page, width) => {
    const next = frame.cloneNode(); next.removeAttribute('srcdoc'); frame.replaceWith(next); frame = next;
    frame.style.width = width + 'px';
    const token = String(Date.now()) + Math.random();
    const html = await (await fetch(`../docs/${page}.html?test=${token}`)).text();
    frame.srcdoc = html.replace('<head>', `<head><base href="${new URL('../docs/', location.href)}">`).replace('<body>', `<body data-test-token="${token}">`);
    const start = Date.now();
    while (frame.contentDocument?.body?.dataset.testToken !== token || !frame.contentWindow.SearchController) {
        if (Date.now() - start > 15000) throw new Error('Загрузка ' + page);
        await wait(40);
    }
    await Promise.race([frame.contentDocument.fonts.ready, wait(1000)]);
    await wait(80);
    return frame.contentDocument;
};
const css = (el, pseudo) => frame.contentWindow.getComputedStyle(el, pseudo);
const change = input => input.dispatchEvent(new frame.contentWindow.Event('change', {bubbles:true}));
const inputEvent = input => input.dispatchEvent(new frame.contentWindow.Event('input', {bubbles:true}));
const overflow = doc => doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 1;
function buttonStates(doc) {
    const buttons=[...doc.querySelectorAll('.btn')].filter(el=>el.getClientRects().length && !el.disabled);
    const initial=buttons.map(el=>[css(el).color,css(el).backgroundColor]);
    let states='';
    const walk=rules=>[...rules].forEach(rule=>{
        if(rule.selectorText && /:(hover|active)/.test(rule.selectorText)) states+=rule.selectorText.replaceAll(':hover','.test-hover').replaceAll(':active','.test-active')+'{'+rule.style.cssText+'}';
        else if(rule.cssRules && (!rule.conditionText || !rule.media || frame.contentWindow.matchMedia(rule.conditionText).matches)) walk(rule.cssRules);
    });
    [...doc.styleSheets].forEach(sheet=>{try{walk(sheet.cssRules);}catch{}});
    const style=doc.createElement('style');style.textContent=states;doc.head.append(style);
    let ok=true;
    for(const state of ['test-hover','test-active']) {
        buttons.forEach(el=>el.classList.add(state));
        doc.getAnimations().forEach(a=>a.finish());
        ok &&= buttons.every((el,index)=>{
            if(el.classList.contains('btn-primary')) return css(el).backgroundColor==='rgb(251, 126, 0)' && css(el).color==='rgb(255, 255, 255)';
            if(el.classList.contains('btn-white')) return css(el).backgroundColor==='rgb(255, 255, 255)' && css(el).color==='rgb(255, 98, 1)';
            if(el.classList.contains('btn-secondary')) return css(el).color==='rgb(255, 98, 1)' && css(el).backgroundColor===(state==='test-active'?'rgb(242, 244, 248)':'rgb(242, 242, 242)');
            return true;
        });
        buttons.forEach(el=>el.classList.remove(state));
        doc.getAnimations().forEach(a=>a.finish());
    }
    style.remove();return ok;
}
try {
    const widths = new URLSearchParams(location.search).has('width') ? [Number(new URLSearchParams(location.search).get('width'))] : [375, 768, 1440];
    for (const width of widths) {
        let sidebar, metrics;
        for (const page of ['lk-person', 'lk-orders', 'lk-order', 'lk-address']) {
            const doc = await load(page, width);
            const menu = doc.querySelector('.account__sidebar');
            const markup = menu.outerHTML.replace(/ aria-current="page"/g,'').replace(/\s+/g,' ');
            const m = [css(menu).width, css(menu).padding, css(menu).display, css(doc.querySelector('.account__body')).gridTemplateColumns, css(doc.querySelector('.header')).display].join('|');
            if (!sidebar) { sidebar = markup; metrics = m; }
            check(markup === sidebar && m === metrics, `${width}: единая структура и размеры меню ${page} (${m})`);
            check(!overflow(doc), `${width}: ${page} без горизонтального переполнения`);
            check(buttonStates(doc), `${width}: общие кнопки ${page} соответствуют состояниям UI-кита`);
        }
        let doc = await load('lk-orders', width);
        const initial = doc.querySelector('.orders__list').innerHTML;
        const query = doc.querySelector('.orders__input');
        query.value = 'несуществующий заказ'; inputEvent(query);
        doc.querySelectorAll('.orders__filters select').forEach(el => { el.selectedIndex=1; change(el); });
        doc.querySelector('.orders__filters').dispatchEvent(new frame.contentWindow.Event('submit', {bubbles:true,cancelable:true}));
        check(doc.querySelector('.orders__list').innerHTML === initial, `${width}: поиск и фильтры не меняют заказы`);
        const clear = query.closest('.search-field').querySelector('.search-field__clear');
        check(!clear.hidden && query.type === 'text', `${width}: текстовое поле заказов показывает крестик`);
        clear.click();
        check(query.value === '' && clear.hidden && doc.activeElement === query, `${width}: очистка заказов возвращает фокус`);
        check(css(query).backgroundColor === 'rgb(255, 255, 255)', `${width}: поле поиска белое при фокусе`);
        doc = await load('lk-address', width);
        const control = doc.querySelector('.segmented-control');
        doc.querySelector('[data-address-tab="pickup"]').click();
        doc.getAnimations().forEach(a=>a.finish());
        check(new frame.contentWindow.DOMMatrix(css(control,'::before').transform).m41 > 0, `${width}: общая подложка адресов переместилась`);
        check(!doc.querySelector('#pickup-addresses').hidden && doc.querySelector('#delivery-addresses').hidden, `${width}: переключение адресов сохранено`);
        for (const page of ['catalog','search']) {
            doc = await load(page, width);
            const names = () => [...doc.querySelectorAll('.product-listing__item')].map(el=>el.textContent.trim()).join('|');
            const before = names();
            const count = doc.querySelector('.product-listing__count').textContent;
            const sort = doc.querySelector('.product-listing__sort'); sort.value='price-desc'; change(sort);
            doc.querySelector('.listing-filter__checkbox').click();
            const min = doc.querySelector('[name="min_price"]'); min.value='999999'; inputEvent(min);
            doc.querySelectorAll('.product-listing__tag')[1].click();
            doc.querySelector('.listing-filter').dispatchEvent(new frame.contentWindow.Event('submit',{bubbles:true,cancelable:true}));
            check(names() === before && doc.querySelector('.product-listing__count').textContent === count && !doc.querySelector('.product-listing__item[hidden]'), `${width}: ${page} не фильтрует и не сортирует товары`);
            const selected = doc.querySelector('.product-listing__selected');
            const chip = selected.querySelector('.product-listing__chip');
            if (chip) { const n=selected.querySelectorAll('.product-listing__chip').length; chip.click(); check(selected.querySelectorAll('.product-listing__chip').length === n-1 && names()===before, `${width}: крестик удаляет только chip`); }
            const checkbox=doc.querySelector('.listing-filter__checkbox');
            if (!checkbox.checked) checkbox.click();
            doc.getAnimations().forEach(a=>a.finish());
            const tick=css(checkbox.nextElementSibling,'::before');
            check(tick.color==='rgb(255, 255, 255)' && tick.content.includes('\ue91a'), `${width}: белая галочка каталога`);
            const favorite=doc.querySelector('.favorite-btn'); favorite.click();
            check(css(favorite,'::before').animationName==='favorite-pulse', `${width}: анимация сердечка ${page}`);
            const crumbs=doc.querySelector('.breadcrumbs__container').getBoundingClientRect();
            const body=doc.querySelector('.product-listing__container').getBoundingClientRect();
            check(Math.abs(crumbs.x-body.x)<1 && Math.abs(crumbs.width-body.width)<1, `${width}: крошки совпадают с ${page}`);
        }
        doc = await load('faq',width);
        const questions=[...doc.querySelectorAll('.faq__item')];
        doc.querySelector('.faq__filter').addEventListener('click', event=>event.preventDefault(), {once:true});
        doc.querySelector('.faq__filter').click();
        check(questions.every(el=>!el.hidden) && doc.querySelector('.faq__filter').tagName==='A', `${width}: FAQ использует ссылки без фильтрации`);
        const question=doc.querySelector('.faq__question'); const answer=question.nextElementSibling; const item=question.parentElement;
        if (!item.open) { question.click(); await wait(340); }
        question.click();
        check(item.open && item.getAnimations().length>0, `${width}: FAQ анимирует закрытие`);
        await wait(25); question.click(); await wait(25); question.click(); await wait(350);
        check(!item.open && item.style.overflow==='', `${width}: быстрые клики FAQ завершаются корректно`);
        question.click(); await wait(350);
        check(item.open && answer.getBoundingClientRect().height>0, `${width}: FAQ открывается после разворота`);
        const realMedia=frame.contentWindow.matchMedia;
        frame.contentWindow.matchMedia = value => value.includes('prefers-reduced-motion') ? {matches:true} : realMedia.call(frame.contentWindow,value);
        question.click();
        check(!item.open && item.getAnimations().length===0, `${width}: reduced motion закрывает FAQ сразу`);
        frame.contentWindow.matchMedia=realMedia;
        for (const page of ['contacts','faq','service','spare-parts']) {
            doc=await load(page,width);
            const upload=doc.querySelector('.file-upload'); const file=upload.querySelector('input'); const form=file.form;
            const setFiles = sizes => {
                const transfer=new frame.contentWindow.DataTransfer();
                sizes.forEach(size=>transfer.items.add(new frame.contentWindow.File(['x'.repeat(size)], 'same<name>.txt', {type:'text/plain',lastModified:size})));
                file.files=transfer.files; change(file);
            };
            setFiles(file.multiple ? [1,2,3] : [1]);
            check(upload.querySelectorAll('.file-upload__item').length===file.files.length && !upload.querySelector('.file-upload__name').querySelector('name'), `${width}: ${page} отображает реальные файлы безопасным текстом`);
            if (file.multiple) {
                upload.querySelectorAll('.file-upload__remove')[1].click();
                const submitted=new frame.contentWindow.FormData(form).getAll(file.name);
                check(file.files.length===2 && file.files[0].size===1 && file.files[1].size===3 && submitted.length===2 && submitted[1].size===3, `${width}: ${page} удаляет средний файл из FileList и FormData`);
            }
            while(file.files.length) upload.querySelector('.file-upload__remove').click();
            check(upload.querySelector('.file-upload__list').hidden && file.files.length===0, `${width}: ${page} удаляет последний файл`);
            setFiles([4]); form.reset(); await wait(0);
            check(file.files.length===0 && upload.querySelector('.file-upload__list').hidden, `${width}: ${page} повторный выбор и reset`);
            const consent=doc.querySelector('.checkbox__input'); consent.checked=true; change(consent);
            doc.getAnimations().forEach(a=>a.finish());
            check(css(consent.nextElementSibling,'::before').color==='rgb(255, 255, 255)', `${width}: ${page} белая галочка согласия`);
            check([...doc.querySelectorAll('.checkbox__link')].every(link=>link.getAttribute('href')==='policy.html' && css(link).textDecorationLine.includes('underline')), `${width}: ${page} политика подчёркнута`);
            check(css(upload.querySelector('.icon-clip'),'::before').content.includes('\ue947'), `${width}: ${page} использует общий глиф Clip`);
        }
        doc=await load('contacts',width);
        const form=doc.querySelector('.contacts__form');
        form.querySelector('[name="phone"]').value='+7 (999) 123-45-67'; form.querySelector('[name="consent"]').checked=true;
        check(!form.querySelector('[name="name"]').required && frame.contentWindow.FormController.validateForm(form), `${width}: контакты требуют телефон и согласие, имя необязательно`);
        doc=await load('reviews',width);
        const list=doc.querySelector('.review-group__list'); const reviews=list.innerHTML;
        doc.querySelector('.review-sort__select').selectedIndex=1; change(doc.querySelector('.review-sort__select'));
        check(list.children.length===3 && list.innerHTML===reviews, `${width}: ровно три отзыва без сортировки`);
        // Replay only pseudo-class selectors with equivalent class specificity.
        const button=doc.querySelector('.rating-summary__btn'); const original=[css(button).color,css(button).backgroundColor];
        let states='';
        const walk = rules => [...rules].forEach(rule=> {
            if (rule.selectorText && /:(hover|active)/.test(rule.selectorText)) states+=rule.selectorText.replaceAll(':hover','.test-hover').replaceAll(':active','.test-active')+'{'+rule.style.cssText+'}';
            else if (rule.cssRules && (!rule.conditionText || !rule.media || frame.contentWindow.matchMedia(rule.conditionText).matches)) walk(rule.cssRules);
        });
        [...doc.styleSheets].forEach(sheet=>{try{walk(sheet.cssRules);}catch{}});
        const stateStyle=doc.createElement('style'); stateStyle.textContent=states; doc.head.append(stateStyle);
        for(const state of ['test-hover','test-active']) {
            button.classList.add(state);
            doc.getAnimations().forEach(a=>a.finish());
            check(css(button).backgroundColor==='rgb(255, 255, 255)' && css(button).color==='rgb(255, 98, 1)', `${width}: ${state} белой кнопки соответствует UI-киту`);
            button.classList.remove(state);
        }
        doc=await load('blog',width);
        const visible=()=>[...doc.querySelectorAll('.news-card')].filter(el=>el.getClientRects().length).length;
        const n=visible();doc.querySelector('.news__btn')?.click();check(visible()===n,`${width}: Blog не догружает новости`);
    }
    document.title=`PASS: ${passed} проверок второго этапа`;
} catch(error) {
    const li=document.createElement('li');li.className='test-error';li.textContent='FAIL: '+error.message;results.append(li);
    document.title='FAIL: второй этап'; console.error(error);
}
