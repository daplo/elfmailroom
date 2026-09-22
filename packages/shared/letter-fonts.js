// Register dedicated canvas faces independently of CSS loading and stylesheet replacement.
// A failed load must show an error, never bake a fallback font into a permanent preview image.
export const letterFontFamilies={body:'ElfLetterCanvas',script:'ElfScriptCanvas'};
let pending;
export function loadLetterFonts(){
 if(!pending)pending=Promise.all([
  new FontFace(letterFontFamilies.body,'url(/assets/fonts/EBGaramond.ttf)',{weight:'400',style:'normal'}).load(),
  new FontFace(letterFontFamilies.script,'url(/assets/fonts/Allura-Regular.ttf)',{weight:'400',style:'normal'}).load()
 ]).then(faces=>{for(const face of faces)document.fonts.add(face);return faces}).catch(error=>{pending=null;throw error});
 return pending;
}
