import React,{useState} from 'react';
import {FlaskConical,ArrowLeft} from 'lucide-react';
import {Button,LetterCard} from '@elf/shared/ui';
import {designs,getDesign} from '@elf/shared';
import {letterLanguages} from '@elf/shared/locales';

const sample={language:'en-GB',name:'Sophie',wish:'a bicycle',proud:'learning to swim',pet:'a teddy bear called Biscuit',message:'Dear Santa, how do the reindeer learn to fly?'};

export default function AdminTestLetter({request,onBack,onSessionExpired}){
 const[details,setDetails]=useState(()=>({...sample}));
 const[design,setDesign]=useState('classic');
 const[result,setResult]=useState(null);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState('');
 function update(event){setDetails(current=>({...current,[event.target.name]:event.target.value}));}
 async function generate(event){
  event.preventDefault();if(busy)return;
  setBusy(true);setError('');
  try{setResult(await request('test-letters',{details,design}));}
  catch(error){setError(error.message);if(error.status===401)onSessionExpired();}
  finally{setBusy(false);}
 }
 const resultLanguage=result&&letterLanguages.find(language=>language.code===result.details.language)?.name;
 return <>
  <button className="text-link admin-back" onClick={onBack} disabled={busy}><ArrowLeft size={16}/> All purchases</button>
  <div className="admin-title"><div><span className="eyebrow">ADMIN TESTING</span><h1>Generate a test letter</h1><p>Try the real letter generator with fictional details.</p></div><FlaskConical size={36} aria-hidden="true"/></div>
  <p className="notice admin-test-notice">Uses the configured OpenAI account and may incur API charges. No payment, purchase record or email is created. Results are not saved; leaving this form or reloading clears them.</p>
  <div className="admin-test-grid">
   <form className="form-card admin-test-form" onSubmit={generate} aria-busy={busy}>
    <h2>Test details</h2>
    <fieldset disabled={busy}>
     <legend className="sr-only">Test letter details</legend>
     <label htmlFor="test-language">Letter language</label><select id="test-language" name="language" value={details.language} onChange={update}>{letterLanguages.map(language=><option key={language.code} value={language.code}>{language.name}</option>)}</select>
     <label htmlFor="test-design">Stationery</label><select id="test-design" value={design} onChange={event=>setDesign(event.target.value)}>{designs.map(theme=><option key={theme.id} value={theme.id}>{theme.name}</option>)}</select>
     {[['name','Child’s first name',50],['wish','Christmas wish',200],['proud','Proud moment',200],['pet','Pet or special toy (optional)',80]].map(([key,label,maxLength])=><React.Fragment key={key}><label htmlFor={`test-${key}`}>{label}</label><input id={`test-${key}`} name={key} required={key!=='pet'} maxLength={maxLength} value={details[key]} onChange={update}/></React.Fragment>)}
     <label htmlFor="test-message">Child’s letter to Santa (optional)</label><textarea id="test-message" name="message" maxLength={2000} value={details.message} onChange={update}/>
     <button className="link-button" type="button" onClick={()=>setDetails({...sample})}>Use sample details</button>
     <Button href={null} type="submit"><FlaskConical size={16} aria-hidden="true"/>{busy?'Generating test letter…':result?'Generate another test letter':'Generate test letter'}</Button>
    </fieldset>
    {busy&&<p className="helper" role="status">Santa is writing. This can take up to a couple of minutes.</p>}
    {error&&<p className="error" role="alert">{error}</p>}
   </form>
   <section className="admin-test-result" aria-label="Test letter result">
    {result?<><div className="admin-box"><span className="status-badge">Test only · Not saved</span><h2>Generated letter</h2><p>{result.details.name} · {resultLanguage} · {getDesign(result.design).name}</p><p>Model: {result.model}</p>{busy&&<p>The previous result stays visible until the new letter is ready.</p>}</div><LetterCard text={result.letter} design={result.design} language={result.details.language}/><details className="admin-box admin-test-text"><summary>Generated text</summary><pre className="version-text">{result.letter}</pre></details><p className="sr-only" role="status">Test letter generated for {result.details.name}.</p></>:<div className="admin-box admin-test-empty"><FlaskConical size={32} aria-hidden="true"/><h2>Your test letter will appear here</h2><p>Choose the language and stationery, edit the sample details, then generate a fresh letter.</p></div>}
   </section>
  </div>
 </>;
}
