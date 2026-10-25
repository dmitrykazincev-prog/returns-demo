'use strict';
// All data, moderation and submit outcomes are local simulations. No network calls.
const items = [
 {id:'headphones',order:'Заказ № 1042 · 18 октября',name:'Sony WH-1000XM4',description:'Беспроводные наушники · чёрные',price:14990,image:'sony_headphones_160.webp'},
 {id:'lamp',order:'Заказ № 1042 · 18 октября',name:'Arte Lamp Desk LED',description:'Настольная лампа · белая',price:1200,image:'arte_lamp_160.webp'},
 {id:'gauss',order:'Заказ № 1042 · 18 октября',name:'Gauss E27 10W, 8 шт.',description:'Комплект светодиодных ламп',price:3789,image:'gauss_160.webp'},
 {id:'cable',order:'Заказ № 1086 · 20 октября',name:'Кабель USB-C',description:'1 метр · белый',price:500,emoji:'🔌'},
 {id:'adapter',order:'Заказ № 1086 · 20 октября',name:'Сетевой адаптер',description:'20 Вт · белый',price:501,emoji:'🔋'},
 {id:'sofa',order:'Заказ № 1091 · 21 октября',name:'65″ LG OLED evo C3',description:'Телевизор · крупногабаритный товар',price:24990,image:'lg_tv_160.webp',bulky:true},
 {id:'broken',order:'Учебный заказ № 1102 · 22 октября',name:'Керамическая чашка',description:'Мелкий бой · заданный учебный пример без передачи при одобрении брака',price:890,emoji:'☕',teachingNoTransfer:true},
 {id:'expired',order:'Заказ № 0912 · 10 сентября',name:'Кроссовки City',description:'Размер 42 · срок возврата истёк',price:3990,emoji:'👟',expired:true}
];
const emptyDraft=()=>({step:0,selected:[],details:{},index:0,delivery:'pickup',compensation:'points',busy:false,submitError:false,failNext:false});
const state={...emptyDraft(),view:'account',hasDraft:false,applications:[],activeId:null,sequence:0};
const reasons=[['size','Не подошёл размер'],['wrong','Привезли не тот товар'],['defect','Брак']];
const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const selected=()=>state.selected.map(id=>items.find(p=>p.id===id));
function detail(id){return state.details[id]||(state.details[id]={reason:'',comment:'',photos:[],error:''});}
function noTransfer(p){return detail(p.id).reason==='defect'&&(p.teachingNoTransfer===true||p.price<=500);}
function physical(){return selected().filter(p=>!noTransfer(p));}
function mode(){return physical().some(p=>p.bulky)?'freight':physical().length?state.delivery:'none';}
function card(p,selectable=false){return `<${selectable?'button':'div'} class="card ${state.selected.includes(p.id)&&selectable?'selected':''}" ${selectable?`data-item="${p.id}" aria-pressed="${state.selected.includes(p.id)}"`:''}><span class="thumb" aria-hidden="true">${p.image?`<img class="product-image" src="assets/products/${p.image}" width="80" height="80" alt="">`:p.emoji}</span><span class="details"><span class="name">${esc(p.name)}</span><span class="meta" style="display:block">${esc(p.description)}</span><span class="price">${money(p.price)}</span>${p.bulky?'<span class="badge">КГТ</span>':''}${p.expired?'<span class="badge">Срок истёк</span>':''}</span>${selectable&&!p.expired?`<img class="check" src="assets/Svg-ico/Checkbox-${state.selected.includes(p.id)?'enable':'disable'}.svg" alt="${state.selected.includes(p.id)?'Выбран':'Не выбран'}">`:''}</${selectable?'button':'div'}>`;}
function navigate(step){state.view='form';state.step=step;render();$('#content').scrollTop=0;$('#content').focus();}
function showModal(html){$('#modal-content').innerHTML=html;$('#modal').showModal();}
$('#close-modal').onclick=()=>$('#modal').close();
$('#help').onclick=()=>showModal('<h2 id="modal-title">Учебный прототип</h2><p>Товары вымышлены. Заявка, модерация, чат и компенсация работают только в этой вкладке. Ничего не отправляется на сервер.</p><p>Фото хранятся в памяти до закрытия вкладки. Не используйте личные фотографии для демонстрации.</p>');
$('#back').onclick=()=>{if(state.busy)return;if(state.view==='qr'){go('details');return;}if(state.view==='details'){go('returns');return;}if(state.view==='returns'||state.view==='purchases'){go('account');return;}if(state.view==='form'){if(state.step===1&&state.index>0){state.index--;render();}else if(state.step>0){navigate(state.step-1);}else go('returns');}};
function render(){
 cancelAnimationFrame(reasonScrollFrame);reasonTools();
 $('#back').disabled=state.busy||state.view==='account';
 $('h1').textContent={account:'Личный кабинет',returns:'Мои возвраты',purchases:'Покупки',form:'Новый возврат',details:'Детали возврата',qr:'QR для передачи'}[state.view];
 $('#steps').hidden=state.view!=='form';
 $('#leave-draft').hidden=state.view!=='form';$('#leave-draft').disabled=state.busy;
 if(state.view!=='form'){renderHub();return;}
 const icons=['step-1/item.svg','step-2/Cause.svg','step-03/delivery.svg'];
 $('#steps').innerHTML=['товар','причина','отправка'].map((t,i)=>`<span class="step ${Math.min(state.step,2)===i?'active':''}" ${Math.min(state.step,2)===i?'aria-current="step"':''}><img src="assets/Svg-ico/${Math.min(state.step,2)===i?'':'blue/'}${icons[i]}" alt="">${t}</span>`).join('');
 if(state.step===0)renderSelection();else if(state.step===1)renderReason();else renderShipping();
}
function renderSelection(){
 let html='<h2>Какие товары вернуть?</h2><p class="intro">Выберите покупки из одного или нескольких заказов.</p>';
 for(const order of [...new Set(items.map(p=>p.order))])html+=`<h3 class="order">${order}</h3><div class="cards">${items.filter(p=>p.order===order).map(p=>card(p,true)).join('')}</div>`;
 $('#content').innerHTML=html;
 document.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{const p=items.find(p=>p.id===b.dataset.item);if(p.expired){expired(p);return;}state.selected=state.selected.includes(p.id)?state.selected.filter(id=>id!==p.id):[...state.selected,p.id];state.index=0;render();});
 $('#summary').textContent=`Выбрано товаров: ${state.selected.length}`;
 $('#next').textContent='Продолжить';$('#next').disabled=!state.selected.length;$('#next').onclick=()=>{state.index=0;navigate(1);};
}
function expired(p){showModal(`<h2 id="modal-title">Срок возврата истёк</h2><p>${esc(p.name)} нельзя добавить в эту заявку. Вы можете обсудить ситуацию с продавцом.</p><button class="primary" id="seller">Написать продавцу</button>`);$('#seller').onclick=()=>{$('#modal-content').innerHTML='<h2 id="modal-title">Чат с продавцом</h2><p class="note">Учебный чат: сообщения не отправляются.</p><div class="chat-msg">Здравствуйте! Расскажите, что случилось с товаром.</div><label for="message">Сообщение</label><textarea id="message" placeholder="Опишите ситуацию"></textarea><button class="primary" id="send-message">Показать ответ</button>';$('#send-message').onclick=()=>{const value=$('#message').value.trim();if(!value){$('#message').focus();return;}$('#modal-content').innerHTML='<h2 id="modal-title">Учебный ответ</h2><p>В реальном продукте продавец рассмотрит ваше обращение. Здесь сообщение осталось только в браузере.</p>';};};}

