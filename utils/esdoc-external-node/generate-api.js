const fs = require('fs-extra');
const path = require('path');
const http = require('https');

const apiUri = 'https://nodejs.org/api/';
const structure = {type: 'misc'};
const stack = [structure];
const ids = [];

parse();

function dependencies ()
{
  const {dependencies} = require(path.join(process.cwd(), 'package.json'));
  const depNames = Object.keys(dependencies);
  let output = '';
  for (let name of depNames) {
    const {homepage} = require(path.join(name, 'package.json'));
    if (homepage) {
      output += `
      /**
       * @external {${name}} ${homepage}
       */
      `
    }
  }
  return output;
}

function parse ()
{
  http.get(`${apiUri}all.json`, (res) => {
    res.pipe(fs.createWriteStream(path.join(__dirname, 'api.json')));
    res.on('end', () => {
      const api = require('./api');
      parseAny(api);
      walk(structure);
      const formatted = format(ids);
      const output = render(formatted) + dependencies();
      write(output);
    });
  });
}

function walk (obj, parent={mod: null, cls: null})
{
  if (obj.children) {
    let thisParent = {...parent};
    if (obj.type == 'module') {
      thisParent = {...parent, ...{mod: obj.name}};
    }
    else if (obj.type == 'class') {
      thisParent = {...parent, ...{cls: obj.name}};
    }
    for (let child of obj.children) {
      ids.push([thisParent, {name: child.name, type: child.type, raw: child.raw}]);
      walk(child, thisParent);
    }
  }
}

function format (ids)
{
  let res = [];
  for (let id of ids) {
    let [parent, self] = id;
    if (!parent.mod) continue;
    else if (self.type == 'class') {
      let id = parent.mod+'~'+self.name.split('.').pop();
      let html = parent.mod+'.html';
      let hash = (parent.mod+'_class_'+self.name.replace(/\./, '_'))
        .toLowerCase();
      res.push({type: 'class', id, html, hash});
    }
    else if (self.type == 'method') {
      let name = self.name.replace('\\', '');
      let sig = self.raw
        .replace(/(\\_)|\)|\[|\]| /g, '')
        .replace(/(\.|\(|\,)+/g, '_')
        .replace(/_$/, '');
      let hash = (parent.mod+'_'+sig).toLowerCase()
      if (parent.cls) {
        let cls = parent.cls.split('.').pop();
        let id = parent.mod+'~'+cls+'#'+name;
        let html = parent.mod+'.html';
        res.push({type: 'method', id, html, hash});
      }
      else {
        let id = parent.mod+'~'+name;
        let html = parent.mod+'.html';
        res.push({type: 'method', id, html, hash});
      }
    }
  }
  return res;
}

function render (formatted)
{
  let output = '';
  for (let external of formatted) {
    output += `
    /**
     * @external {${external.id}} ${apiUri}${external.html}#${external.hash}
     */
    `
  }
  return output;
}

function write (output)
{
  output = output.replace(/^\s*/mg, '');
  fs.writeFileSync(path.join(__dirname, 'external-node.js'), output);
}

function push (type, obj)
{
  obj.type = type;
  const last = stack[stack.length-1] || {};
  stack.push(obj);

  last['children'] = last['children'] || [];
  last['children'].push(obj);
}

function pop ()
{
  stack.pop();
}

function parseAny (any)
{
  if (any.modules) {
    for (let mod of any.modules) {
      parseModule(mod);
    }
  }

  if (any.miscs) {
    for (let misc of any.miscs) {
      parseMisc(misc);
    }
  }

  if (any.classes) {
    for (let cls of any.classes) {
      parseClass(cls);
    }
  }

  if (any.methods) {
    for (let method of any.methods) {
      parseMethod(method);
    }
  }
}

function parseMisc (misc)
{
  parseAny(misc);
}

function parseModule (mod)
{
  const modName = mod.name
    .replace(/_\(.+\)$/, '')
    .toLowerCase();

  push('module', {name: modName, raw: mod.textRaw});

  parseAny(mod);

  pop();
}

function parseClass (cls)
{
  const clsPath = cls.textRaw
    .replace(/Class: (new )?/i, '')
    .replace(/\(.+\)$/, '')
    .replace(/ extends.+$/, '');

  push('class', {name: clsPath, raw: cls.textRaw});

  parseAny(cls);

  pop();
}

function parseMethod (method)
{
  if (/^new/.test(method.textRaw)) return;
  push('method', {name: method.name, raw: method.textRaw});
  pop();
}

function parseProperty ()
{
}
