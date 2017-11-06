'use strict';

exports.onHandleCode = function onHandleCode(ev) {
  ev.data.code = ev.data.code
    .replace(/^\s*(const|let|var)\s*(.*)\s*=\s*require\((.+)\)/gm, 'import $2 from $3;');
};

