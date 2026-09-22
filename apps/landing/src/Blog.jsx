import React from 'react';
import CookieConsent from '@elf/shared/cookies';
import {useLocale} from '@elf/shared/i18n';
import {Button} from '@elf/shared/ui';
import {articleReadingMinutes,articleTranslation,blogArticles,blogCopy,blogPath,findBlogArticle} from '@elf/shared/blog';
import {ArrowLeft,ArrowRight,Clock,Sparkles} from 'lucide-react';
import {Navbar,Footer} from './App';
import Seo from './Seo';
import BlogImage from './BlogImage';
import './blog.css';

const minutes=(language,value)=>({en:`${value} min read`,de:`${value} Min. Lesezeit`,es:`${value} min de lectura`,fr:`${value} min de lecture`,pl:`${value} min czytania`}[language]);

function ArticleCard({article,language}){const copy=articleTranslation(article,language);return <article className="blog-card"><div className="blog-card-art"><BlogImage article={article} language={language}/></div><div><p className="blog-meta"><Clock size={14}/>{minutes(language,articleReadingMinutes(article,language))}</p><h2><a href={blogPath(language,article.slug)}>{copy.title}</a></h2><p>{copy.description}</p><a className="blog-read" href={blogPath(language,article.slug)}>{blogCopy[language].read}<ArrowRight size={15}/></a></div></article>}

export function BlogIndex(){const{language}=useLocale(),copy=blogCopy[language];return <div className="christmas-landing blog-site"><Seo language={language} blogIndex/><a className="skip-link" href="#main">Skip to content</a><CookieConsent/><Navbar/><main id="main"><header className="blog-hero wrap"><span className="eyebrow"><Sparkles size={13}/>{copy.label}</span><h1>{copy.title}</h1><p>{copy.intro}</p></header><section className="blog-grid wrap" aria-label={copy.title}>{blogArticles.map(article=><ArticleCard key={article.slug} article={article} language={language}/>)}</section><BlogCta language={language}/></main><Footer routePath="/blog/"/></div>}

function BlogCta({language}){const copy=blogCopy[language];return <aside className="blog-cta"><div className="wrap"><div className="blog-cta-card"><div className="blog-cta-art" aria-hidden="true"><span className="blog-cta-spark">✦</span><div className="blog-cta-envelope"><img src="/assets/elf-mailroom-stamp.svg" width="54" height="60" alt=""/></div><span className="blog-cta-star">✧</span></div><div className="blog-cta-copy"><span className="eyebrow">{copy.label}</span><h2>{copy.ctaTitle}</h2><p>{copy.intro}</p></div><Button>{copy.cta}</Button></div></div></aside>}

export function BlogArticle({slug}){
 const{language}=useLocale(),article=findBlogArticle(slug),site=blogCopy[language];
 if(!article)return null;
 const copy=articleTranslation(article,language),related=blogArticles.filter(item=>item.slug!==slug).slice(0,2);
 const updated=article.updated||article.date;
 const dateLabel=new Intl.DateTimeFormat(language==='en'?'en-GB':language,{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${updated}T00:00:00Z`));
 return <div className="christmas-landing blog-site">
  <Seo language={language} blogSlug={slug}/><a className="skip-link" href="#main">Skip to content</a><CookieConsent/><Navbar/>
  <main id="main">
   <article className="blog-article">
    <header className="blog-article-head wrap">
     <a className="blog-back" href={blogPath(language)}><ArrowLeft size={15}/>{site.back}</a>
     <p className="blog-meta"><Clock size={14}/>{minutes(language,articleReadingMinutes(article,language))}</p>
     <h1>{copy.title}</h1>
     <p className="blog-byline">{site.author}<span aria-hidden="true"> · </span>{site.updated} <time dateTime={updated}>{dateLabel}</time></p>
     <p className="blog-dek">{copy.dek}</p>
    </header>
    <figure className="blog-featured wrap"><BlogImage article={article} language={language} sizes="(max-width: 910px) calc(100vw - 46px), 864px" featured/></figure>
    <div className="blog-article-body">
     {copy.sections.map(([heading,paragraphs,note])=><section key={heading}>
      <h2>{heading}</h2>{paragraphs.map(text=><p key={text}>{text}</p>)}
      {note&&<aside className="blog-elf-note"><span><Sparkles size={16} aria-hidden="true"/>{site.note}</span><p>{note}</p></aside>}
     </section>)}
     <section className="blog-faq" id="faq" aria-labelledby="blog-faq-heading">
      <h2 id="blog-faq-heading">{site.faq}</h2>
      {copy.faqs.map(([question,answer])=><div className="blog-faq-item" key={question}><h3>{question}</h3><p>{answer}</p></div>)}
     </section>
    </div>
   </article>
   <section className="blog-related wrap"><h2>{site.related}</h2><div>{related.map(item=><ArticleCard key={item.slug} article={item} language={language}/>)}</div></section>
   <BlogCta language={language}/>
  </main>
  <Footer routePath={`/blog/${slug}/`}/>
 </div>
}
