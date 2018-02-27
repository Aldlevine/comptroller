import * as b from 'dependency-1';
import * as c from 'dependency-2';
import { x as $x } from 'excluded-dependency';

let x: string;

class Hello {
  hi(name) {
    console.log(`hi ${name}`);
  }
};

import * as d from 'http';
import *  as e from 'not-a-package';