let reasonScrollFrame=0;
function reasonTools(){
 const active=state.view==='form'&&state.step===1;
 $('#summary').classList.toggle('reason-summary',active);
 $('#reason-tools').hidden=!active;
 const visible=active&&$('#content').scrollTop>8;
 $('#to-top').style.visibility=visible?'visible':'hidden';
 $('#to-top').tabIndex=visible?0:-1;
 $('#to-top').setAttribute('aria-hidden',String(!visible));
}
function scrollReasonFields(value){
 cancelAnimationFrame(reasonScrollFrame);
 reasonScrollFrame=requestAnimationFrame(()=>{
  if(state.view!=='form'||state.step!==1)return;
  const fields=$('#fields-'+value),main=$('#content');
  if(!fields||fields.hidden)return;
  // main is the actual unobscured viewport: header, tools and footer are outside it.
  // Include the selected reason's label so a tall form never loses its heading.
  const rect=fields.parentElement.getBoundingClientRect(),viewport=main.getBoundingClientRect();
  const room=main.clientHeight-32;
  const inset=rect.height<=room?(main.clientHeight-rect.height)/2:16;
  const target=Math.max(0,Math.min(main.scrollHeight-main.clientHeight,
   main.scrollTop+rect.top-viewport.top-inset));
  main.scrollTo({top:target,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  reasonTools();
 });
}
function renderReason(){
 const p=selected()[state.index];if(!p){navigate(0);return;}const d=detail(p.id);
 const updateReasonCTA=()=>{
  const isLast=state.index===state.selected.length-1;
  $('#next').disabled=isLast&&selected().some(item=>!detail(item.id).reason);
 };
 $('#content').innerHTML='<div class="row"><h2 id="reason-title" tabindex="-1">Причина возврата</h2><span class="pill">'+(state.index+1)+' из '+state.selected.length+'</span></div>'+card(p)+
 '<fieldset class="panel reason-group"><legend>Что случилось с товаром?</legend>'+
 reasons.map(([value,label])=>'<div class="reason-option"><label class="option choice" for="reason-'+value+'"><input type="radio" id="reason-'+value+'" name="reason" value="'+value+'" '+(d.reason===value?'checked':'')+(value!=='size'?' aria-controls="fields-'+value+'"':'')+'><span>'+label+'</span></label>'+
 (value!=='size'?'<div id="fields-'+value+'" class="reason-fields" hidden></div>':'')+'</div>').join('')+
 '</fieldset><div id="reason-error" class="error" role="alert" hidden></div><div id="reason-note"></div>';
 const showError=()=>{
  const error=$('#reason-error');error.hidden=!d.error;error.textContent=d.error;
  const photo=$('#photos');
  if(photo){
   photo.setAttribute('aria-invalid',String(!!d.error));
   photo.setAttribute('aria-describedby','photo-hint'+(d.error?' reason-error':''));
  }
 };
 const fillFields=(focusTarget=null)=>{
  document.querySelectorAll('.reason-fields').forEach(n=>{n.hidden=true;n.replaceChildren();});
  const fields=$('#fields-'+d.reason);
  if(fields){
   fields.hidden=false;
   fields.innerHTML='<p class="meta" id="photo-hint">'+(d.reason==='wrong'
    ?'Опишите отличие и приложите фото — это поможет оператору быстрее проверить заявку'
    :'Добавьте хотя бы одну фотографию. Без фото нельзя продолжить.')+
    '</p><label class="field" for="comment">Описание (необязательно)</label><textarea id="comment">'+esc(d.comment)+'</textarea>'+
    '<label class="field" for="photos">Фотографии '+(d.reason==='defect'?'(обязательно)':'(необязательно)')+'</label>'+
    '<input id="photos" type="file" accept="image/*" multiple aria-required="'+(d.reason==='defect')+'" '+(d.reason==='defect'&&!d.photos.length?'required':'')+'>'+
    '<p class="meta">Файлы остаются в этой вкладке; на сервер не загружаются.</p><div class="photos">'+
    d.photos.map((f,i)=>'<div class="photo"><img src="'+f.url+'" alt="'+esc(f.name)+'"><button data-remove="'+i+'" aria-label="Убрать фото '+(i+1)+'">Убрать</button></div>').join('')+'</div>';
   $('#comment').oninput=e=>{d.comment=e.target.value;};
   $('#photos').onchange=e=>{
    let invalid=false;
    for(const f of e.target.files){
     if(!f.type.startsWith('image/')){invalid=true;continue;}
     d.photos.push({name:f.name,url:URL.createObjectURL(f)});
    }
    d.error=invalid?'Выберите файл изображения.':'';
    fillFields('#photos');
   };
   document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
    const index=Number(b.dataset.remove);URL.revokeObjectURL(d.photos[index].url);
    d.photos.splice(index,1);fillFields(d.photos.length?'[data-remove="'+Math.min(index,d.photos.length-1)+'"]':'#photos');
   });
  }
  $('#reason-note').innerHTML=(p.teachingNoTransfer&&d.reason==='defect'
   ?'<p class="note">Мелкий бой: этот товар явно задан как учебный пример компенсации без передачи после одобрения. Правило не определяется ценой.</p>':'')+
   (d.reason==='defect'&&p.price<=500
   ?'<p class="note">Учебная гипотеза: при одобрении брака на сумму до 500 ₽ включительно товар передавать не нужно. Решение ещё не принято.</p>':'');
  showError();
  if(focusTarget&&$(focusTarget))$(focusTarget).focus({preventScroll:true});
  reasonTools();
 };
 document.querySelectorAll('[name=reason]').forEach(r=>r.onchange=()=>{
  cancelAnimationFrame(reasonScrollFrame);
  // Keep the native radio nodes and their focus; only the dependent fields change.
  d.reason=r.value;d.error='';fillFields();updateReasonCTA();
  if(d.reason!=='size')scrollReasonFields(d.reason);
 });
 fillFields();
 $('#summary').textContent='Причина указывается отдельно для каждого товара';
 $('#next').textContent=state.index<state.selected.length-1?'Следующий товар':'Перейти к отправке';
 updateReasonCTA();
 $('#next').onclick=()=>{
  if(!d.reason){d.error='Выберите причину возврата.';showError();$('#reason-size').focus();return;}
  if(d.reason==='defect'&&!d.photos.length){
   d.error='Добавьте фотографию дефекта, чтобы продолжить.';showError();
   $('#photos').focus({preventScroll:true});scrollReasonFields(d.reason);return;
  }
  d.error='';
  if(state.index<state.selected.length-1){state.index++;render();$('#content').scrollTop=0;$('#reason-title').focus({preventScroll:true});}
  else navigate(2);
 };
 reasonTools();
}
function shippingText(){return {pickup:'Передача в ПВЗ',courier:'Платный курьер',freight:'Бесплатный вывоз из квартиры',none:'Без физической передачи'}[mode()];}
function renderShipping(){
 const m=mode(),small=selected().filter(noTransfer),total=selected().reduce((s,p)=>s+p.price,0);
 $('#content').innerHTML=`<h2>Отправка заявки</h2><p class="intro">${state.selected.length} товара · ${money(total)}</p><div class="panel"><h3>Как передать товары</h3>${m==='freight'?'<p>Бесплатный вывоз транспортной службой из квартиры.</p><p class="meta">В заявке есть КГТ: служба заберёт все одобренные товары, требующие физической передачи. Товары с компенсацией без передачи исключены.</p>':m==='none'?'<p>Физическая передача не требуется, если модерация одобрит компенсацию.</p>':`<label class="option"><input type="radio" name="delivery" value="pickup" ${state.delivery==='pickup'?'checked':''}><span><strong>ПВЗ</strong><small>Передайте одобренные товары в пункт выдачи.</small></span></label><label class="option"><input type="radio" name="delivery" value="courier" ${state.delivery==='courier'?'checked':''}><span><strong>Курьер за ваш счёт</strong><small>Цена и дата в этом прототипе не рассчитываются.</small></span></label>`}${small.length?`<p class="note">${small.map(p=>esc(p.name)).join(', ')}: при одобрении — без передачи и QR. Основание: ${small.map(p=>p.teachingNoTransfer?'заданный пример мелкого боя':'отдельная учебная гипотеза брака до 500 ₽').join('; ')}.</p>`:''}</div><div class="panel"><h3>Как получить компенсацию</h3><label class="option"><input type="radio" name="compensation" value="points" ${state.compensation==='points'?'checked':''}><span><strong>Баллами</strong><small>1 балл = 1 ₽. Начисление после одобрения; для покупок на маркетплейсе.</small></span></label><label class="option"><input type="radio" name="compensation" value="card" ${state.compensation==='card'?'checked':''}><span><strong>На исходную карту</strong><small>Возврат до 10 дней. Одобрение заявки не означает мгновенное зачисление.</small></span></label></div><p class="note">Учебные допущения: условия компенсации до 500 ₽ — гипотеза, а не доказанная защита от злоупотреблений. Адрес, слот и стоимость курьера пока не моделируются.</p><div class="sim"><strong>Управление учебной симуляцией</strong><label class="option"><input type="checkbox" id="fail-next" ${state.failNext?'checked':''} ${state.busy?'disabled':''}><span>Показать ошибку следующей отправки</span></label><small>Сетевого запроса нет. Ошибка и ожидание задаются локально.</small></div>${state.submitError?'<div class="error" role="alert">Учебная ошибка отправки. Данные сохранены. Попробуйте ещё раз.</div>':''}`;
 document.querySelectorAll('[name=delivery]').forEach(r=>{r.disabled=state.busy;r.onchange=()=>{state.delivery=r.value;$('#summary').textContent=`${shippingText()} · ${money(total)}`;};});document.querySelectorAll('[name=compensation]').forEach(r=>{r.disabled=state.busy;r.onchange=()=>state.compensation=r.value;});$('#fail-next').onchange=e=>state.failNext=e.target.checked;
 $('#summary').textContent=`${shippingText()} · ${money(total)}`;$('#next').disabled=state.busy;$('#next').innerHTML=state.busy?'<span class="loading"></span>Учебная обработка…':state.submitError?'Повторить отправку':'Создать учебную заявку';$('#next').onclick=submit;
}

