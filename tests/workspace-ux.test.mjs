import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initWorkspaceControls} from '../app/workspace-controls.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('bundle CSS is reproducible from the committed manifest',()=>{
 const files=JSON.parse(read('app/css-manifest.json'));
 assert.ok(files.includes('workspace.css'));
 assert.equal(files.at(-1),'workflow-first.css');
 const expected=['/* Service Builder v2.3.2 | generated file; edit individual CSS source files. */',
  ...files.map(f=>'\n/* SOURCE: '+f+' */\n'+read('app/'+f))].join('\n')+'\n';
 assert.equal(read('app/styles-bundle.css'),expected);
});

test('inspector precision controls are valid and grouped without removing actions',()=>{
 const code=read('app/floorplan-ui.mjs');
 assert.doesNotMatch(code,/class="studio18-position aria-label=/);
 for(const part of ['data-workspace-section="size"','data-workspace-section="position"',
  'data-workspace-section="nudge"','id="studio19-resize"','id="studio18-apply"',
  'id="floor-rotate"','id="floor-remove"']){
  assert.ok(code.includes(part),'Missing: '+part);
 }
});

class FakeElement{
 constructor(tag='div'){
  this.tag=tag;this.children=[];this.tablist=null;this.clientWidth=1350;
  this.hidden=false;this.attributes={};this.events={};this.styles={};this.dataset={};
  this.classNames=new Set();this.style={setProperty:(key,value)=>{this.styles[key]=value}};
  this.classList={
   add:key=>this.classNames.add(key),
   remove:key=>this.classNames.delete(key),
   contains:key=>this.classNames.has(key),
   toggle:(key,force)=>{const flag=force===undefined?!this.classNames.has(key):force;
    if(flag)this.classNames.add(key);else this.classNames.delete(key);return flag;}
  };
 }
 append(...items){this.children.push(...items)}
 insertBefore(item){this.children.unshift(item)}
 querySelector(selector){return selector==='.hybrid-dock-tabs'?this.tablist:null}
 before(){} after(){} focus(){}
 setAttribute(name,value){this.attributes[name]=value}
 addEventListener(name,handler){(this.events[name]??=[]).push(handler)}
 emit(name,event){for(const listener of this.events[name]||[])listener(event)}
}

test('workspace persists size, supports keyboard resizing and collapsing',()=>{
 const saved=new Map(),created=[];
 const prev={storage:globalThis.localStorage,doc:globalThis.document,win:globalThis.window,media:globalThis.matchMedia};
 globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 globalThis.document={createElement:type=>{const e=new FakeElement(type);created.push(e);return e},body:new FakeElement()};
 globalThis.window={addEventListener(){}};
 globalThis.matchMedia=()=>({matches:false});
 try{
  const shell=new FakeElement(),main=new FakeElement();
  const left=new FakeElement(),right=new FakeElement();
  left.tablist=new FakeElement();right.tablist=new FakeElement();
  const workspace=initWorkspaceControls({shell,main,left,right});
  assert.equal(shell.styles['--workspace-left-size'],'205px');
  assert.equal(shell.styles['--workspace-right-size'],'298px');
  const splitter=created.find(e=>e.className==='workspace-splitter workspace-splitter-left');
  assert.ok(splitter,'Keyboard-accessible separator exists');
  let prevented=false;
  splitter.emit('keydown',{key:'ArrowRight',preventDefault(){prevented=true}});
  assert.ok(prevented);
  assert.equal(workspace.state.left,221);
  assert.equal(splitter.attributes['aria-valuenow'],'221');
  workspace.setCollapsed('right',true);
  assert.ok(shell.classNames.has('workspace-right-collapsed'));
  assert.equal(JSON.parse(saved.get('blue-ocean3d/workspace/v1')).rightCollapsed,true);
  workspace.setCollapsed('right',false);
  assert.equal(workspace.state.rightCollapsed,false);
  workspace.setWidth('right',360,true);
  assert.equal(workspace.state.right,360);
  assert.equal(JSON.parse(saved.get('blue-ocean3d/workspace/v1')).right,360);
 }finally{
  globalThis.localStorage=prev.storage;
  globalThis.document=prev.doc;
  globalThis.window=prev.win;
  globalThis.matchMedia=prev.media;
 }
});
