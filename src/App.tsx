import { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingBag, Plus, Minus, ArrowUpRight, Instagram, MessageCircle, Leaf, PackageCheck, ShieldCheck, LogOut, RefreshCw } from 'lucide-react';
import { cloudEnabled, supabase, fromCloudProduct, toCloudProduct, type CloudEnquiry } from './lib/supabase';

type Product = { id:string; name:string; cat:string; price:number; sku:string; desc:string; img:string; stock:number; featured:boolean };
type Enquiry = CloudEnquiry;
const initial:Product[] = [
 {id:'CK-101',name:'Linen Everyday Tote',cat:'Accessories',price:799,sku:'CK-101',desc:'A roomy, easygoing tote for everyday errands. Replace this sample with your real product details.',img:'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',stock:12,featured:true},
 {id:'CK-102',name:'Ceramic Table Vase',cat:'Home & Living',price:649,sku:'CK-102',desc:'A sculptural ceramic accent for your space. Sample product.',img:'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=80',stock:7,featured:true},
 {id:'CK-103',name:'Soft Cotton Scarf',cat:'Accessories',price:499,sku:'CK-103',desc:'Lightweight cotton with a soft hand-feel. Sample product.',img:'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=900&q=80',stock:0,featured:false},
 {id:'CK-104',name:'Minimal Desk Journal',cat:'Stationery',price:349,sku:'CK-104',desc:'A thoughtful space for lists and plans. Sample product.',img:'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80',stock:24,featured:true}
];
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
const localRead=<T,>(key:string,fallback:T):T=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const defaultSettings={whatsapp_number:'',instagram_url:'',store_name:'Creative Kart'};

