import { Component, type ReactNode, useEffect, useRef } from 'react';
import { Inbox, LoaderCircle, X, AlertCircle } from 'lucide-react';
export function Loading({text='Loading your workspace…'}:{text?:string}){return <div className="empty" role="status"><LoaderCircle size={25} className="spin"/><p>{text}</p></div>;}
export function Empty({text='No cases match the current filters.'}:{text?:string}){return <div className="empty"><Inbox size={27}/><p>{text}</p></div>;}
export function ErrorMessage({message}:{message:string}){return message?<div className="error-msg" role="alert"><AlertCircle size={16}/>{message}</div>:null;}
export function PageHead({title,description,children}:{title:string;description?:string;children?:ReactNode}){return <div className="page-head"><div><h2>{title}</h2>{description?<p>{description}</p>:null}</div><div className="action-buttons">{children}</div></div>;}
export function Card({title,subtitle,children,actions,className=''}:{title?:string;subtitle?:string;children:ReactNode;actions?:ReactNode;className?:string}){return <section className={'card '+className}>{title?<div className="card-head"><div><h3>{title}</h3>{subtitle?<span className="meta">{subtitle}</span>:null}</div>{actions}</div>:null}{children}</section>;}
export function Badge({text}:{text:string}){const tone=text==='Closed' || text==='On Track'?'green':text==='Waiting Support'||text==='Near TAT'?'amber':text==='Needs Attention'||text==='High'?'red':'blue';return <span className={'badge '+tone}>{text}</span>;}
export function Modal({title,subtitle,onClose,children}:{title:string;subtitle?:string;onClose:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{ref.current?.close();previous?.focus();};},[]);
  return <dialog ref={ref} className="react-modal" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-head"><div><h3>{title}</h3><div className="small">{subtitle}</div></div><button className="btn secondary" onClick={onClose} aria-label="Close dialog"><X size={18}/></button></div><div className="modal-body">{children}</div></dialog>;
}
export class ErrorBoundary extends Component<{children:ReactNode},{error:string}>{
  state={error:''};
  static getDerivedStateFromError(error:Error){return {error:error.message};}
  render(){return this.state.error?<main className="fatal"><h2>Unable to display this page</h2><ErrorMessage message={this.state.error}/><button className="btn primary" onClick={()=>window.location.reload()}>Reload application</button></main>:this.props.children;}
}
