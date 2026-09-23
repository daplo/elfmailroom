import {languages,localeCode,translate,digitalNotice} from './locales.js';
import {santaLetterPrice} from './config.js';
import {articleTranslation,blogAlternates,blogArticles,blogCopy,blogPath,findBlogArticle} from './blog.js';
export const defaultSiteUrl='https://elfmailroom.com';
export function siteOrigin(value=defaultSiteUrl){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('VITE_SITE_URL must be an HTTP(S) origin without a path, credentials or query.');return url.origin;}
export const languagePath=code=>localeCode(code)==='en'?'/':`/${localeCode(code)}/`;
export const legalPath=(type,language='en')=>`${languagePath(language)}${type}/`;
export function languageFromPath(path){return /^\/(de|es|fr|pl)(?:\/|$)/.exec(path)?.[1]||'en'}
export function localizedPath(path,language='en'){const rest=`/${String(path||'/').replace(/^\/(?:de|es|fr|pl)(?=\/|$)/,'').replace(/^\/+|\/+$/g,'')}${String(path||'/').endsWith('/')?'/' : ''}`.replace(/^\/\/$/,'/');return localeCode(language)==='en'?rest:`/${localeCode(language)}${rest}`}
export const seoCopy={
 pl:{title:'List od Mikołaja do druku — spersonalizowany | Elf Mailroom',description:'Stwórz osobisty list od Mikołaja za 3,99 USD. Wybierz ilustrowany wzór, sprawdź treść i pobierz PDF do wydrukowania w domu. Bez wysyłki pocztą.',h1:'Spersonalizowane listy od Mikołaja do wydrukowania',intro:'Podaruj dziecku odrobinę świątecznej magii — list od Mikołaja z jego imieniem, życzeniami i małymi powodami do dumy.',how:'Jak stworzyć osobisty list od Mikołaja',example:'List od Mikołaja tylko dla Twojego dziecka',price:'Twój list od Mikołaja w PDF — 3,99 USD',faq:'Pytania o cyfrowy list od Mikołaja',alt:'Elf przygotowuje świąteczne listy w przytulnej poczcie Mikołaja na biegunie północnym'},
 en:{title:'Personalised Santa Letters to Print | Elf Mailroom',description:'Create a personalised letter from Santa for US$3.99. Choose an illustrated design, review the words, then download and print your PDF at home. Digital only.',h1:'Personalised Santa letters to download and print',intro:'Make their Christmas feel a little more magical with a letter from Santa, written around their name, wishes and proud little moments.',how:'How to create your personalised Santa letter',example:'A Santa letter made just for your child',price:'Your printable Santa letter — US$3.99',faq:'Questions about your digital Santa letter',alt:'An elf preparing Christmas letters in Santa’s cozy North Pole mailroom'},
 de:{title:'Brief vom Weihnachtsmann zum Ausdrucken | Elf Mailroom',description:'Ein persönlicher Brief vom Weihnachtsmann für 3,99 US-Dollar. Design wählen, Text prüfen und als PDF zu Hause ausdrucken. Kein Postversand.',h1:'Persönliche Briefe vom Weihnachtsmann zum Ausdrucken',intro:'Schenke deinem Kind ein wenig Weihnachtszauber: ein Brief vom Weihnachtsmann, der seinen Namen, seine Wünsche und seine kleinen Erfolge aufgreift.',how:'So entsteht dein persönlicher Brief vom Weihnachtsmann',example:'Ein Weihnachtsbrief nur für dein Kind',price:'Dein Weihnachtsbrief als PDF — 3,99 US-Dollar',faq:'Fragen zu deinem digitalen Weihnachtsbrief',alt:'Ein Wichtel bereitet Weihnachtsbriefe in der gemütlichen Poststelle am Nordpol vor'},
 es:{title:'Carta de Papá Noel personalizada para imprimir | Elf Mailroom',description:'Crea una carta de Papá Noel personalizada por 3,99 USD. Elige un diseño, revisa el texto y descarga el PDF para imprimir en casa. Sin envío postal.',h1:'Cartas de Papá Noel personalizadas para imprimir',intro:'Llena su Navidad de ilusión con una carta de Papá Noel que hable de su nombre, sus deseos y esos pequeños logros que le hacen sonreír.',how:'Cómo crear tu carta personalizada de Papá Noel',example:'Una carta de Papá Noel solo para tu peque',price:'Tu carta de Papá Noel en PDF — 3,99 USD',faq:'Preguntas sobre tu carta digital de Papá Noel',alt:'Un elfo prepara cartas navideñas en el acogedor correo de Papá Noel en el Polo Norte'},
 fr:{title:'Lettre du Père Noël personnalisée à imprimer | Elf Mailroom',description:'Créez une lettre du Père Noël personnalisée pour 3,99 USD. Choisissez un modèle, vérifiez le texte et imprimez votre PDF chez vous. Sans envoi postal.',h1:'Des lettres du Père Noël personnalisées à imprimer',intro:'Ajoutez un peu de magie à son Noël avec une lettre du Père Noël qui parle de son prénom, de ses souhaits et de ses petites fiertés.',how:'Comment créer votre lettre personnalisée du Père Noël',example:'Une lettre du Père Noël rien que pour votre enfant',price:'Votre lettre du Père Noël en PDF — 3,99 USD',faq:'Vos questions sur la lettre numérique du Père Noël',alt:'Un lutin prépare des lettres de Noël dans le chaleureux bureau de poste du pôle Nord'}
};
export const landingFaqs=[
 ['Is the letter really personalised?','Yes. After payment, a fresh letter is written using the details you provide. Before payment, previews contain fictional sample text.'],
 ['Will you send a letter in the post?',digitalNotice],
 ['Can I ask for changes?','Yes. Review your letter after payment and request up to five rewrites with your preferences or topics to avoid. Accept it to download the clean PDF.'],
 ['Which languages can I choose?','English, German, Spanish, French and Polish. The website and letter languages can be chosen separately.'],
 ['How much does a personalised Santa letter cost?','Each letter costs US$3.99, paid once. It includes your chosen design, five rewrite requests and a PDF to download and print. There is no subscription.'],
 ['When can I download my Santa letter?','After payment is confirmed, your letter is generated and appears on your private purchase page. Review it, request changes if needed, then accept it to download the PDF.']
];
export function seoData(language='en',{origin=defaultSiteUrl,checkoutEnabled=false}={}){
 const code=localeCode(language),base=siteOrigin(origin),url=base+languagePath(code),copy=seoCopy[code],t=key=>translate(code,key);
 const product={'@type':'Product','@id':base+'/#santa-letter',name:t('Personalised Santa Letter'),description:copy.description,image:base+'/assets/stationery/santa-preview.webp',url:url+'#pricing',category:'Digital printable letter',brand:{'@type':'Brand',name:'Elf Mailroom'}};
 // Do not advertise an active offer when checkout is unavailable. No invented reviews or ratings.
 if(checkoutEnabled)product.offers={'@type':'Offer',url:url+'#pricing',price:(santaLetterPrice.amount/100).toFixed(2),priceCurrency:santaLetterPrice.currency.toUpperCase(),availability:'https://schema.org/InStock',seller:{'@id':base+'/#organization'}};
 return {...copy,code,url,image:base+'/assets/mailroom.webp',alternates:[...languages.map(x=>({language:x.code,url:base+languagePath(x.code)})),{language:'x-default',url:base+'/'}],schema:{'@context':'https://schema.org','@graph':[
 {'@type':'Organization','@id':base+'/#organization',name:'Elf Mailroom',url:base+'/'},
 {'@type':'WebSite','@id':base+'/#website',url:base+'/',name:'Elf Mailroom',inLanguage:languages.map(x=>x.code),publisher:{'@id':base+'/#organization'}},
 {'@type':'WebPage','@id':url+'#webpage',url,name:copy.title,description:copy.description,inLanguage:code,isPartOf:{'@id':base+'/#website'},mainEntity:{'@id':base+'/#santa-letter'}},product
 ]}};
}
export function blogSeoData(language='en',slug='',origin=defaultSiteUrl){
 const code=localeCode(language),base=siteOrigin(origin),copy=blogCopy[code],article=slug?findBlogArticle(slug):null;
 if(slug&&!article)return null;
 const page=article?articleTranslation(article,code):copy,url=base+blogPath(code,slug);
 const title=article?`${page.title} | Elf Mailroom`:copy.title+' | Elf Mailroom';
 const description=page.description,image=base+(article?article.image.src:'/assets/mailroom.webp'),alternates=blogAlternates(base,slug);
 const pageType=article?'WebPage':'CollectionPage';
 const graph=[
  {'@type':'Organization','@id':base+'/#organization',name:'Elf Mailroom',url:base+'/'},
  {'@type':'WebSite','@id':base+'/#website',url:base+'/',name:'Elf Mailroom',inLanguage:languages.map(x=>x.code),publisher:{'@id':base+'/#organization'}},
  {'@type':pageType,'@id':url+'#webpage',url,name:title,description,inLanguage:code,isPartOf:{'@id':base+'/#website'},breadcrumb:{'@id':url+'#breadcrumb'}},
  {'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:[
   {'@type':'ListItem',position:1,name:'Elf Mailroom',item:base+languagePath(code)},
   {'@type':'ListItem',position:2,name:copy.title,item:base+blogPath(code)},
   ...(article?[{'@type':'ListItem',position:3,name:page.title,item:url}]:[])
  ]}
 ];
 if(article){
  const faqId=url+'#faq';
  graph[2].mainEntity={'@id':url+'#article'};
  graph[2].hasPart={'@id':faqId};
  graph.push({'@type':'BlogPosting','@id':url+'#article',headline:page.title,description,datePublished:article.date,dateModified:article.updated||article.date,inLanguage:code,image,author:{'@id':base+'/#organization'},publisher:{'@id':base+'/#organization'},mainEntityOfPage:{'@id':url+'#webpage'},hasPart:{'@id':faqId}});
  // Keep these answers identical to the visible FAQ section in every locale.
  graph.push({'@type':'FAQPage','@id':faqId,url:faqId,name:copy.faq,inLanguage:code,isPartOf:{'@id':url+'#webpage'},mainEntity:page.faqs.map(([question,answer])=>({'@type':'Question',name:question,acceptedAnswer:{'@type':'Answer',text:answer}}))});
 }
 else graph.push({'@type':'ItemList',itemListElement:blogArticles.map((item,index)=>({'@type':'ListItem',position:index+1,url:base+blogPath(code,item.slug),name:articleTranslation(item,code).title}))});
 return {title,description,code,url,image,imageWidth:article?.image.width||1536,imageHeight:article?.image.height||1024,alt:article?article.image.alt[code]:seoCopy[code].alt,alternates,ogType:article?'article':'website',schema:{'@context':'https://schema.org','@graph':graph}};
}
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c');
export function seoHead(data){const e=escapeHtml;return `<title>${e(data.title)}</title>
<meta name="description" content="${e(data.description)}"/>
<meta name="robots" content="index,follow,max-image-preview:large"/>
<link rel="canonical" href="${e(data.url)}"/>
${data.alternates.map(x=>`<link rel="alternate" hreflang="${x.language}" href="${e(x.url)}"/>`).join('\n')}
<meta property="og:type" content="${e(data.ogType||'website')}"/>
<meta property="og:site_name" content="Elf Mailroom"/>
<meta property="og:title" content="${e(data.title)}"/>
<meta property="og:description" content="${e(data.description)}"/>
<meta property="og:url" content="${e(data.url)}"/>
<meta property="og:locale" content="${{en:'en_GB',de:'de_DE',es:'es_ES',fr:'fr_FR',pl:'pl_PL'}[data.code]}"/>
<meta property="og:image" content="${e(data.image)}"/>
<meta property="og:image:alt" content="${e(data.alt)}"/>
<meta property="og:image:width" content="${e(data.imageWidth||1536)}"/>
<meta property="og:image:height" content="${e(data.imageHeight||1024)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${e(data.title)}"/>
<meta name="twitter:description" content="${e(data.description)}"/>
<meta name="twitter:image" content="${e(data.image)}"/>
<meta name="twitter:image:alt" content="${e(data.alt)}"/>
<script id="elf-schema" type="application/ld+json">${safeJson(data.schema)}</script>`}
export function sitemap(origin=defaultSiteUrl){const base=siteOrigin(origin),e=escapeHtml,landingRoutes=languages.map(x=>({url:languagePath(x.code),alternates:[...languages.map(y=>({language:y.code,url:base+languagePath(y.code)})),{language:'x-default',url:base+'/'}]})),blogRoutes=['',...blogArticles.map(x=>x.slug)].flatMap(slug=>languages.map(x=>({url:blogPath(x.code,slug),alternates:blogAlternates(base,slug)}))),routes=[...landingRoutes,...blogRoutes];return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${routes.map(route=>`<url><loc>${e(base+route.url)}</loc>${route.alternates.map(x=>`<xhtml:link rel="alternate" hreflang="${x.language}" href="${e(x.url)}"/>`).join('')}</url>`).join('')}</urlset>`}