export default function App(){
 const [products,setProducts]=useState<Product[]>(()=>localRead('ck-products',initial));
 const [cart,setCart]=useState<{id:string;qty:number}[]>([]);
 const [query,setQuery]=useState(''); const [category,setCategory]=useState('All');
 const [page,setPage]=useState(()=>location.pathname==='/admin'?'admin':'shop');
 const [detail,setDetail]=useState<Product|null>(null); const [notice,setNotice]=useState('');
 const [admin,setAdmin]=useState(false); const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
 const [settings,setSettings]=useState(()=>localRead('ck-settings',defaultSettings));
 const [enquiries,setEnquiries]=useState<Enquiry[]>([]);
 const [customer,setCustomer]=useState(''); const [phone,setPhone]=useState('');
 const [editing,setEditing]=useState<Product|null>(null); const [busy,setBusy]=useState(false);
 const [cloudReady,setCloudReady]=useState(false);
 const [wishlist,setWishlist]=useState<string[]>(()=>localRead('ck-wishlist',[]));
 const [demoPass,setDemoPass]=useState('');

 const categories=useMemo(()=>['All',...Array.from(new Set(products.map(p=>p.cat)))],[products]);
 const items=products.filter(p=>(!query||[p.name,p.cat,p.sku].join(' ').toLowerCase().includes(query.toLowerCase()))&&(category==='All'||p.cat===category));
 const count=cart.reduce((n,c)=>n+c.qty,0);
 const total=cart.reduce((n,c)=>n+(products.find(p=>p.id===c.id)?.price||0)*c.qty,0);
 const wa=(settings.whatsapp_number||'').replace(/\D/g,'');

 async function loadCloud(){
   if(!supabase)return;
   const [{data:rows,error:productError},{data:store,error:settingsError}]=await Promise.all([
     supabase.from('products').select('*').order('created_at',{ascending:false}),
     supabase.from('store_settings').select('*').eq('id','main').maybeSingle()
   ]);
   if(productError)throw productError;
   if(settingsError)throw settingsError;
   if(rows)setProducts(rows.map(fromCloudProduct));
   if(store)setSettings({whatsapp_number:store.whatsapp_number||'',instagram_url:store.instagram_url||'',store_name:store.store_name||'Creative Kart'});
   setCloudReady(true);
 }
 useEffect(()=>{
   if(!cloudEnabled||!supabase){setCloudReady(false);return}
   loadCloud().catch(e=>setNotice('Cloud connection needs setup: '+e.message));
   const channel=supabase.channel('creative-kart-live')
     .on('postgres_changes',{event:'*',schema:'public',table:'products'},()=>loadCloud().catch(()=>{}))
     .on('postgres_changes',{event:'*',schema:'public',table:'store_settings'},()=>loadCloud().catch(()=>{}))
     .subscribe();
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
     setAdmin(Boolean(session));
     if(session){loadCloud().catch(e=>setNotice(e.message));loadEnquiries();}
   });
   return()=>{subscription.unsubscribe();supabase.removeChannel(channel)};
 },[]);
 useEffect(()=>{if(page==='admin'&&admin)loadEnquiries()},[page,admin]);
 async function loadEnquiries(){
   if(!supabase||!cloudEnabled){setEnquiries(localRead('ck-enquiries',[]));return}
   const {data,error}=await supabase.from('enquiries').select('*').order('created_at',{ascending:false});
   if(error){setNotice(error.message);return}
   setEnquiries((data||[]) as Enquiry[]);
 }
 function persistDemo(){localStorage.setItem('ck-products',JSON.stringify(products));localStorage.setItem('ck-settings',JSON.stringify(settings));localStorage.setItem('ck-enquiries',JSON.stringify(enquiries));localStorage.setItem('ck-wishlist',JSON.stringify(wishlist))}
 function add(p:Product){if(!p.stock){setNotice('This item is currently unavailable.');return}setCart(old=>{const found=old.find(x=>x.id===p.id);if(found&&found.qty>=p.stock){setNotice('Available stock limit reached.');return old}return found?old.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...old,{id:p.id,qty:1}]});setNotice('Added to your bag.')}
 function summary(ref:string){return 'Hello Creative Kart! I would like to enquire.\nReference: '+ref+'\n'+cart.map(c=>{const p=products.find(x=>x.id===c.id)!;return p.name+' × '+c.qty+' — '+money(p.price*c.qty)}).join('\n')+'\nSubtotal: '+money(total)+'\nPlease confirm availability and purchase arrangements.'}
 async function submitEnquiry(){
   if(!cart.length||!customer.trim()||!phone.trim()){setNotice('Add items, your name and phone number first.');return}
   const contactWindow=wa?window.open('about:blank','_blank'):null;
   const reference='CK-'+Date.now().toString(36).toUpperCase();
   const enquiry={reference,customer_name:customer.trim(),phone:phone.trim(),items:cart.map(c=>{const p=products.find(x=>x.id===c.id)!;return{id:p.id,name:p.name,quantity:c.qty,price:p.price}}),total,status:'Enquiry received'};
   if(cloudEnabled&&supabase){
     const {error}=await supabase.from('enquiries').insert(enquiry);
     if(error){setNotice('Could not save enquiry: '+error.message);return}
   }else{
     const next=[{...enquiry,id:reference,created_at:new Date().toISOString()},...localRead<Enquiry[]>('ck-enquiries',[])];
     localStorage.setItem('ck-enquiries',JSON.stringify(next));setEnquiries(next);
   }
   const text=summary(reference);setCart([]);setPage('shop');
   if(contactWindow)contactWindow.location.href='https://wa.me/'+wa+'?text='+encodeURIComponent(text);
   else setNotice('Enquiry saved. WhatsApp contact has not been configured yet.');
 }
 async function login(e:React.FormEvent){
   e.preventDefault();setBusy(true);
   if(cloudEnabled&&supabase){
     const {error}=await supabase.auth.signInWithPassword({email,password});
     if(error)setNotice('Sign-in failed: '+error.message);else{setAdmin(true);setPage('admin');setNotice('Signed in securely.')}
   }else if(demoPass==='demo1234'){setAdmin(true);setPage('admin');setNotice('Demo mode only — local browser data is not shared or secure.')}
   else setNotice('Incorrect demo password.');
   setBusy(false);
 }
 async function saveProduct(e:React.FormEvent){
   e.preventDefault();if(!editing)return;setBusy(true);
   if(cloudEnabled&&supabase){
     const {error}=await supabase.from('products').upsert(toCloudProduct(editing));
     if(error){setNotice('Product not saved: '+error.message);setBusy(false);return}
   }else{
     const next=products.some(p=>p.id===editing.id)?products.map(p=>p.id===editing.id?editing:p):[editing,...products];
     setProducts(next);localStorage.setItem('ck-products',JSON.stringify(next));
   }
   setEditing(null);setNotice('Product saved.');setBusy(false);
 }
 async function removeProduct(id:string){
   if(cloudEnabled&&supabase){const {error}=await supabase.from('products').delete().eq('id',id);if(error){setNotice(error.message);return}}
   else{const next=products.filter(p=>p.id!==id);setProducts(next);localStorage.setItem('ck-products',JSON.stringify(next))}
   setNotice('Product removed.');
 }
 async function toggleFeatured(p:Product){
   const updated={...p,featured:!p.featured};
   if(cloudEnabled&&supabase){const {error}=await supabase.from('products').update({featured:updated.featured}).eq('id',p.id);if(error){setNotice(error.message);return}}
   else{const next=products.map(x=>x.id===p.id?updated:x);setProducts(next);localStorage.setItem('ck-products',JSON.stringify(next))}
 }
 async function saveSettings(){
   if(cloudEnabled&&supabase){const {error}=await supabase.from('store_settings').upsert({id:'main',...settings});if(error){setNotice('Settings not saved: '+error.message);return}}
   else localStorage.setItem('ck-settings',JSON.stringify(settings));
   setNotice('Store contact settings saved.');
 }
 async function updateStatus(id:string,status:string){
   if(cloudEnabled&&supabase){const {error}=await supabase.from('enquiries').update({status}).eq('id',id);if(error){setNotice(error.message);return}}
   else{const next=enquiries.map(x=>x.id===id?{...x,status}:x);setEnquiries(next);localStorage.setItem('ck-enquiries',JSON.stringify(next))}
 }

 return <div className="app">
  <div className="top">THOUGHTFULLY CHOSEN · MADE FOR EVERYDAY</div>
  <header><button className="brand" onClick={()=>setPage('shop')}><span className="mark">C<span>K</span></span><span><b>CREATIVE KART</b><small>THE LITTLE THINGS, WELL CHOSEN</small></span></button><nav><button onClick={()=>setPage('shop')}>Shop</button><button onClick={()=>setPage('about')}>Our story</button><button onClick={()=>setPage('contact')}>Contact</button></nav><button className="bag" onClick={()=>setPage('cart')}><ShoppingBag size={18}/> Bag ({count})</button></header>
  {notice&&<button className="notice" onClick={()=>setNotice('')}>{notice}</button>}
  {page==='shop'&&<><section className="hero"><div><small className="eyebrow">THE CREATIVE KART EDIT</small><h1>Good things.<br/><em>Chosen with care.</em></h1><p>Little finds for everyday living, thoughtful gifting and the spaces we call home.</p><button className="dark" onClick={()=>document.getElementById('catalogue')?.scrollIntoView({behavior:'smooth'})}>Explore collection <ArrowUpRight size={16}/></button><small className="demo">{cloudEnabled?'CLOUD STORE':'LOCAL DEMO MODE'} · CONTACT US TO ENQUIRE</small></div><img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85" alt="Warm thoughtfully styled interior"/></section><section className="trust"><div><Leaf/><b>Thoughtfully picked</b></div><div><PackageCheck/><b>Family-owned business</b></div><div><ShieldCheck/><b>Personal assistance</b></div></section><section className="catalog" id="catalogue"><small className="eyebrow">A FEW THINGS WE LOVE</small><h2>Shop the collection<span>.</span></h2><div className="filters"><label><Search size={17}/><input placeholder="Search products, category, SKU..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div className="grid">{items.map(p=><article key={p.id}><button className="photo" onClick={()=>{setDetail(p);setPage('detail')}}><img src={p.img} alt={p.name}/>{!p.stock&&<span className="badge">Currently unavailable</span>}</button><small>{p.cat} · {p.sku}</small><button className="pname" onClick={()=>{setDetail(p);setPage('detail')}}>{p.name}</button><div className="price"><b>{money(p.price)}</b><button onClick={()=>setWishlist(old=>{const next=old.includes(p.id)?old.filter(x=>x!==p.id):[...old,p.id];localStorage.setItem('ck-wishlist',JSON.stringify(next));return next})} title="Save to wishlist">{wishlist.includes(p.id)?'♥':'♡'}</button><button disabled={!p.stock} onClick={()=>add(p)}><Plus size={17}/></button></div></article>)}</div>{!items.length&&<p>No matches. Try another search or category.</p>}</section><section className="band"><small className="eyebrow">SMALL BUSINESS, BIG HEART</small><h2>From our family<br/>to your everyday.</h2><p>Useful, beautiful things and a simple, personal way to enquire.</p><button className="light" onClick={()=>setPage('about')}>Our story ↗</button></section></>}
  {page==='detail'&&detail&&<section className="detail"><button className="back" onClick={()=>setPage('shop')}>← Back to collection</button><div><img src={detail.img} alt={detail.name}/><aside><small className="eyebrow">{detail.cat} · {detail.sku}</small><h1>{detail.name}</h1><h3>{money(detail.price)}</h3><p>{detail.desc}</p><p className={detail.stock?'instock':'out'}>{detail.stock?detail.stock+' available':'Currently unavailable'}</p><button className="dark" disabled={!detail.stock} onClick={()=>add(detail)}>Add to bag <Plus size={16}/></button><button className="outline" onClick={()=>setWishlist(old=>old.includes(detail.id)?old.filter(x=>x!==detail.id):[...old,detail.id])}>♡ Save for later</button></aside></div></section>}
  {page==='cart'&&<section className="content"><small className="eyebrow">YOUR SELECTION</small><h1>Your bag<span>.</span></h1>{!cart.length?<p>Your bag is empty. <button className="text" onClick={()=>setPage('shop')}>Browse products →</button></p>:<div className="cartlayout"><div>{cart.map(c=>{const p=products.find(x=>x.id===c.id)!;return <div className="cartitem" key={c.id}><img src={p.img} alt=""/><div><b>{p.name}</b><p>{money(p.price)}</p><button onClick={()=>setCart(old=>old.map(x=>x.id===c.id?{...x,qty:Math.max(1,x.qty-1)}:x))}><Minus size={14}/></button> {c.qty} <button disabled={c.qty>=p.stock} onClick={()=>setCart(old=>old.map(x=>x.id===c.id?{...x,qty:x.qty+1}:x))}><Plus size={14}/></button><button className="text" onClick={()=>setCart(old=>old.filter(x=>x.id!==c.id))}>Remove</button></div></div>})}</div><aside className="summary"><h3>Subtotal　{money(total)}</h3><p>Send an enquiry and contact us to confirm availability and purchase arrangements. No online payment is collected.</p><label>Your name<input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Name"/></label><label>Phone number<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91..."/></label><button className="dark wide" onClick={submitEnquiry}>Send enquiry on WhatsApp</button><button className="outline wide" onClick={()=>{navigator.clipboard?.writeText(summary('CK-'+Date.now().toString(36).toUpperCase()));setNotice('Enquiry summary copied.')}}>Copy enquiry summary</button><button className="text wide" onClick={()=>window.open(settings.instagram_url||'https://www.instagram.com/','_blank','noopener,noreferrer')}><Instagram size={16}/> Contact on Instagram</button></aside></div>}</section>}
  {page==='about'&&<section className="content editorial"><small className="eyebrow">OUR STORY</small><h1>Good things, chosen<br/><em>with intention.</em></h1><p>Creative Kart is a family-owned business bringing together useful finds for home, gifting and everyday life. Browse the collection and contact us to ask about a product or arrange a purchase.</p><button className="dark" onClick={()=>setPage('shop')}>Explore collection ↗</button></section>}
  {page==='contact'&&<section className="content editorial"><small className="eyebrow">LET'S TALK</small><h1>A question? <em>We're here.</em></h1><p>Ask about availability, variants, product details or purchase arrangements.</p><button className="dark" onClick={()=>wa?window.open('https://wa.me/'+wa,'_blank','noopener,noreferrer'):setNotice('WhatsApp contact has not been configured yet.')}><MessageCircle size={16}/> WhatsApp</button> <button className="outline" onClick={()=>window.open(settings.instagram_url||'https://www.instagram.com/','_blank','noopener,noreferrer')}><Instagram size={16}/> Instagram</button><div className="policies"><article><h3>Product enquiries</h3><p>Contact us to confirm product availability and details.</p></article><article><h3>Purchase arrangements</h3><p>Our team will discuss the available options with you directly.</p></article><article><h3>Payments</h3><p>No online payment is collected through this website.</p></article><article><h3>Questions</h3><p>Send us a message and we will help with your enquiry.</p></article></div></section>}
  {page==='admin'&&<section className="content admin"><small className="eyebrow">OWNER AREA · {cloudEnabled?'CLOUD AUTHENTICATION':'LOCAL DEMO MODE'}</small><h1>Store desk<span>.</span></h1>{!admin?<div className="login"><h2>Owner sign in</h2>{cloudEnabled?<form onSubmit={login}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="dark wide" disabled={busy}>Sign in securely</button></form>:<form onSubmit={login}><p className="warning">Local demo only. Data is stored on this device and login is not secure.</p><label>Demo password<input type="password" value={demoPass} onChange={e=>setDemoPass(e.target.value)}/></label><button className="dark wide" disabled={busy}>Open demo admin</button><small>Demo password: demo1234</small></form>}</div>:<><div className="adminhead"><h2>Products</h2><div><button className="dark" onClick={()=>setEditing({id:'CK-'+Date.now(),name:'',cat:'Home & Living',price:0,sku:'',desc:'',img:'',stock:0,featured:false})}>+ Add product</button> <button className="outline" onClick={()=>loadCloud().catch(e=>setNotice(e.message))}><RefreshCw size={14}/> Refresh</button></div></div>{editing&&<form className="edit" onSubmit={saveProduct}><h3>Edit product</h3>{(['name','cat','sku','img','desc'] as const).map(k=><label key={k}>{k}<input required={k==='name'||k==='sku'} value={editing[k]} onChange={e=>setEditing({...editing,[k]:e.target.value})}/></label>)}<label>Price ₹<input type="number" min="0" required value={editing.price} onChange={e=>setEditing({...editing,price:+e.target.value})}/></label><label>Stock quantity<input type="number" min="0" required value={editing.stock} onChange={e=>setEditing({...editing,stock:+e.target.value})}/></label><button className="dark" disabled={busy}>Save product</button> <button type="button" className="outline" onClick={()=>setEditing(null)}>Cancel</button></form>}{products.map(p=><div className="adminrow" key={p.id}><div><b>{p.name}</b><small>{p.sku} · {money(p.price)} · stock {p.stock}{p.stock>0&&p.stock<=5?' · LOW STOCK':''}</small></div><button className="outline" onClick={()=>setEditing({...p})}>Edit</button><button className="text" onClick={()=>toggleFeatured(p)}>{p.featured?'Unfeature':'Feature'}</button><button className="text" onClick={()=>removeProduct(p.id)}>Delete</button></div>)}<h2>Customer enquiries ({enquiries.length})</h2>{enquiries.map(e=><article className="enquiry" key={e.id}><b>{e.reference} · {e.customer_name}</b><p>{e.phone} · {new Date(e.created_at).toLocaleString()}</p><p>{e.items.map(x=>x.name+' × '+x.quantity).join(', ')} · {money(e.total)}</p><label>Status<select value={e.status} onChange={ev=>updateStatus(e.id,ev.target.value)}><option>Enquiry received</option><option>Purchase arranged</option><option>Completed</option><option>Cancelled</option></select></label></article>)}<h2>Store contact settings</h2><label>WhatsApp number with country code<input value={settings.whatsapp_number} onChange={e=>setSettings({...settings,whatsapp_number:e.target.value})} placeholder="91XXXXXXXXXX"/></label><label>Instagram profile URL<input value={settings.instagram_url} onChange={e=>setSettings({...settings,instagram_url:e.target.value})} placeholder="https://instagram.com/yourstore"/></label><button className="dark" onClick={saveSettings}>Save shared settings</button><p className="warning">{cloudEnabled?'Cloud mode: database access is protected by Supabase authentication and row-level security.':'Demo mode: this device only. Configure Supabase to share data across devices.'}</p><button className="outline" onClick={async()=>{if(supabase&&cloudEnabled)await supabase.auth.signOut();setAdmin(false);setPage('shop')}}><LogOut size={14}/> Sign out</button></>}</section>}
  <footer><div className="footbrand"><b>CREATIVE KART</b><small>THE LITTLE THINGS, WELL CHOSEN</small></div><p>Thoughtful finds for everyday living.</p><div className="footlinks"><button onClick={()=>setPage('contact')}>Contact us</button><button onClick={()=>setPage('admin')}>Owner area</button></div><small>© 2026 CREATIVE KART</small></footer>
 </div>;
}
