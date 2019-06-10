export class Point {
    line: number;
    column: number;
    offset: number;
    constructor(line: number, column: number, offset: number) {
      this.line = line;
      this.column = column;
      this.offset = offset;
    }
  }

  export class Position {
    // indent 暂未实现
    indent?: number[];
    start?: Point;
    end?: Point;
    constructor(start?: Point, end?: Point, indent = [] as number[]) {
      this.start = start;
      this.end = end;
      this.indent = indent;
    }
    setStart(point: Point) {
      this.start = point;
    }
    setEnd(point: Point) {
      this.end = point;
    }
  }
