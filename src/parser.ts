import { Node, RootNode, Position, Point } from './nodes';
import builders from './builder';
import CONT from './symbols';

interface VentureState {
  active: boolean | string;
  forward?: Function;
  start?: Point;
  end?: Point;
}

export default function parser(src: string, options = {}) {
  const stack: Node[] = [];

  // Init
  stack.push(new RootNode({
    position: new Position(),
  }));
  let parentNode = stack[0];

  let state = 'go';
  let point: Point = new Point(1, 1, 0);
  let lastFailedBuilderName = undefined;

  const venture: VentureState = {
    active: false, // or a function
    forward: undefined,
    start: undefined,
    end: undefined,
  };

  const resetVenture = () => {
    venture.active = false;
    venture.forward = venture.start = venture.end = undefined;
  };

  while (true) {
    const ch = src.charAt(point.offset);
    if (!ch) break;

    if (venture.active) {
      const forwardResult = venture.forward(ch, point);

      if (forwardResult instanceof Node) {
        stack.push(forwardResult);
      } else {
        switch (forwardResult) {
          case CONT.NODE_END:
            // TODO
            break;
          case true:  // continue to forward
            break;
          case false: // rollback
            point = venture.start;
            lastFailedBuilderName = venture.active;
            resetVenture();
            continue;
        }
      }
    } else {
      for (let [builderName, builder] of builders.entries()) {
        if (lastFailedBuilderName) {
          if (builderName === lastFailedBuilderName) {
            lastFailedBuilderName = undefined;
          }
          continue;
        }

        const forward = builder.glance(ch, point);
        if (forward) {
          venture.forward = forward;
          venture.active = builderName;
          venture.start = point;
          break;
        }
      }
    }

    // Create a new Point object
    point = new Point(
      ch === '\n' ? (point.line + 1) : point.line,
      ch === '\n' ? 1 : point.column,
      point.offset + 1
    );
  }

  return stack;
};