async function submit(){
 if(state.busy)return;
 if(!selected().length){navigate(0);return;}
 for(let i=0;i<selected().length;i++){
  const d=detail(selected()[i].id);
  if(!d.reason||(d.reason==='defect'&&!d.photos.length)){
   state.index=i;d.error='Проверьте причину и обязательную фотографию.';navigate(1);return;
  }
 }
 state.busy=true;state.submitError=false;render();
 await new Promise(r=>setTimeout(r,700));
 state.busy=false;
 if(state.failNext){state.failNext=false;state.submitError=true;render();return;}
 const rows=selected().map(p=>{
  const d=detail(p.id);
  return {...p,quantity:1,reason:d.reason,comment:d.comment,photos:d.photos.map(f=>({...f})),
   transferRequired:!noTransfer(p),
   transferBasis:noTransfer(p)?(p.teachingNoTransfer?'Заданный учебный пример мелкого боя':'Учебная гипотеза: брак до 500 ₽ включительно'):'Физическая передача'};
 });
 const application={
  id:'DEMO-'+String(++state.sequence).padStart(4,'0'),
  date:new Date().toLocaleString('ru-RU'),status:'pending',rows,
  delivery:mode(),compensation:state.compensation
 };
 state.applications.unshift(application);state.activeId=application.id;
 // A new form never references a submitted application's rows or photo arrays.
 Object.assign(state,emptyDraft());state.hasDraft=false;go('details');
}
function go(view){state.view=view;render();$('#content').scrollTop=0;$('#content').focus();}
function footer(text,label,action){
 $('#summary').textContent=text;$('#next').textContent=label;$('#next').disabled=false;$('#next').onclick=action;
}
function clearDraft(){
 const retained=new Set(state.applications.flatMap(a=>a.rows.flatMap(p=>p.photos.map(f=>f.url))));
 Object.values(state.details).forEach(d=>d.photos.forEach(f=>{if(!retained.has(f.url))URL.revokeObjectURL(f.url);}));
 Object.assign(state,emptyDraft());state.hasDraft=false;
}
function startNew(){
 if(state.hasDraft){
  showModal('<h2 id="modal-title">У вас есть черновик</h2><p>Можно продолжить его или начать заново. При начале заново данные черновика будут удалены. Отправленные заявки сохранятся.</p><button class="primary" id="resume-modal">Продолжить черновик</button><button class="secondary" id="replace-draft">Начать заново</button>');
  $('#resume-modal').onclick=()=>{$('#modal').close();go('form');};
  $('#replace-draft').onclick=()=>{$('#modal').close();clearDraft();state.hasDraft=true;navigate(0);};
  return;
 }
 clearDraft();state.hasDraft=true;navigate(0);
}
function statusLabel(a){
 if(a.status==='pending')return 'На модерации';
 if(a.status==='rejected')return 'Отклонена';
 return a.rows.some(p=>p.transferRequired)?'Одобрена · ожидает передачи':'Одобрена · без передачи';
}
function deliveryLabel(value){return {pickup:'ПВЗ',courier:'Платный курьер',freight:'Бесплатный вывоз грузчиками из квартиры',none:'Без физической передачи'}[value];}
function compensationLabel(a){return a.compensation==='points'
 ?'Баллы: 1 балл = 1 ₽. Начисление после одобрения; для покупок на маркетплейсе.'
 :'На исходную карту — до 10 дней. Одобрение не означает мгновенное зачисление. Фактический платёж в прототипе не выполняется.';}
