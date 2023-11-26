/**
 * gaino.blog
 * ~ one of gaino apps
 * authored by 9r3i
 * https://github.com/9r3i/giano.blog
 * started at november 21st 2023
 * requires:
 *   - virtual.js - https://github.com/9r3i/virtual.js - v1.0.0
 *   - gaino.js   - https://github.com/9r3i/gaino.js   - v1.0.0
 *   - router.js  - https://github.com/9r3i/router.js  - v2.0.2
 *   - parser.js  - https://github.com/9r3i/parser.js  - v1.2.6
 *   - 
 *   - 
 *   - github api (module)     -- free
 *   - firebase (module)       -- free
 *   - api (self building)     -- needs more time to build
 *   - ldb, kdb, sdb (self library) -- ready
 *   - sse (server send event) -- needs a server
 *   - ws (websocket)          -- needs a vps
 */
;function blog(g,v){
/* the version */
Object.defineProperty(this,'version',{
  value:'1.0.0',
  writable:false,
});
/* the virtual */
Object.defineProperty(this,'virtual',{
  value:v,
  writable:false,
});
/* the gaino */
Object.defineProperty(this,'gaino',{
  value:g,
  writable:false,
});
/* the config */
this.config={};
/* initialize as constructor */
this.init=async function(chost){
  let app=this.virtual,
  cfile=chost.match(/([^\/]+)$/)[1];
  app.files[cfile]=chost,
  craw=app.get(cfile);
  if(!craw){
    craw=await app.update(cfile);
  }
  this.config=this.gaino.parseJSON(craw);
  if(!this.config||typeof this.config!=='object'
    ||!this.config.hasOwnProperty('performTest')
    ||!this.config.hasOwnProperty('database')
    ||!this.config.hasOwnProperty('theme')
    ||!this.config.hasOwnProperty('loader')
    ){
    app.delete(cfile);
    alert('Error: Invalid config file.');
    return;
  }
  /* perform testing output */
  if(this.config.performTest){
    this.test(...arguments);
  }else{
    /* start the blog */
    this.start();
  }
  /* doing silent self update,
   * and also update for config file */
  await app.update('blog.js');
  await app.update(cfile);
};
/* start the blog */
this.start=async function(a,b,c){
  let app=this.virtual;
  /* put loader */
  /* initialize database */
  let driver=this.config.database.driver
    &&typeof window[this.config.database.driver]==='function'
    ?this.config.database.driver:'BlogDatabaseDriver';
  this.db=new window[driver](this.config.database,this);
  /* initialize router */
  this.route=new router(
    window.location.pathname
      .replace(/^\//,'')
      .replace(/[^\/]+$/,''),
    {}, /* _GLOBAL */
    [], /* header */
    []  /* footer */
  );
  /* initialize data */
  let rawData=await app.get(this.config.database.name),
  isUpdated=false,
  data=this.gaino.parseJSON(rawData);
  if(!data){
    data=await this.requestData();
    app.put(this.config.database.name,JSON.stringify(data));
    isUpdated=true;
  }
  window._GLOBAL.data=data;
  /* globalize this object */
  window._BLOG=this;
  /* configuring theme */
  let theme=this.config.theme,
  themeURL=[
    theme.host,
    theme.namespace,
    '',
  ].join('/');
  /* load all theme template */
  let templates={},
  length=Object.keys(theme.templates).length
        +Object.keys(theme.files).length,
  percent=50,
  count=0,
  prefix='themes/'+theme.namespace+'/';
  for(let name in theme.templates){
    count++;
    this.loader('Loading... [template:'+name+']',50+(count/length*percent));
    let tempURL=themeURL+theme.templates[name],
    file=prefix+'templates/'+name,
    text=await app.get(file);
    if(!text||!theme.save){
      text=await this.gaino.fetch(tempURL);
      await app.put(file,text);
    }templates[name]=text;
  }
  /* put templates into global _GLOBAL */
  window._GLOBAL['templates']=templates;
  /* load all theme files */
  for(let file of theme.files){
    let fileURL=themeURL+file,
    vfile=prefix+file,
    text=await app.get(vfile);
    if(!text||!theme.save){
      count++;
      this.loader('Loading... [file:'+file+']',50+(count/length*percent));
      text=await this.gaino.fetch(fileURL);
      await app.put(vfile,text);
    }
    if(text){
      if(file.match(/\.css$/)){
        await app.exec(text,'style',file);
      }else if(file.match(/\.js$/)){
        await app.exec(text,'script',file);
      }
    }
  }
  this.loader('Loading...',100);
  /* initialize this route */
  this.route.init();
  /* silent update for data */
  if(!isUpdated){
    data=await this.requestData();
    app.put(this.config.database.name,JSON.stringify(data));
    window._GLOBAL.data=data;
  }
};
/* request data */
this.requestData=async function(table){
  let data={},
  host='https://api.github.com/repos',
  limit=this.db.config.host==host?0x64:1;
  for(let page=1;page<=limit;page++){
    let temp=await this.db.request(table);
    if(temp&&typeof temp==='object'){
      data={...data,...temp};
      if(Object.keys(temp).length<30){
        break;
      }
    }else{
      break;
    }
  }return data;
};
/* testing code */
this.test=function(a,b,c){
  let parse=new parser,
  loaded=[],
  sc=document.querySelectorAll('script[id]');
  for(let i=0;i<sc.length;i++){
    loaded.push(sc[i].id);
  }
  document.body.innerHTML='<pre>'
    +'[loaded.files]\n'
    +parse.likeJSON(loaded)
    +'\n\n'
    +'[stored.files]\n'
    +parse.likeJSON(this.virtual.list(true))
    +'\n\n'
    +'[config]\n'
    +parse.likeJSON(this.config,3)
    +'\n\n'
    +'[args]\n'
    +parse.likeJSON({arguments},5)
    +'\n\n'
    +'[this]\n'
    +parse.likeJSON(this,5)
    +'\n\n'
    +'</pre>'
    +'';
};
/* loader */
this.loader=function(str,cent){
  str=typeof str==='string'?str:'Loading...';
  let span=document.querySelector('span'),
  progress=document.querySelector('progress');
  if(span&&progress){
    if(typeof cent==='number'&&cent!==NaN){
      progress.max=100;
      progress.value=cent;
      span.innerText=cent+'% '+str;
    }else{
      span.innerText=str;
    }return;
  }
  let img=this.loaderImage(),
  text=document.createTextNode(' '+str),
  pre=document.createElement('div');
  pre.style.padding='30px';
  pre.style.textAlign='center';
  pre.style.fontFamily='system-ui';
  pre.style.fontSize='16px';
  pre.style.color='#555';
  pre.appendChild(img);
  pre.appendChild(text);
  document.body.innerHTML='';
  document.body.appendChild(pre);
  return pre;
};
/* loader image */
this.loaderImage=function(){
  let img=new Image;
  img.src=this.loaderURL();
  return img;
};
/* loader url -- static */
this.loaderURL=function(){
  return this.config.loader;
};
};


/**
 * BlogDatabaseDriver
 * ~ blog database driver
 * authored by 9r3i
 * https://github.com/9r3i
 * started at november 22nd 2023
 * @usage: new BlogDatabaseDriver(config object,blog object)
 * 
 * [acceptable:host]
 * - api.github.com/repos (releases method, 30 rows per page)
 * - raw.githubusercontent.com (file method)
 * - relfo.vercel.app (release file method)
 * - sabunjelly.com (query method: kdb, ldb, sdb, jdb)
 * - 9r3i.web.id (query method: expired)
 * - 
 * 
 * [sample:config]
  {
    "database": {
      "driver": "BlogDatabaseDriver",
      "host": "https://raw.githubusercontent.com",
      "username": "9r3i",
      "password": "___GITHUB_PUBLIC_TOKEN___",
      "name": "gaino-blog-data",
      "tables": {
        "posts": "master/posts.json",
        "authors": "master/authors.json"
      },
      "file": false,
      "fetch": "browser",
      "expires": "Fri, Nov 23 2024"
    }
  }
 */
;function BlogDatabaseDriver(cnf,blg){
/* the version */
Object.defineProperty(this,'version',{
  value:'1.0.0',
  writable:false,
});
/* config and blog */
this.config=cnf;
this.blog=blg;
/* initialize -- as constructor */
this.init=function(){
  this.options={};
};
/* request */
this.request=async function(table,page){
  table=typeof table==='string'
    &&this.config.tables.hasOwnProperty(table)
    ?table:'posts';
  let path=[
    this.config.host,
    this.config.username,
    this.config.name,
    this.config.tables[table],
  ];
  if(this.config.file){
    path.push(this.config.file);
  }
  let url=path.join('/')+(page?'?page='+page:'');
  /* gaino.xhr fetch */
  if(this.config.fetch=='xhr'
    ||this.config.fetch=='gaino'){
    if(!this.options.hasOwnProperty('error')){
      this.options.error=function(e){
        prompt(e,url);
      };
    }
    let res=await this.blog.gaino.fetch(url,this.options);
    return this.blog.gaino.parseJSON(res);
  }
  /* browser fetch */
  else if(this.config.fetch=='browser'){
    let res=await fetch(url,this.options)
      .then(r=>r.json())
      .catch(e=>prompt(e,url));
    return res;
  }
  /* no fetch method */
  else{
    alert('Error: Requires database fetch.');
    return false;
  }
};
/* initialize */
return this.init();
};


