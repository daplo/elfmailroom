import {languages,localeCode} from './locales.js';
import letterToSanta from './blog/letter-to-santa.js';
import christmasEve from './blog/christmas-eve.js';
import printableLetter from './blog/printable-letter.js';

export const blogCopy={
 en:{faq:'Frequently asked questions',note:'A little note from the elves',updated:'Updated',author:'By Elf Mailroom',title:'Christmas ideas from the Elf Mailroom',description:'Thoughtful, practical ideas for writing to Santa, creating family traditions and making a printable Santa letter feel magical.',intro:'Simple ideas for making Christmas feel personal, cosy and full of wonder.',label:'From the mailroom',read:'Read the article',all:'Explore all Christmas ideas',back:'All Christmas ideas',related:'More from the mailroom',ctaTitle:'Ready to create their letter from Santa?',cta:'Create a Santa letter'},
 de:{faq:'Häufige Fragen',note:'Eine kleine Nachricht von den Wichteln',updated:'Aktualisiert am',author:'Von Elf Mailroom',title:'Weihnachtsideen aus der Wichtelpost',description:'Praktische Ideen für Briefe an den Weihnachtsmann, schöne Familientraditionen und einen zauberhaften Weihnachtsbrief zum Ausdrucken.',intro:'Einfache Ideen für ein persönliches, gemütliches Weihnachtsfest voller Staunen.',label:'Aus der Wichtelpost',read:'Artikel lesen',all:'Alle Weihnachtsideen entdecken',back:'Alle Weihnachtsideen',related:'Mehr aus der Wichtelpost',ctaTitle:'Bereit für den persönlichen Weihnachtsbrief?',cta:'Weihnachtsbrief gestalten'},
 es:{faq:'Preguntas frecuentes',note:'Un mensajito de los elfos',updated:'Actualizado el',author:'Por Elf Mailroom',title:'Ideas de Navidad del correo de Papá Noel',description:'Ideas prácticas para escribir a Papá Noel, crear tradiciones familiares y convertir una carta imprimible en un momento mágico.',intro:'Ideas sencillas para vivir una Navidad personal, acogedora y llena de ilusión.',label:'Desde el correo navideño',read:'Leer el artículo',all:'Ver todas las ideas de Navidad',back:'Todas las ideas de Navidad',related:'Más ideas del correo',ctaTitle:'¿Todo listo para crear su carta de Papá Noel?',cta:'Crear una carta'},
 fr:{faq:'Questions fréquentes',note:'Un petit mot des lutins',updated:'Mis à jour le',author:'Par Elf Mailroom',title:'Idées de Noël du courrier des lutins',description:'Des idées simples pour écrire au Père Noël, créer des traditions en famille et rendre une lettre à imprimer vraiment magique.',intro:'Des idées faciles pour un Noël personnel, chaleureux et merveilleux.',label:'Le carnet des lutins',read:'Lire l’article',all:'Découvrir toutes les idées de Noël',back:'Toutes les idées de Noël',related:'D’autres idées des lutins',ctaTitle:'Prêt à créer sa lettre du Père Noël ?',cta:'Créer une lettre'},
 pl:{faq:'Najczęściej zadawane pytania',note:'Mała wiadomość od elfów',updated:'Aktualizacja',author:'Od Elf Mailroom',title:'Świąteczne pomysły z poczty elfów',description:'Praktyczne pomysły na list do Mikołaja, rodzinne tradycje i wyjątkowe wręczenie listu od Mikołaja do wydrukowania.',intro:'Proste sposoby na osobiste, przytulne święta pełne dziecięcej radości.',label:'Z poczty elfów',read:'Czytaj artykuł',all:'Zobacz wszystkie świąteczne pomysły',back:'Wszystkie świąteczne pomysły',related:'Więcej z poczty elfów',ctaTitle:'Gotowi stworzyć osobisty list od Mikołaja?',cta:'Stwórz list od Mikołaja'}
};

export const blogArticles=[
 {slug:'how-to-write-a-letter-to-santa',date:'2026-09-21',updated:'2026-09-22',translations:letterToSanta,image:{src:'/assets/blog/letter-to-santa.webp',thumbnail:'/assets/blog/letter-to-santa-640.webp',width:1536,height:1024,alt:{
  en:'A child draws a letter to Santa beside a little toy elf in a cosy Christmas room.',
  de:'Ein Kind gestaltet neben einem kleinen Spielzeugwichtel einen Brief an den Weihnachtsmann.',
  es:'Un peque dibuja una carta a Papá Noel junto a un elfo de juguete en una acogedora habitación navideña.',
  fr:'Un enfant dessine une lettre au Père Noël près d’un petit lutin en peluche dans une pièce décorée pour Noël.',
  pl:'Dziecko rysuje list do Mikołaja obok małego elfa zabawki w przytulnym świątecznym pokoju.'
 }}},
 {slug:'cosy-christmas-eve-traditions',date:'2026-09-21',updated:'2026-09-22',translations:christmasEve,image:{src:'/assets/blog/christmas-eve.webp',thumbnail:'/assets/blog/christmas-eve-640.webp',width:1536,height:1024,alt:{
  en:'A parent and two children share a story under a cosy blanket beside a glowing Christmas tree.',
  de:'Ein Elternteil liest mit zwei Kindern unter einer gemütlichen Decke neben dem leuchtenden Weihnachtsbaum.',
  es:'Una familia lee un cuento bajo una manta junto a un árbol de Navidad iluminado.',
  fr:'Un parent et deux enfants lisent une histoire sous une couverture près du sapin illuminé.',
  pl:'Rodzic i dwoje dzieci czytają razem pod przytulnym kocem obok rozświetlonej choinki.'
 }}},
 {slug:'how-to-make-a-printable-santa-letter-magical',date:'2026-09-21',updated:'2026-09-22',translations:printableLetter,image:{src:'/assets/blog/printable-santa-letter.webp',thumbnail:'/assets/blog/printable-santa-letter-640.webp',width:1536,height:1024,alt:{
  en:'An illustrated Santa letter and a red-sealed envelope with ribbon, fir and a little toy reindeer.',
  de:'Ein illustrierter Weihnachtsbrief und ein rot versiegelter Umschlag mit Band, Tannengrün und Spielzeugrentier.',
  es:'Una carta ilustrada de Papá Noel y un sobre con sello rojo, cinta, abeto y un pequeño reno de juguete.',
  fr:'Une lettre illustrée du Père Noël et une enveloppe au sceau rouge avec ruban, sapin et petit renne en feutrine.',
  pl:'Ilustrowany list od Mikołaja i koperta z czerwoną pieczęcią, wstążką, gałązką świerku i małym reniferem zabawką.'
 }}}
];

export function articleTranslation(article,language='en'){return article.translations[localeCode(language)]||article.translations.en}
export function findBlogArticle(slug){return blogArticles.find(article=>article.slug===slug)}
export function blogPath(language='en',slug=''){const code=localeCode(language);return `${code==='en'?'/':`/${code}/`}blog/${slug?`${slug}/`:''}`}
export function blogAlternates(origin,slug=''){return [...languages.map(({code})=>({language:code,url:origin+blogPath(code,slug)})),{language:'x-default',url:origin+blogPath('en',slug)}]}

export function articleReadingMinutes(article,language='en'){const copy=articleTranslation(article,language),text=[copy.dek,...copy.sections.flat(2),...copy.faqs.flat()].join(' ');return Math.max(1,Math.ceil(text.split(/\s+/u).length/180))}