function bindOpen(){
 document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{state.activeId=b.dataset.open;go('details');});
}
function renderHub(){
 if(state.view==='account'){
  $('#content').innerHTML='<h2>Личный кабинет</h2><p class="intro">Покупки и возвраты в одном месте.</p><button class="entry" id="my-returns"><strong>Мои возвраты</strong><span>Заявки: '+state.applications.length+(state.hasDraft?' · Есть черновик':'')+'</span><span aria-hidden="true">→</span></button><button class="entry" id="purchases"><strong>Мои покупки</strong><span>Начать возврат товара</span><span aria-hidden="true">→</span></button><p class="note">Учебные данные сохраняются при переходах в этой вкладке. Обновление или закрытие страницы сбросит черновик и заявки. Сервер не подключён.</p>';
  $('#my-returns').onclick=()=>go('returns');$('#purchases').onclick=()=>go('purchases');
  footer('Локальный учебный сценарий','Мои возвраты',()=>go('returns'));return;
 }
 if(state.view==='purchases'){
  $('#content').innerHTML='<h2>Мои покупки</h2><p class="intro">Выберите «Новый возврат», чтобы перейти к покупкам из разных заказов.</p><button class="secondary full" id="purchases-returns">Мои возвраты</button>';
  $('#purchases-returns').onclick=()=>go('returns');
  footer('Предыдущие заявки доступны в «Моих возвратах»','Новый возврат',startNew);return;
 }
 if(state.view==='returns'){
  $('#content').innerHTML='<h2>Мои возвраты</h2><p class="intro">Продолжите оформление или откройте отправленную заявку.</p>'+
   (state.hasDraft?'<section class="panel draft"><div class="row"><h3>Черновик</h3><span class="pill">Не отправлен</span></div><p>Выбрано товаров: '+state.selected.length+'. Данные сохранены в этой вкладке.</p><button class="secondary full" id="resume-draft">Продолжить оформление</button><button class="link full" id="delete-draft">Удалить черновик</button></section>':'')+
   (state.applications.length?'<div class="request-list">'+state.applications.map(a=>'<button class="request-item" data-open="'+a.id+'"><span class="row"><strong>'+a.id+'</strong><span class="pill status-'+a.status+'">'+statusLabel(a)+'</span></span><span class="meta">'+esc(a.date)+'</span><span>'+a.rows.map(p=>esc(p.name)).join(' · ')+'</span><span class="meta">Единиц: '+a.rows.reduce((n,p)=>n+p.quantity,0)+' · '+(a.status==='approved'&&a.rows.some(p=>p.transferRequired)?'Открыть заявку и QR':'Открыть детали')+' →</span></button>').join('')+'</div>':'<div class="panel"><h3>Отправленных заявок пока нет</h3><p>После создания возврат появится здесь с собственным учебным номером.</p></div>');
  bindOpen();
  if($('#resume-draft'))$('#resume-draft').onclick=()=>go('form');
  if($('#delete-draft'))$('#delete-draft').onclick=()=>{
   showModal('<h2 id="modal-title">Удалить черновик?</h2><p>Выбор, причины, комментарии и фотографии этого черновика будут очищены. Отправленные заявки сохранятся.</p><button class="secondary" id="confirm-delete">Удалить черновик</button>');
   $('#confirm-delete').onclick=()=>{$('#modal').close();clearDraft();go('returns');};
  };
  footer('Новый возврат начнётся с чистой формы','Новый возврат',startNew);return;
 }
 renderApplication();
}
function renderApplication(){
 const a=state.applications.find(a=>a.id===state.activeId);
 if(!a){go('returns');return;}
 const physicalRows=a.rows.filter(p=>p.transferRequired),without=a.rows.filter(p=>!p.transferRequired);
 const hasQR=a.status==='approved'&&physicalRows.length>0;
 if(state.view==='qr'){
  if(!hasQR){go('details');return;}
  $('#content').innerHTML='<h2>Один QR для передачи</h2><p class="intro">'+a.id+' · '+deliveryLabel(a.delivery)+'</p><div class="qr-code" data-payload="'+a.id+'">'+qrSvg(a.id)+'</div><p class="note">Учебный QR содержит только идентификатор '+a.id+'. Это не защищённая серверная ссылка и не действующий пропуск.</p><h3>Передать по этому QR</h3><ul class="transfer-list">'+physicalRows.map(p=>'<li data-transfer-item="'+p.id+'">'+esc(p.name)+' · '+p.quantity+' шт.</li>').join('')+'</ul>'+
  (without.length?'<p class="meta">Без передачи: '+without.map(p=>esc(p.name)).join(', ')+'. Эти товары не входят в состав для QR.</p>':'')+'<p>Покажите один код сотруднику ПВЗ, курьеру или грузчикам. Сканирование и приёмка в этом прототипе не выполняются.</p>';
  footer('Один код на весь физически передаваемый состав','К деталям заявки',()=>go('details'));return;
 }
 const nextText=a.status==='pending'
  ?'Дождитесь решения модерации. QR появится после одобрения, если потребуется передача товаров.'
  :a.status==='rejected'
  ?'Заявка отклонена в учебной симуляции. Реальная бизнес-причина отказа не определяется. Порядок исправления отклонённой заявки не согласован.'
  :hasQR
  ?'Откройте единый QR и передайте указанные товары выбранным способом. Одобрение ещё не означает передачу товара или зачисление денег.'
  :'Передавать товары не нужно. QR не создаётся. Компенсация выполняется выбранным способом; реальные начисления здесь не производятся.';
 $('#content').innerHTML='<div class="row"><h2>Заявка '+a.id+'</h2><span class="pill status-'+a.status+'">'+statusLabel(a)+'</span></div><p class="meta">'+esc(a.date)+'</p><section class="panel"><h3>Что делать дальше</h3><p>'+nextText+'</p>'+(hasQR?'<button class="primary" id="show-qr">Показать единый QR</button>':'')+'</section><h3>Товары и причины</h3>'+a.rows.map(p=>'<section class="return-row">'+card(p)+'<p><strong>Количество:</strong> '+p.quantity+' · <strong>Причина:</strong> '+esc(reasons.find(r=>r[0]===p.reason)[1])+'</p>'+(p.comment?'<p>'+esc(p.comment)+'</p>':'')+(p.photos.length?'<div class="photos">'+p.photos.map(f=>'<div class="photo"><img src="'+f.url+'" alt="'+esc(f.name)+'"></div>').join('')+'</div>':'')+'<p class="meta">'+(p.transferRequired?'Требует физической передачи после одобрения':esc(p.transferBasis)+' — без передачи после одобрения')+'</p></section>').join('')+'<section class="panel"><h3>Способ передачи</h3><p>'+deliveryLabel(a.delivery)+'</p>'+(a.delivery==='freight'?'<p class="meta">В заявке есть КГТ: грузчики забирают все одобренные товары, требующие физической передачи. Остальные исключены.</p>':'')+'<h3>Компенсация</h3><p>'+compensationLabel(a)+'</p></section><ol class="timeline"><li>Учебная заявка создана</li><li>Модерация: '+(a.status==='pending'?'ожидается':a.status==='approved'?'одобрено':'отклонено')+'</li><li>Передача: '+(a.status==='rejected'?'не назначена':a.status==='pending'?'условия после решения':physicalRows.length?'ожидается':'не требуется')+'</li><li>Фактическое зачисление: в прототипе не выполняется</li></ol><details class="sim"><summary>Управление учебной симуляцией</summary><p class="meta">Исход задаётся для всей заявки. Реальной модерации нет. Частичное одобрение не моделируется.</p><button class="secondary" data-status="pending">На модерации</button><button class="secondary" data-status="approved">Показать одобрение</button><button class="secondary" data-status="rejected">Показать отклонение</button></details><button class="link full" id="to-purchases">К покупкам</button>';
 if($('#show-qr'))$('#show-qr').onclick=()=>go('qr');
 document.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{a.status=b.dataset.status;render();});
 $('#to-purchases').onclick=()=>go('purchases');
 footer('Заявка сохранена в «Моих возвратах»','Мои возвраты',()=>go('returns'));
}
// Minimal QR Model 2, version 1-L, byte mode, mask 0. Payload is only the demo ID.
// 19 data codewords + 7 Reed–Solomon parity codewords; no external services.
function qrSvg(payload){
 const bytes=Array.from(new TextEncoder().encode(payload));
 if(bytes.length>17)throw new Error('Учебный идентификатор слишком длинный для QR.');
 const bits=[],put=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>>i)&1);};
 put(4,4);put(bytes.length,8);bytes.forEach(v=>put(v,8));
 for(let i=0;i<4&&bits.length<152;i++)bits.push(0);
 while(bits.length%8)bits.push(0);
 const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((v,b)=>(v<<1)|b,0));
 for(let i=0;data.length<19;i++)data.push(i%2?0x11:0xec);
 const mul=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11d);z^=((y>>>i)&1)*x;}return z;};
 let generator=[1],root=1;
 for(let i=0;i<7;i++){const next=new Array(generator.length+1).fill(0);generator.forEach((c,j)=>{next[j]^=c;next[j+1]^=mul(c,root);});generator=next;root=mul(root,2);}
 const ecc=new Array(7).fill(0);
 data.forEach(v=>{const f=v^ecc.shift();ecc.push(0);for(let i=0;i<7;i++)ecc[i]^=mul(generator[i+1],f);});
 const matrix=Array.from({length:21},()=>Array(21).fill(false)),reserved=matrix.map(r=>r.map(()=>false));
 const set=(x,y,v)=>{matrix[y][x]=!!v;reserved[y][x]=true;};
 for(const [cx,cy] of [[0,0],[14,0],[0,14]])for(let y=-1;y<=7;y++)for(let x=-1;x<=7;x++){
  if(cx+x<0||cx+x>=21||cy+y<0||cy+y>=21)continue;
  set(cx+x,cy+y,x>=0&&x<=6&&y>=0&&y<=6&&(x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4)));
 }
 for(let i=8;i<13;i++){set(i,6,i%2===0);set(6,i,i%2===0);}
 const format=0x77c4,bit=i=>(format>>>i)&1;
 for(let i=0;i<=5;i++)set(8,i,bit(i));
 set(8,7,bit(6));set(8,8,bit(7));set(7,8,bit(8));
 for(let i=9;i<15;i++)set(14-i,8,bit(i));
 for(let i=0;i<8;i++)set(20-i,8,bit(i));
 for(let i=8;i<15;i++)set(8,6+i,bit(i));
 set(8,13,true);
 const stream=[];[...data,...ecc].forEach(v=>{for(let i=7;i>=0;i--)stream.push((v>>>i)&1);});
 let cursor=0,up=true;
 for(let right=20;right>=1;right-=2){
  if(right===6)right=5;
  for(let vert=0;vert<21;vert++){const y=up?20-vert:vert;for(let j=0;j<2;j++){const x=right-j;if(!reserved[y][x])matrix[y][x]=Boolean(stream[cursor++]^(((x+y)%2===0)?1:0));}}
  up=!up;
 }
 let path='';matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v)path+='M'+(x+4)+' '+(y+4)+'h1v1h-1z';}));
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" role="img" aria-label="Учебный QR: '+esc(payload)+'" shape-rendering="crispEdges"><rect width="29" height="29" fill="white"/><path d="'+path+'" fill="#101820"/></svg>';
}
$('#leave-draft').onclick=()=>{if(!state.busy)go('returns');};

$('#content').addEventListener('scroll',reasonTools,{passive:true});
$('#to-top').onclick=()=>{
 cancelAnimationFrame(reasonScrollFrame);
 $('#content').scrollTo({top:0,behavior:'instant'});
 $('#reason-title')?.focus({preventScroll:true});
 reasonTools();
};
render();

