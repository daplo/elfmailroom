import PDFDocument from 'pdfkit';
import {fileURLToPath} from 'node:url';
import {localeCode,stationery} from '../../../packages/shared/locales.js';
import {getDesign,letterBodyInk,letterBorderInk} from '../../../packages/shared/config.js';
import {splitLetterGreeting} from '../../../packages/shared/letter-layout.js';
const serif=fileURLToPath(new URL('../assets/fonts/EBGaramond.ttf',import.meta.url));
const script=fileURLToPath(new URL('../assets/fonts/Allura-Regular.ttf',import.meta.url));
export function createLetterPdf(letter,design='classic',language='en'){
 return new Promise((resolve,reject)=>{
  const theme=getDesign(design),copy=stationery[localeCode(language)];
  const bodySize=['jolly','beach'].includes(design)?11.5:12;
  const artwork=fileURLToPath(new URL(`../assets/stationery/${theme.art}.jpg`,import.meta.url));
  const doc=new PDFDocument({size:'A4',margins:{top:160,bottom:design==='jolly'?400:design==='beach'?380:340,left:58,right:58},bufferPages:true,info:{Title:'Your letter from Santa',Author:'Elf Mailroom',Subject:theme.name}});
  const chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
  try{
   doc.registerFont('Letter',serif);doc.registerFont('Signature',script);
   function stationery(){
    const {width:w,height:h}=doc.page;
    doc.rect(0,0,w,h).fill(theme.background);
    doc.image(artwork,0,0,{fit:[w,h],align:'center',valign:'center'});
    // The 2:3 artwork is centred inside A4, so map its source-frame positions after fitting.
    const artScale=Math.min(w/1024,h/1536),artWidth=1024*artScale,artHeight=1536*artScale;
    const artX=(w-artWidth)/2,artY=(h-artHeight)/2;
    const frameLeft=artX+artWidth*theme.frameInset,frameRight=artX+artWidth*(1-theme.frameInset);
    const frameTop=artY+artWidth*theme.frameTop,frameBottom=artY+artHeight-artWidth*theme.frameBottom;
    doc.save().moveTo(frameLeft,frameTop).lineTo(frameLeft,frameBottom).moveTo(frameRight,frameTop).lineTo(frameRight,frameBottom).moveTo(frameLeft,frameTop).lineTo(frameRight,frameTop).moveTo(frameLeft,frameBottom).lineTo(frameRight,frameBottom).lineWidth(5).stroke(letterBorderInk).restore();
    doc.font('Helvetica').fontSize(6).fillColor(theme.accent).text(copy.desk,58,88,{width:w-116,align:'center',characterSpacing:2,lineBreak:false});
    doc.font('Letter').fontSize(28).fillColor(theme.ink).text(copy.santa,58,102,{width:w-116,align:'center',lineBreak:false});
    doc.moveTo(58,139).lineTo(w-58,139).lineWidth(.5).stroke(theme.border);
    doc.font('Helvetica').fontSize(5).fillColor(theme.ink).text(copy.post,58,145,{width:w-116,align:'center',characterSpacing:2,lineBreak:false});
    doc.x=58;doc.y=170;doc.font('Letter').fontSize(bodySize).fillColor(letterBodyInk);
   }
   stationery();doc.on('pageAdded',stationery);
   const {greeting,body}=splitLetterGreeting(letter,language);
   if(greeting){
    doc.font('Signature').fontSize(30).fillColor(theme.accent).text(greeting,58,170,{width:doc.page.width-116,lineGap:0,paragraphGap:0});
    doc.y+=10;
   }
   doc.font('Letter').fontSize(bodySize).fillColor(letterBodyInk);
   doc.text(body,58,doc.y,{width:doc.page.width-116,lineGap:design==='jolly'?1:2,paragraphGap:0});
   if(doc.y>(design==='jolly'?442:510))doc.addPage();
   const signY=doc.y+12;
   // Signing area is reserved above the footer artwork, outside the body text margin.
   doc.page.margins.bottom=290;
   doc.font('Signature').fontSize(32).fillColor(theme.accent).text(copy.signature||copy.santa,58,signY,{lineBreak:false});
   if(design!=='jolly'){doc.circle(515,signY+17,14).fill(theme.accent);doc.circle(515,signY+17,11).lineWidth(.7).stroke(theme.border);
   doc.font('Signature').fontSize(18).fillColor('#fffdf5').text('S',506,signY+3,{lineBreak:false});}
   const range=doc.bufferedPageRange();
   for(let i=0;i<range.count;i++){
    doc.switchToPage(i);doc.page.margins.bottom=0;
    const footerInset=['beach','barbecue'].includes(design)?9:16;
    doc.font('Helvetica').fontSize(5).fillColor(theme.accent).text(`${copy.footer}${range.count>1?` · ${i+1} / ${range.count}`:''}`,58,doc.page.height-footerInset,{width:doc.page.width-116,align:'center',characterSpacing:1,lineBreak:false});
   }
   doc.end();
  }catch(error){doc.destroy();reject(error)}
 });
}
