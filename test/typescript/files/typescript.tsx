import * as b from 'dependency-1';
import * as c from 'dependency-2';
import { x as $x } from 'excluded-dependency';
import * as React from 'react'
type Props = {
  title: string
}

export default function App(props: Props) {
  return (
    <h1>
      {props.title}
    </h1>
  )
}

import * as d from 'http';
import *  as e from 'not-a-package';
