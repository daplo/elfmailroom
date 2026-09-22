export const products = [
 {id:'santa-letter',name:'Santa Letter',eyebrow:'A little Christmas magic',description:'A personal reply from Santa, ready to read, print and treasure.',features:['Personalised with their little details','Beautiful North Pole stationery','Choose from illustrated letter designs','Digital letter, yours to keep'],available:true},
 {id:'north-pole',name:'North Pole Letter',eyebrow:'Something for the letterbox',description:'The magic of a real envelope addressed just to them.',features:['A beautifully printed Santa letter','An envelope full of North Pole charm','A keepsake for the Christmas box'],available:false},
 {id:'christmas-bundle',name:'Christmas Bundle',eyebrow:'A little extra wonder',description:'More little surprises to make their Christmas even more special.',features:['Their personalised Santa letter','Nice List certificate','Extra festive keepsakes'],available:false}
];
export const faqs = [
 ['Is the letter really personalised?','Yes. Add their first name, a Christmas wish and something they are proud of. Your downloaded letter uses those details. Before checkout, you’ll see a fictional sample so you can choose your favourite design. The sample letters on this page use fictional names and details.'],
 ['Can I create letters for more than one child?','Of course. Create a separate letter for each child so everyone has their own little moment of magic. Each letter is purchased separately.'],
 ['What will I see in the preview?','A sample letter with fictional details shows your chosen stationery. After payment, read your child’s personalised letter, ask for changes, then accept and download the PDF. You can check and change the details you provide before checkout.'],
 ['What ages is Elf Mailroom suitable for?','It is for any child who enjoys the magic of Santa. Younger children can dictate their letter to a grown-up; older children can write their own.'],
 ['Can I use it outside the UK or US?','The digital letter does not require postal delivery. Available payment methods and currencies will be shown at checkout when sales open. Physical shipping destinations are not yet confirmed.'],
 ['Is there a digital version?','Yes. The Santa Letter is a digital reply, with a PDF you can download after payment and print at home. Printed letters and bundles are planned for later.'],
 ['How quickly will I receive it?','You can preview a sample letter in each design straight away. After a confirmed payment, Santa’s reply is written especially for your child. Your private purchase link lets you return on any device to review the letter, request changes and download your accepted PDF. Checkout must be configured before purchases open. Postal delivery dates will be announced before physical letters go on sale.'],
 ['What happens to the information I provide?','The draft stays in this browser tab until you continue to checkout. Only include details you want in the letter. Sales remain closed until the service’s privacy and purchase terms are published.']
];
export function makeReply({name='Sophie',wish='a bicycle',proud='learning to ride without stabilisers',pet=''}){return `Dear ${name},\n\nYour letter has arrived safely at the North Pole, and it has made this snowy day a little brighter! The elves set it right on my desk, beside my mug of hot chocolate.\n\nI hear you have been working on ${proud}. Every little step takes courage, and I hope you feel very proud of yourself.\n\nI have made a special note of your Christmas wish: ${wish}. The workshop is full of surprises, and the elves are keeping very busy!${pet ? ` Please give ${pet} a little Christmas hello from me, too.` : ''}\n\nKeep being kind, stay curious, and remember that the best Christmas magic is the love we share with each other.\n\nWith a big, snowy hug,\nSanta Claus`;}

export const letterBodyInk='#294e3d';
export const letterBorderInk='#d2ad64';
export const designs = [
 {id:'classic',name:'Santa’s Special Delivery',description:'Santa, his mailbag and a few woodland friends.',art:'santa',background:'#fffdf5',ink:'#294e3d',accent:'#ad443e',border:'#d8c7a6',frameInset:.0264,frameTop:.0195,frameBottom:.0254,motif:'✦'},
 {id:'woodland',name:'Reindeer Wishes',description:'Two cozy reindeer in their Christmas scarves.',art:'reindeer',background:'#fffdf5',ink:'#294e3d',accent:'#567047',border:'#b6c4a5',frameInset:.0293,frameTop:.0264,frameBottom:.043,motif:'♧'},
 {id:'starlight',name:'Christmas Eve Flight',description:'Santa’s sleigh above a snowy North Pole village.',art:'sleigh',background:'#fffdf5',ink:'#314d71',accent:'#9a7537',border:'#c8d3e2',frameInset:.0254,frameTop:.0234,frameBottom:.0244,motif:'✧'},
 {id:'jolly',name:'Jolly Christmas Pals',description:'A happy Santa, silly reindeer and their crayon-coloured friends.',art:'christmas-pals',background:'#fffdf5',ink:'#294e3d',accent:'#c34e3d',border:'#8db59a',frameInset:.0186,frameTop:.0186,frameBottom:.0186,motif:'★'},
 {id:'beach',name:'Santa’s Beach Christmas',description:'Santa in flip-flops, sandy toes and seaside Christmas magic.',art:'santa-beach',background:'#fffdf5',ink:'#294e3d',accent:'#ad443e',border:'#d8c7a6',frameInset:.0254,frameTop:.0234,frameBottom:.0244,motif:'☀',previewFooterRatio:.60},
 {id:'barbecue',name:'Kangaroo Christmas BBQ',description:'Kangaroos in flip-flops, festive gifts and a sunny Christmas BBQ.',art:'kangaroo-bbq',background:'#fffdf5',ink:'#294e3d',accent:'#ad443e',border:'#d8c7a6',frameInset:.022,frameTop:.0195,frameBottom:.0195,motif:'☀'}
];
export function getDesign(id){return designs.find(d=>d.id===id)||designs[0]}

export const sampleLetter = `Dear Sophie,

Your letter has arrived at the North Pole! The elves placed it beside my hot chocolate, and reading it made me smile.

I heard about your wonderful adventures this year. Keep being curious, trying new things and sharing your kindness with the people around you.

The reindeer are practising their landings and the workshop is full of surprises. We’re all getting ready for a very magical Christmas!

With a big, snowy hug,`;

export const santaLetterPrice = Object.freeze({amount:399,currency:'usd',label:'US$3.99'});
