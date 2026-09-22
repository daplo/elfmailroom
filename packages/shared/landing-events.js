// Public-page interactions only. Never read text, form contents or destination URLs into payloads.
export function observeLandingEvents(send){
 const removers=[],seenSections=new Set(),seenScroll=new Set();
 const on=(target,name,handler,options)=>{target.addEventListener(name,handler,options);removers.push(()=>target.removeEventListener(name,handler,options))};
 const placement=el=>el.closest('.navbar')?'header':el.closest('.hero')?'hero':el.closest('#letters')?'samples':el.closest('#pricing')?'pricing':el.closest('.final-cta')?'final':el.closest('footer')?'footer':'other';
 const sections=['how-it-works','letters','parents','pricing','faq'];
 on(document,'click',event=>{
  const el=event.target.closest?.('a,button,summary');if(!el)return;
  if(el.matches('a.button')&&el.getAttribute('href')==='/write/')send('create_letter_click',{placement:placement(el)});
  if(el.matches('a')&&sections.includes(el.getAttribute('href')?.slice(1))&&el.getAttribute('href').startsWith('#'))send('navigation_click',{section_id:el.getAttribute('href').slice(1),placement:placement(el)});
  if(el.matches('.sample-tabs button'))send('sample_letter_select',{sample_id:[...el.parentElement.children].indexOf(el)===0?'sample_1':'sample_2'});
  if(el.matches('.menu-toggle'))send('menu_toggle',{action:el.getAttribute('aria-expanded')==='true'?'close':'open'});
  if(el.matches('.snow-button'))send('festive_interaction',{interaction:'snow',action:el.getAttribute('aria-pressed')==='true'?'stop':'start'});
  if(el.matches('.cozy-surprise-button'))for(const kind of ['bell','mug','gift','gingerbread'])if(el.closest('.surprise-'+kind))send('festive_interaction',{interaction:kind,action:'play'});
  if(el.closest('.language-links'))send('language_select',{target_language:el.getAttribute('lang'),placement:'footer'});
  if(el.closest('.footer-top')){
   const href=el.getAttribute('href')||'';
   const destination=href.startsWith('mailto:')||el.matches('button')?'contact':href.includes('#cancellation')?'refunds':/\/privacy\/?$/.test(href)?'privacy':/\/terms\/?$/.test(href)?'terms':null;
   if(destination)send('footer_link_click',{destination});
  }
 },true);
 on(document,'change',event=>{
  const el=event.target;
  if(el.matches('input[name="sample-design"]'))send('template_select',{template_id:el.value});
  if(el.matches('.language-picker select'))send('language_select',{target_language:el.value,placement:'header'});
 },true);
 on(document,'toggle',event=>{
  const el=event.target;
  if(el.matches?.('.faq-list details')&&el.open)send('faq_open',{faq_id:[...el.parentElement.children].indexOf(el)+1});
 },true);
 on(window,'scroll',()=>{
  const height=document.documentElement.scrollHeight-innerHeight;
  if(height<=0||scrollY<=0)return;
  const depth=Math.min(100,Math.round(scrollY/height*100));
  for(const milestone of [25,50,75,90,100])if(depth>=milestone&&!seenScroll.has(milestone)){
   if(send('scroll_depth',{percent_scrolled:milestone}))seenScroll.add(milestone);
  }
 },{passive:true});
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){
    const id=entry.target.closest('section')?.id|| (entry.target.closest('.hero')?'hero':entry.target.closest('.final-cta')?'final':'footer');
    if(!seenSections.has(id)&&send('section_view',{section_id:id})){seenSections.add(id);observer.unobserve(entry.target)}
   }
  },{threshold:.5});
  // Observe headings, not entire tall sections: works on small mobile viewports too.
  document.querySelectorAll('.hero h1,#how-it-works h2,#letters h2,#parents h2,#pricing h2,#faq h2,.final-cta h2,footer .footer-bottom').forEach(el=>observer.observe(el));
  removers.push(()=>observer.disconnect());
 }
 let visibleSeconds=0;
 const timer=setInterval(()=>{if(document.visibilityState==='visible'){
  visibleSeconds++;
  if([15,30,60].includes(visibleSeconds))send('landing_engagement',{seconds:visibleSeconds});
  if(visibleSeconds===60)clearInterval(timer);
 }},1000);
 removers.push(()=>clearInterval(timer));
 return()=>removers.forEach(remove=>remove());
}
