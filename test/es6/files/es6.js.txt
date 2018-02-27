import * as a from 'dependency-1';
import * as b from 'dependency-2';
import {
  x as $x
} from 'excluded-dependency';
const x = 42;

class Hello {
  hi(name) {
    console.log(`hi ${name}`);
  }
};

import * as c from 'http';
import * as d from 'not-a-package';
