import * as b from 'dependency-1';
import * as c from 'dependency-2';
import { x as $x } from 'excluded-dependency';

let x: string;

class Component { }
class Header { }
class Text { }

class App extends Component {
  render({ props }): void {
    return (
      <Header title={props.title}>
        <Text>{props.text}</Text>
      </Header>
    );
  }
}

import * as d from 'http';
import *  as e from 'not-a-package';
