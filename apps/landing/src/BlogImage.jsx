import React from 'react';

export default function BlogImage({article,language,sizes='(max-width: 760px) calc(100vw - 46px), 400px',featured=false}){
 const{image}=article;
 return <img src={image.src} srcSet={`${image.thumbnail} 640w, ${image.src} ${image.width}w`} sizes={sizes}
  alt={image.alt[language]||image.alt.en} width={image.width} height={image.height}
  loading={featured?'eager':'lazy'} fetchPriority={featured?'high':undefined} decoding="async"/>;
}
