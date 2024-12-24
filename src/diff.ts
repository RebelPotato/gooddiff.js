interface AddOp<V> {
  add: (x: V, y: V) => V;
  zero: V;
  negate: (x: V) => V;
  sum: (xs: V[]) => V;
}
interface Num<V> extends AddOp<V> {
  fromNumber: (x: number) => V;
  sub: (x: V, y: V) => V;
  mul: (x: V, y: V) => V;
}
interface ScaleOp<W, V> {
  scale: (w: W, v: V) => V;
}
interface DotOp<W, V> {
  dot: (x: V, y: V) => W;
}
interface DecompOp<B, W, V> {
  decompose: (v: V, b: B) => W;
}
interface VectorSpace<W, V> extends ScaleOp<W, V>, AddOp<V> {}
interface InnerSpace<W, V> extends DotOp<W, V>, VectorSpace<W, V> {} // inner product space
interface BasedSpace<B, W, V> extends DecompOp<B, W, V>, VectorSpace<W, V> {} // vector space with basis

// functions as vector space with basis
function LiftAddOp<V, A>(op: AddOp<V>): AddOp<(_: A) => V> {
  return {
    add: (f, g) => (x) => op.add(f(x), g(x)),
    zero: (_) => op.zero,
    negate: (f) => (x) => op.negate(f(x)),
    sum: (fs) => (x) => op.sum(fs.map((f) => f(x))),
  };
}
const LiftScaleOp = <W, V, A>(op: ScaleOp<W, V>): ScaleOp<W, (_: A) => V> => ({
  scale: (x, f) => (y) => op.scale(x, f(y)),
});
const LiftDecompOp = <B, W, V, A>(
  op: DecompOp<B, W, V>
): DecompOp<[A, B], W, (_: A) => V> => ({
  decompose: (v, [a, b]) => op.decompose(v(a), b),
});

// differentiable functions
// a differential tower that contains the current value and all derivatives
type Diff<A, B> = {
  value: B;
  diff: DiffT<A, B>;
};
type DiffT<A, B> = (_: A) => Diff<A, B>;
function Diff<A, B>(value: B, diff: DiffT<A, B>): Diff<A, B> {
  return { value, diff };
}
function dConst<X, W, V>(op: VectorSpace<W, V>, b: V): Diff<X, V> {
  return Diff(b, (_) => dZero(op));
}
function dZero<A, W, V>(op: VectorSpace<W, V>): Diff<A, V> {
  return dConst(op, op.zero);
}
function linearD<A, W, V>(op: VectorSpace<W, V>, f: (_: A) => V): DiffT<A, V> {
  return (u) => Diff(f(u), (du) => dConst(op, f(du)));
}
const dId = <W, V>(op: VectorSpace<W, V>) => linearD(op, (x: V) => x);
const atD = <W, V>(op: VectorSpace<W, V>, i: number) =>
  linearD(op, (x: V[]) => x[i]);
const dmap = <A, B, C>(f: (_: B) => C) => {
  const self = (x: Diff<A, B>): Diff<A, C> =>
    Diff(f(x.value), (da: A) => self(x.diff(da)));
  return self;
};
const dmap2l = <A, B, C, D>(f2: (x: B, y: C) => D) => {
  const self = (x: Diff<A, B>, y: Diff<A, C>): Diff<A, D> =>
    Diff(f2(x.value, y.value), (da: A) => self(x.diff(da), y.diff(da)));
  return self;
};
// distributive map
const dmap2d = <A, B, C, D>(
  f2: (x: B, y: C) => D,
  add: (x: Diff<A, D>, y: Diff<A, D>) => Diff<A, D>
) => {
  const self = (x: Diff<A, B>, y: Diff<A, C>): Diff<A, D> =>
    Diff(f2(x.value, y.value), (da: A) =>
      add(self(x.diff(da), y), self(x, y.diff(da)))
    );
  return self;
};

function DNumOp<A, V>(opN: Num<V>, opV: VectorSpace<V, V>): Num<Diff<A, V>> {
  const obj: Num<Diff<A, V>> = {
    fromNumber: (x) => dConst(opV, opN.fromNumber(x)),
    add: dmap2l(opN.add),
    sub: dmap2l(opN.sub),
    mul: dmap2d(opN.mul, (x, y) => obj.add(x, y)),
    zero: dZero(opV),
    negate: dmap(opN.negate),
    sum: (xs) =>
      Diff(opN.sum(xs.map((x) => x.value)), (da) =>
        obj.sum(xs.map((x) => x.diff(da)))
      ),
  };
  return obj;
}

function DVectorSpaceOp<A, W, V>(
  op: VectorSpace<W, V>
): VectorSpace<Diff<A, W>, Diff<A, V>> {
  const obj: VectorSpace<Diff<A, W>, Diff<A, V>> = {
    add: dmap2l(op.add),
    zero: dZero(op),
    negate: dmap(op.negate),
    sum: (xs) =>
      Diff(op.sum(xs.map((x) => x.value)), (da) =>
        obj.sum(xs.map((x) => x.diff(da)))
      ),
    scale: dmap2d(op.scale, (x, y) => obj.add(x, y)),
  };
  return obj;
}

function chain1<A, W, V>(
  op: VectorSpace<W, V>,
  f: (_: V) => V,
  df: (_: Diff<A, V>) => Diff<A, W>
) {
  const opF: VectorSpace<Diff<A, W>, Diff<A, V>> = DVectorSpaceOp(op);
  return (x: Diff<A, V>) =>
    Diff(f(x.value), (da: A) => opF.scale(df(x), x.diff(da)));
}

function chain<A, B, C>(f: DiffT<B, C>, g: DiffT<A, B>): DiffT<A, C> {
  return (a0) => {
    const dg = g(a0);
    const df = f(dg.value);
    return Diff(df.value, chain(df.diff, dg.diff));
  };
}

// real numbers
type Real = {
  value: number;
  add: (other: Real) => Real;
  negate: () => Real;
  scale: (x: Real) => Real;
};
const RealOp: VectorSpace<Real, Real> & Num<Real> = {
  add: (x, y) => Real(x.value + y.value),
  sub: (x: Real, y: Real) => Real(x.value - y.value),
  mul: (x: Real, y: Real) => Real(x.value * y.value),
  fromNumber: (x) => Real(x),
  zero: Real(0),
  negate: (x) => Real(-x.value),
  sum: (xs) => Real(xs.reduce((acc, x) => acc + x.value, 0)),
  scale: (x, y) => Real(x.value * y.value),
};
function Real(value: number): Real {
  const obj = {
    value,
    add: (other: Real) => Real(value + other.value),
    negate: () => Real(-value),
    scale: (x: Real) => Real(value * x.value),
  };
  return obj;
}
